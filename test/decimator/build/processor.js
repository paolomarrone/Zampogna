var Plugin = {
	init: function () {
		this.fs = 0;
		this.firstRun = 1;

		

		this.params = [];

		
		this._delayed_0 = 0;
		this._delayed_1 = 0;

		

		
	},

	reset: function () {
		this.firstRun = 1
	},

	setSampleRate: function (sampleRate) {
		this.fs = sampleRate;
		
	},

	process: function (x, y__out__, nSamples) {
		if (this.firstRun) {
		}
		else {
		}

		
		

		if (this.firstRun) { 
			
			this._delayed_0 = 1;
			this._delayed_1 = 0;
		}

		for (let i = 0; i < nSamples; i++) {
			
			if (this._delayed_0) {
this.y = x[i];
this.s = 0;

} else {
this.y = this._delayed_1;
this.s = 1;

}
;
			
			this._delayed_0 = this.s;
			this._delayed_1 = this.y;
			
			
			y__out__[i] = this.y;
		}

		
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
