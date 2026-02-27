# Zampogna

Zampogna is a compiler for the Ciaramella audio DSP language.

Ciaramella is designed around a small declarative, synchronous data-flow model for audio processing. Zampogna parses Ciaramella source files and generates code for multiple targets.

Key traits:
- Declarative
- Synchronous Data flow
- Minimalistic
- Modular

References:
- Getting started and syntax: https://ciaramella.dev
- Technical paper: https://zenodo.org/record/6573430

## Installation

Install from npm:

```bash
npm install -g zampogna
```

Or work from source:

```bash
git clone https://github.com/paolomarrone/Zampogna.git
cd Zampogna
npm install
```

## CLI Usage

If installed globally, use:

```text
Usage: zampogna [options] input_file

Options:
  -i, --initial-block <name>    Initial block name (required)
  -c, --controls <ids>          Control inputs, comma-separated
  -v, --initial-values <pairs>  Initial values, comma-separated key=value pairs
  -t, --target <lang>           Target language (default: cpp)
  -o, --output <folder>         Output folder (default: build)
  -d, --debug <bool>            Debug mode: true/false (default: false)
  -h, --help                    Show this help
```

Supported targets: `C`, `cpp`, `VST2`, `yaaaeapa`, `MATLAB`, `js`, `d`.

Example:

```bash
zampogna -i test -t cpp examples/ifelseNormalize/ifelse.crm
```

If you are running from a local clone instead of a global install:

```bash
node src/zampogna-cli.js -i test examples/ifelseNormalize/ifelse.crm
```

Generated files are written under `build/<target>/` by default.

## Browser Usage

The web IDE is available at:

https://ciaramella.dev/webide.html

## Examples

Sample projects are available under `examples/`.

For example:

```bash
cd examples/lp_wdf
./build.sh
```

## Credits

Ciaramella and Zampogna are developed by [Orastron](http://orastron.com) in collaboration with the University of Udine.
