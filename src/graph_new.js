/*
	Copyright (C) 2021, 2022 Orastron Srl

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

	exports.Port = {};
	exports.Port.block = null;
	exports.Port.type = function () {
		if (this.block.i_ports.includes(this)) return "in";
		if (this.block.o_ports.includes(this)) return "out";
	};
	exports.Port.index = function () {
		if (this.type() == "in")  return this.block.i_ports.indexOf(this);
		if (this.type() == "out") return this.block.o_ports.indexOf(this);
	};
	exports.Port.toString = function () {
		return this.block.toString() + "[" + this.type() + ": " + this.index() + "]";
	};


	exports.Block = {};
	exports.Block.id = null;
	exports.Block.operation = "DEFAULT";
	exports.Block.i_ports = null; // Array of Ports
	exports.Block.o_ports = null; // Array of Ports
	exports.Block.createPorts = function (i_n, o_n) {
		this.i_ports = new Array(i_n).fill().map(() => Object.create(exports.Port));
		this.o_ports = new Array(o_n).fill().map(() => Object.create(exports.Port));
		this.i_ports.forEach(p => p.block = this);
		this.o_ports.forEach(p => p.block = this);
	};
	exports.Block.toString = function () {
		return "{ B_" + this.id + ", " + this.operation + " }";
	};
	exports.Block.clone = function () {
		let r = Object.create(this);
		r.createPorts(r, this.i_ports.length, this.o_ports.length); // mmmm...
	};
	exports.Block.flatten = function () {};
	exports.Block.isUseless = function () { return false }; // TODO


	exports.VarBlock = Object.create(exports.Block);
	exports.VarBlock.operation = "VAR";


	exports.DelayBlock = Object.create(exports.Block);
	exports.DelayBlock.operation = "DELAY";
	exports.DelayBlock.nSamples = 1; // ...


	exports.NumberBlock = Object.create(exports.Block);
	exports.NumberBlock.operation = "NUMBER";
	exports.NumberBlock.value = null; // Number
	exports.NumberBlock.toString = function () {
		return exports.Block.toString().replace('}', ', ' + this.value + " }");
	};

	exports.ArithmeticalBlock = Object.create(exports.Block);

	exports.SumBlock = Object.create(exports.ArithmeticalBlock);
	exports.SumBlock.operation = "SUM";
	exports.SumBlock.add = null; // Array of booleans. true = add, false = subtract


	exports.MulBlock = Object.create(exports.ArithmeticalBlock);
	exports.MulBlock.operation = "MUL";
	exports.MulBlock.over = null; // Array of booleans. true = multiply, false = divide


	exports.RelationalBlock = Object.create(exports.Block);

	exports.EqualBlock = Object.create(exports.RelationalBlock);
	exports.EqualBlock.operation = "EQUAL";
	exports.NotEqualBlock = Object.create(exports.RelationalBlock);
	exports.NotEqualBlock.operation = "NOTEQUAL";
	exports.LessBlock = Object.create(exports.RelationalBlock);
	exports.LessBlock.operation = "LESS";
	exports.LessEqualBlock = Object.create(exports.RelationalBlock);
	exports.LessEqualBlock.operation = "LESSEQUAL";
	exports.GreaterBlock = Object.create(exports.RelationalBlock);
	exports.GreaterBlock.operation = "GREATER";
	exports.GreaterEqualBlock = Object.create(exports.RelationalBlock);
	exports.GreaterEqualBlock.operation = "GREATEREQUAL";


	exports.LogicalBlock = Object.create(exports.Block);

	exports.AndBlock = Object.create(exports.LogicalBlock);
	exports.AndBlock.operation = "AND";
	exports.OrBlock = Object.create(exports.LogicalBlock);
	exports.OrBlock.operation = "OR";
	exports.NotBlock = Object.create(exports.LogicalBlock);
	exports.NotBlock.operation = "NOT";


	exports.Connection = {};
	exports.Connection.in = null;  // Port
	exports.Connection.out = null; // Port
	exports.Connection.toString = function () {
		return this.in.toString() + " => " + this.out.toString();
	};

	exports.CompositeBlock = Object.create(exports.Block); // A.k.a. Graph
	exports.CompositeBlock.blocks = null;        // Array of Blocks
	exports.CompositeBlock.connections = null;   // Array of Connections
	exports.CompositeBlock.i_ports = null;       // Array of internal block ports. External input
	exports.CompositeBlock.o_ports = null;       // Array of internal block ports. External output
	exports.CompositeBlock.toString() = function {
		let r = "{ G_" + this.id + "\n";
		this.blocks.forEach(b => r += "\t" + b.toString() + "\n");
		r += "\n";
		this.connections.forEach(c => r += "\t" + b.toString() + "\n");
		r += "}";
		return r;
	};
	exports.CompositeBlock.getInputPorts = function (o_port) {
		return this.connections.filter(c => c.out == o_port).map(c => c.in); // Should be max 1
	};
	exports.CompositeBlock.getOutputPorts = function (i_port) {
		return this.connections.filter(c => c.in == i_port).map(c => c.out);
	};
	exports.CompositeBlock.getInputBlocks = function (block) { // Unordered
		return Array.from(new Set(block.i_ports.map(p => this.getInputPorts(p)).flat().map(p => p.block)));
	};
	exports.CompositeBlock.getOutputBlocks = function (block) { // Unordered
		return Array.from(new Set(block.o_ports.map(p => this.getOutputPorts(p)).flat().map(p => p.block)));
	};
	exports.CompositeBlock.removeBlock = function (block) { // Brute remove
		this.blocks.splice(this.blocks.indexOf(block), 1);
		this.connections = this.connections.filter(c => c.in.block != block && c.out.block != block);
	};
	exports.CompositeBlock.removeIntermediateBlock = function (block) { // Assuming 1 i_p, and n o_ps
		let i_p  = this.getInputPorts(block.i_ports[0])[0];
		let o_ps = this.getOutputPorts(block.o_ports[0]);
		o_ps.forEach(o_p => {
			let c = Object.create(exports.Connection);
			c.in = i_p;
			c.out = o_p;
			this.connections.push(c);
		});
		this.removeBlock(block);
	}
	exports.CompositeBlock.removeIntermediateBlocks = function () {
		this.blocks.filter(b => 
			(exports.VarBlock.isPrototypeOf(b)) ||
			(exports.SumBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.add[0]) ||
			(exports.MulBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.over[0])
		).forEach(b => this.removeIntermediateBlock(b));
	}
	exports.CompositeBlock.flatten = function () {
		this.blocks.forEach(b => b.flatten());

		this.blocks.filter(b => exports.CompositeBlock.isPrototypeOf(b)).forEach(b => {
			
			// TODO: ....

		})

	};


}());