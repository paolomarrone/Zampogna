#!/usr/bin/env node

'use strict';

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { preprocess } = require("../src/preprocessor");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zampogna-frontend-"));
const cli = path.join(__dirname, "../src/zampogna-cli.js");
const source = "y = probe(x) { y = x; }";
let passed = 0;
let failed = 0;
let invocation = 0;

function test(name, run) {
	try {
		run();
		passed++;
	} catch (error) {
		failed++;
		console.error(name + ":", error);
	}
}

function runCLI(args, input = "probe.crm") {
	const outputDir = path.join(tempDir, "build-" + invocation++);
	const result = spawnSync(process.execPath, [cli, "-i", "probe", "-o", outputDir, ...args, input], {
		cwd: tempDir,
		encoding: "utf8"
	});
	if (result.error)
		throw result.error;
	return { ...result, outputDir };
}

try {
	fs.writeFileSync(path.join(tempDir, "probe.crm"), source);
	fs.writeFileSync(path.join(tempDir, "overloaded.crm"), source + "\ny = probe(x, z) { y = x + z; }");

	test("include whitespace, empty files, and duplicate includes", () => {
		const reads = [];
		const result = preprocess("include\t empty;\r\ninclude  empty\r\n" + source, filename => {
			reads.push(filename);
			return filename === "empty.crm" ? "" : null;
		});
		assert.deepStrictEqual(result, ["\n" + source + "\n", []]);
		assert.deepStrictEqual(reads, ["empty.crm"]);
	});

	test("JSON includes still contribute their wrappers and descriptors", () => {
		const descriptor = { wrapper: [source] };
		const result = preprocess("include  external;", filename => filename === "external.json" ? JSON.stringify(descriptor) : null);
		assert.deepStrictEqual(result, ["\n\n" + source, [descriptor]]);
	});

	for (const value of ["1.5", "1oops", "-2", "9007199254740993"]) {
		test("reject invalid input count " + value + " before writing output", () => {
			const result = runCLI(["-in", value], "overloaded.crm");
			assert.strictEqual(result.status, 1, result.stderr);
			assert.match(result.stderr, /Invalid -in argument/);
			assert.strictEqual(fs.existsSync(result.outputDir), false);
		});
	}

	for (const flag of ["-d", "-og", "-os", "-oh"]) {
		test("reject invalid boolean for " + flag, () => {
			const result = runCLI([flag, "flase"]);
			assert.strictEqual(result.status, 1, result.stderr);
			assert.ok(result.stderr.includes("Invalid " + flag + " argument"));
			assert.strictEqual(fs.existsSync(result.outputDir), false);
		});
	}

	test("reject multiple input files before writing output", () => {
		const result = runCLI(["probe.crm"]);
		assert.strictEqual(result.status, 1, result.stderr);
		assert.match(result.stderr, /Only one input file/);
		assert.strictEqual(fs.existsSync(result.outputDir), false);
	});

	for (const args of [[], ["-in", "-1"], ["-in", "1", "-og", "FALSE", "-os", "True", "-oh", "false", "-d", "FALSE"]]) {
		test("compile with valid options " + args.join(" "), () => {
			const result = runCLI(args);
			assert.strictEqual(result.status, 0, result.stderr);
			assert.ok(fs.readFileSync(path.join(result.outputDir, "probe.h"), "utf8").includes("probe_process"));
		});
	}

	for (const count of ["1", "2", "+1"]) {
		test("select overload with " + count + " inputs", () => {
			const result = runCLI(["-in", count], "overloaded.crm");
			assert.strictEqual(result.status, 0, result.stderr);
			const header = fs.readFileSync(path.join(result.outputDir, "probe.h"), "utf8");
			const signature = header.split("\n").find(line => line.startsWith("void probe_process("));
			assert.ok(signature, "Missing process signature");
			assert.strictEqual(signature.includes("z0"), count === "2", signature);
		});
	}
} finally {
	fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("Frontend tests passed: " + passed + " / " + (passed + failed));
if (failed)
	process.exitCode = 1;
