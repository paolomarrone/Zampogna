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
			let e = this.findLocally(id);
			if (e.length > 0) return e;
			if (this.father) return this.father.findGlobally(id);
			return [];
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
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_body(s, new ScopeTable(scope)));
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
			case 'IF_THEN_ELSE':
				if (!['VARIABLE'].includes(o.name))
					err("Only 'VARIABLE' allowed when assigning an ANONYMOUS_BLOCK or IF_THEN_ELSE");
				break;
			default:
				err("Unexpected Assignment type");
			}

			if (reserved_variables.includes(o.id))
				err("Cannot use reserved_variables in assignments");
			
			if (o.name == 'VARIABLE') {
				scope.findLocally(o.id).forEach(e => {
					if (e.name == 'BLOCK_DEFINITION')
						err("ID already used for a BLOCK_DEFINITION");
					if (e.name == 'MEMORY_DECLARATION')
						err("use [] operator to access memory");
					if (e.assigned)
						err("Variable assigned twice");
					e.assigned = true;
				});
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

			})
		}
		if (node.type == 'IF_THEN_ELSE') {

		}
	}

	function analyze_block_body(node, scope) {
		

		
	}

	function analyze_expr(node, scope, outputsN) {

	}


}());