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

	const doT = require("dot");
	const fs = require("fs");
	const path = require("path");
	const templates = {
		//"matlab": 			String(fs.readFileSync(path.join(__dirname, "templates", "matlab_template.txt"))),
		"simple_c":			String(fs.readFileSync(path.join(__dirname, "templates", "simple_c.h"))),
		"bw":				String(fs.readFileSync(path.join(__dirname, "templates", "bw_module.h"))),
	};
	const bs = require("./blocks").BlockTypes;
	const ts = require("./types");
	const us = require("./uprates");
	
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
			float_f_postfix: true
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
		funcs["getArrayIndex"] = (i) => new LazyString(keys.array_indexer_l, i, keys.array_indexer_r);
		funcs["getFloat"] = keys.float_f_postfix
			? (n) =>  {
				n = n + "";
				return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f')
			}
			: (n) => n + "";
		funcs["getInt"] = (n) => n;
		funcs["getBool"] = (n) => n == "true" ? keys.type_true : keys.type_false;
		funcs["getConstant"] = (n, datatype) => {
			if (ts.DataTypeFloat32 == datatype)
				return funcs.getFloat(n);
			if (ts.DataTypeInt32 == datatype)
				return funcs.getInt(n);
			if (ts.DataTypeBool == datatype)
				return funcs.getBool(n);
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

		funcs.MemoryDeclaration = function (type, id, size) {
			this.s = new LazyString();
			this.s.add(funcs.getTypeDecl(type), ' * ', id);
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.Declaration = function (isStatic, isConst, type, id, lonely) {
			this.s = new LazyString();
			if (isStatic)
				this.s.add(funcs.getStaticKey(), ' ');
			if (isConst)
				this.s.add(funcs.getConstKey(), ' ');
			this.s.add(funcs.getTypeDecl(type), ' ');
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
		// mmm...
		funcs.CodeBlock = function (...init) {
			this.s = [];
			this.add = function (...x) {

			};
		};

		return funcs;
	};


	function convert (bdef, schedule, options) {
		
		const t = options.target_language;
		const funcs = get_funcs(t);

		const program = {

			name: "buh" + bdef.id,

			control_inputs: options.control_inputs,
			audio_inputs: bdef.i_ports.map(p => p.id).filter(i => !options.control_inputs.includes(i)),
			outputs: bdef.o_ports.map(p => p.id),

			memory_declarations: [],
			init: [],
			reset: [],

			constants: [],
			fs_update: [],
			control_coeffs_update: [],
			audio_update: [],

			delay_updates: [],
			output_updates: []
		};

		var extra_vars_n = 0;

		bdef.blocks.forEach(b => {
			b.i_ports.forEach(p => p.code = new LazyString());
			b.o_ports.forEach(p => p.code = new LazyString());
		});
		bdef.i_ports.forEach(p => p.code = new LazyString());
		bdef.o_ports.forEach(p => p.code = new LazyString());

		schedule.forEach(b => {
			convert_block(b);
		});


		doT.templateSettings.strip = false
	
		if (t == 'C') {
			return [
				{ name: bdef.id + ".h", str: doT.template(templates["simple_c"])(program) },
			];
		}
		/*
		if (t == 'MATLAB') {
			return [
				{ name: bdef.id + '.m', str: doT.template(templates["matlab"])(program) }
			]
		}
		*/

		function convert_block (b) {
			
			b.i_ports.map(p => bdef.connections.find(c => c.out == p)).forEach((c, i, v) => {
				if (!c) {
					const uu = bdef.connections.filter(c => c.out.block == b);
					throw new Error("djnabs " + b + " .. " + i + ", " + b.i_ports.join('-') + ",, " + v.join('-') + ",,, " + uu.length + uu.map(u => "l"+u.toString()).join('-'))
				}
			})

			const input_block_out_ports = b.i_ports.map(p => bdef.connections.find(c => c.out == p).in);
			const input_blocks = input_block_out_ports.map(p => p.block);
			const input_codes = input_block_out_ports.map(p => p.code);
			
			//const update_rate = b.i_ports.concat(b.o_ports).map(p => p.updaterate()).reduce((u, t) => t.level > u.level ? t : u, us.UpdateRateConstant);
			const op0 = b.o_ports[0];

			if (bs.VarBlock.isPrototypeOf(b)) {
				//if (outblocks.length <= 1) { // bypass // This should be done when optimizing the graph 
				//	b.o_ports[0].code.add(b.i_ports[0].code);
				//	return;
				//}
				const idcode = "PREFIXTODO" + b.id;
				op0.code.add(idcode);
				if (true) { // Declare and assign here
					const d = new funcs.Declaration(false, true, b.datatype(), idcode, false);
					const a = new funcs.Assignment(null, input_codes[0], d);
					
					//appendStatement(a, update_rate); // where?
					program.audio_update.push(a); //tmp
				}
				else {
					const d = new funcs.Declaration(false, false, b.datatype(), idcode, true);
					const a = new funcs.Assignment(idcode, input_codes[0], null);
					//appendStatement(d, null); // Where?
					//appendStatement(a, update_rate); // Where?
					program.audio_update.push(d, a); //tmp
				}
				return;
			}
			if (bs.MemoryBlock.isPrototypeOf(b)) {
				const d = new funcs.MemoryDeclaration(b.datatype(), b.id, input_codes[0]);
				// TODO: memreq, memset...
				//appendStatement(d, null); // Where?
				program.memory_declarations.push(d);
				return;
			}
			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				const c = op0.code;
				c.add(b.memoryblock.id); // prefix? Instance-> ?
				c.add(funcs.getArrayIndex(input_codes[0]));
				return;
			}
			if (bs.MemoryWriterBlock.isPrototypeOf(b)) {
				const c = new LazyString();
				c.add(b.memoryblock.id); // prefix? Instance-> ?
				c.add(funcs.getArrayIndex(input_codes[0]));
				const a = new funcs.Assignment(c, input_codes[1], null);
				//appendStatement(a, null); // Where?
				program.delay_updates.push(a);
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
					op0.code.add(input_codes[1], ', ');
				op0.code.add(')');
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
				throw new Error("Unexpected block type");
			}
		};
	};

	exports["convert"] = convert;
}());