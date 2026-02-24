#!/bin/node

(function() {

	console.log("--- GRAPH OPT TESTS --- START");

	const path = require("path");
	const fs = require("fs");
	const z = require("../src/zampogna");
	const util = require("../src/util");
	const bs = require("../src/blocks").BlockTypes;

	const filereader = util.get_filereader([
		path.join(__dirname, "crm"),
		path.join(__dirname, "c")
	]);

	const only_merge_vars = {
		remove_dead_graph: false,
		negative_negative: false,
		negative_consts: false,
		unify_consts: false,
		remove_useless_vars: false,
		merge_vars: true,
		merge_max_blocks: false,
		simplifly_max_blocks1: false,
		simplifly_max_blocks2: false,
		lazyfy_subexpressions_rates: false,
		lazyfy_subexpressions_controls: false,
	};

	const Tests = [
		{
			name: "merge duplicate vars with same source",
			code: `
				y = asd (x) {
					a = x
					b = x
					y = a + b
				}
			`,
			check: (g) => countVarsByIds(g, ["a", "b"]) == 1
		},
		{
			name: "do not merge vars used by properties",
			code: `
				y = asd (x) {
					a = x
					b = x
					a.init = 0.0
					y = a + b
				}
			`,
			check: (g) => countVarsByIds(g, ["a", "b"]) == 2
		}
	];

	const outputDir = './output';
	if (!fs.existsSync(outputDir))
		fs.mkdirSync(outputDir);

	function countVarsByIds (g, ids) {
		return g.blocks.filter(b => bs.VarBlock.isPrototypeOf(b) && ids.includes(b.id)).length;
	}

	const Results = [];

	for (let i = 0; i < Tests.length; i++) {
		let ok = true;
		let err = "";
		try {
			const r = z.compile(Tests[i].code, filereader, {
				initial_block_id: "asd",
				control_inputs: [],
				optimizations: only_merge_vars,
				debug_mode: true,
				debug_output_dir: path.join(outputDir, "GO" + i + "_debug"),
				debug_last_step: "optimize",
				debug_return_intermediates: true,
			});
			if (!r || !r.graph)
				throw new Error("Missing graph in compile return");
			if (!Tests[i].check(r.graph))
				throw new Error("Assertion failed");
		}
		catch (e) {
			ok = false;
			err = e;
		}
		Results.push({ i, ok, err });
	}

	for (let r of Results) {
		if (!r.ok) {
			console.log("Graph opt test n. " + r.i + " failed: " + Tests[r.i].name);
			console.log("Code:\n" + Tests[r.i].code);
			console.log("Error:");
			console.log(r.err);
		}
	}

	const passed = Results.filter(r => r.ok).length;
	console.log("Graph opt tests passed: " + passed + " / " + Tests.length);
	if (passed != Tests.length)
		process.exitCode = 1;

	console.log("--- GRAPH OPT TESTS --- END");

}());
