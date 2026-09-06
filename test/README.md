# Tests

Run all suites from any working directory using the path to `test/run.js`:

```sh
node test/run.js
node test/run.js --require-octave
```

The compiler's Node dependencies and a C99 compiler (`cc`, or the executable in
`CC`) must be installed. The default native matrix uses `-O0` with trapping UBSan
and `-O2`, independently of Zampogna's four graph optimizations being on or off.
GNU Octave is optional locally: missing execution checks are reported as **SKIP**,
not passes. `--require-octave` makes it mandatory. A tool that is present but
cannot execute is a failure. CI should use `--require-octave`.

For additional AddressSanitizer and UBSan checks with diagnostic runtimes:

```sh
CC=clang node test/run.js --extended --require-octave
CC=gcc node test/run.js --extended --require-octave
```

`--extended` adds an `-O1 -g -fsanitize=address,undefined` build. The selected
compiler's sanitizer libraries must be installed; the runner checks that each
requested build configuration can compile and execute before running cases.
There is no fast-math configuration: signed zero, subnormals, NaN and infinities
are part of these tests.

Each legacy suite gets its own output directory. Subprocesses have timeouts,
and successful temporary directories are removed. Use `--keep` to retain all
artifacts. Failed native cases retain their artifacts automatically, and the
suite runner retains logs when any suite fails.

## Native semantic cases

```sh
node test/test_semantics.js
node test/test_semantics.js --filter 'independent instance' --keep
node test/test_semantics.js --cc clang --extended
```

`cases/semantics.js` contains the original 43 regression cases.
`cases/streams.js` adds long deterministic streams, circular delay wraparound,
long inactive branches, tiny values and IEEE special values, distinct instance
timelines, midstream resets, zero-input generators and empty calls.
`test_harness.js` checks the transport, comparisons, event planning, and failure
handling, including rejection of zero output for a small nonzero expectation.

Cases contain source (`code`, optional `prelude`), planar `inputs` and `expected`
arrays. The entry block is named `probe`; root audio ports use the generated
float32 API. Integer and boolean behavior is tested through explicit casts at
this boundary. `files` supplies include files when needed. Keep the oracle small
and independent of the compiler; use `Math.fround` at float32 operation
boundaries in numerical reference models. Record a fixed seed for generated
inputs. A passing comparison between two compiler configurations alone is not
an oracle.

An optional `streams` array replaces the case's direct stream fields and supplies
one or two distinct streams for the same program. Stream fields include:

| Field | Meaning |
| --- | --- |
| `inputs`, `expected` | Arrays of channels, each with the same frame count |
| `frames` | Optional frame count, otherwise taken from the first expected output; zero-input programs use `inputs: []` |
| `controls` | Named control inputs and their initial values; existing fixtures can also use per-sample value arrays |
| `sampleRate` | Initial rate, default 48000 Hz |
| `events` | Ordered `{at, type, ...}` objects at absolute sample offsets |
| `emptyCalls` | Also call process with zero frames at each buffer boundary |
| `comparison` | Override the case's comparison policy |

Event types are `control` (with `name`, `value`), `rate` (with `value`), and
`reset`. Events apply **before** the sample at `at`; same-offset events run in
listed order. Events at the end of the stream are allowed. `sampleRates` arrays
in the original fixtures are translated to rate events. Neither repeated
setters nor their order are optimized away.

Every native build runs whole-buffer, single-sample, fixed 64-frame and irregular
3/1/17/2/63/5-frame requests. Requests split at event offsets, preserving the
timeline. Two instances run interleaved, with different buffer partitions and
storage filled with `0xa5` and `0x5a` before initialization. If only one stream is
specified, both instances receive it. Each stream is then replayed on the same
instance after resetting the rate, controls and state, without another init.
Buffer guards catch adjacent writes; extended sanitizer builds check memory
accesses as well. Empty-call checks are explicit per case, because a zero-frame
call can still execute generated setup callbacks.

Comparison defaults to exact float32 values, including signed zero. NaN only
matches an explicitly expected NaN (payloads are unspecified); infinities must
have the same sign. Routing, delays, counters and boolean/integer results should
normally be exact. Numerical cases can declare a tolerance, for example:

```js
comparison: { mode: 'tolerance', absolute: 2e-6, relative: 2e-6 }
```

Finite values then require `abs(actual - expected) <= absolute + relative *
abs(expected)`. Opposite signed zeros still fail. Do not increase a tolerance to
hide an unexplained error. The bypass-filter case declares its tolerance; the
other current cases use exact comparison.

MATLAB retains its original one-shot, double-precision oracle checks. Cases with
native lifecycle events or external C callbacks use `cOnly: true`; MATLAB does
not expose the native persistent-instance API. Brickworks checks compile and run
its generated C processing API, not the VST host wrapper. Its current wrapper
generator only supports up to two audio input/output channels; larger cases
report that target as skipped.

## Failure artifacts

Failures print the temporary directory and the first mismatching channel/sample,
with nearby actual and expected values. The case directory contains:

- `source.crm`, include fixtures, generated target code and compiler options.
- `case.json`, including expectations, timeline, comparison policy and seed.
- One directory per target/build configuration, with `adapter.h`, `driver.c`,
  the compiled `check`, compiler arguments and build logs.
- One directory per buffer layout, with `plan.json`, `commands.txt`, raw input,
  expected and actual output streams, execution arguments and logs.

All `.f32` files are **headerless planar IEEE-754 binary32, little endian**:
channel 0's complete stream, then channel 1, and so on. Counts are in the case
metadata. `input-I.f32` and `expected-I.f32` identify instance `I`;
`output-I-0.f32` is its first run and `output-I-1.f32` its reset replay.
Special numbers in JSON appear as strings (`"NaN"`, `"Infinity"`, `"-Infinity"`,
`"-0"`); binary files carry the actual samples.

The C driver reads the small text command file generated from the timeline;
it does not parse JSON or embed input/expected arrays. To replay an executable,
change to its buffer-layout directory and run `../check commands.txt`.
The recorded `*.command.json` files include exact argument arrays and working
directories for rebuilding or replaying. Compiler versions are recorded at the
semantic artifact root. `check.m` files and the root `matlab.log` retain the
Octave checks.
