(function() {

	const DataTypeGeneric = {};
	DataTypeGeneric.toString = () => "GenericType";
	
	const DataTypeFloat32 = Object.create(DataTypeGeneric);
	DataTypeFloat32.toString = () => "float32";
	
	const DataTypeInt32 = Object.create(DataTypeGeneric);
	DataTypeInt32.toString = () => "int32";
	
	const DataTypeBool = Object.create(DataTypeGeneric);
	DataTypeBool.toString = () => "bool";

	function parse(x) {
		if (x == "float32")
			return DataTypeFloat32;
		if (x == "int32")
			return DataTypeInt32;
		if (x == "bool")
			return DataTypeBool;
		throw new Error("Unrecognized datatype: " + x);
	}

	exports["DataTypeGeneric"] = DataTypeGeneric;
	exports["DataTypeFloat32"] = DataTypeFloat32;
	exports["DataTypeInt32"] = DataTypeInt32;
	exports["DataTypeBool"] = DataTypeBool;
	exports["parse"] = parse;

}());
