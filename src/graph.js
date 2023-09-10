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


	function ASTToGraph (root, options) {

		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = "0";
		bdef.bdef_father = undefined;
		bdef.inputs_N = 0; // set later
		bdef.outputs_N = 0; // ^
		bdef.init();

		const fs = Object.create(bs.VarBlock);
		fs.id = "fs";
		fs.datatype = () => ts.DataTypeFloat32;
		fs.init();
		fs.i_ports[0].datatype = () => ts.DataTypeFloat32; // Trick, maybe set as system input
		bdef.blocks.push(fs);

		convert_statements(root.statements, bdef);

		bdef.propagateDataTypes();

		(function resolve_call_blocks (bdef) {
			bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b)).forEach(b => {
				resolve_call_block(b, bdef);
			});
			bdef.bdefs.forEach(bd => resolve_call_blocks(bd));
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

			bdef.blocks.push(v);
			bdef.connections.push(c);
		});

		convert_statements(bdef_node.statements, bdef);

		bdef.__bdefnode__ = bdef_node;

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
				throw "Not imeplemented yet"
				break;
			}
			case 'IF_THEN_ELSE': {
				throw "Not imeplemented yet"
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
			b.bdef = undefined; // Identification of the instantiated bdef must be done later, after setting output datatypes
			b.init();
			b.o_ports.forEach((p, i) => {
				p.datatype = function () {
					return this.block.bdef.o_ports[i].datatype();
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
			throw "Not imeplemented yet"
			return;
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

	function resolve_call_block (b, bdef) {
		const inputDataTypes = b.i_ports.map(p => p.datatype());
		const r = findBdefBySignature(b.id, inputDataTypes, b.outputs_N, bdef);
		if (!r)
			throw new Error("No callable bdef found with that signature");
		b.bdef = r.r;
	}

	function check_recursive_calls (bdef, stack = []) {
		if (stack.find(b => b == bdef))
			throw new Error("Recursive block calls");
		const nstack = stack.concat(bdef);
		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b)).forEach(b => {
			check_recursive_calls(b.bdef, nstack);
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
		bdef.createPorts(bdef.inputs_N, bdef.outputs_N);
		bdef.i_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);
		bdef.o_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);

		const b = Object.create(bs.CallBlock);
		b.id = i_bdef.id;
		b.inputs_N = bdef.inputs_N;
		b.outputs_N = bdef.outputs_N;
		b.bdef = i_bdef;
		b.init();
		for (let i = 0; i < bdef.inputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[i];
			c.out = b.i_ports[i];
			bdef.connections.push(c);
		}
		for (let i = 0; i < bdef.outputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = b.o_ports[i];
			c.out = bdef.o_ports[i];
			bdef.connections.push(c);
		}
		bdef.blocks.push(b);

		bdef.flatten();

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
	}

	// replace properties with blocks
	function normalize_properties (bdef) {
		// Assuming bdef flattened

		(function explicitize_init (bdef) {
			// y.init = x -> y.init = x.init
			bdef.properties.filter(p => p.type == 'init').forEach(p => {
				const c = bdef.connections.find(c => c.out == p.block.i_ports[0]);
				if (!c)
					return;
				const v = convert_property(c.in.block, "init", bdef);
				c.in = v.o_ports[0];
			});
		})(bdef);

		// TODO: Fix this, it's too strict
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
			delete b.__clun__;
		});

		// Tmp - cleaning maxes and vars with 1 input...
		(function simplifly (bdef) {
			var l = bdef.blocks.length;
			for (let i = 0; i < l; i++) {
				const b = bdef.blocks[i];
				if (!bs.MaxBlock.isPrototypeOf(b) && !bs.VarBlock.isPrototypeOf(b))
					continue;
				if (b.i_ports.length != 1)
					continue;
				const cin = bdef.connections.find(c => c.out == b.i_ports[0]);
				const cons = bdef.connections.filter(c => c.in  == b.o_ports[0]);
				if (cons.length != 1)
					continue;
				const con = cons[0];
				if (!cin || !con)
					continue;
				cin.out = con.out;
				bdef.connections.splice(bdef.connections.indexOf(con), 1);
				bdef.blocks.splice(i, 1);
				i--;
				l--;
			}
		})(bdef);

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

				const bb = b.__clun__ ? b.__clun__ : b.clone(); // Test tmp
				b.__clun__ = bb

				const args = [];
				b.i_ports.forEach((pp, i) => {
					const c = bdef.connections.find(c => c.out == pp);
					const vv = convert_property(c.in.block, "init", bdef);
					normalize(vv);
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
}());