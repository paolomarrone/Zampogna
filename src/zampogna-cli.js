#!/usr/bin/env node

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
	'use strict'
	// Node env

	const zampogna = require('./zampogna')
	const package_info = require('../package.json')

	const fs = require('fs')
	const path = require('path')

	const supported_target_languages = ["C", "cpp", "VST2", "yaaaeapa", "MATLAB", "js", "d"]
	const usage = [
		"Usage: zampogna [options] input_file",
		"",
		"Options:",
		"  -i, --initial-block <name>    Initial block name (required)",
		"  -c, --controls <ids>          Control inputs, comma-separated",
		"  -V, --initial-values <pairs>  Initial values, comma-separated key=value pairs",
		"  -t, --target <lang>           Target language (default: cpp)",
		"  -o, --output <folder>         Output folder (default: build)",
		"  -d, --debug <bool>            Debug mode: true/false (default: false)",
		"  -h, --help                    Show this help",
		"  -v, --version                 Show version",
		"",
		"Supported targets: " + supported_target_languages.join(", ")
	].join("\n")

	let options = {
		"-i": "",
		"-t": "cpp",
		"-o": "build", 
		"-d": "false",
		"-c": "",
		"-V": ""
	}
	const long_options = {
		"--initial-block": "-i",
		"--controls": "-c",
		"--initial-values": "-V",
		"--target": "-t",
		"--output": "-o",
		"--debug": "-d"
	}
	const help_options = new Set(["-h", "--help"])
	const version_options = new Set(["--version"])
	let input_code = ""

	const args = process.argv.slice(2)

	if (args.some(arg => help_options.has(arg))) {
		console.log(usage)
		process.exit(0)
	}
	if (args.some(arg => version_options.has(arg))) {
		console.log(package_info.version)
		process.exit(0)
	}

	for (let a = 0; a < args.length; a++) {
		const arg = args[a]
		if (arg === "-v") {
			const value = args[a + 1]
			if (value !== undefined && !value.startsWith('-')) {
				options["-V"] = value
				a++
				continue
			}
			console.log(package_info.version)
			process.exit(0)
		}
		const option = long_options[arg] || arg
		if (options.hasOwnProperty(option)) {
			const value = args[a + 1]
			const next_option = long_options[value] || value
			if (value === undefined || options.hasOwnProperty(next_option))
				throw new Error("Bad syntax. " + usage);
			options[option] = value
			a++
		}
		else {
			if (arg.startsWith('-'))
				throw new Error("Bad syntax. " + usage)
			input_code = String(fs.readFileSync(arg))
		}
	}

	if (input_code === "")
		throw new Error("No input file. " + usage);
	if (options["-i"] === "")
		throw new Error("Specify the initial_block. " + usage);

	if (!supported_target_languages.includes(options["-t"]))
		throw new Error(options["-t"] + " is not a supported target language. Choose among: " + supported_target_languages.join(", "))

	const debug = options["-d"].toLowerCase() === "true"
	const control_inputs = options['-c'] ? options['-c'].split(',') : []
	const initial_values = {}
	if (options['-V'])
		options['-V'].split(',').map(o => o.split('=')).forEach(e => initial_values[e[0]] = e[1])
	const files = zampogna.compile(null, debug, input_code, options["-i"], control_inputs, initial_values, options["-t"])

	if (!fs.existsSync(options['-o']))
		fs.mkdirSync(options['-o'])
	if (!fs.existsSync(path.join(options['-o'], options["-t"])))
		fs.mkdirSync(path.join(options['-o'], options["-t"]))
	files.forEach(f => fs.writeFile(path.normalize(path.join(options['-o'], options["-t"], f.name)), f.str, err => { if (err) throw err }))

}());
