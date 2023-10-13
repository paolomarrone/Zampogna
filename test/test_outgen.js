#!/bin/node

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

	console.log("--- OUTGEN TESTS --- START");

	const preprocessor = require("../src/preprocessor");
	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");
	const graph  = require("../src/graph");
	const schdlr = require("../src/scheduler");
	const outgen = require("../src/outgen");
	const util   = require("../src/util");
	const fs     = require("fs");

	const path = require("path");
	const searchpaths = [ 
		path.join(__dirname, "crm"), 
		path.join(__dirname, "c") 
	];
	const filereader = require("../src/util").get_filereader(searchpaths);

	const default_optimizations = {
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
	};

	const GoodTests = [
		{
			code: `
				y = volume (i, v) {
					y = i * (v * 2.0)
				}
			`,
			options: { initial_block_id: "volume", control_inputs: ['v'], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd (x) {
					y = delay(delay(x))
				}
				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd (x, lol) {
					int n = 100000
					int lul = int(lol * float(n))
					y = x + delay(x, n, lul)
				}
				
				int i = circular_iterator (int n) {
				    i = (delay(i) + 1) % n
				    i.init = -1
				}

				float y = delay(float x, int n, int lol) {
				    mem[n] float line
				    int i = circular_iterator(lol)
				    y = line[i]
				    line[i] = x
				    line.init = x # implicitly x.init
				}
				int y = delay (int x) {
				    mem[1] int s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}

			`,
			options: { initial_block_id: "asd", control_inputs: ['lol'], optimizations: default_optimizations }
		},		
		{
			code: `
				y = lp1 (x, v) {
					y_z1 = delay(y)
					y = y_z1 + v / fs * 1000.0 * (x - y_z1)
					y.init = 0.0
				}
				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "lp1", control_inputs: ['v'], optimizations: default_optimizations }
		},		
		{
			code: `
				y = lp1 (x, fr) {
					y_z1 = delay(y)
					y = y_z1 + fr * (x - y_z1)
					y.init = 0.0
				}

				y = lp3 (x, fr) {
					y = lp1(lp1(lp1(x, fr), fr), fr)
				}
				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "lp3", control_inputs: ['fr'], optimizations: default_optimizations }
		},
		{
			code: `
				pi = 3.14159265358979323846

				y = EQregalia(x, low, high, peak) {
					decibel_range = 40.0
					lowdb  = low  * decibel_range - decibel_range * 0.5
					highdb = high * decibel_range - decibel_range * 0.5
					peakdb = peak * decibel_range - decibel_range * 0.5

					t1 = lowshelffilter(x, lowdb)
					
					t2 = highshelffilter(t1, highdb)

					t3 = peakfilter(t2, peakdb)

					y = t3
				}

				yL, yR = EQregaliaStereo(xL, xR, low, high, peak) {
					
					yL = EQregalia (xL, low, high, peak)
					yR = EQregalia (xR, low, high, peak)
				}

				y = lowshelffilter(x, gain) {
					K = K_approximation(gain)
					f0 = 200.0
					z = (pi*f0)/fs

					a = (z - 1.0) / (z + 1.0)

					u = ((K - 1.0 ) / 2.0) * (a * x + delay(x)) -  a * delay(u)
					u.init = 0.0

					y = ((K + 1.0) / 2.0) * x + u
				}


				y = highshelffilter(x, gain) {
					K = K_approximation(gain)
					f0 = 5000.0
					z = (pi*f0)/fs

					a = (z - 1.0) / (z + 1.0)

					u = ((1.0 - K) / 2.0) * (a * x + delay(x)) -  a * delay(u)
					u.init = 0.0

					y = ((1.0 + K) / 2.0) * x + u
				}


				y = peakfilter(x, gain) {
					K = K_approximation(gain)
					f0 = 1000.0
					deltaf = 1789.0
					z = (2.0 * pi * f0) / fs

					b = - (-0.4643843937958486 * z * z - 0.01348369482970019 * z + 1.000898384794433)
					a = (1.0 - ((pi * deltaf) / fs)) / (1.0 + ((pi * deltaf) / fs))

					u = ((1.0 - K) / 2.0) * (a * x + b * (1.0 + a) * delay(x) + delay(delay(x))) ...
					    - b * (1.0 + a) * delay(u) - a * delay(delay(u))
					u.init = 0.0

					y = ((1.0 + K) / 2.0) * x + u
				}


				y = K_approximation(gain) {

					K = 1.005216266655582 + gain * ...
					(0.115446211868609400 + gain * ...
					(0.006357962473527189 + gain * ...
					(2.473043497433871e-4 + gain * ...
					(9.275409030059003e-6 + gain * ...
					(2.061300092186973e-7)))))
					
					y = K
				}

				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "EQregalia", control_inputs: ['low', 'high', 'peak'], optimizations: default_optimizations }
		},
		{
			code: `
				y1, y2, y3 = asd (x) {
					y1 = -(-(-5.0))
					y2 = u
					u = -5.0
					y3 = (y1 + 5.0 + x).fs
					y1.fs = 50.0
					h = 0.5
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y, u = asd (x) {
					A = 123.0
					y = A
					u = x
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				int A = 123
				y = asd (x) {
					y = x * 2.0 + float(A)
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				float A = 123.4
				y, u = asd (x) {
					t = x * 5.5
					y = x * 2.0 + A
					u = float(int(t)) - A
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd () {
					mem[1] float V
					V.init = 2.0 + 3.0
					y = V[0];
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd (x) {
					mem[1] float V
					V.init = a + x
					a = 7.0
					y = V[0];
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd (x) {
					y = t.fs
					t = x + 5.0 + u # + t # doesn't work now, but should, or no
					u = 1.11
					h = h
					u.fs = 2.0
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				y = asd (x) {
					y = t.init
					t = x + 5.0 + u
					u = 1.0
					u.init = 2.0
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `
				int A = 1234
				y, u = asd (x) {
					t = x * 5.5
					y = x * 2.0 + float(A)
					u = float(int(t) - A)
					t.fs.init.fs.fs.fs = float(int(666.666 + (A.fs.init.fs * 2.0).init) ^ 5.init)
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `

				include mypowf
				include mymodulo

				y = asd (x) {
					int a, int b = mymodulo(2, 3)
					c = float(a + b)
					y = mypowf(x, c)
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [], optimizations: default_optimizations }
		},
		{
			code: `

				include mypowf
				include mymodulo

				y = asd (x, v) {
					int a, int b = mymodulo(2, 3)
					int e = a - b
					c = float(e + b + int(fs * 2.0))
					d = c * c * v * v
					y = mypowf(x, mypowf(d, c * mypowf(2.0, c - x)))
				}
			`,
			options: { initial_block_id: "asd", control_inputs: ['v'], optimizations: default_optimizations }
		},
	];

	const BadTests = [

	];

	const outputDir = './output';
	if (!fs.existsSync(outputDir))
		fs.mkdirSync(outputDir);

	
	for (let i = 0; i < process.argv.length; i++) {
		const val = process.argv[i];
		if (val.includes('t=')) {
			const i = val.substr(2);
			runGoodTest(i);
			return;
		}
	}

	function runGoodTest (t) {
		GoodTests[t].options.target_language = "C"; // See this
		const r = preprocessor.preprocess(GoodTests[t].code, filereader);
		const code = r[0];
		const jsons = r[1];
		const AST = parser.parse(code);
		syntax.validateAST(AST);
		const g = graph.ASTToGraph(AST, GoodTests[t].options, jsons);
		var gvizs = util.graphToGraphviz(g);
		fs.writeFileSync(outputDir + "/T" + t + ".dot", gvizs);
		graph.flatten(g, GoodTests[t].options);
		var gvizs = util.graphToGraphviz(g);
		fs.writeFileSync(outputDir + "/T" + t + "Flattened.dot", gvizs);
		graph.optimize(g, GoodTests[t].options);
		var gvizs = util.graphToGraphviz(g);
		fs.writeFileSync(outputDir + "/T" + t + "Optimized.dot", gvizs);
		const s = schdlr.schedule(g, GoodTests[t].options);
		const o = outgen.convert(g, s, GoodTests[t].options);
		fs.writeFileSync(outputDir + "/T" + t + "Out.c", o[0].str);
	}

	const GoodTestResults = [];
	const BadTestResults = [];


	for (let t in GoodTests) {
		let res = true;
		let err = "";
		try {
			runGoodTest(t);
		} catch (e) {
			//console.log("A", e);
			res = false;
			err = e;
		}
		GoodTestResults.push({ i: t, r: res, e: err });
	}

	for (let t in BadTests) {
		let res = false;
		let err = "";
		try {
			const AST = parser.parse(BadTests[t].code);
			syntax.validateAST(AST);
			const g = graph.ASTToGraph(AST, BadTests[t].options);
			var gvizs = util.graphToGraphviz(g);
			fs.writeFileSync(outputDir + "/F" + t + ".dot", gvizs);
			graph.flatten(g, BadTests[t].options);
			var gvizs = util.graphToGraphviz(g);
			fs.writeFileSync(outputDir + "/F" + t + "Flattened.dot", gvizs);
			const s = schdlr.schedule(g, BadTests[t].options);
		} catch (e) {
			console.log("B", e.message);
			res = true;
			err = e;
		}
		BadTestResults.push({ i: t, r: res, e: err });
	}

	for (let r of GoodTestResults) {
		if (!r.r) {
			console.log("Good code test n. " + r.i + " failed");
			console.log("Code: ", GoodTests[r.i].code);
			console.log("Options: ", GoodTests[r.i].options);
			console.log("Error:");
			console.log(GoodTestResults[r.i].e);
		}
	}

	for (let r of BadTestResults) {
		if (!r.r) {
			console.log("Bad code test n. " + r.i + " failed. No Error thrown. Code:");
			console.log(BadTests[r.i]);
		}
	}

	const GoodPassedsN = GoodTestResults.filter(r => r.r).length;
	const BadPassedsN = BadTestResults.filter(r => r.r).length;
	console.log("Good code tests passed: " + GoodPassedsN + " / " + GoodTests.length);
	console.log("Bad  code tests passed: " + BadPassedsN + " / " + BadTests.length);

	console.log("--- OUTGEN TESTS --- END")

}());