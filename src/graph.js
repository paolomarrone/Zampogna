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

		const g = Object.create(bs.CompositeBlock);

		// Pronbably it's better to do definitions first...

	}

	function convert_statements (statements, block) {

		const bdefs = [];
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(bdef => {
			bdefs.push(getBlockDefinition(bdef));
		});

	}

	function getBlockDefinition (bdef_node, bdef_father) {
		
		const bdef = Object.create(bs.CompositeBlock);

		bdef.id = bdef_node.id;
		bdef.blocks = [];
		bdef.connections = [];
		bdef.bdefs = []; // Internal block definitions
		bdef.bdef_father = bdef_father;
		//bdef.explicit_inputs_N = bdef_node.inputs.length;
		//bdef.implicit_inputs_N = NaN; // Set later
		bdef.inputs_N = bdef_node.inputs.length;
		bdef.inputDataTypes = [];
		bdef_node.inputs.forEach(i => {
			bdef.inputDataTypes.push(getDataType(i.declaredType));
		}); // Set the implicit ones later
		bdef.outputs_N = bdef_node.outputs.length;
		bdef.outputDataTypes = [];
		bdef_node.outputs.forEach(o => {
			bdef.outputDataTypes.push(getDataType(o.declaredType));
		});


		// Adding VARIABLE blocks
		bdef_node.outputs.forEach(o => {
			const v = Object.create(bs.VarBlock);
			v.id = o.id;
			v.datatype = getDataType(o.declaredType);
			v.init();
			bdef.blocks.push(v);
		})
		bdef_node.statements.filter(s => s.name == "ASSIGNMENT").forEach(s => {
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
		bdef_node.inputs.forEach(i => {
			const v = Object.create(bs.VarBlock);
			v.id = i.id;
			v.datatype = getDataType(i.declaredType);
			v.init();
			bdef.blocks.push(v);
		});

		// Adding MEMORY DECLARATIONS blocks
		bdef_node.statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = Object.create(bs.MemoryBlock);
			m.id = s.id;
			m.datatype = getDataType(s.type);
			m.init();
			bdef.blocks.push(m);
		});

		// Adding inner block definitions
		bdef_node.statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(bdef_n => {
			bdef.bdefs.push(getBlockDefinition(bdef_n, bdef));
		});

		// Adding expression blocks and connections
		bdef_node.statements.filter(s => s.name == 'ASSIGNMENT').forEach((s) => {
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
						c.out = v.i_ports[0]; // Remember/TODO: 3 ports here
						bdef.connections.push(c);
						break;
					}
					case 'DISCARD': {
						// Nothing to do
						break;
					}
					case 'PROPERTY': {
// Thinking needed about multiple named composite block outputs (std, init, fs). How to properly duplicate?
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

		return bdef;
	}

	function convert_expr (expr_node, bdef) {

		switch (expr_node.name) {
		case 'VARIABLE': {

			break;
		}
		case 'PROPERTY': {

			break;
		}
		case 'CONSTANT': {

			break;
		}
		case 'MEMORY_ELEMENT': {

			break;
		}
		case 'BITWISE_NOT_EXPR': {

			break;
		}
		case 'LOGICAL_NOT_EXPR': {

			break;
		}
		case 'UMINUS_EXPR': {

			break;
		}
		case 'MODULO_EXPR': {

			break;
		}
		case 'DIV_EXPR': {

			break;
		}
		case 'TIMES_EXPR': {

			break;
		}
		case 'MINUS_EXPR': {

			break;
		}
		case 'PLUS_EXPR': {

			break;
		}
		case 'SHIFT_RIGHT_EXPR': {

			break;
		}
		case 'SHIFT_LEFT_EXPR': {

			break;
		}
		case 'GREATEREQUAL_EXPR': {

			break;
		}
		case 'GREATER_EXPR': {

			break;
		}
		case 'LESSEQUAL_EXPR': {

			break;
		}
		case 'LESS_EXPR': {

			break;
		}
		case 'NOTEQUAL_EXPR': {

			break;
		}
		case 'EQUAL_EXPR': {

			break;
		}
		case 'BITWISE_AND_EXPR': {

			break;
		}
		case 'BITWISE_EXCLUSIVE_OR_EXPR': {

			break;
		}
		case 'BITWISE_INCLUSIVE_OR_EXPR': {

			break;
		}
		case 'LOGICAL_AND_EXPR': {

			break;
		}
		case 'LOGICAL_OR_EXPR': {

			break;
		}
		case 'INLINE_IF_THEN_ELSE': {

			break;
		}
		default: {
			throw new Error("Unexpect AST expr node");
			break;
		}

		}

	}


	function findVarById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = b.blocks.find(b => bs.VarBlock.isPrototypeOf(b) && b.d == id);
			if (r)
				return r;
			bd = bdef.bdef_father;
		}
	}

	function findMemById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = b.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b) && b.d == id);
			if (r)
				return r;
			bd = bdef.bdef_father;
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
			bd = bdef.bdef_father;
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