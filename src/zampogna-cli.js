#!/bin/node

(function () {

	const path = require("path");
	const fs = require("fs");


	const util = require("./util");
	const z = require("./zampogna");

	const usage = `
		Usage: 
			zampogna-cli.js 
			[-i initial_block]
			[-c control_inputs]
			[-v initial_values]
			[-t target_lang]
			[-o output_folder]
			[-d debug_bool]
			input_file";
	`;

	const options = {
		"-d": "false",
		"-i": "",
		"-in": "",
		"-c": "",
		"-v": "",
		"-t": "C",
		"-o": "build",
		"-paths": ""
	};

	const args = process.argv.slice(2)

	var input_code;

	for (let a = 0; a < args.length; a++) {
		const arg = args[a];
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
		throw new Error("Please, specify the initial_block_id.", usage);
	
	const supported_target_languages = ["C", "bw"];

	if (!supported_target_languages.includes(options["-t"]))
		throw new Error(options["-t"] + " is not a supported target language. Choose among: " + supported_target_languages.join(", "));

	const debug = options["-d"].toLowerCase() == "true";
	const control_inputs = (options['-c'] ? options['-c'].split(',') : []).filter(c => c != "");
	const initial_values = {};
	if (options['-v'])
		options['-v'].split(',').map(o => o.split('=')).forEach(e => initial_values[e[0]] = e[1])
	
	const searchpaths = [];
	options["-paths"].split(',').forEach(p => {
		searchpaths.push(path.join(process.cwd(), p));
	});
	const filereader = util.get_filereader(searchpaths);


	const z_options = {
		debug_mode: debug,
		initial_block_id: options["-i"],
		initial_block_inputs_n: options["-in"],
		control_inputs: control_inputs,
		initial_values: initial_values,
		target_language: options["-t"],
	};

	const files = z.compile(input_code, filereader, z_options);

	files.forEach(f => {
		fs.mkdirSync(path.join(options['-o'], f.path), { recursive: true });
		fs.writeFile(path.join(options['-o'], f.path, f.name), f.str, err => { if (err) throw err });
	});

}())