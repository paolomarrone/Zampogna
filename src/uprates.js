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


	exports["UpdateRateGeneric"] = UpdateRateGeneric;
	exports["UpdateRateConstant"] = UpdateRateConstant;
	exports["UpdateRateFs"] = UpdateRateFs;
	exports["UpdateRateControl"] = UpdateRateControl;
	exports["UpdateRateAudio"] = UpdateRateAudio;

}());