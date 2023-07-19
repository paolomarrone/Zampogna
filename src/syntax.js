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
			// Implementation check
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
		// TODO: Check initial block: only float input allowed

		analyze_block_statements(root.statements, new ScopeTable(globalScope));
	}


	function analyze_block_statements(statements, scope) {

		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_signature(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration(s, scope));
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => analyze_assignment_left(s, scope));

		statements.filter(s => s.name == 'ASSIGNMENT').forEach(s => analyze_assignment_right(s, scope));
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_body(s, scope));
	}

	function analyze_block_signature (node, scope) {
		if (node.inputs.some(i => i.name != 'VARIABLE'))
			err("Block definition inputs must be IDs");
		if (node.inputs.some(i => reserved_variables.includes(i.id)))
			err("Cannot use reserved variables here");
		if (node.outputs.some(o => o.name != 'VARIABLE'))
			err("Block definition outputs must be IDs");
		if (node.outputs.some(o => reserved_variables.includes(o.id)))
			err("Cannot use reserved variables here");

		scope.findLocally(node.id).forEach(e => {
			if (e.name != 'BLOCK_DEFINITION')
				err("Identifier used locally for both Block definition and variable");
			if (compare_block_signatures(node, e) > 2) 
				err("Block definitions conflict");
		});

		scope.add(node);
	}

	function compare_block_signatures(A, B) {
		if (A.id != B.id)
			return 0;
		if (A.inputs.length != B.inputs.length)
			return 1;
		for (let i = 0; i < A.inputs.length; i++)
			if (A.inputs[i].declaredType != B.inputs[i].declaredType)
				return 2;
		if (A.outputs.length != B.outputs.length)
			return 3;
		for (let o = 0; o < A.outputs.length; o++)
			if (A.outputs[o].declaredType != B.outputs[o].declaredType)
				return 4;
		return 5;
	}

	function analyze_memory_declaration (node, scope) {
		if (scope.findLocally(node.id).length > 0)
			err("ID used more than once");
		node.writers = [];
		scope.add(node);
	}

	function analyze_assignment_left (node, scope) {

		node.outputs.forEach(o => {

			switch (node.type) {
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

	function analyze_assignment_right (node, scope) {
		if (node.type == 'EXPR') {
			analyze_expr(node.expr, scope, node.outputs.length);
		}
		if (node.type == 'ANONYMOUS_BLOCK') {
			const newscope = new ScopeTable(scope);
			node.outputs.forEach(o => {
				o.assigned = false;
				newscope.add(o);
			});
			analyze_block_statements(node.expr.statements, newscope);
			node.outputs.forEach(o => {
				if (o.assigned == false)
					err("Output not assigned");
			});
		}
		if (node.type == 'IF_THEN_ELSES') {
			node.expr.branches.forEach(b => {
				if (b.condition)
					analyze_expr(b.condition, scope, 1);
				const newscope = new ScopeTable(scope);
				node.outputs.forEach(o => {
					o.assigned = false;
					newscope.add(o);
				});
				analyze_block_statements(b.block.statements);
				node.outputs.forEach(o => {
					if (o.assigned == false)
						err("Output not assigned");
				});
			});
		}
	}

	function analyze_block_body(node, scope) {
		
		const newscope = new ScopeTable(scope);
		node.inputs.forEach(i => {
			i.assigned = true;
			newscope.add(i);
		});
		node.outputs.forEach(o => {
			i.assigned = false;
			newscope.add(o);
		});
		analyze_block_statements(node.statements, newscope);
		node.outputs.forEach(o => {
			if (o.assigned == false)
				err("Output not assigned");
		});
		node.inputs.forEach(i => {
			if (!i.used)
				warn("Input not used");
		});
	}

	function analyze_expr(node, scope, outputsN) {
		switch (node.name) {
		case "VARIABLE":
			if (node.declaredType)
				err("Unexpected type declaration in expression");
			let vs = scope.findGlobally(node.id);
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
		case "VARIABLE_PROPERTY":
			analyze_expr({ name: "VARIABLE", id: node.var_id }, scope, 1);
			if (!allowed_properties.includes(node.property_id))
				err("Property not allowed");
			break;
		case "MEMORY_ELEMENT":
			let mdefs = scope.findGlobally(node.memory_id);
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
		case "DISCARD":
			err("DISCARD not allowed in expressions");
			break;
		case "CALL_EXPR":
			let bdefs = scope.findGlobally(node.id); //.filter(d => d.name == 'BLOCK_DEFINITION');
			if (bdefs.length < 1) {
				warn("using external function");
				break;
			}
			let found = false;
			for (let b of bdefs) {
				if (b.name != "BLOCK_DEFINITION")
					err("Calling something that is not callable");
				if (b.inputs.length != node.args.length)
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

		if (node.args)
			node.args.forEach(arg => analyze_expr(arg, scope, 1));
	}
}());