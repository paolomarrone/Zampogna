# Ciaramella

A programming language for Audio DSP

- Declarative
- Synchronous Data flow
- Minimalistic
- Modular

Refer to https://ciaramella.dev for getting started with the syntax. Refer to https://zenodo.org/record/6573430 for a more technical reading.



# Installation

```bash
npm install zampogna
```
or

```bash
git clone https://github.com/paolomarrone/Zampogna.git
```

# Usage

- via Node.js:

```
Usage: zampogna-cli.js [options] input_file

Options:
  -i, --initial-block <name>    Initial block name (required)
  -c, --controls <ids>          Control inputs, comma-separated
  -v, --initial-values <pairs>  Initial values, comma-separated key=value pairs
  -t, --target <lang>           Target language (default: cpp)
  -o, --output <folder>         Output folder (default: build)
  -d, --debug <bool>            Debug mode: true/false (default: false)
  -h, --help                    Show this help
```

- via Web Browser:
https://ciaramella.dev/webide.html


## Examples

You can run the examples under examples/. For example
```bash
cd examples/lp_wdf
./build.sh
```

# Credits
Ciaramella and Zampogna are being developed by [Orastron](http://orastron.com "Orastron") in collaboration with the University of Udine.
