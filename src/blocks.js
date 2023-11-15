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

	class Port {
		id;
		block;
		datatype;
		updaterate;
		constructor (block, datatype, updaterate) {
			this.block = block;
			this.datatype = datatype;
			this.updaterate = updaterate;
		};
		type () {
			if (this.block.i_ports.includes(this)) return "in";
			if (this.block.o_ports.includes(this)) return "out";
		};
		index () {
			if (this.type() == "in")  return this.block.i_ports.indexOf(this);
			if (this.type() == "out") return this.block.o_ports.indexOf(this);
		};
		clone (block) {
			const r = new Port(block, this.datatype, this.updaterate);
			r.id = this.id;
			return r;
		};
		validate () {
			if (!this.block)
				throw new Error("Invalid port block");
			if (!this.datatype)
				throw new Error("Invalid datatype");
			if (!this.updaterate)
				throw new Error("Invalid updaterate");
		};
		toString () {
			return this.block.toString() + (this.id ? "-" + this.id : "") + "[" + this.type() + ": " + this.index() + ": " + this.datatype.toString() + "]";
		};
	};

	class Block {
		operation = "generic";
		i_ports;
		o_ports;
		constructor () {
			this.i_ports = [];
			this.o_ports = [];
		};
		set_o_ports_datatype () { };
		set_o_ports_updaterate () {
			const m = us.max.apply(null, this.i_ports.map(p => p.updaterate);
			this.o_ports.forEach(p => p.updaterate = m);	
		};
		flatten () { };
		clone () {
			const r = new this.constructor();
			r.operation = this.operation;
			r.i_ports_cnd = this.i_ports_cnd.map(p => p.clone(r));
			r.i_ports = this.i_ports.map(p => p.clone(r));
			r.o_ports = this.i_ports.map(p => p.clone(r));
			return r;
		};
		validate () {
			this.i_ports.forEach(p => p.validate());
			this.o_ports.forEach(p => p.validate());
			this.i_ports_cnd.forEach(p => {
				if (p.datatype != ts.DataTypeBool)
					throw new Error("Invalid conditional input datatype");
			});
		};
		toString () {
			return "{" + this.operation + ":" + this.i_ports.length + ":" + this.o_ports.length + " }";
		};
	};

	class VarBlock extends Block {
		operation = "VAR";
		id;
		datatype;
		constructor (id, datatype) {
			super();
			this.id = id;
			this.datatype = datatype;
			this.i_ports.push(new Port(this, datatype, undefined));
			this.o_ports.push(new Port(this, datatype, undefined));
		};
		set_o_ports_updaterate () {
			this.o_ports[0].updaterate = this.i_ports[0].updaterate;	
		};
		clone () {
			const r = super.clone();
			r.id = this.id;
			r.datatype = this.datatype;
			return r;
		};
		validate () {
			super.validate();
			if (!this.datatype)
				throw new Error("Invalid datatype");
			if (this.i_ports[0].datatype != this.datatype)
				throw new Error("Inconsistent datatype");
		};
		toString () {
			return "VAR: " + this.id;
		};
	};

	class MemoryBlock extends Block {
		operation = "MEMORY";
		id;
		datatype;
		constructor (id, datatype) {
			super();
			this.id = id;
			this.datatype = datatype;
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined)); // Size
			this.i_ports.push(new Port(this, datatype, undefined)); // Init
		};
		clone () {
			const r = super.clone();
			r.id = this.id;
			r.datatype = this.datatype;
			return r;
		};
		validate () {
			super.validate();
			if (!this.datatype)
				throw new Error("Invalid memory datatype");
			if (this.i_ports[0].datatype != ts.DataTypeInt32)
				throw new Error("Invalid memory size datatype");
		};
		toString () {
			return "MEM: " + this.id;
		};
	};

	class MemoryReaderBlock extends Block {
		operation = "MEMORY_READ";
		memory;
		constructor (memory) {
			super();
			this.memory = memory;
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.o_ports.push(new Port(this, memory.datatype, undefined));
		};
		set_o_ports_updaterate () {
			this.o_ports[0].updaterate = this.i_ports[0].updaterate;	
		};
		clone (memory) {
			const r = super.clone();
			r.memory = memory;
			return r;
		};
		validate () {
			super.validate();
			if (!this.memory)
				throw new Error("Undefined memory");
			if (this.i_ports[0].datatype != ts.DataTypeInt32)
				throw new Error("Memory index is not int32");
		};
	};

	class MemoryWriterBlock extends Block {
		operation = "MEMORY_WRITE";
		memory;
		constructor (memory) {
			super();
			this.memory = memory;
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.i_ports.push(new Port(this, memory.datatype, undefined));
		};
		clone (memory) {
			const r = super.clone();
			r.memory = memory;
			return r;
		};
		validate () {
			super.validate();
			if (!this.memory)
				throw new Error("Undefined memory");
			if (this.i_ports[0].datatype != ts.DataTypeInt32)
				throw new Error("Memory index is not int32");
			if (this.i_ports[1].datatype != this.memory.datatype)
				throw new Error("Inconsistent datatype");
		};
	};

	class ConstantBlock extends Block {
		operation = "CONSTANT";
		datatype;
		value;
		constructor (datatype, value) {
			super();
			this.datatype = datatype;
			this.value = value;
			this.i_ports.push(new Port(this, datatype, undefined));
		};
		set_o_ports_updaterate () {
			this.o_ports[0].updaterate = us.UpdateRateConstant;	
		};
		clone () {
			const r = super.clone();
			r.datatype = this,datatype;
			r.value = this.value;
			return r;
		};
		validate () {
			super.validate();
			if (!this.datatype)
				throw new Error("Invalid datatype");
			if (this.value == undefined)
				throw new Error("Undefined constant");
		};
		toString () {
			return this.value;
		};
	};

	class LogicalBlock extends Block {
		constructor (i_n = 2) {
			super();
			for (let i = 0; i < i_n; i++)
				this.i_ports.push(new Port(this, ts.DataTypeBool, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeBool, undefined));
		};
		validate () {
			super.validate();
			for (let i = 0; i < this.i_ports.length; i++)
				if (this.i_ports[i].datatype != ts.DataTypeBool)
					throw new Error("Bad input types");
		};
	};

	class LogicalOrBlock extends LogicalBlock {
		operation = "||";
	};

	class LogicalAndBlock extends LogicalBlock {
		operation = "&&";
	};

	class LogicalNotBlock extends LogicalBlock {
		operation = "!";
		constructor () {
			super(1);
		};
	};

	class BitwiseBlock extends Block {
		constructor (i_n = 2) {
			super();
			for (let i = 0; i < i_n; i++)
				this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeInt32, undefined));
		};
		validate () {
			super.validate();
			for (let i = 0; i < this.i_ports.length; i++)
				if (this.i_ports[i].datatype != ts.DataTypeInt32)
					throw new Error("Bad input types");
		};
	};

	class BitwiseOrBlock extends BitwiseBlock {
		operation = "|";
	};

	class BitwiseXorBlock extends BitwiseBlock {
		operation = "^";
	};

	class BitwiseAndBlock extends BitwiseBlock {
		operation = "&";
	};

	class BitwiseNotBlock extends BitwiseBlock {
		operation = "~";
		constructor () {
			super(1);
		};
	};

	class RelationalBlock extends Block {
		constructor () {
			super();
			this.i_ports.push(new Port(this, undefined, undefined));
			this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeBool, undefined));
		};
		validate () {
			super.validate();
			if (this.i_ports[0].datatype != this.i_ports[1].datatype)
				throw new Error("Different input datatypes");
		};
	};

	class EqualityBlock extends RelationalBlock {
		operation = "==";
	};

	class InequalityBlock extends RelationalBlock {
		operation = "!=";
	};

	class RelationalLGBlock extends RelationalBlock {
		validate () {
			super.validate();
			const d = this.i_ports[0].datatype;
			if (d != ts.DataTypeInt32 && d != ts.DataTypeFloat32)
				throw new Error("Only int32 and float32 can be compared");
		};
	};
	
	class LessBlock extends RelationalLGBlock {
		operation = "<";
	};

	class GreaterBlock extends RelationalLGBlock {
		operation = ">";
	};

	class LessEqualBlock extends RelationalLGBlock {
		operation = "<=";
	};
	
	class GreaterEqualBlock extends RelationalLGBlock {
		operation = ">=";
	};

	class ShiftBlock extends Block {
		constructor () {
			super();
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeInt32, undefined));
		};
		validate () {
			super.validate();
			if (this.i_ports.some(p => p.datatype != ts.DataTypeInt32))
				throw new Error("Shift accepts only int32 inputs");
		};
	};

	class ShiftLeftBlock extends ShiftBlock {
		operation = ">>";
	};

	class ShiftRightBlock extends ShiftBlock {
		operation = "<<";
	};

	class ArithmeticalBlock extends Block {
		constructor (i_n = 2) {
			super();
			for (let i = 0; i < i_n; i++)
				this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, undefined, undefined));
		};
		set_o_ports_datatype () {
			this.o_ports[0].datatype = this.i_ports[0].datatype;
		};
		validate () {
			super.validate();
			const d = this.i_ports[0].datatype;
			this.i_ports.map(p => p.datatype).forEach(dd => {
				if (dd != ts.DataTypeInt32 && dd != ts.DataTypeFloat32)
					throw new Error("Only int32 and float32 allowed in arithmetical operations");
				if (dd != d)
					throw new Error("Inconsistent input types");
			});
		};
	};

	class SumBlock extends ArithmeticalBlock {
		operation = "+";
	};

	class SubtractionBlock extends ArithmeticalBlock {
		operation = "-";
	};

	class MultiplicationBlock extends ArithmeticalBlock {
		operation = "*";
	};

	class DivisionBlock extends ArithmeticalBlock {
		operation = "/";
	};

	class SumBlock extends ArithmeticalBlock {
		operation = "-";
		constructor () {
			super(1);
		};
	};

	class SumBlock extends ArithmeticalBlock {
		operation = "+";
	};

	class ModuloBlock extends Block {
		operation = "%";
		constructor () {
			super();
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.i_ports.push(new Port(this, ts.DataTypeInt32, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeInt32, undefined));
		};
		validate () {
			super.validate();
			if (this.i_ports.some(p => p.datatype != ts.DataTypeInt32))
				throw new Error("Only int32 accepted in ModuloBlock");
		};
	};

	class CastBlock extends Block {
		operation = "generic_cast";
	}

	class CastF32Block extends CastBlock {
		operation = "(f32)";
		constructor () {
			super();
			this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeFloat32, undefined));
		};
	};
	
	class CastI32Block extends CastBlock {
		operation = "(i32)";
		constructor () {
			super();
			this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeInt32, undefined));
		};
	};
	
	class CastBoolBlock extends CastBlock {
		operation = "(bool)";
		constructor () {
			super();
			this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, ts.DataTypeBool, undefined));
		};
	};
	
	class MaxBlock extends Block {
		operation = "MAX";
		datatype;
		constructor (datatype, i_n) {
			super();
			this.datatype = datatype;
			for (let i = 0; i < i_n; i++)
				this.i_ports.push(new Port(this, datatype, undefined));
			this.o_ports.push(new Port(this, datatype, undefined));
		};
		clone () {
			const r = super.clone();
			r.datatype = this.datatype;
			return r;
		};
		validate () {
			super.validate();
			if (!this.datatype)
				throw new Error("Invalid MaxBlock datatype");
			if (this.i_ports.some(p => p.datatype != this.datatype))
				throw new Error("Inconsistent MaxBlock input datatypes");
		};
	};
	
	class CallBlock extends Block {
		operation = "generic_call";
	};

	class CallCompositeBlock extends CallBlock {
		operation = "COMPOSITEBLOCK_CALL";
		compositeBlock;
		constructor (compositeBlock) {
			super();
			this.compositeBlock = compositeBlock;
			compositeBlock.i_ports.forEach(p => {
				this.i_ports.push(new Port(this, p.datatype, undefined));
			});
			compositeBlock.o_ports.forEach(p => {
				this.o_ports.push(new Port(this, p.datatype, undefined));
			});
		};
		clone () {
			const r = super.clone();
			r.compositeBlock = this.compositeBlock;
			return r;
		};
		validate () {
			super.validate();
			if (!this.compositeBlock)
				throw new Error("Invalid composite block call");
		};
		toString () {
			return "COMPOSITEBLOCK_CALL: " + this.compositeBlock.toString(); 
		};
	};

	class CallCBlock extends CallBlock {
		operation = "C_CALL";
		cBlock;
		constructor (cBlock) {
			super();
			this.cBlock = cBlock;
			cBlock.i_ports.forEach(p => {
				this.i_ports.push(new Port(this, p.datatype, undefined));
			});
			cBlock.o_ports.forEach(p => {
				this.o_ports.push(new Port(this, p.datatype, undefined));
			});
		};
		set_o_ports_updaterate () {
			super.set_o_ports_updaterate();
			this.cBlock.o_ports.forEach((p, i) => {
				if (p.updaterate)
					this.o_ports[i].updaterate = p.updaterate;
			});
		};
		clone () {
			const r = super.clone();
			r.cBlock = this.cBlock;
			return r;
		};
		validate () {
			super.validate();
			if (!this.cBlock)
				throw new Error("Invalid composite block call");
		};
		toString () {
			return "C_CALL: " + this.cBlock.toString(); 
		};
	};

	function parseType (x) {
		if (x == "float32")
			return ts.DataTypeFloat32;
		if (x == "int32")
			return ts.DataTypeInt32;
		if (x == "bool")
			return ts.DataTypeBool;
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
	};

	class CBlock extends Block {
		operation = "C_BLOCK_DEFINITION";
		id;
		header;
		state;
		coeff;
		prefix;
		funcs;
		constructor (desc) {
			// Assuming desc well formatted
			this.id = desc.block_name;
			desc.block_inputs.forEach(x => {
				this.i_ports.push(new Port(this, parseType(x.type), undefined));
			});
			desc.block_outputs.forEach(x => {
				this.o_ports.push(new Port(this, parseType(x.type), parseUpdateRate(x.updaterate)));
			});
			this.header = desc.header instanceof Array ? desc.header.join('\n') : desc.header;
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
		};
		clone () {
			throw new Error("Cannot clone CBlock definition");
		};
		validate () {
			super.validate();
			if (!this.funcs.process1)
				throw new Error("At least process1 needs to be defined");
		};
		toString () {
			return "C_BLOCK: " + this.id;
		};
	};

	class Connection {
		in;
		out;
		constructor (i, o) {
			this.in = i;
			this.out = o;
		};
		validate () {
			if (this.in.datatype != this.out.datatype)
				throw new Error("Connection got different datatypes");
		};
		toString () {
			return this.in.toString() + " => " + this.out.toString();
		}
	};

	class Property {
		whose; // output port
		whom;  // output port
		type;  // "fs" or "init". We should probably add "size" for memory
		constructor (whose, whom, type) {
			this.whose = whose;
			this.shom = whom;
			this.type = type;
		};
		validate () {
			if (!this.whose || !this.whom)
				throw new Error("Bad property");
			if (this.whose.type() != 'out' || this.whom.type != 'out')
				throw new Error("Property ports must be out");
			if (this.type != "init" || this.type == "fs")
				throw new Error("Unsupported property type");
		};
		toString () {
			return '[' + this.type + " of " + this.whose + " = " + this.whom + ']';
		};
	};

	class CompositeBlock extends Block {
		operation = "COMPOSITE_BLOCK_DEFINITION";
		id;
		blocks;
		connections;
		properties;

		compositeBlockFather;
		compositeBlocks;
		cBlocks;

		// Set i_ports and o_ports from outside
		constructor (father) {
			super();
			this.blocks = [];
			this.connections = [];
			this.properties = [];
			this.compositeBlockFather = father;
			this.compositeBlocks = [];
			this.cBlocks = [];
		};

		// Assuming implicit input types defined
		set_o_ports_datatype () { 
			const g = (p) => this.connections.find(c => c.out == p);
			const f = (b) =>  {
				if (b._visited_ || b == this)
					return;
				b._visited_ = true;
				b.i_ports.forEach(p => {
					const c = g(p);
					if (!c)
						return;
					f (c.in.block);
					c.out.datatype = c.in.datatype;
				});
				b.set_o_ports_datatype();
			};
			this.o_ports.forEach(p => {
				const c = g(p);
				if (!c)
					return;
				f (c.in.block); 
			});
			this.blocks.forEach(b => delete b._visited_);
		};
		
		// Assuming implicit input update rates defined
		set_o_ports_updaterate () {
			const g = (p) => this.connections.find(c => c.out == p);
			const f = (b) =>  {
				if (b._visited_ || b == this)
					return;
				b._visited_ = true;
				b.i_ports.forEach(p => {
					const c = g(p);
					if (!c)
						return;
					f (c.in.block);
					c.out.updaterate = c.in.datatype;
				});
				b.set_o_ports_updaterate();
			};
			this.o_ports.forEach(p => {
				const c = g(p);
				if (!c)
					return;
				f (c.in.block); 
			});
			this.blocks.forEach(b => delete b._visited_);
		};

		flatten () {
			for (let i = 0; i < this.blocks.length; i++) {
				const b = this.blocks[i];
				if (!b instanceof CallCompositeBlock)
					continue;

				const bb = b.compositeBlock.clone();
				bb.flatten();
				this.blocks = this.blocks.concat(bb.blocks);
				this.connections = this.connections.concat(bb.connections);
				this.cBlocks = this.cBlocks.concat(bb.cBlocks);

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

				this.blocks.splice(i, 1);
				i--;
			}
			this.compositeBlocks = [];
		};

		clone (father) {
			const r = new CompositeBlock();
			r.id = this.id;
			this.blocks.forEach((b, i) => {
				if (b instanceof MemoryBlock)
					r.blocks[i] = b.clone();
			});
			this.blocks.forEach((b, i) => {
				if (b instanceof MemoryBlock)
					return;
				if (b instanceof MemoryReaderBlock || b instanceof MemoryWriterBlock) {
					const j = this.blocks.indexOf(b.memory);
					if (j != -1)
						r.blocks[i] = b.clone(r.blocks[j]);
					else
						r.blocks[i] = b.clone(b.memory);
				}
				else
					r.blocks[i] = b.clone();
			});
			this.connections.forEach((c, i) => {
				const inb_i = this.blocks.indexOf(c.in.block);
				const oub_i = this.blocks.indexOf(c.out.block);
				const f = (p) => p.type() == "in" ? "i_ports" : "o_ports";
				if (inb_i != -1 && oub_i != -1) {
					r.connections.push(new Connection(
						r.blocks[inb_i] [f(c.in)]  [c.in.index() ],
						r.blocks[oub_i] [f(c.out)] [c.out.index()]
					));
					return;
				}
				if (inb_i == -1 && oub_i != -1) {
					r.connections.push(new Connection(
						c.in,
						r.blocks[oub_i] [f(c.out)] [c.out.index()]
					));
					return;
				}
				if (inb_i != -1 && oub_i == -1)
					throw new Error("Implicit output");
				if (inb_i == -1 && oub_i == -1)
					throw new Error("Invalid connection found");
			});
			this.properties.forEach((prop, i) => {
				const whose_b_i = this.blocks.indexOf(prop.whose.block);
				const whom_b_i  = this.blocks.indexOf(prop.whom.block);
				if (whose_b_i != -1 && whom_b_i != -1) {
					r.properties.push(new Property(
						r.blocks[whose_b_i] ["o_ports"] [prop.whose.index()],
						r.blocks[whom_b_i]  ["o_ports"] [prop.whom.index()],
						prop.type
					));
					return;
				}
				if (whose_b_i == -1 && whom_b_i != -1) {
					r.properties.push(new Property(
						prop.whose,
						r.blocks[whom_b_i] ["o_ports"] [prop.whom.index()],
						prop.type
					));
					return;
				}
				if (whose_b_i != -1 && whom_b_i == -1)
					throw new Error("Implicit output");
				if (whose_b_i == -1 && whom_b_i == -1)
					throw new Error("Invalid connection found");
			});
			r.compositeBlocks = this.compositeBlocks; // No need to clone this
			r.cBlocks = this.cBlocks // No need to clone
			r.compositeBlockFather = father;
			return r;
		};

		validate () {
			super.validate();
			this.blocks.forEach(b => b.validate());
			this.connections.forEach(c => c.validate());
			this.properties.forEach(p => p.validate());
			this.compositeBlocks.forEach(b => b.validate());
			this.cBlock.forEach(b => b.validate());
		};
	};

	class Select extends Block {
		operation = "SELECT";

		constructor () {
			super();
			this.i_ports.push(new Port(this, ts.DataTypeBool, undefined)); // Condition
			this.i_ports.push(new Port(this, undefined, undefined));
			this.i_ports.push(new Port(this, undefined, undefined));
			this.o_ports.push(new Port(this, undefined, undefined));
		};
		set_o_ports_datatype () {
			this.o_ports[0].datatype = this.o_ports[1].datatype;
		};
		validate () {
			super.validate();
			if (this.i_ports[0].datatype != ts.DataTypeBool)
				throw new Error("Select condition must be bool");
			if (this.i_ports[1].datatype != this.i_ports[2].datatype)
				throw new Error("Inconsistent datatypes");
		};
	};

	class IfthenelseBlock extends CompositeBlock {
		operation = "IF_THEN_ELSE_BLOCK";

		constructor (father, branchT, branchF) {
			super(father);
			this.compositeBlocks.push(branchT);
			this.compositeBlocks.push(branchF);
			this.i_ports.push(new Port(this, ts.DataTypeBool, undefined)); // Condition
			branchT.i_ports.forEach(p => { // gonna be empty as per Ciaramella syntax, but let's keep support for more frontends
				this.i_ports.push(new Port(this, p.datatype, p.updaterate));
			});
			branchT.o_ports.forEach(p => {
				this.o_ports.push(new Port(this, p.datatype, p.updaterate));
			});
			const callT = new CallCompositeBlock(branchT);
			const callF = new CallCompositeBlock(branchF);
			const selects = branchT.o_ports.map(x => new Select());
			this.blocks = this.blocks.concat(selects);
			callT.i_ports.forEach((p, i) => {
				this.connections.push(new Connection(this.i_ports[i + 1], callT.i_ports[i]));
				this.connections.push(new Connection(this.i_ports[i + 1], callF.i_ports[i]));
			});
			callT.o_ports.forEach((p, i) => {
				this.connections.push(new Connection(this.i_ports[0],  selects[i].i_ports[0]));
				this.connections.push(new Connection(callT.o_ports[i], selects[i].i_ports[1]));
				this.connections.push(new Connection(callF.o_ports[i], selects[i].i_ports[2]));
			});
			selects.o_ports.forEach((p, i) => {
				this.connections.push(new Connection(p, this.o_ports[i]));
			});
		};
		// TODO; set of conditions of the blocks
	};

/*
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

*/
	exports["BlockTypes"] = {
		Block,
		VarBlock,
		MemoryBlock, MemoryReaderBlock, MemoryWriterBlock,
		ConstantBlock,
		LogicalBlock, LogicalAndBlock, LogicalOrBlock, LogicalNotBlock,
		BitwiseBlock, BitwiseAndBlock, BitwiseOrBlock, BitwiseXorBlock, BitwiseNotBlock,
		RelationalBlock, RelationalLGBlock, EqualityBlock, InequalityBlock, GreaterBlock, GreaterEqualBlock, LessBlock, LessEqualBlock,
		ShiftBlock, ShiftLeftBlock, ShiftRightBlock,
		ArithmeticalBlock, SumBlock, SubtractionBlock, MultiplicationBlock, DivisionBlock, UminusBlock,
		ModuloBlock,
		CastBlock, CastF32Block, CastI32Block, CastBoolBlock,
		MaxBlock,
		CompositeBlock
		CBlock,
		CallCompositeBlock, CallCBlock,
		Select, IfthenelseBlock,
	};
}());