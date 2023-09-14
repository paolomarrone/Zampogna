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

/*
	TODO: Error messages / system
*/

(function() {

	const util = require("util");

	function ScopeTable (father) {
		this.elements = [];
		this.father = father;
		this.findLocally = function (id) {
			return this.elements.filter(e => e.id == id);
		};
		this.findGlobally = function (id) {
			let r = this.findLocally(id);
			if (this.father)
				r = r.concat(this.father.findGlobally(id)); // Order matters
			return r;
		};
		this.add = function (node) {
			if (!['BLOCK_DEFINITION', 'VARIABLE', 'MEMORY_DECLARATION'].includes(node.name))
				err("Only BLOCK_DEFINITIONs, VARIABLEs, and MEMORY_DECLARATIONs allowed in ScopeTable");
			this.elements.push(node);
		};
	};

	const reserved_variables = ["fs"];
	const allowed_properties = ["fs", "init"];

	const globalScope = new ScopeTable(null);
	globalScope.add({ name: "VARIABLE", id: "fs" });
	

	function validateAST (root) {
		let scope = new ScopeTable(globalScope);
		analyze_block_statements(root.statements, scope);
	}

	function analyze_block_statements(statements, scope) {
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_signature(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration(s, scope));
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => analyze_assignment_left(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration_exprs(s, scope));
		statements.filter(s => s.name == 'ASSIGNMENT').forEach(s => analyze_assignment_right(s, scope));
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_body(s, scope));
	}

	function analyze_block_signature (bdef, scope) {
		if (bdef.inputs.some(i => i.name != 'VARIABLE'))
			err("Block definition inputs must be IDs");
		if (bdef.inputs.some(i => reserved_variables.includes(i.id)))
			err("Cannot use reserved variables here");
		if (bdef.outputs.some(o => o.name != 'VARIABLE'))
			err("Block definition outputs must be IDs");
		if (bdef.outputs.some(o => reserved_variables.includes(o.id)))
			err("Cannot use reserved variables here");

		scope.findLocally(bdef.id).forEach(e => {
			if (e.name != 'BLOCK_DEFINITION')
				err("Identifier used locally for both Block definition and variable");
			if (compare_block_signatures(bdef, e) > 2) 
				err("Block definitions conflict");
		});

		scope.add(bdef);
	}

	function compare_block_signatures(bdef_A, bdef_B) {
		if (bdef_A.id != bdef_B.id)
			return 0;
		if (bdef_A.inputs.length != bdef_B.inputs.length)
			return 1;
		for (let i = 0; i < bdef_A.inputs.length; i++) {
			var dA = bdef_A.inputs[i].declaredType || 'FLOAT32';
			var dB = bdef_B.inputs[i].declaredType || 'FLOAT32';
			if (dA != dB)
				return 2;
		}
		if (bdef_A.outputs.length != bdef_B.outputs.length)
			return 3;
		for (let o = 0; o < bdef_A.outputs.length; o++)
			if (bdef_A.outputs[o].declaredType != bdef_B.outputs[o].declaredType)
				return 4;
		return 5;
	}

	function analyze_memory_declaration (mdef, scope) {
		if (scope.findLocally(mdef.id).length > 0)
			err("ID used more than once");
		scope.add(mdef);
	}

	function analyze_memory_declaration_exprs (mdef, scope) {
		analyze_expr(mdef.size, scope, 1, false);
	}

	function analyze_assignment_left (assignment, scope) {

		assignment.outputs.forEach(o => {
			switch (assignment.type) {
			case 'EXPR':
				if (!['VARIABLE', 'DISCARD', 'PROPERTY', 'MEMORY_ELEMENT'].includes(o.name))
					err("Only 'VARIABLE', 'DISCARD', 'PROPERTY', 'MEMORY_ELEMENT' allowed when assigning an EXPR");
				break;
			case 'ANONYMOUS_BLOCK':
			case 'IF_THEN_ELSES':
				if (!['VARIABLE'].includes(o.name))
					err("Only 'VARIABLE' allowed when assigning an ANONYMOUS_BLOCK or IF_THEN_ELSES");
				break;
			default:
				err("Unexpected Assignment type");
			}

			if (reserved_variables.includes(o.id))
				err("Cannot use reserved_variables in assignments");
			
			if (o.name == 'VARIABLE') {
				let elements = scope.findLocally(o.id);
				if (elements.filter(e => e.name == 'BLOCK_DEFINITION').length > 0)
					err("ID already used for a BLOCK_DEFINITION");
				if (elements.filter(e => e.name == 'MEMORY_DECLARATION').length > 0)
					err("use [] operator to access memory");
				elements = elements.filter(e => e.name == 'VARIABLE');
				if (elements.length == 0) {
					o.assigned = true;
					scope.add(o);
				}
				else if (elements.length == 1) {
					if (elements[0].assigned)
						err("Variable assigned twice, or you are trying to assign an input");
					if (o.declaredType != undefined)
						err("Redeclaration");
					elements[0].assigned = true;
				}
				else
					err("Found ID multiple times");				
			}
			if (o.name == 'PROPERTY') {

				check_property_left(o);

				function check_property_left (p) {
					if (p.expr.name == 'VARIABLE') {
						let elements = scope.findLocally(p.expr.id);
						if (elements.length != 1)
							err("Property of undefined");
						if (!['VARIABLE', 'MEMORY_DECLARATION'].includes(elements[0].name))
							err("You can assign properties only to VARIABLEs and MEMORY_DECLARATIONs");
						if (elements[0].is_input)
							err("Cannot set properties of inputs");
						elements[0][p.property_id] = p;
					}
					else if (p.expr.name == 'PROPERTY') {
						check_property_left(p.expr);
					}
					else {
						err("Cannot assign property to this");
					}
					if (!allowed_properties.includes(p.property_id))
						err("Property not allowed");
				}
			}
			if (o.name == 'MEMORY_ELEMENT') {
				let elements = scope.findLocally(o.id);
				if (elements.length != 1)
					err("Memory element not found");
				if (elements[0].name != 'MEMORY_DECLARATION')
					err("[] is allowed only for memory");
			}
		});
	}

	function analyze_assignment_right (assignment, scope) {
		if (assignment.type == 'EXPR') {
			if (assignment.expr.name == 'ARRAY_CONST') {
				const o = assignment.outputs[0];
				if (o.name != 'PROPERTY' || o.property_id != 'init')
					err("Array can be assigned to init propety only");
			}
			analyze_expr(assignment.expr, scope, assignment.outputs.length, true);
		}
		if (assignment.type == 'ANONYMOUS_BLOCK') {
			const newscope = new ScopeTable(scope);
			assignment.outputs.forEach(o => {
				o.assigned = false;
				newscope.add(o);
			});
			analyze_block_statements(assignment.expr.statements, newscope);
			assignment.outputs.forEach(o => {
				if (o.assigned == false)
					err("Output not assigned");
			});
		}
		if (assignment.type == 'IF_THEN_ELSES') {
			assignment.expr.branches.forEach(b => {
				if (b.condition)
					analyze_expr(b.condition, scope, 1, false);
				const newscope = new ScopeTable(scope);
				assignment.outputs.forEach(o => {
					o.assigned = false;
					newscope.add(o);
				});
				analyze_block_statements(b.block.statements, newscope);
				assignment.outputs.forEach(o => {
					if (o.assigned == false)
						err("Output not assigned");
				});
			});
		}
	}

	function analyze_block_body(bdef, scope) {
		
		const newscope = new ScopeTable(scope);
		bdef.inputs.forEach(i => {
			i.assigned = true;
			i.is_input = true;
			newscope.add(i);
		});
		bdef.outputs.forEach(o => {
			o.assigned = false;
			newscope.add(o);
		});
		analyze_block_statements(bdef.statements, newscope);
		bdef.outputs.forEach(o => {
			if (o.assigned == false)
				err("Output not assigned");
		});
		bdef.inputs.forEach(i => {
			if (!i.used)
				warn("Input not used");
		});
	}

	function analyze_expr(expr, scope, outputsN, isRoot) {
		let expr_outputsN = 1;
		switch (expr.name) {
		case "VARIABLE": 
		{
			if (expr.declaredType)
				err("Unexpected type declaration in expression");
			let vs = scope.findGlobally(expr.id);
			let found = false;
			for (let v of vs) {
				if (v.name != 'VARIABLE')
					err("Not a variable");
				found = true;
				v.used = true;
				break;
			}
			if (!found)
				err("ID not found" + expr.id +  vs.join(',,'));
			break;
		}
		case "PROPERTY":
		{
			if (expr.expr.name == 'VARIABLE') {
				if (reserved_variables.includes(expr.expr.id))
					err("Cannot access properties of reserved_variables");
				analyze_expr({ name: "VARIABLE", id: expr.expr.id }, scope, 1, false);
			}
			else if (expr.expr.name == 'MEMORY_ELEMENT') {
				err("Cannot access properties of memory elements");
			}
			else {
				analyze_expr(expr.expr, scope, 1, false);
			}

			if (!allowed_properties.includes(expr.property_id))
				err("Property not allowed");
			break;
		}
		case "MEMORY_ELEMENT":
		{
			let mdefs = scope.findGlobally(expr.id);
			let found = false;
			for (let m of mdefs) {
				if (m.name != 'MEMORY_DECLARATION')
					err("That's not memory");
				found = true;
				break;
			}
			if (!found)
				err("ID not found");
			break;
		}
		case "DISCARD":
		{
			err("DISCARD not allowed in expressions");
			break;
		}
		case "CALL_EXPR":
		{
			console.log("Calling: " + expr.id + ", " + expr.args.join(",,"))
			let bdefs = scope.findGlobally(expr.id);
			if (bdefs.length < 1) {
				warn("using external function");
				break;
			}
			let found = false;
			for (let b of bdefs) {
				if (b.name != "BLOCK_DEFINITION")
					err("Calling something that is not callable");
				if (b.inputs.length != expr.args.length)
					continue;
				expr_outputsN = b.outputs.length;
				expr.outputs_N = expr_outputsN;
				found = true;
				break;
			}
			if (!found)
				err("No matching block found: " + expr.id + ", " + expr.args.length + ".. " + bdefs.map(b => b.id + b.inputs.length).join(", "));
			break;
		}
		case "ARRAY_CONST":
		{
			if (!isRoot)
				err("Cannot use array in subexpressions");
			break;
		}
		}

		if (expr_outputsN != outputsN)
			err("Number of outputs accepted != number of block outputs");

		if (expr.args)
			expr.args.forEach(arg => analyze_expr(arg, scope, 1, false));
	}

	function err (msg) {
		throw new Error(msg);
	}

	function warn (msg) {
		console.warn("*** Warning *** " + msg);
	}

	exports["validateAST"] = validateAST;
}());