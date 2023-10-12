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

	console.log("--- GRAPH TESTS --- START");

	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");
	const graph  = require("../src/graph");
	const util   = require("../src/util");
	const fs     = require("fs");

	const GoodTests = [
		{
			code: `
				y, u = asd (x) {
					A = 123.0
					y = A
					u = x
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
				int A = 123
				y = asd (x) {
					y = x * 2.0 + float(A)
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "delay", control_inputs: [] }
		},
		{
			code: `
				int y = delay (int x) {
				    mem[1] int s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
				int i = circular_iterator (int n) {
					i = (delay(i) + 1) % n
					i.init = -1
				}
				float y = delay(float x, int n) {
				    mem[n] float line
				    int i = circular_iterator(n)
				    y = line[i]
				    line[i] = x
				    line.init = x # implicitly x.init
				}
				float y = delay11(float x) {
					y = delay(x, 11);
				}
			`,
			options: { initial_block_id: "delay11", control_inputs: [] }
		},
		{
			code: `
				y = asd (x) {
					y = x
				}
				y = asd (x1, x2) {
					y = x1 + x2 + asd(x1)
				}
			`,
			options: { initial_block_id: "asd", initial_block_inputs_n: 2, control_inputs: [] }
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
			options: { initial_block_id: "asd", control_inputs: [] }
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
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
				y = asd (x) {
					y = t.fs
					t = x + 5.0 + u # + t # doesn't work now, but should, or no
					u = 1.0
					u.fs = 2.0
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [] }
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
			options: { initial_block_id: "asd", control_inputs: [] }
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
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
				int A = 123456
				y, u = asd (x) {
					mem[1] float V
					V[0] = V[0] + 0.01 * y
					V.init = y #implicit y.init
					t = x * 5.5
					u = t.fs
					u.init = t
					y = t.init + t.fs.init + t.fs / V[0]
					t.fs.init = float(int(666.666 + (A.fs.init.fs * 2.0).init) ^ 5.init)
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
								int A = 123
				mem[A * 2] float U
				U.init = 0.1
				y, u = asd (x) {
					mem[5] float V
					V.init = 0.0
					V[0] = x + fs
					V[1] = x * 2.0 / V[33]
					V[int(x)] = 0.5 * t
					t = x * 5.5 + uff(delay(t) / 2.2)
					y = x * 2.0 + float(A) / (V[44] + V[55])
					u = float(int(t) - A % int(U[3]))
				}
				y = uff (x) {
					y = x - 1.111111 + float(A) + u + p
					u = u1 + u2 + u3
					p = p1 + p2 + p3
					u1, p1 = aff(666, x - 1.0)
					u2, p2 = aff(666 + 666, x)
					u3, p3 = aff(666, x * p1)
				}
				y1, y2 = aff (int x, t) {
					y1 = y2 * float(x) + float(A)
					y2 = t + float(x)
				}
				float y = delay (float x) {
				    mem[1] float s
				    y = s[0]
				    s[0] = x
				    s.init = x
				}
			`,
			options: { initial_block_id: "asd", control_inputs: [] }
		},
		{
			code: `
				y = vol (x, v) {
					y = x * v
				}
			`,
			options: { initial_block_id: "vol", control_inputs: ["v"] }
		}
		/*
		{ 
			code: `
					int A = 5
					float B = 5.5
					bool C = false
					y1, float y2, int y3, y4 = myblock (x, t, int u) {
						y1 = 6.0;
						y2 = y1 > 0.5 ? B * float(A) : 0.0 + y4 / t * x
						y3 = 5 | 6 >> 5 << 1 * 1
						y4 = y2
					}
				`,
			options: { initial_block_id: "myblock" }
		}*/
	];

	const BadTests = [
		{
			code: `
				y = A () {
					y = y.fs
				}
			`,
			options: { initial_block_id: "A" }
		},
		{
			code: `
				y = asd (x) {
					y = t.fs
					t = y
				}
			`,
			options: { initial_block_id: "asd" }
		},
		{
			code: `
				y = asd (x) {
					y = t.init
					t = y
				}
			`,
			options: { initial_block_id: "asd" }
		},
	];

	const outputDir = './output';
	if (!fs.existsSync(outputDir))
		fs.mkdirSync(outputDir);


	for (let i = 0; i < process.argv.length; i++) {
		const val = process.argv[i];
		if (val.includes('t=')) {
			const i = val.substr(2);
			console.log(GoodTests[i].code);
			runGoodTest(i);
			return;
		}
	}

	function runGoodTest(t) {
		const AST = parser.parse(GoodTests[t].code);
		syntax.validateAST(AST);
		const g = graph.ASTToGraph(AST, GoodTests[t].options);
		var gvizs = util.graphToGraphviz(g);
		fs.writeFileSync(outputDir + "/T" + t + ".dot", gvizs);
		graph.flatten(g, GoodTests[t].options);
		var gvizs = util.graphToGraphviz(g);
		fs.writeFileSync(outputDir + "/T" + t + "Flattened.dot", gvizs);
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

	console.log("--- GRAPH TESTS --- END")

}());