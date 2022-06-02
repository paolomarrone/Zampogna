var Plugin = {
	init: function () {
		this.fs = 0;
		this.firstRun = 1;

		this.C = 0.000001;
		this.C_3 = this.C;
		this.lp_filter__extra__0 = (2 * 3.141592653589793);
		this.al_5 = 0;
		

		this.params = ["cutoff"];

		
		this.Rr_5 = 0;
		this.lp_filter__extra__1 = 0;
		this.__delayed__2 = 0;

		
		this.cutoff = 0;

		
		this.cutoff_z1 = 0;
		this.cutoff_CHANGED = true;
		
	},

	reset: function () {
		this.firstRun = 1
	},

	setSampleRate: function (sampleRate) {
		this.fs = sampleRate;
		this.Rr_5 = (0.5 / (this.C_3 * this.fs));
		
	},

	process: function (x, y__out__, nSamples) {
		if (this.firstRun) {
			this.cutoff_CHANGED = true;
		}
		else {
			this.cutoff_CHANGED = this.cutoff != this.cutoff_z1;
		}

		
		if (this.cutoff_CHANGED) {
			this.lp_filter__extra__1 = (this.Rr_5 / ((1 / ((this.lp_filter__extra__0 * ((0.1 + (0.3 * this.cutoff)) * this.fs)) * this.C)) + this.Rr_5));
		}
		
		this.cutoff_CHANGED = false;

		if (this.firstRun) { 
			
			this.__delayed__2 = 0;
		}

		for (let i = 0; i < nSamples; i++) {
			
			this.bC = this.__delayed__2;
			this.ar_5 = this.bC;
			this.aC = (this.ar_5 - (this.lp_filter__extra__1 * ((this.al_5 + this.ar_5) + ((2 * x[i]) - -((this.al_5 + this.ar_5))))));
			this.y = (0.5 * (this.aC + this.bC));
			
			this.__delayed__2 = this.aC;
			
			
			y__out__[i] = this.y;
		}

		
		this.cutoff_z1 = this.cutoff;
		this.firstRun = 0;
	}
}

// Static part
class PluginProcessor extends AudioWorkletProcessor {
	constructor () {

		super();
		this.instance = Object.create(Plugin);
		this.instance.init();
		this.instance.setSampleRate(sampleRate);
		this.instance.reset();

		this.port.onmessage = (e) => {
			if (e.data.type == "changeInstance") {
				eval(e.data.value)
				this.instance = Object.create(Plugin);
				this.instance.init();
				this.instance.setSampleRate(sampleRate);
				this.instance.reset();
			}
			else if (e.data.type == "paramChange") {
				this.instance[e.data.id] = e.data.value
			}
		}
	}
	process (inputs, outputs, parameters) {

		var input = inputs[0];
		var output = outputs[0];
		let nSamples = Math.min(input.length >= 1 ? input[0].length : 0, output[0].length)
		this.instance.process(input[0], output[0], nSamples);

		return true;
	}

	static get parameterDescriptors() {
		return [];
	}
}

registerProcessor("PluginProcessor", PluginProcessor);
