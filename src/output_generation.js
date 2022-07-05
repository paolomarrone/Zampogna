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

	function convert(doT, templates, target_lang, graph, graph_init, schedule, schedule_init) {
		
		let program = {
			class_name: 	graph.id,
			control_inputs: graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block.label),
			audio_inputs: 	graph.input_ports.filter(p => p.update_rate == 3).map(p => p.block.label),
			outputs: 		[],

			declarations1: 	[],
			declarations2:  [],

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

		graph.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = new MagicString()))
		graph_init.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = new MagicString()))


		graph.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')
		graph.output_ports.forEach(op => op.block.operation = "VAR_OUT")
		graph_init.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')

		const id_prefix = target_lang == 'js' ? "this." : "";

		schedule.forEach(block => convertBlock(block))
		schedule_init.forEach(block => convertBlockInit(block))

		for (let outi = 0; outi < graph.output_ports.length; outi++) {
			program.outputs[outi] = graph.output_ports[outi].block.label + '__out__'
			appendAssignment(program.outputs[outi], graph.output_ports[outi].code, 5, null)
		}

		groupControls()

		program.declarations2 = program.declarations2.concat(
			graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block).map(function (block) {
				return { left: block.output_ports[0].code, right: block.block_init.output_ports[0].code }
			})
		)

		doT.templateSettings.strip = false
		if (target_lang == 'cpp') {
			return [
				{ name: "vst2_" + graph.id + ".h", str: doT.template(templates["vst2_main_h"])(program) },
				{ name: "vst2_" + graph.id + ".cpp", str: doT.template(templates["vst2_main_cpp"])(program) },
				{ name: "vst2_effect.h", str: doT.template(templates["vst2_effect_h"])(program) },
				{ name: "vst2_effect.cpp", str: doT.template(templates["vst2_effect_cpp"])(program) }
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

			const auxcode = new MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			switch (block.operation) {
				case 'VAR':
					if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label)
						appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 3) {
						if (target_lang == 'cpp' || target_lang == 'js' || target_lang == 'd' )
							code.add(block.label, "[i]")
						else if (target_lang == 'MATLAB')
							code.add(block.label, "(i)")
					}
					else if (update_rate == 2)
						code.add(id_prefix, block.label)
					return
				case 'VAR_OUT':
					code.add(id_prefix, block.label)
					appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally)
					return
				case 'DELAY1_EXPR':
					const id = '__delayed__' + extra_vars_n++
					code.add(id_prefix, id)
					appendAssignment(code, input_blocks_code[0], 4, block.control_dependencies, false, null)
					appendAssignment(code, input_blocks[0].block_init.output_ports[0].code, -1, null, true, false)
					return
				case 'NUMBER':
					if (target_lang == 'cpp' || target_lang == 'd')
						code.add(block.val + ((block.val.toString().includes('.') || block.val.toString().toLowerCase().includes('e')) ? 'f' : '.0f'));
					else if (target_lang == 'MATLAB' || target_lang == 'js')
						code.add(block.val)
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
					auxcode.add(block.id, '(', input_blocks_code.join(', '), ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '__extra__' + extra_vars_n++)
				appendAssignment(code, auxcode, update_rate, block.control_dependencies, true, is_used_locally)
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

			const auxcode = new MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			switch (block.operation) {
				case 'VAR':
					if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label)
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
					if (target_lang == 'cpp' || target_lang == 'd')
						code.add(block.val + ((block.val.toString().includes('.') || block.val.toString().toLowerCase().includes('e')) ? 'f' : '.0f'));
					else if (target_lang == 'MATLAB' || target_lang == 'js')
						code.add(block.val)
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
					auxcode.add(block.id, '(', input_blocks_code.join(', '), ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '__extraI__' + extra_vars_n++)
				appendAssignment(code, auxcode, level, block.control_dependencies, true, is_used_locally)
			}
			else
				code.add(auxcode)
		}

		function appendAssignment(left, right, level, control_dependencies, to_be_declared, is_used_locally) {
			let stmt = {left: left, right: right}

			if (to_be_declared && level != 0) {
				if (is_used_locally) 
					stmt.is_used_locally = true
				else
					program.declarations1.push(stmt)
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

		function groupControls() {
			var Group = function (set) {
				this.label = Array.from(set).join('_')
				this.set = set
				this.cardinality = set.size
				this.equals = (s) => checkSetEquality(this.set, s)
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

	function MagicString(...init) {
		this.s = []
		this.add = function(...x) {
			for (let k of x)
				this.s.push(k);
			return this
		}
		this.toString = function(){
			let str = ''
			for (let p of this.s)
				str += p.toString()
			return str
		}
		for (i of init)
			this.add(i)	
	}

	function checkSetsInclusion(A, B) { // if A is included in B
		return Array.from(A).every(Av => Array.from(B).some(Bv => Av == Bv))
	}
	function checkSetEquality(A, B) {
		return checkSetsInclusion(A, B) && checkSetsInclusion(B, A)
	}


	exports["convert"] = convert;

}())