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

	console.log("--- PREPROCESSOR TESTS --- START");

	const path = require("path");
	const preprocessor = require("../src/preprocessor");
	const searchpaths = [ path.join(__dirname, "crm") ];
	const filereader = require("../src/util").get_filereader(searchpaths);


	const GoodCodes = [
		`
			include test

			y = A (x) {
				y = x	
			}
		`
	];

	const BadCodes = [
		
	];

	const GoodCodeResults = [];
	const BadCodeResults = [];

	for (let c in GoodCodes) {
		let res = true;
		let err = "";
		try {
			const r = preprocessor.preprocess(GoodCodes[c], filereader);
			console.log(r[0])
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
			preprocessor.preprocess(BadCodes[c], filereader);
		} catch (e) {
			console.log("B", e.message);
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

	console.log("--- PREPROCESSOR TESTS --- END")

}());