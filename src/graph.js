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

	const ts = require("./types");
	const bs = require("./blocks").BlockTypes;
	const us = require("./uprates");

	function ASTToGraph (root, options, cblock_descs = []) {

		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = "0";
		bdef.bdef_father = undefined;
		bdef.inputs_N = 1; // fs
		bdef.outputs_N = 0;
		bdef.init();
		bdef.i_ports[0].datatype = () => ts.DataTypeFloat32;
		bdef.i_ports[0].updaterate = () => us.UpdateRateFs;
		bdef.i_ports[0].id = "fs";

		(function create_fs (bdef) {
			const fs = Object.create(bs.VarBlock);
			fs.id = "fs";
			fs.datatype = () => ts.DataTypeFloat32;
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
				throw new Error("Not imeplemented yet");
			}
			case 'IF_THEN_ELSE': {
				throw new Error("Not imeplemented yet");
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
							throw new Error("Property assiged multiple times");
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
				v.datatype = () => ts.DataTypeFloat32;
				v.i_ports[0].datatype = () => ts.DataTypeFloat32; // Check this
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
				b.datatype = () => ts.DataTypeInt32;
			else if (expr_node.type == 'FLOAT32')
				b.datatype = () => ts.DataTypeFloat32;
			else if (expr_node.type == 'BOOL')
				b.datatype = () => ts.DataTypeBool;
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
			throw new Error("Not imeplemented yet");
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
					throw new Error("Unexpect cast type: " + expr_node.type);
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
			.filter(bd => bd.i_ports.map(p => p.datatype()).every(d => d == ts.DataTypeFloat32))
			.filter(bd => bd.o_ports.map(p => p.datatype()).every(d => d == ts.DataTypeFloat32));
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
		bdef.i_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);
		bdef.o_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);
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

		bdef.flatten();

		bdef.id = i_bdef.id;

		normalize_properties(bdef);

		(function validate (bdef) {
			const mems = bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b));
			mems.forEach(m => {
				const p = bdef.properties.find(p => p.of == m && p.type == 'init');
				if (!p)
					throw new Error("Memory init not assiged");
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

		// It's important to call this after flattening/cloning
		setUpdateRate(bdef, options);

		propagateControlDependencies(bdef);
	}

	// replace properties with blocks/connections
	// Assuming bdef flattened
	function normalize_properties (bdef) {

		// I propose to remove this blasfemy
		// This is also a bad place for this
		(function explicitize_init (bdef) {
			// y.init = expr -> y.init = (expr).init
			bdef.properties.filter(p => p.type == 'init').forEach(p => {
				const c = bdef.connections.find(c => c.out == p.block.i_ports[0]);
				if (!c)
					return;
				// This is a not nice cheating too:
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
		b0.datatype = () => ts.DataTypeFloat32;
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
				throw new Error("No propery found..." + b.toString());

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
				max.datatype = () => ts.DataTypeFloat32;
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

				b.setToBeCloned();
				const bb = b.clone();

				const args = [];
				b.i_ports.forEach((pp, i) => {
					const c = bdef.connections.find(c => c.out == pp);
					const vv = convert_property(c.in.block, "init", bdef);
					toBeNormalized.push(vv);
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = vv.o_ports[0];
					cc.out = bb.i_ports[i];
					bdef.connections.push(cc);
				});
				bdef.blocks.push(bb);
				return bb;
			}
		}
	}

	function setUpdateRate (bdef, options) {
		options.control_inputs.forEach(c => {
			const p = bdef.i_ports.find(p => p.id == c);
			if (!p)
				throw new Error("No input with such id. " + bdef.i_ports.join());
			p.updaterate = () => us.UpdateRateControl;
		});
		bdef.i_ports.forEach(p => {
			if (!options.control_inputs.includes(p.id))
				p.updaterate = () => us.UpdateRateAudio;
		});
		bdef.i_ports[0].updaterate = () => us.UpdateRateFs;

		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == 'cdef').forEach(b => {
			b.o_ports.forEach((p, i) => {
				const u = b.ref.o_ports[i].updaterate;
				p.updaterate = u;
			});
		});

		// Detecting memory loops and setting updaterate to Audio for now
		const mems = bdef.blocks.filter(b => bs.MemoryReaderBlock.isPrototypeOf(b)).map(b => b.memoryblock);
		mems.forEach(m => {
			const ws = bdef.blocks.filter(b => bs.MemoryWriterBlock.isPrototypeOf(b) && b.memoryblock == m);
			ws.forEach(w => f(w));

			bdef.blocks.forEach(b => delete b.__visited__);
			function f (b) {
				if (b.__visited__)
					return;
				b.__visited__ = true;
				if (bs.MemoryReaderBlock.isPrototypeOf(b) && b.memoryblock == m) {
					b.o_ports[0].updaterate = () => us.UpdateRateAudio;
				}
				bdef.connections.filter(c => c.out.block == b).forEach(c => {
					f (c.in.block);
				});
			};
		});

		bdef.propagateUpdateRates();

		// TODO: think about memory update rate. Readings should be up-bounded to writings...?
	}

	// Assuming bdef flattened
	function propagateControlDependencies (bdef) {

		// Better to reset
		bdef.blocks.forEach(b => b.control_dependencies = new Set());

		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateControl).forEach(p => {
			const cs = bdef.connections.filter(c => c.in == p);
			cs.forEach(c => f (c.out.block, p.id));
			bdef.blocks.forEach(b => delete b.__visited__);
		});

		function f (b, ctrd) {
			if (b == bdef)
				return;
			if (b.__visited__)
				return;
			b.__visited__ = true;

			b.control_dependencies.add(ctrd);

			b.o_ports.forEach(p => {
				const cs = bdef.connections.filter(c => c.in == p)
				cs.forEach(c => f (c.out.block, ctrd));
			});
		}
	}

	// Assuming bdef flattened
	function optimize (bdef, options) {

		var _x_counter = 0;

		if (options.optimizations["remove_dead_graph"])
			remove_dead_graph();

		if (options.optimizations["negative_negative"])
			negative_negative();

		if (options.optimizations["negative_consts"])
			negative_consts();

		if (options.optimizations["unify_consts"])
			unify_consts();
	
		if (options.optimizations["remove_useless_vars"])
			remove_useless_vars();

		if (options.optimizations["merge_vars"])
			merge_vars();

		if (options.optimizations["merge_max_blocks"])
			merge_max_blocks();

		if (options.optimizations["simplifly_max_blocks1"])
			simplifly_max_blocks1();

		if (options.optimizations["simplifly_max_blocks2"])
			simplifly_max_blocks2();

		// Sad that we need this
		setUpdateRate(bdef, options);

		if (options.optimizations["lazyfy_subexpressions_rates"])
			lazyfy_subexpressions_rates();

		if (options.optimizations["lazyfy_subexpressions_controls"])
			lazyfy_subexpressions_controls();

		// Needed cuz we eventually created new blocks... Anything better?
		propagateControlDependencies (bdef);


		function safely_remove_blocks (blocks) {
			blocks.forEach(b => {
				const i = bdef.blocks.indexOf(b);
				bdef.blocks.splice(i, 1);
			});
		}

		function safely_remove_connections (conns) {
			conns.forEach(c => {
				const i = bdef.connections.indexOf(c);
				bdef.connections.splice(i, 1);
			});
		}

		// Very similar to the scheduling...
		function remove_dead_graph () {
			
			var blocks = [];
			var conns = [];
			
			const iconns = bdef.o_ports.map(p => bdef.connections.find(c => c.out == p));
			const roots = iconns.map(c => c.in.block);

			for (let i = 0; i < roots.length; i++) {
				f (roots[i]);
			}

			conns = conns.concat(iconns);

			bdef.blocks = blocks;
			bdef.connections = conns;
			
			bdef.blocks.forEach(b => delete b.__visited__);

			function f (b) {
				if (b == bdef)
					return;

				if (b.__visited__)
					return;
				b.__visited__ = true;

				if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
					roots.push(b.memoryblock);
				}

				if (bs.MemoryBlock.isPrototypeOf(b)) {
					bdef.blocks.filter(bb => bs.MemoryWriterBlock.isPrototypeOf(bb) && bb.memoryblock == b).forEach(bb => {
						roots.push(bb);
					});
				}

				b.i_ports.forEach(p => {
					const cc = bdef.connections.find(c => c.out == p);
					const bb = cc.in.block;
					conns.push(cc);
					f (bb);
				});
				
				blocks.push(b);
			}
		}

		function negative_negative () {

			bdef.connections.forEach(c => {
				if (!bdef.connections.includes(c))
					return;

				const l = c.in.block;
				const r = c.out.block;

				if (!(bs.UminusBlock.isPrototypeOf(l) && bs.UminusBlock.isPrototypeOf(r)))
					return;

				const rem_blocks = [];
				const rem_conns = [];

				const llc  = bdef.connections.find(c => c.out == l.i_ports[0]);
				const lrcs = bdef.connections.filter(c => c.in == l.o_ports[0]);
				const rlc  = c;
				const rrcs = bdef.connections.filter(c => c.in == r.o_ports[0]);

				rrcs.forEach(cc => {
					cc.in = llc.in;
				});

				if (lrcs.length == 1) {
					rem_blocks.push(l);
					rem_blocks.push(r);
					rem_conns.push(llc);
					rem_conns.push(rlc);
				}
				else {
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}

				safely_remove_blocks(rem_blocks);
				safely_remove_connections(rem_conns);
			});
		}

		function negative_consts () {
			
			bdef.connections.forEach(c => {

				const l = c.in.block;
				const r = c.out.block;

				if (!(bs.ConstantBlock.isPrototypeOf(l) && bs.UminusBlock.isPrototypeOf(r)))
					return;

				const rem_blocks = [];
				const rem_conns = [];

				const lrcs = bdef.connections.filter(c => c.in == l.o_ports[0]);
				const rlc  = c;
				const rrcs = bdef.connections.filter(c => c.in == r.o_ports[0]);

				const nc = Object.create(bs.ConstantBlock);
				nc.value = -l.value;
				nc.datatype = l.datatype;
				nc.init();
				bdef.blocks.push(nc);

				rrcs.forEach(cc => {
					cc.in = nc.o_ports[0];
				});

				if (lrcs.length == 1) {
					rem_blocks.push(l);
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}
				else {
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}
				
				safely_remove_blocks(rem_blocks);
				safely_remove_connections(rem_conns);
			});
		}

		function unify_consts () {

			const rem_blocks = [];
			const rem_conns = [];

			const CBlocks = bdef.blocks.filter(b => bs.ConstantBlock.isPrototypeOf(b));

			const values = [
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeFloat32).map(b => b.value))).map(v => [ts.DataTypeFloat32, v]),
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeInt32).map(b => b.value))).map(v => [ts.DataTypeInt32, v]),
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeBool).map(b => b.value))).map(v => [ts.DataTypeBool, v])
			].flat(1);

			values.forEach(v => {
				const VBlocks = CBlocks.filter(b => b.datatype() == v[0] && b.value == v[1]);
				const VB0 = VBlocks[0];
				for (let i = 1; i < VBlocks.length; i++) {
					const vb = VBlocks[i];
					const cs = bdef.connections.filter(c => c.in == vb.o_ports[0]);
					cs.forEach(c => {
						c.in = VB0.o_ports[0];
					});
					rem_blocks.push(vb);
				}
			});

			safely_remove_blocks(rem_blocks);
		}

		function remove_useless_vars () {

			const VBlocks = bdef.blocks.filter(b => bs.VarBlock.isPrototypeOf(b));

			VBlocks.forEach(b => {
				const rem_blocks = [];
				const rem_conns = [];

				const lc  = bdef.connections.find(c => c.out == b.i_ports[0]);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);

				if (rcs.length != 1)
					return;
				if (rcs.some(c => c.out.block == bdef))
					return;

				rcs[0].in = lc.in;
				rem_blocks.push(b)
				rem_conns.push(lc);

				safely_remove_blocks(rem_blocks); // Check this position in the ohter opts
				safely_remove_connections(rem_conns);
			});
		}

		function merge_vars () {
			// TODO: y1 = 5; y2 = 5. Merge y1 and y2
		}

		function merge_max_blocks () {

			const rem_blocks = [];
			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach(b => f(b));

			function f (b) {
				if (b.__handling__)
					return;
				b.__handling__ = true;

				const incs = bdef.connections.filter(c => c.out.block == b);
				
				const newports = [];
				incs.forEach(c => {
					const bb = c.in.block;
					if (bs.MaxBlock.isPrototypeOf(bb)) {
						f(bb);
						bb.i_ports.forEach(p => newports.push(p));
						rem_blocks.push(bb);
						rem_conns.push(c);
					}
					else {
						newports.push(c.out);
					}
				});
				newports.forEach(p => p.block = b);
				b.i_ports = newports;
			}

			MBlocks.forEach(b => delete b.__handling__);
			safely_remove_blocks(rem_blocks);
			safely_remove_connections(rem_conns);
		}

		function simplifly_max_blocks1 () {

			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach((b, i) => {
				const lcs = bdef.connections.filter(c => c.out.block == b);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);
				
				const lps = Array.from(new Set(lcs.map(c => c.in)));
				const newlps = [];
				var c0 = undefined;
				for (let i = 0; i < lps.length; i++) {
					if (bs.ConstantBlock.isPrototypeOf(lps[i].block) && lps[i].block.value == 0)
						c0 = lps[i];
					else
						newlps.push(lps[i]);
				}
				if (newlps.length == 0) {
					if (!c0)
						throw new Error("Invalid max block found");
					newlps.push(c0);
				}

				b.createPorts(newlps.length, 1);
				b.init();
				newlps.forEach((p, ii) => {
					const c = Object.create(bs.CompositeBlock.Connection);
					c.in = p;
					c.out = b.i_ports[ii];
					bdef.connections.push(c);
				});
				rcs.forEach(c => {
					c.in = b.o_ports[0];
				});
				lcs.forEach(c => {
					rem_conns.push(c);
				});
			});

			safely_remove_connections(rem_conns);
		}

		function simplifly_max_blocks2 () {

			const rem_blocks = [];
			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach(b => {
				if (b.i_ports.length != 1)
					return;

				const lc  = bdef.connections.find(c => c.out == b.i_ports[0]);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);

				rcs.forEach(c => {
					c.in = lc.in;
				});

				rem_blocks.push(b)
				rem_conns.push(lc);
			});

			safely_remove_blocks(rem_blocks);
			safely_remove_connections(rem_conns);
		}

		// Assuming blocks with only 1 output
		function lazyfy_subexpressions_rates () {

			bdef.blocks.forEach(b => {
				if (b.o_ports.length == 0)
					return; // Uhm, what to do in this case?
				const our = b.o_ports[0].updaterate();
				b.i_ports.forEach(p => {
					const c = bdef.connections.find(c => c.out == p);
					const iur = c.in.updaterate();
					if (us.equal(our, iur))
						return;
					if (bs.VarBlock.isPrototypeOf(c.in.block))
						return;
					if (bs.ConstantBlock.isPrototypeOf(c.in.block))
						return;
					const v = Object.create(bs.VarBlock);
					v.id = "_x_" + _x_counter++;
					const d = c.in.datatype();
					v.datatype = () => d;
					v.init();
					v.i_ports[0].datatype = () => d;
					v.i_ports[0].updaterate = () => iur;
					v.o_ports[0].updaterate = () => iur;
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = v.o_ports[0];
					cc.out = c.out;
					c.out = v.i_ports[0];
					bdef.blocks.push(v);
					bdef.connections.push(cc);
				});
			});
		}

		function lazyfy_subexpressions_controls () {
			return; // Something is wrong here
			// Here too
			bdef.blocks.filter(b => b.o_ports.length != 0 && b.o_ports[0].updaterate() == us.UpdateRateControl).forEach(b => {

				b.i_ports.forEach(p => {
					const c = bdef.connections.find(c => c.out == p);
					const iur = c.in.updaterate();
					const bb = c.in.block;

					if (bb == bdef)
						return;
					if (Set.checkEquality(b.control_dependencies, bb.control_dependencies))
						return;
					if (bs.VarBlock.isPrototypeOf(bb))
						return;

					const v = Object.create(bs.VarBlock);
					v.id = "_x_" + _x_counter++;
					const d = c.in.datatype();
					v.datatype = () => d;
					v.init();
					v.i_ports[0].datatype = () => d;
					v.i_ports[0].updaterate = () => iur;
					v.o_ports[0].updaterate = () => iur;
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = v.o_ports[0];
					cc.out = c.out;
					c.out = v.i_ports[0];
					bdef.blocks.push(v);
					bdef.connections.push(cc);
				});
			});
		}
	};

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
			return ts.DataTypeInt32;
		case "TYPE_FLOAT32":
			return ts.DataTypeFloat32;
		case "TYPE_BOOL":
			return ts.DataTypeBool;
		case undefined:
			return ts.DataTypeFloat32;
		default:
			throw new Error("Unexpected datatype " + s);
		}
	}

	exports["ASTToGraph"] = ASTToGraph;
	exports["flatten"] = flatten;
	exports["optimize"] = optimize;
}());