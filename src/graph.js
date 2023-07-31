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
		bdef_node.inputs.forEach(i => {
			const v = Object.create(bs.VarBlock);
			v.id = i.id;
			v.datatype = getDataType(i.declaredType);
			v.init();
			bdef.blocks.push(v);
		});
		bdef_node.outputs.forEach(o => {
			const v = Object.create(bs.VarBlock);
			v.id = o.id;
			v.datatype = getDataType(o.declaredType);
			v.init();
			bdef.blocks.push(v);
		});

		convert_statements(bdef_node.statements, bdef);

		return bdef;
	}

	function convert_statements (statements, bdef) {

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
				let expr_out_ps = convert_expr(s.expr, bdef);
				s.outputs.forEach((o, oi) => {
					switch (o.name) {
					case 'VARIABLE': {
						let v = findVarById(o.id, bdef);
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_out_ps[oi];
						c.out = v.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'DISCARD': {
						// Nothing to do
						break;
					}
					case 'PROPERTY': {

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

	function convert_expr (expr_node, bdef) {

		let b;

		switch (expr_node.name) {
		case 'VARIABLE': {

			break;
		}
		case 'PROPERTY': {
			// TODO: 
			// Convert expr
			// find existing property of expr
			// If it doesn't exist, create a BlockVar and bdef.properties.push(new Property)
			// But beware, the property must be added to the bdef the expr belongs
			break;
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
			break;
		}
		case 'MEMORY_ELEMENT': {
			
			break;
		}
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
		case 'INLINE_IF_THEN_ELSE': {

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
		case 'CALL_EXPR': {

			break;
		} 
		default: {
			throw new Error("Unexpect AST expr node");
			break;
		}
		}

		//b.init();

		// TODO

		bdef.blocks.push(b);

		return b; // Tmp

	}


	function findVarById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.VarBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return r;
			bd = bd.bdef_father;
		}
	}

	function findMemById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return r;
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
				return r;
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