(async function() {

	const zampogna = require('./zampogna')
	const fs = require('fs')
	const path = require('path')
	const http = require('http')
	const FormData = require('form-data')

	exports.ciaramellaToYaaaeapa = function(code, initial_block, control_inputs, initial_values) {
		return zampogna.compile(null, false, code, initial_block, control_inputs, initial_values, 'yaaaeapa');
	}

	exports.yaaaeapaToSharedLibrary = function (files, compilationServerUrl, compilationServerPort) {

		const postData = JSON.stringify(files);

		const options = {
			hostname: compilationServerUrl,
			port: compilationServerPort,
			path: '/uploadfiles',
			method: 'POST',
			
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData),
			}
		};
		
		const req = http.request(options, (res) => {
			let status = res.statusCode;
			let headers = res.headers;
			console.log("res STATUS:", status);
			console.log("res HEADERS:", headers);
			if (headers["compilation-result"] != "ok") {
				console.log("Compilation failed");
				return
			}
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				//console.log(`BODY: ${chunk}`);
			});
			res.on('end', () => {
				console.log('No more data in response.');
			});
		});

		req.on('error', (e) => {
			console.error(`problem with request: ${e.message}`);
		});

		// Write data to request body
		req.write(postData);
		req.end(); 

		// TODO: return
	}

	exports.sharedLibraryToDynplug = function (sharedLibrary, dynplugServerUrl, dynplugServerPort) {

	}

	// Test
	console.log("Testing...")
	var ff = exports.ciaramellaToYaaaeapa('y = A(x) { y = x \n} ', 'A', [], '');
	//console.log(ff)
	var ot = await exports.yaaaeapaToSharedLibrary(ff, "localhost", 10002)

	//exports.sharedLibraryToDynplug(ot, "localhost", 10001)

}());