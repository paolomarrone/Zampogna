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

	const ts = require("./types");


	const UpdateRateGeneric = {};
	UpdateRateGeneric.level = undefined;
	const UpdateRateConstant = Object.create(UpdateRateGeneric);
	UpdateRateConstant.level = 0;
	const UpdateRateFs = Object.create(UpdateRateGeneric);
	UpdateRateFs.level = 1;
	const UpdateRateControl = Object.create(UpdateRateGeneric);
	UpdateRateControl.level = 2;
	const UpdateRateAudio = Object.create(UpdateRateGeneric);
	UpdateRateAudio.level = 3;


	const Port = {};
	Port.block = null;
	Port.datatype = ts.DataTypeGeneric;
	Port.updaterate = UpdateRateGeneric;
	Port.type = function () {
		if (this.block.i_ports.includes(this)) return "in";
		if (this.block.o_ports.includes(this)) return "out";
	};
	Port.index = function () {
		if (this.type() == "in")  return this.block.i_ports.indexOf(this);
		if (this.type() == "out") return this.block.o_ports.indexOf(this);
	};
	Port.clone = function () {
		const r = Object.create(this);
		r.block = null; // Set later externally
		r.datatype = this.datatype;
		return r;
	};
	Port.validate = function () {
		if (this.datatype == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.updaterate == UpdateRateGeneric)
			throw new Error("Generic updaterate");
	};
	Port.toString = function () {
		return this.block.toString() + "[" + this.type() + ": " + this.index() + "]";
	};


	const Block = {};
	Block.Port = Port;
	Block.operation = "DEFAULT";
	Block.i_ports = undefined; // Array of Ports
	Block.o_ports = undefined; // Array of Ports
	Block.createPorts = function (i_n, o_n) {
		this.i_ports = new Array(i_n).fill().map(() => Object.create(Port));
		this.o_ports = new Array(o_n).fill().map(() => Object.create(Port));
		this.i_ports.forEach(p => p.block = this);
		this.o_ports.forEach(p => p.block = this);
	};
	Block.init = function () {
		this.createPorts(0, 0);
	};
	Block.setOutputDatatype = function () {
		this.output_ports.forEach(p => p.datatype = ts.DataTypeGeneric);
	};
	Block.setOutputUpdaterate = function () {
		var m = UpdateRateConstant;
		this.i_ports.forEach(p => { if (p.updaterate.level > m.level) m = p.updaterate; });
		this.o_ports.forEach(p => p.updaterate = m);
	};
	Block.validate = function () {
		if (!this.i_ports || !this.o_ports)
			throw new Error("Invalid ports");
		this.i_ports.forEach(p => p.validate());
		this.o_ports.forEach(p => p.validate());
	};
	Block.toString = function () {
		return "{" + this.operation + ":" + this.i_ports.length + ":" + this.o_ports.length + " }";
	};
	Block.clone = function () { // TODO: Fix
		let r = Object.create(this);
		//r.id = this.id + "something"
		r.operation = this.operation;
		r.createPorts.apply(r, this.i_ports.length, this.o_ports.length);
		return r; 
	};
	Block.flatten = function () {};
	Block.isUseless = function () { return false }; // TODO


	const VarBlock = Object.create(Block);
	VarBlock.operation = "VAR";
	VarBlock.id = "";
	VarBlock.datatype = ts.DataTypeGeneric;
	VarBlock.init = function () {
		this.createPorts(1, 1);
	};
	VarBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = this.datatype;
	};
	VarBlock.setOutputUpdaterate = function () {
		this.o_ports[0].updaterate = this.i_ports[0].updaterate;
	};
	VarBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype == ts.DataTypeGeneric)
			throw new Error("Generic variable datatype");
		if (this.i_ports[0].datatype != this.datatype)
			throw new Error("Inconsistent datatypes");
	};

	
	const MemoryBlock = Object.create(Block);
	MemoryBlock.operation = "MEMORY";
	MemoryBlock.id = "";
	MemoryBlock.writers = 0; // E.g.
	MemoryBlock.readers = 0; // E.g.
	MemoryBlock.datatype = ts.DataTypeGeneric;
	MemoryBlock.init = function () {
		const nInputs = 1 + this.writers * 2 + this.readers; // size, writer indexes, writer values, reader indexes.
		const nOutputs = this.readers; // reader values
		this.createPorts(nInputs, nOutputs);
	}
	MemoryBlock.setOutputDatatype = function () {
		this.o_ports.forEach(p => p.datatype = this.datatype);
	};
	MemoryBlock.setOutputUpdaterate = function () {
		var m = UpdateRateConstant;
		for (let i = 1; i < 1 + this.writers * 2; i++)
			if (this.i_ports[i].updaterate.level > m.level)
				m = this.i_ports[i].updaterate;
		this.o_ports.forEach(p => p.updaterate = m);
	};
	MemoryBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		for (let i = 1 + this.writers; i < 1 + this.writers * 2; i++)
			if (this.i_ports[i].datatype != this.datatype)
				throw new Error("Unexpected input datatype");
		if (this.i_ports[0].updaterate.level > UpdateRateFs.level)
			throw new Error("Memory size must be constant or depenging on fs");
	};
	MemoryBlock.clone = function () {
		const r = Object.create(this);
		r.writers = this.writers;
		r.readers = this.readers;
		r.datatype = this.datatype;
		r.init();
		return r;
	};



	const ConstantBlock = Object.create(Block);
	ConstantBlock.operation = "CONSTANT";
	ConstantBlock.datatype = ts.DataTypeGeneric;
	ConstantBlock.value = undefined;
	ConstantBlock.init = function () {
		this.createPorts(0, 1);
	};
	ConstantBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = this.datatype;
	};
	ConstantBlock.setOutputUpdaterate = function () {
		this.o_ports[0].updaterate = UpdateRateConstant;
	};
	ConstantBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.value == undefined)
			throw new Error("Undefined constant");
	};
	ConstantBlock.toString = function () {
		return "{ " + this.value + " }";
	};


	const LogicalBlock = Object.create(Block);
	LogicalBlock.init = function () {
		this.createPorts(2, 1);
	};
	LogicalBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeBool;
	};
	LogicalBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype != ts.DataTypeBool)
				throw new Error("Bad input types");
		});
	};

	const LogicalAndBlock = Object.create(LogicalBlock);
	LogicalAndBlock.operation = "AND";

	const LogicalOrBlock = Object.create(LogicalBlock);
	LogicalOrBlock.operation = "OR";
	
	const LogicalNotBlock = Object.create(LogicalBlock);
	LogicalNotBlock.operation = "NOT";
	LogicalNotBlock.init = function () {
		this.createPorts(1, 1);
	};

	const BitwiseBlock = Object.create(Block);
	BitwiseBlock.init = function () {
		this.createPorts(2, 1);
	};
	BitwiseBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeInt32;
	};
	BitwiseBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype != ts.DataTypeInt32)
				throw new Error("Bad input types");
		})
	};

	const BitwiseOrBlock = Object.create(BitwiseBlock);
	const BitwiseXorBlock = Object.create(BitwiseBlock);
	const BitwiseAndBlock = Object.create(BitwiseBlock);
	const BitwiseNotBlock = Object.create(BitwiseBlock);
	BitwiseNotBlock.init = function () {
		this.createPorts(1, 1);
	};


	const RelationalBlock = Object.create(Block);
	RelationalBlock.init = function () {
		this.createPorts(2, 1);
	};
	RelationalBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeBool;
	};
	RelationalBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype != this.i_ports[1].datatype)
			throw new Error("Different input types");
	};

	const EqualityBlock = Object.create(RelationalBlock);
	EqualityBlock.operation = "EQUAL";
	const InequalityBlock = Object.create(RelationalBlock);
	InequalityBlock.operation = "NOTEQUAL";
	

	const RelationalLGBlock = Object.create(RelationalBlock);
	RelationalLGBlock.validate = function () {
		RelationalBlock.validate.call(this);
		const d = this.i_ports[0].datatype;
		if (d != ts.DataTypeInt32 && d != ts.DataTypeFloat32)
			throw new Error("Only int32 and float32 can be compared");
	};
	const LessBlock = Object.create(RelationalLGBlock);
	LessBlock.operation = "LESS";
	const GreaterBlock = Object.create(RelationalLGBlock);
	GreaterBlock.operation = "GREATER";
	const LessEqualBlock = Object.create(RelationalLGBlock);
	LessEqualBlock.operation = "LESSEQUAL";
	const GreaterEqualBlock = Object.create(RelationalLGBlock);
	GreaterEqualBlock.operation = "GREATEREQUAL";


	const ShiftBlock = Object.create(Block);
	ShiftBlock.init = function () {
		this.createPorts(2, 1);
	};
	ShiftBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeInt32;
	};
	ShiftBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype != ts.DataTypeInt32 || this.i_ports[1].datatype != ts.DataTypeInt32)
			throw new Error("Shift accepts int32 only");
	};
	const ShiftLeftBlock = Object.create(ShiftBlock);
	const ShiftRightBlock = Object.create(ShiftBlock);


	const ArithmeticalBlock = Object.create(Block);
	ArithmeticalBlock.init = function () {
		this.createPorts(2, 1);
	};
	ArithmeticalBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = this.i_ports[0].datatype;
	};
	ArithmeticalBlock.validate = function () {
		Block.validate.call(this);
		let b = this.i_ports[0].datatype;
		this.i_ports.forEach(p => {
			if (p.datatype != ts.DataTypeInt32 || p.datatype != ts.DataTypeFloat32)
				throw new Error("Invalid input types");
			if (p.datatype != b)
				throw new Error("Inconsistent input types");
		});
	};

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

	
	const ModuloBlock = Object.create(Block);
	ModuloBlock.init = function () {
		this.createPorts(2, 1);
	};
	ModuloBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeInt32;
	};
	ModuloBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype != ts.DataTypeInt32 || this.i_ports[1].datatype != ts.DataTypeInt32)
			throw new Error ("Invalid input types");
	};

	const CastBlock = Object.create(Block);
	CastBlock.init = function () {
		this.createPorts(1, 1);
	};

	const CastF32Block = Object.create(CastBlock);
	CastF32Block.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeFloat32;
	};
	
	const CastI32Block = Object.create(CastBlock);
	CastI32Block.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeInt32;
	};

	const CastBoolBlock = Object.create(CastBlock);
	CastBoolBlock.setOutputDatatype = function () {
		this.o_ports[0].datatype = ts.DataTypeBool;
	};


	const IfthenelseBlock = Object.create(Block);
	IfthenelseBlock.nOutputs = undefined;
	IfthenelseBlock.init = function () {
		const nInputs = 1 + this.nOutputs * 2; // Condition, outputs of 1st branch, output of 2nd branch
		this.createPorts(nInputs, this.nOutputs);
	};
	IfthenelseBlock.setOutputDatatype = function () {
		for (let i = 0; i < this.nOutputs; i++)
			this.o_ports[i].datatype = this.i_ports[i + 1].datatype;
	};
	IfthenelseBlock.validate = function () {
		Block.validate.call(this);
		if (this.nOutputs == undefined || this.nOutputs < 1)
			throw new Error("Unexpected outputs number");
		if (this.i_ports[0].datatype != ts.DataTypeBool)
			throw new Error("Ifthenelse condition must return a boolean");
		for (let i = 0; i < this.nOutputs; i++)
			if (this.i_ports[1 + i].datatype != this.i_ports[1 + i + this.nOutputs].datatype)
				throw new Error("Inconsistent input datatypes");
	};
	IfthenelseBlock.flatten = function () {
		// TODO
		// Idea.
		// 1. Flattening: Create nOutputs select blocks depending on the same condition. Then flatten branches. ...
		// 		Maybe we should use decoders and conditional MemoryBlock update too... ?
		// 2. Normalization: (In case of loops where the branch choice is lost). 
		// 		2.1. Create graph1 with condition = T (remove all the selects)
		// 		2.2. Create graph2 with condition = F
		// 		All the blocks that are in the loop and in both graphes are de facto duplicated
		// 		All the blocks that are NOT in the loop and in both graphes don't need to be duplicated
		// 		This "enlarges" the branche blocks so that they can be treated as a black boxes
		// 		Problem: if the duplicated blocks are used elsewhere, we need another select. TODO: define this better
	};


	const Connection = {};
	Connection.in = undefined;  // Port
	Connection.out = undefined; // Port
	Connection.toString = function () {
		return this.in.toString() + " => " + this.out.toString();
	};

	const Property = {};
	Property.of = undefined; // Block
	Property.type = undefined; // "fs" or "init"
	Property.block = undefined; // VarBlock

	const CompositeBlock = Object.create(Block); // A.k.a. Graph
	CompositeBlock.Connection = Connection;
	CompositeBlock.Property = Property;
	CompositeBlock.id = "";
	CompositeBlock.blocks = undefined;        // Array of Blocks
	CompositeBlock.connections = undefined;   // Array of Connections
	CompositeBlock.properties = undefined;    // Array of Properties
	CompositeBlock.bdefs = undefined;         // Array of CompositeBlocks
	CompositeBlock.bdef_father = undefined;   // CompositeBlock
	CompositeBlock.inputs_N = 0;
	CompositeBlock.inputDataTypes = undefined; // Array of Datatypes
	CompositeBlock.outputs_N = 0;
	CompositeBlock.outputDataTypes = undefined; // Array of Datatypes
	CompositeBlock.init = function () {
		this.createPorts(this.inputs_N, this.outputs_N);
		this.blocks = [];
		this.connections = [];
		this.properties = [];
		this.bdefs = [];
		this.inputDataTypes = [];
		this.outputDataTypes = [];
	};
	CompositeBlock.setOutputDatatype = function () {
		// TODO: propgate internally first
		for (let o = 0; o < this.outputs_N; o++) {
			this.o_ports[o].datatype = this.outputDataTypes[o];
		}
	};
	CompositeBlock.setOutputUpdaterate = function () {
		// TODO: propagate internally first
		for (let o = 0; o < this.outputs_N; o++) {
			let c = this.connections.find(c => c.out == this.o_ports[o]);
			


		}
	};
	CompositeBlock.validate = function () {
		Block.validate.call(this);
		this.blocks.forEach(b => b.validate());
	};
	CompositeBlock.toString = function () {
		let r = "{ G " + this.id + "\n";
		this.blocks.forEach(b => r += "\t" + b.toString() + "\n");
		r += "\n";
		this.connections.forEach(c => r += "\t" + c.toString() + "\n");
		r += "\n";
		this.bdefs.forEach(c => r += "\t" + c.toString() + "\n");
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
	};
	CompositeBlock.removeIntermediateBlocks = function () { // TOO bad
		this.blocks.filter(b => 
			(VarBlock.isPrototypeOf(b)) ||
			(SumBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.add[0]) ||
			(MulBlock.isPrototypeOf(b) && b.i_ports.length == 1 && b.over[0])
		).forEach(b => this.removeIntermediateBlock(b));
	};
	CompositeBlock.getPropertyOf = function (block, type) {
		return this.properties.find(p => p.of == block && p.type == type);
	};

	CompositeBlock.flatten = function () {
		this.blocks.forEach(b => b.flatten());

		this.blocks.filter(b => CompositeBlock.isPrototypeOf(b)).forEach(b => {
			
			// TODO: ....

		})

	};


	exports["BlockTypes"] = {
		Block,
		VarBlock,
		MemoryBlock,
		ConstantBlock,
		LogicalBlock, LogicalAndBlock, LogicalOrBlock, LogicalNotBlock,
		BitwiseBlock, BitwiseAndBlock, BitwiseOrBlock, BitwiseXorBlock, BitwiseNotBlock,
		RelationalBlock, RelationalLGBlock, EqualityBlock, InequalityBlock, GreaterBlock, GreaterEqualBlock, LessBlock, LessEqualBlock,
		ShiftBlock, ShiftLeftBlock, ShiftRightBlock,
		ArithmeticalBlock, SumBlock, SubtractionBlock, MulBlock, DivisionBlock, UminusBlock,
		ModuloBlock,
		CastBlock, CastF32Block, CastI32Block, CastBoolBlock,
		IfthenelseBlock,
		CompositeBlock
	};

}());