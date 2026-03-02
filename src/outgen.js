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

/**
 * TODO:
 * - We're delcaring/assigning only on VARs. So we might check if other blocks fork their output. Should not happen with the implemented opts, might better to be sure anyways
 * - For the future: Control grouping system should be trated in the same way of user IFs. In the graph itself
 * 
 * - Check memory updates order. Might be better to save reads in vars.
 * 
 */

(function() {

	'use strict';

	const doT = require("dot");
	const fs = require("fs");
	const path = require("path");
	const templates = {
		"matlab": String(fs.readFileSync(path.join(__dirname, "templates", "matlab.m"))),
		"simple_c": String(fs.readFileSync(path.join(__dirname, "templates", "simple_c.h"))),
		"bw": {
			"src": {
				"module_h": String(fs.readFileSync(path.join(__dirname, "templates", "bw_example", "src", "bw_example.h"))),
				"module_c": String(fs.readFileSync(path.join(__dirname, "templates", "bw_example", "src", "bw_example.c"))),
				"config_h": String(fs.readFileSync(path.join(__dirname, "templates", "bw_example", "src", "config.h"))),
			},
			"vst3": {
				"config_vst3_h": String(fs.readFileSync(path.join(__dirname, "templates", "bw_example", "vst3", "config_vst3.h"))),
				"Makefile": String(fs.readFileSync(path.join(__dirname, "templates", "bw_example", "vst3", "Makefile")))
			}
		}	
	};
	const bs = require("./blocks").BlockTypes;
	const TYPES = require("./types");
	const RATES = require("./uprates");
	const ut = require("./util");

	
	function prependTabs (s, tabLevel) {
		let tabs = '';
		for (let i = 0; i < tabLevel; i++)
			tabs += '\t';
		const trimmed = s.toString().trim();
		if (trimmed.length == 0)
			return '';
		return trimmed.split('\n').map(x => tabs + x).join('\n');
	};

	function LazyString (...init) {
		this.s = [];
		this.read_memory_ids = new Set();
		this.add = function (...x) {
			for (let k of x) {
				if (k == undefined)
					throw new Error(k);
				if (k && k.read_memory_ids) {
					for (let id of k.read_memory_ids)
						this.read_memory_ids.add(id);
				}
				this.s.push(k);
			}
			return this;
		};
		this.toString = function () {
			let str = "";
			for (let p of this.s)
				str += p.toString();
			return str;
		};
		for (let i of init)
			this.add(i);
	};

	function get_funcs (target_language) {
		const keys = {
			array_indexer_l: '[',
			array_indexer_r: ']',
			object_prefix: 'instance->',
			const: 'const',
			static: 'static',
			type_int: 'int',
			type_float: 'float',
			type_bool: 'char',
			type_true: '1',
			type_false: '0',
			float_f_postfix: true,
			reserved_keywords: [
				"auto", "else", "long", "switch", "break", "enum", "register",
				"typedef", "case", "extern", "return", "union", "char",
				"float", "short", "unsigned", "const", "for", "signed", 
				"void", "continue", "goto", "sizeof", "volatile", "default",
				"if", "static", "while", "do", "int", "struct", "_Packed", "double"
			]
		};

		switch (target_language) {
		case "C":
			break;
		case 'cpp':
			keys.object_prefix = "this->";
			break;
		case "MATLAB":
			keys.array_indexer_l = '(';
			keys.array_indexer_r = ')';
			keys.object_prefix = '';
			keys.type_int = '';
			keys.type_float = '';
			keys.type_bool = '';
			keys.type_true = 'true';
			keys.type_false = 'false';
			keys.float_f_postfix = false;
			break;
		case "js":
			keys.object_prefix = "this.";
			keys.float_f_postfix = false;
			// TODO
			break;
		};

		const funcs = {};
		funcs["getArrayIndexer"] = (i) => new LazyString(keys.array_indexer_l, i, keys.array_indexer_r);
		function stripOuterParens(s) {
			s = s.trim();
			while (s[0] == '(' && s[s.length - 1] == ')') {
				let depth = 0;
				let ok = true;
				for (let i = 0; i < s.length; i++) {
					if (s[i] == '(') depth++;
					else if (s[i] == ')') depth--;
					if (depth == 0 && i < s.length - 1) {
						ok = false;
						break;
					}
				}
				if (!ok)
					break;
				s = s.slice(1, -1).trim();
			}
			return s;
		}
		function simplifyMatlabIndexExpr (expr) {
			let s = stripOuterParens(expr);
			let m;
			if ((m = s.match(/^\(?\s*(.+?)\s*\)?\s*\+\s*0(?:\.0+)?\s*$/)))
				return stripOuterParens(m[1]);
			if ((m = s.match(/^0(?:\.0+)?\s*\+\s*\(?\s*(.+?)\s*\)?\s*$/)))
				return stripOuterParens(m[1]);
			if ((m = s.match(/^\(?\s*(.+?)\s*\)?\s*-\s*0(?:\.0+)?\s*$/)))
				return stripOuterParens(m[1]);
			return s;
		}
		funcs["getMemoryArrayIndexer"] = (i) => {
			if (target_language == "MATLAB") {
				const idx = simplifyMatlabIndexExpr(i.toString());
				const intm = idx.match(/^[+-]?[0-9]+$/);
				if (intm) {
					const n = parseInt(intm[0], 10) + 1;
					return new LazyString(keys.array_indexer_l, n + "", keys.array_indexer_r);
				}
				return new LazyString(keys.array_indexer_l, idx, " + 1", keys.array_indexer_r);
			}
			return funcs.getArrayIndexer(i);
		};
		funcs["getFloat"] = keys.float_f_postfix
			? (n) =>  {
				n = n + "";
				return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f')
			}
			: (n) => n + "";
		funcs["getInt"] = (n) => n;
		funcs["getBool"] = (n) => n ? keys.type_true : keys.type_false;
		funcs["getConstant"] = (n, datatype) => {
			if (TYPES.Float32 == datatype)
				return funcs.getFloat(n);
			if (TYPES.Int32 == datatype)
				return funcs.getInt(n);
			if (TYPES.Bool == datatype) {
				return funcs.getBool(n);
			}
			throw new Error("getConstant. Type error");
		};
		funcs["getObjectPrefix"] = () => keys.object_prefix;
		funcs["getConstKey"] = () => keys.const;
		funcs["getStaticKey"] = () => keys.static;
		funcs["getTypeDecl"] = (t) => {
			if (TYPES.Float32 == t)
				return keys.type_float;
			if (TYPES.Int32 ==  t)
				return keys.type_int;
			if (TYPES.Bool == t)
				return keys.type_bool;
			throw new Error("getTypeDecl. Type error");
		};
		funcs["getReservedKeywords"] = () => keys.reserved_keywords;

		funcs.Identifiers = function () {
			this.ids = [];
			const nuostr = Array.from(funcs.getReservedKeywords());
			nuostr.push('i', 'instance', 'n_samples', 'sample_rate', 'firstRun');
			nuostr.forEach(k => {
				this.ids.push( {
					raw: k,
					nrm: k,
				} );
			});
			this.add = function (raw_id) {
				var postfix = "";
				var nrm_id_ = normalize(raw_id);
				for (let x = 0; x < 10000; x++) {
					const nrm_id = nrm_id_ + postfix;
					if (this.ids.some(i => i.nrm == nrm_id)) {
						postfix = x;
						continue;
					}
					this.ids.push({
						raw: raw_id,
						nrm: nrm_id,
						added: true
					});
					return nrm_id;
				}
				throw new Error("Identifier almost impossible error");
			};
			function normalize (id) {
				id = id.replace(/[^a-zA-Z0-9_]/g, '');
				if (id.length == 0)
					id = '_';
				if (id[0].match(/[0-9]/))
					id = '_' + id;
				return id;
			};
		};
		funcs.Includes = function () {
			this.v = [];
			this.s = new funcs.Statements();
			this.add = function (id) {
				if (this.v.includes(id))
					return;
				this.v.push(id);
				this.s.add(id, '\n');
			};
			this.toString = function (tabs) {
				return this.s.toString(tabs);
			};
		};
		funcs.MemoryDeclaration = function (type, id, size) {
			this.type = type;
			this.id = id;
			this.size = size;
			this.memory_id = id;
			this.toString = function () {
				const s = new LazyString();
				if (target_language == "MATLAB")
					s.add(this.id, ' = zeros(1, ', this.size, ');');
				else
					s.add(funcs.getTypeDecl(this.type), ' ', this.id, '[', this.size, '];');
				return s.toString();
			};
		};
		funcs.MemoryInit = function (id, size, value) {
			this.memory_id = id && id.__memory_id ? id.__memory_id : undefined;
			this.s = new LazyString();
			if (target_language == "MATLAB") {
				this.s.add(id, '(:) = ', value, ';');
			}
			else {
				this.s.add("for (int i = 0; i < ", size, "; i++) { \n");
				this.s.add('\t', id, keys.array_indexer_l, 'i', keys.array_indexer_r, ' = ', value, ';\n');
				this.s.add('}');
			}

			this.toString = function () {
				return this.s.toString();
			}
		};
		funcs.Declaration = function (isStatic, isConst, type, isPointer, id, lonely) {
			this.kind = "declaration";
			this.id = id;
			this.lonely = lonely;
			this.s = new LazyString();
			if (target_language == "MATLAB") {
				if (lonely)
					this.s.add(id, ' = 0;');
				else
					this.s.add(id);
				this.toString = function () {
					return this.s.toString();
				};
				return;
			}
			if (isStatic)
				this.s.add(funcs.getStaticKey(), ' ');
			if (isConst)
				this.s.add(funcs.getConstKey(), ' ');
			this.s.add(funcs.getTypeDecl(type), ' ');
			if (isPointer)
				this.s.add('*');
			this.s.add(id);
			if (lonely)
				this.s.add(";");
			
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.Assignment = function (l, r, declaration) {
			this.kind = "assignment";
			this.l = l;
			this.r = r;
			this.declaration = declaration;
			this.defined_id = declaration && declaration.id
				? declaration.id
				: (typeof l == "string" && l.match(/^[A-Za-z_][A-Za-z0-9_]*$/) ? l : undefined);
			if (declaration) {
				this.s = declaration.s;
				this.s.add(' = ', r, ';');
			}
			else {
				this.s = new LazyString();
				this.s.add(l, ' = ', r, ';');
			}

			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.ParWrapper = function (s, parLevelOp, parLevelB) {
			this.s = new LazyString();
			if (parLevelB <= parLevelOp)
				this.s.add('(', s, ')');
			else
				this.s.add(s);
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.Statements = function () {
			this.items = [];
			this.add = function (...x) {
				for (let k of x) {
					if (k == undefined)
						throw new Error(k);
					this.items.push(k);
				}
				return this;
			};
			this.toString = function (tabLevel = 0) {
				const r = this.items
					.map(k => typeof k.toString == "function" ? k.toString() : (k + ""))
					.filter(k => k.trim().length > 0)
					.join('\n');
				return prependTabs(r, tabLevel);
			};
		};
		function count_uses_in_items_local (items, id) {
			let n = 0;
			for (let s of items || []) {
				if (!s)
					continue;
				if (s.kind == "assignment") {
					const rx = new RegExp('(^|[^A-Za-z0-9_])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_]|$)', 'g');
					const expr = s.r ? s.r.toString() : "";
					while (rx.exec(expr))
						n++;
					continue;
				}
				if (s.kind == "if") {
					const rx = new RegExp('(^|[^A-Za-z0-9_])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_]|$)', 'g');
					const cond = s.condition ? s.condition.toString() : "";
					while (rx.exec(cond))
						n++;
					n += count_uses_in_items_local(s.body && s.body.items, id);
					continue;
				}
				if (s.kind == "ifelse") {
					const rx = new RegExp('(^|[^A-Za-z0-9_])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_]|$)', 'g');
					const cond = s.condition ? s.condition.toString() : "";
					while (rx.exec(cond))
						n++;
					n += count_uses_in_items_local(s.then_body && s.then_body.items, id);
					n += count_uses_in_items_local(s.else_body && s.else_body.items, id);
				}
			}
			return n;
		}
		function compactImmediateMemoryAliases (statements) {
			if (!statements || !statements.items)
				return;
			for (let s of statements.items) {
				if (s && s.kind == "if")
					compactImmediateMemoryAliases(s.body);
				if (s && s.kind == "ifelse") {
					compactImmediateMemoryAliases(s.then_body);
					compactImmediateMemoryAliases(s.else_body);
				}
			}
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && a.defined_id))
					continue;
				if (!(b.kind == "assignment"))
					continue;
				const lhs = ((b.l || "") + "").trim();
				if (!/^\s*[A-Za-z_][A-Za-z0-9_]*\s*[\(\[]/.test(lhs))
					continue;
				const rhs = ((b.r || "") + "").trim();
				const rr = rhs.replace(/^\(+\s*|\s*\)+$/g, '');
				if (rr != a.defined_id)
					continue;
				if (count_uses_in_items_local(statements.items.slice(i + 2), a.defined_id) > 0)
					continue;
				b.r = new LazyString(a.r.toString());
				b.s = new LazyString();
				b.s.add(b.l, ' = ', b.r, ';');
				statements.items.splice(i, 1);
				i--;
			}
		}
		funcs.IfBlock = function () {
			this.kind = "if";
			this.condition = new LazyString();
			if (target_language == "MATLAB")
				this.start = new LazyString('if ', this.condition, '\n');
			else
				this.start = new LazyString('if ( ', this.condition, ' ) { \n');
			this.body = new funcs.Statements();
			if (target_language == "MATLAB")
				this.end = new LazyString('\nend\n');
			else
				this.end = new LazyString('\n} \n');

			this.toString = function (tabLevel = 0) {
				compactImmediateMemoryAliases(this.body);
				const r = this.start.toString() + this.body.toString(1) + this.end.toString();
				return prependTabs(r, tabLevel);
			};
		};
		funcs.IfElseBlock = function () {
			this.kind = "ifelse";
			this.condition = new LazyString();
			if (target_language == "MATLAB") {
				this.start = new LazyString('if ', this.condition, '\n');
				this.mid = new LazyString('\nelse\n');
				this.end = new LazyString('\nend\n');
			}
			else {
				this.start = new LazyString('if ( ', this.condition, ' ) { \n');
				this.mid = new LazyString('\n} else { \n');
				this.end = new LazyString('\n} \n');
			}
			this.then_body = new funcs.Statements();
			this.else_body = new funcs.Statements();
			this.defined_id = undefined;
			this.toString = function (tabLevel = 0) {
				compactImmediateMemoryAliases(this.then_body);
				compactImmediateMemoryAliases(this.else_body);
				const r = this.start.toString() +
					this.then_body.toString(1) +
					this.mid.toString() +
					this.else_body.toString(1) +
					this.end.toString();
				return prependTabs(r, tabLevel);
			};
		};
		funcs.ControlCoeffsGroup = function (control_dependencies) {
			this.control_dependencies = control_dependencies;
			this.equals = (s) => ut.setsEqual(this.control_dependencies, s);
			
			if (target_language == "MATLAB") {
				this.s = new funcs.Statements();
			}
			else {
				this.s = new funcs.IfBlock();
				this.s.condition.add(Array.from(control_dependencies).map(x => funcs.getObjectPrefix() + x + '_CHANGED').join(' | '));
			}

			this.add = function (...x) {
				if (target_language == "MATLAB")
					this.s.add.apply(this.s, x);
				else
					this.s.body.add.apply(this.s.body, x);
			};
			this.toString = function (tabLevel = 0) {
				return this.s.toString(tabLevel);
			};
		};
		funcs.ControlCoeffs = function () {
			this.groups = [];
			this.getOrAddGroup = function (control_dependencies) {
				var g = this.groups.find(g => g.equals(control_dependencies));
				if (g == undefined) {
					g = new funcs.ControlCoeffsGroup(control_dependencies);
					this.groups.push(g);
				}
				return g;
			};
			this.add = function (s, control_dependencies) {
				const g = this.getOrAddGroup(control_dependencies);
				g.add(s);
			};
			this.toString = function (tabLevel = 0) {
				return this.groups.map(g => g.toString(tabLevel)).join('\n');
			};
		};

		return funcs;
	};


	function convert (bdef, schedule, options) {

		const t = options.target_language;
		const funcs = get_funcs(t);
		const initial_values = options.initial_values || {};

		const program = {

			name: "",

			identifiers: new funcs.Identifiers(),
			includes: new funcs.Includes(),

			audio_inputs: [],
			audio_outputs: [],
			parameters: [],
			parameters_initialValues: {},

			// Instance properties // Declarations
			parameter_states: new funcs.Statements(), // p, p_z1, p_CHANGED
			memory_declarations: new funcs.Statements(),
			states: new funcs.Statements(),
			coefficients: new funcs.Statements(),
			submodules: new funcs.Statements(),

			// mem reqs/sets
			mem_reqs: [],
			mem_sets: [],

			// Assignments
			init: new funcs.Statements(),
			reset: new funcs.Statements(),
			constants: new funcs.Statements(),
			fs_update: new funcs.Statements(),
			control_coeffs_update: new funcs.ControlCoeffs(),
			update_coeffs_ctrl: new funcs.Statements(),
			update_coeffs_audio: new funcs.Statements(),
			audio_update: new funcs.Statements(),
			memory_updates: new funcs.Statements(),

			output_updates: new funcs.Statements(),
		};

		(function init_strings () {
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => p.code = new LazyString());
				b.o_ports.forEach(p => p.code = new LazyString());
				if (bs.MemoryBlock.isPrototypeOf(b))
					b.code = new LazyString();
			});
			bdef.i_ports.forEach(p => p.code = new LazyString());
			bdef.o_ports.forEach(p => p.code = new LazyString());
		}());

		// TODO: check order and uniqueness in some weird cases, like a parameter called fs...
		// TODO: fix: calls -> cdef : n -> 1
		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == "cdef").forEach(b => {
			if (b.ref.state)
				program.identifiers.add(b.ref.state);
			if (b.ref.coeffs)
				program.identifiers.add(b.ref.coeffs);
		});
		bdef.i_ports.filter(p => p.updaterate() == RATES.Control).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			program.parameters.push(id);
			p.code = code;
			program.parameters_initialValues[id] = initial_values[p.id]
				? funcs.getFloat(initial_values[p.id])
				: funcs.getFloat(0.5);
		});
		program.parameters.forEach(p => {
			if (t != "MATLAB") {
				const id = program.identifiers.add(p + '_z1');
				const d = new funcs.Declaration(false, false, TYPES.Float32, false, id, true);
				program.parameter_states.add(d);
			}
		});
		program.parameters.forEach(p => {
			if (t != "MATLAB") {
				const id = program.identifiers.add(p + '_CHANGED');
				const d = new funcs.Declaration(false, false, TYPES.Bool, false, id, true);
				program.parameter_states.add(d);
			}
		});	
		program.parameters.forEach(p => {
			if (t != "MATLAB")
				program.identifiers.add('p_' + p);
		});
		program.parameters.forEach(p => {
			if (t != "MATLAB") {
				const id = p;
				const d = new funcs.Declaration(false, false, TYPES.Float32, false, id, true);
				program.parameter_states.add(d);
			}
		});
		program.name = program.identifiers.add(bdef.id);
		program.identifiers.add('_' + bdef.id);
		bdef.i_ports.filter(p => p.updaterate() == RATES.Audio).forEach(p => {
			const id = program.identifiers.add(p.id + '0');
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_inputs.push(id);
			p.code = code;
		});
		bdef.i_ports.filter(p => p.updaterate() == RATES.Fs).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			p.code = code;
		});
		bdef.o_ports.forEach(p => {
			const id = program.identifiers.add(p.id + '0');
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_outputs.push(id);
			p.code = code;
		});
		// Propagate output ids backwards so upstream temporaries (e.g. SELECT results)
		// can reuse semantic names instead of generic x__ names.
		bdef.o_ports.forEach(p => {
			const c = bdef.connections.find(c => c.out == p);
			if (c && p.id && !c.in.preferred_id)
				c.in.preferred_id = p.id;
		});
		

		schedule.forEach(b => ensure_block_converted(b));

		bdef.o_ports.forEach(p => {
			const c = bdef.connections.find(c => c.out == p);
			program.output_updates.add(new funcs.Assignment(c.out.code, c.in.code, false));
		});
		if (options.outgen_optimizations !== false)
			program.loop_body = build_optimized_loop_body();


		doT.templateSettings.strip = false;
	
		if (t == 'C') {
			return [
				{ 
					path: '.',
					name: bdef.id + ".h",
					str: doT.template(templates["simple_c"])(program) 
				},
			];
		}

		if (t == 'bw') {
			return [
				{
					path: path.join(bdef.id, 'src'),
					name: bdef.id + '.h',
					str: doT.template(templates.bw.src.module_h)(program) 
				},
				{
					path: path.join(bdef.id, 'src'),
					name: bdef.id + '.c',
					str: doT.template(templates.bw.src.module_c)(program) 
				},
				{
					path: path.join(bdef.id, 'src'),
					name: 'config.h',
					str: doT.template(templates.bw.src.config_h)(program) 
				},
				{
					path: path.join(bdef.id, 'vst3'),
					name: 'config_vst3.h',
					str: doT.template(templates.bw.vst3.config_vst3_h)(program) 
				},
				{
					path: path.join(bdef.id, 'vst3'),
					name: 'Makefile',
					str: doT.template(templates.bw.vst3.Makefile)(program) 
				},
			];
		}

		if (t == 'MATLAB') {
			const cleanMatlab = (s) => {
				let out = s.replace(/[ \t]+\n/g, '\n');
				out = out.replace(/\n{3,}/g, '\n\n');
				return out.trimEnd() + '\n';
			};
			return [
				{
					path: '.',
					name: bdef.id + ".m",
					str: cleanMatlab(doT.template(templates["matlab"])(program))
				},
			];
		}

		throw new Error("Not recognized target language");

		function build_optimized_loop_body () {
			const loop_body = new funcs.Statements();
			program.update_coeffs_audio.items.forEach(s => loop_body.add(s));
			program.audio_update.items.forEach(s => loop_body.add(s));
			program.memory_updates.items.forEach(s => loop_body.add(s));
			program.output_updates.items.forEach(s => loop_body.add(s));
				let changed = true;
				while (changed) {
				changed = false;
				if (merge_adjacent_conditionals(loop_body))
					changed = true;
				if (options.outgen_code_sinking !== false && sink_branch_local_statements(loop_body))
					changed = true;
				if (simplify_known_conditions(loop_body, new Set(), new Set()))
					changed = true;
				if (substitute_single_use_assignments(loop_body))
					changed = true;
				if (collapse_assignment_into_single_memory_write(loop_body))
					changed = true;
				if (remove_noop_assignments(loop_body))
					changed = true;
				if (collapse_trivial_aliases(loop_body))
					changed = true;
				if (options.outgen_code_hoisting !== false && distribute_following_statements_into_ifelse(loop_body))
					changed = true;
					if (options.outgen_code_hoisting !== false && cleanup_branch_local_scopes(loop_body, new Set()))
						changed = true;
				}
				prune_dead_memories(loop_body);
				return loop_body;
			}

			function merge_adjacent_conditionals (statements) {
				let changed = false;
				for (let s of statements.items) {
				if (s && s.kind == "if" && merge_adjacent_conditionals(s.body))
					changed = true;
				if (s && s.kind == "ifelse") {
					if (merge_adjacent_conditionals(s.then_body))
						changed = true;
					if (merge_adjacent_conditionals(s.else_body))
						changed = true;
				}
			}
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!a || !b)
					continue;
				if (a.kind == "ifelse" && b.kind == "ifelse"
						&& canonical_condition(a.condition.toString()) == canonical_condition(b.condition.toString())) {
					b.then_body.items.forEach(x => a.then_body.items.push(x));
					b.else_body.items.forEach(x => a.else_body.items.push(x));
					statements.items.splice(i + 1, 1);
					changed = true;
					i--;
					continue;
				}
				if (a.kind == "if" && b.kind == "if"
						&& canonical_condition(a.condition.toString()) == canonical_condition(b.condition.toString())) {
					b.body.items.forEach(x => a.body.items.push(x));
					statements.items.splice(i + 1, 1);
					changed = true;
					i--;
					continue;
				}
				if (a.kind == "ifelse" && b.kind == "if") {
					const branch = get_matching_ifelse_branch(a, b.condition.toString());
					if (branch) {
						b.body.items.forEach(x => branch.items.push(x));
						statements.items.splice(i + 1, 1);
						changed = true;
						i--;
						}
					}
				}
				for (let i = 0; i < statements.items.length - 2; i++) {
					const a = statements.items[i];
					if (!a)
						continue;
					for (let j = i + 2; j < statements.items.length; j++) {
						const b = statements.items[j];
						if (!b)
							continue;
						let canMoveAcross = true;
						for (let k = i + 1; k < j; k++) {
							if (!can_reorder_statement_pair(statements.items[k], b)) {
								canMoveAcross = false;
								break;
							}
						}
						if (!canMoveAcross)
							continue;
						if (a.kind == "ifelse" && b.kind == "ifelse"
								&& canonical_condition(a.condition.toString()) == canonical_condition(b.condition.toString())) {
							b.then_body.items.forEach(x => a.then_body.items.push(x));
							b.else_body.items.forEach(x => a.else_body.items.push(x));
							statements.items.splice(j, 1);
							changed = true;
							i--;
							break;
						}
						if (a.kind == "if" && b.kind == "if"
								&& canonical_condition(a.condition.toString()) == canonical_condition(b.condition.toString())) {
							b.body.items.forEach(x => a.body.items.push(x));
							statements.items.splice(j, 1);
							changed = true;
							i--;
							break;
						}
						if (a.kind == "ifelse" && b.kind == "if") {
							const branch = get_matching_ifelse_branch(a, b.condition.toString());
							if (branch) {
								b.body.items.forEach(x => branch.items.push(x));
								statements.items.splice(j, 1);
								changed = true;
								i--;
								break;
							}
						}
					}
				}
				return changed;
			}

		function can_reorder_statement_pair (a, b) {
			const a_defs = collect_defs_in_statement_set(a);
			const b_defs = collect_defs_in_statement_set(b);
			const a_uses = collect_uses_in_statement_set(a);
			const b_uses = collect_uses_in_statement_set(b);
			if (sets_intersect(a_defs, b_uses))
				return false;
			if (sets_intersect(b_defs, a_uses))
				return false;
			if (sets_intersect(a_defs, b_defs))
				return false;
			return true;
		}

			function distribute_following_statements_into_ifelse (statements) {
				let changed = false;
				for (let i = 0; i < statements.items.length - 1; i++) {
					const a = statements.items[i];
					if (!(a && a.kind == "ifelse"))
						continue;
					const def = get_defined_id(a);
					if (!def)
						continue;
					for (let j = i + 1; j < statements.items.length; j++) {
						const b = statements.items[j];
						if (!b)
							continue;
						if (!is_cloneable_statement(b))
							continue;
						if (count_uses_in_statement(b, def) == 0)
							continue;
						if (count_uses_in_items(statements.items.slice(i + 1, j), def) > 0)
							break;
						if (count_uses_in_items(statements.items.slice(j + 1), def) > 0)
							break;
						let canMoveAcross = true;
						for (let k = i + 1; k < j; k++) {
							if (!can_reorder_statement_pair(statements.items[k], b)) {
								canMoveAcross = false;
								break;
							}
						}
						if (!canMoveAcross)
							continue;
						a.then_body.items.push(clone_statement(b));
						a.else_body.items.push(clone_statement(b));
						statements.items.splice(j, 1);
						changed = true;
						i--;
						break;
					}
				}
				return changed;
			}

		function sink_branch_local_statements (statements) {
			let changed = true;
			let any_changed = false;
			while (changed) {
				changed = false;
				for (let i = 0; i < statements.items.length - 1; i++) {
					const cur = statements.items[i];
					const nxt = statements.items[i + 1];
					if (!(cur && cur.kind == "ifelse" && nxt && nxt.kind == "if"))
						continue;
					const branch = get_matching_ifelse_branch(cur, nxt.condition.toString());
					if (!branch)
						continue;
					nxt.body.items.forEach(x => branch.items.push(x));
					statements.items.splice(i + 1, 1);
					changed = any_changed = true;
					break;
				}
				for (let i = 0; i < statements.items.length - 1; i++) {
					const cur = statements.items[i];
					const nxt = statements.items[i + 1];
					if (!is_sinkable_statement(cur))
						continue;
					const def = get_defined_id(cur);
					if (!def)
						continue;
					const rest_items = statements.items.slice(i + 2);
					if (nxt && nxt.kind == "ifelse") {
						if (count_uses_in_expr(nxt.condition.toString(), def) > 0)
							continue;
						const then_uses = count_uses_in_statements(nxt.then_body, def);
						const else_uses = count_uses_in_statements(nxt.else_body, def);
						const rest_uses = count_uses_in_items(rest_items, def);
						if (rest_uses > 0)
							continue;
						if (then_uses > 0 && else_uses == 0) {
							nxt.then_body.items.unshift(cur);
							statements.items.splice(i, 1);
							changed = any_changed = true;
							break;
						}
						if (else_uses > 0 && then_uses == 0) {
							nxt.else_body.items.unshift(cur);
							statements.items.splice(i, 1);
							changed = any_changed = true;
							break;
						}
						continue;
					}
					if (nxt && nxt.kind == "if") {
						if (count_uses_in_expr(nxt.condition.toString(), def) > 0)
							continue;
						const body_uses = count_uses_in_statements(nxt.body, def);
						const rest_uses = count_uses_in_items(rest_items, def);
						if (body_uses > 0 && rest_uses == 0) {
							nxt.body.items.unshift(cur);
							statements.items.splice(i, 1);
							changed = any_changed = true;
							break;
						}
					}
				}
			}
			return any_changed;
		}

		function get_matching_ifelse_branch (ifelseStmt, conditionExpr) {
			const base = canonical_condition(ifelseStmt.condition.toString());
			const cond = canonical_condition(conditionExpr);
			if (cond == base)
				return ifelseStmt.then_body;
			if (cond == negate_condition(base))
				return ifelseStmt.else_body;
			return undefined;
		}

		function simplify_known_conditions (statements, known_true, known_false) {
			let changed = false;
			for (let i = 0; i < statements.items.length; i++) {
				const s = statements.items[i];
				if (!s)
					continue;
				if (s.kind == "if") {
					const cond = canonical_condition(s.condition.toString());
					if (known_true.has(cond)) {
						statements.items.splice(i, 1, ...s.body.items);
						changed = true;
						i--;
						continue;
					}
					if (known_false.has(cond)) {
						statements.items.splice(i, 1);
						changed = true;
						i--;
						continue;
					}
					const child_true = new Set(known_true);
					const child_false = new Set(known_false);
					child_true.add(cond);
					child_false.add(negate_condition(cond));
					if (simplify_known_conditions(s.body, child_true, child_false))
						changed = true;
					continue;
				}
				if (s.kind == "ifelse") {
					const cond = canonical_condition(s.condition.toString());
					if (known_true.has(cond)) {
						statements.items.splice(i, 1, ...s.then_body.items);
						changed = true;
						i--;
						continue;
					}
					if (known_false.has(cond)) {
						statements.items.splice(i, 1, ...s.else_body.items);
						changed = true;
						i--;
						continue;
					}
					const then_true = new Set(known_true);
					const then_false = new Set(known_false);
					then_true.add(cond);
					then_false.add(negate_condition(cond));
					if (simplify_known_conditions(s.then_body, then_true, then_false))
						changed = true;
					const else_true = new Set(known_true);
					const else_false = new Set(known_false);
					else_false.add(cond);
					else_true.add(negate_condition(cond));
					if (simplify_known_conditions(s.else_body, else_true, else_false))
						changed = true;
				}
			}
			return changed;
		}

		function collapse_trivial_aliases (statements) {
			let changed = false;
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && b.kind == "assignment"))
					continue;
				const tmp = a.defined_id;
				if (!tmp)
					continue;
				if (!is_simple_identifier_expr(b.r.toString(), tmp))
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), tmp) > 0)
					continue;
				b.r = a.r;
				b.s = new LazyString();
				if (b.declaration) {
					b.s = b.declaration.s;
					b.s.add(' = ', b.r, ';');
				}
				else {
					b.s.add(b.l, ' = ', b.r, ';');
				}
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function collapse_assignment_into_single_memory_write (statements) {
			let changed = false;
			for (let s of statements.items) {
				if (s && s.kind == "if" && collapse_assignment_into_single_memory_write(s.body))
					changed = true;
				if (s && s.kind == "ifelse") {
					if (collapse_assignment_into_single_memory_write(s.then_body))
						changed = true;
					if (collapse_assignment_into_single_memory_write(s.else_body))
						changed = true;
				}
			}
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && a.defined_id))
					continue;
				if (!(b.kind == "assignment"))
					continue;
				const lhs = ((b.l || "") + "").trim();
				if (!(b.memory_write_id || /^\s*[A-Za-z_][A-Za-z0-9_]*\s*[\(\[]/.test(lhs)))
					continue;
				if (!is_simple_identifier_expr(b.r.toString(), a.defined_id))
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), a.defined_id) > 0)
					continue;
				b.r = new LazyString(a.r.toString());
				b.s = new LazyString();
				b.s.add(b.l, ' = ', b.r, ';');
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function substitute_single_use_assignments (statements) {
			let changed = false;
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && a.defined_id))
					continue;
				if (a.declaration)
					continue;
				if (b.defined_id == a.defined_id)
					continue;
				if (count_uses_in_statement(b, a.defined_id) == 0)
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), a.defined_id) > 0)
					continue;
				substitute_identifier_in_statement(b, a.defined_id, a.r.toString());
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function cleanup_branch_local_scopes (statements, live_out) {
			let changed = false;
			for (let i = 0; i < statements.items.length; i++) {
				const s = statements.items[i];
				if (!s)
					continue;
				const suffix_live = union_id_sets(live_out, collect_uses_in_items_set(statements.items.slice(i + 1)));
				if (s.kind == "if") {
					if (cleanup_branch_local_scopes(s.body, suffix_live))
						changed = true;
					continue;
				}
				if (s.kind == "ifelse") {
					if (cleanup_branch_local_scopes(s.then_body, suffix_live))
						changed = true;
					if (cleanup_branch_local_scopes(s.else_body, suffix_live))
						changed = true;
				}
			}
			if (substitute_single_use_assignments_scoped(statements, live_out))
				changed = true;
			if (collapse_assignment_into_single_memory_write_scoped(statements, live_out))
				changed = true;
			if (forward_substitute_stable_assignments_scoped(statements, live_out))
				changed = true;
			if (collapse_trivial_aliases_scoped(statements, live_out))
				changed = true;
			if (remove_noop_assignments(statements))
				changed = true;
			return changed;
		}

		function substitute_single_use_assignments_scoped (statements, live_out) {
			let changed = false;
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && a.defined_id))
					continue;
				if (a.declaration)
					continue;
				if (live_out.has(a.defined_id))
					continue;
				if (b.defined_id == a.defined_id)
					continue;
				if (count_uses_in_statement(b, a.defined_id) == 0)
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), a.defined_id) > 0)
					continue;
				substitute_identifier_in_statement(b, a.defined_id, a.r.toString());
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function collapse_assignment_into_single_memory_write_scoped (statements, live_out) {
			let changed = false;
			for (let s of statements.items) {
				if (s && s.kind == "if" && collapse_assignment_into_single_memory_write_scoped(s.body, live_out))
					changed = true;
				if (s && s.kind == "ifelse") {
					if (collapse_assignment_into_single_memory_write_scoped(s.then_body, live_out))
						changed = true;
					if (collapse_assignment_into_single_memory_write_scoped(s.else_body, live_out))
						changed = true;
				}
			}
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && a.defined_id))
					continue;
				if (live_out.has(a.defined_id))
					continue;
				if (!(b.kind == "assignment"))
					continue;
				const lhs = ((b.l || "") + "").trim();
				if (!(b.memory_write_id || /^\s*[A-Za-z_][A-Za-z0-9_]*\s*[\(\[]/.test(lhs)))
					continue;
				if (!is_simple_identifier_expr(b.r.toString(), a.defined_id))
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), a.defined_id) > 0)
					continue;
				b.r = new LazyString(a.r.toString());
				b.s = new LazyString();
				b.s.add(b.l, ' = ', b.r, ';');
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function collapse_trivial_aliases_scoped (statements, live_out) {
			let changed = false;
			for (let i = 0; i < statements.items.length - 1; i++) {
				const a = statements.items[i];
				const b = statements.items[i + 1];
				if (!(a && b && a.kind == "assignment" && b.kind == "assignment"))
					continue;
				const tmp = a.defined_id;
				if (!tmp)
					continue;
				if (live_out.has(tmp))
					continue;
				if (!is_simple_identifier_expr(b.r.toString(), tmp))
					continue;
				if (count_uses_in_items(statements.items.slice(i + 2), tmp) > 0)
					continue;
				b.r = a.r;
				b.s = new LazyString();
				if (b.declaration) {
					b.s = b.declaration.s;
					b.s.add(' = ', b.r, ';');
				}
				else {
					b.s.add(b.l, ' = ', b.r, ';');
				}
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

		function forward_substitute_stable_assignments_scoped (statements, live_out) {
			let changed = false;
			for (let i = 0; i < statements.items.length; i++) {
				const a = statements.items[i];
				if (!(a && a.kind == "assignment" && a.defined_id))
					continue;
				if (a.declaration)
					continue;
				if (live_out.has(a.defined_id))
					continue;
				const repl = a.r.toString();
				const dep_ids = collect_uses_in_expr_set(repl);
				let used = false;
				for (let j = i + 1; j < statements.items.length; j++) {
					const s = statements.items[j];
					if (count_uses_in_statement(s, a.defined_id) > 0) {
						substitute_identifier_in_statement(s, a.defined_id, repl);
						used = true;
						changed = true;
					}
					const writes = collect_defs_in_statement_set(s);
					const hits_dep = sets_intersect(dep_ids, writes);
					const hits_self = writes.has(a.defined_id);
					if (hits_dep || hits_self)
						break;
				}
				if (!used)
					continue;
				if (count_uses_in_items(statements.items.slice(i + 1), a.defined_id) > 0)
					continue;
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
			return changed;
		}

			function remove_noop_assignments (statements) {
			let changed = false;
			for (let s of statements.items) {
				if (s && s.kind == "if" && remove_noop_assignments(s.body))
					changed = true;
				if (s && s.kind == "ifelse") {
					if (remove_noop_assignments(s.then_body))
						changed = true;
					if (remove_noop_assignments(s.else_body))
						changed = true;
				}
			}
			for (let i = 0; i < statements.items.length; i++) {
				const s = statements.items[i];
				if (!(s && s.kind == "assignment"))
					continue;
				if (strip_outer_parens_local((s.l || "").toString()) != strip_outer_parens_local((s.r || "").toString()))
					continue;
				statements.items.splice(i, 1);
				changed = true;
				i--;
			}
				return changed;
			}

			function prune_dead_memories (loop_body) {
				const memoryIds = program.memory_declarations.items
					.filter(d => d && d.memory_id)
					.map(d => d.memory_id);
				if (memoryIds.length == 0)
					return;

				const readIds = new Set();
				const writeIds = new Set();

				function escapeRegExp (s) {
					return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				}

				function collectMemoryRefsFromText (text, ownWriteId) {
					for (let id of memoryIds) {
						if (id == ownWriteId)
							continue;
						const rx = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(id) + '\\s*[\\(\\[]');
						if (rx.test(text))
							readIds.add(id);
					}
				}

				function walkStatements (statements) {
					if (!statements || !statements.items)
						return;
					for (let s of statements.items) {
						if (!s)
							continue;
						if (s.kind == "assignment") {
							if (s.memory_write_id)
								writeIds.add(s.memory_write_id);
							const rhs = s.r ? s.r.toString() : "";
							collectMemoryRefsFromText(rhs, undefined);
							if (!s.memory_write_id) {
								const lhs = s.l ? s.l.toString() : "";
								collectMemoryRefsFromText(lhs, undefined);
							}
							continue;
						}
						if (s.kind == "if") {
							collectMemoryRefsFromText(s.condition ? s.condition.toString() : "", undefined);
							walkStatements(s.body);
							continue;
						}
						if (s.kind == "ifelse") {
							collectMemoryRefsFromText(s.condition ? s.condition.toString() : "", undefined);
							walkStatements(s.then_body);
							walkStatements(s.else_body);
							continue;
						}
						if (s.memory_id) {
							writeIds.add(s.memory_id);
							collectMemoryRefsFromText(s.toString(), s.memory_id);
							continue;
						}
						if (typeof s.toString == "function")
							collectMemoryRefsFromText(s.toString(), undefined);
					}
				}

				walkStatements(program.constants);
				walkStatements(program.fs_update);
				walkStatements(program.update_coeffs_ctrl);
				walkStatements(program.init);
				walkStatements(program.reset);
				if (loop_body)
					walkStatements(loop_body);
				else {
					walkStatements(program.update_coeffs_audio);
					walkStatements(program.audio_update);
					walkStatements(program.memory_updates);
					walkStatements(program.output_updates);
				}

				const deadIds = new Set();
				program.memory_declarations.items = program.memory_declarations.items.filter(d => {
					if (!d || !d.memory_id)
						return true;
					if (readIds.has(d.memory_id))
						return true;
					deadIds.add(d.memory_id);
					return false;
				});
				if (deadIds.size == 0)
					return;

				program.reset.items = program.reset.items.filter(s => !(s && s.memory_id && deadIds.has(s.memory_id)));
				if (t != "MATLAB")
					program.init.items = program.init.items.filter(s => !(s && s.memory_id && deadIds.has(s.memory_id)));

				function pruneWrites (statements) {
					if (!statements || !statements.items)
						return;
					statements.items = statements.items.filter(s => {
						if (!s)
							return false;
						if (s.kind == "if")
							pruneWrites(s.body);
						if (s.kind == "ifelse") {
							pruneWrites(s.then_body);
							pruneWrites(s.else_body);
						}
						if (s.memory_write_id && deadIds.has(s.memory_write_id))
							return false;
						if (s.memory_id && deadIds.has(s.memory_id))
							return false;
						return true;
					});
				}

				pruneWrites(program.constants);
				pruneWrites(program.fs_update);
				pruneWrites(program.update_coeffs_ctrl);
				if (loop_body)
					pruneWrites(loop_body);
				else {
					pruneWrites(program.update_coeffs_audio);
					pruneWrites(program.audio_update);
					pruneWrites(program.memory_updates);
					pruneWrites(program.output_updates);
				}
			}


			function is_sinkable_statement (s) {
			if (!s)
				return false;
			if (s.kind == "assignment")
				return !!s.defined_id;
			if ((s.kind == "ifelse" || s.kind == "if") && s.defined_id)
				return true;
			return false;
		}

		function is_cloneable_statement (s) {
			if (!s)
				return false;
			if (s.kind == "assignment" && !s.declaration)
				return true;
			if (s.kind == "if" || s.kind == "ifelse")
				return true;
			return false;
		}

		function get_defined_id (s) {
			return s && s.defined_id ? s.defined_id : undefined;
		}

		function count_uses_in_items (items, id) {
			let n = 0;
			for (let s of items)
				n += count_uses_in_statement(s, id);
			return n;
		}

		function count_uses_in_statements (stmts, id) {
			return count_uses_in_items(stmts.items, id);
		}

		function count_uses_in_statement (s, id) {
			if (!s)
				return 0;
			if (s.kind == "assignment")
				return count_uses_in_expr(s.r.toString(), id);
			if (s.kind == "declaration")
				return 0;
			if (s.kind == "if")
				return count_uses_in_expr(s.condition.toString(), id) + count_uses_in_statements(s.body, id);
			if (s.kind == "ifelse")
				return count_uses_in_expr(s.condition.toString(), id)
					+ count_uses_in_statements(s.then_body, id)
					+ count_uses_in_statements(s.else_body, id);
			return count_uses_in_expr(s.toString(), id);
		}

		function count_uses_in_expr (expr, id) {
			const rx = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(id) + '([^A-Za-z0-9_]|$)', 'g');
			let n = 0;
			while (rx.exec(expr))
				n++;
			return n;
		}

		function collect_uses_in_items_set (items) {
			const r = new Set();
			for (let s of items) {
				const rs = collect_uses_in_statement_set(s);
				rs.forEach(x => r.add(x));
			}
			return r;
		}

		function collect_uses_in_statement_set (s) {
			const r = new Set();
			if (!s)
				return r;
			if (s.kind == "assignment") {
				collect_uses_in_expr_set(s.r.toString()).forEach(x => r.add(x));
				return r;
			}
			if (s.kind == "if") {
				collect_uses_in_expr_set(s.condition.toString()).forEach(x => r.add(x));
				collect_uses_in_items_set(s.body.items).forEach(x => r.add(x));
				return r;
			}
			if (s.kind == "ifelse") {
				collect_uses_in_expr_set(s.condition.toString()).forEach(x => r.add(x));
				collect_uses_in_items_set(s.then_body.items).forEach(x => r.add(x));
				collect_uses_in_items_set(s.else_body.items).forEach(x => r.add(x));
			}
			return r;
		}

		function collect_uses_in_expr_set (expr) {
			const r = new Set();
			const ms = (expr || "").match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
			ms.forEach(x => r.add(x));
			return r;
		}

		function collect_defs_in_statement_set (s) {
			const r = new Set();
			if (!s)
				return r;
			if (s.kind == "assignment") {
				if (s.defined_id) {
					r.add(s.defined_id);
					return r;
				}
				const m = ((s.l || "") + "").match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
				if (m)
					r.add(m[1]);
				return r;
			}
			if (s.kind == "if") {
				s.body.items.forEach(x => collect_defs_in_statement_set(x).forEach(y => r.add(y)));
				return r;
			}
			if (s.kind == "ifelse") {
				s.then_body.items.forEach(x => collect_defs_in_statement_set(x).forEach(y => r.add(y)));
				s.else_body.items.forEach(x => collect_defs_in_statement_set(x).forEach(y => r.add(y)));
			}
			return r;
		}

		function sets_intersect (a, b) {
			for (let x of a) {
				if (b.has(x))
					return true;
			}
			return false;
		}

		function union_id_sets (a, b) {
			const r = new Set();
			(a || new Set()).forEach(x => r.add(x));
			(b || new Set()).forEach(x => r.add(x));
			return r;
		}

		function is_simple_identifier_expr (expr, id) {
			const s = strip_outer_parens_local((expr || "").trim());
			return s == id;
		}

		function clone_statement (s) {
			if (s.kind == "assignment") {
				const c = new funcs.Assignment(s.l, s.r, null);
				c.defined_id = s.defined_id;
				return c;
			}
			if (s.kind == "if") {
				const c = new funcs.IfBlock();
				c.condition = new LazyString(s.condition.toString());
				if (t == "MATLAB")
					c.start = new LazyString('if ', c.condition, '\n');
				else
					c.start = new LazyString('if ( ', c.condition, ' ) { \n');
				s.body.items.forEach(x => c.body.items.push(clone_statement(x)));
				return c;
			}
			if (s.kind == "ifelse") {
				const c = new funcs.IfElseBlock();
				c.defined_id = s.defined_id;
				c.condition = new LazyString(s.condition.toString());
				if (t == "MATLAB") {
					c.start = new LazyString('if ', c.condition, '\n');
					c.mid = new LazyString('\nelse\n');
					c.end = new LazyString('\nend\n');
				}
				else {
					c.start = new LazyString('if ( ', c.condition, ' ) { \n');
					c.mid = new LazyString('\n} else { \n');
					c.end = new LazyString('\n} \n');
				}
				s.then_body.items.forEach(x => c.then_body.items.push(clone_statement(x)));
				s.else_body.items.forEach(x => c.else_body.items.push(clone_statement(x)));
				return c;
			}
			throw new Error("Cannot clone statement");
		}

		function substitute_identifier_in_statement (s, id, replacement) {
			if (!s)
				return;
			if (s.kind == "assignment") {
				if (typeof s.l == "string")
					s.l = replace_identifier_in_expr(s.l, id, replacement);
				s.r = new LazyString(replace_identifier_in_expr(s.r.toString(), id, replacement));
				s.s = new LazyString();
				if (s.declaration) {
					s.s = s.declaration.s;
					s.s.add(' = ', s.r, ';');
				}
				else {
					s.s.add(s.l, ' = ', s.r, ';');
				}
				return;
			}
			if (s.kind == "if") {
				s.condition = new LazyString(replace_identifier_in_expr(s.condition.toString(), id, replacement));
				if (t == "MATLAB")
					s.start = new LazyString('if ', s.condition, '\n');
				else
					s.start = new LazyString('if ( ', s.condition, ' ) { \n');
				s.body.items.forEach(x => substitute_identifier_in_statement(x, id, replacement));
				return;
			}
			if (s.kind == "ifelse") {
				s.condition = new LazyString(replace_identifier_in_expr(s.condition.toString(), id, replacement));
				if (t == "MATLAB") {
					s.start = new LazyString('if ', s.condition, '\n');
					s.mid = new LazyString('\nelse\n');
					s.end = new LazyString('\nend\n');
				}
				else {
					s.start = new LazyString('if ( ', s.condition, ' ) { \n');
					s.mid = new LazyString('\n} else { \n');
					s.end = new LazyString('\n} \n');
				}
				s.then_body.items.forEach(x => substitute_identifier_in_statement(x, id, replacement));
				s.else_body.items.forEach(x => substitute_identifier_in_statement(x, id, replacement));
			}
		}

		function replace_identifier_in_expr (expr, id, replacement) {
			const rx = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(id) + '([^A-Za-z0-9_]|$)', 'g');
			return (expr || "").replace(rx, function (_m, a, b) {
				return a + "(" + replacement + ")" + b;
			});
		}

		function canonical_condition (expr) {
			return strip_outer_parens_local((expr || "").trim());
		}

		function negate_condition (expr) {
			return "!(" + strip_outer_parens_local(expr) + ")";
		}

		function strip_outer_parens_local (s) {
			s = (s || "").trim();
			while (s.length > 1 && s[0] == '(' && s[s.length - 1] == ')') {
				let depth = 0;
				let ok = true;
				for (let i = 0; i < s.length; i++) {
					if (s[i] == '(')
						depth++;
					else if (s[i] == ')')
						depth--;
					if (depth == 0 && i < s.length - 1) {
						ok = false;
						break;
					}
				}
				if (!ok)
					break;
				s = s.slice(1, -1).trim();
			}
			return s;
		}

		function escapeRegExp (s) {
			return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		function dispatch (b, ur, control_dependencies) {
			const outblocks = bdef.connections.filter(c => c.in.block == b).map(c => c.out.block);
			
			let locality = undefined; // 0 = constant, 1 = object, 2 = local
			let whereDec = undefined;
			let whereAss = undefined;

			const outblockurs = outblocks.map(bb =>
				RATES.max.apply(null, bb.i_ports.concat(bb.o_ports).map(p => p.updaterate()))
			);
			const maxour = outblockurs.length > 0 ? RATES.max.apply(null, outblockurs) : ur;

			locality = maxour.level <= ur.level ? 2 : 1;

			if (ur == RATES.Constant) {
				locality = 0;
				whereDec = program.constants;
				whereAss = program.init;
			}
			if (ur == RATES.Fs) {
				if (locality == 2)
					whereDec = program.fs_update;
				else
					whereDec = program.coefficients;
				whereAss = program.fs_update;
			}
			if (ur == RATES.Control) {
				const g = program.control_coeffs_update.getOrAddGroup(control_dependencies);
				if (locality == 2) {
					locality = outblocks.every(bb => ut.setsEqual(control_dependencies, bb.control_dependencies)) ? 2 : 1;
				}
				if (locality == 2) {
					whereDec = g;
				}
				else {
					whereDec = program.coefficients;
				}
				whereAss = g;
			}
			if (ur == RATES.Audio) {
				locality = 2;
				whereDec = program.audio_update;
				whereAss = program.audio_update;
			}

			return {
				locality: locality,
				whereDec: whereDec,
				whereAss: whereAss
			};
		}


		function ensure_block_converted (b) {
			if (b == bdef)
				return;
			if (b.__converted__)
				return;
			if (b.__converting__)
				return;
			b.__converting__ = true;
			b.i_ports.forEach(p => {
				const c = bdef.connections.find(cc => cc.out == p);
				if (c)
					ensure_block_converted(c.in.block);
			});
			if (b.predicate_terms) {
				b.predicate_terms.forEach(t => {
					if (t && t.port && t.port.block)
						ensure_block_converted(t.port.block);
				});
			}
			convert_block(b);
			b.__converted__ = true;
			delete b.__converting__;
		}

		function convert_block (b) {
			if (b.__converted__)
				return;
			
			const input_block_out_ports = b.i_ports.map(p => bdef.connections.find(c => c.out == p).in);
			const input_blocks = input_block_out_ports.map(p => p.block);
			const input_codes = input_block_out_ports.map(p => p.code);
			
			const op0 = b.o_ports[0];

			function pick_preferred_memory_id (memoryblock, fallback) {
				if (!memoryblock || !Array.isArray(memoryblock.__preferred_ids__) || memoryblock.__preferred_ids__.length == 0)
					return fallback;
				return memoryblock.__preferred_ids__.reduce((best, cur) => {
					if (typeof best != "string" || cur.length > best.length)
						return cur;
					return best;
				}, fallback);
			}

			if (bs.VarBlock.isPrototypeOf(b)) {
				const var_out_conns = bdef.connections.filter(c => c.in == op0);
				if (var_out_conns.length == 1 && var_out_conns[0].out.block == bdef) {
					op0.code = input_codes[0];
					return;
				}
				if (var_out_conns.length == 1 && bs.MemoryWriterBlock.isPrototypeOf(var_out_conns[0].out.block)) {
					op0.code = input_codes[0];
					return;
				}
				let tracedSrcBlock = input_blocks[0];
				while (bs.VarBlock.isPrototypeOf(tracedSrcBlock)) {
					const cvin = bdef.connections.find(c => c.out == tracedSrcBlock.i_ports[0]);
					if (!cvin)
						break;
					tracedSrcBlock = cvin.in.block;
				}
				if (bs.MemoryReaderBlock.isPrototypeOf(tracedSrcBlock)) {
					const mr = tracedSrcBlock;
					const mb = mr.memoryblock;
					let sizeCode = mb && mb.__outgen_memory_size_code;
					if (!sizeCode && mb) {
						const csize = bdef.connections.find(c => c.out == mb.i_ports[0]);
						if (csize && bs.ConstantBlock.isPrototypeOf(csize.in.block))
							sizeCode = csize.in.block.value.toString();
						else if (csize && csize.in && csize.in.code)
							sizeCode = csize.in.code.toString().trim();
					}
					const scalarMem = mb && sizeCode == "1";
					if (scalarMem) {
						if (!mb.__scalar_alias_applied) {
							const preferredId = pick_preferred_memory_id(mb, b.id);
							const aliasId = mb.__pending_scalar_alias_id || program.identifiers.add(preferredId);
							mb.__pending_scalar_alias_id = aliasId;
							if (mb.__outgen_memory_decl__)
								mb.__outgen_memory_decl__.id = aliasId;
							mb.code.s = [funcs.getObjectPrefix(), aliasId];
							mb.__scalar_alias_applied = true;
						}
						op0.code.add(input_codes[0]);
						return;
					}
				}
				
				const ur = b.o_ports[0].updaterate();
				const r = dispatch(b, ur, b.control_dependencies);
				const locality = r.locality;
				const whereDec = r.whereDec;
				const whereAss = r.whereAss;

				const id = program.identifiers.add(b.id);

				if (locality == 0) {
					op0.code.add(id);
					const d = new funcs.Declaration(false, false, b.datatype(), false, id, true);
					const a = new funcs.Assignment(id, input_codes[0], null);
					if (t != "MATLAB")
						whereDec.add(d);
					whereAss.add(a);
				}
				else if (locality == 1) {
					const refid = funcs.getObjectPrefix() + id;
					op0.code.add(refid);
					const d = new funcs.Declaration(false, false, b.datatype(), false, id, true);
					const a = new funcs.Assignment(refid, input_codes[0], null);
					if (t != "MATLAB")
						whereDec.add(d);
					whereAss.add(a);
				}
				else if (locality == 2) {
					op0.code.add(id);
					const d = new funcs.Declaration(false, true, b.datatype(), false, id, false);
					const a = new funcs.Assignment(null, input_codes[0], d);
					whereAss.add(a);	
				}
				return;
			}
			if (bs.MemoryBlock.isPrototypeOf(b)) {
				function tracePreferredScalarBase (srcp, visitedPorts) {
					if (!srcp || visitedPorts.has(srcp))
						return undefined;
					visitedPorts.add(srcp);
					if (bs.VarBlock.isPrototypeOf(srcp.block)) {
						const id = srcp.block.id;
						const semantic = (typeof id == "string"
							&& id.length > 0
							&& !id.startsWith("x__")
							&& !id.endsWith(".init")
							&& !id.endsWith(".fs"))
							? id
							: undefined;
						const cvin = bdef.connections.find(c => c.out == srcp.block.i_ports[0]);
						const upstream = cvin ? tracePreferredScalarBase(cvin.in, visitedPorts) : undefined;
						if (srcp.block.__is_bdef_input__)
							return upstream || semantic;
						return semantic || upstream;
					}
					if (bs.SelectBlock.isPrototypeOf(srcp.block)) {
						const c1 = bdef.connections.find(c => c.out == srcp.block.i_ports[1]);
						const c2 = bdef.connections.find(c => c.out == srcp.block.i_ports[2]);
						return (c1 ? tracePreferredScalarBase(c1.in, visitedPorts) : undefined)
							|| (c2 ? tracePreferredScalarBase(c2.in, visitedPorts) : undefined);
					}
					return undefined;
				}

					let id = b.__pending_scalar_alias_id;
					if (!id)
						id = program.identifiers.add(pick_preferred_memory_id(b, b.id));
				const d = new funcs.MemoryDeclaration(b.datatype(), id, input_codes[0]);
				b.code.s = [funcs.getObjectPrefix(), id];
				b.code.__memory_id = id;
				b.__outgen_memory_id = id;
				b.__outgen_memory_decl__ = d;
				b.__outgen_memory_size_code = input_codes[0].toString().trim();

				program.memory_declarations.add(d);

				const i = new funcs.MemoryInit(b.code, input_codes[0], input_codes[1]);
				if (t != "MATLAB")
					program.init.add(i);
				program.reset.add(i);

				return;
			}
			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				const c = op0.code;
				c.add(b.memoryblock.code);
				c.add(funcs.getMemoryArrayIndexer(input_codes[0]));
				if (b.memoryblock.__outgen_memory_id)
					c.read_memory_ids.add(b.memoryblock.__outgen_memory_id);
				return;
			}
			if (bs.MemoryWriterBlock.isPrototypeOf(b)) {
				const c = new LazyString();
				c.add(b.memoryblock.code);
				c.add(funcs.getMemoryArrayIndexer(input_codes[0]));
				if (c.toString() == input_codes[1].toString())
					return;
				const a = new funcs.Assignment(c, input_codes[1], null);
				a.memory_write_id = b.memoryblock.__outgen_memory_id;
				if (b.predicate_terms && b.predicate_terms.length > 0) {
					const i0 = new funcs.IfBlock();
					if (b.predicate_terms[0].negated)
						i0.condition.add("!(");
					i0.condition.add(b.predicate_terms[0].port.code);
					if (b.predicate_terms[0].negated)
						i0.condition.add(")");
					let cur = i0;
					for (let i = 1; i < b.predicate_terms.length; i++) {
						const ii = new funcs.IfBlock();
						if (b.predicate_terms[i].negated)
							ii.condition.add("!(");
						ii.condition.add(b.predicate_terms[i].port.code);
						if (b.predicate_terms[i].negated)
							ii.condition.add(")");
						cur.body.add(ii);
						cur = ii;
					}
					cur.body.add(a);
					program.memory_updates.add(i0);
				}
				else {
					program.memory_updates.add(a); // TODO: Might not be always the case
				}
				return;
			}
			if (bs.ConstantBlock.isPrototypeOf(b)) {
				op0.code.add(funcs.getConstant(b.value, b.datatype()));
				return;
			}
			if (bs.MaxBlock.isPrototypeOf(b)) {
				op0.code.add("__max__(");
				op0.code.add(input_codes[0]);
				for (let i = 1; i < input_codes.length; i++)
					op0.code.add(', ', input_codes[i]);
				op0.code.add(')');
				return;
			}
			if (bs.CallBlock.isPrototypeOf(b) && b.type == "cdef") {
				if (t == "MATLAB")
					throw new Error("MATLAB target does not support include/cdef blocks");
				const cdef = b.ref;

				// Include
				program.includes.add(cdef.header);

				let state;
				let coeffs;

				// Sub components declaration
				if (cdef.state) {
					const id = program.identifiers.add(cdef.state);
					const decl = cdef.state + ' ' + id + ';';
					program.submodules.add(decl);
					state = '&' + funcs.getObjectPrefix() + id;
				}
				if (cdef.coeffs) {
					const id = program.identifiers.add(cdef.coeffs);
					const decl = cdef.coeffs + ' ' + id + ';';
					program.submodules.add(decl);
					coeffs = '&' + funcs.getObjectPrefix() + id;
				}

				// functions dispatching
	
				function get_decls_assignments (locality, f) {

					const prefix = locality == 1 ? funcs.getObjectPrefix() : "";

					const inputs = [];
					const outputs = [];
					const decls = [];

					for (let i = 0; i < f.f_inputs.length; i++) {
						const input = f.f_inputs[i];
						if (input == 'state') {
							inputs.push(state);
						}
						if (input == "coeffs") {
							inputs.push(coeffs);
						}
						if (input[0] == 'i') {
							inputs.push(input_codes[input[1]]);
						}
						if (input[0] == 'o') {
							const type = b.o_ports[input[1]].datatype();
							const id = program.identifiers.add('x__');
							const pid = prefix + id;
							const decl = new funcs.Declaration(false, false, type, false, id, true);
							const ref = '&' + pid;
							decls.push(decl);
							inputs.push(ref);
							b.o_ports[input[1]].code.add(pid);
						}
					}
					var alone = false;
					if (decls.length > 0) {
						alone = true;
					}
					if (f.f_outputs.length == 0) {
						alone = true;
					}
					else {
						const output = f.f_outputs[0];
						if (true) { //(decls.length > 0) {
							const type = b.o_ports[output[1]].datatype();
							const id = program.identifiers.add('x__');
							const pid = prefix + id;
							const decl = new funcs.Declaration(false, false, type, false, id, true);
							decls.push(decl);
							b.o_ports[output[1]].code.add(pid);
							outputs.push(pid);
						}
						else {

						}
					}

					alone = true; // tmp
					const stmt = new LazyString();
					if (alone) {
						if (outputs.length > 0) {
							stmt.add(outputs[0], ' = ');
						}
						stmt.add(f.f_name, '(');
						for (let i = 0; i < inputs.length; i++) {
							stmt.add(inputs[i]);
							if (i != inputs.length - 1)
								stmt.add(', ');
						}
						stmt.add(');');
					}
					else {

					}

					return {
						decls: decls,
						assignments: [stmt]
					};
				}


				if (cdef.funcs.init) {
					const f = cdef.funcs.init;

					const locality = 1;
					const whereDec = program.constants;
					const whereAss = program.init;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.mem_req) {
					const f = cdef.funcs.mem_req;

					program.mem_reqs.push(
						f.f_name + '(' + coeffs + ')'
					);
				}

				if (cdef.funcs.mem_set) {
					const f = cdef.funcs.mem_set;

					program.mem_sets.push(
						f.f_name + '(' + coeffs + ', ' + state + ', m)'
					);
				}

				if (cdef.funcs.set_sample_rate) {
					const f = cdef.funcs.set_sample_rate;

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = program.fs_update;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.reset_coeffs) {
					const f = cdef.funcs.reset_coeffs;

					const locality = 1;
					const whereDec = program.coefficients; // TODO: program.reset_coeffs and reset_state
					const whereAss = program.reset;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.reset_state) {
					const f = cdef.funcs.reset_state;

					const locality = 1;
					const whereDec = program.coefficients; // TODO: program.reset_coeffs and reset_state
					const whereAss = program.reset;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}
				
				if (cdef.funcs.update_coeffs_ctrl) {
					const f = cdef.funcs.update_coeffs_ctrl;

					const i_ports = [];
					for (let i = 0; i < f.f_inputs.length; i++) {
						const input = f.f_inputs[i];
						if (input[0] == 'i') {
							i_ports.push(b.i_ports[input[1]]);
						}
					}
					const ur = RATES.max.apply(null, i_ports.map(p => p.updaterate()));

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = ur == RATES.Audio ? program.update_coeffs_audio : program.update_coeffs_ctrl;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.update_coeffs_audio) {
					const f = cdef.funcs.update_coeffs_audio;

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = program.update_coeffs_audio;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				cdef.funcs.setters.forEach(setter => {
					const f = setter;
					
					const valueinputport = b.i_ports[f.f_inputs[1][1]];
					const inb = bdef.connections.find(c => c.out == valueinputport).in.block;
					const r = dispatch(b, valueinputport.updaterate(), inb.control_dependencies);
					const locality = r.locality;
					const whereDec = r.whereDec;
					const whereAss = r.whereAss;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				});

				if (cdef.funcs.process1) {
					const f = cdef.funcs.process1;

					// Simplification: outputs might be declared in different places
					const ur = RATES.max.apply(null, b.i_ports.concat(b.o_ports).map(p => p.updaterate()));
					const r = dispatch(b, ur, b.control_dependencies);
					const locality = r.locality;
					const whereDec = r.whereDec;
					const whereAss = r.whereAss;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}
				else {
					throw new Error("process1 is required");
				}

				return;
			}

			// Standard expressions now

			let w0;
			let w1;
			let w2;
			if (b.i_ports.length == 1) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
			}
			if (b.i_ports.length == 2) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
				w1 = new funcs.ParWrapper(input_codes[1], input_blocks[1].parLevel, b.parLevel);
			}
			if (b.i_ports.length == 3) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
				w1 = new funcs.ParWrapper(input_codes[1], input_blocks[1].parLevel, b.parLevel);
				w2 = new funcs.ParWrapper(input_codes[2], input_blocks[2].parLevel, b.parLevel);
			}

			if (bs.LogicalAndBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' && ', w1);
			}
			else if (bs.LogicalOrBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' || ', w1);
			}
			else if (bs.LogicalNotBlock.isPrototypeOf(b)) {
				op0.code.add('!(', w0, ')');
			}
			else if (bs.BitwiseOrBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' | ', w1);
			}
			else if (bs.BitwiseXorBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' ^ ', w1);
			}
			else if (bs.BitwiseAndBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' & ', w1);
			}
			else if (bs.BitwiseNotBlock.isPrototypeOf(b)) {
				op0.code.add('~', w0);
			}
			else if (bs.EqualityBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' == ', w1);
			}
			else if (bs.InequalityBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' != ', w1);
			}
			else if (bs.LessBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' < ', w1);
			}
			else if (bs.GreaterBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' > ', w1);
			}
			else if (bs.LessEqualBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' <= ', w1);
			}
			else if (bs.GreaterEqualBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' >= ', w1);
			}
			else if (bs.ShiftLeftBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' << ', w1);
			}
			else if (bs.ShiftRightBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' >> ', w1);
			}
			else if (bs.SumBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' + ', w1);
			}
			else if (bs.SubtractionBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' - ', w1);
			}
			else if (bs.MulBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' * ', w1);
			}
			else if (bs.DivisionBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' / ', w1);
			}
			else if (bs.UminusBlock.isPrototypeOf(b)) {
				op0.code.add('-', w0);
			}
			else if (bs.ModuloBlock.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('mod(', w0, ', ', w1, ')');
				else
					op0.code.add(w0, ' % ', w1);
			}
			else if (bs.CastF32Block.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('single(', w0, ')');
				else
					op0.code.add('(float)', w0);
			}
			else if (bs.CastI32Block.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('int32(', w0, ')');
				else
					op0.code.add('(int)', w0);
			}
			else if (bs.CastBoolBlock.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('logical(', w0, ')');
				else
					op0.code.add('(char)', w0);
			}
			else if (bs.SelectBlock.isPrototypeOf(b)) {
				const ur = b.o_ports[0].updaterate();
				const r = dispatch(b, ur, b.control_dependencies);
				const locality = r.locality;
				const whereDec = r.whereDec;
				const whereAss = r.whereAss;
				const type = input_block_out_ports[1].datatype();
				let preferred = (typeof op0.preferred_id == "string" && op0.preferred_id.length > 0)
					? op0.preferred_id
					: undefined;
				if (!preferred) {
					const outs = bdef.connections.filter(c => c.in == op0).map(c => c.out.block);
					if (outs.length == 1 && bs.VarBlock.isPrototypeOf(outs[0])) {
						const vid = outs[0].id;
						if (typeof vid == "string" && !vid.startsWith("x__") && !vid.endsWith(".init") && !vid.endsWith(".fs"))
							preferred = vid;
					}
				}
				if (!preferred)
					preferred = 'x__';
				const id = program.identifiers.add(preferred);

				let lhs;
				if (locality == 0) {
					lhs = id;
					op0.code.add(lhs);
					whereDec.add(new funcs.Declaration(false, false, type, false, id, true));
				}
				else if (locality == 1) {
					lhs = funcs.getObjectPrefix() + id;
					op0.code.add(lhs);
					whereDec.add(new funcs.Declaration(false, false, type, false, id, true));
				}
				else {
					lhs = id;
					op0.code.add(lhs);
					if (t != "MATLAB")
						whereAss.add(new funcs.Declaration(false, false, type, false, id, true));
				}

				const ib = new funcs.IfElseBlock();
				ib.defined_id = id;
				ib.condition.add(w0);
				ib.then_body.add(new funcs.Assignment(lhs, w1, null));
				ib.else_body.add(new funcs.Assignment(lhs, w2, null));
				whereAss.add(ib);
			}
			
			else {
				const refId = b && b.ref ? b.ref.id : "N/A";
				const btype = b && b.type ? b.type : "N/A";
				throw new Error("Unexpected block type: " + b + " ref=" + refId + " type=" + btype);
			}
		};
	};

	exports["convert"] = convert;
}());
