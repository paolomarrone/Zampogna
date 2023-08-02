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
		bdef.inputs_N = 0; // TODO, same as initial_block
		bdef.outputs_N = 0; // ^
		bdef.init();

		convert_statements(root.statements, bdef);

		return bdef;
	}

	

	function convert_block_definition (bdef_node, bdef_father) {
		
		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = bdef_node.id;
		bdef.bdef_father = bdef_father;
		bdef.inputs_N = bdef_node.inputs.length;
		bdef.outputs_N = bdef_node.outputs.length;
		bdef.init();
		bdef_node.inputs.forEach(i => {
			bdef.inputDataTypes.push(getDataType(i.declaredType));
		});
		bdef_node.outputs.forEach(o => {
			bdef.outputDataTypes.push(getDataType(o.declaredType));
		});

		// Adding input/outputs
		bdef_node.inputs.forEach((p, i) => {
			const v = Object.create(bs.VarBlock);
			v.id = p.id;
			v.datatype = getDataType(p.declaredType);
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
			v.datatype = getDataType(p.declaredType);
			v.init();

			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = v.o_ports[0];
			c.out = bdef.o_ports[i];

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
				if (bdef.blocks.some(bb => bb.id == o.id)) // Is output
					return;
				const v = Object.create(bs.VarBlock);
				v.id = o.id
				v.datatype = getDataType(o.declaredType);
				v.init();
				bdef.blocks.push(v);
			});
		});
		
		// Adding MEMORY DECLARATIONS blocks
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = Object.create(bs.MemoryBlock);
			m.id = s.id;
			m.datatype = getDataType(s.type);
			m.init();
			bdef.blocks.push(m);
		});

		// Adding inner block definitions
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(bdef_n => {
			bdef.bdefs.push(convert_block_definition(bdef_n, bdef));
		});

		// Adding expression blocks and connections
		statements.filter(s => s.name == 'ASSIGNMENT').forEach((s) => {
			switch (s.type) {
			case 'ANONYMOUS_BLOCK': {
				// TODO
				break;
			}
			case 'IF_THEN_ELSE': {
				// TODO
				break;
			}
			case 'EXPR': {
				const expr_ports = convert_expr(s.expr, bdef);
				s.outputs.forEach((o, oi) => {
					switch (o.name) {
					case 'VARIABLE': {
						let v = findVarById(o.id, bdef).r;
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
						let r = convert_property_left(o, bdef);
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_ports[1][oi];
						c.out = r.p.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'MEMORY_ELEMENT': {
						let m = findMemById(o.id, bdef);
						// TODO: send input to mem and get output 
						break;
					}
					}
				})
				break;
			}
			}
		})
	}

	function convert_property_left (property_node, bdef) {
		let x = property_node.expr;
		if (x.name == 'VARIABLE') {
			let r = findVarById(x.id, bdef) || findMemById(x.id, bdef);
			return { p: convert_property(r.r, property_node.property_id, r.bd), bdef: r.bd };
		}
		else if (x.name == 'PROPERTY') {
			let r = convert_property_left(x, bdef);
			return { p: convert_property(r.p, property_node.property_id, bdef), bdef: r.bdef };
		}
	}

	function convert_property_right (property_node, bdef) {

	}

	function convert_property (block, property, bdef) {
		const props = bdef.properties.filter(p => p.of == block && p.type == property);
		if (props.length == 0) {
			const v = Object.create(bs.VarBlock);
			v.id = (block.id || block.operation) + "." + property;
			v.datatype = property == "fs" ? ts.DataTypeFloat32 : ts.DataTypeGeneric; // Must be inferred later.
			v.init();
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

		let b;

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
			b = Object.create(bs.ConstantBlock);
			if (expr_node.type == 'INT32')
				b.datatype = ts.DataTypeInt32;
			else if (expr_node.type == 'FLOAT32')
				b.datatype = ts.DataTypeFloat32;
			else if (expr_node.type == 'BOOL')
				b.datatype = ts.DataTypeBool;
			b.value = expr_node.val;
			b.init();
			bdef.blocks.push(b);
			return [[], b.o_ports];
		}
		case 'MEMORY_ELEMENT': {
			
			return;
		}
		case 'INLINE_IF_THEN_ELSE': {

			return;
		}
		case 'CALL_EXPR': {

			return;
		}
		}


		// Regular args exprs
		switch (expr_node.name) { 
		case 'BITWISE_NOT_EXPR': {
			b = Object.create(bs.BitwiseNotBlock);
			break;
		}
		case 'LOGICAL_NOT_EXPR': {
			b = Object.create(bs.LogicalNotBlock);
			break;
		}
		case 'UMINUS_EXPR': {
			b = Object.create(bs.UminusBlock);
			break;
		}
		case 'MODULO_EXPR': {
			b = Object.create(bs.ModuloBlock);
			break;
		}
		case 'DIV_EXPR': {
			b = Object.create(bs.DivisionBlock);
			break;
		}
		case 'TIMES_EXPR': {
			b = Object.create(bs.MulBlock);
			break;
		}
		case 'MINUS_EXPR': {
			b = Object.create(bs.SubtractionBlock);
			break;
		}
		case 'PLUS_EXPR': {
			b = Object.create(bs.SumBlock);
			break;
		}
		case 'SHIFT_RIGHT_EXPR': {
			b = Object.create(bs.ShiftRightBlock);
			break;
		}
		case 'SHIFT_LEFT_EXPR': {
			b = Object.create(bs.ShiftLeftBlock);
			break;
		}
		case 'GREATEREQUAL_EXPR': {
			b = Object.create(bs.GreaterEqualBlock);
			break;
		}
		case 'GREATER_EXPR': {
			b = Object.create(bs.GreaterBlock);
			break;
		}
		case 'LESSEQUAL_EXPR': {
			b = Object.create(bs.LessEqualBlock);
			break;
		}
		case 'LESS_EXPR': {
			b = Object.create(bs.LessBlock);
			break;
		}
		case 'NOTEQUAL_EXPR': {
			b = Object.create(bs.InequalityBlock);
			break;
		}
		case 'EQUAL_EXPR': {
			b = Object.create(bs.EqualityBlock);
			break;
		}
		case 'BITWISE_AND_EXPR': {
			b = Object.create(bs.BitwiseAndBlock);
			break;
		}
		case 'BITWISE_EXCLUSIVE_OR_EXPR': {
			b = Object.create(bs.BitwiseXOrBlock);
			break;
		}
		case 'BITWISE_INCLUSIVE_OR_EXPR': {
			b = Object.create(bs.BitwiseOrBlock);
			break;
		}
		case 'LOGICAL_AND_EXPR': {
			b = Object.create(bs.LogicalAndBlock);
			break;
		}
		case 'LOGICAL_OR_EXPR': {
			b = Object.create(bs.LogicalOrBlock);
			break;
		}
		case 'CAST_EXPR': {
			if (expr_node.type == 'INT32')
				b = Object.create(bs.CastI32Block);
			else if (expr_node.type == 'FLOAT32')
				b = Object.create(bs.CastF32Block);
			else if (expr_node.type == 'BOOL')
				b = Object.create(bs.CastBoolBlock);
			break;
		}
		default: {
			throw new Error("Unexpect AST expr node");
			break;
		}
		}

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


	function findVarById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.VarBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return {r, bd};
			bd = bd.bdef_father;
		}
	}

	function findMemById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return {r, bd};
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

	function findBdefBySignature (id, inputDataTypes, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.bdefs.find(b => 
				(b.id == id) && 
				(b.inputs.length == inputDataTypes.length) &&
				(b.inputDataTypes.every((t, i) => t == inputDataTypes[i])));
			if (r)
				return {r, bd};
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
		default:
			return ts.DataTypeFloat32;
		}
	}

	exports["ASTToGraph"] = ASTToGraph;

}());