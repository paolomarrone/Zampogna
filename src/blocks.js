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
	const us = require("./uprates");


	const Port = {};
	Port.block = undefined;
	Port.id = undefined;
	Port.datatype = () => ts.DataTypeGeneric;
	Port.updaterate = () => us.UpdateRateGeneric;
	Port.type = function () {
		if (this.block.i_ports.includes(this)) return "in";
		if (this.block.o_ports.includes(this)) return "out";
	};
	Port.index = function () {
		if (this.type() == "in")  return this.block.i_ports.indexOf(this);
		if (this.type() == "out") return this.block.o_ports.indexOf(this);
	};
	Port.clone = function () {
		if (this.__clone__)
			return this.__clone__;
		const r = Object.create(Port);
		this.__clone__ = r;
		r.block = this.block.clone();
		r.id = this.id;
		r.datatype = this.datatype;
		r.updaterate = this.updaterate;
		return r;
	};
	Port.validate = function () {
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic port datatype: " + this.toString());
		if (this.updaterate() == us.UpdateRateGeneric)
			;//throw new Error("Generic updaterate");
	};
	Port.toString = function () {
		return this.block.toString() + (this.id ? "-" + this.id : "") + "[" + this.type() + ": " + this.index() + ": " + this.datatype().toString() + "]";
	};


	const Block = {};
	Block.Port = Port;
	Block.id = undefined;
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
	Block.setMaxOutputUpdaterate = function () {
		const max = this.i_ports.map(p => p.updaterate()).reduce((u, t) => t.level > u.level ? t : u, us.UpdateRateConstant);
		this.o_ports.forEach(p => p.updaterate = () => max);
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
	Block.clone = function () {
		if (this.__clone__)
			return this.__clone__;
		let r = Object.create(Object.getPrototypeOf(this));
		this.__clone__ = r;
		r.operation = this.operation;
		r.i_ports = [];
		r.o_ports = [];
		this.i_ports.forEach(p => {
			const pc = p.clone();
			r.i_ports.push(pc);
		});
		this.o_ports.forEach(p => {
			const pc = p.clone();
			r.o_ports.push(pc);
		});
		return r; 
	};
	Block.flatten = function () {};
	Block.isUseless = function () { return false }; // TODO


	const VarBlock = Object.create(Block);
	VarBlock.operation = "VAR";
	VarBlock.id = "";
	VarBlock.datatype = () => ts.DataTypeGeneric;
	VarBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate();
		}
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
	};
	VarBlock.clone = function () {
		const r = Block.clone.call(this);
		r.id = this.id;
		r.datatype = this.datatype;
		return r;
	};


	const MemoryBlock = Object.create(Block);
	MemoryBlock.operation = "MEMORY";
	MemoryBlock.id = "";
	MemoryBlock.datatype = () => ts.DataTypeGeneric;
	MemoryBlock.init = function () {
		this.createPorts(2, 0); // size, init
	};
	MemoryBlock.validate = function () {
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Memory size must be int");
		//if (this.i_ports[1].datatype() != this.datatype())
		//	throw new Error("Memory init must carry the same datatype");
	};
	MemoryBlock.clone = function () {
		const r = Block.clone.call(this);
		r.datatype = this.datatype;
		return r;
	};

	const MemoryReaderBlock = Object.create(Block);
	MemoryReaderBlock.operation = "MEMORY_READ";
	MemoryReaderBlock.memoryblock = undefined;
	MemoryReaderBlock.init = function () {
		this.createPorts(1, 1); // index, value
		this.o_ports[0].datatype = function () {
			return this.block.memoryblock.datatype();
		};
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate();
		};
	};
	MemoryReaderBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Only int can be used to access memory");
	};
	MemoryReaderBlock.clone = function () {
		const r = Block.clone.call(this);
		r.memoryblock = this.memoryblock.clone();
		return r;
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
	MemoryWriterBlock.clone = function () {
		const r = Block.clone.call(this);
		r.memoryblock = this.memoryblock.clone();
		return r;
	};

	const ConstantBlock = Object.create(Block);
	ConstantBlock.operation = "CONSTANT";
	ConstantBlock.value = undefined;
	ConstantBlock.datatype = () => ts.DataTypeGeneric;
	ConstantBlock.init = function () {
		this.createPorts(0, 1);
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
		this.o_ports[0].updaterate = () => us.UpdateRateConstant;
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
	ConstantBlock.clone = function () {
		const r = Block.clone.call(this);
		r.value = this.value;
		r.datatype = this.datatype;
		return r;
	};


	const LogicalBlock = Object.create(Block);
	LogicalBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
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
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const BitwiseBlock = Object.create(Block);
	BitwiseBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = () => ts.DataTypeInt32;
		Block.setMaxOutputUpdaterate.call(this);
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
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate();
		};
	};


	const RelationalBlock = Object.create(Block);
	RelationalBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
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
		this.o_ports[0].datatype = () => ts.DataTypeInt32;
		Block.setMaxOutputUpdaterate.call(this);
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
		Block.setMaxOutputUpdaterate.call(this);
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
		Block.setMaxOutputUpdaterate.call(this);
	};
	UminusBlock.operation = "-";

	
	const ModuloBlock = Object.create(Block);
	ModuloBlock.operation = "%";
	ModuloBlock.init = function () {
		this.createPorts(2, 1);
		this.o_ports[0].datatype = () => ts.DataTypeInt32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	ModuloBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32 || this.i_ports[1].datatype() != ts.DataTypeInt32)
			throw new Error ("Invalid input types");
	};

	const CastBlock = Object.create(Block);
	CastBlock.init = function () {
		this.createPorts(1, 1);
		Block.setMaxOutputUpdaterate.call(this);
	};

	const CastF32Block = Object.create(CastBlock);
	CastF32Block.operation = "(f32)";
	CastF32Block.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeFloat32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	
	const CastI32Block = Object.create(CastBlock);
	CastI32Block.operation = "(i32)";
	CastI32Block.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeInt32;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const CastBoolBlock = Object.create(CastBlock);
	CastBoolBlock.operation = "(bool)";
	CastBoolBlock.init = function () {
		this.createPorts(1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const MaxBlock = Object.create(Block);
	MaxBlock.operation = "max";
	MaxBlock.datatype = () => ts.DataTypeGeneric;
	MaxBlock.init = function () {
		// Create ports from outside. out ports must be 1
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
		Block.setMaxOutputUpdaterate.call(this);
	};
	MaxBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic MAX datatype");
		if (this.i_ports.some(p => p.datatype() != this.datatype()))
			throw new Error("Inconsistent MAX datatypes: " + this.toString());
	};

	// Maybe CallBlock needs to be specialized in Extern and block instantiation
	const CallBlock = Object.create(Block);
	CallBlock.operation = "CALL";
	CallBlock.id = undefined;
	CallBlock.inputs_N = undefined;
	CallBlock.outputs_N = undefined;
	CallBlock.bdef = undefined; // Tmp here. Refers to the called bdef
	CallBlock.init = function () {
		this.createPorts(this.inputs_N, this.outputs_N);
		// Override port datatypes
		Block.setMaxOutputUpdaterate.call(this);
	};
	CallBlock.clone = function () {
		const r = Block.clone.call(this);
		r.inputs_N = this.inputs_N;
		r.outputs_N = this.outputs_N;
		r.bdef = this.bdef.clone();
		return r;
	};


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
	Property.validate = function () {
		if (!this.of || !this.block)
			throw new Error("Invalid Property");
	};
	Property.clone = function () {
		const r = Object.create(Property);
		r.of = this.of.clone();
		r.type = this.type;
		r.block = this.block.clone();
		return r;
	};

	const CompositeBlock = Object.create(Block); // A.k.a. Graph
	CompositeBlock.Connection = Connection;
	CompositeBlock.Property = Property;
	CompositeBlock.id = "";
	CompositeBlock.operation = "COMPOSITE_BLOCK";
	CompositeBlock.blocks = undefined;        // Array of Blocks
	CompositeBlock.connections = undefined;   // Array of Connections
	CompositeBlock.properties = undefined;    // Array of Properties
	CompositeBlock.bdefs = undefined;         // Array of CompositeBlocks
	CompositeBlock.bdef_father = undefined;   // CompositeBlock
	CompositeBlock.inputs_N = 0;
	CompositeBlock.outputs_N = 0;
	CompositeBlock.init = function () {
		this.createPorts(this.inputs_N, this.outputs_N);
		this.blocks = [];
		this.connections = [];
		this.properties = [];
		this.bdefs = [];
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
	CompositeBlock.propagateUpdateRates = function () {
		this.connections.forEach(c => {
			const i = c.in;
			c.out.updaterate = function () {
				return i.updaterate();
			};
		});
		this.bdefs.forEach(bd => bd.propagateUpdateRates());
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
		const t = this.properties.map(p => p.block);
		if (t.length != new Set(t).size)
			throw new Error("A block can be used for only one property");
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
		this.blocks.filter(b => CallBlock.isPrototypeOf(b)).forEach(b => {
			const bb = b.bdef.clone();
			bb.flatten();
			this.blocks = this.blocks.concat(bb.blocks);
			this.connections = this.connections.concat(bb.connections);
			this.properties = this.properties.concat(bb.properties);
			b.bdef.clean();

			b.i_ports.forEach((p, i) => {
				const np = bb.i_ports[i];
				const csext = this.connections.filter(c => c.out == p);
				const csint = this.connections.filter(c => c.in == np);
				if (csext.length != 1)
					throw new Error("Found invalid number of connectrions toward input");
				this.connections.splice(this.connections.indexOf(csext[0]), 1);
				csint.forEach(c => c.in = csext[0].in );
			});

			b.o_ports.forEach((p, i) => {
				const np = bb.o_ports[i];
				const csext = this.connections.filter(c => c.in == p); 
				const csint = this.connections.filter(c => c.out == np);
				if (csint.length != 1)
					throw new Error("Found invalid number of connectrions toward output");
				this.connections.splice(this.connections.indexOf(csint[0]), 1);
				csext.forEach(c => c.in = csint[0].in);
			});

			this.blocks.splice(this.blocks.indexOf(b), 1);
		});
		this.bdefs = [];
	};
	CompositeBlock.clone = function () {
		if (this.__clone__)
			return this.__clone__;
		const r = Block.clone.call(this);
		this.__clone__ = r;
		r.id = this.id;
		r.inputs_N = this.inputs_N;
		r.outputs_N = this.outputs_N;
		r.blocks = this.blocks.map(b => b.clone());
		r.connections = this.connections.map(c =>  {
			const rr = Object.create(Connection);
			// To handle implicit inputs
			rr.in  = this.blocks.find(x => x == c.in.block)  ? c.in.clone()  : (c.in.__clone__  || c.in);
			rr.out = this.blocks.find(x => x == c.out.block) ? c.out.clone() : (c.out.__clone__ || c.out);
			return rr;
		});
		r.properties = this.properties.map(p => p.clone()); // properties are granted to refer to local blocks only
		r.bdef_father = this.bdef_father; // Check this
		r.bdefs = this.bdefs.map(bd => bd.clone());
		return r;
	};
	CompositeBlock.clean = function () {
		this.blocks.forEach(b => {
			b.i_ports.forEach(p => p.__clone__ = undefined);
			b.o_ports.forEach(p => p.__clone__ = undefined);
			b.__clone__ = undefined;
		});
		this.bdefs.forEach(bd => bd.clean());
		this.i_ports.forEach(p => p.__clone__ = undefined);
		this.o_ports.forEach(p => p.__clone__ = undefined);
		this.__clone__ = undefined;
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
		MaxBlock,
		CallBlock,
		IfthenelseBlock,
		CompositeBlock
	};

}());