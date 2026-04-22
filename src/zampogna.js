/*
	Copyright (C) 2021-2026 Orastron Srl

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
	'use strict'

	function createDefaultEnv() {
		return {
			"parser": 			require("./grammar"),
			"extended_syntax": 	require("./extended_syntax"),
			"graph": 			require("./graph"),
			"scheduler": 		require("./scheduler"),
			"output_generation":require("./output_generation"),
			"doT": 				require("dot"),
			"templates":{
				"matlab": 			require("./templates/matlab_template"),
				"C_h": 				require("./templates/C_h_template"),
				"C_c": 				require("./templates/C_c_template"),
				"cpp_h": 			require("./templates/cpp_h_template"),
				"cpp_cpp": 			require("./templates/cpp_cpp_template"),
				"vst2_wrapper_h": 	require("./templates/vst2_wrapper_h_template"),
				"vst2_wrapper_cpp": require("./templates/vst2_wrapper_cpp_template"),
				"yaaaeapa_wrapper_c": require("./templates/yaaaeapa_wrapper_c_template"),
				"js_html": 			require("./templates/js_html_template"),
				"js_processor": 	require("./templates/js_processor_template"),
				"d_processor":		require("./templates/d_processor_template")
			}
		}
	}

	function compile(env, debug, code, initial_block, control_inputs, initial_values, target_lang) {
		if (!env)
			env = createDefaultEnv()

		const tree = env["parser"].parse(code);
		if (debug) console.log(tree)
		
		const scopes = env["extended_syntax"].validate(tree)
		if (debug) console.log(scopes.join("").toString())

		const graphes = env["graph"].ASTToGraph(tree, initial_block, control_inputs, initial_values)
		if (debug) console.log("G1__: ", graphes[0])
		if (debug) console.log("G2__: ", graphes[1])

		const scheduled_blocks = env["scheduler"].schedule(graphes[0])
		const scheduled_blocks_init = env["scheduler"].scheduleInit(graphes[1])
		if (debug) console.log(scheduled_blocks.map(b => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")))
		if (debug) console.log(scheduled_blocks_init.map(b => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")))

		const files = env["output_generation"].convert(env["doT"], env["templates"], target_lang, graphes[0], graphes[1], scheduled_blocks, scheduled_blocks_init)
		return files
	}

	exports["compile"] = compile

}());
