#!/bin/node

(function() {

	console.log("--- IFTHENELSE TESTS --- START");

	const fs = require("fs");
	const path = require("path");
	const cp = require("child_process");
	const z = require("../src/zampogna");
	const util = require("../src/util");

	const outputDir = path.join(__dirname, "output");
	fs.mkdirSync(outputDir, { recursive: true });

	function hasOctave () {
		try {
			cp.execFileSync("octave", ["--version"], { stdio: "ignore" });
			return true;
		}
		catch (_e) {
			if (_e && _e.code == "EPERM")
				return true; // present but blocked from node child_process in sandbox
			return false;
		}
	}

	function isSandboxOctaveEperm (e) {
		return !!(e && e.code == "EPERM" && (e.path == "octave" || e.syscall == "spawnSync octave"));
	}

	const default_optimizations = {
		remove_dead_graph: true,
		negative_negative: true,
		negative_consts: true,
		unify_consts: true,
		remove_useless_vars: true,
		merge_equal_pure_blocks: true,
		merge_vars: true,
		merge_max_blocks: true,
		simplifly_max_blocks1: true,
		simplifly_max_blocks2: true,
		lazyfy_subexpressions_rates: true,
		lazyfy_subexpressions_controls: true,
	};

	const Tests = [
		{
			name: "counters example behavior (Octave/MATLAB)",
			code: `
				float y = delay (float x) {
					mem[1] float s
					y = s[0]
					s[0] = x
					s.init = x
				}

				A, T, F = counters(x) {
					A = delay(A) + 1.0
					T, F = if (x < 0.3) {
						ca = delay(ca) + 1.0
						ca.init = 0.0
						T = ca
						F = delay(F)
					} else {
						cb = delay(cb) + 1.0
						cb.init = 0.0
						T = delay(T)
						F = cb
					}
					A.init = 0.0
					T.init = 0.0
					F.init = 0.0
				}
			`,
			initial_block_id: "counters",
			matlabScript: [
				"x = [0.1 0.1 0.2 0.5 0.5 0.5 0.5 0.5 0.5 0.1 0.1 1 2];",
				"[A, T, F] = counters(x, 48000);",
				"EA = [1 2 3 4 5 6 7 8 9 10 11 12 13];",
				"ET = [1 2 3 0 0 0 0 0 0  4  5  0  0];",
				"EF = [0 0 0 1 2 3 4 5 6  0  0  7  8];",
				"assert(isequal(A, EA));",
				"assert(isequal(T, ET));",
				"assert(isequal(F, EF));"
			]
		}
	];

	function runOctaveCheck (generatedDir, matlabScriptLines) {
		const scriptPath = path.join(generatedDir, "run_check.m");
		const script = [
			"addpath('" + generatedDir.replace(/\\/g, "/") + "');"
		].concat(matlabScriptLines || []).join("\n") + "\n";
		fs.writeFileSync(scriptPath, script);
		cp.execFileSync("octave", [scriptPath], { stdio: "pipe" });
	}

	const results = [];
	const octaveAvailable = hasOctave();
	if (!octaveAvailable)
		console.log("Skipping Octave execution checks: octave not found");

	for (let i = 0; i < Tests.length; i++) {
		let ok = true;
		let err = "";
		try {
			const t = Tests[i];
			const code = t.code || fs.readFileSync(t.inputFile, "utf8");
			const searchpaths = [
				t.inputFile ? path.dirname(path.resolve(t.inputFile)) : __dirname,
				path.join(__dirname, "crm"),
				path.join(__dirname, "c"),
			];
			const filereader = util.get_filereader(searchpaths);
			const outdir = path.join(outputDir, "IF" + i);
			fs.mkdirSync(outdir, { recursive: true });

			const files = z.compile(code, filereader, {
				initial_block_id: t.initial_block_id,
				target_language: "MATLAB",
				optimizations: default_optimizations,
				debug_mode: true,
				debug_output_dir: path.join(outdir, "_debug"),
			});

			const matlabDir = path.join(outdir, "MATLAB");
			fs.mkdirSync(matlabDir, { recursive: true });
			files.forEach(f => {
				const outsub = path.join(matlabDir, f.path);
				fs.mkdirSync(outsub, { recursive: true });
				fs.writeFileSync(path.join(outsub, f.name), f.str);
			});

			if (octaveAvailable && t.matlabScript) {
				try {
					runOctaveCheck(matlabDir, t.matlabScript);
				}
				catch (e) {
					if (isSandboxOctaveEperm(e)) {
						console.log("Skipping Octave execution for test " + i + " (sandbox blocks spawning octave from node)");
					}
					else
						throw e;
				}
			}
		}
		catch (e) {
			ok = false;
			err = e;
		}
		results.push({ i, ok, err });
	}

	for (let r of results) {
		if (!r.ok) {
			console.log("IfThenElse test n. " + r.i + " failed: " + Tests[r.i].name);
			console.log("Error:");
			console.log(r.err);
		}
	}

	const passed = results.filter(r => r.ok).length;
	console.log("IfThenElse tests passed: " + passed + " / " + Tests.length);
	if (passed != Tests.length)
		process.exitCode = 1;

	console.log("--- IFTHENELSE TESTS --- END");

}());
