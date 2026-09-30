const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const zampogna = require('../src/zampogna')

const targets = ['C', 'cpp', 'VST2', 'yaaaeapa', 'MATLAB', 'js', 'd']
const examples = [{
	name: 'lp_wdf',
	file: 'examples/lp_wdf/lp_wdf.crm',
	entry: 'lp_filter',
	controls: ['cutoff'],
	sampleRate: 48000,
	parameters: { cutoff: 0.5 }
}]

function compile(example, target) {
	const source = fs.readFileSync(path.join(__dirname, '..', example.file), 'utf8')
	const warn = console.warn
	console.warn = () => {}
	try {
		return zampogna.compile(null, false, source, example.entry, example.controls, {}, target)
	}
	finally {
		console.warn = warn
	}
}

function loadProcessor(files, sampleRate) {
	const source = files.find(file => file.name === 'processor.js')
	let Processor

	class AudioWorkletProcessor {
		constructor() {
			this.port = {}
		}
	}

	vm.runInNewContext(source.str, {
		AudioWorkletProcessor,
		sampleRate,
		registerProcessor: (name, implementation) => {
			Processor = implementation
		}
	})

	return new Processor()
}

function createProcessor(example) {
	const processor = loadProcessor(compile(example, 'js'), example.sampleRate)
	for (const [name, value] of Object.entries(example.parameters))
		processor.instance[name] = value
	return processor
}

function render(processor, input, blockSizes) {
	const output = new Float32Array(input.length)
	let offset = 0

	for (const size of blockSizes) {
		const inputBlock = input.subarray(offset, offset + size)
		const outputBlock = output.subarray(offset, offset + size)
		processor.process([[inputBlock]], [[outputBlock]], {})
		offset += size
	}

	assert.equal(offset, input.length)
	return output
}

function referenceImpulse(length, sampleRate, cutoff) {
	const capacitance = 1e-6
	const frequency = (0.1 + 0.3 * cutoff) * sampleRate
	const resistance = 1 / (2 * Math.PI * frequency * capacitance)
	const portResistance = 0.5 / (capacitance * sampleRate)
	const reflection = portResistance / (resistance + portResistance)
	const output = new Float64Array(length)
	let delayed = 0

	for (let i = 0; i < length; i++) {
		const input = i === 0 ? 1 : 0
		const incident = delayed - 2 * reflection * (delayed + input)
		output[i] = 0.5 * (incident + delayed)
		delayed = incident
	}

	return output
}

test('examples generate every target', () => {
	for (const example of examples) {
		for (const target of targets) {
			const files = compile(example, target)
			assert.ok(files.length > 0, `${example.name} generated no ${target} files`)
			assert.ok(files.every(file => file.name && typeof file.str === 'string'))
		}
	}
})

test('lp_wdf has a stable and deterministic impulse response', () => {
	const example = examples[0]
	const input = new Float32Array(64)
	input[0] = 1

	const processor = createProcessor(example)
	const complete = render(processor, input, [input.length])
	const expected = referenceImpulse(input.length, example.sampleRate, example.parameters.cutoff)

	for (let i = 0; i < complete.length; i++) {
		assert.ok(Number.isFinite(complete[i]))
		assert.ok(Math.abs(complete[i] - expected[i]) < 1e-6, `sample ${i}`)
	}

	processor.instance.reset()
	assert.deepEqual(render(processor, input, [input.length]), complete)

	const split = render(createProcessor(example), input, [7, 13, 44])
	assert.deepEqual(split, complete)
})
