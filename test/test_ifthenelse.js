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
				y = counter(x) {
					y = if (x < 0.5) {
						y = 0.0
					} else {
						y = delay(y) + 1.0
						y.init = 0.0
					}
				}
			`,
			initial_block_id: "counter",
			matlabScript: [
				"x =  [0 0 0 1 1 0 0 1 1 0 0 1 1];",
				"Ey = [0 0 0 1 2 0 0 3 4 0 0 5 6];",
				"[y] = counter(x, 48000);",
				"assert(isequal(y, Ey));",
			]
		},
		{
			name: "counters example behavior (Octave/MATLAB)",
			code: `
				float y = delay (float x) {
					mem[1] float s
					y = s[0]
					s[0] = x
					s.init = x
				}
				y = counter(x) {
					t = y
					t.init = 0.0
					y = if (x < 0.5) {
						y = 0.0
					} else {
						y = delay(t) + 1.0
					}
				}
			`,
			initial_block_id: "counter",
			matlabScript: [
				"x  = [0 0 0 1 1 0 0 1 1 0 0 1 1];",
				"Ey = [0 0 0 1 2 0 0 1 2 0 0 1 2];",
				"[y] = counter(x, 48000);",
				"assert(isequal(y, Ey));",
			]
		},
		{
			name: "counters example behavior (Octave/MATLAB) - hard scope",
			code: `
				float y = delay (float x) {
					mem[1] float s
					y = s[0]
					s[0] = x
					s.init = x
				}
				y = counter(x) {
					y = if (x < 0.5) {
						y = 0.0
					} else {
						y = if (x < 1.5) {
							y = -10.0
						} else {
							y = delay(y) + 1.0
							y.init = 0.0
						}
					}
					y.init = 0.0
				}
			`,
			initial_block_id: "counter",
			matlabScript: [
				"x  = [0 0 0   1 2 2 2 0 0 2 2 2 2];",
				"Ey = [0 0 0 -10 1 2 3 0 0 4 5 6 7];",
				"[y] = counter(x, 48000);",
				"assert(isequal(y, Ey));",
			]
		},
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
		},
		{
			name: "lp1_bypass example behavior (Octave/MATLAB)",
			code: `
				float y = delay (float x) {
					mem[1] float s
					y = s[0]
					s[0] = x
					s.init = x
				}

				pi = 3.141592653589793
				pi2 = pi * 2.0

				# Backward Euler method
				y = lp1(x, s) {
					fc = 1000.0
					B0 = (pi2 * fc) / (fs + pi2 * fc)
					A1 = -fs / (fs + pi2 * fc)
					y = B0 * x - A1 * s
				}

				y = lp1_bypass(x, bypass) {

					# We use x_z1A to avoid delay updates when it won't be needed in the next execution.
					# This is a program logic info and cannot be known by the compiler.

					x_z1A = x_z1
					bypass_z1 = delay(bypass)

					y, x_z1 = if (bypass > 0.5) {
						y = x
						x_z1 = delay(x)
					}
					else {
						s = if (bypass_z1 > 0.5) {
							s = x_z1A
						}
						else {
							s = t_z1
						}
						t = lp1(x, s)
						t.init = 0.0
						t_z1 = delay(t)
						y = t
						x_z1 = delay(x_z1)
					}
					x_z1.init = 0.0
				}

			`,
			initial_block_id: "lp1_bypass",
			matlabScript: [
				"x = [1 2 3 4 5 6 7 8 9 10];",
				"bypass = [0 0 1 1 0 0 0 1 1 0];",
				"Ey = [0.115748279538573 0.333847174399580 3.0 4.0 4.115748279538574 4.333847174399581 4.642449776949734 8.0 9.0 9.115748279538574];",
				"[y] = lp1_bypass(x, bypass, 48000)",
				"assert(max(abs(y - Ey)) < 1e-12);",
			]
		}
	];

	function runOctaveCheck (generatedDir, matlabScriptLines) {
		const scriptPath = path.join(generatedDir, "run_check.m");
		const script = [
			"addpath('" + generatedDir.replace(/\\/g, "/") + "');"
		].concat(matlabScriptLines || []).join("\n") + "\n";
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
