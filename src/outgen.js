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
		this.add = function (...x) {
			for (let k of x) {
				if (k == undefined)
					throw new Error(k);
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
		funcs["getMemoryArrayIndexer"] = (i) => target_language == "MATLAB"
			? new LazyString('(', i, ' + 1)')
			: funcs.getArrayIndexer(i);
		funcs["getFloat"] = keys.float_f_postfix
			? (n) =>  {
				n = Object.is(Number(n), -0) ? '-0' : n + "";
				return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f')
			}
			: (n) => Object.is(Number(n), -0) ? '-0.0' : n + "";
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
		// Parentheses preserve the expression tree; formatting never rewrites it.
		funcs.ParWrapper = function (s) {
			this.toString = () => '(' + s.toString() + ')';
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
			this.toString = function (tabLevel = 0) {
				const r = this.start.toString() +
					this.then_body.toString(1) +
					this.mid.toString() +
					this.else_body.toString(1) +
					this.end.toString();
				return prependTabs(r, tabLevel);
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
			parameter_states: new funcs.Statements(),
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
			control_coeffs_update: new funcs.Statements(),
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
			program.parameters_initialValues[id] = Object.prototype.hasOwnProperty.call(initial_values, p.id)
				? funcs.getFloat(initial_values[p.id])
				: funcs.getFloat(0.5);
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


		schedule.forEach(convert_block);

		bdef.o_ports.forEach(p => {
			const c = bdef.connections.find(c => c.out == p);
			program.output_updates.add(new funcs.Assignment(c.out.code, c.in.code, false));
		});


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

		throw new Error("Unrecognized target language: " + t);

		function dispatch (b, rate) {
			// Values needed by another phase live in the instance. Avoid guessing
			// their lifetime from consumers or regrouping the dependency schedule.
			const locality = rate == RATES.Audio ? 2 : rate == RATES.Constant ? 0 : 1;
			const whereAss = rate == RATES.Audio ? program.audio_update
				: rate == RATES.Control ? program.control_coeffs_update
				: rate == RATES.Reset ? program.reset
				: rate == RATES.Fs ? program.fs_update : program.init;
			const whereDec = locality == 2 ? program.audio_update
				: locality == 1 ? program.coefficients : program.constants;
			return { locality, whereDec, whereAss: guarded(whereAss, b) };
		}


		function guarded(destination, block) {
			if (!block.guard_ports.length)
				return destination;
			return { add(...statements) {
				let body = destination;
				for (const guard of block.guard_ports) {
					const branch = new funcs.IfBlock();
					const source = bdef.connections.find(c => c.out == guard).in;
					branch.condition.add(guard.negated ? (t == 'MATLAB' ? '~(' : '!(') : '(', source.code, ')');
					body.add(branch);
					body = branch.body;
				}
				body.add(...statements);
			} };
		}

		function value_name(block, type, rate, preferred) {
			const where = dispatch(block, rate);
			const id = program.identifiers.add(preferred || block.id || 'v');
			where.whereDec.add(new funcs.Declaration(false, false, type, false, id, true));
			return { name: where.locality == 1 ? funcs.getObjectPrefix() + id : id, where };
		}

		function emit_value(block, expression) {
			const port = block.o_ports[0];
			const rate = port.updaterate();
			if (rate == RATES.Constant) {
				port.code = expression;
				return;
			}
			const value = value_name(block, port.datatype(), rate);
			value.where.whereAss.add(new funcs.Assignment(value.name, expression, null));
			port.code = new LazyString(value.name);
		}

		function convert_block (b) {
			
			const input_block_out_ports = b.i_ports.map(p => bdef.connections.find(c => c.out == p).in);
			const input_blocks = input_block_out_ports.map(p => p.block);
			const input_codes = input_block_out_ports.map(p => p.code);
			
			const op0 = b.o_ports[0];

			if (bs.VarBlock.isPrototypeOf(b)) {
				emit_value(b, input_codes[0]);
				return;
			}
			if (bs.MemoryBlock.isPrototypeOf(b)) {
				if (!b.static_size)
					throw new Error("Memory size must be constant: " + b.id);
				const id = program.identifiers.add(b.id);
				const d = new funcs.MemoryDeclaration(b.datatype(), id, input_codes[0]);
				b.code.s = [funcs.getObjectPrefix(), id];

				program.memory_declarations.add(d);

				const i = new funcs.MemoryInit(b.code, input_codes[0], input_codes[1]);
				program.reset.add(i);

				return;
			}
			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				// Read once, before any writes. Users of this value cannot observe
				// state committed later in the sample.
				emit_value(b, new LazyString(b.memoryblock.code, funcs.getMemoryArrayIndexer(input_codes[0])));
				return;
			}
			if (bs.MemoryWriterBlock.isPrototypeOf(b)) {
				// Snapshot the destination index and next value before committing any
				// memory writes, including writes to another element of this memory.
				const index = value_name(b, TYPES.Int32, RATES.Audio, 'index');
				const next = value_name(b, b.memoryblock.datatype(), RATES.Audio, 'next');
				index.where.whereAss.add(new funcs.Assignment(index.name, input_codes[0], null));
				next.where.whereAss.add(new funcs.Assignment(next.name, input_codes[1], null));
				const destination = new LazyString(b.memoryblock.code, funcs.getMemoryArrayIndexer(index.name));
				guarded(program.memory_updates, b).add(new funcs.Assignment(destination, new LazyString(next.name), null));
				return;
			}
			if (bs.ConstantBlock.isPrototypeOf(b)) {
				op0.code.add(funcs.getConstant(b.value, b.datatype()));
				return;
			}
			if (bs.MaxBlock.isPrototypeOf(b)) {
				let expression = input_codes[0] || new LazyString('0');
				for (const input of input_codes.slice(1))
					expression = t == 'MATLAB'
						? new LazyString('max(', expression, ', ', input, ')')
						: new LazyString('(', expression, ' > ', input, ' ? ', expression, ' : ', input, ')');
				emit_value(b, expression);
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

				// Setup is unconditional. Runtime callbacks execute together, in the
				// scheduled position and on the same clock as the module's process call.
				function emit_call(f, declarations, statements, persistent) {
					if (!f) return;
					function output(index) {
						const port = b.o_ports[index];
						if (!port.code.toString()) {
							const id = program.identifiers.add('result');
							declarations.add(new funcs.Declaration(false, false, port.datatype(), false, id, true));
							port.code.add(persistent ? funcs.getObjectPrefix() + id : id);
						}
						return port.code;
					}
					const args = f.f_inputs.map(arg => {
						if (arg == 'state') return state;
						if (arg == 'coeffs') return coeffs;
						if (/^i[0-9]+$/.test(arg)) return input_codes[Number(arg.slice(1))];
						if (/^o[0-9]+$/.test(arg)) return new LazyString('&', output(Number(arg.slice(1))));
						throw new Error('Unknown C function argument: ' + arg);
					});
					const statement = new LazyString();
					if (f.f_outputs.length > 1)
						throw new Error('A C function can return only one value: ' + f.f_name);
					if (f.f_outputs.length)
						statement.add(output(Number(f.f_outputs[0].slice(1))), ' = ');
					statement.add(f.f_name, '(');
					args.forEach((arg, i) => statement.add(i ? ', ' : '', arg));
					statement.add(');');
					statements.add(statement);
				}

				emit_call(cdef.funcs.init, program.coefficients, program.init, true);
				emit_call(cdef.funcs.set_sample_rate, program.coefficients, program.fs_update, true);
				emit_call(cdef.funcs.reset_coeffs, program.coefficients, program.reset, true);
				emit_call(cdef.funcs.reset_state, program.coefficients, program.reset, true);

				if (cdef.funcs.mem_req)
					program.mem_reqs.push(cdef.funcs.mem_req.f_name + '(' + coeffs + ')');
				if (cdef.funcs.mem_set)
					program.mem_sets.push(cdef.funcs.mem_set.f_name + '(' + coeffs + ', ' + state + ', m)');

				if (!cdef.funcs.process1)
					throw new Error('process1 is required');
				const runtime = guarded(program.audio_update, b);
				for (const f of [...cdef.funcs.setters, cdef.funcs.update_coeffs_ctrl,
					cdef.funcs.update_coeffs_audio, cdef.funcs.process1])
					emit_call(f, program.audio_update, runtime, false);

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
				op0.code.add(t == 'MATLAB' ? '~(' : '!(', w0, ')');
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
				op0.code.add(w0, t == 'MATLAB' ? ' ~= ' : ' != ', w1);
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
				if (t == 'MATLAB' && op0.datatype() == TYPES.Int32)
					op0.code.add('int32(fix(double(', w0, ') / double(', w1, ')))');
				else
					op0.code.add(w0, ' / ', w1);
			}
			else if (bs.UminusBlock.isPrototypeOf(b)) {
				op0.code.add('-', w0);
			}
			else if (bs.ModuloBlock.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('rem(', w0, ', ', w1, ')');
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
					op0.code.add('int32(fix(', w0, '))');
				else
					op0.code.add('(int)', w0);
			}
			else if (bs.CastBoolBlock.isPrototypeOf(b)) {
				if (t == "MATLAB")
					op0.code.add('logical(', w0, ')');
				else
					op0.code.add('(', w0, ' != 0)');
			}
			else if (bs.SelectBlock.isPrototypeOf(b)) {
				if (t != 'MATLAB' && op0.updaterate() == RATES.Constant) {
					op0.code.add('(', w0, ' ? ', w1, ' : ', w2, ')');
					return;
				}
				const value = value_name(b, op0.datatype(), op0.updaterate());
				const branch = new funcs.IfElseBlock();
				branch.condition.add(input_codes[0]);
				branch.then_body.add(new funcs.Assignment(value.name, input_codes[1], null));
				branch.else_body.add(new funcs.Assignment(value.name, input_codes[2], null));
				value.where.whereAss.add(branch);
				op0.code = new LazyString(value.name);
				return;
			}

			else {
				const refId = b && b.ref ? b.ref.id : "N/A";
				const btype = b && b.type ? b.type : "N/A";
				throw new Error("Unexpected block type: " + b + " ref=" + refId + " type=" + btype);
			}
			emit_value(b, op0.code);
		};
	};

	exports["convert"] = convert;
}());
