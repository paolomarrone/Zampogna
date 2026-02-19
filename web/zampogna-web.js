(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.zampogna = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
		if (!this.__clone__)
			return this;
		if (this.__clone__ != 1)
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
		//if (this.updaterate() == us.UpdateRateGeneric)
			;//throw new Error("Generic updaterate");
	};
	Port.toString = function () {
		return this.block.toString() + (this.id ? "-" + this.id : "") + "[" + this.type() + ": " + this.index() + ": " + this.datatype().toString() + "]";
	};


	const Block = {};
	Block.Port = Port;
	Block.id = undefined;
	Block.operation = "DEFAULT";
	Block.control_dependencies = undefined;
	Block.parLevel = 0;
	Block.i_ports = undefined; // Array of Ports
	Block.o_ports = undefined; // Array of Ports
	Block.createPorts = function (i_n, o_n) {
		this.i_ports = new Array(i_n).fill().map(() => Object.create(Port));
		this.o_ports = new Array(o_n).fill().map(() => Object.create(Port));
		this.i_ports.forEach(p => p.block = this);
		this.o_ports.forEach(p => p.block = this);
	};
	Block.init = function (i_p_n = 0, o_p_n = 0) {
		this.createPorts(i_p_n, o_p_n);
		this.control_dependencies = new Set();
	};
	Block.setMaxOutputUpdaterate = function () {
		this.o_ports.forEach(p => p.updaterate = function () {
			//return this.block.i_ports.map(p => p.updaterate()).reduce((u, t) => t.level > u.level ? t : u, us.UpdateRateConstant);
			return us.max.apply(null, this.block.i_ports.map(p => p.updaterate()));
		});
	};
	Block.validate = function () {
		if (!this.i_ports || !this.o_ports)
			throw new Error("Invalid ports");
		this.i_ports.forEach(p => p.validate());
		this.o_ports.forEach(p => p.validate());
	};
	Block.setToBeCloned = function () {
		this.__clone__ = 1;
		this.i_ports.forEach(p => p.__clone__ = 1);
		this.o_ports.forEach(p => p.__clone__ = 1);
	};
	Block.clone = function () {
		if (!this.__clone__)
			return this;
		if (this.__clone__ != 1)
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
	Block.toString = function () {
		return "{" + this.operation + ":" + this.i_ports.length + ":" + this.o_ports.length + " }";
	};
	Block.flatten = function () {};


	const VarBlock = Object.create(Block);
	VarBlock.operation = "VAR";
	VarBlock.id = "";
	VarBlock.datatype = () => ts.DataTypeGeneric;
	VarBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate();
		};
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
		Block.init.call(this, 2, 0); // size, init
	};
	MemoryBlock.validate = function () {
		if (this.datatype() == ts.DataTypeGeneric)
			throw new Error("Generic datatype");
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Memory size must be int");
		//if (this.i_ports[1].datatype() != this.datatype())
		//	throw new Error("Memory init must carry the same datatype");
	};
	MemoryBlock.toString = function () {
		return "{ MEM: " + this.id + " }";
	};
	MemoryBlock.clone = function () {
		const r = Block.clone.call(this);
		r.datatype = this.datatype;
		r.id = this.id;
		return r;
	};

	const MemoryReaderBlock = Object.create(Block);
	MemoryReaderBlock.operation = "MEMORY_READ";
	MemoryReaderBlock.memoryblock = undefined;
	MemoryReaderBlock.init = function () {
		Block.init.call(this, 1, 1); // index, value
		this.o_ports[0].datatype = function () {
			return this.block.memoryblock.datatype();
		};
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate(); // Default. Set audio if loop
		};
	};
	MemoryReaderBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Only int can be used to access memory");
		if (this.memoryblock == undefined)
			throw new Error("Undefined memoryblock");
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
		Block.init.call(this, 2, 0); // index, value
	};
	MemoryWriterBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != ts.DataTypeInt32)
			throw new Error("Only int can be used to access memory");
		if (this.i_ports[1].datatype() != this.memoryblock.datatype())
			throw new Error("Inconsistent datatype");
		if (this.memoryblock == undefined)
			throw new Error("Undefined memoryblock");
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
		Block.init.call(this, 0, 1);
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
		Block.init.call(this, 2, 1);
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

	const LogicalOrBlock = Object.create(LogicalBlock);
	LogicalOrBlock.parLevel = 20;
	LogicalOrBlock.operation = "||";

	const LogicalAndBlock = Object.create(LogicalBlock);
	LogicalAndBlock.parLevel = 19;
	LogicalAndBlock.operation = "&&";
	
	const LogicalNotBlock = Object.create(LogicalBlock);
	LogicalNotBlock.operation = "!";
	LogicalNotBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const BitwiseBlock = Object.create(Block);
	BitwiseBlock.init = function () {
		Block.init.call(this, 2, 1);
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
	BitwiseOrBlock.parLevel = 18;
	const BitwiseXorBlock = Object.create(BitwiseBlock);
	BitwiseXorBlock.operation = "^";
	BitwiseXorBlock.parLevel = 17;
	const BitwiseAndBlock = Object.create(BitwiseBlock);
	BitwiseAndBlock.operation = "&";
	BitwiseAndBlock.parLevel = 16;
	const BitwiseNotBlock = Object.create(BitwiseBlock);
	BitwiseNotBlock.operation = "~";
	BitwiseNotBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].updaterate = function () {
			return this.block.i_ports[0].updaterate();
		};
	};


	const RelationalBlock = Object.create(Block);
	RelationalBlock.init = function () {
		Block.init.call(this, 2, 1);
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
	EqualityBlock.parLevel = 15;
	const InequalityBlock = Object.create(RelationalBlock);
	InequalityBlock.operation = "!=";
	InequalityBlock.parLevel = 15;
	

	const RelationalLGBlock = Object.create(RelationalBlock);
	RelationalLGBlock.validate = function () {
		RelationalBlock.validate.call(this);
		const d = this.i_ports[0].datatype();
		if (d != ts.DataTypeInt32 && d != ts.DataTypeFloat32)
			throw new Error("Only int32 and float32 can be compared");
	};
	const LessBlock = Object.create(RelationalLGBlock);
	LessBlock.operation = "<";
	LessBlock.parLevel = 14;
	const GreaterBlock = Object.create(RelationalLGBlock);
	GreaterBlock.operation = ">";
	GreaterBlock.parLevel = 14;
	const LessEqualBlock = Object.create(RelationalLGBlock);
	LessEqualBlock.operation = "<=";
	LessEqualBlock.parLevel = 14;
	const GreaterEqualBlock = Object.create(RelationalLGBlock);
	GreaterEqualBlock.operation = ">=";
	GreaterEqualBlock.parLevel = 14;


	const ShiftBlock = Object.create(Block);
	ShiftBlock.parLevel = 13;
	ShiftBlock.init = function () {
		Block.init.call(this, 2, 1);
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
		Block.init.call(this, 2, 1);
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
	SumBlock.parLevel = 12;

	const SubtractionBlock = Object.create(ArithmeticalBlock);
	SubtractionBlock.operation = "-";
	SubtractionBlock.parLevel = 12;

	const MulBlock = Object.create(ArithmeticalBlock);
	MulBlock.operation = "*";
	MulBlock.parLevel = 11;

	const DivisionBlock = Object.create(ArithmeticalBlock);
	DivisionBlock.operation = "/";
	DivisionBlock.parLevel = 11;

	const UminusBlock = Object.create(ArithmeticalBlock);
	UminusBlock.operation = "-";
	UminusBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = function () {
			return this.block.i_ports[0].datatype();
		};
		Block.setMaxOutputUpdaterate.call(this);
	};

	
	const ModuloBlock = Object.create(Block);
	ModuloBlock.operation = "%";
	ModuloBlock.parLevel = 11;
	ModuloBlock.init = function () {
		Block.init.call(this, 2, 1);
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
		Block.init.call(this, 1, 1);
		Block.setMaxOutputUpdaterate.call(this);
	};

	const CastF32Block = Object.create(CastBlock);
	CastF32Block.operation = "(f32)";
	CastF32Block.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeFloat32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	
	const CastI32Block = Object.create(CastBlock);
	CastI32Block.operation = "(i32)";
	CastI32Block.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeInt32;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const CastBoolBlock = Object.create(CastBlock);
	CastBoolBlock.operation = "(bool)";
	CastBoolBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => ts.DataTypeBool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const MaxBlock = Object.create(Block);
	MaxBlock.operation = "max";
	MaxBlock.datatype = () => ts.DataTypeGeneric;
	MaxBlock.init = function () {
		this.control_dependencies = new Set(); // Would be nice to normalize
		//Block.init.call(this, 0, 0);
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

	const CallBlock = Object.create(Block);
	CallBlock.operation = "CALL";
	CallBlock.id = undefined;
	CallBlock.inputs_N = undefined;
	CallBlock.outputs_N = undefined;
	CallBlock.type = "GENERIC"; // "bdef" or "cdef"
	CallBlock.ref = undefined; // Refers to the called bdef or cblock
	CallBlock.init = function () {
		Block.init.call(this, this.inputs_N, this.outputs_N);
		// Override port datatypes
		Block.setMaxOutputUpdaterate.call(this); // Generic for pre-flattening beauty
	};
	CallBlock.clone = function () {
		const r = Block.clone.call(this);
		r.inputs_N = this.inputs_N;
		r.outputs_N = this.outputs_N;
		r.ref = this.ref.clone();
		r.type = this.type;
		return r;
	};
	CallBlock.toString = function () {
		if (!this.ref)
			return "{ Generic CALL }";
		return "{ CALL: " + this.ref.toString() + " }";
	};


	function parseType (x) {
		if (x == "float32")
			return ts.DataTypeFloat32;
		if (x == "int32")
			return ts.DataTypeInt32;
		if (x == "bool")
			return ts.DataTypeBool;
		throw new Error("Unrecongized type: " + x);
	};
	function parseUpdateRate(x) {
		if (x == "const")
			return us.UpdateRateConstant;
		if (x == "fs")
			return us.UpdateRateFs;
		if (x == "control")
			return us.UpdateRateControl;
		if (x == "audio")
			return us.UpdateRateAudio;
		throw new Error("Unrecongized updaterate");
	};

	const CBlock = Object.create(Block);
	CBlock.operation = "CBLOCK";
	CBlock.id = undefined;
	CBlock.inputs_N = undefined;
	CBlock.outputs_N = undefined;
	CBlock.header = undefined;
	CBlock.funcs = undefined;
	CBlock.init = function (desc) {
		this.id = desc.block_name;
		if (typeof desc.header == 'string')
			this.header = desc.header;
		else if (desc.header instanceof Array)
			this.header = desc.header.join('\n');
		else
			throw new Error("Bad header format");
		this.inputs_N = desc.block_inputs.length;
		this.outputs_N = desc.block_outputs.length;
		this.state = desc.state;
		this.coeffs = desc.coeffs;
		this.prefix = desc.prefix;

		this.funcs = {
			init: desc.init,
			mem_req: desc.mem_req,
			mem_set: desc.mem_set,
			set_sample_rate: desc.set_sample_rate,
			reset_coeffs: desc.reset_coeffs,
			reset_state: desc.reset_state,
			update_coeffs_ctrl: desc.update_coeffs_ctrl,
			update_coeffs_audio: desc.update_coeffs_audio,
			process1: desc.process1,
			setters: []
		};
		desc.block_inputs.forEach((x, i) => {
			if (!x.isParameter)
				return;
			this.funcs.setters.push({
				f_name: desc.prefix + "_set_" + x.name,
				f_inputs: ["coeffs", 'i' + i],
				f_outputs: []
			});
		});
		this.createPorts(this.inputs_N, this.outputs_N);
		Block.setMaxOutputUpdaterate.call(this);
		desc.block_inputs.forEach((x, i) => {
			const dt = parseType(x.type); 
			this.i_ports[i].datatype = () => dt;
		});
		desc.block_outputs.forEach((x, i) => {
			const dt = parseType(x.type); 
			this.o_ports[i].datatype = () => dt;
			if (x.updaterate) {
				const ur = parseUpdateRate(x.updaterate);
				this.o_ports[i].updaterate = () => ur;
			}
		});
	};
	CBlock.clone = function () { // No sense in cloning this
		return this;
	};
	CBlock.toString = function () {
		return "{" + this.operation + ":" + this.id + ":" + this.i_ports.length + ":" + this.o_ports.length + " }";
	};

	const IfthenelseBlock = Object.create(Block);
	IfthenelseBlock.operation = "???";
	IfthenelseBlock.nOutputs = undefined;
	IfthenelseBlock.init = function () {
		const nInputs = 1 + this.nOutputs * 2; // Condition, outputs of 1st branch, output of 2nd branch
		Block.init.call(this, nInputs, this.nOutputs);
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
	Connection.clone = function () {
		if (!this.__clone__)
			return this;
		if (this.__clone__ != 1)
			return this.__clone__;
		const r = Object.create(Connection);
		this.__clone__ = r;
		r.in = this.in.clone();
		r.out = this.out.clone();
		return r;
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
		if (!this.__clone__)
			return this;
		if (this.__clone__ != 1)
			return this.__clone__;
		const r = Object.create(Property);
		this.__clone__ = r;
		r.of = this.of.clone();
		r.type = this.type;
		r.block = this.block.clone();
		return r;
	};
	Property.toString = function () {
		return '[' + this.type + " of " + this.of + " = " + this.block + ']';
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
	CompositeBlock.cdefs = undefined;         // Array of CBlocks
	CompositeBlock.inputs_N = 0;
	CompositeBlock.outputs_N = 0;
	CompositeBlock.init = function () {
		Block.init.call(this, this.inputs_N, this.outputs_N);
		this.blocks = [];
		this.connections = [];
		this.properties = [];
		this.bdefs = [];
		this.cdefs = [];
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
			const cc = c;
			c.out.updaterate = function () {
				return cc.in.updaterate();
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
	CompositeBlock.flatten = function () {
		this.blocks.filter(b => CallBlock.isPrototypeOf(b) && b.type == 'bdef').forEach(b => {
			b.ref.setToBeCloned();
			const bb = b.ref.clone();
			bb.flatten();
			this.blocks = this.blocks.concat(bb.blocks);
			this.connections = this.connections.concat(bb.connections);
			this.properties = this.properties.concat(bb.properties);
			this.cdefs = this.cdefs.concat(bb.cdefs);
			b.ref.clean();

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
	/*
		Instructions to clone:
			call setToBeCloned
			call clone
			call clean
	*/
	CompositeBlock.setToBeCloned = function () {
		Block.setToBeCloned.call(this);
		this.blocks.forEach(b => b.setToBeCloned());
		this.connections.forEach(c => c.__clone__ = 1);
		this.properties.forEach(p => p.__clone__ = 1);
		this.bdefs.forEach(bdef => bdef.setToBeCloned());
	};
	CompositeBlock.clone = function () {
		if (!this.__clone__)
			return this;
		if (this.__clone__ != 1)
			return this.__clone__;
		const r = Block.clone.call(this);
		this.__clone__ = r;
		r.id = this.id;
		r.inputs_N = this.inputs_N;
		r.outputs_N = this.outputs_N;
		r.blocks = this.blocks.map(b => b.clone());
		r.connections = this.connections.map(c => c.clone());
		r.properties = this.properties.map(p => p.clone());
		r.bdef_father = this.bdef_father.clone();
		r.bdefs = this.bdefs.map(bd => bd.clone());
		r.cdefs = this.cdefs; // no need to clone
		return r;
	};
	CompositeBlock.clean = function () {
		this.blocks.forEach(b => {
			b.i_ports.forEach(p => delete p.__clone__);
			b.o_ports.forEach(p => delete p.__clone__);
			delete b.__clone__;
		});
		this.connections.forEach(c => delete c.__clone__);
		this.properties.forEach(p => delete p.__clone__);
		this.bdefs.forEach(bd => bd.clean());
		this.i_ports.forEach(p => delete p.__clone__);
		this.o_ports.forEach(p => delete p.__clone__);
		delete this.__clone__;
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
		CBlock,
		IfthenelseBlock,
		CompositeBlock
	};

}());
},{"./types":8,"./uprates":9}],2:[function(require,module,exports){
(function (process){(function (){
/* parser generated by jison 0.4.18 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var grammar = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,3],$V1=[1,7],$V2=[1,34],$V3=[1,9],$V4=[1,32],$V5=[1,25],$V6=[1,24],$V7=[1,26],$V8=[1,27],$V9=[1,31],$Va=[1,39],$Vb=[1,40],$Vc=[1,41],$Vd=[1,42],$Ve=[1,35],$Vf=[1,36],$Vg=[1,37],$Vh=[1,38],$Vi=[1,9,13,16,17,27,54,55,61,62,65,67,68,69,70,72,73,74,75],$Vj=[1,44],$Vk=[11,14,19,71],$Vl=[9,11,14,19,31,71],$Vm=[9,11,14,19,30,31,33,71],$Vn=[1,48],$Vo=[9,11,14,19,30,31,33,35,71],$Vp=[1,49],$Vq=[9,11,14,19,30,31,33,35,37,71],$Vr=[1,50],$Vs=[9,11,14,19,30,31,33,35,37,39,71],$Vt=[1,51],$Vu=[9,11,14,19,30,31,33,35,37,39,41,71],$Vv=[1,52],$Vw=[1,53],$Vx=[9,11,14,19,30,31,33,35,37,39,41,43,44,71],$Vy=[1,54],$Vz=[1,55],$VA=[1,56],$VB=[1,57],$VC=[9,11,14,19,30,31,33,35,37,39,41,43,44,46,47,48,49,71],$VD=[1,58],$VE=[1,59],$VF=[9,11,14,19,30,31,33,35,37,39,41,43,44,46,47,48,49,51,52,71],$VG=[1,60],$VH=[1,61],$VI=[9,11,14,19,30,31,33,35,37,39,41,43,44,46,47,48,49,51,52,54,55,71],$VJ=[1,62],$VK=[1,63],$VL=[1,64],$VM=[9,11,14,19,30,31,33,35,37,39,41,43,44,46,47,48,49,51,52,54,55,57,58,59,71],$VN=[1,65],$VO=[9,11,14,19,30,31,33,35,37,39,41,43,44,46,47,48,49,51,52,54,55,57,58,59,64,71],$VP=[2,61],$VQ=[1,71],$VR=[13,72],$VS=[1,81],$VT=[9,30,33,35,37,39,41,43,44,46,47,48,49,51,52,54,55,57,58,59,64],$VU=[2,56],$VV=[2,57];
var parser = {trace: function trace () { },
yy: {},
symbols_: {"error":2,"program":3,"statements":4,"statement":5,"block_definition":6,"memory_declaration":7,"assignment":8,"END":9,"exprs":10,"=":11,"id":12,"(":13,")":14,"block":15,"MEM":16,"[":17,"expr":18,"]":19,"type":20,"if_then_elses":21,"IF":22,"branch":23,"elseifs":24,"ELSE":25,"{":26,"}":27,"conditional_expr":28,"logical_or_expr":29,"?":30,":":31,"logical_and_expr":32,"||":33,"inclusive_or_expr":34,"&&":35,"exclusive_or_expr":36,"|":37,"and_expr":38,"^":39,"equality_expr":40,"&":41,"relational_expr":42,"==":43,"!=":44,"shift_expr":45,"<":46,"<=":47,">":48,">=":49,"additive_expr":50,"<<":51,">>":52,"multiplicative_expr":53,"+":54,"-":55,"unary_expr":56,"*":57,"/":58,"%":59,"postfix_expr":60,"!":61,"~":62,"primary_expr":63,".":64,"_":65,"constant":66,"CONSTANT_INT32":67,"CONSTANT_FLOAT32":68,"CONSTANT_TRUE":69,"CONSTANT_FALSE":70,",":71,"ID":72,"TYPE_INT32":73,"TYPE_FLOAT32":74,"TYPE_BOOL":75,"$accept":0,"$end":1},
terminals_: {2:"error",9:"END",11:"=",13:"(",14:")",16:"MEM",17:"[",19:"]",22:"IF",25:"ELSE",26:"{",27:"}",30:"?",31:":",33:"||",35:"&&",37:"|",39:"^",41:"&",43:"==",44:"!=",46:"<",47:"<=",48:">",49:">=",51:"<<",52:">>",54:"+",55:"-",57:"*",58:"/",59:"%",61:"!",62:"~",64:".",65:"_",67:"CONSTANT_INT32",68:"CONSTANT_FLOAT32",69:"CONSTANT_TRUE",70:"CONSTANT_FALSE",71:",",72:"ID",73:"TYPE_INT32",74:"TYPE_FLOAT32",75:"TYPE_BOOL"},
productions_: [0,[3,1],[4,2],[4,0],[5,1],[5,1],[5,1],[5,1],[6,7],[6,6],[7,7],[8,4],[8,4],[8,4],[21,8],[23,1],[24,7],[24,0],[15,3],[18,1],[28,1],[28,5],[29,1],[29,3],[32,1],[32,3],[34,1],[34,3],[36,1],[36,3],[38,1],[38,3],[40,1],[40,3],[40,3],[42,1],[42,3],[42,3],[42,3],[42,3],[45,1],[45,3],[45,3],[50,1],[50,3],[50,3],[53,1],[53,3],[53,3],[53,3],[56,1],[56,2],[56,2],[56,2],[56,2],[60,1],[60,3],[60,4],[60,4],[60,4],[60,3],[63,1],[63,2],[63,1],[63,3],[63,1],[63,3],[66,1],[66,1],[66,1],[66,1],[10,1],[10,3],[12,1],[20,1],[20,1],[20,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:

                            this.$ = {
                                name: 'PROGRAM',
                                statements: $$[$0]
                            }; 
                            return this.$; 
                        
break;
case 2:

                            this.$ = $$[$0-1].concat($$[$0]); 
                        
break;
case 3:

                            this.$ = []
                        
break;
case 4: case 5: case 6: case 19: case 20: case 22: case 24: case 26: case 28: case 30: case 40: case 50: case 52: case 55: case 65:
 this.$ = $$[$0] 
break;
case 7: case 17:
 this.$ = [] 
break;
case 8:

                            this.$ = {
                                name: 'BLOCK_DEFINITION',
                                id: $$[$0-4],
                                inputs: $$[$0-2],
                                outputs: $$[$0-6],
                                statements: $$[$0].statements
                            }
                        
break;
case 9:

                            this.$ = {
                                name: 'BLOCK_DEFINITION',
                                id: $$[$0-3],
                                inputs: [],
                                outputs: $$[$0-5],
                                statements: $$[$0].statements
                            }
                        
break;
case 10:

                            this.$ = {
                                name: 'MEMORY_DECLARATION',
                                type: $$[$0-2],
                                size: $$[$0-4],
                                id: $$[$0-1]
                            }
                        
break;
case 11:

                            this.$ = {
                                name: 'ASSIGNMENT',
                                type: 'EXPR',
                                expr: $$[$0-1],
                                outputs: $$[$0-3]
                            }
                        
break;
case 12:

                            this.$ = {
                                name: 'ASSIGNMENT',
                                type: 'IF_THEN_ELSES',
                                expr: $$[$0-1],
                                outputs: $$[$0-3]
                            }
                        
break;
case 13:

                            this.$ = {
                                name: 'ASSIGNMENT',
                                type: 'ANONYMOUS_BLOCK',
                                expr: $$[$0-1],
                                outputs: $$[$0-3]
                            }
                        
break;
case 14:

                            $$[$0-3].condition = $$[$0-5],
                            this.$ = {
                                name: 'IF_THEN_ELSES',
                                branches: [$$[$0-3], $$[$0-2], $$[$0]].flat()
                            }
                        
break;
case 15:

                            this.$ = {
                                name: 'BRANCH',
                                condition: null, // expr or null if else
                                block: $$[$0]
                            }
                        
break;
case 16:

                            $$[$0].condition = $$[$0-2]
                            this.$ = $$[$0-6].concat($$[$0])
                        
break;
case 18:

                            this.$ = {
                                name: 'BLOCK',
                                statements: $$[$0-1]
                            }
                        
break;
case 21:

                            this.$ = {
                                name: 'INLINE_IF_THEN_ELSE',
                                args: [$$[$0-4], $$[$0-2], $$[$0]]
                            }
                        
break;
case 23:

                            this.$ = {
                                name: 'LOGICAL_OR_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 25:

                            this.$ = {
                                name: 'LOGICAL_AND_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 27:

                            this.$ = {
                                name: 'BITWISE_INCLUSIVE_OR_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 29:

                            this.$ = {
                                name: 'BITWISE_EXCLUSIVE_OR_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 31:

                            this.$ = {
                                name: 'BITWISE_AND_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 32: case 35: case 43: case 46:

                            this.$ = $$[$0]
                        
break;
case 33:

                            this.$ = {
                                name: 'EQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 34:

                            this.$ = {
                                name: 'NOTEQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 36:

                            this.$ = {
                                name: 'LESS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 37:

                            this.$ = {
                                name: 'LESSEQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 38:

                            this.$ = {
                                name: 'GREATER_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 39:

                            this.$ = {
                                name: 'GREATEREQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 41:

                            this.$ = {
                                name: 'SHIFT_LEFT_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 42:

                            this.$ = {
                                name: 'SHIFT_RIGHT_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 44:

                            this.$ = {
                                name: 'PLUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 45:

                            this.$ = {
                                name: 'MINUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 47:

                            this.$ = {
                                name: 'TIMES_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 48:

                            this.$ = {
                                name: 'DIV_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 49:

                            this.$ = {
                                name: 'MODULO_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 51:

                            this.$ = {
                                name: 'UMINUS_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 53:

                            this.$ = {
                                name: 'LOGICAL_NOT_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 54:

                            this.$ = {
                                name: 'BITWISE_NOT_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 56:

                            this.$ = {
                                name: 'CALL_EXPR',
                                id: $$[$0-2],
                                outputs_N: 0,
                                args: []
                            }
                        
break;
case 57:

                            this.$ = {
                                name: 'CALL_EXPR',
                                id: $$[$0-3],
                                outputs_N: 0,
                                args: $$[$0-1]
                            }
                        
break;
case 58:

                            this.$ = {
                                name: 'CAST_EXPR',
                                type: $$[$0-3],
                                args: $$[$0-1]
                            }
                        
break;
case 59:

                            this.$ = {
                                name: 'MEMORY_ELEMENT',
                                id: $$[$0-3],
                                args: [$$[$0-1]]
                            }
                        
break;
case 60:

                            this.$ = {
                                name: 'PROPERTY',
                                expr: $$[$0-2],
                                property_id: $$[$0]
                            }
                        
break;
case 61:
 
                            this.$ = {
                                name: 'VARIABLE',
                                id: $$[$0]
                            } 
                        
break;
case 62:

                            this.$ = {
                                name: 'VARIABLE',
                                id: $$[$0],
                                declaredType: $$[$0-1]
                            }
                        
break;
case 63:
 this.$ = { name: 'DISCARD' } 
break;
case 64:

                            this.$ = {
                                name: 'ARRAY_CONST',
                                args: $$[$0-1]
                            }
                        
break;
case 66:
 this.$ = $$[$0-1] 
break;
case 67:
 
                            this.$ = { name: 'CONSTANT', type: 'INT32', val: parseInt(yytext) };
                        
break;
case 68:
 this.$ = { name: 'CONSTANT', type: 'FLOAT32', val: parseFloat(yytext) };
                        
break;
case 69:
 
                            this.$ = { name: 'CONSTANT', type:'BOOL', val: true }; 
                        
break;
case 70:
 
                            this.$ = { name: 'CONSTANT', type:'BOOL', val: false }; 
                        
break;
case 71:
 this.$ = [$$[$0]] 
break;
case 72:
 
                            this.$ = $$[$0-2].concat($$[$0]) 
                        
break;
case 73:
 
                            this.$ = yytext; 
                        
break;
case 74:

                            this.$ = 'TYPE_INT32'
                        
break;
case 75:

                            this.$ = 'TYPE_FLOAT32'
                        
break;
case 76:

                            this.$ = 'TYPE_BOOL'
                        
break;
}
},
table: [o([1,9,13,16,17,54,55,61,62,65,67,68,69,70,72,73,74,75],$V0,{3:1,4:2}),{1:[3]},{1:[2,1],5:3,6:4,7:5,8:6,9:$V1,10:8,12:29,13:$V2,16:$V3,17:$V4,18:10,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($Vi,[2,2]),o($Vi,[2,4]),o($Vi,[2,5]),o($Vi,[2,6]),o($Vi,[2,7]),{11:[1,43],71:$Vj},{17:[1,45]},o($Vk,[2,71]),o($Vl,[2,19]),o($Vl,[2,20],{30:[1,46],33:[1,47]}),o($Vm,[2,22],{35:$Vn}),o($Vo,[2,24],{37:$Vp}),o($Vq,[2,26],{39:$Vr}),o($Vs,[2,28],{41:$Vt}),o($Vu,[2,30],{43:$Vv,44:$Vw}),o($Vx,[2,32],{46:$Vy,47:$Vz,48:$VA,49:$VB}),o($VC,[2,35],{51:$VD,52:$VE}),o($VF,[2,40],{54:$VG,55:$VH}),o($VI,[2,43],{57:$VJ,58:$VK,59:$VL}),o($VM,[2,46]),o($VM,[2,50],{64:$VN}),{12:29,13:$V2,17:$V4,20:30,60:66,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,60:67,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,60:68,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,60:69,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($VO,[2,55]),o($VO,$VP,{13:[1,70],17:$VQ}),{12:73,13:[1,72],72:$Ve},o($VO,[2,63]),{10:74,12:29,13:$V2,17:$V4,18:10,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($VO,[2,65]),{12:29,13:$V2,17:$V4,18:75,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o([9,11,13,14,17,19,30,31,33,35,37,39,41,43,44,46,47,48,49,51,52,54,55,57,58,59,64,71],[2,73]),o($VR,[2,74]),o($VR,[2,75]),o($VR,[2,76]),o($VO,[2,67]),o($VO,[2,68]),o($VO,[2,69]),o($VO,[2,70]),{12:76,13:$V2,15:79,17:$V4,18:77,20:30,21:78,22:[1,80],26:$VS,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,18:82,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,18:83,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,18:84,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,32:85,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,34:86,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,36:87,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,38:88,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,40:89,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,42:90,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,42:91,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,45:92,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,45:93,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,45:94,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,45:95,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,50:96,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,50:97,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,53:98,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,53:99,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,54:$V5,55:$V6,56:100,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,54:$V5,55:$V6,56:101,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,54:$V5,55:$V6,56:102,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:103,72:$Ve},o($VM,[2,51],{64:$VN}),o($VM,[2,52],{64:$VN}),o($VM,[2,53],{64:$VN}),o($VM,[2,54],{64:$VN}),{10:105,12:29,13:$V2,14:[1,104],17:$V4,18:10,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,18:106,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{10:107,12:29,13:$V2,17:$V4,18:10,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($VO,[2,62]),{19:[1,108],71:$Vj},{14:[1,109]},o($VT,$VP,{13:[1,110],17:$VQ}),{9:[1,111]},{9:[1,112]},{9:[1,113]},{13:[1,114]},o([9,13,16,17,27,54,55,61,62,65,67,68,69,70,72,73,74,75],$V0,{4:115}),o($Vk,[2,72]),{19:[1,116]},{31:[1,117]},o($Vm,[2,23],{35:$Vn}),o($Vo,[2,25],{37:$Vp}),o($Vq,[2,27],{39:$Vr}),o($Vs,[2,29],{41:$Vt}),o($Vu,[2,31],{43:$Vv,44:$Vw}),o($Vx,[2,33],{46:$Vy,47:$Vz,48:$VA,49:$VB}),o($Vx,[2,34],{46:$Vy,47:$Vz,48:$VA,49:$VB}),o($VC,[2,36],{51:$VD,52:$VE}),o($VC,[2,37],{51:$VD,52:$VE}),o($VC,[2,38],{51:$VD,52:$VE}),o($VC,[2,39],{51:$VD,52:$VE}),o($VF,[2,41],{54:$VG,55:$VH}),o($VF,[2,42],{54:$VG,55:$VH}),o($VI,[2,44],{57:$VJ,58:$VK,59:$VL}),o($VI,[2,45],{57:$VJ,58:$VK,59:$VL}),o($VM,[2,47]),o($VM,[2,48]),o($VM,[2,49]),o($VO,[2,60]),o($VO,$VU),{14:[1,118],71:$Vj},{19:[1,119]},{14:[1,120],71:$Vj},o($VO,[2,64]),o($VO,[2,66]),{10:121,12:29,13:$V2,14:[1,122],17:$V4,18:10,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($Vi,[2,11]),o($Vi,[2,12]),o($Vi,[2,13]),{12:29,13:$V2,17:$V4,18:123,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{5:3,6:4,7:5,8:6,9:$V1,10:8,12:29,13:$V2,16:$V3,17:$V4,18:10,20:30,27:[1,124],28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{20:125,73:$Vf,74:$Vg,75:$Vh},{12:29,13:$V2,17:$V4,20:30,28:126,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},o($VO,$VV),o($VO,[2,59]),o($VO,[2,58]),{14:[1,127],71:$Vj},o($VT,$VU,{15:128,26:$VS}),{14:[1,129]},o([1,9,13,16,17,25,27,54,55,61,62,65,67,68,69,70,72,73,74,75],[2,18]),{12:130,72:$Ve},o($Vl,[2,21]),o($VT,$VV,{15:131,26:$VS}),o($Vi,[2,9]),{15:133,23:132,26:$VS},{9:[1,134]},o($Vi,[2,8]),{24:135,25:[2,17]},o([9,25],[2,15]),o($Vi,[2,10]),{25:[1,136]},{15:133,22:[1,138],23:137,26:$VS},{9:[2,14]},{13:[1,139]},{12:29,13:$V2,17:$V4,18:140,20:30,28:11,29:12,32:13,34:14,36:15,38:16,40:17,42:18,45:19,50:20,53:21,54:$V5,55:$V6,56:22,60:23,61:$V7,62:$V8,63:28,65:$V9,66:33,67:$Va,68:$Vb,69:$Vc,70:$Vd,72:$Ve,73:$Vf,74:$Vg,75:$Vh},{14:[1,141]},{15:133,23:142,26:$VS},{25:[2,16]}],
defaultActions: {137:[2,14],142:[2,16]},
parseError: function parseError (str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function(match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex () {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin (condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState () {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules () {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState (n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState (condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* inline comment */
break;
case 1:/* pause comment */
break;
case 2:return ">>"
break;
case 3:return "<<"
break;
case 4:return ">="
break;
case 5:return "<="
break;
case 6:return 54
break;
case 7:return 55
break;
case 8:return 57
break;
case 9:return 58
break;
case 10:return 59
break;
case 11:return "<"
break;
case 12:return ">"
break;
case 13:return "=="
break;
case 14:return "!="
break;
case 15:return "!"
break;
case 16:return "&&"
break;
case 17:return "||"
break;
case 18:return "&"
break;
case 19:return "|"
break;
case 20:return "^"
break;
case 21:return "~"
break;
case 22:return 11
break;
case 23:return 26
break;
case 24:return 27
break;
case 25:return 13
break;
case 26:return 14
break;
case 27:return 71
break;
case 28:return 17
break;
case 29:return 19
break;
case 30:return 68
break;
case 31:return 67
break;
case 32:return 69
break;
case 33:return 70
break;
case 34:return 73
break;
case 35:return 74
break;
case 36:return 75
break;
case 37:return 65
break;
case 38:return 16
break;
case 39:return 22
break;
case 40:return "ELSE"
break;
case 41:return 30
break;
case 42:return 31
break;
case 43:return 64
break;
case 44:return 72
break;
case 45:return 9
break;
case 46:return 9
break;
case 47:/* ignore bad chars */
break;
}
},
rules: [/^(?:#[^\n\r]*)/,/^(?:\.\.\.[^\n^\n]*[\n\r]+)/,/^(?:>>)/,/^(?:<<)/,/^(?:>=)/,/^(?:<=)/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:<)/,/^(?:>)/,/^(?:==)/,/^(?:!=)/,/^(?:!)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:&)/,/^(?:\|)/,/^(?:\^)/,/^(?:~)/,/^(?:=)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:,)/,/^(?:\[)/,/^(?:\])/,/^(?:((0|[1-9][0-9]*)\.[0-9]+([eE](\+|-)?[0-9]+)?))/,/^(?:((0|[1-9][0-9]*)([eE](\+|-)?[0-9]+)?))/,/^(?:true\b)/,/^(?:false\b)/,/^(?:int\b)/,/^(?:float\b)/,/^(?:bool\b)/,/^(?:_\b)/,/^(?:mem\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:\?)/,/^(?::)/,/^(?:\.)/,/^(?:([_a-zA-Z][_a-zA-Z0-9]*))/,/^(?:[\n\r;]+)/,/^(?:$)/,/^(?:[ \t\v\f]+)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = grammar;
exports.Parser = grammar.Parser;
exports.parse = function () { return grammar.parse.apply(grammar, arguments); };
exports.main = function commonjsMain (args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this)}).call(this,require('_process'))
},{"_process":35,"fs":13,"path":34}],3:[function(require,module,exports){
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
	const bs = require("./blocks").BlockTypes;
	const us = require("./uprates");

	function ASTToGraph (root, options, cblock_descs = []) {

		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = "0";
		bdef.bdef_father = undefined;
		bdef.inputs_N = 1; // fs
		bdef.outputs_N = 0;
		bdef.init();
		bdef.i_ports[0].datatype = () => ts.DataTypeFloat32;
		bdef.i_ports[0].updaterate = () => us.UpdateRateFs;
		bdef.i_ports[0].id = "fs";

		(function create_fs (bdef) {
			const fs = Object.create(bs.VarBlock);
			fs.id = "fs";
			fs.datatype = () => ts.DataTypeFloat32;
			fs.init();
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[0];
			c.out = fs.i_ports[0];
			bdef.blocks.push(fs);
			bdef.connections.push(c);
		})(bdef);

		(function register_cblocks (bdef) {
			cblock_descs.forEach(d => {
				const c = Object.create(bs.CBlock);
				c.init(d);
				bdef.cdefs.push(c);
			});
		})(bdef);

		convert_statements(root.statements, bdef);

		bdef.propagateDataTypes();

		(function resolve_block_calls (bdef) {
			bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b)).forEach(b => {
				resolve_block_call(b, bdef);
			});
			bdef.bdefs.forEach(bd => resolve_block_calls(bd));
		})(bdef);

		(function validate (bdef) {
			bdef.validate();
			check_recursive_calls(bdef);
		})(bdef);

		return bdef;
	}

	function convert_block_definition (bdef_node, bdef_father) {
		
		const bdef = Object.create(bs.CompositeBlock);
		bdef.id = bdef_node.id;
		bdef.bdef_father = bdef_father;
		bdef.inputs_N = bdef_node.inputs.length;
		bdef.outputs_N = bdef_node.outputs.length;
		bdef.init();
		bdef_node.inputs.forEach((input, i) => {
			const t = getDataType(input.declaredType);
			bdef.i_ports[i].datatype = () => t;
		});
		bdef_node.outputs.forEach((output, i) => {
			const t = getDataType(output.declaredType);
			bdef.o_ports[i].datatype = () => t;
		});

		// Adding input/outputs
		bdef_node.inputs.forEach((p, i) => {
			const v = Object.create(bs.VarBlock);
			v.id = p.id;
			const t = getDataType(p.declaredType);
			v.datatype = () => t;
			v.init();

			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[i];
			c.out = v.i_ports[0];

			bdef.i_ports[i].id = p.id;
			bdef.blocks.push(v);
			bdef.connections.push(c);
		});
		bdef_node.outputs.forEach((p, i) => {
			const v = Object.create(bs.VarBlock);
			v.id = p.id;
			const t = getDataType(p.declaredType);
			v.datatype = () => t;
			v.init();

			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = v.o_ports[0];
			c.out = bdef.o_ports[i];

			bdef.o_ports[i].id = p.id;
			bdef.blocks.push(v);
			bdef.connections.push(c);
		});
		convert_statements(bdef_node.statements, bdef);

		return bdef;
	}

	function convert_statements (statements, bdef) {

		// Adding variables
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => {
			s.outputs.filter(o => o.name == 'VARIABLE').forEach(o => {
				if (bdef.blocks.some(bb => bb.id == o.id)) // is output
					return;
				const v = Object.create(bs.VarBlock);
				v.id = o.id
				const t = getDataType(o.declaredType);
				v.datatype = () => t;
				v.init();
				bdef.blocks.push(v);
			});
		});
		
		// Adding MEMORY DECLARATIONS blocks
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = Object.create(bs.MemoryBlock);
			m.id = s.id;
			const t = getDataType(s.type);
			m.init();
			m.datatype = () => t;
			//m.i_ports[1].datatype = () => t;
			bdef.blocks.push(m);
		});

		// Adding inner block definitions
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(bdef_n => {
			bdef.bdefs.push(convert_block_definition(bdef_n, bdef));
		});

		// Connect memory size expr
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => {
			const m = findMemById(s.id, bdef).r;
			const size_expr_ports = convert_expr(s.size, bdef);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = size_expr_ports[1][0];
			c.out = m.i_ports[0];
			bdef.connections.push(c);
		});

		// Adding expression blocks and connections
		statements.filter(s => s.name == 'ASSIGNMENT').forEach((s) => {
			switch (s.type) {
			case 'ANONYMOUS_BLOCK': {
				throw new Error("Not imeplemented yet");
			}
			case 'IF_THEN_ELSE': {
				throw new Error("Not imeplemented yet");
			}
			case 'EXPR': {
				const expr_ports = convert_expr(s.expr, bdef);
				s.outputs.forEach((o, oi) => {
					switch (o.name) {
					case 'VARIABLE': {
						const v = findVarById(o.id, bdef).r;
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_ports[1][oi];
						c.out = v.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'DISCARD': {
						// Nothing to do
						break;
					}
					case 'PROPERTY': {
						const r = convert_property_left(o, bdef);
						if (bdef.connections.find(c => c.out == r.p.i_ports[0]))
							throw new Error("Property assiged multiple times");
						const c = Object.create(bs.CompositeBlock.Connection);
						c.in = expr_ports[1][oi];
						c.out = r.p.i_ports[0];
						bdef.connections.push(c);
						break;
					}
					case 'MEMORY_ELEMENT': {
						const m = findMemById(o.id, bdef).r;
						const mw = Object.create(bs.MemoryWriterBlock);
						mw.memoryblock = m;
						mw.init();
						const index_expr_ports = convert_expr(o.args[0], bdef);
						const ci = Object.create(bs.CompositeBlock.Connection);
						const cv = Object.create(bs.CompositeBlock.Connection);
						ci.in  = index_expr_ports[1][0];
						ci.out = mw.i_ports[0];
						cv.in  = expr_ports[1][oi];
						cv.out = mw.i_ports[1];
						bdef.blocks.push(mw);
						bdef.connections.push(ci);
						bdef.connections.push(cv);
						break;
					}
					}
				});
				break;
			}
			}
		});
	}

	function convert_property_left (property_node, bdef) {
		let x = property_node.expr;
		if (x.name == 'VARIABLE') {
			const r = findVarById(x.id, bdef) || findMemById(x.id, bdef);
			return { p: convert_property(r.r, property_node.property_id, r.bd), bdef: r.bd };
		}
		else if (x.name == 'PROPERTY') {
			const r = convert_property_left(x, bdef);
			return { p: convert_property(r.p, property_node.property_id, bdef), bdef: r.bdef };
		}
	}

	function convert_property (block, property, bdef) {
		const props = bdef.properties.filter(p => p.of == block && p.type == property);
		if (props.length == 0) {
			const v = Object.create(bs.VarBlock);
			v.id = (block.id || block.value || block.operation) + "." + property;
			v.init();
			if (property == 'fs') {
				v.datatype = () => ts.DataTypeFloat32;
				v.i_ports[0].datatype = () => ts.DataTypeFloat32; // Check this
			}
			else {
				const dto = (block.o_ports[0] || block);
				v.datatype = function () {
					return dto.datatype();
				};
				v.i_ports[0].datatype = function () {
					return this.block.datatype();
				};
			}
			const p = Object.create(bs.CompositeBlock.Property);
			p.of = block;
			p.type = property;
			p.block = v;
			bdef.properties.push(p);
			bdef.blocks.push(v);
			return v;
		}
		if (props.length == 1) {
			return props[0].block;
		}
		throw new Error("Too many properties found");
	}

	function convert_expr (expr_node, bdef) {

		switch (expr_node.name) {
		case 'VARIABLE': {
			const v = findVarById(expr_node.id, bdef).r;
			return [v.i_ports, v.o_ports];
		}
		case 'PROPERTY': {
			const x = expr_node.expr;
			if (x.name == 'VARIABLE') {
				const r = findVarById(x.id, bdef) || findMemById(x.id, bdef);
				const p = convert_property(r.r, expr_node.property_id, r.bd);
				return [[], p.o_ports];
			}
			else {
				const ps = convert_expr(x, bdef);
				const of = ps[1][0].block;
				const bd = findBdefByBlock(of, bdef);
				const p  = convert_property(of, expr_node.property_id, bd);
				return [[], p.o_ports];
			}
		}
		case 'CONSTANT': {
			const b = Object.create(bs.ConstantBlock);
			b.value = expr_node.val;
			b.init();
			if (expr_node.type == 'INT32')
				b.datatype = () => ts.DataTypeInt32;
			else if (expr_node.type == 'FLOAT32')
				b.datatype = () => ts.DataTypeFloat32;
			else if (expr_node.type == 'BOOL')
				b.datatype = () => ts.DataTypeBool;
			bdef.blocks.push(b);
			return [[], b.o_ports];
		}
		case 'MEMORY_ELEMENT': {
			const m = findMemById(expr_node.id, bdef).r;
			const mr = Object.create(bs.MemoryReaderBlock);
			mr.memoryblock = m;
			mr.init();
			const index_expr_ports = convert_expr(expr_node.args[0], bdef);
			const ci = Object.create(bs.CompositeBlock.Connection);
			ci.in  = index_expr_ports[1][0];
			ci.out = mr.i_ports[0];
			bdef.blocks.push(mr);
			bdef.connections.push(ci);
			return [[], [mr.o_ports[0]]];
		}
		case 'CALL_EXPR': {
			const b = Object.create(bs.CallBlock);
			b.inputs_N = expr_node.args.length;
			b.outputs_N = expr_node.outputs_N;
			b.id = expr_node.id;
			b.ref = undefined; // bdef or cdef resolution must be done later, after setting output datatypes
			b.init();
			b.o_ports.forEach((p, i) => {
				p.datatype = function () {
					return this.block.ref.o_ports[i].datatype();
				};
			});
			for (let argi = 0; argi < expr_node.args.length; argi++) {
				const ports = convert_expr(expr_node.args[argi], bdef);
				const c = Object.create(bs.CompositeBlock.Connection);
				c.in = ports[1][0];
				c.out = b.i_ports[argi];
				bdef.connections.push(c);
			}
			bdef.blocks.push(b);
			return [[], b.o_ports];
		}
		case 'INLINE_IF_THEN_ELSE': {
			throw new Error("Not imeplemented yet");
		}
		}

		// Regular args exprs

		const b = (function () {
			switch (expr_node.name) { 
			case 'BITWISE_NOT_EXPR':
				return Object.create(bs.BitwiseNotBlock);
			case 'LOGICAL_NOT_EXPR':
				return Object.create(bs.LogicalNotBlock);
			case 'UMINUS_EXPR':
				return Object.create(bs.UminusBlock);
			case 'MODULO_EXPR':
				return Object.create(bs.ModuloBlock);
			case 'DIV_EXPR':
				return Object.create(bs.DivisionBlock);
			case 'TIMES_EXPR':
				return Object.create(bs.MulBlock);
			case 'MINUS_EXPR':
				return Object.create(bs.SubtractionBlock);
			case 'PLUS_EXPR':
				return Object.create(bs.SumBlock);
			case 'SHIFT_RIGHT_EXPR':
				return Object.create(bs.ShiftRightBlock);
			case 'SHIFT_LEFT_EXPR':
				return Object.create(bs.ShiftLeftBlock);
			case 'GREATEREQUAL_EXPR':
				return Object.create(bs.GreaterEqualBlock);
			case 'GREATER_EXPR':
				return Object.create(bs.GreaterBlock);
			case 'LESSEQUAL_EXPR':
				return Object.create(bs.LessEqualBlock);
			case 'LESS_EXPR':
				return Object.create(bs.LessBlock);
			case 'NOTEQUAL_EXPR':
				return Object.create(bs.InequalityBlock);
			case 'EQUAL_EXPR':
				return Object.create(bs.EqualityBlock);
			case 'BITWISE_AND_EXPR':
				return Object.create(bs.BitwiseAndBlock);
			case 'BITWISE_EXCLUSIVE_OR_EXPR':
				return Object.create(bs.BitwiseXorBlock);
			case 'BITWISE_INCLUSIVE_OR_EXPR':
				return Object.create(bs.BitwiseOrBlock);
			case 'LOGICAL_AND_EXPR':
				return Object.create(bs.LogicalAndBlock);
			case 'LOGICAL_OR_EXPR':
				return Object.create(bs.LogicalOrBlock);
			case 'CAST_EXPR':
				if (expr_node.type == 'TYPE_INT32')
					return Object.create(bs.CastI32Block);
				else if (expr_node.type == 'TYPE_FLOAT32')
					return Object.create(bs.CastF32Block);
				else if (expr_node.type == 'TYPE_BOOL')
					return Object.create(bs.CastBoolBlock);
				else 
					throw new Error("Unexpect cast type: " + expr_node.type);
			default:
				throw new Error("Unexpected AST expr node");
			}
		})();

		b.init();

		for (let argi = 0; argi < expr_node.args.length; argi++) {
			const ports = convert_expr(expr_node.args[argi], bdef);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = ports[1][0];
			c.out = b.i_ports[argi];
			bdef.connections.push(c);
		}

		bdef.blocks.push(b);

		return [[], b.o_ports];
	}

	function resolve_block_call (b, bdef) {
		const inputDataTypes = b.i_ports.map(p => p.datatype());
		var r = findBdefBySignature(b.id, inputDataTypes, b.outputs_N, bdef);
		if (r) {
			b.ref = r.r;
			b.type = "bdef";
			return;
		}
		r = findCdefBySignature(b.id, inputDataTypes, b.outputs_N, bdef);
		if (r) {
			b.ref = r.r;
			b.type = "cdef";
			return;
		}
		throw new Error("No callable bdef or cdef found with that signature: " + b.id);
	}

	function check_recursive_calls (bdef, stack = []) {
		if (stack.find(b => b == bdef))
			throw new Error("Recursive block calls");
		const nstack = stack.concat(bdef);
		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == 'bdef').forEach(b => {
			check_recursive_calls(b.ref, nstack);
		});
		bdef.bdefs.forEach(bd => check_recursive_calls(bd, nstack));
	}

	function find_initial_bdef (bdef, options) {
		let bds = bdef.bdefs
			.filter(bd => bd.id == options.initial_block_id)
			.filter(bd => bd.i_ports.map(p => p.datatype()).every(d => d == ts.DataTypeFloat32))
			.filter(bd => bd.o_ports.map(p => p.datatype()).every(d => d == ts.DataTypeFloat32));
		if (bds.length == 1)
			return bds[0];
		bds = bds.filter(bd => bd.inputs_N == options.initial_block_inputs_n);
		if (bds.length == 1)
			return bds[0];
		throw new Error("Initial block not found: " + options.initial_block_id);
	}

	function flatten (bdef, options) {

		const i_bdef = find_initial_bdef(bdef, options);

		bdef.inputs_N = i_bdef.inputs_N;
		bdef.outputs_N = i_bdef.outputs_N;
		const pfs = bdef.i_ports[0];
		bdef.createPorts(bdef.inputs_N + 1, bdef.outputs_N);
		bdef.i_ports[0] = pfs;
		bdef.i_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);
		bdef.o_ports.forEach(p => p.datatype = () => ts.DataTypeFloat32);
		bdef.i_ports.forEach((p, i) => {
			if (i == 0)
				return;
			p.id = i_bdef.i_ports[i - 1].id
		});
		bdef.o_ports.forEach((p, i) => p.id = i_bdef.o_ports[i].id);

		const b = Object.create(bs.CallBlock);
		b.id = i_bdef.id;
		b.inputs_N = i_bdef.inputs_N;
		b.outputs_N = i_bdef.outputs_N;
		b.ref = i_bdef;
		b.type = 'bdef';
		b.init();
		for (let i = 0; i < i_bdef.inputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = bdef.i_ports[i + 1]; // Cuz of fs
			c.out = b.i_ports[i];
			bdef.connections.push(c);
		}
		for (let i = 0; i < i_bdef.outputs_N; i++) {
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = b.o_ports[i];
			c.out = bdef.o_ports[i];
			bdef.connections.push(c);
		}
		bdef.blocks.push(b);

		bdef.flatten();

		bdef.id = i_bdef.id;

		normalize_properties(bdef);

		(function validate (bdef) {
			const mems = bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b));
			mems.forEach(m => {
				const p = bdef.properties.find(p => p.of == m && p.type == 'init');
				if (!p)
					throw new Error("Memory init not assiged");
			});
			bdef.properties.forEach(p => {
				if (bdef.properties.filter(pp => pp.of == p.of && pp.type == p.type).length > 1)
					throw new Error("Cannot assign property multiple times");
			});
		})(bdef);

		(function set_mem_init (bdef) {
			const mems = bdef.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b));
			mems.forEach(m => {
				const p = bdef.properties.find(p => p.of == m && p.type == 'init');
				const c = Object.create(bs.CompositeBlock.Connection);
				c.in = p.block.o_ports[0];
				c.out = m.i_ports[1];
				bdef.connections.push(c);
			});
		})(bdef);

		// It's important to call this after flattening/cloning
		setUpdateRate(bdef, options);

		propagateControlDependencies(bdef);
	}

	// replace properties with blocks/connections
	// Assuming bdef flattened
	function normalize_properties (bdef) {

		// I propose to remove this blasfemy
		// This is also a bad place for this
		(function explicitize_init (bdef) {
			// y.init = expr -> y.init = (expr).init
			bdef.properties.filter(p => p.type == 'init').forEach(p => {
				const c = bdef.connections.find(c => c.out == p.block.i_ports[0]);
				if (!c)
					return;
				// This is a not nice cheating too:
				if (bs.CallBlock.isPrototypeOf(c.in.block) && c.in.block.type == 'cdef')
					return;
				const v = convert_property(c.in.block, "init", bdef);
				c.in = v.o_ports[0];
			});
		})(bdef);

		// TODO: Fix this, it's too strict. Or maybe no, since mem r/w are separated, loops cannot exist
		(function detect_inference_loops (bdef) {
			// Like: y = y.fs with y.fs inferred
			bdef.properties.map(p => p.block).forEach(b => {
				(function f (b, stack, inferring) {
					if (inferring)
						if (stack.find(bb => b == bb))
							throw new Error("Recursive properties inference. Stack: " + stack.toString() + " + " + b.toString());
					if (b.__visited__)
						return;	
					b.__visited__ = true;
					var gotta = false;
					b.i_ports.forEach(p => {
						const c = bdef.connections.find(c => c.out == p);
						if (c) {
							f(c.in.block, stack.concat(b), inferring);
							gotta = true;
						}
					});
					if (gotta) {
						return;
					}
					bdef.properties.filter(p => p.block == b).forEach(p => {
						f (p.of, stack.concat(b), true);
					});
				})(b, [], false);
			});
		})(bdef);

		const b0 = Object.create(bs.ConstantBlock);
		b0.value = 0;
		b0.datatype = () => ts.DataTypeFloat32;
		b0.init();
		bdef.blocks.push(b0);

		const fs = findVarById("fs", bdef).r;

		const toBeNormalized = bdef.properties.map(p => p.block);
		for (let i = 0; i < toBeNormalized.length; i++) {
			normalize(toBeNormalized[i]);
		}
		bdef.blocks.forEach(b => { 
			delete b.__visited__;
			delete b.__normalized__; 
		});
		bdef.clean();

		// Checks whether b has inputs or needs to be inferred
		function normalize (b) {
			if (b.__normalized__)
				return;
			b.__normalized__ = true;
			if (b == bdef)
				return;
			if (b == fs)
				return;
			if (b.i_ports.length == 0)
				return;
			if (bdef.connections.find(c => c.out == b.i_ports[0]))
				return;
			
			// Otherwise inference is needed

			const p = bdef.properties.find(p => p.block == b);
			if (!p)
				throw new Error("No propery found..." + b.toString());

			if (p.type == "fs")
				infer_fs(p);
			if (p.type == "init")
				infer_init(p);
		}

		function infer_fs (p) {

			normalize(p.of);
			const m = get_fs(p.of);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = m.o_ports[0];
			c.out = p.block.i_ports[0];
			bdef.connections.push(c);

			function get_fs (b) {
				if (b == bdef)
					return fs;
				if (b == fs)
					return fs;
				if (bs.ConstantBlock.isPrototypeOf(b))
					return b0;
				
				const max = Object.create(bs.MaxBlock);
				max.datatype = () => ts.DataTypeFloat32;
				max.createPorts(b.i_ports.length, 1);
				max.init();
				for (let i = 0; i < b.i_ports.length; i++) {
					const p_o = b.i_ports[i];
					const p_i = bdef.connections.find(x => x.out == p_o).in;
					var v;
					if (p_i.block == bdef)
						v = fs;
					else if (p_i.block == fs)
						v = fs;
					else {
						v = convert_property(p_i.block, "fs", bdef);
						toBeNormalized.push(v);
					}
					const c = Object.create(bs.CompositeBlock.Connection);
					c.in = v.o_ports[0];
					c.out = max.i_ports[i];
					bdef.connections.push(c);
				}
				bdef.blocks.push(max);
				return max;
			}
		}

		function infer_init (p) {
			normalize(p.of);

			const b = get_init(p.of);
			const c = Object.create(bs.CompositeBlock.Connection);
			c.in = b.o_ports[0];
			c.out = p.block.i_ports[0];
			bdef.connections.push(c);

			function get_init(b) {
				if (b == bdef)
					return b0; //throw new Error("Unimplemented. Note: set default for audio (0) or take user compilation inputs");
				if (bs.ConstantBlock.isPrototypeOf(b))
					return b;
				if (b == fs)
					return b;
				if (bs.MemoryReaderBlock.isPrototypeOf(b))
					return convert_property(b.memoryblock, 'init', bdef);

				b.setToBeCloned();
				const bb = b.clone();

				const args = [];
				b.i_ports.forEach((pp, i) => {
					const c = bdef.connections.find(c => c.out == pp);
					const vv = convert_property(c.in.block, "init", bdef);
					toBeNormalized.push(vv);
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = vv.o_ports[0];
					cc.out = bb.i_ports[i];
					bdef.connections.push(cc);
				});
				bdef.blocks.push(bb);
				return bb;
			}
		}
	}

	function setUpdateRate (bdef, options) {
		options.control_inputs.forEach(c => {
			const p = bdef.i_ports.find(p => p.id == c);
			if (!p)
				throw new Error("No input with such id. " + bdef.i_ports.join());
			p.updaterate = () => us.UpdateRateControl;
		});
		bdef.i_ports.forEach(p => {
			if (!options.control_inputs.includes(p.id))
				p.updaterate = () => us.UpdateRateAudio;
		});
		bdef.i_ports[0].updaterate = () => us.UpdateRateFs;

		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == 'cdef').forEach(b => {
			b.o_ports.forEach((p, i) => {
				const u = b.ref.o_ports[i].updaterate;
				p.updaterate = u;
			});
		});

		// Detecting memory loops and setting updaterate to Audio for now
		const mems = bdef.blocks.filter(b => bs.MemoryReaderBlock.isPrototypeOf(b)).map(b => b.memoryblock);
		mems.forEach(m => {
			const ws = bdef.blocks.filter(b => bs.MemoryWriterBlock.isPrototypeOf(b) && b.memoryblock == m);
			ws.forEach(w => f(w));

			bdef.blocks.forEach(b => delete b.__visited__);
			function f (b) {
				if (b.__visited__)
					return;
				b.__visited__ = true;
				if (bs.MemoryReaderBlock.isPrototypeOf(b) && b.memoryblock == m) {
					b.o_ports[0].updaterate = () => us.UpdateRateAudio;
				}
				bdef.connections.filter(c => c.out.block == b).forEach(c => {
					f (c.in.block);
				});
			};
		});

		bdef.propagateUpdateRates();

		// TODO: think about memory update rate. Readings should be up-bounded to writings...?
	}

	// Assuming bdef flattened
	function propagateControlDependencies (bdef) {

		// Better to reset
		bdef.blocks.forEach(b => b.control_dependencies = new Set());

		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateControl).forEach(p => {
			const cs = bdef.connections.filter(c => c.in == p);
			cs.forEach(c => f (c.out.block, p.id));
			bdef.blocks.forEach(b => delete b.__visited__);
		});

		function f (b, ctrd) {
			if (b == bdef)
				return;
			if (b.__visited__)
				return;
			b.__visited__ = true;

			b.control_dependencies.add(ctrd);

			b.o_ports.forEach(p => {
				const cs = bdef.connections.filter(c => c.in == p)
				cs.forEach(c => f (c.out.block, ctrd));
			});
		}
	}

	// Assuming bdef flattened
	function optimize (bdef, options) {

		var _x_counter = 0;

		if (options.optimizations["remove_dead_graph"])
			remove_dead_graph();

		if (options.optimizations["negative_negative"])
			negative_negative();

		if (options.optimizations["negative_consts"])
			negative_consts();

		if (options.optimizations["unify_consts"])
			unify_consts();
	
		if (options.optimizations["remove_useless_vars"])
			remove_useless_vars();

		if (options.optimizations["merge_vars"])
			merge_vars();

		if (options.optimizations["merge_max_blocks"])
			merge_max_blocks();

		if (options.optimizations["simplifly_max_blocks1"])
			simplifly_max_blocks1();

		if (options.optimizations["simplifly_max_blocks2"])
			simplifly_max_blocks2();

		// Sad that we need this
		setUpdateRate(bdef, options);

		if (options.optimizations["lazyfy_subexpressions_rates"])
			lazyfy_subexpressions_rates();

		if (options.optimizations["lazyfy_subexpressions_controls"])
			lazyfy_subexpressions_controls();

		// Needed cuz we eventually created new blocks... Anything better?
		propagateControlDependencies (bdef);


		function safely_remove_blocks (blocks) {
			blocks.forEach(b => {
				const i = bdef.blocks.indexOf(b);
				bdef.blocks.splice(i, 1);
			});
		}

		function safely_remove_connections (conns) {
			conns.forEach(c => {
				const i = bdef.connections.indexOf(c);
				bdef.connections.splice(i, 1);
			});
		}

		// Very similar to the scheduling...
		function remove_dead_graph () {
			
			var blocks = [];
			var conns = [];
			
			const iconns = bdef.o_ports.map(p => bdef.connections.find(c => c.out == p));
			const roots = iconns.map(c => c.in.block);

			for (let i = 0; i < roots.length; i++) {
				f (roots[i]);
			}

			conns = conns.concat(iconns);

			bdef.blocks = blocks;
			bdef.connections = conns;
			
			bdef.blocks.forEach(b => delete b.__visited__);

			function f (b) {
				if (b == bdef)
					return;

				if (b.__visited__)
					return;
				b.__visited__ = true;

				if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
					roots.push(b.memoryblock);
				}

				if (bs.MemoryBlock.isPrototypeOf(b)) {
					bdef.blocks.filter(bb => bs.MemoryWriterBlock.isPrototypeOf(bb) && bb.memoryblock == b).forEach(bb => {
						roots.push(bb);
					});
				}

				b.i_ports.forEach(p => {
					const cc = bdef.connections.find(c => c.out == p);
					const bb = cc.in.block;
					conns.push(cc);
					f (bb);
				});
				
				blocks.push(b);
			}
		}

		function negative_negative () {

			bdef.connections.forEach(c => {
				if (!bdef.connections.includes(c))
					return;

				const l = c.in.block;
				const r = c.out.block;

				if (!(bs.UminusBlock.isPrototypeOf(l) && bs.UminusBlock.isPrototypeOf(r)))
					return;

				const rem_blocks = [];
				const rem_conns = [];

				const llc  = bdef.connections.find(c => c.out == l.i_ports[0]);
				const lrcs = bdef.connections.filter(c => c.in == l.o_ports[0]);
				const rlc  = c;
				const rrcs = bdef.connections.filter(c => c.in == r.o_ports[0]);

				rrcs.forEach(cc => {
					cc.in = llc.in;
				});

				if (lrcs.length == 1) {
					rem_blocks.push(l);
					rem_blocks.push(r);
					rem_conns.push(llc);
					rem_conns.push(rlc);
				}
				else {
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}

				safely_remove_blocks(rem_blocks);
				safely_remove_connections(rem_conns);
			});
		}

		function negative_consts () {
			
			bdef.connections.forEach(c => {

				const l = c.in.block;
				const r = c.out.block;

				if (!(bs.ConstantBlock.isPrototypeOf(l) && bs.UminusBlock.isPrototypeOf(r)))
					return;

				const rem_blocks = [];
				const rem_conns = [];

				const lrcs = bdef.connections.filter(c => c.in == l.o_ports[0]);
				const rlc  = c;
				const rrcs = bdef.connections.filter(c => c.in == r.o_ports[0]);

				const nc = Object.create(bs.ConstantBlock);
				nc.value = -l.value;
				nc.datatype = l.datatype;
				nc.init();
				bdef.blocks.push(nc);

				rrcs.forEach(cc => {
					cc.in = nc.o_ports[0];
				});

				if (lrcs.length == 1) {
					rem_blocks.push(l);
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}
				else {
					rem_blocks.push(r);
					rem_conns.push(rlc);
				}
				
				safely_remove_blocks(rem_blocks);
				safely_remove_connections(rem_conns);
			});
		}

		function unify_consts () {

			const rem_blocks = [];
			const rem_conns = [];

			const CBlocks = bdef.blocks.filter(b => bs.ConstantBlock.isPrototypeOf(b));

			const values = [
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeFloat32).map(b => b.value))).map(v => [ts.DataTypeFloat32, v]),
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeInt32).map(b => b.value))).map(v => [ts.DataTypeInt32, v]),
				Array.from(new Set(CBlocks.filter(b => b.datatype() == ts.DataTypeBool).map(b => b.value))).map(v => [ts.DataTypeBool, v])
			].flat(1);

			values.forEach(v => {
				const VBlocks = CBlocks.filter(b => b.datatype() == v[0] && b.value == v[1]);
				const VB0 = VBlocks[0];
				for (let i = 1; i < VBlocks.length; i++) {
					const vb = VBlocks[i];
					const cs = bdef.connections.filter(c => c.in == vb.o_ports[0]);
					cs.forEach(c => {
						c.in = VB0.o_ports[0];
					});
					rem_blocks.push(vb);
				}
			});

			safely_remove_blocks(rem_blocks);
		}

		function remove_useless_vars () {

			const VBlocks = bdef.blocks.filter(b => bs.VarBlock.isPrototypeOf(b));

			VBlocks.forEach(b => {
				const rem_blocks = [];
				const rem_conns = [];

				const lc  = bdef.connections.find(c => c.out == b.i_ports[0]);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);

				if (rcs.length != 1)
					return;
				if (rcs.some(c => c.out.block == bdef))
					return;

				rcs[0].in = lc.in;
				rem_blocks.push(b)
				rem_conns.push(lc);

				safely_remove_blocks(rem_blocks); // Check this position in the ohter opts
				safely_remove_connections(rem_conns);
			});
		}

		function merge_vars () {
			// TODO: y1 = 5; y2 = 5. Merge y1 and y2
		}

		function merge_max_blocks () {

			const rem_blocks = [];
			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach(b => f(b));

			function f (b) {
				if (b.__handling__)
					return;
				b.__handling__ = true;

				const incs = bdef.connections.filter(c => c.out.block == b);
				
				const newports = [];
				incs.forEach(c => {
					const bb = c.in.block;
					if (bs.MaxBlock.isPrototypeOf(bb)) {
						f(bb);
						bb.i_ports.forEach(p => newports.push(p));
						rem_blocks.push(bb);
						rem_conns.push(c);
					}
					else {
						newports.push(c.out);
					}
				});
				newports.forEach(p => p.block = b);
				b.i_ports = newports;
			}

			MBlocks.forEach(b => delete b.__handling__);
			safely_remove_blocks(rem_blocks);
			safely_remove_connections(rem_conns);
		}

		function simplifly_max_blocks1 () {

			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach((b, i) => {
				const lcs = bdef.connections.filter(c => c.out.block == b);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);
				
				const lps = Array.from(new Set(lcs.map(c => c.in)));
				const newlps = [];
				var c0 = undefined;
				for (let i = 0; i < lps.length; i++) {
					if (bs.ConstantBlock.isPrototypeOf(lps[i].block) && lps[i].block.value == 0)
						c0 = lps[i];
					else
						newlps.push(lps[i]);
				}
				if (newlps.length == 0) {
					if (!c0)
						throw new Error("Invalid max block found");
					newlps.push(c0);
				}

				b.createPorts(newlps.length, 1);
				b.init();
				newlps.forEach((p, ii) => {
					const c = Object.create(bs.CompositeBlock.Connection);
					c.in = p;
					c.out = b.i_ports[ii];
					bdef.connections.push(c);
				});
				rcs.forEach(c => {
					c.in = b.o_ports[0];
				});
				lcs.forEach(c => {
					rem_conns.push(c);
				});
			});

			safely_remove_connections(rem_conns);
		}

		function simplifly_max_blocks2 () {

			const rem_blocks = [];
			const rem_conns = [];

			const MBlocks = bdef.blocks.filter(b => bs.MaxBlock.isPrototypeOf(b));

			MBlocks.forEach(b => {
				if (b.i_ports.length != 1)
					return;

				const lc  = bdef.connections.find(c => c.out == b.i_ports[0]);
				const rcs = bdef.connections.filter(c => c.in  == b.o_ports[0]);

				rcs.forEach(c => {
					c.in = lc.in;
				});

				rem_blocks.push(b)
				rem_conns.push(lc);
			});

			safely_remove_blocks(rem_blocks);
			safely_remove_connections(rem_conns);
		}

		// Assuming blocks with only 1 output
		function lazyfy_subexpressions_rates () {

			bdef.blocks.forEach(b => {
				if (b.o_ports.length == 0)
					return; // Uhm, what to do in this case?
				const our = b.o_ports[0].updaterate();
				b.i_ports.forEach(p => {
					const c = bdef.connections.find(c => c.out == p);
					const iur = c.in.updaterate();
					if (us.equal(our, iur))
						return;
					if (bs.VarBlock.isPrototypeOf(c.in.block))
						return;
					if (bs.ConstantBlock.isPrototypeOf(c.in.block))
						return;
					const v = Object.create(bs.VarBlock);
					v.id = "_x_" + _x_counter++;
					const d = c.in.datatype();
					v.datatype = () => d;
					v.init();
					v.i_ports[0].datatype = () => d;
					v.i_ports[0].updaterate = () => iur;
					v.o_ports[0].updaterate = () => iur;
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = v.o_ports[0];
					cc.out = c.out;
					c.out = v.i_ports[0];
					bdef.blocks.push(v);
					bdef.connections.push(cc);
				});
			});
		}

		function lazyfy_subexpressions_controls () {
			return; // Something is wrong here
			// Here too
			bdef.blocks.filter(b => b.o_ports.length != 0 && b.o_ports[0].updaterate() == us.UpdateRateControl).forEach(b => {

				b.i_ports.forEach(p => {
					const c = bdef.connections.find(c => c.out == p);
					const iur = c.in.updaterate();
					const bb = c.in.block;

					if (bb == bdef)
						return;
					if (Set.checkEquality(b.control_dependencies, bb.control_dependencies))
						return;
					if (bs.VarBlock.isPrototypeOf(bb))
						return;

					const v = Object.create(bs.VarBlock);
					v.id = "_x_" + _x_counter++;
					const d = c.in.datatype();
					v.datatype = () => d;
					v.init();
					v.i_ports[0].datatype = () => d;
					v.i_ports[0].updaterate = () => iur;
					v.o_ports[0].updaterate = () => iur;
					const cc = Object.create(bs.CompositeBlock.Connection);
					cc.in = v.o_ports[0];
					cc.out = c.out;
					c.out = v.i_ports[0];
					bdef.blocks.push(v);
					bdef.connections.push(cc);
				});
			});
		}
	};

	function findVarById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.VarBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	function findMemById (id, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b) && b.id == id);
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	// Hierarchly find bdef that contains block
	function findBdefByBlock (block, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.blocks.find(b => b == block);
			if (r)
				return bd;
			bd = bd.bdef_father;
		}
	}

	function findBdefBySignature (id, inputDataTypes, outputs_N, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.bdefs.find(b => 
				(b.id == id) && 
				(b.i_ports.length == inputDataTypes.length) &&
				(b.i_ports.map(p => p.datatype()).every((t, i) => t == inputDataTypes[i])) &&
				(b.o_ports.length == outputs_N));
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	function findCdefBySignature (id, inputDataTypes, outputs_N, bdef) {
		let bd = bdef;
		while (bd) {
			let r = bd.cdefs.find(b => 
				(b.id == id) && 
				(b.i_ports.length == inputDataTypes.length) &&
				(b.i_ports.map(p => p.datatype()).every((t, i) => t == inputDataTypes[i])) &&
				(b.o_ports.length == outputs_N));
			if (r)
				return { r, bd };
			bd = bd.bdef_father;
		}
	}

	function getDataType (s) {
		switch (s) {
		case "TYPE_INT32":
			return ts.DataTypeInt32;
		case "TYPE_FLOAT32":
			return ts.DataTypeFloat32;
		case "TYPE_BOOL":
			return ts.DataTypeBool;
		case undefined:
			return ts.DataTypeFloat32;
		default:
			throw new Error("Unexpected datatype " + s);
		}
	}

	exports["ASTToGraph"] = ASTToGraph;
	exports["flatten"] = flatten;
	exports["optimize"] = optimize;
}());
},{"./blocks":1,"./types":8,"./uprates":9}],4:[function(require,module,exports){
(function (Buffer){(function (){
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

/**
 * TODO:
 * - We're delcaring/assigning only on VARs. So we might check if other blocks fork their output. Should not happen with the implemented opts, might better to be sure anyways
 * - For the future: Control grouping system should be trated in the same way of user IFs. In the graph itself
 * 
 * - Check memory updates order. Might be better to save reads in vars.
 * 
 */

(function() {

	const doT = require("dot");
	
	const path = require("path");
	const templates = {
		//"matlab": 			String(fs.readFileSync(path.join(__dirname, "templates", "matlab_template.txt"))),
		"simple_c": String(Buffer("CiNpZm5kZWYgX3t7PWl0Lm5hbWUudG9VcHBlckNhc2UoKX19X0gKI2RlZmluZSBfe3s9aXQubmFtZS50b1VwcGVyQ2FzZSgpfX1fSAoKe3s9aXQuaW5jbHVkZXMudG9TdHJpbmcoMCl9fQoKe3s/aXQucGFyYW1ldGVycy5sZW5ndGggPiAwfX0KZW51bSB7Cgl7e35pdC5wYXJhbWV0ZXJzOmN9fQoJcF97ez1jfX0se3t+fX0KCglwX24KfTsKe3s/fX0KCnN0cnVjdCBfe3s9aXQubmFtZX19IHsKCQoJLy8gUGFyYW1ldGVycwp7ez1pdC5wYXJhbWV0ZXJfc3RhdGVzLnRvU3RyaW5nKDEpfX0KCgkvLyBNZW1vcnkKe3s9aXQubWVtb3J5X2RlY2xhcmF0aW9ucy50b1N0cmluZygxKX19CgoJLy8gU3RhdGVzCnt7PWl0LnN0YXRlcy50b1N0cmluZygxKX19CgoJLy8gQ29lZmZpY2llbnRzCnt7PWl0LmNvZWZmaWNpZW50cy50b1N0cmluZygxKX19CgoJLy8gU3VuLW1vY3VsZGVzCnt7PWl0LnN1Ym1vZHVsZXMudG9TdHJpbmcoMSl9fQoKCWZsb2F0IGZzOwoJY2hhciBmaXJzdFJ1bjsKfTsKdHlwZWRlZiBzdHJ1Y3QgX3t7PWl0Lm5hbWV9fSB7ez1pdC5uYW1lfX07CgoKdm9pZCB7ez1pdC5uYW1lfX1faW5pdCh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKTsKdm9pZCB7ez1pdC5uYW1lfX1fc2V0X3NhbXBsZV9yYXRlKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGZsb2F0IHNhbXBsZV9yYXRlKTsKdm9pZCB7ez1pdC5uYW1lfX1fcmVzZXQoe3s9aXQubmFtZX19ICppbnN0YW5jZSk7CnZvaWQge3s9aXQubmFtZX19X3Byb2Nlc3Moe3s9aXQubmFtZX19ICppbnN0YW5jZSwge3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSB7ez1pdC5hdWRpb19pbnB1dHMubWFwKHggPT4gJ2NvbnN0IGZsb2F0IConICsgeCkuam9pbignLCAnKX19LCB7ez99fXt7P2l0LmF1ZGlvX291dHB1dHMubGVuZ3RoID4gMH19e3s9aXQuYXVkaW9fb3V0cHV0cy5tYXAoeCA9PiAnZmxvYXQgKicgKyB4KS5qb2luKCcsICcpfX0sIHt7P319aW50IG5fc2FtcGxlcyk7CmZsb2F0IHt7PWl0Lm5hbWV9fV9nZXRfcGFyYW1ldGVyKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGludCBpbmRleCk7CnZvaWQge3s9aXQubmFtZX19X3NldF9wYXJhbWV0ZXIoe3s9aXQubmFtZX19ICppbnN0YW5jZSwgaW50IGluZGV4LCBmbG9hdCB2YWx1ZSk7CgoKe3s9aXQuY29uc3RhbnRzLnRvU3RyaW5nKDApfX0KCnZvaWQge3s9aXQubmFtZX19X2luaXQoe3s9aXQubmFtZX19ICppbnN0YW5jZSkgewoKe3s9aXQuaW5pdC50b1N0cmluZygxKX19Cgp9Cgp2b2lkIHt7PWl0Lm5hbWV9fV9yZXNldCh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKSB7CglpbnN0YW5jZS0+Zmlyc3RSdW4gPSAxOwp9Cgp2b2lkIHt7PWl0Lm5hbWV9fV9zZXRfc2FtcGxlX3JhdGUoe3s9aXQubmFtZX19ICppbnN0YW5jZSwgZmxvYXQgc2FtcGxlX3JhdGUpIHsKCQoJaW5zdGFuY2UtPmZzID0gc2FtcGxlX3JhdGU7CgkKe3s9aXQuZnNfdXBkYXRlLnRvU3RyaW5nKDEpfX0KCn0KCnZvaWQge3s9aXQubmFtZX19X3Byb2Nlc3Moe3s9aXQubmFtZX19ICppbnN0YW5jZSwge3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSB7ez1pdC5hdWRpb19pbnB1dHMubWFwKHggPT4gJ2NvbnN0IGZsb2F0IConICsgeCkuam9pbignLCAnKX19LCB7ez99fXt7P2l0LmF1ZGlvX291dHB1dHMubGVuZ3RoID4gMH19e3s9aXQuYXVkaW9fb3V0cHV0cy5tYXAoeCA9PiAnZmxvYXQgKicgKyB4KS5qb2luKCcsICcpfX0sIHt7P319aW50IG5fc2FtcGxlcykgewoJCglpZiAoaW5zdGFuY2UtPmZpcnN0UnVuKSB7e3t+aXQucGFyYW1ldGVyczpjfX0KCQlpbnN0YW5jZS0+e3s9Y319X0NIQU5HRUQgPSAxO3t7fn19Cgl9CgllbHNlIHt7e35pdC5wYXJhbWV0ZXJzOmN9fQoJCWluc3RhbmNlLT57ez1jfX1fQ0hBTkdFRCA9IGluc3RhbmNlLT57ez1jfX0gIT0gaW5zdGFuY2UtPnt7PWN9fV96MTt7e359fQoJfQoJCnt7PWl0LmNvbnRyb2xfY29lZmZzX3VwZGF0ZS50b1N0cmluZygxKX19Cgp7ez1pdC51cGRhdGVfY29lZmZzX2N0cmwudG9TdHJpbmcoMSl9fQoKCXt7fml0LnBhcmFtZXRlcnM6Y319CglpbnN0YW5jZS0+e3s9Y319X0NIQU5HRUQgPSAwO3t7fn19CgoJaWYgKGluc3RhbmNlLT5maXJzdFJ1bikgewp7ez1pdC5yZXNldC50b1N0cmluZygyKX19Cgl9CgoJZm9yIChpbnQgaSA9IDA7IGkgPCBuX3NhbXBsZXM7IGkrKykgewoKe3s9aXQudXBkYXRlX2NvZWZmc19hdWRpby50b1N0cmluZygyKX19Cgp7ez1pdC5hdWRpb191cGRhdGUudG9TdHJpbmcoMil9fQoJCQp7ez1pdC5tZW1vcnlfdXBkYXRlcy50b1N0cmluZygyKX19Cgp7ez1pdC5vdXRwdXRfdXBkYXRlcy50b1N0cmluZygyKX19CgoJfQoKCXt7fml0LnBhcmFtZXRlcnM6Y319CglpbnN0YW5jZS0+e3s9Y319X3oxID0gaW5zdGFuY2UtPnt7PWN9fTt7e359fQoJaW5zdGFuY2UtPmZpcnN0UnVuID0gMDsKfQoKZmxvYXQge3s9aXQubmFtZX19X2dldF9wYXJhbWV0ZXIoe3s9aXQubmFtZX19ICppbnN0YW5jZSwgaW50IGluZGV4KSB7Cglzd2l0Y2ggKGluZGV4KSB7CgkJe3t+aXQucGFyYW1ldGVyczpjfX1jYXNlIHBfe3s9Y319OgoJCQlyZXR1cm4gaW5zdGFuY2UtPnt7PWN9fTsKCQl7e359fQoJfQp9Cgp2b2lkIHt7PWl0Lm5hbWV9fV9zZXRfcGFyYW1ldGVyKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGludCBpbmRleCwgZmxvYXQgdmFsdWUpIHsKCXN3aXRjaCAoaW5kZXgpIHsKCQl7e35pdC5wYXJhbWV0ZXJzOmN9fWNhc2UgcF97ez1jfX06CgkJCWluc3RhbmNlLT57ez1jfX0gPSB2YWx1ZTsKCQkJYnJlYWs7CgkJe3t+fX0KCX0KfQoKI2VuZGlm","base64")),
		"bw": {
			"src": {
				"module_h": String(Buffer("CiNpZm5kZWYgX3t7PWl0Lm5hbWUudG9VcHBlckNhc2UoKX19X0gKI2RlZmluZSBfe3s9aXQubmFtZS50b1VwcGVyQ2FzZSgpfX1fSAoKI2luY2x1ZGUgInBsYXRmb3JtLmgiCgp7ez1pdC5pbmNsdWRlcy50b1N0cmluZygwKX19CgojaWZkZWYgX19jcGx1c3BsdXMKZXh0ZXJuICJDIiB7CiNlbmRpZgoKe3s/aXQucGFyYW1ldGVycy5sZW5ndGggPiAwfX0KZW51bSB7Cgl7e35pdC5wYXJhbWV0ZXJzOmN9fQoJcF97ez1jfX0se3t+fX0KCglwX24KfTsKe3s/fX0KCnN0cnVjdCBfe3s9aXQubmFtZX19IHsKCS8vIFBhcmFtZXRlcnMKe3s9aXQucGFyYW1ldGVyX3N0YXRlcy50b1N0cmluZygxKX19CgoJLy8gTWVtb3J5Cnt7PWl0Lm1lbW9yeV9kZWNsYXJhdGlvbnMudG9TdHJpbmcoMSl9fQoKCS8vIFN0YXRlcwp7ez1pdC5zdGF0ZXMudG9TdHJpbmcoMSl9fQoKCS8vIENvZWZmaWNpZW50cwp7ez1pdC5jb2VmZmljaWVudHMudG9TdHJpbmcoMSl9fQoKCS8vIFN1bi1tb2N1bGRlcwp7ez1pdC5zdWJtb2R1bGVzLnRvU3RyaW5nKDEpfX0KCglmbG9hdCBmczsKCWNoYXIgZmlyc3RSdW47Cn07CnR5cGVkZWYgc3RydWN0IF97ez1pdC5uYW1lfX0ge3s9aXQubmFtZX19OwoKdm9pZCB7ez1pdC5uYW1lfX1faW5pdCh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKTsKdm9pZCB7ez1pdC5uYW1lfX1fc2V0X3NhbXBsZV9yYXRlKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGZsb2F0IHNhbXBsZV9yYXRlKTsKe3s/aXQubWVtX3NldHMubGVuZ3RoID4gMH19CnNpemVfdCB7ez1pdC5uYW1lfX1fbWVtX3JlcSh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKTsKdm9pZCB7ez1pdC5uYW1lfX1fbWVtX3NldCh7ez1pdC5uYW1lfX0gKmluc3RhbmNlLCB2b2lkICptZW0pOwp7ez99fQp2b2lkIHt7PWl0Lm5hbWV9fV9yZXNldCh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKTsKdm9pZCB7ez1pdC5uYW1lfX1fcHJvY2Vzcyh7ez1pdC5uYW1lfX0gKmluc3RhbmNlLCBjb25zdCBmbG9hdCoqIHgsIGZsb2F0KiogeSwgaW50IG5fc2FtcGxlcyk7CnZvaWQge3s9aXQubmFtZX19X3NldF9wYXJhbWV0ZXIoe3s9aXQubmFtZX19ICppbnN0YW5jZSwgaW50IGluZGV4LCBmbG9hdCB2YWx1ZSk7CmZsb2F0IHt7PWl0Lm5hbWV9fV9nZXRfcGFyYW1ldGVyKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGludCBpbmRleCk7CgojaWZkZWYgX19jcGx1c3BsdXMKfQojZW5kaWYKCiNlbmRpZgo=","base64")),
				"module_c": String(Buffer("LyoKCUdlbmVyYXRlZCBieSBaYW1wb2duYQoqLwoKI2luY2x1ZGUgInt7PWl0Lm5hbWV9fS5oIgoKe3s9aXQuY29uc3RhbnRzLnRvU3RyaW5nKDApfX0KCnZvaWQge3s9aXQubmFtZX19X2luaXQoe3s9aXQubmFtZX19ICppbnN0YW5jZSkgewp7ez1pdC5pbml0LnRvU3RyaW5nKDEpfX0KfQoKdm9pZCB7ez1pdC5uYW1lfX1fc2V0X3NhbXBsZV9yYXRlKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGZsb2F0IHNhbXBsZV9yYXRlKSB7CglpbnN0YW5jZS0+ZnMgPSBzYW1wbGVfcmF0ZTsKe3s9aXQuZnNfdXBkYXRlLnRvU3RyaW5nKDEpfX0KfQoKe3s/aXQubWVtX3NldHMubGVuZ3RoID4gMH19CnNpemVfdCB7ez1pdC5uYW1lfX1fbWVtX3JlcSh7ez1pdC5uYW1lfX0gKmluc3RhbmNlKSB7Cgl7ez9pdC5tZW1fcmVxcy5sZW5ndGggIT0gMH19CglyZXR1cm4gCgkJe3s9aXQubWVtX3JlcXMuam9pbignXG5cdFx0KyAnKX19OwoJe3s/P319CglyZXR1cm4gMDsKCXt7P319Cn0KCnZvaWQge3s9aXQubmFtZX19X21lbV9zZXQoe3s9aXQubmFtZX19ICppbnN0YW5jZSwgdm9pZCAqbWVtKSB7CgljaGFyICptID0gKGNoYXIgKiltZW07Cgl7e35pdC5tZW1fc2V0czpzOml9fQoJe3s9c319OwoJbSArPSB7ez1pdC5tZW1fcmVxc1tpXX19OwoJe3t+fX0KfQp7ez99fQoKdm9pZCB7ez1pdC5uYW1lfX1fcmVzZXQoe3s9aXQubmFtZX19ICppbnN0YW5jZSkgewoJaW5zdGFuY2UtPmZpcnN0UnVuID0gMTsKfQoKdm9pZCB7ez1pdC5uYW1lfX1fcHJvY2Vzcyh7ez1pdC5uYW1lfX0gKmluc3RhbmNlLCBjb25zdCBmbG9hdCoqIHgsIGZsb2F0KiogeSwgaW50IG5fc2FtcGxlcykgewoKCXt7fml0LmF1ZGlvX2lucHV0czphOml9fQoJY29uc3QgZmxvYXQqIHt7PWF9fSA9IHhbe3s9aX19XTt7e359fQoJe3t+aXQuYXVkaW9fb3V0cHV0czphOml9fQoJZmxvYXQqIHt7PWF9fSA9IHlbe3s9aX19XTt7e359fQoKCWlmIChpbnN0YW5jZS0+Zmlyc3RSdW4pIHt7e35pdC5wYXJhbWV0ZXJzOmN9fQoJCWluc3RhbmNlLT57ez1jfX1fQ0hBTkdFRCA9IDE7e3t+fX0KCX0KCWVsc2Uge3t7fml0LnBhcmFtZXRlcnM6Y319CgkJaW5zdGFuY2UtPnt7PWN9fV9DSEFOR0VEID0gaW5zdGFuY2UtPnt7PWN9fSAhPSBpbnN0YW5jZS0+e3s9Y319X3oxO3t7fn19Cgl9CgkKe3s9aXQuY29udHJvbF9jb2VmZnNfdXBkYXRlLnRvU3RyaW5nKDEpfX0KCgoJe3t+aXQucGFyYW1ldGVyczpjfX0KCWluc3RhbmNlLT57ez1jfX1fQ0hBTkdFRCA9IDA7e3t+fX0KCglpZiAoaW5zdGFuY2UtPmZpcnN0UnVuKSB7Cnt7PWl0LnJlc2V0LnRvU3RyaW5nKDIpfX0KCX0KCnt7PWl0LnVwZGF0ZV9jb2VmZnNfY3RybC50b1N0cmluZygxKX19CgoJZm9yIChpbnQgaSA9IDA7IGkgPCBuX3NhbXBsZXM7IGkrKykgewoKe3s9aXQudXBkYXRlX2NvZWZmc19hdWRpby50b1N0cmluZygyKX19Cgp7ez1pdC5hdWRpb191cGRhdGUudG9TdHJpbmcoMil9fQoJCQp7ez1pdC5tZW1vcnlfdXBkYXRlcy50b1N0cmluZygyKX19Cgp7ez1pdC5vdXRwdXRfdXBkYXRlcy50b1N0cmluZygyKX19CgoJfQoKCXt7fml0LnBhcmFtZXRlcnM6Y319CglpbnN0YW5jZS0+e3s9Y319X3oxID0gaW5zdGFuY2UtPnt7PWN9fTt7e359fQoJaW5zdGFuY2UtPmZpcnN0UnVuID0gMDsKfQoKdm9pZCB7ez1pdC5uYW1lfX1fc2V0X3BhcmFtZXRlcih7ez1pdC5uYW1lfX0gKmluc3RhbmNlLCBpbnQgaW5kZXgsIGZsb2F0IHZhbHVlKSB7Cglzd2l0Y2ggKGluZGV4KSB7CgkJe3t+aXQucGFyYW1ldGVyczpjfX1jYXNlIHBfe3s9Y319OgoJCQlpbnN0YW5jZS0+e3s9Y319ID0gdmFsdWU7CgkJCWJyZWFrOwoJCXt7fn19Cgl9Cn0KCmZsb2F0IHt7PWl0Lm5hbWV9fV9nZXRfcGFyYW1ldGVyKHt7PWl0Lm5hbWV9fSAqaW5zdGFuY2UsIGludCBpbmRleCkgewoJc3dpdGNoIChpbmRleCkgewoJCXt7fml0LnBhcmFtZXRlcnM6Y319Y2FzZSBwX3t7PWN9fToKCQkJcmV0dXJuIGluc3RhbmNlLT57ez1jfX07CgkJe3t+fX0KCX0KfQo=","base64")),
				"config_h": String(Buffer("CiNpZm5kZWYgX0NPTkZJR19ICiNkZWZpbmUgX0NPTkZJR19ICgovLyBEZWZpbml0aW9ucwoKI2RlZmluZSBJT19NT05PCQkJMQojZGVmaW5lIElPX1NURVJFTwkJKDE8PDEpCgpzdHJ1Y3QgY29uZmlnX2lvX2J1cyB7Cgljb25zdCBjaGFyCSpuYW1lOwoJY2hhcgkJIG91dDsKCWNoYXIJCSBhdXg7CgljaGFyCQkgY3Y7CgljaGFyCQkgY29uZmlnczsKfTsKCnN0cnVjdCBjb25maWdfcGFyYW1ldGVyIHsKCWNvbnN0IGNoYXIJKm5hbWU7Cgljb25zdCBjaGFyCSpzaG9ydE5hbWU7Cgljb25zdCBjaGFyCSp1bml0czsKCWNoYXIJCSBvdXQ7CgljaGFyCQkgYnlwYXNzOwoJaW50CQkgc3RlcHM7CglmbG9hdAkJIGRlZmF1bHRWYWx1ZVVubWFwcGVkOwp9OwoKLy8gRGF0YQoKI2RlZmluZSBDT01QQU5ZX05BTUUJCSJPcmFzdHJvbiIKI2RlZmluZSBDT01QQU5ZX1dFQlNJVEUJCSJodHRwczovL3d3dy5vcmFzdHJvbi5jb20vIgojZGVmaW5lIENPTVBBTllfTUFJTFRPCQkibWFpbHRvOmluZm9Ab3Jhc3Ryb24uY29tIgoKI2RlZmluZSBQTFVHSU5fTkFNRQkJInt7PWl0Lm5hbWV9fSIKI2RlZmluZSBQTFVHSU5fVkVSU0lPTgkJIjAuMC4xIgoKe3sgaWYgKGl0LmF1ZGlvX2lucHV0cy5sZW5ndGggPiAyKSB0aHJvdyBuZXcgRXJyb3IoIk1heCAyIGF1ZGlvIGlucHV0cyBzdXBwb3J0ZWQgaW4gdnN0MyBmb3Igbm93Iik7IH19Cnt7IGlmIChpdC5hdWRpb19vdXRwdXRzLmxlbmd0aCA+IDIpIHRocm93IG5ldyBFcnJvcigiTWF4IDIgYXVkaW8gb3V0cHV0cyBzdXBwb3J0ZWQgaW4gdnN0MyBmb3Igbm93Iik7IH19CgojZGVmaW5lIE5VTV9CVVNFU19JTgkJMQojZGVmaW5lIE5VTV9CVVNFU19PVVQJCTEKI2RlZmluZSBOVU1fQ0hBTk5FTFNfSU4JCXt7PWl0LmF1ZGlvX2lucHV0cy5sZW5ndGh9fQojZGVmaW5lIE5VTV9DSEFOTkVMU19PVVQJe3s9aXQuYXVkaW9fb3V0cHV0cy5sZW5ndGh9fQoKc3RhdGljIHN0cnVjdCBjb25maWdfaW9fYnVzIGNvbmZpZ19idXNlc19pbltOVU1fQlVTRVNfSU5dID0gewoJeyAiQXVkaW8gaW4iLCAwLCAwLCAwLCB7ez1pdC5hdWRpb19pbnB1dHMubGVuZ3RofX0gfQp9OwoKc3RhdGljIHN0cnVjdCBjb25maWdfaW9fYnVzIGNvbmZpZ19idXNlc19vdXRbTlVNX0JVU0VTX09VVF0gPSB7Cgl7ICJBdWRpbyBvdXQiLCAxLCAwLCAwLCB7ez1pdC5hdWRpb19vdXRwdXRzLmxlbmd0aH19IH0KfTsKCiNkZWZpbmUgTlVNX1BBUkFNRVRFUlMJCXt7PWl0LnBhcmFtZXRlcnMubGVuZ3RofX0KCnN0YXRpYyBzdHJ1Y3QgY29uZmlnX3BhcmFtZXRlciBjb25maWdfcGFyYW1ldGVyc1tOVU1fUEFSQU1FVEVSU10gPSB7Cgl7e35pdC5wYXJhbWV0ZXJzOnB9fQoJeyAie3s9cH19IiwgInt7PXB9fSIsICIiLCAwLCAwLCAwLCB7ez1pdC5wYXJhbWV0ZXJzX2luaXRpYWxWYWx1ZXNbcF19fSB9LHt7fn19Cn07CgovLyBJbnRlcm5hbCBBUEkKCiNpbmNsdWRlICJ7ez1pdC5uYW1lfX0uaCIKCiNkZWZpbmUgUF9UWVBFCQkJCXt7PWl0Lm5hbWV9fQojZGVmaW5lIFBfSU5JVAkJCQl7ez1pdC5uYW1lfX1faW5pdAojZGVmaW5lIFBfU0VUX1NBTVBMRV9SQVRFCQl7ez1pdC5uYW1lfX1fc2V0X3NhbXBsZV9yYXRlCnt7P2l0Lm1lbV9zZXRzLmxlbmd0aCA+IDB9fQojZGVmaW5lIFBfTUVNX1JFUQkJCXt7PWl0Lm5hbWV9fV9tZW1fcmVxCiNkZWZpbmUgUF9NRU1fU0VUCQkJe3s9aXQubmFtZX19X21lbV9zZXQKe3s/fX0KI2RlZmluZSBQX1JFU0VUCQkJCXt7PWl0Lm5hbWV9fV9yZXNldAojZGVmaW5lIFBfUFJPQ0VTUwkJCXt7PWl0Lm5hbWV9fV9wcm9jZXNzCiNkZWZpbmUgUF9TRVRfUEFSQU1FVEVSCQkJe3s9aXQubmFtZX19X3NldF9wYXJhbWV0ZXIKI2RlZmluZSBQX0dFVF9QQVJBTUVURVIJCQl7ez1pdC5uYW1lfX1fZ2V0X3BhcmFtZXRlcgoKI2VuZGlmCg==","base64")),
			},
			"vst3": {
				"config_vst3_h": String(Buffer("CiNpZm5kZWYgX1ZTVDNfQ09ORklHX0gKI2RlZmluZSBfVlNUM19DT05GSUdfSAoKI2RlZmluZSBQTFVHSU5fU1VCQ0FURUdPUlkJe3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA9PSAwfX0gIkluc3RydW1lbnR8U3ludGgiIHt7Pz99fSAiRngiIHt7P319CgojZGVmaW5lIFBMVUdJTl9HVUlEXzEJCTB4e3s9WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNikudG9TdHJpbmcoMTYpKS5qb2luKCcnKX19CiNkZWZpbmUgUExVR0lOX0dVSURfMgkJMHh7ez1bMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0ubWFwKCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE2KS50b1N0cmluZygxNikpLmpvaW4oJycpfX0KI2RlZmluZSBQTFVHSU5fR1VJRF8zCQkweHt7PVswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXS5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KSkuam9pbignJyl9fQojZGVmaW5lIFBMVUdJTl9HVUlEXzQJCTB4e3s9WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNikudG9TdHJpbmcoMTYpKS5qb2luKCcnKX19CgojZGVmaW5lIENUUkxfR1VJRF8xCQkweHt7PVswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXS5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KSkuam9pbignJyl9fQojZGVmaW5lIENUUkxfR1VJRF8yCQkweHt7PVswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXS5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KSkuam9pbignJyl9fQojZGVmaW5lIENUUkxfR1VJRF8zCQkweHt7PVswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXS5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KSkuam9pbignJyl9fQojZGVmaW5lIENUUkxfR1VJRF80CQkweHt7PVswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXS5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KSkuam9pbignJyl9fQoKI2VuZGlmCg==","base64")),
				"Makefile": String(Buffer("Uk9PVF9ESVIgOj0gJChzaGVsbCBkaXJuYW1lICQocmVhbHBhdGggJChmaXJzdHdvcmQgJChNQUtFRklMRV9MSVNUKSkpKQoKTkFNRSA6PSB7ez1pdC5uYW1lfX0KU09VUkNFIDo9IHt7PWl0Lm5hbWV9fS5jCgppbmNsdWRlICR7Uk9PVF9ESVJ9Ly4uLy4uL2NvbW1vbi92c3QzL3ZzdDMubWsKCkNYWEZMQUdTICs9IC1EUkVMRUFTRT0xIC1ETkRFQlVHIC1EQldfTk9fREVCVUcKI0NYWEZMQUdTICs9IC1EREVWRUxPUE1FTlQ9MSAtREJXX0RFQlVHX0RFRVAK","base64"))
			}
		}	
	};
	const bs = require("./blocks").BlockTypes;
	const ts = require("./types");
	const us = require("./uprates");
	const ut = require("./util");

	
	function prependTabs (s, tabLevel) {
		let tabs = '';
		for (let i = 0; i < tabLevel; i++)
			tabs += '\t';
		return s.toString().trim().split('\n').map(x => tabs + x).join('\n');
	};

	function LazyString (...init) {
		this.s = [];
		this.add = function (...x) {
			for (let k of x) {
				if (k == undefined)
					throw new Error(k);
				this.s.push(k);
			}
			return this;
		};
		this.toString = function () {
			let str = "";
			for (let p of this.s)
				str += p.toString();
			return str;
		};
		for (let i of init)
			this.add(i);
	};

	function get_funcs (target_language) {
		const keys = {
			array_indexer_l: '[',
			array_indexer_r: ']',
			object_prefix: 'instance->',
			const: 'const',
			static: 'static',
			type_int: 'int',
			type_float: 'float',
			type_bool: 'char',
			type_true: '1',
			type_false: '0',
			float_f_postfix: true,
			reserved_keywords: [
				"auto", "else", "long", "switch", "break", "enum", "register",
				"typedef", "case", "extern", "return", "union", "char",
				"float", "short", "unsigned", "const", "for", "signed", 
				"void", "continue", "goto", "sizeof", "volatile", "default",
				"if", "static", "while", "do", "int", "struct", "_Packed", "double"
			]
		};

		switch (target_language) {
		case "C":
			break;
		case 'cpp':
			keys.object_prefix = "this->";
			break;
		case "MATLAB":
			keys.array_indexer_l = '(';
			keys.array_indexer_r = ')';
			keys.object_prefix = '';
			keys.type_int = '';
			keys.type_float = '';
			keys.type_bool = '';
			keys.float_f_postfix = false;
			break;
		case "js":
			keys.object_prefix = "this.";
			keys.float_f_postfix = false;
			// TODO
			break;
		};

		const funcs = {};
		funcs["getArrayIndexer"] = (i) => new LazyString(keys.array_indexer_l, i, keys.array_indexer_r);
		funcs["getFloat"] = keys.float_f_postfix
			? (n) =>  {
				n = n + "";
				return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f')
			}
			: (n) => n + "";
		funcs["getInt"] = (n) => n;
		funcs["getBool"] = (n) => n ? keys.type_true : keys.type_false;
		funcs["getConstant"] = (n, datatype) => {
			if (ts.DataTypeFloat32 == datatype)
				return funcs.getFloat(n);
			if (ts.DataTypeInt32 == datatype)
				return funcs.getInt(n);
			if (ts.DataTypeBool == datatype) {
				return funcs.getBool(n);
			}
			throw new Error("getConstant. Type error");
		};
		funcs["getObjectPrefix"] = () => keys.object_prefix;
		funcs["getConstKey"] = () => keys.const;
		funcs["getStaticKey"] = () => keys.static;
		funcs["getTypeDecl"] = (t) => {
			if (ts.DataTypeFloat32 == t)
				return keys.type_float;
			if (ts.DataTypeInt32 ==  t)
				return keys.type_int;
			if (ts.DataTypeBool == t)
				return keys.type_bool;
			throw new Error("getTypeDecl. Type error");
		};
		funcs["getReservedKeywords"] = () => keys.reserved_keywords;

		funcs.Identifiers = function () {
			this.ids = [];
			const nuostr = Array.from(funcs.getReservedKeywords());
			nuostr.push('i', 'instance', 'n_samples', 'sample_rate', 'firstRun', 'x', 'y');
			nuostr.forEach(k => {
				this.ids.push( {
					raw: k,
					nrm: k,
				} );
			});
			this.add = function (raw_id) {
				var postfix = "";
				var nrm_id_ = normalize(raw_id);
				for (let x = 0; x < 10000; x++) {
					const nrm_id = nrm_id_ + postfix;
					if (this.ids.some(i => i.nrm == nrm_id)) {
						postfix = x;
						continue;
					}
					this.ids.push({
						raw: raw_id,
						nrm: nrm_id,
						added: true
					});
					return nrm_id;
				}
				throw new Error("Identifier almost impossible error");
			};
			function normalize (id) {
				id = id.replace(/[^a-zA-Z0-9_]/g, '');
				if (id.length == 0)
					id = '_';
				if (id[0].match(/[0-9]/))
					id = '_' + id;
				return id;
			};
		};
		funcs.Includes = function () {
			this.v = [];
			this.s = new funcs.Statements();
			this.add = function (id) {
				if (this.v.includes(id))
					return;
				this.v.push(id);
				this.s.add(id, '\n');
			};
			this.toString = function (tabs) {
				return this.s.toString(tabs);
			};
		};
		funcs.MemoryDeclaration = function (type, id, size) {
			this.s = new LazyString();
			this.s.add(funcs.getTypeDecl(type), ' ', id, '[', size, '];');
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.MemoryInit = function (id, size, value) {
			this.s = new LazyString();
			this.s.add("for (int i = 0; i < ", size, "; i++) { \n");
			this.s.add('\t', id, keys.array_indexer_l, 'i', keys.array_indexer_r, ' = ', value, ';\n');
			this.s.add('}');

			this.toString = function () {
				return this.s.toString();
			}
		};
		funcs.Declaration = function (isStatic, isConst, type, isPointer, id, lonely) {
			this.s = new LazyString();
			if (isStatic)
				this.s.add(funcs.getStaticKey(), ' ');
			if (isConst)
				this.s.add(funcs.getConstKey(), ' ');
			this.s.add(funcs.getTypeDecl(type), ' ');
			if (isPointer)
				this.s.add('*');
			this.s.add(id);
			if (lonely)
				this.s.add(";");
			
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.Assignment = function (l, r, declaration) {
			if (declaration) {
				this.s = declaration.s;
				this.s.add(' = ', r, ';');
			}
			else {
				this.s = new LazyString();
				this.s.add(l, ' = ', r, ';');
			}

			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.ParWrapper = function (s, parLevelOp, parLevelB) {
			this.s = new LazyString();
			if (parLevelB <= parLevelOp)
				this.s.add('(', s, ')');
			else
				this.s.add(s);
			this.toString = function () {
				return this.s.toString();
			};
		};
		funcs.Statements = function () {
			this.s = new LazyString();
			this.add = function (...x) {
				this.s.add.apply(this.s, x);
				this.s.add('\n');
				return this;
			};
			this.toString = function (tabLevel = 0) {
				return prependTabs(this.s, tabLevel);
			};
		};
		funcs.IfBlock = function () {
			this.condition = new LazyString();
			this.start = new LazyString('if ( ', this.condition, ' ) { \n');
			this.body = new funcs.Statements();
			this.end = new LazyString('\n} \n');

			this.toString = function (tabLevel = 0) {
				const r = this.start.toString() + this.body.toString(1) + this.end.toString();
				return prependTabs(r, tabLevel);
			};
		};
		funcs.ControlCoeffsGroup = function (control_dependencies) {
			this.control_dependencies = control_dependencies;
			this.equals = (s) => Set.checkEquality(this.control_dependencies, s);
			
			this.s = new funcs.IfBlock();
			this.s.condition.add(Array.from(control_dependencies).map(x => funcs.getObjectPrefix() + x + '_CHANGED').join(' | '));

			this.add = function (...x) {
				this.s.body.add.apply(this.s.body, x);
			};
			this.toString = function (tabLevel = 0) {
				return this.s.toString(tabLevel);
			};
		};
		funcs.ControlCoeffs = function () {
			this.groups = [];
			this.getOrAddGroup = function (control_dependencies) {
				var g = this.groups.find(g => g.equals(control_dependencies));
				if (g == undefined) {
					g = new funcs.ControlCoeffsGroup(control_dependencies);
					this.groups.push(g);
				}
				return g;
			};
			this.add = function (s, control_dependencies) {
				const g = this.getOrAddGroup(control_dependencies);
				g.add(s);
			};
			this.toString = function (tabLevel = 0) {
				return this.groups.map(g => g.toString(tabLevel)).join('\n');
			};
		};

		return funcs;
	};


	function convert (bdef, schedule, options) {

		const t = options.target_language;
		const funcs = get_funcs(t);

		const program = {

			name: "",

			identifiers: new funcs.Identifiers(),
			includes: new funcs.Includes(),

			audio_inputs: [],
			audio_outputs: [],
			parameters: [],
			parameters_initialValues: {},

			// Instance properties // Declarations
			parameter_states: new funcs.Statements(), // p, p_z1, p_CHANGED
			memory_declarations: new funcs.Statements(),
			states: new funcs.Statements(),
			coefficients: new funcs.Statements(),
			submodules: new funcs.Statements(),

			// mem reqs/sets
			mem_reqs: [],
			mem_sets: [],

			// Assignments
			init: new funcs.Statements(),
			reset: new funcs.Statements(),
			constants: new funcs.Statements(),
			fs_update: new funcs.Statements(),
			control_coeffs_update: new funcs.ControlCoeffs(),
			update_coeffs_ctrl: new funcs.Statements(),
			update_coeffs_audio: new funcs.Statements(),
			audio_update: new funcs.Statements(),
			memory_updates: new funcs.Statements(),

			output_updates: new funcs.Statements(),
		};

		(function init_strings () {
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => p.code = new LazyString());
				b.o_ports.forEach(p => p.code = new LazyString());
				if (bs.MemoryBlock.isPrototypeOf(b))
					b.code = new LazyString();
			});
			bdef.i_ports.forEach(p => p.code = new LazyString());
			bdef.o_ports.forEach(p => p.code = new LazyString());
		}());

		// TODO: check order and uniqueness in some weird cases, like a parameter called fs...
		// TODO: fix: calls -> cdef : n -> 1
		bdef.blocks.filter(b => bs.CallBlock.isPrototypeOf(b) && b.type == "cdef").forEach(b => {
			if (b.ref.state)
				program.identifiers.add(b.ref.state);
			if (b.ref.coeffs)
				program.identifiers.add(b.ref.coeffs);
		});
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateControl).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			program.parameters.push(id);
			p.code = code;
			program.parameters_initialValues[id] = options.initial_values[p.id]
				? funcs.getFloat(options.initial_values[p.id])
				: funcs.getFloat(0.5);
		});
		program.parameters.forEach(p => {
			const id = program.identifiers.add(p + '_z1');
			const d = new funcs.Declaration(false, false, ts.DataTypeFloat32, false, id, true);
			program.parameter_states.add(d);
		});
		program.parameters.forEach(p => {
			const id = program.identifiers.add(p + '_CHANGED');
			const d = new funcs.Declaration(false, false, ts.DataTypeBool, false, id, true);
			program.parameter_states.add(d);
		});	
		program.parameters.forEach(p => {
			program.identifiers.add('p_' + p);
		});
		program.parameters.forEach(p => {
			const id = p;
			const d = new funcs.Declaration(false, false, ts.DataTypeFloat32, false, id, true);
			program.parameter_states.add(d);
		});
		program.name = program.identifiers.add(bdef.id);
		program.identifiers.add('_' + bdef.id);
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateAudio).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_inputs.push(id);
			p.code = code;
		});
		bdef.i_ports.filter(p => p.updaterate() == us.UpdateRateFs).forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = funcs.getObjectPrefix() + id;
			p.code = code;
		});
		bdef.o_ports.forEach(p => {
			const id = program.identifiers.add(p.id);
			const code = new LazyString(id, funcs.getArrayIndexer('i'));
			program.audio_outputs.push(id);
			p.code = code;
		});
		

		schedule.forEach(b => {
			convert_block(b);
		});

		bdef.o_ports.forEach(p => {
			const c = bdef.connections.find(c => c.out == p);
			program.output_updates.add(new funcs.Assignment(c.out.code, c.in.code, false));
		});


		doT.templateSettings.strip = false
	
		if (t == 'C') {
			return [
				{ 
					path: '.',
					name: bdef.id + ".h",
					str: doT.template(templates["simple_c"])(program) 
				},
			];
		}

		if (t == 'bw') {
			return [
				{
					path: path.join(bdef.id, 'src'),
					name: bdef.id + '.h',
					str: doT.template(templates.bw.src.module_h)(program) 
				},
				{
					path: path.join(bdef.id, 'src'),
					name: bdef.id + '.c',
					str: doT.template(templates.bw.src.module_c)(program) 
				},
				{
					path: path.join(bdef.id, 'src'),
					name: 'config.h',
					str: doT.template(templates.bw.src.config_h)(program) 
				},
				{
					path: path.join(bdef.id, 'vst3'),
					name: 'config_vst3.h',
					str: doT.template(templates.bw.vst3.config_vst3_h)(program) 
				},
				{
					path: path.join(bdef.id, 'vst3'),
					name: 'Makefile',
					str: doT.template(templates.bw.vst3.Makefile)(program) 
				},
			];
		}

		throw new Error("Not recognized target language");

		function dispatch (b, ur, control_dependencies) {
			const outblocks = bdef.connections.filter(c => c.in.block == b).map(c => c.out.block);
			
			var locality = undefined; // 0 = constant, 1 = object, 2 = local
			var whereDec = undefined;
			var whereAss = undefined;

			const outblockurs = outblocks.map(bb => us.max.apply(null, bb.i_ports.concat(bb.o_ports)));
			const maxour = us.max.apply(null, outblockurs);

			locality = maxour.level <= ur.level ? 2 : 1;

			if (ur == us.UpdateRateConstant) {
				locality = 0;
				whereDec = program.constants;
				whereAss = program.init;
			}
			if (ur == us.UpdateRateFs) {
				if (locality == 2)
					whereDec = program.fs_update;
				else
					whereDec = program.coefficients;
				whereAss = program.fs_update;
			}
			if (ur == us.UpdateRateControl) {
				const g = program.control_coeffs_update.getOrAddGroup(control_dependencies);
				if (locality == 2) {
					locality = outblocks.every(bb => Set.checkEquality(control_dependencies, bb.control_dependencies)) ? 2 : 1;
				}
				if (locality == 2) {
					whereDec = g;
				}
				else {
					whereDec = program.coefficients;
				}
				whereAss = g;
			}
			if (ur == us.UpdateRateAudio) {
				locality = 2;
				whereDec = program.audio_update;
				whereAss = program.audio_update;
			}

			return {
				locality: locality,
				whereDec: whereDec,
				whereAss: whereAss
			};
		}


		function convert_block (b) {
			
			const input_block_out_ports = b.i_ports.map(p => bdef.connections.find(c => c.out == p).in);
			const input_blocks = input_block_out_ports.map(p => p.block);
			const input_codes = input_block_out_ports.map(p => p.code);
			
			const op0 = b.o_ports[0];

			if (bs.VarBlock.isPrototypeOf(b)) {
				
				const ur = b.o_ports[0].updaterate();
				const r = dispatch(b, ur, b.control_dependencies);
				const locality = r.locality;
				const whereDec = r.whereDec;
				const whereAss = r.whereAss;

				const id = program.identifiers.add(b.id);

				if (locality == 0) {
					op0.code.add(id);
					const d = new funcs.Declaration(false, false, b.datatype(), false, id, true);
					const a = new funcs.Assignment(id, input_codes[0], null);
					whereDec.add(d);
					whereAss.add(a);
				}
				else if (locality == 1) {
					const refid = funcs.getObjectPrefix() + id;
					op0.code.add(refid);
					const d = new funcs.Declaration(false, false, b.datatype(), false, id, true);
					const a = new funcs.Assignment(refid, input_codes[0], null);
					whereDec.add(d);
					whereAss.add(a);
				}
				else if (locality == 2) {
					op0.code.add(id);
					const d = new funcs.Declaration(false, true, b.datatype(), false, id, false);
					const a = new funcs.Assignment(null, input_codes[0], d);
					whereAss.add(a);	
				}
				return;
			}
			if (bs.MemoryBlock.isPrototypeOf(b)) {
				const id = program.identifiers.add(b.id);
				const d = new funcs.MemoryDeclaration(b.datatype(), id, input_codes[0]);
				b.code.add(funcs.getObjectPrefix(), id);

				program.memory_declarations.add(d);

				const i = new funcs.MemoryInit(b.code, input_codes[0], input_codes[1]);
				program.init.add(i);
				program.reset.add(i);

				return;
			}
			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				const c = op0.code;
				c.add(b.memoryblock.code);
				c.add(funcs.getArrayIndexer(input_codes[0]));
				return;
			}
			if (bs.MemoryWriterBlock.isPrototypeOf(b)) {
				const c = new LazyString();
				c.add(b.memoryblock.code);
				c.add(funcs.getArrayIndexer(input_codes[0]));
				const a = new funcs.Assignment(c, input_codes[1], null);
				program.memory_updates.add(a); // TODO: Might not be always the case
				return;
			}
			if (bs.ConstantBlock.isPrototypeOf(b)) {
				op0.code.add(funcs.getConstant(b.value, b.datatype()));
				return;
			}
			if (bs.MaxBlock.isPrototypeOf(b)) {
				op0.code.add("__max__(");
				op0.code.add(input_codes[0]);
				for (let i = 1; i < input_codes.length; i++)
					op0.code.add( ', ', input_codes[1]);
				op0.code.add(')');
				return;
			}
			if (bs.CallBlock.isPrototypeOf(b) && b.type == "cdef") {
				const cdef = b.ref;

				// Include
				program.includes.add(cdef.header);

				var state, coeffs;

				// Sub components declaration
				if (cdef.state) {
					const id = program.identifiers.add(cdef.state);
					const decl = cdef.state + ' ' + id + ';';
					program.submodules.add(decl);
					state = '&' + funcs.getObjectPrefix() + id;
				}
				if (cdef.coeffs) {
					const id = program.identifiers.add(cdef.coeffs);
					const decl = cdef.coeffs + ' ' + id + ';';
					program.submodules.add(decl);
					coeffs = '&' + funcs.getObjectPrefix() + id;
				}

				// functions dispatching
	
				function get_decls_assignments (locality, f) {

					const prefix = locality == 1 ? funcs.getObjectPrefix() : "";

					const inputs = [];
					const outputs = [];
					const decls = [];

					for (let i = 0; i < f.f_inputs.length; i++) {
						const input = f.f_inputs[i];
						if (input == 'state') {
							inputs.push(state);
						}
						if (input == "coeffs") {
							inputs.push(coeffs);
						}
						if (input[0] == 'i') {
							inputs.push(input_codes[input[1]]);
						}
						if (input[0] == 'o') {
							const type = b.o_ports[input[1]].datatype();
							const id = program.identifiers.add('_x_');
							const pid = prefix + id;
							const decl = new funcs.Declaration(false, false, type, false, id, true);
							const ref = '&' + pid;
							decls.push(decl);
							inputs.push(ref);
							b.o_ports[input[1]].code.add(pid);
						}
					}
					var alone = false;
					if (decls.length > 0) {
						alone = true;
					}
					if (f.f_outputs.length == 0) {
						alone = true;
					}
					else {
						const output = f.f_outputs[0];
						if (true) { //(decls.length > 0) {
							const type = b.o_ports[output[1]].datatype();
							const id = program.identifiers.add('_x_');
							const pid = prefix + id;
							const decl = new funcs.Declaration(false, false, type, false, id, true);
							decls.push(decl);
							b.o_ports[output[1]].code.add(pid);
							outputs.push(pid);
						}
						else {

						}
					}

					alone = true; // tmp
					const stmt = new LazyString();
					if (alone) {
						if (outputs.length > 0) {
							stmt.add(outputs[0], ' = ');
						}
						stmt.add(f.f_name, '(');
						for (let i = 0; i < inputs.length; i++) {
							stmt.add(inputs[i]);
							if (i != inputs.length - 1)
								stmt.add(', ');
						}
						stmt.add(');');
					}
					else {

					}

					return {
						decls: decls,
						assignments: [stmt]
					};
				}


				if (cdef.funcs.init) {
					const f = cdef.funcs.init;

					const locality = 1;
					const whereDec = program.constants;
					const whereAss = program.init;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.mem_req) {
					const f = cdef.funcs.mem_req;

					program.mem_reqs.push(
						f.f_name + '(' + coeffs + ')'
					);
				}

				if (cdef.funcs.mem_set) {
					const f = cdef.funcs.mem_set;

					program.mem_sets.push(
						f.f_name + '(' + coeffs + ', ' + state + ', m)'
					);
				}

				if (cdef.funcs.set_sample_rate) {
					const f = cdef.funcs.set_sample_rate;

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = program.fs_update;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.reset_coeffs) {
					const f = cdef.funcs.reset_coeffs;

					const locality = 1;
					const whereDec = program.coefficients; // TODO: program.reset_coeffs and reset_state
					const whereAss = program.reset;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.reset_state) {
					const f = cdef.funcs.reset_state;

					const locality = 1;
					const whereDec = program.coefficients; // TODO: program.reset_coeffs and reset_state
					const whereAss = program.reset;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}
				
				if (cdef.funcs.update_coeffs_ctrl) {
					const f = cdef.funcs.update_coeffs_ctrl;

					const i_ports = [];
					for (let i = 0; i < f.f_inputs.length; i++) {
						const input = f.f_inputs[i];
						if (input[0] == 'i') {
							i_ports.push(b.i_ports[input[1]]);
						}
					}
					const ur = us.max.apply(null, i_ports.map(p => p.updaterate()));

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = ur == us.UpdateRateAudio ? program.update_coeffs_audio : program.update_coeffs_ctrl;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				if (cdef.funcs.update_coeffs_audio) {
					const f = cdef.funcs.update_coeffs_audio;

					const locality = 1;
					const whereDec = program.coefficients;
					const whereAss = program.update_coeffs_audio;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}

				cdef.funcs.setters.forEach(setter => {
					const f = setter;
					
					const valueinputport = b.i_ports[f.f_inputs[1][1]];
					const inb = bdef.connections.find(c => c.out == valueinputport).in.block;
					const r = dispatch(b, valueinputport.updaterate(), inb.control_dependencies);
					const locality = r.locality;
					const whereDec = r.whereDec;
					const whereAss = r.whereAss;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				});

				if (cdef.funcs.process1) {
					const f = cdef.funcs.process1;

					// Simplification: outputs might be declared in different places
					const ur = us.max.apply(null, b.i_ports.concat(b.o_ports).map(p => p.updaterate()));
					const r = dispatch(b, ur, b.control_dependencies);
					const locality = r.locality;
					const whereDec = r.whereDec;
					const whereAss = r.whereAss;

					const rr = get_decls_assignments(locality, f);
					const decls = rr.decls;
					const assignments = rr.assignments;
				
					decls.forEach(d => whereDec.add(d));
					assignments.forEach(a => whereAss.add(a));
				}
				else {
					throw new Error("process1 is required");
				}

				return;
			}

			// Regular expressions now

			var w0, w1;
			if (b.i_ports.length == 1) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
			}
			if (b.i_ports.length == 2) {
				w0 = new funcs.ParWrapper(input_codes[0], input_blocks[0].parLevel, b.parLevel);
				w1 = new funcs.ParWrapper(input_codes[1], input_blocks[1].parLevel, b.parLevel);
			}

			if (bs.LogicalAndBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' && ', w1);
			}
			else if (bs.LogicalOrBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' || ', w1);
			}
			else if (bs.LogicalNotBlock.isPrototypeOf(b)) {
				op0.code.add('!', w0);
			}
			else if (bs.BitwiseOrBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' | ', w1);
			}
			else if (bs.BitwiseXorBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' ^ ', w1);
			}
			else if (bs.BitwiseAndBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' & ', w1);
			}
			else if (bs.BitwiseNotBlock.isPrototypeOf(b)) {
				op0.code.add('~', w0);
			}
			else if (bs.EqualityBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' == ', w1);
			}
			else if (bs.InequalityBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' != ', w1);
			}
			else if (bs.LessBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' < ', w1);
			}
			else if (bs.GreaterBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' > ', w1);
			}
			else if (bs.LessEqualBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' <= ', w1);
			}
			else if (bs.GreaterEqualBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' >= ', w1);
			}
			else if (bs.ShiftLeftBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' << ', w1);
			}
			else if (bs.ShiftRightBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' >> ', w1);
			}
			else if (bs.SumBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' + ', w1);
			}
			else if (bs.SubtractionBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' - ', w1);
			}
			else if (bs.MulBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' * ', w1);
			}
			else if (bs.DivisionBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' / ', w1);
			}
			else if (bs.UminusBlock.isPrototypeOf(b)) {
				op0.code.add('-', w0);
			}
			else if (bs.ModuloBlock.isPrototypeOf(b)) {
				op0.code.add(w0, ' % ', w1);
			}
			else if (bs.CastF32Block.isPrototypeOf(b)) {
				op0.code.add('(float)', w0);
			}
			else if (bs.CastI32Block.isPrototypeOf(b)) {
				op0.code.add('(int)', w0);
			}
			else if (bs.CastBoolBlock.isPrototypeOf(b)) {
				op0.code.add('(char)', w0);
			}
			
			else {
				throw new Error("Unexpected block type: " + b + b.ref.id + b.type);
			}
		};
	};

	exports["convert"] = convert;
}());
}).call(this)}).call(this,require("buffer").Buffer)
},{"./blocks":1,"./types":8,"./uprates":9,"./util":10,"buffer":16,"dot":12,"path":34}],5:[function(require,module,exports){
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

	function parse_include (s) {
		s = s.substr(8).replace(/[; \t]+$/, '');
		var id = s.match(/[_a-zA-Z0-9]*/);
		if (id)
			id = id[0];
		if (!id || s.length != id.length)
			throw new Error("Bad include line");
		return id;
	}

	function detach_includes (str) {

		const includes = [];

		var lines = str.split('\n');
		var i = 0;
		for (; i < lines.length; i++) {
			const l = lines[i].trim();

			if (l.length == 0)
				continue;
			if (l[0] == '#')
				continue;
			if (l.startsWith('include ')) {
				includes.push(parse_include(l));
				continue;
			}
			break;
		}

		lines = lines.slice(i, lines.length);
		str = lines.join('\n');

		return [str, includes];
	}

	function preprocess (str, filereader) {

		var program = "";
		var jsons = [];
		var included_files = [];

		const toparse = [ str ];
		for (let i = 0; i < toparse.length; i++) {
			const tp = toparse[i];

			const r = detach_includes(tp);
			program += '\n' + r[0];

			r[1].forEach(include => {
				var filename;
				var s;
				filename = include + '.crm';
				if (included_files.includes(filename))
					return;
				s = filereader(filename);
				if (s) {
					included_files.push(filename);
					toparse.push(s);
					return;
				}
				filename = include + ".json";
				if (included_files.includes(filename))
					return;
				s = filereader(filename);
				if (s) {
					included_files.push(filename);
					const j = JSON.parse(s);
					if (j.wrapper)
						toparse.push(j.wrapper.join('\n'));
					jsons.push(j);
					return;
				}
				throw new Error("Invalid/Not found included file");
			});
		}

		return [program, jsons];
	}

	exports["preprocess"] = preprocess;
}());
},{}],6:[function(require,module,exports){
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

	const bs = require("./blocks").BlockTypes;
	
	function schedule (bdef, options) {

		const iconns = bdef.o_ports.map(p => bdef.connections.find(c => c.out == p));
		const roots = iconns.map(c => c.in.block);
		const scheduled_blocks = [];
		
		for (let i = 0; i < roots.length; i++) {
			schedule_block (roots[i], []);
		}

		bdef.blocks.forEach(b => delete b.__visited__);

		function schedule_block (b, stack) {
			if (b == bdef)
				return;

			if (stack.includes(b))
				throw new Error("Found loop while scheduling. Stack: " + stack.join(', ') + ". + " + b);
			const nstack = stack.concat(b);

			if (b.__visited__)
				return;
			b.__visited__ = true;

			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				roots.push(b.memoryblock);
			}

			if (bs.MemoryBlock.isPrototypeOf(b)) {
				const mwriters = bdef.blocks.filter(bb => bs.MemoryWriterBlock.isPrototypeOf(bb) && bb.memoryblock == b);
				mwriters.forEach(mw => roots.push(mw));
			}

			b.i_ports.forEach(p => {
				const bb = bdef.connections.find(c => c.out == p).in.block;
				schedule_block(bb, nstack);
			});

			scheduled_blocks.push(b);
		}

		return scheduled_blocks;

	}
	exports["schedule"] = schedule;
}());

},{"./blocks":1}],7:[function(require,module,exports){
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

/*
	TODO: Error messages / system
*/

(function() {

	const util = require("util");

	function ScopeTable (father) {
		this.elements = [];
		this.father = father;
		this.findLocally = function (id) {
			return this.elements.filter(e => e.id == id);
		};
		this.findGlobally = function (id) {
			let r = this.findLocally(id);
			if (this.father)
				r = r.concat(this.father.findGlobally(id)); // Order matters
			return r;
		};
		this.add = function (node) {
			if (!['BLOCK_DEFINITION', 'VARIABLE', 'MEMORY_DECLARATION'].includes(node.name))
				err("Only BLOCK_DEFINITIONs, VARIABLEs, and MEMORY_DECLARATIONs allowed in ScopeTable");
			this.elements.push(node);
		};
	};

	const reserved_variables = ["fs"];
	const allowed_properties = ["fs", "init"];

	const globalScope = new ScopeTable(null);
	globalScope.add({ name: "VARIABLE", id: "fs" });
	

	function validateAST (root) {
		let scope = new ScopeTable(globalScope);
		analyze_block_statements(root.statements, scope);
	}

	function analyze_block_statements(statements, scope) {
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_signature(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration(s, scope));
		statements.filter(s => s.name == "ASSIGNMENT").forEach(s => analyze_assignment_left(s, scope));
		statements.filter(s => s.name == 'MEMORY_DECLARATION').forEach(s => analyze_memory_declaration_exprs(s, scope));
		statements.filter(s => s.name == 'ASSIGNMENT').forEach(s => analyze_assignment_right(s, scope));
		statements.filter(s => s.name == 'BLOCK_DEFINITION').forEach(s => analyze_block_body(s, scope));
	}

	function analyze_block_signature (bdef, scope) {
		if (bdef.inputs.some(i => i.name != 'VARIABLE'))
			err("Block definition inputs must be IDs");
		if (bdef.inputs.some(i => reserved_variables.includes(i.id)))
			err("Cannot use reserved variables here");
		if (bdef.outputs.some(o => o.name != 'VARIABLE'))
			err("Block definition outputs must be IDs");
		if (bdef.outputs.some(o => reserved_variables.includes(o.id)))
			err("Cannot use reserved variables here");

		scope.findLocally(bdef.id).forEach(e => {
			if (e.name != 'BLOCK_DEFINITION')
				err("Identifier used locally for both Block definition and variable");
			if (compare_block_signatures(bdef, e) > 2) 
				err("Block definitions conflict");
		});

		scope.add(bdef);
	}

	function compare_block_signatures(bdef_A, bdef_B) {
		if (bdef_A.id != bdef_B.id)
			return 0;
		if (bdef_A.inputs.length != bdef_B.inputs.length)
			return 1;
		for (let i = 0; i < bdef_A.inputs.length; i++) {
			var dA = bdef_A.inputs[i].declaredType || 'FLOAT32';
			var dB = bdef_B.inputs[i].declaredType || 'FLOAT32';
			if (dA != dB)
				return 2;
		}
		if (bdef_A.outputs.length != bdef_B.outputs.length)
			return 3;
		for (let o = 0; o < bdef_A.outputs.length; o++)
			if (bdef_A.outputs[o].declaredType != bdef_B.outputs[o].declaredType)
				return 4;
		return 5;
	}

	function analyze_memory_declaration (mdef, scope) {
		if (scope.findLocally(mdef.id).length > 0)
			err("ID used more than once");
		scope.add(mdef);
	}

	function analyze_memory_declaration_exprs (mdef, scope) {
		analyze_expr(mdef.size, scope, 1, false);
	}

	function analyze_assignment_left (assignment, scope) {

		assignment.outputs.forEach(o => {
			switch (assignment.type) {
			case 'EXPR':
				if (!['VARIABLE', 'DISCARD', 'PROPERTY', 'MEMORY_ELEMENT'].includes(o.name))
					err("Only 'VARIABLE', 'DISCARD', 'PROPERTY', 'MEMORY_ELEMENT' allowed when assigning an EXPR");
				break;
			case 'ANONYMOUS_BLOCK':
			case 'IF_THEN_ELSES':
				if (!['VARIABLE'].includes(o.name))
					err("Only 'VARIABLE' allowed when assigning an ANONYMOUS_BLOCK or IF_THEN_ELSES");
				break;
			default:
				err("Unexpected Assignment type");
			}

			if (reserved_variables.includes(o.id))
				err("Cannot use reserved_variables in assignments");
			
			if (o.name == 'VARIABLE') {
				let elements = scope.findLocally(o.id);
				if (elements.filter(e => e.name == 'BLOCK_DEFINITION').length > 0)
					err("ID already used for a BLOCK_DEFINITION");
				if (elements.filter(e => e.name == 'MEMORY_DECLARATION').length > 0)
					err("use [] operator to access memory");
				elements = elements.filter(e => e.name == 'VARIABLE');
				if (elements.length == 0) {
					o.assigned = true;
					scope.add(o);
				}
				else if (elements.length == 1) {
					if (elements[0].assigned)
						err("Variable assigned twice, or you are trying to assign an input");
					if (o.declaredType != undefined)
						err("Redeclaration");
					elements[0].assigned = true;
				}
				else
					err("Found ID multiple times");				
			}
			if (o.name == 'PROPERTY') {

				check_property_left(o);

				function check_property_left (p) {
					if (p.expr.name == 'VARIABLE') {
						let elements = scope.findLocally(p.expr.id);
						if (elements.length != 1)
							err("Property of undefined");
						if (!['VARIABLE', 'MEMORY_DECLARATION'].includes(elements[0].name))
							err("You can assign properties only to VARIABLEs and MEMORY_DECLARATIONs");
						if (elements[0].is_input)
							err("Cannot set properties of inputs");
						elements[0][p.property_id] = p;
					}
					else if (p.expr.name == 'PROPERTY') {
						check_property_left(p.expr);
					}
					else {
						err("Cannot assign property to this");
					}
					if (!allowed_properties.includes(p.property_id))
						err("Property not allowed");
				}
			}
			if (o.name == 'MEMORY_ELEMENT') {
				let elements = scope.findLocally(o.id);
				if (elements.length != 1)
					err("Memory element not found");
				if (elements[0].name != 'MEMORY_DECLARATION')
					err("[] is allowed only for memory");
			}
		});
	}

	function analyze_assignment_right (assignment, scope) {
		if (assignment.type == 'EXPR') {
			if (assignment.expr.name == 'ARRAY_CONST') {
				const o = assignment.outputs[0];
				if (o.name != 'PROPERTY' || o.property_id != 'init')
					err("Array can be assigned to init propety only");
			}
			analyze_expr(assignment.expr, scope, assignment.outputs.length, true);
		}
		if (assignment.type == 'ANONYMOUS_BLOCK') {
			const newscope = new ScopeTable(scope);
			assignment.outputs.forEach(o => {
				o.assigned = false;
				newscope.add(o);
			});
			analyze_block_statements(assignment.expr.statements, newscope);
			assignment.outputs.forEach(o => {
				if (o.assigned == false)
					err("Output not assigned");
			});
		}
		if (assignment.type == 'IF_THEN_ELSES') {
			assignment.expr.branches.forEach(b => {
				if (b.condition)
					analyze_expr(b.condition, scope, 1, false);
				const newscope = new ScopeTable(scope);
				assignment.outputs.forEach(o => {
					o.assigned = false;
					newscope.add(o);
				});
				analyze_block_statements(b.block.statements, newscope);
				assignment.outputs.forEach(o => {
					if (o.assigned == false)
						err("Output not assigned");
				});
			});
		}
	}

	function analyze_block_body(bdef, scope) {
		
		const newscope = new ScopeTable(scope);
		bdef.inputs.forEach(i => {
			i.assigned = true;
			i.is_input = true;
			newscope.add(i);
		});
		bdef.outputs.forEach(o => {
			o.assigned = false;
			newscope.add(o);
		});
		analyze_block_statements(bdef.statements, newscope);
		bdef.outputs.forEach(o => {
			if (o.assigned == false)
				err("Output not assigned");
		});
		bdef.inputs.forEach(i => {
			if (!i.used)
				warn("Input not used");
		});
	}

	function analyze_expr(expr, scope, outputsN, isRoot) {
		let expr_outputsN = 1;
		switch (expr.name) {
		case "VARIABLE": 
		{
			if (expr.declaredType)
				err("Unexpected type declaration in expression");
			let vs = scope.findGlobally(expr.id);
			let found = false;
			for (let v of vs) {
				if (v.name != 'VARIABLE')
					err("Not a variable");
				found = true;
				v.used = true;
				break;
			}
			if (!found)
				err("ID not found" + expr.id +  vs.join(',,'));
			break;
		}
		case "PROPERTY":
		{
			if (expr.expr.name == 'VARIABLE') {
				if (reserved_variables.includes(expr.expr.id))
					err("Cannot access properties of reserved_variables");
				analyze_expr({ name: "VARIABLE", id: expr.expr.id }, scope, 1, false);
			}
			else if (expr.expr.name == 'MEMORY_ELEMENT') {
				err("Cannot access properties of memory elements");
			}
			else {
				analyze_expr(expr.expr, scope, 1, false);
			}

			if (!allowed_properties.includes(expr.property_id))
				err("Property not allowed");
			break;
		}
		case "MEMORY_ELEMENT":
		{
			let mdefs = scope.findGlobally(expr.id);
			let found = false;
			for (let m of mdefs) {
				if (m.name != 'MEMORY_DECLARATION')
					err("That's not memory");
				found = true;
				break;
			}
			if (!found)
				err("ID not found");
			break;
		}
		case "DISCARD":
		{
			err("DISCARD not allowed in expressions");
			break;
		}
		case "CALL_EXPR":
		{
			let bdefs = scope.findGlobally(expr.id);
			let found = false;
			for (let b of bdefs) {
				if (b.name != "BLOCK_DEFINITION")
					err("Calling something that is not callable");
				if (b.inputs.length != expr.args.length)
					continue;
				expr_outputsN = b.outputs.length;
				expr.outputs_N = expr_outputsN;
				found = true;
				break;
			}
			if (found)
				break;

			// Might be a C block call
			expr.outputs_N = outputsN;
			expr_outputsN = outputsN;
			break;
		}
		case "ARRAY_CONST":
		{
			if (!isRoot)
				err("Cannot use array in subexpressions");
			break;
		}
		}

		if (expr_outputsN != outputsN)
			err("Number of outputs accepted != number of block outputs: " + expr_outputsN + ", " + outputsN);

		if (expr.args)
			expr.args.forEach(arg => analyze_expr(arg, scope, 1, false));
	}

	function err (msg) {
		throw new Error(msg);
	}

	function warn (msg) {
		console.warn("*** Warning *** " + msg);
	}

	exports["validateAST"] = validateAST;
}());
},{"util":38}],8:[function(require,module,exports){
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

	const DataTypeGeneric = {};
	DataTypeGeneric.toString = () => "GenericType";
	
	const DataTypeFloat32 = Object.create(DataTypeGeneric);
	DataTypeFloat32.toString = () => "float32";
	
	const DataTypeInt32 = Object.create(DataTypeGeneric);
	DataTypeInt32.toString = () => "int32";
	
	const DataTypeBool = Object.create(DataTypeGeneric);
	DataTypeBool.toString = () => "bool";

	exports["DataTypeGeneric"] = DataTypeGeneric;
	exports["DataTypeFloat32"] = DataTypeFloat32;
	exports["DataTypeInt32"] = DataTypeInt32;
	exports["DataTypeBool"] = DataTypeBool;

}());
},{}],9:[function(require,module,exports){
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

	const UpdateRateGeneric = {};
	UpdateRateGeneric.level = undefined;
	UpdateRateGeneric.toString = () => "UpdateRateGeneric";

	const UpdateRateConstant = Object.create(UpdateRateGeneric);
	UpdateRateConstant.level = 0;
	UpdateRateConstant.toString = () => "UpdateRateConstant";

	const UpdateRateFs = Object.create(UpdateRateGeneric);
	UpdateRateFs.level = 1;
	UpdateRateFs.toString = () => "UpdateRateFs";

	const UpdateRateControl = Object.create(UpdateRateGeneric);
	UpdateRateControl.level = 2;
	UpdateRateControl.toString = () => "UpdateRateControl";
	
	const UpdateRateAudio = Object.create(UpdateRateGeneric);
	UpdateRateAudio.level = 3;
	UpdateRateAudio.toString = () => "UpdateRateAudio";

	function max (...x) {
		var r = x[0];
		for (let k of x) {
			//if (k == UpdateRateGeneric)
			//	throw new Error("UpdateRateGeneric");
			if (k.level > r.level)
				r = k;
		}
		return r;
	}

	function min (...x) {
		var r = x[0];
		for (let k of x) {
			//if (k == UpdateRateGeneric)
			//	throw new Error("UpdateRateGeneric");
			if (k.level < r.level)
				r = k;
		}
		return r;
	}

	function equal (...x) {
		var r = x[0];
		for (let k of x) {
			if (k != r)
				return false;
		}
		return true;
	}

	exports["UpdateRateGeneric"] = UpdateRateGeneric;
	exports["UpdateRateConstant"] = UpdateRateConstant;
	exports["UpdateRateFs"] = UpdateRateFs;
	exports["UpdateRateControl"] = UpdateRateControl;
	exports["UpdateRateAudio"] = UpdateRateAudio;

	exports["max"] = max;
	exports["min"] = min;
	exports["equal"] = equal;

}());
},{}],10:[function(require,module,exports){
(function() {

	Array.checkInclusion = function (A, B) {
		return A.every(a => B.some(b => a == b));
	};
	Set.checkInclusion = function (A, B) { // if A is included in B
		return Array.checkInclusion(Array.from(A), Array.from(B));
	};
	Set.checkEquality = function (A, B) {
		A = Array.from(A);
		B = Array.from(B);
		return Array.checkInclusion(A, B) && Array.checkInclusion(B, A);
	};

	function graphToGraphviz (g, path) {
		let ui = 0;
		function getUID () {
			return "A" + ui++;
		}
		function convertCompositeBlock (bdef) {
			let s = "";
			let conns = "";
			let props = "";
			s += "subgraph cluster" + getUID() + " { \n";
			s += "label = \"" + bdef.id + "\"; \n";
			bdef.i_ports.forEach((p, i) => {
				s += p.__gvizid__ + "[ label = \"i_" + i + "\" style=filled,color=lightgrey ]; \n";
			});
			bdef.blocks.forEach(b => {
				s += convertBlock(b);
			});
			bdef.bdefs.forEach(bd => {
				let r = convertCompositeBlock(bd);
				s += r[0];
				conns += r[1];
				props += r[2];
			});
			bdef.o_ports.forEach((p, i) => {
				s += p.__gvizid__ + "[ label = \"o_" + i + "\" style=filled,color=darkgrey ]; \n";
			});
			bdef.connections.forEach(c => {
				if (!c.in || !c.out || !c.in.__gvizid__ || !c.out.__gvizid__)
					console.warn("Invalid connection, ", c.toString());
				conns += c.in.__gvizid__ + " -> " + c.out.__gvizid__ + ";\n";
			});
			bdef.properties.forEach(p => {
				if (!bdef.blocks.includes(p.of) || !bdef.blocks.includes(p.block)) {
					//console.warn("Invalid property, ", p.of.toString(), p.block.toString() );
					return
				}
				props += (p.block.o_ports[0] || p.block.i_ports[0]).__gvizid__ + " -> " + (p.of.o_ports[0] || p.of.i_ports[0]).__gvizid__ + "[style=\"dotted\", color=\"purple\", arrowhead=none];\n";
			});
			s += "} \n";
			return [s, conns, props];
		}
		function convertBlock (b) {
			let s = "";
			// same uid for every port
			let u = (b.o_ports[0] || b.i_ports[0]).__gvizid__;
			b.i_ports.forEach(p => p.__gvizid__ = u);
			b.o_ports.forEach(p => p.__gvizid__ = u);

			const ur = b.i_ports.concat(b.o_ports).map(x =>  {
				try {
					return x.updaterate();
				}
				catch (e) {
					return { level: undefined };
				}
			}).reduce((a, b) => b.level > a.level ? b : a);
			const urc = ur.level == undefined ? "red" : (ur.level == 0 ? "green" : (ur.level == 1 ? "yellow" : (ur.level == 2 ? "orange" : "blue"))); 
			s += u + "[" + "label = \"" + (b.id || (b.value != undefined ? " " + b.value : null ) || b.operation || ".") + "\"" + "color=" + urc + "]; \n";
			return s;
		}

		function bdefsetUID (bdef) {
			bdef.i_ports.forEach(p => p.__gvizid__ = getUID());
			bdef.o_ports.forEach(p => p.__gvizid__ = getUID());
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => p.__gvizid__ = getUID());
				b.o_ports.forEach(p => p.__gvizid__ = getUID());
			})
			bdef.bdefs.forEach(bd => bdefsetUID(bd));
		}
		function bdefremUID (bdef) {
			bdef.i_ports.forEach(p => delete p.__gvizid__);
			bdef.o_ports.forEach(p => delete p.__gvizid__);
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => delete p.__gvizid__);
				b.o_ports.forEach(p => delete p.__gvizid__);
			})
			bdef.bdefs.forEach(bd => bdefremUID(bd));
		}

		bdefsetUID(g);

		let s = "";
		s += "digraph D {\n";
		s += "rankdir=LR; \n";
		s += "compound=true \n";
		s += "node [shape=record];\n";
		let r = convertCompositeBlock(g);
		s += r[0];
		s += r[1];
		s += r[2];
		s += "\n}\n";

		bdefremUID(g);

		return s;
	}


	// Is this the best place for this?


	function get_filereader (dirs) {
	
		const fs = require("fs");
		const path = require("path");

		return function (filename) {

			for (var i = 0; i < dirs.length; i++) {
				const d = dirs[i];
				try {
					const p = path.join(d, filename);
					const data = fs.readFileSync(p, 'utf8');
					return data;
				} catch (err) {
			  		// Not in this dir;
				}
			}
			return null;
		};
	}
	

	// TODO: make it better
	function warn (msg) {
		console.log("***Warning***", msg);
	}

	exports["graphToGraphviz"] = graphToGraphviz;
	exports["get_filereader"] = get_filereader;

}());
},{"fs":13,"path":34}],11:[function(require,module,exports){
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

	const prepro = require("../src/preprocessor");
	const parser = require("../src/grammar");
	const syntax = require("../src/syntax");
	const graph  = require("../src/graph");
	const schdlr = require("../src/scheduler");
	const outgen = require("../src/outgen");
	const util   = require("../src/util");

	
	const options_descr = `
		
		debug_mode: true/false
		initial_block_id: unspaced string
		initial_block_inputs_n: number
		control_inputs: array of strings
		initial_values: array of { id: string, value: string } objects
		target_language: simpleC/bw
		optimizations: object of properties
			{
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			}

	`;

	function compile (code, filereader, options_ = {}) {

		const options = {
			debug_mode: false,
			initial_block_id: "",
			initial_block_inputs_n: -1, // Optional (and not checked) if there's a unique bdef with that id. All input types must be float32
			control_inputs: [], // List of ids. Inputs with such ids will carry UpdateRateControl
			initial_values: [],
			target_language: "",
			optimizations: {
				remove_dead_graph: true,
				negative_negative: true,
				negative_consts: true,
				unify_consts: true,
				remove_useless_vars: true,
				merge_max_blocks: true,
				simplifly_max_blocks1: true,
				simplifly_max_blocks2: true,
				lazyfy_subexpressions_rates: true,
				lazyfy_subexpressions_controls: true,
			},
		};

		for (let p in options_) {
			options[p] = options_[p];
		}


		const r = prepro.preprocess(code, filereader);
		code = r[0];
		const jsons = r[1];

		const AST = parser.parse(code);
		syntax.validateAST(AST);

		const g = graph.ASTToGraph(AST, options, jsons);
		graph.flatten(g, options);
		graph.optimize(g, options);

		const s = schdlr.schedule(g, options);

		const o = outgen.convert(g, s, options);

		return o;
	}

	exports.compile = compile;

}());
},{"../src/grammar":2,"../src/graph":3,"../src/outgen":4,"../src/preprocessor":5,"../src/scheduler":6,"../src/syntax":7,"../src/util":10}],12:[function(require,module,exports){
// doT.js
// 2011-2014, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function () {
	"use strict";

	var doT = {
		name: "doT",
		version: "1.1.1",
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	"it",
			strip:		true,
			append:		true,
			selfcontained: false,
			doNotSkipEncoded: false
		},
		template: undefined, //fn, compile template
		compile:  undefined, //fn, for express
		log: true
	}, _globals;

	doT.encodeHTMLSource = function(doNotSkipEncoded) {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" },
			matchHTML = doNotSkipEncoded ? /[&<>"'\/]/g : /&(?!#?\w+;)|<|>|"|'|\//g;
		return function(code) {
			return code ? code.toString().replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : "";
		};
	};

	_globals = (function(){ return this || (0,eval)("this"); }());

	/* istanbul ignore else */
	if (typeof module !== "undefined" && module.exports) {
		module.exports = doT;
	} else if (typeof define === "function" && define.amd) {
		define(function(){return doT;});
	} else {
		_globals.doT = doT;
	}

	var startend = {
		append: { start: "'+(",      end: ")+'",      startencode: "'+encodeHTML(" },
		split:  { start: "';out+=(", end: ");out+='", startencode: "';out+=encodeHTML(" }
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === "string") ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf("def.") === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ":") {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return "";
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, "_");
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g," ")
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,""): str)
			.replace(/'|\\/g, "\\$&")
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.startencode + unescape(code) + cse.end;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, "\\n").replace(/\t/g, '\\t').replace(/\r/g, "\\r")
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, "");
			//.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode) {
			if (!c.selfcontained && _globals && !_globals._encodeHTML) _globals._encodeHTML = doT.encodeHTMLSource(c.doNotSkipEncoded);
			str = "var encodeHTML = typeof _encodeHTML !== 'undefined' ? _encodeHTML : ("
				+ doT.encodeHTMLSource.toString() + "(" + (c.doNotSkipEncoded || '') + "));"
				+ str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			/* istanbul ignore else */
			if (typeof console !== "undefined") console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());

},{}],13:[function(require,module,exports){

},{}],14:[function(require,module,exports){
(function (global){(function (){
'use strict';

var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g = typeof globalThis === 'undefined' ? global : globalThis;

module.exports = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],15:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],16:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":15,"buffer":16,"ieee754":28}],17:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('./');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"./":18,"get-intrinsic":22}],18:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var GetIntrinsic = require('get-intrinsic');

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"function-bind":21,"get-intrinsic":22}],19:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;

},{"is-callable":31}],20:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],21:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":20}],22:[function(require,module,exports){
'use strict';

var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

try {
	null.error; // eslint-disable-line no-unused-expressions
} catch (e) {
	// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
	var errorProto = getProto(getProto(e));
	INTRINSICS['%Error.prototype%'] = errorProto;
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('has');
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"function-bind":21,"has":27,"has-symbols":24}],23:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"get-intrinsic":22}],24:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":25}],25:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],26:[function(require,module,exports){
'use strict';

var hasSymbols = require('has-symbols/shams');

module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};

},{"has-symbols/shams":25}],27:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":21}],28:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],29:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],30:[function(require,module,exports){
'use strict';

var hasToStringTag = require('has-tostringtag/shams')();
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{"call-bind/callBound":17,"has-tostringtag/shams":26}],31:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};

},{}],32:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = require('has-tostringtag/shams')();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};

},{"has-tostringtag/shams":26}],33:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();
var gOPD = require('gopd');

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			toStrTags[typedArray] = descriptor.get;
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var anyTrue = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!anyTrue) {
			try {
				anyTrue = getter.call(value) === typedArray;
			} catch (e) { /**/ }
		}
	});
	return anyTrue;
};

module.exports = function isTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) {
		var tag = $slice($toString(value), 8, -1);
		return $indexOf(typedArrays, tag) > -1;
	}
	if (!gOPD) { return false; }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":14,"call-bind/callBound":17,"for-each":19,"gopd":23,"has-tostringtag/shams":26}],34:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":35}],35:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],36:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],37:[function(require,module,exports){
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict';

var isArgumentsObject = require('is-arguments');
var isGeneratorFunction = require('is-generator-function');
var whichTypedArray = require('which-typed-array');
var isTypedArray = require('is-typed-array');

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});

},{"is-arguments":30,"is-generator-function":32,"is-typed-array":33,"which-typed-array":39}],38:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = require('./support/types');

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;

}).call(this)}).call(this,require('_process'))
},{"./support/isBuffer":36,"./support/types":37,"_process":35,"inherits":29}],39:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');
var gOPD = require('gopd');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		if (typeof g[typedArray] === 'function') {
			var arr = new g[typedArray]();
			if (Symbol.toStringTag in arr) {
				var proto = getPrototypeOf(arr);
				var descriptor = gOPD(proto, Symbol.toStringTag);
				if (!descriptor) {
					var superProto = getPrototypeOf(proto);
					descriptor = gOPD(superProto, Symbol.toStringTag);
				}
				toStrTags[typedArray] = descriptor.get;
			}
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var foundName = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!foundName) {
			try {
				var name = getter.call(value);
				if (name === typedArray) {
					foundName = name;
				}
			} catch (e) {}
		}
	});
	return foundName;
};

var isTypedArray = require('is-typed-array');

module.exports = function whichTypedArray(value) {
	if (!isTypedArray(value)) { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) { return $slice($toString(value), 8, -1); }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":14,"call-bind/callBound":17,"for-each":19,"gopd":23,"has-tostringtag/shams":26,"is-typed-array":33}]},{},[11])(11)
});
