(function() {

	'use strict';

	function arrayIncludedIn (A, B) {
		return A.every(a => B.some(b => a === b));
	}

	function setIncludedIn (A, B) { // if A is included in B
		return arrayIncludedIn(Array.from(A), Array.from(B));
	}

	function setsEqual (A, B) {
		const arrayA = Array.from(A);
		const arrayB = Array.from(B);
		return arrayIncludedIn(arrayA, arrayB) && arrayIncludedIn(arrayB, arrayA);
	}


	// Is this the best place for this?


	function get_filereader (dirs) {
	
		const fs = require("fs");
		const path = require("path");

		return function (filename) {

			for (let i = 0; i < dirs.length; i++) {
				const d = dirs[i];
				try {
					const p = path.join(d, filename);
					const data = fs.readFileSync(p, 'utf8');
					return data;
				} catch (err) {
			  		// Not in this dir;
				}
			}
			return null;
		};
	}
	

	// TODO: make it better
	function warn (msg) {
		console.log("***Warning***", msg);
	}

	exports["get_filereader"] = get_filereader;
	exports["setsEqual"] = setsEqual;
	exports["setIncludedIn"] = setIncludedIn;
	exports["arrayIncludedIn"] = arrayIncludedIn;

}());
