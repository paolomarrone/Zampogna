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

	const DataTypeGeneric = {};
	DataTypeGeneric.toString = () => "GenericType";
	
	const DataTypeFloat32 = Object.create(DataTypeGeneric);
	DataTypeFloat32.toString = () => "float32";
	
	const DataTypeInt32 = Object.create(DataTypeGeneric);
	DataTypeInt32.toString = () => "int32";
	
	const DataTypeBool = Object.create(DataTypeGeneric);
	DataTypeBool.toString = () => "bool";

	exports["DataTypeGeneric"] = DataTypeGeneric;
	exports["DataTypeFloat32"] = DataTypeFloat32;
	exports["DataTypeInt32"] = DataTypeInt32;
	exports["DataTypeBool"] = DataTypeBool;

}());