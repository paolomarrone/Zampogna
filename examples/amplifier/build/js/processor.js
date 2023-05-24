var Plugin = {
	init: function () {
		this.fs = 0;
		this.firstRun = 1;

		

		this.params = ["level"];

		
		this.level = 0;

		
		this.level_z1 = 0;
		this.level_CHANGED = true;
		
	},

	reset: function () {
		this.firstRun = 1
	},

	setSampleRate: function (sampleRate) {
		this.fs = sampleRate;
		
	},

	process: function (x, y_out_, nSamples) {
		if (this.firstRun) {
			this.level_CHANGED = true;
		}
		else {
			this.level_CHANGED = this.level != this.level_z1;
		}

		
		
		this.level_CHANGED = false;

		if (this.firstRun) { 
			
		}

		for (let i = 0; i < nSamples; i++) {
			
			const y = ((x[i] * this.level) * 2);
			
			
			
			y_out_[i] = y;
		}

		
		this.level_z1 = this.level;
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
		


		this.instance.process(input[0],  output[0], nSamples);

		return true;
	}

	static get parameterDescriptors() {
		return [];
	}
}

registerProcessor("PluginProcessor", PluginProcessor);
