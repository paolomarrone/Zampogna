#!/bin/sh

# Depends on Jison. Use npm to install it

jison src/grammar.jison src/lex.jisonflex -o src/grammar.js