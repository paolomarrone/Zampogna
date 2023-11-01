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

	const UpdateRateConstant = {};
	UpdateRateConstant.level = 0;
	UpdateRateConstant.toString = () => "UpdateRateConstant";

	const UpdateRateFs = {};
	UpdateRateFs.level = 1;
	UpdateRateFs.toString = () => "UpdateRateFs";

	const UpdateRateControl = {};
	UpdateRateControl.level = 2;
	UpdateRateControl.toString = () => "UpdateRateControl";
	
	const UpdateRateAudio = {};
	UpdateRateAudio.level = 3;
	UpdateRateAudio.toString = () => "UpdateRateAudio";

	function max (...x) {
		var r = x[0];
		for (let k of x) {
			if (k.level > r.level)
				r = k;
		}
		return r;
	}

	function min (...x) {
		var r = x[0];
		for (let k of x) {
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

	exports["UpdateRateConstant"] = UpdateRateConstant;
	exports["UpdateRateFs"] = UpdateRateFs;
	exports["UpdateRateControl"] = UpdateRateControl;
	exports["UpdateRateAudio"] = UpdateRateAudio;

	exports["max"] = max;
	exports["min"] = min;
	exports["equal"] = equal;

}());