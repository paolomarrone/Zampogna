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
	

	function validateAST (root, initial_block) {
		let scope = new ScopeTable(globalScope);
		analyze_block_statements(root.statements, scope);
	}

	function analyze_block_statements(statements, scope) {
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_signature(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration(s, scope));
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => analyze_assignment_left(s, scope));
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
			const dA = bdef_A.inputs[i]?.declaredType?.value || 'FLOAT32';
			const dB = bdef_B.inputs[i]?.declaredType?.value || 'FLOAT32';
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
		mdef.writers = [];
		scope.add(mdef);
	}

	function analyze_assignment_left (assignment, scope) {

		assignment.outputs.forEach(o => {
			switch (assignment.type) {
			case 'EXPR':
				if (!['VARIABLE', 'DISCARD', 'VARIABLE_PROPERTY', 'MEMORY_ELEMENT'].includes(o.name))
					err("Only 'VARIABLE', 'DISCARD', 'VARIABLE_PROPERTY', 'MEMORY_ELEMENT' allowed when assigning an EXPR");
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
				elements.forEach(e => {
					if (e.name == 'BLOCK_DEFINITION')
						err("ID already used for a BLOCK_DEFINITION");
					if (e.name == 'MEMORY_DECLARATION')
						err("use [] operator to access memory");
					if (e.assigned != undefined && o.declaredType != undefined)
						err("Variable already declared");
					if (e.assigned)
						err("Variable assigned twice, or you are trying to assign an input");
					e.assigned = true;
				});
				if (elements.length > 1)
					err("Found ID multiple times");
				scope.add(o);
			}
			if (o.name == 'VARIABLE_PROPERTY') {
				let elements = scope.findLocally(o.var_id);
				if (elements.length != 1)
					err("Property of undefined");
				if (!['VARIABLE', 'MEMORY_DECLARATION'].includes(elements[0].name))
					err("You can assign properties only to VARIABLEs and MEMORY_DECLARATIONs");
				if (!allowed_properties.includes(o.property_id))
					err("Property not allowed");
				if (elements[0][o.property_id])
					err("Property already assigned");
				elements[0][o.property_id] = o;
			}
			if (o.name == 'MEMORY_ELEMENT') {
				let elements = scope.findLocally(o.memory_id);
				if (elements.length != 1)
					err("Memory element not found");
				if (elements[0].name != 'MEMORY_DECLARATION')
					err("[] is allowed only for memory");
				elements[0].writers.push(o);
			}
		});
	}

	function analyze_assignment_right (assignment, scope) {
		if (assignment.type == 'EXPR') {
			analyze_expr(assignment.expr, scope, assignment.outputs.length);
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
					analyze_expr(b.condition, scope, 1);
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

	function analyze_expr(expr, scope, outputsN) {
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
				err("ID not found");
			break;
		}
		case "VARIABLE_PROPERTY":
		{
			analyze_expr({ name: "VARIABLE", id: expr.var_id }, scope, 1);
			if (!allowed_properties.includes(expr.property_id))
				err("Property not allowed");
			break;
		}
		case "MEMORY_ELEMENT":
		{
			let mdefs = scope.findGlobally(expr.memory_id);
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
				if (b.outputs != outputsN)
					err("Number of outputs accepted != number of block outputs");
				found = true;
				break;
			}
			if (!found)
				err("No matching block found");
			break;
		}
		}

		if (expr.args)
			expr.args.forEach(arg => analyze_expr(arg, scope, 1));
	}

	function err (msg) {
		throw new Error(msg);
	}

	function warn (msg) {
		console.warn("*** Warning *** " + msg);
	}

	exports["validateAST"] = validateAST;
}());