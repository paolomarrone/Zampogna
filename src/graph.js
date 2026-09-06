/*
	Copyright (C) 2021, 2022, 2023 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/

(function() {

	'use strict';

	const TYPES = require("./types");
	const bs = require("./blocks").BlockTypes;
	const RATES = require("./uprates");
	const util = require("./util");
	let ifthenelse_branch_counter = 0;

	function ASTToGraph (root, options, cblock_descs = []) {

		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = "0";
		bdef.bdef_father = undefined;
		bdef.inputs_N = 1; // fs
		bdef.outputs_N = 0;
		bdef.init();
		bdef.i_ports[0].datatype = () => TYPES.Float32;
		bdef.i_ports[0].updaterate = () => RATES.Fs;
		bdef.i_ports[0].id = "fs";

		(function create_fs (bdef) {
			const fs = Object.create(bs.VarBlock);
			fs.id = "fs";
			fs.datatype = () => TYPES.Float32;
			fs.init();
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[0];
			c.out = fs.i_ports[0];
			bdef.blocks.push(fs);
			bdef.connections.push(c);
		})(bdef);

		(function register_cblocks (bdef) {
			cblock_descs.forEach(d => {
				const c = Object.create(bs.CBlock);
				c.init(d);
				bdef.cdefs.push(c);
			});
		})(bdef);

		convert_statements(root.statements, bdef);

		bdef.propagateDataTypes();

		(function resolve_block_calls (bdef) {
			bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b)).forEach(b => {
				resolve_block_call(b, bdef);
			});
			bdef.bdefs.forEach(bd => resolve_block_calls(bd));
		})(bdef);

		(function validate (bdef) {
			bdef.validate();
			check_recursive_calls(bdef);
		})(bdef);

		return bdef;
	}

	function convert_block_definition (bdef_node, bdef_father) {
		
		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = bdef_node.id;
		bdef.bdef_father = bdef_father;
		bdef.inputs_N = bdef_node.inputs.length;
		bdef.outputs_N = bdef_node.outputs.length;
		bdef.init();
		bdef_node.inputs.forEach((input, i) => {
			const t = getDataType(input.declaredType);
			bdef.i_ports[i].datatype = () => t;
		});
		bdef_node.outputs.forEach((output, i) => {
			const t = getDataType(output.declaredType);
			bdef.o_ports[i].datatype = () => t;
		});

		// Adding input/outputs
		bdef_node.inputs.forEach((p, i) => {
			const v = Object.create(bs.VarBlock);
			v.id = p.id;
			const t = getDataType(p.declaredType);
			v.datatype = () => t;
			v.init();

			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[i];
			c.out = v.i_ports[0];

			bdef.i_ports[i].id = p.id;
			bdef.blocks.push(v);
			bdef.connections.push(c);
		});
		bdef_node.outputs.forEach((p, i) => {
			const v = Object.create(bs.VarBlock);
			v.id = p.id;
			const t = getDataType(p.declaredType);
			v.datatype = () => t;
			v.init();

			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = v.o_ports[0];
			c.out = bdef.o_ports[i];

			bdef.o_ports[i].id = p.id;
			bdef.blocks.push(v);
			bdef.connections.push(c);
		});
		convert_statements(bdef_node.statements, bdef);

		return bdef;
	}

	function convert_statements (statements, bdef) {

		// Adding variables
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => {
			s.outputs.filter(o => o.name == 'VARIABLE').forEach(o => {
				if (bdef.blocks.some(bb => bb.id == o.id)) // is output
					return;
				const v = Object.create(bs.VarBlock);
				v.id = o.id
				const t = getDataType(o.declaredType);
				v.datatype = () => t;
				v.init();
				bdef.blocks.push(v);
			});
		});
		
		// Adding MEMORY DECLARATIONS blocks
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = Object.create(bs.MemoryBlock);
			m.id = s.id;
			const t = getDataType(s.type);
			m.init();
			m.datatype = () => t;
			//m.i_ports[1].datatype = () => t;
			bdef.blocks.push(m);
		});

		// Adding inner block definitions
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(bdef_n => {
			bdef.bdefs.push(convert_block_definition(bdef_n, bdef));
		});

		// Connect memory size expr
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = findMemById(s.id, bdef).r;
			const size_expr_ports = convert_expr(s.size, bdef);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = size_expr_ports[1][0];
			c.out = m.i_ports[0];
			bdef.connections.push(c);
		});

		// Adding expression blocks and connections
		statements.filter(s => s.name == 'ASSIGNMENT').forEach((s) => {
			switch (s.type) {
			case 'ANONYMOUS_BLOCK': {
				throw new Error("Anonymous blocks are not implemented yet");
			}
			case 'IF_THEN_ELSES': {
				const expr_ports = convert_if_then_elses(s.expr, s.outputs, bdef);
				s.outputs.forEach((o, oi) => {
					if (o.name != 'VARIABLE')
						throw new Error("Unexpected non-variable output in IF_THEN_ELSES assignment");
					const v = findVarById(o.id, bdef).r;
					const c = Object.create(bs.CompositeBlock.Connection);
					c.in = expr_ports[1][oi];
					c.out = v.i_ports[0];
					bdef.connections.push(c);
				});
				break;
			}
			case 'EXPR': {
				const expr_ports = convert_expr(s.expr, bdef);
				s.outputs.forEach((o, oi) => {
					switch (o.name) {
					case 'VARIABLE': {
						const v = findVarById(o.id, bdef).r;
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_ports[1][oi];
						c.out = v.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'DISCARD': {
						// Nothing to do
						break;
					}
					case 'PROPERTY': {
						const r = convert_property_left(o, bdef);
						if (bdef.connections.find(c => c.out == r.p.i_ports[0]))
							throw new Error("Property assigned multiple times");
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_ports[1][oi];
						c.out = r.p.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'MEMORY_ELEMENT': {
						const m = findMemById(o.id, bdef).r;
						const mw = Object.create(bs.MemoryWriterBlock);
						mw.memoryblock = m;
						mw.init();
						const index_expr_ports = convert_expr(o.args[0], bdef);
						const ci = Object.create(bs.CompositeBlock.Connection);
						const cv = Object.create(bs.CompositeBlock.Connection);
						ci.in  = index_expr_ports[1][0];
						ci.out = mw.i_ports[0];
						cv.in  = expr_ports[1][oi];
						cv.out = mw.i_ports[1];
						bdef.blocks.push(mw);
						bdef.connections.push(ci);
						bdef.connections.push(cv);
						break;
					}
					}
				});
				break;
			}
			}
		});
	}

	function convert_if_then_elses (if_node, outputs, bdef) {
		if (!if_node.branches || if_node.branches.length < 2)
			throw new Error("IF_THEN_ELSES requires at least if and else branches");

		const outputsTemplate = outputs.map(o => ({
			name: 'VARIABLE',
			id: o.id,
			declaredType: o.declaredType
		}));

		const cond_expr_ports = convert_expr(if_node.branches[0].condition, bdef);
		const then_branch_bdef = convert_if_branch_bdef(if_node.branches[0], outputsTemplate, bdef);
		// Else-if is a nested conditional, so later conditions also run only
		// when the preceding conditions were false.
		const otherwise = if_node.branches.length == 2 ? if_node.branches[1] : {
			block: { statements: [{ name: 'ASSIGNMENT', type: 'IF_THEN_ELSES',
				outputs: outputsTemplate,
				expr: { branches: if_node.branches.slice(1) }
			}] }
		};
		const else_branch_bdef = convert_if_branch_bdef(otherwise, outputsTemplate, bdef);
		return connect_conditional(cond_expr_ports[1][0], then_branch_bdef, else_branch_bdef, bdef);
	}

	function connect_conditional(condition, then_branch_bdef, else_branch_bdef, bdef) {
		bdef.bdefs.push(then_branch_bdef);
		bdef.bdefs.push(else_branch_bdef);

		const ib = Object.create(bs.IfthenelseBlock);
		ib.nOutputs = then_branch_bdef.o_ports.length;
		ib.then_branch = then_branch_bdef;
		ib.else_branch = else_branch_bdef;
		ib.init();
		ib.setOutputDatatype();
		bdef.blocks.push(ib);

		const cc = Object.create(bs.CompositeBlock.Connection);
		cc.in = condition;
		cc.out = ib.i_ports[0];
		bdef.connections.push(cc);

		return [[], ib.o_ports];
	}

	function convert_if_branch_bdef (branch, outputsTemplate, bdef) {
		const bdef_node = {
			name: 'BLOCK_DEFINITION',
			id: "if_branch__" + (ifthenelse_branch_counter++),
			inputs: [],
			outputs: outputsTemplate.map(o => ({
				name: o.name,
				id: o.id,
				declaredType: o.declaredType
			})),
			statements: branch.block.statements
		};

		const branch_block = convert_block_definition(bdef_node, bdef);
		for (const output of outputsTemplate) {
			const local = findVarById(output.id, branch_block).r;
			local.init_parent = findVarById(output.id, bdef).r;
		}
		return branch_block;
	}

	function convert_property_left (property_node, bdef) {
		let x = property_node.expr;
		if (x.name == 'VARIABLE') {
			const r = findVarById(x.id, bdef) || findMemById(x.id, bdef);
			return { p: convert_property(r.r, property_node.property_id, r.bd), bdef: r.bd };
		}
		else if (x.name == 'PROPERTY') {
			const r = convert_property_left(x, bdef);
			return { p: convert_property(r.p, property_node.property_id, bdef), bdef: r.bdef };
		}
	}

	function convert_property (block, property, bdef) {
		const props = bdef.properties.filter(p => p.of == block && p.type == property);
		if (props.length == 0) {
			const v = Object.create(bs.VarBlock);
			v.id = (block.id || block.value || block.operation) + "." + property;
			v.init();
			if (property == 'fs') {
				v.datatype = () => TYPES.Float32;
				v.i_ports[0].datatype = () => TYPES.Float32; // Check this
			}
			else {
				const dto = (block.o_ports[0] || block);
				v.datatype = function () {
					return dto.datatype();
				};
				v.i_ports[0].datatype = function () {
					return this.block.datatype();
				};
			}
			const p = Object.create(bs.CompositeBlock.Property);
			p.of = block;
			p.type = property;
			p.block = v;
			bdef.properties.push(p);
			bdef.blocks.push(v);
			return v;
		}
		if (props.length == 1) {
			return props[0].block;
		}
		throw new Error("Too many properties found");
	}

	function convert_expr (expr_node, bdef) {

		switch (expr_node.name) {
		case 'VARIABLE': {
			const v = findVarById(expr_node.id, bdef).r;
			return [v.i_ports, v.o_ports];
		}
		case 'PROPERTY': {
			const x = expr_node.expr;
			if (x.name == 'VARIABLE') {
				const r = findVarById(x.id, bdef) || findMemById(x.id, bdef);
				const p = convert_property(r.r, expr_node.property_id, r.bd);
				return [[], p.o_ports];
			}
			else {
				const ps = convert_expr(x, bdef);
				const of = ps[1][0].block;
				const bd = findBdefByBlock(of, bdef);
				const p  = convert_property(of, expr_node.property_id, bd);
				return [[], p.o_ports];
			}
		}
		case 'CONSTANT': {
			const b = Object.create(bs.ConstantBlock);
			b.value = expr_node.val;
			b.init();
			if (expr_node.type == 'INT32')
				b.datatype = () => TYPES.Int32;
			else if (expr_node.type == 'FLOAT32')
				b.datatype = () => TYPES.Float32;
			else if (expr_node.type == 'BOOL')
				b.datatype = () => TYPES.Bool;
			bdef.blocks.push(b);
			return [[], b.o_ports];
		}
		case 'MEMORY_ELEMENT': {
			const m = findMemById(expr_node.id, bdef).r;
			const mr = Object.create(bs.MemoryReaderBlock);
			mr.memoryblock = m;
			mr.init();
			const index_expr_ports = convert_expr(expr_node.args[0], bdef);
			const ci = Object.create(bs.CompositeBlock.Connection);
			ci.in  = index_expr_ports[1][0];
			ci.out = mr.i_ports[0];
			bdef.blocks.push(mr);
			bdef.connections.push(ci);
			return [[], [mr.o_ports[0]]];
		}
		case 'CALL_EXPR': {
			const b = Object.create(bs.CallBlock);
			b.inputs_N = expr_node.args.length;
			b.outputs_N = expr_node.outputs_N;
			b.id = expr_node.id;
			b.ref = undefined; // bdef or cdef resolution must be done later, after setting output datatypes
			b.init();
			b.o_ports.forEach((p, i) => {
				p.datatype = function () {
					return this.block.ref.o_ports[i].datatype();
				};
			});
			for (let argi = 0; argi < expr_node.args.length; argi++) {
				const ports = convert_expr(expr_node.args[argi], bdef);
				const c = Object.create(bs.CompositeBlock.Connection);
				c.in = ports[1][0];
				c.out = b.i_ports[argi];
				bdef.connections.push(c);
			}
			bdef.blocks.push(b);
			return [[], b.o_ports];
		}
		case 'INLINE_IF_THEN_ELSE': {
			const condition = convert_expr(expr_node.args[0], bdef)[1][0];
			const branches = expr_node.args.slice(1).map(expr => {
				const branch = Object.create(bs.CompositeBlock);
				branch.id = 'if_expr__' + (ifthenelse_branch_counter++);
				branch.bdef_father = bdef;
				branch.outputs_N = 1;
				branch.init();
				const value = convert_expr(expr, branch)[1][0];
				const edge = Object.create(bs.CompositeBlock.Connection);
				edge.in = value;
				edge.out = branch.o_ports[0];
				branch.connections.push(edge);
				return branch;
			});
			return connect_conditional(condition, branches[0], branches[1], bdef);
		}
		}

		// Regular args exprs

		const b = (function () {
			switch (expr_node.name) { 
			case 'BITWISE_NOT_EXPR':
				return Object.create(bs.BitwiseNotBlock);
			case 'LOGICAL_NOT_EXPR':
				return Object.create(bs.LogicalNotBlock);
			case 'UMINUS_EXPR':
				return Object.create(bs.UminusBlock);
			case 'MODULO_EXPR':
				return Object.create(bs.ModuloBlock);
			case 'DIV_EXPR':
				return Object.create(bs.DivisionBlock);
			case 'TIMES_EXPR':
				return Object.create(bs.MulBlock);
			case 'MINUS_EXPR':
				return Object.create(bs.SubtractionBlock);
			case 'PLUS_EXPR':
				return Object.create(bs.SumBlock);
			case 'SHIFT_RIGHT_EXPR':
				return Object.create(bs.ShiftRightBlock);
			case 'SHIFT_LEFT_EXPR':
				return Object.create(bs.ShiftLeftBlock);
			case 'GREATEREQUAL_EXPR':
				return Object.create(bs.GreaterEqualBlock);
			case 'GREATER_EXPR':
				return Object.create(bs.GreaterBlock);
			case 'LESSEQUAL_EXPR':
				return Object.create(bs.LessEqualBlock);
			case 'LESS_EXPR':
				return Object.create(bs.LessBlock);
			case 'NOTEQUAL_EXPR':
				return Object.create(bs.InequalityBlock);
			case 'EQUAL_EXPR':
				return Object.create(bs.EqualityBlock);
			case 'BITWISE_AND_EXPR':
				return Object.create(bs.BitwiseAndBlock);
			case 'BITWISE_EXCLUSIVE_OR_EXPR':
				return Object.create(bs.BitwiseXorBlock);
			case 'BITWISE_INCLUSIVE_OR_EXPR':
				return Object.create(bs.BitwiseOrBlock);
			case 'LOGICAL_AND_EXPR':
				return Object.create(bs.LogicalAndBlock);
			case 'LOGICAL_OR_EXPR':
				return Object.create(bs.LogicalOrBlock);
			case 'CAST_EXPR':
				if (expr_node.type == 'TYPE_INT32')
					return Object.create(bs.CastI32Block);
				else if (expr_node.type == 'TYPE_FLOAT32')
					return Object.create(bs.CastF32Block);
				else if (expr_node.type == 'TYPE_BOOL')
					return Object.create(bs.CastBoolBlock);
				else 
					throw new Error("Unexpected cast type: " + expr_node.type);
			default:
				throw new Error("Unexpected AST expr node");
			}
		})();

		b.init();

		for (let argi = 0; argi < expr_node.args.length; argi++) {
			const ports = convert_expr(expr_node.args[argi], bdef);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = ports[1][0];
			c.out = b.i_ports[argi];
			bdef.connections.push(c);
		}

		bdef.blocks.push(b);

		return [[], b.o_ports];
	}

	function resolve_block_call (b, bdef) {
		const inputDataTypes = b.i_ports.map(p => p.datatype());
		var r = findBdefBySignature(b.id, inputDataTypes, b.outputs_N, bdef);
		if (r) {
			b.ref = r.r;
			b.type = "bdef";
			return;
		}
		r = findCdefBySignature(b.id, inputDataTypes, b.outputs_N, bdef);
		if (r) {
			b.ref = r.r;
			b.type = "cdef";
			return;
		}
		throw new Error("No callable bdef or cdef found with that signature: " + b.id);
	}

	function check_recursive_calls (bdef, stack = []) {
		if (stack.find(b => b == bdef))
			throw new Error("Recursive block calls");
		const nstack = stack.concat(bdef);
		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == 'bdef').forEach(b => {
			check_recursive_calls(b.ref, nstack);
		});
		bdef.bdefs.forEach(bd => check_recursive_calls(bd, nstack));
	}

	function find_initial_bdef (bdef, options) {
		let bds = bdef.bdefs
			.filter(bd => bd.id == options.initial_block_id)
			.filter(bd => bd.i_ports.map(p => p.datatype()).every(d => d == TYPES.Float32))
			.filter(bd => bd.o_ports.map(p => p.datatype()).every(d => d == TYPES.Float32));
		if (bds.length == 1)
			return bds[0];
		bds = bds.filter(bd => bd.inputs_N == options.initial_block_inputs_n);
		if (bds.length == 1)
			return bds[0];
		throw new Error("Initial block not found: " + options.initial_block_id);
	}

	function flatten (bdef, options) {

		const i_bdef = find_initial_bdef(bdef, options);

		bdef.inputs_N = i_bdef.inputs_N;
		bdef.outputs_N = i_bdef.outputs_N;
		const pfs = bdef.i_ports[0];
		bdef.createPorts(bdef.inputs_N + 1, bdef.outputs_N);
		bdef.i_ports[0] = pfs;
		bdef.i_ports.forEach(p => p.datatype = () => TYPES.Float32);
		bdef.o_ports.forEach(p => p.datatype = () => TYPES.Float32);
		bdef.i_ports.forEach((p, i) => {
			if (i == 0)
				return;
			p.id = i_bdef.i_ports[i - 1].id
		});
		bdef.o_ports.forEach((p, i) => p.id = i_bdef.o_ports[i].id);

		const b = Object.create(bs.CallBlock);
		b.id = i_bdef.id;
		b.inputs_N = i_bdef.inputs_N;
		b.outputs_N = i_bdef.outputs_N;
		b.ref = i_bdef;
		b.type = 'bdef';
		b.init();
		for (let i = 0; i < i_bdef.inputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[i + 1]; // Cuz of fs
			c.out = b.i_ports[i];
			bdef.connections.push(c);
		}
		for (let i = 0; i < i_bdef.outputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = b.o_ports[i];
			c.out = bdef.o_ports[i];
			bdef.connections.push(c);
		}
		bdef.blocks.push(b);

		while (true) {
			const ib = bdef.blocks.find(bb => bs.IfthenelseBlock.isPrototypeOf(bb));
			if (ib) {
				ib.flatten(bdef);
				continue;
			}
			const hasBdefCalls = bdef.blocks.some(bb => bs.CallBlock.isPrototypeOf(bb) && bb.type == 'bdef');
			if (hasBdefCalls) {
				bdef.flatten();
				continue;
			}
			break;
		}

		bdef.id = i_bdef.id;

		// Storage sizes are compile-time expressions, even when the storage is
		// declared inside a branch. Their constants can be shared with runtime code.
		const static_blocks = new Set();
		function constant_size(b, visiting = new Set()) {
			if (static_blocks.has(b)) return true;
			if (visiting.has(b) || b == bdef || bs.MemoryReaderBlock.isPrototypeOf(b)
				|| bs.CallBlock.isPrototypeOf(b)) return false;
			visiting.add(b);
			const constant = bs.ConstantBlock.isPrototypeOf(b) || (b.i_ports.length > 0
				&& b.i_ports.every(p => {
					const c = bdef.connections.find(c => c.out == p);
					return c && constant_size(c.in.block, visiting);
				}));
			visiting.delete(b);
			if (constant) static_blocks.add(b);
			return constant;
		}
		for (const memory of bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b))) {
			const size = bdef.connections.find(c => c.out == memory.i_ports[0]);
			memory.static_size = constant_size(size.in.block);
		}
		for (const block of static_blocks) {
			const guards = block.guard_ports;
			bdef.connections = bdef.connections.filter(c => !guards.includes(c.out));
			block.guard_ports = [];
		}

		bdef.propagateDataTypes();
		normalize_properties(bdef);

		(function validate (bdef) {
			const mems = bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b));
			mems.forEach(m => {
				const p = bdef.properties.find(p => p.of == m && p.type == 'init');
				if (!p)
					throw new Error("Memory init not assigned");
			});
			bdef.properties.forEach(p => {
				if (bdef.properties.filter(pp => pp.of == p.of && pp.type == p.type).length > 1)
					throw new Error("Cannot assign property multiple times");
			});
		})(bdef);

		(function set_mem_init (bdef) {
			const mems = bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b));
			mems.forEach(m => {
				const p = bdef.properties.find(p => p.of == m && p.type == 'init');
				const c = Object.create(bs.CompositeBlock.Connection);
				c.in = p.block.o_ports[0];
				c.out = m.i_ports[1];
				bdef.connections.push(c);
			});
		})(bdef);

		bdef.propagateDataTypes();

		// It's important to call this after flattening/cloning
		setUpdateRate(bdef, options);

	}

	// replace properties with blocks/connections
	// Assuming bdef flattened
	function normalize_properties (bdef) {

		// Initializers use initial signal values, not the first active sample.
		(function explicitize_init (bdef) {
			// y.init = expr -> y.init = (expr).init
			bdef.properties.filter(p => p.type == 'init').forEach(p => {
				const c = bdef.connections.find(c => c.out == p.block.i_ports[0]);
				if (!c)
					return;
				// C wrappers explicitly connect outputs produced by reset callbacks.
				if (bs.CallBlock.isPrototypeOf(c.in.block) && c.in.block.type == 'cdef')
					return;
				const v = convert_property(c.in.block, "init", bdef);
				c.in = v.o_ports[0];
			});
		})(bdef);

		// TODO: Fix this, it's too strict. Or maybe no, since mem r/w are separated, loops cannot exist
		(function detect_inference_loops (bdef) {
			// Like: y = y.fs with y.fs inferred
			bdef.properties.map(p => p.block).forEach(b => {
				(function f (b, stack, inferring) {
					if (inferring)
						if (stack.find(bb => b == bb))
							throw new Error("Recursive properties inference. Stack: " + stack.toString() + " + " + b.toString());
					if (b.__visited__)
						return;	
					b.__visited__ = true;
					var gotta = false;
					b.i_ports.forEach(p => {
						const c = bdef.connections.find(c => c.out == p);
						if (c) {
							f(c.in.block, stack.concat(b), inferring);
							gotta = true;
						}
					});
					if (gotta) {
						return;
					}
					bdef.properties.filter(p => p.block == b).forEach(p => {
						f (p.of, stack.concat(b), true);
					});
				})(b, [], false);
			});
		})(bdef);

		const b0 = Object.create(bs.ConstantBlock);
		b0.value = 0;
		b0.datatype = () => TYPES.Float32;
		b0.init();
		bdef.blocks.push(b0);

		const fs = findVarById("fs", bdef).r;

		const toBeNormalized = bdef.properties.map(p => p.block);
		for (let i = 0; i < toBeNormalized.length; i++) {
			normalize(toBeNormalized[i]);
		}
		bdef.blocks.forEach(b => { 
			delete b.__visited__;
			delete b.__normalized__; 
		});
		bdef.clean();

		// Checks whether b has inputs or needs to be inferred
		function normalize (b) {
			if (b.__normalized__)
				return;
			b.__normalized__ = true;
			if (b == bdef)
				return;
			if (b == fs)
				return;
			if (b.i_ports.length == 0)
				return;
			if (bdef.connections.find(c => c.out == b.i_ports[0]))
				return;
			
			// Otherwise inference is needed

			const p = bdef.properties.find(p => p.block == b);
			if (!p)
				throw new Error("No property found: " + b.toString());

			if (p.type == "fs")
				infer_fs(p);
			if (p.type == "init")
				infer_init(p);
		}

		function infer_fs (p) {

			normalize(p.of);
			const m = get_fs(p.of);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = m.o_ports[0];
			c.out = p.block.i_ports[0];
			bdef.connections.push(c);

			function get_fs (b) {
				if (b == bdef)
					return fs;
				if (b == fs)
					return fs;
				if (bs.ConstantBlock.isPrototypeOf(b))
					return b0;
				
				const max = Object.create(bs.MaxBlock);
				max.datatype = () => TYPES.Float32;
				max.createPorts(b.i_ports.length, 1);
				max.init();
				for (let i = 0; i < b.i_ports.length; i++) {
					const p_o = b.i_ports[i];
					const p_i = bdef.connections.find(x => x.out == p_o).in;
					var v;
					if (p_i.block == bdef)
						v = fs;
					else if (p_i.block == fs)
						v = fs;
					else {
						v = convert_property(p_i.block, "fs", bdef);
						toBeNormalized.push(v);
					}
					const c = Object.create(bs.CompositeBlock.Connection);
					c.in = v.o_ports[0];
					c.out = max.i_ports[i];
					bdef.connections.push(c);
				}
				bdef.blocks.push(max);
				return max;
			}
		}

		function infer_init (p) {
			normalize(p.of);

			const b = get_init(p.of);
			if (b == p.block)
				return; // Avoid creating recursive self-edge on property carrier var
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = b.o_ports[0];
			c.out = p.block.i_ports[0];
			bdef.connections.push(c);

			function get_init(b) {
				if (b == bdef)
					return b0; //throw new Error("Unimplemented. Note: set default for audio (0) or take user compilation inputs");
				if (bs.ConstantBlock.isPrototypeOf(b))
					return b;
				if (b == fs)
					return b;
				if (bs.MemoryReaderBlock.isPrototypeOf(b))
					return convert_property(b.memoryblock, 'init', bdef);
				if (has_explicit_init_assignment(b))
					return convert_property(b, 'init', bdef);
				// Branch outputs inherit an explicit initializer from their lexical
				// parent, never from an unrelated variable with the same spelling.
				for (let parent = b.init_parent; parent; parent = parent.init_parent) {
					if (has_explicit_init_assignment(parent))
						return convert_property(parent, 'init', bdef);
				}

				b.setToBeCloned();
				const bb = b.clone();
				bb.guard_ports = []; // Initialization does not run on the branch clock.

				b.i_ports.forEach((pp, i) => {
					const c = bdef.connections.find(c => c.out == pp);
					let vv;
					if (bs.ConstantBlock.isPrototypeOf(c.in.block))
						vv = c.in.block;
					else {
						vv = convert_property(c.in.block, "init", bdef);
						toBeNormalized.push(vv);
					}
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = vv.o_ports[0];
					cc.out = bb.i_ports[i];
					bdef.connections.push(cc);
				});
				bdef.blocks.push(bb);
				return bb;
			}

			function has_explicit_init_assignment (b) {
				const p = bdef.properties.find(p => p.of == b && p.type == "init");
				if (!p)
					return false;
				return !!bdef.connections.find(c => c.out == p.block.i_ports[0]);
			}

		}
	}

	function setUpdateRate (bdef, options) {
		options.control_inputs.forEach(c => {
			const p = bdef.i_ports.find(p => p.id == c);
			if (!p)
				throw new Error("No input with such id. " + bdef.i_ports.join());
			p.updaterate = () => RATES.Control;
		});
		bdef.i_ports.forEach(p => {
			if (!options.control_inputs.includes(p.id))
				p.updaterate = () => RATES.Audio;
		});
		bdef.i_ports[0].updaterate = () => RATES.Fs;

		// Every memory read is a snapshot of this sample's old state. Guarded
		// computations run in the sample loop, including their first activation.
		for (const block of bdef.blocks) {
			if (bs.MemoryReaderBlock.isPrototypeOf(block) || block.guard_ports.length > 0
				|| (bs.CallBlock.isPrototypeOf(block) && block.type == 'cdef'))
				block.o_ports.forEach(p => p.updaterate = () => RATES.Audio);
		}
		// C outputs belong to the phase that produces them. In particular, reset
		// results must be available to memory initializers before the sample loop.
		for (const b of bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == 'cdef')) {
			for (const [name, rate] of [['init', RATES.Constant], ['set_sample_rate', RATES.Fs],
				['reset_coeffs', RATES.Reset], ['reset_state', RATES.Reset]]) {
				const f = b.ref.funcs[name];
				if (!f) continue;
				for (const arg of [...f.f_outputs, ...f.f_inputs.filter(arg => /^o[0-9]+$/.test(arg))])
					b.o_ports[Number(arg.slice(1))].updaterate = () => rate;
			}
		}
		bdef.propagateUpdateRates();
	}

	// Assuming bdef flattened

	// Local expression rewrites and reachability. Never merge state or move a
	// computation across branch clocks. Properties have already become edges.
	function optimize (bdef, options) {
		const incoming = new Map(bdef.connections.map(c => [c.out, c]));
		const input = port => incoming.get(port).in;
		function replace(block, source) {
			for (const edge of bdef.connections)
				if (edge.in == block.o_ports[0]) edge.in = source;
			bdef.connections = bdef.connections.filter(c => c.out.block != block);
			bdef.blocks = bdef.blocks.filter(b => b != block);
			bdef.properties = bdef.properties.filter(p => p.of != block && p.block != block);
		}
		function same_guards(a, b) {
			return a.guard_ports.length == b.guard_ports.length && a.guard_ports.every((p, i) =>
				p.negated == b.guard_ports[i].negated && input(p) == input(b.guard_ports[i]));
		}

		// Each rewrite removes a negation, so chains simplify regardless of
		// block order after flattening. A shared inner negation remains available
		// to its other consumers; reachability removes it when it becomes unused.
		let changed;
		do {
			changed = false;
			for (const b of bdef.blocks.slice()) {
				if (!bs.UminusBlock.isPrototypeOf(b) && !bs.LogicalNotBlock.isPrototypeOf(b))
					continue;
				const source = input(b.i_ports[0]);
				if (options.optimizations.negative_negative
					&& Object.getPrototypeOf(b) == Object.getPrototypeOf(source.block)
					&& same_guards(b, source.block)
					&& (bs.LogicalNotBlock.isPrototypeOf(b) || b.o_ports[0].datatype() == TYPES.Float32)) {
					// Signed integer negation can overflow at INT_MIN. Keep it explicit.
					replace(b, input(source.block.i_ports[0]));
					changed = true;
				} else if (options.optimizations.negative_consts && bs.UminusBlock.isPrototypeOf(b)
					&& bs.ConstantBlock.isPrototypeOf(source.block)) {
					const value = source.block.value;
					const type = source.block.datatype();
					if (!Number.isFinite(value) || (type == TYPES.Int32
						&& (!Number.isInteger(value) || value <= -2147483648 || value > 2147483647)))
						continue;
					const constant = Object.create(bs.ConstantBlock);
					constant.value = type == TYPES.Int32 && value == 0 ? 0 : -value;
					constant.datatype = () => type;
					constant.init();
					bdef.blocks.push(constant);
					replace(b, constant.o_ports[0]);
					changed = true;
				}
			}
		} while (changed);

		if (options.optimizations.unify_consts) {
			const constants = [];
			for (const b of bdef.blocks.slice()) {
				if (!bs.ConstantBlock.isPrototypeOf(b)) continue;
				// Object.is keeps +0 and -0 distinct, and types never share a node.
				const same = constants.find(c => c.datatype() == b.datatype() && Object.is(c.value, b.value));
				if (same) replace(b, same.o_ports[0]);
				else constants.push(b);
			}
		}

		if (options.optimizations.remove_dead_graph) {
			const live = new Set();
			function visit(block) {
				if (block == bdef || live.has(block))
					return;
				live.add(block);
				if (bs.MemoryReaderBlock.isPrototypeOf(block))
					visit(block.memoryblock);
				if (bs.MemoryBlock.isPrototypeOf(block))
					bdef.blocks.filter(b => bs.MemoryWriterBlock.isPrototypeOf(b) && b.memoryblock == block).forEach(visit);
				for (const port of block.inputs()) {
					const edge = bdef.connections.find(c => c.out == port);
					if (edge) visit(edge.in.block);
				}
			}
			bdef.o_ports.forEach(p => visit(bdef.connections.find(c => c.out == p).in.block));
			bdef.blocks = bdef.blocks.filter(b => live.has(b));
			bdef.connections = bdef.connections.filter(c => (c.in.block == bdef || live.has(c.in.block)) && (c.out.block == bdef || live.has(c.out.block)));
			bdef.properties = bdef.properties.filter(p => live.has(p.block) && live.has(p.of));
		}
		bdef.propagateDataTypes();
		setUpdateRate(bdef, options);
	}

	function findVarById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.VarBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}


	function findMemById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	// Hierarchly find bdef that contains block
	function findBdefByBlock (block, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => b == block);
			if (r)
				return bd;
			bd = bd.bdef_father;
		}
	}

	function findBdefBySignature (id, inputDataTypes, outputs_N, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.bdefs.find(b => 
				(b.id == id) && 
				(b.i_ports.length == inputDataTypes.length) &&
				(b.i_ports.map(p => p.datatype()).every((t, i) => t == inputDataTypes[i])) &&
				(b.o_ports.length == outputs_N));
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	function findCdefBySignature (id, inputDataTypes, outputs_N, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.cdefs.find(b => 
				(b.id == id) && 
				(b.i_ports.length == inputDataTypes.length) &&
				(b.i_ports.map(p => p.datatype()).every((t, i) => t == inputDataTypes[i])) &&
				(b.o_ports.length == outputs_N));
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	function getDataType (s) {
		switch (s) {
		case "TYPE_INT32":
			return TYPES.Int32;
		case "TYPE_FLOAT32":
			return TYPES.Float32;
		case "TYPE_BOOL":
			return TYPES.Bool;
		case undefined:
			return TYPES.Float32;
		default:
			throw new Error("Unexpected datatype " + s);
		}
	}

	exports["ASTToGraph"] = ASTToGraph;
	exports["flatten"] = flatten;
	exports["optimize"] = optimize;
}());
