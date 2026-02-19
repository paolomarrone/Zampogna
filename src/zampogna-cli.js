#!/usr/bin/env node

(function() {

	'use strict';

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
			input_file
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

	const args = process.argv.slice(2);

	let input_code;

	for (let a = 0; a < args.length; a++) {
		const arg = args[a];
		if (Object.prototype.hasOwnProperty.call(options, arg)) {
			const next = args[a + 1];
			if (!next || Object.prototype.hasOwnProperty.call(options, next))
				throw new Error("Bad syntax. " + usage);
			options[arg] = next;
			a++;
		}
		else {
			if (arg.startsWith("-"))
				throw new Error("Unknown option: " + arg + ". " + usage);
			input_code = String(fs.readFileSync(arg));
		}
	}
	if (!input_code)
		throw new Error("No input file. " + usage);

	if (options["-i"] === "")
		throw new Error("Please, specify the initial_block_id. " + usage);
	
	const supported_target_languages = ["C", "bw"];

	if (!supported_target_languages.includes(options["-t"]))
		throw new Error(options["-t"] + " is not a supported target language. Choose among: " + supported_target_languages.join(", "));

	const debug = options["-d"].toLowerCase() === "true";
	const control_inputs = (options["-c"] ? options["-c"].split(",") : []).filter(c => c !== "");
	const initial_values = {};
	if (options["-v"]) {
		options["-v"].split(",").forEach(entry => {
			const parts = entry.split("=");
			if (parts.length !== 2 || parts[0] === "")
				throw new Error("Invalid -v argument entry: " + entry + ". Expected key=value.");
			initial_values[parts[0]] = parts[1];
		});
	}
	
	const searchpaths = [];
	options["-paths"].split(",").filter(p => p !== "").forEach(p => {
		searchpaths.push(path.join(process.cwd(), p));
	});
	const filereader = util.get_filereader(searchpaths);

	const initial_block_inputs_n = options["-in"] === ""
		? -1
		: parseInt(options["-in"], 10);
	if (options["-in"] !== "" && Number.isNaN(initial_block_inputs_n))
		throw new Error("Invalid -in argument. Must be an integer.");

	const z_options = {
		debug_mode: debug,
		initial_block_id: options["-i"],
		initial_block_inputs_n: initial_block_inputs_n,
		control_inputs: control_inputs,
		initial_values: initial_values,
		target_language: options["-t"],
	};

	const files = z.compile(input_code, filereader, z_options);

	files.forEach(f => {
		fs.mkdirSync(path.join(options["-o"], f.path), { recursive: true });
		fs.writeFileSync(path.join(options["-o"], f.path, f.name), f.str);
	});

}());
