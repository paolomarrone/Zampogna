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

	const doT = require("dot");
	const fs = require("fs");
	const path = require("path");
	const templates = {
		//"matlab": 			String(fs.readFileSync(path.join(__dirname, "templates", "matlab_template.txt"))),
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
	const ts = require("./types");
	const us = require("./uprates");
	const ut = require("./util");

	
	function prependTabs (s, tabLevel) {
		let tabs = '';
		for (let i = 0; i < tabLevel; i++)
			tabs += '\t';
		return s.toString().trim().split('\n').map(x => tabs + x).join('\n');
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
		funcs["getFloat"] = keys.float_f_postfix
			? (n) =>  {
				n = n + "";
				return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f')
			}
			: (n) => n + "";
		funcs["getInt"] = (n) => n;
		funcs["getBool"] = (n) => n ? keys.type_true : keys.type_false;
		funcs["getConstant"] = (n, datatype) => {
			if (ts.DataTypeFloat32 == datatype)
				return funcs.getFloat(n);
			if (ts.DataTypeInt32 == datatype)
				return funcs.getInt(n);
			if (ts.DataTypeBool == datatype) {
				return funcs.getBool(n);
			}
			throw new Error("getConstant. Type error");
		};
		funcs["getObjectPrefix"] = () => keys.object_prefix;
		funcs["getConstKey"] = () => keys.const;
		funcs["getStaticKey"] = () => keys.static;
		funcs["getTypeDecl"] = (t) => {
			if (ts.DataTypeFloat32 == t)
				return keys.type_float;
			if (ts.DataTypeInt32 ==  t)
				return keys.type_int;
			if (ts.DataTypeBool == t)
				return keys.type_bool;
			throw new Error("getTypeDecl. Type error");
		};
		funcs["getReservedKeywords"] = () => keys.reserved_keywords;

		funcs.Identifiers = function () {
			this.ids = [];
			const nuostr = Array.from(funcs.getReservedKeywords());
			nuostr.push('i', 'instance', 'n_samples', 'sample_rate', 'firstRun', 'x', 'y');
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
			this.s = new LazyString();
			this.s.add(funcs.getTypeDecl(type), ' ', id, '[', size, '];');
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.MemoryInit = function (id, size, value) {
			this.s = new LazyString();
			this.s.add("for (int i = 0; i < ", size, "; i++) { \n");
			this.s.add('\t', id, keys.array_indexer_l, 'i', keys.array_indexer_r, ' = ', value, ';\n');
			this.s.add('}');

			this.toString = function () {
				return this.s.toString();
			}
		};
		funcs.Declaration = function (isStatic, isConst, type, isPointer, id, lonely) {
			this.s = new LazyString();
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
			this.s = new LazyString();
			this.add = function (...x) {
				this.s.add.apply(this.s, x);
				this.s.add('\n');
				return this;
			};
			this.toString = function (tabLevel = 0) {
				return prependTabs(this.s, tabLevel);
			};
		};
		funcs.IfBlock = function () {
			this.condition = new LazyString();
			this.start = new LazyString('if ( ', this.condition, ' ) { \n');
			this.body = new funcs.Statements();
			this.end = new LazyString('\n} \n');

			this.toString = function (tabLevel = 0) {
				const r = this.start.toString() + this.body.toString(1) + this.end.toString();
				return prependTabs(r, tabLevel);
			};
		};
		funcs.ControlCoeffsGroup = function (control_dependencies) {
			this.control_dependencies = control_dependencies;
			this.equals = (s) => Set.checkEquality(this.control_dependencies, s);
			
			this.s = new funcs.IfBlock();
			this.s.condition.add(Array.from(control_dependencies).map(x => funcs.getObjectPrefix() + x + '_CHANGED').join(' | '));

			this.add = function (...x) {
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
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateControl).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			program.parameters.push(id);
			p.code = code;
			program.parameters_initialValues[id] = options.initial_values[p.id]
				? funcs.getFloat(options.initial_values[p.id])
				: funcs.getFloat(0.5);
		});
		program.parameters.forEach(p => {
			const id = program.identifiers.add(p + '_z1');
			const d = new funcs.Declaration(false, false, ts.DataTypeFloat32, false, id, true);
			program.parameter_states.add(d);
		});
		program.parameters.forEach(p => {
			const id = program.identifiers.add(p + '_CHANGED');
			const d = new funcs.Declaration(false, false, ts.DataTypeBool, false, id, true);
			program.parameter_states.add(d);
		});	
		program.parameters.forEach(p => {
			program.identifiers.add('p_' + p);
		});
		program.parameters.forEach(p => {
			const id = p;
			const d = new funcs.Declaration(false, false, ts.DataTypeFloat32, false, id, true);
			program.parameter_states.add(d);
		});
		program.name = program.identifiers.add(bdef.id);
		program.identifiers.add('_' + bdef.id);
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateAudio).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_inputs.push(id);
			p.code = code;
		});
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateFs).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			p.code = code;
		});
		bdef.o_ports.forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_outputs.push(id);
			p.code = code;
		});
		

		schedule.forEach(b => {
			convert_block(b);
		});

		bdef.o_ports.forEach(p => {
			const c = bdef.connections.find(c => c.out == p);
			program.output_updates.add(new funcs.Assignment(c.out.code, c.in.code, false));
		});


		doT.templateSettings.strip = false
	
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

		throw new Error("Not recognized target language");

		function dispatch (b, ur, control_dependencies) {
			const outblocks = bdef.connections.filter(c => c.in.block == b).map(c => c.out.block);
			
			var locality = undefined; // 0 = constant, 1 = object, 2 = local
			var whereDec = undefined;
			var whereAss = undefined;

			const outblockurs = outblocks.map(bb => us.max.apply(null, bb.i_ports.concat(bb.o_ports)));
			const maxour = us.max.apply(null, outblockurs);

			locality = maxour.level <= ur.level ? 2 : 1;

			if (ur == us.UpdateRateConstant) {
				locality = 0;
				whereDec = program.constants;
				whereAss = program.init;
			}
			if (ur == us.UpdateRateFs) {
				if (locality == 2)
					whereDec = program.fs_update;
				else
					whereDec = program.coefficients;
				whereAss = program.fs_update;
			}
			if (ur == us.UpdateRateControl) {
				const g = program.control_coeffs_update.getOrAddGroup(control_dependencies);
				if (locality == 2) {
					locality = outblocks.every(bb => Set.checkEquality(control_dependencies, bb.control_dependencies)) ? 2 : 1;
				}
				if (locality == 2) {
					whereDec = g;
				}
				else {
					whereDec = program.coefficients;
				}
				whereAss = g;
			}
			if (ur == us.UpdateRateAudio) {
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


		function convert_block (b) {
			
			const input_block_out_ports = b.i_ports.map(p => bdef.connections.find(c => c.out == p).in);
			const input_blocks = input_block_out_ports.map(p => p.block);
			const input_codes = input_block_out_ports.map(p => p.code);
			
			const op0 = b.o_ports[0];

			if (bs.VarBlock.isPrototypeOf(b)) {
				
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
					whereDec.add(d);
					whereAss.add(a);
				}
				else if (locality == 1) {
					const refid = funcs.getObjectPrefix() + id;
					op0.code.add(refid);
					const d = new funcs.Declaration(false, false, b.datatype(), false, id, true);
					const a = new funcs.Assignment(refid, input_codes[0], null);
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
				const id = program.identifiers.add(b.id);
				const d = new funcs.MemoryDeclaration(b.datatype(), id, input_codes[0]);
				b.code.add(funcs.getObjectPrefix(), id);

				program.memory_declarations.add(d);

				const i = new funcs.MemoryInit(b.code, input_codes[0], input_codes[1]);
				program.init.add(i);
				program.reset.add(i);

				return;
			}
			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				const c = op0.code;
				c.add(b.memoryblock.code);
				c.add(funcs.getArrayIndexer(input_codes[0]));
				return;
			}
			if (bs.MemoryWriterBlock.isPrototypeOf(b)) {
				const c = new LazyString();
				c.add(b.memoryblock.code);
				c.add(funcs.getArrayIndexer(input_codes[0]));
				const a = new funcs.Assignment(c, input_codes[1], null);
				program.memory_updates.add(a); // TODO: Might not be always the case
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
					op0.code.add( ', ', input_codes[1]);
				op0.code.add(')');
				return;
			}
			if (bs.CallBlock.isPrototypeOf(b) && b.type == "cdef") {
				const cdef = b.ref;

				// Include
				program.includes.add(cdef.header);

				var state, coeffs;

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
							const id = program.identifiers.add('_x_');
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
							const id = program.identifiers.add('_x_');
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
					const ur = us.max.apply(null, i_ports.map(p => p.updaterate()));

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = ur == us.UpdateRateAudio ? program.update_coeffs_audio : program.update_coeffs_ctrl;

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
					const ur = us.max.apply(null, b.i_ports.concat(b.o_ports).map(p => p.updaterate()));
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

			// Regular expressions now

			var w0, w1;
			if (b.i_ports.length == 1) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
			}
			if (b.i_ports.length == 2) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
				w1 = new funcs.ParWrapper(input_codes[1], input_blocks[1].parLevel, b.parLevel);
			}

			if (bs.LogicalAndBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' && ', w1);
			}
			else if (bs.LogicalOrBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' || ', w1);
			}
			else if (bs.LogicalNotBlock.isPrototypeOf(b)) {
				op0.code.add('!', w0);
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
				op0.code.add(w0, ' % ', w1);
			}
			else if (bs.CastF32Block.isPrototypeOf(b)) {
				op0.code.add('(float)', w0);
			}
			else if (bs.CastI32Block.isPrototypeOf(b)) {
				op0.code.add('(int)', w0);
			}
			else if (bs.CastBoolBlock.isPrototypeOf(b)) {
				op0.code.add('(char)', w0);
			}
			
			else {
				throw new Error("Unexpected block type: " + b + b.ref.id + b.type);
			}
		};
	};

	exports["convert"] = convert;
}());