#!/bin/sh

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR" || exit 1

node ../../src/zampogna-cli.js -i lp_filter -c cutoff -t js -d false lp_wdf.crm
