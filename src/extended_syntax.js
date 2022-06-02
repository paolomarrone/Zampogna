/*
	Copyright (C) 2021, 2022 Orastron Srl

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

	var ScopeTable = {
		elements: {},
		father: null,
		id: "",

		init: function (id) {
			this.id = id
			this.elements = {}
		},

		findLocal: function (id) {
			return this.elements[id] 
		},

		find: function (id) {
			if (e = this.findLocal(id))
				return e
			if (this.father)
				return this.father.find(id);
			return null
		},

		add: function (id, item) {
			if (id == '_')
				return
			if (this.findLocal(id))
				err("ID assigned twice: " + id);
			this.elements[id] = item
		},

		toString: function () {
			let s = this.id + ": [\n"
			for (let p in this.elements) {
				s += '\t' + p + ": [\n"
				for (let pp in this.elements[p])
					s += '\t\t' + pp + ':\t' + this.elements[p][pp] + '\n'
				s += '\t]\n'
			}
			s += ']\n'
			return s
		}
	}

	var scopes = []
	var scope_reserved = Object.create(ScopeTable)
	scope_reserved.init("_reserved_")
	scope_reserved.add("delay1", { 
		type: 'func', 
		inputsN: 1,
		outputsN: 1,
	})	

	function validate (AST_root) {
		scopes = []
		scopes.push(scope_reserved)
		let scope_program = Object.create(ScopeTable)
		scope_program.init("_program_")
		scope_program.father = scope_reserved
		scopes.push(scope_program)

		AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(
			block => analyze_block_signature(scope_program, block))

		AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(ass => ass.outputs.forEach(function (output) {
				if (output.init)
					err("Cannot use '@' in consts definitions")
				analyze_left_assignment(scope_program, output)
				scope_program.elements[output.val].kind = 'const'
		}))

		AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(
			ass => analyze_right_assignment(scope_program, ass.expr, ass.outputs.length))

		AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(
			block => analyze_block_body(scope_program, block))

		for (let i in scope_program.elements) {
			let item = scope_program.elements[i]
			if (item.kind == 'const' && !item.used)
				warn(item.kind + " " + i + " not used")
		}

		return scopes;
	}

	function analyze_block_signature(parent_scope, block) {
		if (block.inputs.some(o => o.name != 'ID'))
			err("Invalid arguments in block definition. Use only IDs")
		if (block.outputs.some(o => o.init))
			err("Cannot use '@' in block definitions")
		if (block.outputs.some(o => o.val == '_'))
			err("Cannot use '_' in block definitions")
		parent_scope.add(block.id.val, {
			kind: 		"block",
			inputsN: 	block.inputs.length,
			outputsN: 	block.outputs.length
		})
	}

	function analyze_anonym_block_signature(block) {
		if (block.outputs.some(o => o.val == '_'))
			err("Cannot use '_' in block definitions")
		if (block.outputs.some(o => o.init))
			err("Cannot use '@' in block definitions")
	}

	function analyze_block_body(parent_scope, block) {
		let scope_block = Object.create(ScopeTable)
		scope_block.init(block.id.val)
		scope_block.father = parent_scope
		scopes.push(scope_block)

		block.inputs.forEach(i => scope_block.add(i.val, {
			kind: 	'port_in',
			used: 	false
		}))

		block.outputs.forEach(o => scope_block.add(o.val, {
			kind: 	'port_out',
			used: 	true
		}))

		// Create scopes

		block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(function (block) {
			analyze_block_signature(scope_block, block)
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			ass.outputs.filter(o => !o.init).forEach(function (o) {
				analyze_left_assignment(scope_block, o)
			})
		})

		block.body.filter(stmt => stmt.name == 'ANONYM_BLOCK_DEF').forEach(function (block) {
			block.outputs.filter(o => !o.init).forEach(function (o) {
				analyze_left_assignment(scope_block, o)
			})
			analyze_anonym_block_signature(block);
		})

		// Validate expr

		block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(function (block) {
			analyze_block_body(scope_block, block)
		})

		block.body.filter(stmt => stmt.name == 'ANONYM_BLOCK_DEF').forEach(function (block) {
			analyze_block_body(scope_block, block);
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			ass.outputs.filter(o => o.init).forEach(function (o) {
				analyze_left_assignment_init(scope_block, o)
			})
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			analyze_right_assignment(scope_block, ass.expr, ass.outputs.length)
		})

		for (let i in scope_block.elements) {
			let item = scope_block.elements[i]
			if (item.kind == 'port_out' && !item.assigned)
				err("Output port not assigned: " + i)
			if (!item.used)
				warn(item.kind + " " + i + " not used")
		}
	}

	function analyze_left_assignment(scope, id_node) {
		if (scope_reserved.find(id_node.val))
			err(id_node.val + " is a reserved keyword");

		let item = scope.findLocal(id_node.val)
		if (item) {
			if (item.kind == 'port_in')
				err("Input ports cannot be assigned: " + id_node.val)
			if (item.kind == 'port_out') {
				if (item.assigned)
					err("Output ports can be assigned only once: " + id_node.val)
				else
					item.assigned = true
			}
			if (item.kind == 'var' || item.kind == 'const')
				err("Variables can be assigned only once: " + id_node.val)
		}
		else
			scope.add(id_node.val, {
				kind: 	'var',
				used: 	false
			})
	}

	function analyze_left_assignment_init(scope, id_node) {
		let item = scope.findLocal(id_node.val)

		if (!item)
			err("Cannot set initial value of undefined: " + id_node.val)

		if (item.hasInit)
			err("Cannot set initial value of variables more than once: " + id_node.val)

		if (item.kind == 'port_in')
			err("Cannot set initial value of input ports: " + id_node.val)

		item.hasInit = true
	}

	function analyze_right_assignment(scope, expr_node, outputsN) {
		if (expr_node.name == 'ID') {
			let item = scope.find(expr_node.val)

			if (!item)
				err("ID not found: " + expr_node.val + ". Scope: \n" + scope)

			if (item.kind == 'var' || item.kind == 'const' || item.kind == 'port_in' || item.kind == 'port_out')
				item.used = true;
			else
				err("Unexpected identifier in expression: " + expr_node.val)
		}
		else if (expr_node.name == 'CALL_EXPR') {
			let item = scope.find(expr_node.id.val)

			if (!item) {
				warn("Using unknown external function " + expr_node.id.val)
				expr_node.kind = 'FUNC_CALL'
			}
			else {
				if (item.outputsN != outputsN)
					err(expr_node.id.val + " requires " + item.outputsN + " outputs while " + outputsN + " were provided")

				if (item.inputsN != expr_node.args.length)
					err(expr_node.id.val + " requires " + item.inputsN + " inputs while "  + expr_node.args.length + " were provided")

				if (expr_node.id.val == 'delay1')
					expr_node.kind = 'DELAY1_EXPR'
				else
					expr_node.kind = 'BLOCK_CALL'
			}
		}
		if (expr_node.args)
			expr_node.args.forEach(arg => analyze_right_assignment(scope, arg, 1))
	}

	function warn(e) {
		console.warn("***Warning*** ", e)
	}

	function err(e) {
		throw new Error("***Error*** " + e)
	}

	exports["validate"] = validate

}());