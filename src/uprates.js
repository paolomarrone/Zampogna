(function() {

	'use strict';

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

	function parse(x) {
		if (x == "const")
			return UpdateRateConstant;
		if (x == "fs")
			return UpdateRateFs;
		if (x == "control")
			return UpdateRateControl;
		if (x == "audio")
			return UpdateRateAudio;
		throw new Error("Unrecognized updaterate: " + x);
	}

	exports["UpdateRateGeneric"] = UpdateRateGeneric;
	exports["UpdateRateConstant"] = UpdateRateConstant;
	exports["UpdateRateFs"] = UpdateRateFs;
	exports["UpdateRateControl"] = UpdateRateControl;
	exports["UpdateRateAudio"] = UpdateRateAudio;

	exports["max"] = max;
	exports["min"] = min;
	exports["equal"] = equal;
	exports["parse"] = parse;

}());
