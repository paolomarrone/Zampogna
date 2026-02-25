#!/bin/node

(function() {

	console.log("--- GRAPH OPT TESTS --- START");

	const path = require("path");
	const fs = require("fs");
	const z = require("../src/zampogna");
	const util = require("../src/util");
	const bs = require("../src/blocks").BlockTypes;
	const TYPES = require("../src/types");

	const filereader = util.get_filereader([
		path.join(__dirname, "crm"),
		path.join(__dirname, "c")
	]);

	const all_off = {
		remove_dead_graph: false,
		negative_negative: false,
		negative_consts: false,
		unify_consts: false,
		remove_useless_vars: false,
		merge_equal_pure_blocks: false,
		merge_vars: false,
		merge_max_blocks: false,
		simplifly_max_blocks1: false,
		simplifly_max_blocks2: false,
		lazyfy_subexpressions_rates: false,
		lazyfy_subexpressions_controls: false,
	};
	function onlyOpt(name) {
		const o = Object.assign({}, all_off);
		o[name] = true;
		return o;
	}
	function optsWithPrereq(name, prereqs = []) {
		const o = Object.assign({}, all_off);
		prereqs.forEach(p => o[p] = true);
		o[name] = true;
		return o;
	}

	const Tests = [
		{
			name: "remove_dead_graph removes unused branch",
			code: `
				y = asd (x) {
					u = x + 1.0
					t = x * 2.0
					y = t
				}
			`,
			optimizations: onlyOpt("remove_dead_graph"),
			check: (g) => !g.blocks.some(b => bs.VarBlock.isPrototypeOf(b) && b.id == "u")
		},
		{
			name: "negative_negative simplifies -(-x)",
			code: `
				y = asd (x) {
					y = -(-x)
				}
			`,
			optimizations: onlyOpt("negative_negative"),
			check: (g) => g.blocks.filter(b => bs.UminusBlock.isPrototypeOf(b)).length == 0
		},
		{
			name: "negative_consts folds unary minus constant",
			code: `
				y = asd () {
					y = -5.0
				}
			`,
			optimizations: onlyOpt("negative_consts"),
			check: (g) =>
				g.blocks.filter(b => bs.UminusBlock.isPrototypeOf(b)).length == 0 &&
				g.blocks.some(b => bs.ConstantBlock.isPrototypeOf(b) && b.datatype() == TYPES.Float32 && b.value == -5.0)
		},
		{
			name: "unify_consts merges equal constants",
			code: `
				y = asd (x) {
					a = x + 1.0
					y = a + 1.0
				}
			`,
			optimizations: onlyOpt("unify_consts"),
			check: (g) => g.blocks.filter(b => bs.ConstantBlock.isPrototypeOf(b) && b.datatype() == TYPES.Float32 && b.value == 1.0).length == 1
		},
		{
			name: "remove_useless_vars removes compiler temp pass-through var",
			code: `
				y = asd (x) {
					x__tmp = x
					y = x__tmp
				}
			`,
			optimizations: onlyOpt("remove_useless_vars"),
			check: (g) => !g.blocks.some(b => bs.VarBlock.isPrototypeOf(b) && b.id == "x__tmp")
		},
		{
			name: "merge_equal_pure_blocks merges duplicated arithmetic blocks",
			code: `
				y = asd (x, v) {
					a = x * v
					b = x * v
					y = a + b
				}
			`,
			optimizations: onlyOpt("merge_equal_pure_blocks"),
			check: (g) => g.blocks.filter(b => bs.MulBlock.isPrototypeOf(b)).length == 1
		},
		{
			name: "merge duplicate vars with same source",
			code: `
				y = asd (x) {
					a = x
					b = x
					y = a + b
				}
			`,
			optimizations: onlyOpt("merge_vars"),
			check: (g) => countVarsByIds(g, ["a", "b"]) == 1
		},
		{
			name: "merge_vars may merge property-owner vars (rewires property.of)",
			code: `
				y = asd (x) {
					a = x
					b = x
					a.init = 0.0
					y = a + b
				}
			`,
			optimizations: onlyOpt("merge_vars"),
			check: (g) => countVarsByIds(g, ["a", "b"]) == 1
		},
		{
			name: "merge_vars does not merge property carrier vars",
			code: `
				y = asd (x) {
					a = x
					b = x
					a.init = 0.0
					y = a.init + b.init
				}
			`,
			optimizations: onlyOpt("merge_vars"),
			check: (g) => {
				const propVars = g.blocks.filter(b =>
					bs.VarBlock.isPrototypeOf(b) &&
					g.properties.some(p => p.block == b)
				);
				return propVars.length >= 2;
			}
		},
		{
			name: "merge_max_blocks flattens nested max",
			code: `
				y = asd (x, v) {
					t = x * (v + 1.0)
					y = t
					fs_t = t.fs
				}
			`,
			optimizations: optsWithPrereq("merge_max_blocks", ["remove_useless_vars"]),
			check: (g) => {
				const ms = g.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));
				if (ms.length != 1)
					return false;
				const hasNestedMax = g.connections.some(c =>
					bs.MaxBlock.isPrototypeOf(c.out.block) &&
					bs.MaxBlock.isPrototypeOf(c.in.block)
				);
				return !hasNestedMax && ms[0].i_ports.length >= 2;
			}
		},
		{
			name: "simplifly_max_blocks1 removes zero input",
			code: `
				y = asd (x) {
					t = x + 1.0
					y = t
					fs_t = t.fs
				}
			`,
			optimizations: optsWithPrereq("simplifly_max_blocks1", ["remove_useless_vars"]),
			check: (g) => {
				const ms = g.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));
				if (ms.length == 0)
					return false;
				const hasZeroConstInput = g.connections.some(c =>
					bs.MaxBlock.isPrototypeOf(c.out.block) &&
					bs.ConstantBlock.isPrototypeOf(c.in.block) &&
					c.in.block.value == 0
				);
				return !hasZeroConstInput;
			}
		},
		{
			name: "simplifly_max_blocks2 bypasses single-input max",
			code: `
				y = asd (x) {
					t = x
					y = t
					fs_t = t.fs
				}
			`,
			optimizations: onlyOpt("simplifly_max_blocks2"),
			check: (g) => g.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b)).length == 0
		},
		{
			name: "lazyfy_subexpressions_rates inserts temp var for rate mismatch",
			code: `
				y = asd (x, v, w) {
					y = x * (v + w)
				}
			`,
			control_inputs: ["v", "w"],
			optimizations: onlyOpt("lazyfy_subexpressions_rates"),
			check: (g) => g.blocks.some(b => bs.VarBlock.isPrototypeOf(b) && (b.id || "").startsWith("x__"))
		},
		{
			name: "lazyfy_subexpressions_controls no-op placeholder does not crash",
			code: `
				y = asd (x, v) {
					t = x + v
					y = t
				}
			`,
			control_inputs: ["v"],
			optimizations: onlyOpt("lazyfy_subexpressions_controls"),
			check: (_g) => true
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
				control_inputs: Tests[i].control_inputs || [],
				optimizations: Tests[i].optimizations,
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
