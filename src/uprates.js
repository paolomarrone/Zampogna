(function() {

	'use strict';

	const RATES = {
		Generic:  { level: undefined, toString: () => "UpdateRateGeneric" },
		Constant: { level: 0, toString: () => "UpdateRateConstant" },
		Fs:       { level: 1, toString: () => "UpdateRateFs" },
		Control:  { level: 2, toString: () => "UpdateRateControl" },
		Audio:    { level: 3, toString: () => "UpdateRateAudio" },

		max: (...x) => {
			var r = x[0];
			for (let k of x)
				if (k.level > r.level)
					r = k;
			return r;
		},
		min: (...x) => {
			var r = x[0];
			for (let k of x)
				if (k.level < r.level)
					r = k;
			return r;
		},
		equal: (...x) => {
			var r = x[0];
			for (let k of x)
				if (k != r)
					return false;
			return true;
		},
		parse: (x) => {
			if (x == "const")
				return RATES.Constant;
			if (x == "fs")
				return RATES.Fs;
			if (x == "control")
				return RATES.Control;
			if (x == "audio")
				return RATES.Audio;
			throw new Error("Unrecognized update rate: " + x);
		}
	};

	module.exports = RATES;

}());
