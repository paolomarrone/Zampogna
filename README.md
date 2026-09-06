# Ciaramella

## EXPERIMENTAL branch!  

Trying better (?) implementation

### Notes (experimental status)

- This branch is experimental and under active development.
- Some features and implementation details may change.

### Current language/compiler features

- Datatypes
  - `float32`, `int32`, `bool`
  - Strong typing
  - Casts are always required
  - If datatype is not specified, default is `float32`

- Arrays
  - Used for delay lines

- Signal properties
  - `.init`
    - automatic inference and propagation
  - `.fs`
    - automatic inference and propagation

- Includes
  - Include other `.crm` files
  - Include C code
    - Brickworks modules
    - described by JSON files

### Delay implementation (experimental)

- Delays are implemented with memory blocks.
- Memory reads happen at the beginning of the sample step and memory writes at the end.
- Each delay call has its own state. Chained delays retain one step per call.

### If-then-else support (experimental)

- Only the selected branch executes. This also applies to `else if`, `?:`, nested branches, and calls made inside a branch.
- A delay inside a branch remembers its input from the **previous execution of that branch**, even when the input is defined outside. It holds its state while the branch is inactive.
- State is initialized on reset. A branch output inherits an explicitly assigned initializer from its enclosing output unless it defines its own.
- External C modules initialize and reset during setup. Their setters, coefficient updates, and processing callbacks run in that order on each execution of the call.

```text
previous_t = delay(t)                 # advances every sample
y = if (enabled) {
    local_previous_t = delay(t)       # advances only while enabled
    y = local_previous_t
} else {
    y = previous_t
}
```

For `t = [10, 20, 30, 40]` and `enabled = [true, false, true, true]`, with zero initialization, `previous_t` is `[0, 10, 20, 30]`. The inner delay returns `0`, `10`, and `30` on its three executions. Move a delay outside the branch when you want history from every sample.

### Compiler implementation

Branch guards are graph inputs, so cloning, reachability, and scheduling preserve them. Generated code snapshots memory reads and computes all write indices and values before committing writes. Code generation follows the dependency schedule without moving or merging branch computations.

Four small graph optimizations are enabled by default: `remove_dead_graph`, `negative_negative`, `negative_consts`, and `unify_consts`. They remove unused computations, eliminate double floating-point or boolean negation on the same branch clock, fold representable negated constants, and share constants of the same type and value. Signed zero remains distinct; integer negations that may overflow are preserved. Pass an `optimizations` object to select these passes explicitly (omitted entries are disabled).

The other graph rewrite and output optimization options are ignored, including the CLI flags `-og`, `-os`, and `-oh`. Sample-rate and control expressions retain their setup phases; branch computations execute per selected sample.

Run `node test/test_semantics.js` for execution checks of generated C and MATLAB code (requires `cc` and GNU Octave).


# Credits
Ciaramella and Zampogna are being developed by [Orastron](http://orastron.com "Orastron")
