(function() {

	'use strict';

	const TYPES = {
		Generic: { toString: () => "GenericType" },
		Float32: { toString: () => "float32" },
		Int32:   { toString: () => "int32" },
		Bool:    { toString: () => "bool" },

		parse: (x) => {
			if (x == "float32")
				return TYPES.Float32;
			if (x == "int32")
				return TYPES.Int32;
			if (x == "bool")
				return TYPES.Bool;
			throw new Error("Unrecognized datatype: " + x);
		}
	};

	module.exports = TYPES;

}());
