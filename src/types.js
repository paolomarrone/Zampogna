(function() {

	'use strict';

	const TYPES = {
		Generic: { toString: () => "GenericType" },
		Float32: { toString: () => "float32" },
		Int32:   { toString: () => "int32" },
		Bool:    { toString: () => "bool" },

		fromAST: (x) => {
			switch (x) {
			case undefined: case 'TYPE_FLOAT32': case 'FLOAT32': return TYPES.Float32;
			case 'TYPE_INT32': case 'INT32': return TYPES.Int32;
			case 'TYPE_BOOL': case 'BOOL': return TYPES.Bool;
			default: throw new Error('Unrecognized AST datatype: ' + x);
			}
		},

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
