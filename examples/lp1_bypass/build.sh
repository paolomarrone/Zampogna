#!/bin/sh

mkdir -p build

../../src/zampogna-cli.js -i lp1_bypass -t MATLAB -d true -og false -o build/build_noopt lp1_bypass.crm
../../src/zampogna-cli.js -i lp1_bypass -t MATLAB -d true -og true -o  build/build_opt   lp1_bypass.crm
