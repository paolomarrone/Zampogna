var Plugin = {
	init: function () {
		this.fs = 0;
		this.firstRun = 1;

		

		this.params = ["enable", "frequency"];

		
		this.saw_generator_extra_0 = 0;
		this.phaseInc_2 = 0;
		this.phase_2 = 0;
		this._delayed_1 = 0;

		
		this.enable = 0;
		this.frequency = 0;

		
		this.enable_z1 = 0;
		this.enable_CHANGED = true;
		
		this.frequency_z1 = 0;
		this.frequency_CHANGED = true;
		
	},

	reset: function () {
		this.firstRun = 1
	},

	setSampleRate: function (sampleRate) {
		this.fs = sampleRate;
		
	},

	process: function (y__out__, nSamples) {
		if (this.firstRun) {
			this.enable_CHANGED = true;
			this.frequency_CHANGED = true;
		}
		else {
			this.enable_CHANGED = this.enable != this.enable_z1;
			this.frequency_CHANGED = this.frequency != this.frequency_z1;
		}

		
		if (this.enable_CHANGED) {
			this.saw_generator_extra_0 = (this.enable > 0.5);
		}
		if (this.frequency_CHANGED) {
			this.fr_3 = this.frequency;
			this.phaseInc_2 = (((((this.fr_3 * this.fr_3) * this.fr_3) * 10000) + 20) / this.fs);
		}
		
		this.enable_CHANGED = false;
		this.frequency_CHANGED = false;

		if (this.firstRun) { 
			
			this._delayed_1 = 0;
		}

		for (let i = 0; i < nSamples; i++) {
			
			if (this.saw_generator_extra_0) {
this.x_4 = (this._delayed_1 + this.phaseInc_2);
if ((this.x_4 >= 1)) {
this.y_4 = (this.x_4 - 1);

} else {
this.y_4 = this.x_4;

}
;
this.phase_2 = this.y_4;
this.y = ((2 * this.phase_2) - 1);

} else {
this.y = 0;

}
;
			
			this._delayed_1 = this.phase_2;
			
			
			y__out__[i] = this.y;
		}

		
		this.enable_z1 = this.enable;
		this.frequency_z1 = this.frequency;
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
		


		this.instance.process( output[0], nSamples);

		return true;
	}

	static get parameterDescriptors() {
		return [];
	}
}

registerProcessor("PluginProcessor", PluginProcessor);
