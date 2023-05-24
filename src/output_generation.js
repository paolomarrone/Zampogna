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
	function getIndexer (target_lang, index) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd', 'js'].includes(target_lang))
			return "[" + index + "]"
		else if (target_lang == 'MATLAB')
			return "(" + index + ")"
	}

	function getNumber(target_lang, n) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd'].includes(target_lang))
			return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f');
		else if (['MATLAB', 'js'].includes(target_lang))
			return n;
		return n;
	}

	function getIdPrefix(target_lang) {
		if (['C', 'yaaaeapa'].includes(target_lang))
			return "instance->"
		else if (['js'].includes(target_lang))
			return "this."
		else
			return ""
	}
	function getConstType(target_lang) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd'].includes(target_lang))
			return "const float "
		else if (['js'].includes(target_lang))
			return "const "
		else
			return ""
	}

	function convert(doT, templates, target_lang, graph, graph_init, schedule, schedule_init) {
		
		let program = {
			class_name: 	graph.id,
			control_inputs: graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block.label()),
			audio_inputs: 	graph.input_ports.filter(p => p.update_rate == 3).map(p => p.block.label()),
			outputs: 		[],

			declarations1: 	[],
			declarations2:  [],

			init: 			[],

			reset1: 		[],
			reset2: 		[],

			constant_rate: 	[],
			sampling_rate: 	[],
			controls_rate: 	[],
			audio_rate: 	[],

			delay_updates: 	[],
			output_updates: []
		}

		let extra_vars_n = 0
	
		graph.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = MagicString()))
		graph_init.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = MagicString()))


		graph.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')
		graph.output_ports.forEach(op => op.block.operation = "VAR_OUT")
		graph_init.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')

		const id_prefix_ = getIdPrefix(target_lang);

		schedule.forEach(block => convertBlock(block))
		schedule_init.forEach(block => convertBlockInit(block))

		for (let outi = 0; outi < graph.output_ports.length; outi++) {
			program.outputs[outi] = graph.output_ports[outi].block.label() + '_out_';
			appendAssignment(program.outputs[outi] + getIndexer(target_lang, 'i'), graph.output_ports[outi].code, 5, null)
		}

		groupControls()

		graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block).forEach(function (block) {
			program.declarations2.push(MagicString(block.output_ports[0].code));
			program.init.push(MagicString(block.output_ports[0].code, " = ", getNumber(target_lang, block.block_init.output_ports[0].code.toString())));
		})

		const ct = getConstType(target_lang)
		const oldToString = MagicStringProto.toString
		MagicStringProto.toString = function () {
			return (this.is_used_locally ? ct : "") + oldToString.apply(this);
		}

		doT.templateSettings.strip = false

		if (target_lang == 'C') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
				{ name: graph.id + ".c", str: doT.template(templates["C_c"])(program) },
			]
		}
		else if (target_lang == 'cpp') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
				{ name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) }
			]
		}
		else if (target_lang == 'VST2') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
				{ name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) },
				{ name: graph.id + "_vst2_wrapper.h", str: doT.template(templates["vst2_wrapper_h"])(program) },
				{ name: graph.id + "_vst2_wrapper.cpp", str: doT.template(templates["vst2_wrapper_cpp"])(program) }
			]
		}
		else if (target_lang == 'yaaaeapa') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
				{ name: graph.id + ".c", str: doT.template(templates["C_c"])(program) },
				{ name: graph.id + "_yaaaeapa_wrapper.c", str: doT.template(templates["yaaaeapa_wrapper_c"])(program) }
			]
		}
		else if (target_lang == 'MATLAB') {
			return [
				{ name: graph.id + '.m', str: doT.template(templates["matlab"])(program) }
			]
		}
		else if (target_lang == "js") {
			return [
				{ name: "main.html", str: doT.template(templates["js_html"])(program) },
				{ name: "processor.js", str: doT.template(templates["js_processor"])(program) }
			]
		}
		else if (target_lang == "d") {
			return [
				{ name: "d_processor.d", str: doT.template(templates["d_processor"])(program) }
			]
		}

		function convertBlock(block) {
			const input_blocks = graph.getInputBlocks(block)
			const output_blocks = graph.getOutputBlocks(block)

			const input_blocks_code = input_blocks.map(b => b.output_ports[0].code)
			const update_rate = block.output_ports[0].update_rate
			const code = block.output_ports[0].code

			const auxcode = MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))
			if (is_used_locally && block.if_owners.length > 0) {
				let bb = block.if_owners[block.if_owners.length - 1]
				is_used_locally = output_blocks.every(b => b.if_owners.some(i => i.ifblock == bb.ifblock && i.branch == bb.branch))
				if (output_blocks.some(b => b.operation == "DELAY1_EXPR"))
					is_used_locally = false;
			}
			const id_prefix = is_used_locally || update_rate == 0 ? "" : id_prefix_;

			if (block.ifoutputindex != undefined && !isNaN(block.ifoutputindex)) {
				code.add(id_prefix_, block.label())
				appendAssignment(code, "",  666, null, true, false, null)
				return
			}

			switch (block.operation) {
				case 'VAR':
					if (input_blocks[0].operation == 'NUMBER')
						code.add(input_blocks_code[0])
					else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label())
						appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 3) {
						code.add(block.label(), getIndexer(target_lang, 'i'))
					}
					else if (update_rate == 2)
						code.add(id_prefix_, block.label())
					return
				case 'VAR_OUT':
					code.add(id_prefix, block.label())
					appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
					return
				case 'DELAY1_EXPR':
					const id = '_delayed_' + extra_vars_n++
					code.add(id_prefix_, id)
					appendAssignment(code, input_blocks_code[0], 4, block.control_dependencies, false, false, block.if_owners)
					appendAssignment(code, input_blocks[0].block_init.output_ports[0].code, -1, null, true, false, block.if_owners)
					return
				case 'NUMBER':
					code.add(getNumber(target_lang, block.val.toString()));
					return
				case 'SAMPLERATE':
					code.add(id_prefix_, 'fs')
					return
				case 'IF_THEN_ELSE':
					if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd', 'js'].includes(target_lang)) {
						code.add("if (", input_blocks_code[0], ') {\n')
						code.add('_branch0_') // 3
						code.add("\n} else {\n")
						code.add('_branch1_') // 5
						code.add("\n}\n")
					}
					else if (target_lang == 'MATLAB') {
						code.add("if (", input_blocks_code[0], ')\n')
						code.add('_branch0_') // 3
						code.add("\nelse\n")
						code.add('_branch1_') // 5
						code.add("\nendif\n")
					}
					appendIfStatement(block, code, input_blocks[0].output_ports[0].update_rate, block.if_owners, output_blocks, input_blocks, block.control_dependencies)
					return
				case 'UMINUS_EXPR':
					auxcode.add('-(', input_blocks_code[0], ')')
					break
				case 'PLUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' + ', input_blocks_code[1], ')')
					break
				case 'MINUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' - ', input_blocks_code[1], ')')
					break
				case 'TIMES_EXPR':
					auxcode.add('(', input_blocks_code[0], ' * ', input_blocks_code[1], ')')
					break
				case 'DIV_EXPR':
					auxcode.add('(', input_blocks_code[0], ' / ', input_blocks_code[1], ')')
					break
				case 'EXTERNAL_FUNC_CALL':
					auxcode.add(block.id, '(')
					for (let ii = 0; ii < input_blocks_code.length; ii++) {
						auxcode.add(input_blocks_code[ii])
						if (ii != input_blocks_code.length - 1)
							auxcode.add(', ')
					}
					auxcode.add(')')
					break
				case 'OR_EXPR':
					auxcode.add('(', input_blocks_code[0], ' || ', input_blocks_code[1], ')')
					break
				case 'AND_EXPR':
					auxcode.add('(', input_blocks_code[0], ' && ', input_blocks_code[1], ')')
					break
				case 'EQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' == ', input_blocks_code[1], ')')
					break
				case 'NOTEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' != ', input_blocks_code[1], ')')
					break
				case 'LESS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' < ', input_blocks_code[1], ')')
					break
				case 'LESSEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' <= ', input_blocks_code[1], ')')
					break
				case 'GREATER_EXPR':
					auxcode.add('(', input_blocks_code[0], ' > ', input_blocks_code[1], ')')
					break
				case 'GREATEREQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' >= ', input_blocks_code[1], ')')
					break
				case 'NOT_EXPR':
					auxcode.add('!(', input_blocks_code[0], ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
				code.add(id_prefix, program.class_name + '_extra_' + extra_vars_n++)
				appendAssignment(code, auxcode, update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
			}
			else
				code.add(auxcode)
		}

		function convertBlockInit(block) {
			const input_blocks = graph_init.getInputBlocks(block)
			const output_blocks = graph_init.getOutputBlocks(block)
			const input_blocks_code = input_blocks.map(b => b.output_ports[0].code)
			const update_rate = block.output_ports[0].update_rate
			const level = update_rate == 2 ? -2 : update_rate
			const code = block.output_ports[0].code

			const auxcode = MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			const id_prefix = is_used_locally ? "" : id_prefix_;

			switch (block.operation) {
				case 'VAR':
					if (input_blocks[0].operation == 'NUMBER')
						code.add(input_blocks_code[0])
					else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label())
						appendAssignment(code, input_blocks_code[0], level, block.control_dependencies, true, is_used_locally)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 0)
						code.add(block.val) // This surely is a number
					else
						throw new Error("Unexpected update_rate in init graph " + block + ": " + update_rate)
					return
				case 'DELAY1_EXPR':
					code.add(input_blocks_code[0])
					return
				case 'NUMBER':
					code.add(getNumber(target_lang, block.val.toString()));
					return
				case 'SAMPLERATE':
					code.add(id_prefix, 'fs')
					return
				case 'UMINUS_EXPR':
					auxcode.add('-(', input_blocks_code[0], ')')
					break
				case 'PLUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' + ', input_blocks_code[1], ')')
					break
				case 'MINUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' - ', input_blocks_code[1], ')')
					break
				case 'TIMES_EXPR':
					auxcode.add('(', input_blocks_code[0], ' * ', input_blocks_code[1], ')')
					break
				case 'DIV_EXPR':
					auxcode.add('(', input_blocks_code[0], ' / ', input_blocks_code[1], ')')
					break
				case 'EXTERNAL_FUNC_CALL':
					auxcode.add(block.id, '(')
					for (let ii = 0; ii < input_blocks_code.length; ii++) {
						auxcode.add(input_blocks_code[ii])
						if (ii != input_blocks_code.length - 1)
							auxcode.add(', ')
					}
					auxcode.add(')')
					break;
				case 'OR_EXPR':
					auxcode.add('(', input_blocks_code[0], ' || ', input_blocks_code[1], ')')
					break
				case 'AND_EXPR':
					auxcode.add('(', input_blocks_code[0], ' && ', input_blocks_code[1], ')')
					break
				case 'EQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' == ', input_blocks_code[1], ')')
					break
				case 'NOTEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' != ', input_blocks_code[1], ')')
					break
				case 'LESS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' < ', input_blocks_code[1], ')')
					break
				case 'LESSEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' <= ', input_blocks_code[1], ')')
					break
				case 'GREATER_EXPR':
					auxcode.add('(', input_blocks_code[0], ' > ', input_blocks_code[1], ')')
					break
				case 'GREATEREQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' >= ', input_blocks_code[1], ')')
					break
				case 'NOT_EXPR':
					auxcode.add('!(', input_blocks_code[0], ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '_extraI_' + extra_vars_n++)
				appendAssignment(code, auxcode, level, block.control_dependencies, true, is_used_locally)
			}
			else
				code.add(auxcode)
		}

		function appendAssignment(left, right, level, control_dependencies, to_be_declared, is_used_locally, if_owners) {
			let stmt = MagicString(left, ' = ', right)
			stmt.if_owners = if_owners

			if (is_used_locally) {
				stmt.is_used_locally = true
			}
			else {
				if (to_be_declared && level != 0) {
					program.declarations1.push(left)
					program.init.push(MagicString(left, ' = ', getNumber(target_lang, "0")))
				}
			}

			switch (level) {
				case -2:
					program.reset1.push(stmt)
					break
				case -1:
					program.reset2.push(stmt)
					break
				case 0:
					program.constant_rate.push(stmt)
					break
				case 1:
					program.sampling_rate.push(stmt)
					break
				case 2:
					stmt.control_dependencies = control_dependencies
					program.controls_rate.push(stmt)
					break
				case 3:
					program.audio_rate.push(stmt)
					break
				case 4:
					program.delay_updates.push(stmt)
					break
				case 5:
					program.output_updates.push(stmt)
					break
			}
		}

		function appendIfStatement(block, code, cond_level, if_owners, output_blocks, input_blocks, control_dependencies) {

			if (block.output_ports.length != output_blocks.length)
				throw new Error("Something is wrong")

			const levels = ["constant_rate", "sampling_rate", "controls_rate", "audio_rate"]

			for (let lvl = cond_level; lvl < levels.length; lvl++) {
				let out_i = []
				for (let i = 0; i < block.output_ports.length; i++) {
					let ur = block.output_ports[i].update_rate
					if (ur == lvl || (lvl == cond_level && ur <= lvl)) {
						out_i.push(i)
					}
				}
				if (out_i.length == 0)
					continue

				let stmts = program[levels[lvl]].filter(s => s.if_owners[s.if_owners.length - 1] && s.if_owners[s.if_owners.length - 1].ifblock == block)
				let b0 = stmts.filter(s => s.if_owners[s.if_owners.length - 1].branch == 0)
				let b1 = stmts.filter(s => s.if_owners[s.if_owners.length - 1].branch == 1)

				for (let i of out_i) {
					b0.push(MagicString(
						output_blocks[i].output_ports[0].code, 
						' = ', 
						input_blocks[i + 1].output_ports[0].code,
					))

					b1.push(MagicString(
						output_blocks[i].output_ports[0].code,
						' = ',
						input_blocks[i + 1 + block.output_ports.length].output_ports[0].code
					))
				}

				b0.forEach(s => s.add(';\n'))
				b1.forEach(s => s.add(';\n'))

				let newcode = MagicString(...code.s)

				newcode.s.splice(newcode.s.indexOf('_branch0_'), 1, ...b0)
				newcode.s.splice(newcode.s.indexOf('_branch1_'), 1, ...b1)

				newcode.control_dependencies = control_dependencies
				newcode.if_owners = if_owners
				
				program[levels[lvl]] = program[levels[lvl]].filter(s => !stmts.includes(s))
				program[levels[lvl]].push(newcode)
			}
		}

		function groupControls() {
			var Group = function (set) {
				let self = this
				this.label = Array.from(set).join('_')
				this.set = set
				this.cardinality = set.size
				this.equals = (s) => checkSetEquality(self.set, s)
				this.stmts = []
			}
			let groups = []
			program.controls_rate.forEach(function (stmt) {
				let group = groups.find(g => g.equals(stmt.control_dependencies))
				if (group == undefined) {
					group = new Group(stmt.control_dependencies)
					groups.push(group)
				}
				group.stmts.push(stmt)
			})

			groups.sort((A, B) => A.cardinality < B.cardinality ? -1 : A.cardinality == B.cardinality ? 0 : 1 )

			program.controls_rate = groups
		}
	}

	var MagicStringProto = {
		s: null,
		add: function(...x) {
			for (let k of x) {
				if (k == undefined) {
					throw new Error(k)
				}
				this.s.push(k)
			}
			return this
		},
		toString: function(){
			let str = ""
			for (let p of this.s)
				str += p.toString()
			return str
		}
	}
	function MagicString(...init) {
		var m = Object.create(MagicStringProto);
		m.s = []
		for (let i of init)
			m.add(i)	
		return m;
	}

	function checkSetsInclusion(A, B) { // if A is included in B
		return Array.from(A).every(Av => Array.from(B).some(Bv => Av == Bv))
	}
	function checkSetEquality(A, B) {
		return checkSetsInclusion(A, B) && checkSetsInclusion(B, A)
	}


	exports["convert"] = convert;
}())