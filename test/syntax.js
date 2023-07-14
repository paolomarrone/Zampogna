#!/bin/node

const parser = require("../src/grammar");
const util = require("../src/util");
console.log("gesu", util)

const fs = require("fs");

const code = String(fs.readFileSync("syntax.crm"));


console.log(parser)

const AST = parser.parse(code)


console.log(AST)

//console.log(util.printAST(AST));
