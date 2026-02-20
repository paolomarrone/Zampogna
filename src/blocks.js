(function() {

	'use strict';

	const TYPES = require("./types");
	const RATES = require("./uprates");


	const Port = {};
	Port.block = undefined;
	Port.id = undefined;
	Port.datatype = () => TYPES.Generic;
	Port.updaterate = () => RATES.Generic;
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
		if (this.datatype() == TYPES.Generic)
			throw new Error("Generic port datatype: " + this.toString());
		//if (this.updaterate() == RATES.Generic)
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
			//return this.block.i_ports.map(p => p.updaterate()).reduce((u, t) => t.level > u.level ? t : u, RATES.Constant);
			return RATES.max.apply(null, this.block.i_ports.map(p => p.updaterate()));
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
	VarBlock.datatype = () => TYPES.Generic;
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
		if (this.datatype() == TYPES.Generic)
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
	MemoryBlock.datatype = () => TYPES.Generic;
	MemoryBlock.init = function () {
		Block.init.call(this, 2, 0); // size, init
	};
	MemoryBlock.validate = function () {
		if (this.datatype() == TYPES.Generic)
			throw new Error("Generic datatype");
		if (this.i_ports[0].datatype() != TYPES.Int32)
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
		if (this.i_ports[0].datatype() != TYPES.Int32)
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
		if (this.i_ports[0].datatype() != TYPES.Int32)
			throw new Error("Only int can be used to access memory");
		if (this.i_ports[1].datatype() != this.memoryblock.datatype())
			throw new Error("Inconsistent datatype");
		if (this.memoryblock == undefined)
			throw new Error("Undefined memoryblock");
	};
	MemoryWriterBlock.clone = function () {
		const r = Block.clone.call(this);
		r.memoryblock = this.memoryblock.clone();
		if (this.predicate_terms)
			r.predicate_terms = this.predicate_terms.map(t => ({ port: t.port, negated: t.negated }));
		return r;
	};

	const ConstantBlock = Object.create(Block);
	ConstantBlock.operation = "CONSTANT";
	ConstantBlock.value = undefined;
	ConstantBlock.datatype = () => TYPES.Generic;
	ConstantBlock.init = function () {
		Block.init.call(this, 0, 1);
		this.o_ports[0].datatype = function () {
			return this.block.datatype();
		};
		this.o_ports[0].updaterate = () => RATES.Constant;
	};
	ConstantBlock.validate = function () {
		Block.validate.call(this);
		if (this.datatype() == TYPES.Generic)
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
		this.o_ports[0].datatype = () => TYPES.Bool;
		Block.setMaxOutputUpdaterate.call(this);
	};
	LogicalBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype() != TYPES.Bool)
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
		this.o_ports[0].datatype = () => TYPES.Bool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const BitwiseBlock = Object.create(Block);
	BitwiseBlock.init = function () {
		Block.init.call(this, 2, 1);
		this.o_ports[0].datatype = () => TYPES.Int32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	BitwiseBlock.validate = function () {
		Block.validate.call(this);
		this.i_ports.forEach(p => {
			if (p.datatype() != TYPES.Int32)
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
		this.o_ports[0].datatype = () => TYPES.Bool;
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
		if (d != TYPES.Int32 && d != TYPES.Float32)
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
		this.o_ports[0].datatype = () => TYPES.Int32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	ShiftBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != TYPES.Int32 || this.i_ports[1].datatype() != TYPES.Int32)
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
			if (p.datatype() != TYPES.Int32 && p.datatype() != TYPES.Float32)
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
		this.o_ports[0].datatype = () => TYPES.Int32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	ModuloBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != TYPES.Int32 || this.i_ports[1].datatype() != TYPES.Int32)
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
		this.o_ports[0].datatype = () => TYPES.Float32;
		Block.setMaxOutputUpdaterate.call(this);
	};
	
	const CastI32Block = Object.create(CastBlock);
	CastI32Block.operation = "(i32)";
	CastI32Block.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => TYPES.Int32;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const CastBoolBlock = Object.create(CastBlock);
	CastBoolBlock.operation = "(bool)";
	CastBoolBlock.init = function () {
		Block.init.call(this, 1, 1);
		this.o_ports[0].datatype = () => TYPES.Bool;
		Block.setMaxOutputUpdaterate.call(this);
	};

	const MaxBlock = Object.create(Block);
	MaxBlock.operation = "max";
	MaxBlock.datatype = () => TYPES.Generic;
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
		if (this.datatype() == TYPES.Generic)
			throw new Error("Generic MAX datatype");
		if (this.i_ports.some(p => p.datatype() != this.datatype()))
			throw new Error("Inconsistent MAX datatypes: " + this.toString());
	};

	const SelectBlock = Object.create(Block);
	SelectBlock.operation = "SELECT";
	SelectBlock.parLevel = 3;
	SelectBlock.init = function () {
		Block.init.call(this, 3, 1); // cond, then, else
		this.o_ports[0].datatype = function () {
			return this.block.i_ports[1].datatype();
		};
		Block.setMaxOutputUpdaterate.call(this);
	};
	SelectBlock.validate = function () {
		Block.validate.call(this);
		if (this.i_ports[0].datatype() != TYPES.Bool)
			throw new Error("Select condition must be bool");
		if (this.i_ports[1].datatype() != this.i_ports[2].datatype())
			throw new Error("Select input types mismatch");
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
			const dt = TYPES.parse(x.type); 
			this.i_ports[i].datatype = () => dt;
		});
		desc.block_outputs.forEach((x, i) => {
			const dt = TYPES.parse(x.type); 
			this.o_ports[i].datatype = () => dt;
			if (x.updaterate) {
				const ur = RATES.parse(x.updaterate);
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
	IfthenelseBlock.operation = "IF_THEN_ELSE";
	IfthenelseBlock.nOutputs = undefined;
	IfthenelseBlock.then_branch = undefined; // CompositeBlock
	IfthenelseBlock.else_branch = undefined; // CompositeBlock
	IfthenelseBlock.init = function () {
		Block.init.call(this, 1, this.nOutputs); // condition only, outputs are selected internally
	};
	IfthenelseBlock.setOutputDatatype = function () {
		for (let i = 0; i < this.nOutputs; i++) {
			const oi = i;
			this.o_ports[i].datatype = function () {
				return this.block.then_branch.o_ports[oi].datatype();
			};
			this.o_ports[i].updaterate = function () {
				return RATES.max(this.block.then_branch.o_ports[oi].updaterate(), this.block.else_branch.o_ports[oi].updaterate());
			};
		}
	};
	IfthenelseBlock.validate = function () {
		Block.validate.call(this);
		if (this.nOutputs == undefined || this.nOutputs < 1)
			throw new Error("Unexpected outputs number");
		if (!this.then_branch || !this.else_branch)
			throw new Error("IF_THEN_ELSE branches not set");
		if (this.i_ports[0].datatype() != TYPES.Bool)
			throw new Error("Ifthenelse condition must return a boolean");
		for (let i = 0; i < this.nOutputs; i++)
			if (this.then_branch.o_ports[i].datatype() != this.else_branch.o_ports[i].datatype())
				throw new Error("Inconsistent branch output datatypes");
	};
	IfthenelseBlock.clone = function () {
		const r = Block.clone.call(this);
		r.nOutputs = this.nOutputs;
		r.then_branch = this.then_branch.clone();
		r.else_branch = this.else_branch.clone();
		return r;
	};
	IfthenelseBlock.flatten = function (bdef) {
		const condConn = bdef.connections.find(c => c.out == this.i_ports[0]);
		if (!condConn)
			throw new Error("IF_THEN_ELSE missing condition connection");

		function append_predicate_to_writer (mw, port, negated) {
			// If writer value is already selected by this same condition, adding the
			// condition again would over-constrain updates.
			let vc = bdef.connections.find(c => c.out == mw.i_ports[1]);
			let srcp = vc ? vc.in : undefined;
			while (srcp && VarBlock.isPrototypeOf(srcp.block)) {
				const cvin = bdef.connections.find(c => c.out == srcp.block.i_ports[0]);
				if (!cvin)
					break;
				srcp = cvin.in;
			}
			if (srcp && SelectBlock.isPrototypeOf(srcp.block)) {
				const cc = bdef.connections.find(c => c.out == srcp.block.i_ports[0]);
				if (cc && cc.in == port)
					return;
			}
			if (!mw.predicate_terms)
				mw.predicate_terms = [];
			mw.predicate_terms.push({ port: port, negated: negated });
		}

		const flatten_branch_ref = (ref, negated) => {
			ref.setToBeCloned();
			const bb = ref.clone();
			flatten_all(bb);
			bdef.blocks = bdef.blocks.concat(bb.blocks);
			bdef.connections = bdef.connections.concat(bb.connections);
			bdef.properties = bdef.properties.concat(bb.properties);
			bdef.cdefs = bdef.cdefs.concat(bb.cdefs);
			ref.clean();
			bb.blocks.filter(b => MemoryWriterBlock.isPrototypeOf(b)).forEach(mw => {
				append_predicate_to_writer(mw, condConn.in, negated);
			});
			return bb;
		};

		// Flatten branches first, then mark internal writes with branch predicate.
		const bbThen = flatten_branch_ref(this.then_branch, false);
		const bbElse = flatten_branch_ref(this.else_branch, true);

		for (let i = 0; i < this.nOutputs; i++) {
			const cThenOut = bdef.connections.filter(c => c.out == bbThen.o_ports[i]);
			const cElseOut = bdef.connections.filter(c => c.out == bbElse.o_ports[i]);
			if (cThenOut.length != 1 || cElseOut.length != 1)
				throw new Error("Invalid IF_THEN_ELSE branch output wiring");

			const sel = Object.create(SelectBlock);
			sel.init();

			const c0 = Object.create(CompositeBlock.Connection);
			const c1 = Object.create(CompositeBlock.Connection);
			const c2 = Object.create(CompositeBlock.Connection);
			c0.in = condConn.in;
			c0.out = sel.i_ports[0];
			c1.in = cThenOut[0].in;
			c1.out = sel.i_ports[1];
			c2.in = cElseOut[0].in;
			c2.out = sel.i_ports[2];
			bdef.connections.push(c0);
			bdef.connections.push(c1);
			bdef.connections.push(c2);
			bdef.blocks.push(sel);

			bdef.connections.filter(c => c.in == this.o_ports[i]).forEach(c => {
				c.in = sel.o_ports[0];
			});

			bdef.connections.splice(bdef.connections.indexOf(cThenOut[0]), 1);
			bdef.connections.splice(bdef.connections.indexOf(cElseOut[0]), 1);
		}

		bdef.connections.splice(bdef.connections.indexOf(condConn), 1);
		bdef.blocks.splice(bdef.blocks.indexOf(this), 1);
		remove_redundant_predicates();

		function flatten_all (cb) {
			while (true) {
				const ib = cb.blocks.find(b => IfthenelseBlock.isPrototypeOf(b));
				if (ib) {
					ib.flatten(cb);
					continue;
				}
				const hasCall = cb.blocks.some(b => CallBlock.isPrototypeOf(b) && b.type == 'bdef');
				if (hasCall) {
					cb.flatten();
					continue;
				}
				break;
			}
		}

		function remove_redundant_predicates () {
			bdef.blocks.filter(b => MemoryWriterBlock.isPrototypeOf(b) && b.predicate_terms).forEach(mw => {
				const vc = bdef.connections.find(c => c.out == mw.i_ports[1]);
				let srcp = vc ? vc.in : undefined;
				while (srcp && VarBlock.isPrototypeOf(srcp.block)) {
					const cvin = bdef.connections.find(c => c.out == srcp.block.i_ports[0]);
					if (!cvin)
						break;
					srcp = cvin.in;
				}
				if (!srcp || !SelectBlock.isPrototypeOf(srcp.block))
					return;
				const cc = bdef.connections.find(c => c.out == srcp.block.i_ports[0]);
				if (!cc)
					return;
				mw.predicate_terms = mw.predicate_terms.filter(t => t.port != cc.in);
				if (mw.predicate_terms.length == 0)
					delete mw.predicate_terms;
			});
		}
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
				this.blocks.forEach(bb_ => {
					if (!bb_.predicate_terms)
						return;
					bb_.predicate_terms.forEach(t => {
						if (t.port == p)
							t.port = csint[0].in;
					});
				});
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
		MaxBlock, SelectBlock,
		CallBlock,
		CBlock,
		IfthenelseBlock,
		CompositeBlock
	};

}());
