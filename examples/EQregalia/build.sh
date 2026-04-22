#!/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR" || exit 1

node ../../src/zampogna-cli.js -i EQregaliaStereo -c low,high,peak -v low=1 -t cpp -d false EQregalia.crm
