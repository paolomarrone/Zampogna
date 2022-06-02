/*
	Copyright (C) 2021, 2022 Orastron Srl

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
	// Node env

	const zampogna = require('./zampogna')

	const fs = require('fs')
	const path = require('path')


	const usage = "Usage: zampogna-cli.js [-i initial_block] [-c control_inputs] [-v initial_values] \
									[-t target_lang] [-o output_folder] [-d debug_bool] input_file";
	let options = {
		"-i": "",
		"-t": "cpp",
		"-o": "build", 
		"-d": "false",
		"-c": "",
		"-v": ""
	}
	let input_code = "";

	let args = process.argv.slice(2)

	for (let a = 0; a < args.length; a++) {
		let arg = args[a];
		if (options.hasOwnProperty(arg)) {
			if (!options[args[a + 1]]) {
				options[arg] = args[a + 1];
				a++;
			}
			else
				throw new Error("Bad syntax. " + usage);
		}
		else {
			input_code = String(fs.readFileSync(arg));
		}
	}

	if (input_code == "")
		throw new Error("No input file. " + usage);
	if (options["-i"] == "")
		throw new Error("Specify the initial_block.", usage);
	
	const supported_target_languages = ["cpp", "MATLAB", "js"];
	if (!supported_target_languages.includes(options["-t"]))
		throw new Error(options["-t"] + " is not a supported target language. Choose among: " + supported_target_languages.join(", "))

	let debug = options["-d"].toLowerCase() == "true";
	let control_inputs = options['-c'] ? options['-c'].split(',') : []
	let initial_values = {}
	if (options['-v'])
		options['-v'].split(',').map(o => o.split('=')).forEach(e => initial_values[e[0]] = e[1])
	let files = zampogna.compile(null, debug, input_code, options["-i"], control_inputs, initial_values, options["-t"]);

	if (!fs.existsSync(options['-o']))
	    fs.mkdirSync(options['-o']);
	files.forEach(f => fs.writeFile(path.normalize(path.join(options['-o'], f.name)), f.str, err => { if (err) throw err }))

}());