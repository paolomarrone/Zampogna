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
	
	const DataTypeFloat32 = {};
	DataTypeFloat32.toString = () => "float32";
	
	const DataTypeInt32 = {};
	DataTypeInt32.toString = () => "int32";
	
	const DataTypeBool = {};
	DataTypeBool.toString = () => "bool";

	function parse (x) {
		if (x == "float32")
			return ts.DataTypeFloat32;
		if (x == "int32")
			return ts.DataTypeInt32;
		if (x == "bool")
			return ts.DataTypeBool;
	};

	exports["DataTypeFloat32"] = DataTypeFloat32;
	exports["DataTypeInt32"] = DataTypeInt32;
	exports["DataTypeBool"] = DataTypeBool;
	exports["parse"] = parse;

}());