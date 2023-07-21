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

	const fs = require("fs");

	const util   = require("./util");

	const parser  = require("./grammar");
	const syntax  = require("./syntaxer");
	const graph   = require("./graph");

	
	function compile (code, options_ = {}) {

		const options = {
			debug_mode: false,
			initial_block: "",
			control_inputs: [],
			initial_values: [],
			optimizations: [],
			target_language: ""
		};

		for (let p in options_) {
			options[p] = options_[p];
		}

		try {

			// Include builtin code
			const builtin = String(fs.readFileSync("builtin.crm"));

			code = builtin + code;

			// Parsing
			const AST = parser.parse(code);
			//if (options.debug_mode)
			//	util.printAST(AST);

			// Extended Syntax analysis
			syntax.validateAST(AST);

			// AST -> Graphes
			//const graphes = grapher.ASTToGraph(AST, options);


		} catch (e) {
			console.error(e);
			return;
		}

	}


	exports = {
		compile
	};

}());