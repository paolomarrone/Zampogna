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

	const prepro = require("../src/preprocessor");
	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");
	const graph  = require("../src/graph");
	const schdlr = require("../src/scheduler");
	const outgen = require("../src/outgen");
	const util   = require("../src/util");

	
	const options_descr = `
		
		debug_mode: true/false
		initial_block_id: unspaced string
		initial_block_inputs_n: number
		control_inputs: array of strings
		initial_values: array of { id: string, value: string } objects
		target_language: simpleC/bw
		optimizations: object of properties
			{
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			}

	`;

	function compile (code, filereader, options_ = {}) {

		const options = {
			debug_mode: false,
			initial_block_id: "",
			initial_block_inputs_n: -1, // Optional (and not checked) if there's a unique bdef with that id. All input types must be float32
			control_inputs: [], // List of ids. Inputs with such ids will carry UpdateRateControl
			initial_values: [],
			target_language: "",
			optimizations: {
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			},
		};

		for (let p in options_) {
			options[p] = options_[p];
		}

		try {
			
			const r = prepro.preprocess(code, filereader);
			code = r[0];
			const jsons = r[1];

			const AST = parser.parse(code);
			syntax.validateAST(AST);

			const g = graph.ASTToGraph(AST, options, jsons);
			graph.flatten(g, options);
			graph.optimize(g, options);

			const s = schdlr.schedule(g, options);

			const o = outgen.convert(g, s, options);

			return o;

		} catch (e) {
			console.error(e);
			return;
		}
	}

	exports.compile = compile;

}());