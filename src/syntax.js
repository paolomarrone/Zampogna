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

	'use strict';

	const TYPES = require('./types');
	const callable = s => s.kind == 'block' || s.kind == 'external';
	const sameTypes = (a, b) => a.length == b.length && a.every((t, i) => t == b[i]);

	function Scope(parent) {
		this.parent = parent;
		this.locals = new Map();
	}
	Scope.prototype.add = function(symbol) {
		const previous = this.locals.get(symbol.id) || [];
		if (previous.length && (!callable(symbol) || previous.some(s => !callable(s))))
			throw new Error('Identifier already declared: ' + symbol.id);
		if (previous.some(s => sameTypes(s.input_types, symbol.input_types)))
			throw new Error('Block definitions conflict: ' + symbol.id);
		this.locals.set(symbol.id, previous.concat(symbol));
	};
	Scope.prototype.find = function(id) {
		for (let scope = this; scope; scope = scope.parent) {
			const symbols = scope.locals.get(id);
			if (symbols) return symbols;
		}
		throw new Error('Unknown identifier: ' + id);
	};
	Scope.prototype.resolveCall = function(id, types) {
		for (let scope = this; scope; scope = scope.parent) {
			const symbols = scope.locals.get(id);
			if (!symbols) continue;
			if (symbols.some(s => !callable(s)))
				throw new Error('Identifier is not callable: ' + id);
			const match = symbols.find(s => sameTypes(s.input_types, types));
			if (match) return match;
		}
		throw new Error('No matching block definition: ' + id + '(' + types.join(', ') + ')');
	};

	function expectType(actual, expected, context) {
		if (actual != expected)
			throw new Error('Type mismatch in ' + context + ': expected ' + expected + ', got ' + actual);
	}

	// Symbols belong to one lexical scope. AST uses share those records; branch
	// outputs get new records, so assignment tracking never changes an outer use.
	function declareValue(node, scope, kind, datatype, input = false) {
		if (node.name != 'VARIABLE' && node.name != 'MEMORY_DECLARATION')
			throw new Error('Declaration requires an identifier');
		if (node.id == 'fs')
			throw new Error('Cannot declare reserved variable: fs');
		const symbol = { kind, id: node.id, datatype, input, assigned: input, used: false };
		scope.add(symbol);
		node.symbol = symbol;
		return symbol;
	}

	function validateAST(root, descriptors = []) {
		const globals = new Scope(null);
		root.fs_symbol = { kind: 'variable', id: 'fs', datatype: TYPES.Float32, input: true };
		globals.add(root.fs_symbol);
		root.externals = descriptors.map(descriptor => {
			const symbol = {
				kind: 'external', id: descriptor.block_name, descriptor,
				input_types: descriptor.block_inputs.map(p => TYPES.parse(p.type)),
				output_types: descriptor.block_outputs.map(p => TYPES.parse(p.type)),
			};
			globals.add(symbol);
			return symbol;
		});
		analyzeStatements(root.statements, new Scope(globals));
	}

	function analyzeStatements(statements, scope) {
		// Declare the entire scope before resolving expressions, including captures
		// from nested definitions and calls to definitions appearing later in source.
		for (const s of statements.filter(s => s.name == 'BLOCK_DEFINITION')) {
			if ([...s.inputs, ...s.outputs].some(p => p.name != 'VARIABLE'))
				throw new Error('Block inputs and outputs must be identifiers');
			s.symbol = {
				kind: 'block', id: s.id,
				input_types: s.inputs.map(p => TYPES.fromAST(p.declaredType)),
				output_types: s.outputs.map(p => TYPES.fromAST(p.declaredType)),
			};
			scope.add(s.symbol);
		}
		for (const s of statements.filter(s => s.name == 'MEMORY_DECLARATION'))
			declareValue(s, scope, 'memory', TYPES.fromAST(s.type));
		for (const s of statements.filter(s => s.name == 'ASSIGNMENT')) {
			for (const o of s.outputs) {
				if (s.type != 'EXPR' && o.name != 'VARIABLE')
					throw new Error('Block and branch outputs must be variables');
				if (o.name != 'VARIABLE') continue;
				if (o.id == 'fs') throw new Error('Cannot assign reserved variable: fs');
				const local = scope.locals.get(o.id);
				if (!local) {
					declareValue(o, scope, 'variable', TYPES.fromAST(o.declaredType));
				} else {
					if (local.length != 1 || local[0].kind != 'variable')
						throw new Error('Assignment requires a variable: ' + o.id);
					if (o.declaredType !== undefined)
						throw new Error('Redeclaration: ' + o.id);
					o.symbol = local[0];
				}
				if (o.symbol.assigned)
					throw new Error('Variable assigned twice, or assignment to an input: ' + o.id);
				o.symbol.assigned = true;
			}
		}
		for (const s of statements) {
			if (s.name == 'MEMORY_DECLARATION')
				expectType(expression(s.size, scope)[0], TYPES.Int32, 'memory size');
			if (s.name == 'ASSIGNMENT') analyzeAssignment(s, scope);
			if (s.name == 'BLOCK_DEFINITION') {
				const body = new Scope(scope);
				s.inputs.forEach((p, i) => declareValue(p, body, 'variable', s.symbol.input_types[i], true));
				s.outputs.forEach((p, i) => declareValue(p, body, 'variable', s.symbol.output_types[i]));
				analyzeStatements(s.statements, body);
				checkOutputs(s.outputs);
				for (const p of s.inputs)
					if (!p.symbol.used) console.warn('*** Warning *** Input not used: ' + p.id);
			}
		}
	}

	function checkOutputs(outputs) {
		for (const o of outputs)
			if (!o.symbol.assigned) throw new Error('Output not assigned: ' + o.id);
	}

	function analyzeAssignment(s, scope) {
		if (s.type == 'EXPR') {
			const array = s.expr.name == 'ARRAY_CONST';
			if (array && (s.outputs.length != 1 || s.outputs[0].name != 'PROPERTY' || s.outputs[0].property_id != 'init'))
				throw new Error('Array can be assigned to init property only');
			const types = expression(s.expr, scope, s.outputs.length, array);
			s.outputs.forEach((o, i) => {
				let type;
				switch (o.name) {
				case 'VARIABLE': type = o.symbol.datatype; break;
				case 'PROPERTY': type = property(o, scope, true); break;
				case 'MEMORY_ELEMENT': type = memory(o, scope, true); break;
				case 'DISCARD': return;
				default: throw new Error('Invalid assignment target: ' + o.name);
				}
				expectType(types[i], type, 'assignment to ' + (o.id || o.property_id));
			});
			return;
		}
		const branches = s.type == 'IF_THEN_ELSES' ? s.expr.branches
			: s.type == 'ANONYMOUS_BLOCK' ? [{ block: s.expr }] : null;
		if (!branches) throw new Error('Unexpected assignment type: ' + s.type);
		for (const branch of branches) {
			if (branch.condition)
				expectType(expression(branch.condition, scope)[0], TYPES.Bool, 'branch condition');
			const body = new Scope(scope);
			branch.outputs = s.outputs.map(o => {
				const local = { name: 'VARIABLE', id: o.id };
				declareValue(local, body, 'variable', o.symbol.datatype);
				return local;
			});
			analyzeStatements(branch.block.statements, body);
			checkOutputs(branch.outputs);
		}
	}

	function bind(node, scope, kinds, local = false) {
		const symbols = local ? scope.locals.get(node.id) : scope.find(node.id);
		if (!symbols || symbols.length != 1 || !kinds.includes(symbols[0].kind))
			throw new Error('Expected ' + kinds.join(' or ') + (local ? ' in this scope: ' : ': ') + node.id);
		node.symbol = symbols[0];
		return node.symbol;
	}

	function memory(node, scope, writing) {
		const symbol = bind(node, scope, ['memory'], writing);
		expectType(expression(node.args[0], scope)[0], TYPES.Int32, 'memory index');
		return symbol.datatype;
	}

	function property(node, scope, writing) {
		if (!['fs', 'init'].includes(node.property_id))
			throw new Error('Property not allowed: ' + node.property_id);
		const base = node.expr;
		let type;
		if (base.name == 'VARIABLE') {
			if (base.declaredType !== undefined) throw new Error('Unexpected type declaration in property');
			if (base.id == 'fs') throw new Error('Cannot access properties of reserved variable: fs');
			const symbol = bind(base, scope, ['variable', 'memory'], writing);
			if (writing && symbol.input) throw new Error('Cannot set properties of inputs');
			symbol.used = true;
			type = symbol.datatype;
		} else if (base.name == 'PROPERTY') {
			type = property(base, scope, writing);
		} else {
			if (writing || base.name == 'MEMORY_ELEMENT') throw new Error('Invalid property target');
			type = expression(base, scope)[0];
		}
		node.result_types = [node.property_id == 'fs' ? TYPES.Float32 : type];
		return node.result_types[0];
	}

	function expression(node, scope, count = 1, allowArray = false) {
		let types;
		switch (node.name) {
		case 'VARIABLE':
			if (node.declaredType !== undefined) throw new Error('Unexpected type declaration in expression');
			bind(node, scope, ['variable']).used = true;
			types = [node.symbol.datatype];
			break;
		case 'CONSTANT': types = [TYPES.fromAST(node.type)]; break;
		case 'PROPERTY': types = [property(node, scope, false)]; break;
		case 'MEMORY_ELEMENT': types = [memory(node, scope, false)]; break;
		case 'CALL_EXPR': {
			const args = node.args.map(arg => expression(arg, scope)[0]);
			node.symbol = scope.resolveCall(node.id, args);
			types = node.symbol.output_types;
			break;
		}
		case 'ARRAY_CONST': {
			if (!allowArray) throw new Error('Array is only allowed as an initializer');
			const args = node.args.map(arg => expression(arg, scope)[0]);
			args.forEach(t => expectType(t, args[0], 'array element'));
			types = [args[0]];
			break;
		}
		default:
			types = [operatorType(node, scope)];
		}
		if (types.length != count)
			throw new Error('Number of outputs accepted != number of block outputs: ' + types.length + ', ' + count);
		node.result_types = types;
		return types;
	}

	function operatorType(node, scope) {
		const unary = ['CAST_EXPR', 'UMINUS_EXPR', 'LOGICAL_NOT_EXPR', 'BITWISE_NOT_EXPR'];
		const arity = node.name == 'INLINE_IF_THEN_ELSE' ? 3 : unary.includes(node.name) ? 1 : 2;
		if (!node.args || node.args.length != arity)
			throw new Error('Invalid expression arity: ' + node.name + ' requires ' + arity + ' argument(s)');
		const args = node.args.map(arg => expression(arg, scope)[0]);
		if (node.name == 'CAST_EXPR') return TYPES.fromAST(node.type);
		if (node.name == 'INLINE_IF_THEN_ELSE') {
			expectType(args[0], TYPES.Bool, 'conditional expression');
			expectType(args[1], args[2], 'conditional branches');
			return args[1];
		}
		args.forEach(t => expectType(t, args[0], node.name));
		switch (node.name) {
		case 'LOGICAL_OR_EXPR': case 'LOGICAL_AND_EXPR': case 'LOGICAL_NOT_EXPR':
			expectType(args[0], TYPES.Bool, node.name);
			return TYPES.Bool;
		case 'BITWISE_INCLUSIVE_OR_EXPR': case 'BITWISE_EXCLUSIVE_OR_EXPR':
		case 'BITWISE_AND_EXPR': case 'BITWISE_NOT_EXPR':
		case 'SHIFT_LEFT_EXPR': case 'SHIFT_RIGHT_EXPR': case 'MODULO_EXPR':
			expectType(args[0], TYPES.Int32, node.name);
			return TYPES.Int32;
		case 'EQUAL_EXPR': case 'NOTEQUAL_EXPR': return TYPES.Bool;
		case 'LESS_EXPR': case 'LESSEQUAL_EXPR': case 'GREATER_EXPR': case 'GREATEREQUAL_EXPR':
		case 'PLUS_EXPR': case 'MINUS_EXPR': case 'TIMES_EXPR': case 'DIV_EXPR': case 'UMINUS_EXPR':
			if (![TYPES.Float32, TYPES.Int32].includes(args[0]))
				throw new Error('Numeric operands required: ' + node.name);
			return ['LESS_EXPR', 'LESSEQUAL_EXPR', 'GREATER_EXPR', 'GREATEREQUAL_EXPR'].includes(node.name)
				? TYPES.Bool : args[0];
		default: throw new Error('Unexpected expression: ' + node.name);
		}
	}

	exports.validateAST = validateAST;
}());
