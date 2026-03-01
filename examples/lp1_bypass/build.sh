#!/bin/sh

BASE_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
"$BASE_DIR/../../src/zampogna-cli.js" -i lp1_bypass -t MATLAB -d true -og false -o "$BASE_DIR/build/build_noopt" "$BASE_DIR/lp1_bypass.crm"
"$BASE_DIR/../../src/zampogna-cli.js" -i lp1_bypass -t MATLAB -d true -og true -o "$BASE_DIR/build/build_opt" "$BASE_DIR/lp1_bypass.crm"
