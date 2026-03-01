#!/bin/sh

BASE_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
"$BASE_DIR/../../src/zampogna-cli.js" -i decimator -c bypass -t MATLAB -d true "$BASE_DIR/decimator.crm"
