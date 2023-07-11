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

	const Port = {};
	Port.block = null;
	Port.type = function () {
		if (this.block.i_ports.includes(this)) return "in";
		if (this.block.o_ports.includes(this)) return "out";
	};
	Port.index = function () {
		if (this.type() == "in")  return this.block.i_ports.indexOf(this);
		if (this.type() == "out") return this.block.o_ports.indexOf(this);
	};
	Port.toString = function () {
		return this.block.toString() + "[" + this.type() + ": " + this.index() + "]";
	};


	const Block = {};
	Block.id = null;
	Block.operation = "DEFAULT";
	Block.i_ports = null; // Array of Ports
	Block.o_ports = null; // Array of Ports
	Block.createPorts = function (i_n, o_n) {
		this.i_ports = new Array(i_n).fill().map(() => Object.create(Port));
		this.o_ports = new Array(o_n).fill().map(() => Object.create(Port));
		this.i_ports.forEach(p => p.block = this);
		this.o_ports.forEach(p => p.block = this);
	};
	Block.init = function () {
		this.createPorts();
	}
	Block.toString = function () {
		return "{ B_" + this.id + ", " + this.operation + " }";
	};
	Block.clone = function () { // TODO: Fix
		let r = Object.create(this);
		r.createPorts(r, this.i_ports.length, this.o_ports.length); // mmmm...
		return r; 
	};
	Block.flatten = function () {};
	Block.isUseless = function () { return false }; // TODO


	const VarBlock = Object.create(Block);
	VarBlock.operation = "VAR";
	VarBlock.nInputs = 1;
	VarBlock.nOutputs = 1;

	const VarBlock_F32 = Object.create(VarBlock); // Lot of thinkering... is this the right choice?
	const VarBlock_I32 = Object.create(VarBlock);
	const VarBlock_BOO = Object.create(VarBlock);

	const MemoryBlock = Object.create(block);
	MemoryBlock.operation = "MEMORY";
	MemoryBlock.type = null;
	MemoryBlock.size = 0;


	const ConstantBlock = Object.create(Block);
	ConstantBlock.operation = "CONSTANT"; 

 
	ConstantBlock.value = null;
	ConstantBlock.toString = function () {
		return Block.toString().call(this).replace('}', ', ' + this.value + " }");
	};

	const Float32Block = Object.create(ConstantBlock);

	const Int32Block = Object.create(ConstantBlock);

	const BooleanBlock = Object.create(ConstantBlock);

	const LogicalBlock = Object.create(Block);

	const LogicalAndBlock = Object.create(LogicalBlock);
	LogicalAndBlock.operation = "AND";
	const LogicalOrBlock = Object.create(LogicalBlock);
	LogicalOrBlock.operation = "OR";
	
	/*
	const NotBlock = Object.create(LogicalBlock);
	NotBlock.operation = "NOT";
	*/

	const BitwiseBlock = Object.create(Block);

	const BitwiseOrBlock = Object.create(BitwiseBlock);

	const BitwiseXorBlock = Object.create(BitwiseBlock);

	const BitwiseAndBlock = Object.create(BitwiseBlock);

	const BitwiseNotBlock = Object.create(BitwiseBlock);



	const RelationalBlock = Object.create(Block);

	const EqualityBlock = Object.create(RelationalBlock);
	EqualityBlock.operation = "EQUAL";
	const InequalityBlock = Object.create(RelationalBlock);
	InequalityBlock.operation = "NOTEQUAL";
	const LessBlock = Object.create(RelationalBlock);
	LessBlock.operation = "LESS";
	const LessEqualBlock = Object.create(RelationalBlock);
	LessEqualBlock.operation = "LESSEQUAL";
	const GreaterBlock = Object.create(RelationalBlock);
	GreaterBlock.operation = "GREATER";
	const GreaterEqualBlock = Object.create(RelationalBlock);
	GreaterEqualBlock.operation = "GREATEREQUAL";


	const ShiftLeftBlock = Object.create(Block);

	const ShiftRightBlock = Object.create(Block);


	const ArithmeticalBlock = Object.create(Block);

	const SumBlock = Object.create(ArithmeticalBlock);
	SumBlock.operation = "SUM";

	const SubtractionBlock = Object.create(ArithmeticalBlock);
	SubtractionBlock.operation = "MINUS";

	const MulBlock = Object.create(ArithmeticalBlock);
	MulBlock.operation = "MUL";

	const DivisionBlock = Object.create(ArithmeticalBlock);
	DivisionBlock.operation = "DIV";

	const UminusBlock = Object.create(ArithmeticalBlock);
	UminusBlock.operation = "UMINUS";

	

	const Connection = {};
	Connection.in = null;  // Port
	Connection.out = null; // Port
	Connection.toString = function () {
		return this.in.toString() + " => " + this.out.toString();
	};

	const CompositeBlock = Object.create(Block); // A.k.a. Graph
	CompositeBlock.blocks = null;        // Array of Blocks
	CompositeBlock.connections = null;   // Array of Connections
	CompositeBlock.i_ports = null;       // Array of internal block ports. External input
	CompositeBlock.o_ports = null;       // Array of internal block ports. External output
	CompositeBlock.toString() = function {
		let r = "{ G_" + this.id + "\n";
		this.blocks.forEach(b => r += "\t" + b.toString() + "\n");
		r += "\n";
		this.connections.forEach(c => r += "\t" + b.toString() + "\n");
		r += "}";
		return r;
	};
	CompositeBlock.getInputPorts = function (o_port) {
		return this.connections.filter(c => c.out == o_port).map(c => c.in); // Should be max 1
	};
	CompositeBlock.getOutputPorts = function (i_port) {
		return this.connections.filter(c => c.in == i_port).map(c => c.out);
	};
	CompositeBlock.getInputBlocks = function (block) { // Unordered
		return Array.from(new Set(block.i_ports.map(p => this.getInputPorts(p)).flat().map(p => p.block)));
	};
	CompositeBlock.getOutputBlocks = function (block) { // Unordered
		return Array.from(new Set(block.o_ports.map(p => this.getOutputPorts(p)).flat().map(p => p.block)));
	};
	CompositeBlock.removeBlock = function (block) { // Brute remove
		this.blocks.splice(this.blocks.indexOf(block), 1);
		this.connections = this.connections.filter(c => c.in.block != block && c.out.block != block);
	};
	CompositeBlock.removeIntermediateBlock = function (block) { // Assuming 1 i_p, and n o_ps
		let i_p  = this.getInputPorts(block.i_ports[0])[0];
		let o_ps = this.getOutputPorts(block.o_ports[0]);
		o_ps.forEach(o_p => {
			let c = Object.create(Connection);
			c.in = i_p;
			c.out = o_p;
			this.connections.push(c);
		});
		this.removeBlock(block);
	}
	CompositeBlock.removeIntermediateBlocks = function () { // TOO bad
		this.blocks.filter(b => 
			(VarBlock.isPrototypeOf(b)) ||
			(SumBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.add[0]) ||
			(MulBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.over[0])
		).forEach(b => this.removeIntermediateBlock(b));
	}
	CompositeBlock.flatten = function () {
		this.blocks.forEach(b => b.flatten());

		this.blocks.filter(b => CompositeBlock.isPrototypeOf(b)).forEach(b => {
			
			// TODO: ....

		})

	};


	function ASTToGraphes (AST, options) {

		const graphes = {
			main: {},
			init: {}
		};



		return graphes;
	}

	function flatten (graph) {

	}

	function optimize (graph, options) {

	}


	exports = {

	};

}());