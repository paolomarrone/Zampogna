#!/bin/sh

BASE_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
"$BASE_DIR/../../src/zampogna-cli.js" -i lp_filter -c cutoff -t MATLAB -d false "$BASE_DIR/lp_wdf.crm"
