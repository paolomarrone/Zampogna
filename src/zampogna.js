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

	const prepro = require("../src/preprocessor");
	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");
	const graph  = require("../src/graph");
	const schdlr = require("../src/scheduler");
	const outgen = require("../src/outgen");
	const dbg    = require("../src/debug");
	const path   = require("path");

	
	const steps = ["preprocess", "parse", "syntax", "ast_to_graph", "flatten", "optimize", "schedule", "outgen", "all"];

	const options_descr = `
		initial_block_id: unspaced string
		initial_block_inputs_n: number
		control_inputs: array of strings
		initial_values: array of { id: string, value: string } objects
		target_language: C/bw/MATLAB
		optimizations: object of properties
			{
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			}
		debug_mode: true/false
		debug_output_dir: optional path where debug artifacts are written
		debug_emit_outputs: true/false (write generated target files into debug artifacts)
		debug_return_intermediates: true/false (return AST/graph/schedule/files instead of files only)
		debug_last_step: ${steps.join('/')}
	`;

	function compile (code, filereader, options_ = {}) {

		const options = {
			debug_mode: false,
			initial_block_id: "",
			initial_block_inputs_n: -1, // Optional (and not checked) if there's a unique bdef with that id. All input types must be float32
			control_inputs: [], // List of ids. Inputs with such ids will carry UpdateRateControl
			initial_values: {},
			target_language: "",
			optimizations: {
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			},
			debug_output_dir: "",
			debug_emit_outputs: true,
			debug_return_intermediates: false,
			debug_last_step: "all",
		};

		for (let p in options_) {
			options[p] = options_[p];
		}
		if (!steps.includes(options.debug_last_step))
			throw new Error("Invalid debug_last_step: " + s);

		function shouldStop (step) {
			if (options.debug_last_step == "all")
				return false;
			return options.debug_last_step == step;
		}
		const ret = {
			stage: "start",
			files: [],
		};
		function maybeReturnAt(stage) {
			ret.stage = stage;
			if (options.debug_return_intermediates)
				return ret;
			return [];
		}


		const debug = dbg.createDebugReporter(options);
		debug.log("compile start");
		if (debug.outdir)
			debug.log("writing debug artifacts to: " + debug.outdir);

		/***** PREPROCESS *****/
		const r = prepro.preprocess(code, filereader);
		code = r[0];
		const jsons = r[1];
		ret.preprocessed_code = code;
		ret.jsons = jsons;
		debug.log("preprocess complete");
		debug.writeFile("00_preprocessed.crm", code);
		debug.writeJSON("00_includes.json", jsons);
		if (shouldStop("preprocess"))
			return maybeReturnAt("preprocess");

		/***** PARSE *****/
		const AST = parser.parse(code);
		ret.AST = AST;
		debug.log("parse complete");
		debug.writeJSON("01_ast.json", AST);
		if (shouldStop("parse"))
			return maybeReturnAt("parse");

		/***** SYNTAX VALIDATION *****/
		syntax.validateAST(AST);
		debug.log("syntax validation complete");
		if (shouldStop("syntax"))
			return maybeReturnAt("syntax");

		/***** AST -> GRAPH *****/
		const g = graph.ASTToGraph(AST, options, jsons);
		ret.graph = g;
		debug.log("graph build complete");
		debug.writeFile("02_graph_initial.dot", dbg.graphToGraphviz(g));
		if (shouldStop("ast_to_graph"))
			return maybeReturnAt("ast_to_graph");

		/***** GRAPH FLATTEN *****/
		graph.flatten(g, options);
		debug.log("graph flatten complete");
		debug.writeFile("03_graph_flattened.dot", dbg.graphToGraphviz(g));
		if (shouldStop("flatten"))
			return maybeReturnAt("flatten");

		/***** GRAPH OPTIMIZE *****/
		graph.optimize(g, options);
		debug.log("graph optimize complete");
		debug.writeFile("04_graph_optimized.dot", dbg.graphToGraphviz(g));
		if (shouldStop("optimize"))
			return maybeReturnAt("optimize");

		/***** SCHEDULE *****/
		const s = schdlr.schedule(g, options);
		ret.schedule = s;
		debug.log("schedule complete");
		debug.writeFile("05_schedule.txt",
			s.map((b, i) => {
				const id = b.id || b.operation || b.type || "block";
				const ref = b.ref && b.ref.id ? b.ref.id : "";
				const ur = b.o_ports && b.o_ports.length > 0
					? b.o_ports[0].updaterate().toString()
					: (b.i_ports && b.i_ports.length > 0 ? b.i_ports[0].updaterate().toString() : "N/A");
				return (i + "").padStart(4, "0") + " | " + id + (ref ? (" (" + ref + ")") : "") + " | " + ur;
			}).join("\n") + "\n");
		if (shouldStop("schedule"))
			return maybeReturnAt("schedule");

		/***** OUTGEN *****/
		const o = outgen.convert(g, s, options);
		ret.files = o;
		debug.log("outgen complete");
		debug.writeJSON("06_outputs_manifest.json", o.map(f => ({ path: f.path, name: f.name, bytes: f.str.length })));
		if (debug.emitOutputs) {
			o.forEach(f => {
				debug.writeFile(path.join("06_outputs", f.path, f.name), f.str);
			});
		}
		debug.log("compile done");

		if (options.debug_return_intermediates) {
			ret.stage = "outgen";
			return ret;
		}
		return o;
	}

	exports.compile = compile;

}());
