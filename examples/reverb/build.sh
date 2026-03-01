#!/bin/sh

BASE_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
"$BASE_DIR/../../src/zampogna-cli.js" -i reverb -c predelay,bandwidth,damping,decay,wet,delay_ff,delay_fb,coeff_blend,coeff_ff,coeff_fb -t bw -paths "$BASE_DIR/../../test/c" "$BASE_DIR/reverb.crm"
