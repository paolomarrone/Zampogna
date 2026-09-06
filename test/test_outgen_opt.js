#!/usr/bin/env node
'use strict';

// Retired flags are accepted for compatibility, but must never change semantics
// or silently select one of the old code-motion paths.
const assert = require('assert');
const z = require('../src/zampogna');
const code = `float y = delay(float x) {
    mem[1] float s; s.init = x; y = s[0]; s[0] = x;
}
y = probe(x, c) {
    bool gate = c > 0.5;
    y = if(gate) { y = delay(delay(x)); } else { y = -1.0; };
}`;
for (const target_language of ['C', 'bw', 'MATLAB']) {
    const options = { initial_block_id: 'probe', target_language };
    // The VST wrapper assigns fresh plugin GUIDs on each compilation.
    const sourceFiles = files => files.filter(f => f.name !== 'config_vst3.h');
    const expected = sourceFiles(z.compile(code, null, options));
    for (const enabled of [false, true]) {
        const actual = z.compile(code, null, {
            ...options, outgen_optimizations: enabled,
            outgen_code_sinking: enabled, outgen_code_hoisting: enabled,
            optimizations: {
                remove_dead_graph: true, negative_negative: true,
                negative_consts: true, unify_consts: true, remove_useless_vars: enabled,
                merge_equal_pure_blocks: enabled, merge_vars: enabled,
                lazyfy_subexpressions_rates: enabled, lazyfy_subexpressions_controls: enabled,
            },
        });
        assert.deepStrictEqual(sourceFiles(actual), expected);
    }
}
console.log('Retired output optimization flags: passed');
