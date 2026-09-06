'use strict';

const bs = require('./blocks').BlockTypes;

// These name execution events, not frequencies. Guards separately determine
// whether a runtime operation executes on a particular sample.
const PHASES = {
    Constant: 'constant',
    Init: 'init',
    Fs: 'sample-rate',
    Control: 'control',
    Reset: 'reset',
    Audio: 'audio',
};

const setup = [
    ['init', PHASES.Init], ['set_sample_rate', PHASES.Fs],
    ['reset_coeffs', PHASES.Reset], ['reset_state', PHASES.Reset],
];

function combine(inputs, initialization) {
    const phases = new Set(inputs);
    if (phases.has(undefined)) throw new Error('Missing input phase');
    if (phases.has(PHASES.Audio)) return PHASES.Audio;
    if (phases.has(PHASES.Reset)) {
        // A runtime expression must respond to subsequent control/fs changes.
        // Initializer expressions instead take a snapshot during reset.
        if (!initialization && (phases.has(PHASES.Control) || phases.has(PHASES.Fs)))
            return PHASES.Audio;
        return PHASES.Reset;
    }
    for (const phase of [PHASES.Control, PHASES.Fs, PHASES.Init])
        if (phases.has(phase)) return phase;
    return PHASES.Constant;
}

function available(source, destination) {
    if (source == undefined) return false;
    if (source == PHASES.Constant || source == destination) return true;
    if (destination == PHASES.Constant) return false;
    if (destination == PHASES.Audio) return true;
    if (source == PHASES.Init) return true;
    if (source == PHASES.Fs)
        return destination == PHASES.Control || destination == PHASES.Reset;
    return source == PHASES.Control && destination == PHASES.Reset;
}

function requireAvailable(port, phase, use) {
    if (!port) throw new Error(use + ': unknown input port');
    if (!available(port.phase, phase))
        throw new Error(`${use}: ${port.phase || 'unknown'} input is unavailable during ${phase}`);
}

function analyzeCall(block) {
    const funcs = block.ref.funcs;
    if (!funcs.process1) throw new Error('process1 is required: ' + block.ref.id);
    block.phase = PHASES.Audio;
    block.callbacks = [
        ...setup.map(([name, phase]) => ({ func: funcs[name], phase })),
        ...[...funcs.setters, funcs.update_coeffs_ctrl, funcs.update_coeffs_audio, funcs.process1]
            .map(func => ({ func, phase: PHASES.Audio })),
    ].filter(c => c.func);
    for (const { func: f, phase } of block.callbacks) {
        const use = 'C callback ' + f.f_name;
        if (!Array.isArray(f.f_inputs) || !Array.isArray(f.f_outputs))
            throw new Error(use + ': f_inputs and f_outputs must be arrays');
        if (f.f_outputs.length > 1)
            throw new Error('A C function can return only one value: ' + f.f_name);
        const outputs = new Set(f.f_outputs);
        for (const arg of f.f_inputs) {
            if (/^i[0-9]+$/.test(arg))
                requireAvailable(block.i_ports[Number(arg.slice(1))], phase, use);
            else if (/^o[0-9]+$/.test(arg)) outputs.add(arg);
            else if (arg == 'state' || arg == 'coeffs') {
                if (!block.ref[arg]) throw new Error(use + ': ' + arg + ' is not declared');
            } else throw new Error(use + ': unknown argument ' + arg);
        }
        for (const arg of outputs) {
            if (!/^o[0-9]+$/.test(arg)) throw new Error(use + ': invalid output port ' + arg);
            const port = block.o_ports[Number(arg.slice(1))];
            if (!port) throw new Error(use + ': unknown output port ' + arg);
            if (port.phase != undefined && port.phase != phase)
                throw new Error(`C output ${arg} of ${block.ref.id} is written in multiple phases`);
            port.phase = phase;
        }
    }
    for (const [i, p] of block.o_ports.entries())
        if (p.phase == undefined) throw new Error(`C output o${i} of ${block.ref.id} has no producer`);
}

// Run only after graph transformations, with the dependency order of that graph.
// No getters, persistent inference marks, or facts shared between instances.
function analyze(bdef, schedule, options = {}) {
    const incoming = new Map(bdef.connections.map(c => [c.out, c.in]));
    for (const b of [bdef, ...bdef.blocks]) {
        b.phase = undefined;
        for (const p of [...b.inputs(), ...b.o_ports]) p.phase = undefined;
    }
    const controls = new Set(options.control_inputs || []);
    const inputs = new Set(bdef.i_ports.map(p => p.id));
    for (const id of controls)
        if (!inputs.has(id))
            throw new Error('No input with such id: ' + id);
    for (const p of bdef.i_ports)
        p.phase = controls.has(p.id) ? PHASES.Control : PHASES.Audio;
    bdef.i_ports[0].phase = PHASES.Fs;

    for (const b of schedule) {
        for (const p of b.inputs()) {
            p.phase = incoming.get(p).phase;
            if (p.phase == undefined) throw new Error('Missing input phase: ' + p);
        }
        if (bs.CallBlock.isPrototypeOf(b) && b.type == 'cdef') {
            analyzeCall(b);
            continue;
        }
        if (bs.ConstantBlock.isPrototypeOf(b)) b.phase = PHASES.Constant;
        else if (bs.MemoryBlock.isPrototypeOf(b)) {
            b.phase = PHASES.Reset;
            requireAvailable(b.i_ports[1], PHASES.Reset, 'Memory initializer ' + b.id);
        } else if (bs.MemoryReaderBlock.isPrototypeOf(b) || bs.MemoryWriterBlock.isPrototypeOf(b)
            || b.guard_ports.length)
            b.phase = PHASES.Audio;
        else b.phase = combine(b.i_ports.map(p => p.phase), b.initialization);
        for (const p of b.o_ports) p.phase = b.phase;
    }
    for (const p of bdef.o_ports) p.phase = incoming.get(p).phase;
}

module.exports = { ...PHASES, analyze };
