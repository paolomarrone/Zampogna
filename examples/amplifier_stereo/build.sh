#!/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR" || exit 1

node ../../src/zampogna-cli.js -i stereoamp -c vl,vr -t yaaaeapa -d false stereoamp.crm
