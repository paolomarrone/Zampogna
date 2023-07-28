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

	const GoodTests = [
		{ 
			code: 
				`
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
			options: { initial_block: "myblock" }
		}

	];

	const BadTests = [
		
	];

	const GoodTestResults = [];
	const BadTestResults = [];

	for (let t in GoodTests) {
		let res = true;
		let err = "";
		try {
			const AST = parser.parse(GoodTests[t].code);
			syntax.validateAST(AST);
			const g = graph.ASTToGraph(AST, GoodTests[t].options);
		} catch (e) {
			console.log("A", e);
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
		} catch (e) {
			//console.log("B", e.message);
			res = true;
			err = e;
		}
		BadTestResults.push({ i: t, r: res, e: err });
	}

	for (let r of GoodTestResults) {
		if (!r.r) {
			console.log("Good code test n. " + r.i + " failed. Code: ");
			console.log(GoodTests[r.i]);
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