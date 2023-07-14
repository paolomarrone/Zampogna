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

	const util = require("util");


	function ScopeTable (father) {
		this.elements = [];
		this.father = father;
		this.findLocally = function (id) {
			return this.elements.filter(e => e.id == id);
		};
		this.find = function (id) {
			let e = this.findLocally(id);
			if (e.length > 0) return e;
			if (this.father) return this.father.find(id);
			return [];
		};
		this.add = function (item) {
			if (this.findLocal(item.id))
				err("ID assigned twice: " + item.id);
			this.elements.push(item);
		};
	};

	function ScopeElement (id, type, inputsN, outputsN, reserved = false) {
		this.id = id;
		this.type = type;
		this.inputsN = inputsN;
		this.outputsN = outputsN;
		this.reserved = reserved;
	}

	const reserved_ids = ["fs"];

	const globalScope = new ScopeTable(null);
	globalScope.add(new ScopeElement("fs", "var", 0, 1, true));
	globalScope.add(new ScopeElement("delay", "block", 1, 1, false));
	globalScope.add(new ScopeElement("delay", "block", 2, 1, false));


	function validateAST (root) {
		// TODO: Check initial block: only float input allowed

		

	}


	function analyze_block_signature (node) {
		if (node.inputs.some(i => i.name != 'ID'))
			err("Block definition inputs must be IDs");
		if (node.inputs.some(i => reserved_ids.includes(i.value)))
			err("Cannot use reserved IDs here");
		if (node.outputs.some(o => o.name != 'ID'))
			err("Block definition outputs must be IDs");
		if (node.outputs.some(o => reserved_ids.includes(o.value)))
			err("Cannot use reserved IDs here");
	}

	// Maybe just check output as an assignment...
	function analyze_anonym_block_signature (node) {
		if (node.outputs.some(o => o.name != 'ID'))
			err("Block definition outputs must be IDs");
		if (node.outputs.some(o => reserved_ids.includes(o.value)))
			err("Cannot use reserved IDs here");	
	}

	function analyze_block_body(stmts, parent_scope) {
		const scope = new ScopeTable(parent_scope);

		
	}


}());