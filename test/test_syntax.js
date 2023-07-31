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

	console.log("--- SYNTAX TESTS --- START");

	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");

	const GoodCodes = [
		`
			A = 5
		`, `
			B = true
		`, `
			C = 5.5e-5
		`, `
			_ = 5
		`,`
			int A = 5
			float B = 5.5
			bool C = false
			y1, float y2, int y3, y4 = myblock (x, t, int u) {
				y1 = 6.0;
				y2 = y1 > 0.5 ? B * float(A) : 0.0 + y4 / t * x
				y3 = 5 | 6 >> 5 << 1 * 1
				y4 = y2
			}
		`, `
			y = A (x) { y = x; }
			y = A (int x) { y = 5.5; }
			y = A (x, u) { y = x * u; }
		`, `
			y = A (x) {
				mem[fs * 5] int ciao
				ciao[0] = 5
				ciao[int(y / 2)] = ciao[0] >> 5
				y = ciao[x > 0.5 ? ciao[0] : ciao[1]]
			}
		`, `
			y = if (true) {
				y = 5.5
			} else {
				y = 8.8
			}
		`, `
			y = if (true) {
				y = 5.5
			} else if (true && true) {
				y = 6.6
			} else if (false && true) {
				y = 7.7
			} else {
				y = 8.8
			}
		`, `
			y = if (true) {
				y = 5.5
			} else if (true && true) {
				y = 6.6
			} else {
				y = 8.8
			}
		`, `
			A = 5.5;
			A.fs = 9;
			A.init = 5
		`, `
			A = 5.5
			A.init = A.fs * 2
		`, `
			y = A (x) {
				mem[5] int v
				v.init = 5
				y = v[2]
			}
		`, `
			y = A (x) {
				mem[5] int v
				v.init = [1, 2, 3, 4, 5]
				y = v[2]
			}
		`, `
			y = A (x) {
				mem[5] int v
				v.init, y = B (x)
			}
			y1, y2 = B (x) {y1 = x; y2 = x;}
		`, `
			y = A (x) {
				y = x * 2
				y.fs = ((x * x).fs * 2).init
				y.fs.fs.fs = 0.5
			}
		`
	];

	const BadCodes = [
		`
			fs = 5
		`, `
			_ = { a = 5; }
		`, `
			A = 5 * _
		`, `
			y = A (float x * x) { y = 5; }
		`, `
			y = asd (x) {
				y = 5.5
			}
			B = asd (5, 5);
		`, `
			A = 5
			B = A()
		`, `
			y = A (x) { y = x; }
			int y = A (x) { y = x; }
		`, `
			y = A (x) {
				mem[5] bool veritas
				veritas = 5
			}
		`, `
			y = A (x) {
				mem[5] bool veritas
				veritas[0] = if (x > 0.5) {
					veritas[0] = true
				} else {
					veritas[0] = true
				}
			}
		`, `
			y = if (true) {
				y = 5.5
			} else {
				x = 5
			}
		`, `
			A.fs = 9;
		`, `
			A = 5;
			A.ciao = 5;
		`, `
			A = 3.3
			B = A[0]
		`, `
			y1, y2 = A () { y1 = 1.1; y2 = 2.2; }
			y2 = 1 + A();
		`, `
			y = A (x) {
				y = [1, 2, 3]
			}
		`, `
			y = A (x) {
				y = x * [1, 2, 3]
			}
		`, `
			y = A (x) {
				mem[5] int v
				v.fs = [1, 2, 3, 4, 5]
				y = v[2]
			}
		`, `
			y, t = 5;
		`, `
			y = fs.fs
		`, `
			fs.fs = 5
		`, `
			y = A (x) {
				int y = 5
			}
		`, `
			mem[3] int v;
			y = A (x) {
				y = x;
				v[2] = 0;
			}
		`, `
			A = 5;
			y = B (x) {
				y = x;
				A.init = 5
			}
		`, `
			y = A (x) {
				y = x;
				x.init = 0.5
			}
		`, `
			mem[aaa] int v;
		`, `
			y = 5;
			(y + y).fs = 0.5
		`, `
			y = A(x) {
				y = x
				y.fs = 5
				y.fs.qwe.init = 4
			}
		`, `
			x = 5
			y = A () {
				y = 4
				x.fs = 5
			}
		`, `
			y = A(x) {
				y = x
			}
			A.init = 5
		`
	];

	const GoodCodeResults = [];
	const BadCodeResults = [];

	for (let c in GoodCodes) {
		let res = true;
		let err = "";
		try {
			syntax.validateAST(parser.parse(GoodCodes[c]));
		} catch (e) {
			//console.log("A", e);
			res = false;
			err = e;
		}
		GoodCodeResults.push({ i: c, r: res, e: err });
	}

	for (let c in BadCodes) {
		let res = false;
		let err = "";
		try {
			syntax.validateAST(parser.parse(BadCodes[c]));
		} catch (e) {
			//console.log("B", e.message);
			res = true;
			err = e;
		}
		BadCodeResults.push({ i: c, r: res, e: err });
	}

	for (let r of GoodCodeResults) {
		if (!r.r) {
			console.log("Good code test n. " + r.i + " failed. Code: ");
			console.log(GoodCodes[r.i]);
			console.log("Error:");
			console.log(GoodCodeResults[r.i].e);
		}
	}

	for (let r of BadCodeResults) {
		if (!r.r) {
			console.log("Bad code test n. " + r.i + " failed. No Error thrown. Code:");
			console.log(BadCodes[r.i]);
		}
	}

	const GoodPassedsN = GoodCodeResults.filter(r => r.r).length;
	const BadPassedsN = BadCodeResults.filter(r => r.r).length;
	console.log("Good code tests passed: " + GoodPassedsN + " / " + GoodCodes.length);
	console.log("Bad  code tests passed: " + BadPassedsN + " / " + BadCodes.length);

	console.log("--- SYNTAX TESTS --- END")

}());