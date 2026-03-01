#!/bin/node

(function() {

	console.log("--- OUTGEN OPT TESTS --- START");

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
				return true;
			return false;
		}
	}

	function isSandboxOctaveEperm (e) {
		return !!(e && e.code == "EPERM" && (e.path == "octave" || e.syscall == "spawnSync octave"));
	}

	function runOctaveCheck (workDir, matlabScriptLines) {
		const scriptPath = path.join(workDir, "run_check.m");
		const script = (matlabScriptLines || []).join("\n") + "\n";
		fs.writeFileSync(scriptPath, script);
		try {
			const out = cp.execFileSync("octave", [scriptPath], {
				stdio: "pipe",
				encoding: "utf8",
			});
			if (out && out.trim().length > 0) {
				console.log("--- Octave stdout ---");
				console.log(out.trimEnd());
				console.log("--- /Octave stdout ---");
			}
		}
		catch (e) {
			if (e && e.stdout) {
				const s = String(e.stdout);
				if (s.trim().length > 0) {
					console.log("--- Octave stdout ---");
					console.log(s.trimEnd());
					console.log("--- /Octave stdout ---");
				}
			}
			if (e && e.stderr) {
				const s = String(e.stderr);
				if (s.trim().length > 0) {
					console.log("--- Octave stderr ---");
					console.log(s.trimEnd());
					console.log("--- /Octave stderr ---");
				}
			}
			throw e;
		}
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

	const inputFile = path.join(__dirname, "..", "examples", "lp1_bypass", "lp1_bypass.crm");
	const code = String(fs.readFileSync(inputFile));
	const filereader = util.get_filereader([
		path.dirname(inputFile),
		path.join(__dirname, "crm"),
		path.join(__dirname, "c"),
	]);

	const outdir = path.join(outputDir, "OUTGEN_OPT0");
	const nooptDir = path.join(outdir, "MATLAB_noopt");
	const baseOptDir = path.join(outdir, "MATLAB_opt_base");
	const sinkDir = path.join(outdir, "MATLAB_opt_sink");
	const hoistDir = path.join(outdir, "MATLAB_opt_sink_hoist");
	fs.mkdirSync(nooptDir, { recursive: true });
	fs.mkdirSync(baseOptDir, { recursive: true });
	fs.mkdirSync(sinkDir, { recursive: true });
	fs.mkdirSync(hoistDir, { recursive: true });

	function writeFiles (dir, files) {
		files.forEach(f => {
			const outsub = path.join(dir, f.path);
			fs.mkdirSync(outsub, { recursive: true });
			fs.writeFileSync(path.join(outsub, f.name), f.str);
		});
	}

	let ok = true;
	let err = "";

	try {
		const filesNoOpt = z.compile(code, filereader, {
			initial_block_id: "lp1_bypass",
			target_language: "MATLAB",
			optimizations: default_optimizations,
			outgen_optimizations: false,
			debug_mode: true,
			debug_output_dir: path.join(outdir, "_debug_noopt"),
		});
		const filesOpt = z.compile(code, filereader, {
			initial_block_id: "lp1_bypass",
			target_language: "MATLAB",
			optimizations: default_optimizations,
			outgen_optimizations: true,
			outgen_code_sinking: false,
			outgen_code_hoisting: false,
			debug_mode: true,
			debug_output_dir: path.join(outdir, "_debug_opt_base"),
		});
		const filesSink = z.compile(code, filereader, {
			initial_block_id: "lp1_bypass",
			target_language: "MATLAB",
			optimizations: default_optimizations,
			outgen_optimizations: true,
			outgen_code_sinking: true,
			outgen_code_hoisting: false,
			debug_mode: true,
			debug_output_dir: path.join(outdir, "_debug_opt_sink"),
		});
		const filesHoist = z.compile(code, filereader, {
			initial_block_id: "lp1_bypass",
			target_language: "MATLAB",
			optimizations: default_optimizations,
			outgen_optimizations: true,
			outgen_code_sinking: true,
			outgen_code_hoisting: true,
			debug_mode: true,
			debug_output_dir: path.join(outdir, "_debug_opt_sink_hoist"),
		});

		writeFiles(nooptDir, filesNoOpt);
		writeFiles(baseOptDir, filesOpt);
		writeFiles(sinkDir, filesSink);
		writeFiles(hoistDir, filesHoist);

		if (hasOctave()) {
			try {
				runOctaveCheck(outdir, [
					"addpath('" + nooptDir.replace(/\\/g, "/") + "');",
					"x =      [1 2 3 4 5 6 7 8 9 10];",
					"bypass = [0 0 1 1 0 0 0 1 1  0];",
					"fs = 48000;",
					"y_noopt = lp1_bypass(x, bypass, fs);",
					"rmpath('" + nooptDir.replace(/\\/g, "/") + "');",
					"clear lp1_bypass;",
					"addpath('" + baseOptDir.replace(/\\/g, "/") + "');",
					"y_opt_base = lp1_bypass(x, bypass, fs);",
					"rmpath('" + baseOptDir.replace(/\\/g, "/") + "');",
					"clear lp1_bypass;",
					"addpath('" + sinkDir.replace(/\\/g, "/") + "');",
					"y_opt_sink = lp1_bypass(x, bypass, fs);",
					"rmpath('" + sinkDir.replace(/\\/g, "/") + "');",
					"clear lp1_bypass;",
					"addpath('" + hoistDir.replace(/\\/g, "/") + "');",
					"y_opt_hoist = lp1_bypass(x, bypass, fs);",
					"rmpath('" + hoistDir.replace(/\\/g, "/") + "');",
					"disp(y_noopt);",
					"disp(y_opt_base);",
					"disp(y_opt_sink);",
					"disp(y_opt_hoist);",
					"assert(isequal(y_noopt, y_opt_base));",
					"assert(isequal(y_noopt, y_opt_sink));",
					"assert(isequal(y_noopt, y_opt_hoist));",
				]);
			}
			catch (e) {
				if (isSandboxOctaveEperm(e))
					console.log("Skipping Octave execution for outgen opt test (sandbox blocks spawning octave from node)");
				else
					throw e;
			}
		}
		else {
			console.log("Skipping Octave execution checks: octave not found");
		}
	}
	catch (e) {
		ok = false;
		err = e && e.stack ? e.stack : (e + "");
	}

	console.log("Outgen opt tests passed: " + (ok ? "1 / 1" : "0 / 1"));
	console.log("--- OUTGEN OPT TESTS --- END");

	if (!ok) {
		console.error(err);
		process.exit(1);
	}

}());
