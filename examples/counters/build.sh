#!/bin/sh

BASE_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
"$BASE_DIR/../../src/zampogna-cli.js" -i counters -t MATLAB -d true "$BASE_DIR/counters.crm"
