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
	Port.datatype = function () {
		return ts.DataTypeGeneric;
	};
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
		r.block = undefined; // set from outside
		this.__clone__ = r;
		return r;
	};
	Port.validate = function () {
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic port datatype: " + this.toString());
		if (this.updaterate == UpdateRateGeneric)
			;//throw new Error("Generic updaterate");
	};
	Port.toString = function () {
		return this.block.toString() + "[" + this.type() + ": " + this.index() + ": " + this.datatype().toString() + "]";
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
		r.i_ports = [];
		r.o_ports = [];
		this.i_ports.forEach(p => {
			const pc = p.clone();
			pc.block == r;
			r.i_ports.push(pc);
		});
		this.o_ports.forEach(p => {
			const pc = p.clone();
			pc.block == r;
			r.o_ports.push(pc);
		});
		this.__clone__ = r;
		return r; 
	};
	Block.flatten = function () {};
	Block.isUseless = function () { return false }; // TODO


	const VarBlock = Object.create(Block);
	VarBlock.operation = "VAR";
	VarBlock.id = "";
	VarBlock.datatype = function () {
		return ts.DataTypeGeneric;
	};
	VarBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
	};
	VarBlock.setOutputUpdaterate = function () {
		this.o_ports[0].updaterate = this.i_ports[0].updaterate;
	};
	VarBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic variable datatype");
		if (this.i_ports[0].datatype() != this.datatype())
			throw new Error("Inconsistent datatypes: " + this.toString());
	};
	VarBlock.toString = function () {
		return "{ VAR: " + this.id + " }";
	}

	
	const MemoryBlock = Object.create(Block);
	MemoryBlock.operation = "MEMORY";
	MemoryBlock.id = "";
	MemoryBlock.writers_N = 0; // E.g.
	MemoryBlock.readers_N = 0; // E.g.
	MemoryBlock.init = function () {
		const nInputs = 1 + 1 + this.writers_N * 2 + this.readers_N; // size, init, writer indexes, writer values, reader indexes.
		const nOutputs = this.readers_N; // reader values
		this.createPorts(nInputs, nOutputs);
		this.datatype = function () {
			return ts.DataTypeGeneric;
		};
		this.o_ports.forEach(p => {
			p.datatype = function () {
				return this.block.datatype();
			};
		});
		this.getInitPort().datatype = () => this.datatype(); //MMM
	};
	MemoryBlock.getSizePort = function () {
		return this.i_ports[0];
	};
	MemoryBlock.getInitPort = function () {
		return this.i_ports[1];
	};
	MemoryBlock.getWriterPorts = function (i) {
		if (this.writers_N <= 0 || i >= this.writers_N)
			throw new Error("Memory has not so many writers");
		return [this.i_ports[2 + i], this.i_ports[2 + this.writers_N + i]];
	};
	MemoryBlock.getReaderPorts = function (i) {
		if (this.readers_N <= 0 || i >= this.readers_N)
			throw new Error("Memory has not so many readers");
		return [this.i_ports[2 + this.writers_N * 2 + i], this.o_ports[i]];
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
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.getSizePort().datatype() != ts.DataTypeInt32)
			throw new Error("Memory size must be int");
		if (this.getInitPort().datatype() != this.datatype())
			throw new Error("Memory init must carry the same datatype");
		for (let i = 0; i < this.readers_N; i++) {
			const rps = this.getReaderPorts(i);
			if (rps[0].datatype() != ts.DataTypeInt32)
				throw new Error("Only int can be used to access memory");
			if (rps[1].datatype() != this.datatype())
				throw new Error("inconsitent Output datatype");
		}
		for (let i = 0; i < this.writers_N; i++) {
			const wps = this.getWriterPorts(i);
			if (wps[0].datatype() != ts.DataTypeInt32)
				throw new Error("Only int can be used to access memory");
			if (wps[1].datatype() != this.datatype())
				throw new Error("Inconsistent input datatype");
		}
		if (this.i_ports[0].updaterate.level > UpdateRateFs.level)
			throw new Error("Memory size must be constant or depenging on fs");
	};
	MemoryBlock.toString = function () {
		return "{ MEM: " + this.id + ":" + this.datatype() + ":" + this.readers_N + ":" + this.writers_N + " }";
	};
	MemoryBlock.clone = function () {
		const r = Object.create(this);
		r.writers = this.writers;
		r.readers = this.readers;
		r.datatype = this.datatype;
		r.init();
		return r;
	};

	// MemoryBlock2 is the new MemoryBlock
	const MemoryBlock2 = Object.create(Block);
	MemoryBlock2.operation = "MEMORY";
	MemoryBlock2.id = "";
	MemoryBlock2.init = function () {
		this.createPorts(2, 0); // size, init
	};
	MemoryBlock2.validate = function () {
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Memory size must be int");
		if (this.i_ports[1].datatype() != this.datatype())
			throw new Error("Memory init must carry the same datatype");
	};

	const MemoryReaderBlock = Object.create(Block);
	MemoryReaderBlock.operation = "MEMORY_READ";
	MemoryReaderBlock.memoryblock = undefined;
	MemoryReaderBlock.init = function () {
		this.createPorts(1, 1); // index, value
		this.o_ports[0].datatype = function () {
			return this.block.memoryblock.datatype();
		};
	};
	MemoryReaderBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Only int can be used to access memory");
	};

	const MemoryWriterBlock = Object.create(Block);
	MemoryWriterBlock.operation = "MEMORY_WRITE";
	MemoryWriterBlock.memoryblock = undefined;
	MemoryWriterBlock.init = function () {
		this.createPorts(2, 0); // index, value
	};
	MemoryWriterBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Only int can be used to access memory");
		if (this.i_ports[1].datatype() != this.memoryblock.datatype())
			throw new Error("Inconsistent datatype");
	};

	const ConstantBlock = Object.create(Block);
	ConstantBlock.operation = "CONSTANT";
	ConstantBlock.value = undefined;
	ConstantBlock.init = function () {
		this.createPorts(0, 1);
		this.datatype = function () {
			return ts.DataTypeGeneric;
		};
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
	};
	ConstantBlock.setOutputUpdaterate = function () {
		this.o_ports[0].updaterate = UpdateRateConstant;
	};
	ConstantBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype() == ts.DataTypeGeneric)
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
		this.o_ports[0].datatype = function () {
			return ts.DataTypeBool;
		};
	};
	LogicalBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype() != ts.DataTypeBool)
				throw new Error("Bad input types");
		});
	};

	const LogicalAndBlock = Object.create(LogicalBlock);
	LogicalAndBlock.operation = "&&";

	const LogicalOrBlock = Object.create(LogicalBlock);
	LogicalOrBlock.operation = "||";
	
	const LogicalNotBlock = Object.create(LogicalBlock);
	LogicalNotBlock.operation = "!";
	LogicalNotBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeBool;
		};
	};

	const BitwiseBlock = Object.create(Block);
	BitwiseBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeInt32;
		}
	};
	BitwiseBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype() != ts.DataTypeInt32)
				throw new Error("Bad input types: " + this.toString());
		});
	};

	const BitwiseOrBlock = Object.create(BitwiseBlock);
	BitwiseOrBlock.operation = "|";
	const BitwiseXorBlock = Object.create(BitwiseBlock);
	BitwiseXorBlock.operation = "^";
	const BitwiseAndBlock = Object.create(BitwiseBlock);
	BitwiseAndBlock.operation = "&";
	const BitwiseNotBlock = Object.create(BitwiseBlock);
	BitwiseNotBlock.operation = "~";
	BitwiseNotBlock.init = function () {
		this.createPorts(1, 1);
	};


	const RelationalBlock = Object.create(Block);
	RelationalBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeBool;
		};
	};
	RelationalBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != this.i_ports[1].datatype())
			throw new Error("Different input types");
	};

	const EqualityBlock = Object.create(RelationalBlock);
	EqualityBlock.operation = "==";
	const InequalityBlock = Object.create(RelationalBlock);
	InequalityBlock.operation = "!=";
	

	const RelationalLGBlock = Object.create(RelationalBlock);
	RelationalLGBlock.validate = function () {
		RelationalBlock.validate.call(this);
		const d = this.i_ports[0].datatype();
		if (d != ts.DataTypeInt32 && d != ts.DataTypeFloat32)
			throw new Error("Only int32 and float32 can be compared");
	};
	const LessBlock = Object.create(RelationalLGBlock);
	LessBlock.operation = "<";
	const GreaterBlock = Object.create(RelationalLGBlock);
	GreaterBlock.operation = ">";
	const LessEqualBlock = Object.create(RelationalLGBlock);
	LessEqualBlock.operation = "<=";
	const GreaterEqualBlock = Object.create(RelationalLGBlock);
	GreaterEqualBlock.operation = ">=";


	const ShiftBlock = Object.create(Block);
	ShiftBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeInt32;
		}
	};
	ShiftBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32 || this.i_ports[1].datatype() != ts.DataTypeInt32)
			throw new Error("Shift accepts int32 only");
	};
	const ShiftLeftBlock = Object.create(ShiftBlock);
	ShiftLeftBlock.operation = "<<";
	const ShiftRightBlock = Object.create(ShiftBlock);
	ShiftRightBlock.operation = ">>";


	const ArithmeticalBlock = Object.create(Block);
	ArithmeticalBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = function () {
			return this.block.i_ports[0].datatype();
		};
	};
	ArithmeticalBlock.validate = function () {
		Block.validate.call(this);
		let b = this.i_ports[0].datatype();
		this.i_ports.forEach(p => {
			if (p.datatype() != ts.DataTypeInt32 && p.datatype() != ts.DataTypeFloat32)
				throw new Error("Invalid input types: " + this.toString());
			if (p.datatype() != b)
				throw new Error("Inconsistent input types: " + this.toString());
		});
	};

	const SumBlock = Object.create(ArithmeticalBlock);
	SumBlock.operation = "+";

	const SubtractionBlock = Object.create(ArithmeticalBlock);
	SubtractionBlock.operation = "-";

	const MulBlock = Object.create(ArithmeticalBlock);
	MulBlock.operation = "*";

	const DivisionBlock = Object.create(ArithmeticalBlock);
	DivisionBlock.operation = "/";

	const UminusBlock = Object.create(ArithmeticalBlock);
	UminusBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return this.i_ports[0].datatype();
		};
	};
	UminusBlock.operation = "-";

	
	const ModuloBlock = Object.create(Block);
	ModuloBlock.operation = "%";
	ModuloBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeInt32;
		};
	};
	ModuloBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32 || this.i_ports[1].datatype() != ts.DataTypeInt32)
			throw new Error ("Invalid input types");
	};

	const CastBlock = Object.create(Block);
	CastBlock.init = function () {
		this.createPorts(1, 1);
	};

	const CastF32Block = Object.create(CastBlock);
	CastF32Block.operation = "(f32)";
	CastF32Block.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeFloat32;
		};
	};
	
	const CastI32Block = Object.create(CastBlock);
	CastI32Block.operation = "(i32)";
	CastI32Block.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeInt32;
		};
	};

	const CastBoolBlock = Object.create(CastBlock);
	CastBoolBlock.operation = "(bool)";
	CastBoolBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return ts.DataTypeBool;
		};
	};

	const CallBlock = Object.create(Block);
	CallBlock.operation = "CALL";
	CallBlock.id = undefined;
	CallBlock.inputs_N = undefined;
	CallBlock.outputs_N = undefined;
	CallBlock.bdef = undefined; // Tmp here. Refers to the called bdef
	CallBlock.init = function () {
		this.createPorts(this.inputs_N, this.outputs_N);
		// Override port datatypes
	};
	CallBlock.setOutputUpdaterate = function () {
		// TODO.
	};
	// Maybe CallBlock needs to be specialized in Extern and block instantiation


	const IfthenelseBlock = Object.create(Block);
	IfthenelseBlock.operation = "???";
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
	Connection.validate = function () {
		if (this.in.datatype() != this.out.datatype())
			throw new Error("Connection got different datatypes");
	};
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
	CompositeBlock.propagateDataTypes = function () {
		this.connections.forEach(c => {
			const i = c.in;
			c.out.datatype = function () {
				return i.datatype();
			};
		});
		this.bdefs.forEach(bd => bd.propagateDataTypes());
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
		/*
		this.blocks.forEach(b => {
			b.o_ports.forEach(p => {
				const cs = this.connections.filter(c => c.out == p)
				if (cs > 1)
					throw new Error("Too many connections toward port: " + p.toString());
				if (cs < 1)
					throw new Error("Too few connections toward port: " + p.toString());
			});
		});
		*/
		this.connections.forEach(c => c.validate());
		this.bdefs.forEach(bd => bd.validate());
	};
	CompositeBlock.toString = function () {
		return "{ CompositeBlock: " + this.id + " }"
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
	CompositeBlock.clone = function () {



	};


	exports["BlockTypes"] = {
		Block,
		VarBlock,
		MemoryBlock, MemoryReaderBlock, MemoryWriterBlock,
		ConstantBlock,
		LogicalBlock, LogicalAndBlock, LogicalOrBlock, LogicalNotBlock,
		BitwiseBlock, BitwiseAndBlock, BitwiseOrBlock, BitwiseXorBlock, BitwiseNotBlock,
		RelationalBlock, RelationalLGBlock, EqualityBlock, InequalityBlock, GreaterBlock, GreaterEqualBlock, LessBlock, LessEqualBlock,
		ShiftBlock, ShiftLeftBlock, ShiftRightBlock,
		ArithmeticalBlock, SumBlock, SubtractionBlock, MulBlock, DivisionBlock, UminusBlock,
		ModuloBlock,
		CastBlock, CastF32Block, CastI32Block, CastBoolBlock,
		CallBlock,
		IfthenelseBlock,
		CompositeBlock
	};

}());