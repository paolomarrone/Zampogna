#!/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR" || exit 1

node ../../src/zampogna-cli.js -i decimator -c bypass -t MATLAB -d true decimator.crm
