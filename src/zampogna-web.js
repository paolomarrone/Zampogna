(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.zampogna = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
	Copyright (C) 2021, 2022 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/
(function() {

	var ScopeTable = {
		elements: {},
		father: null,
		id: "",

		init: function (id) {
			this.id = id
			this.elements = {}
		},

		findLocal: function (id) {
			return this.elements[id] 
		},

		find: function (id) {
			if (e = this.findLocal(id))
				return e
			if (this.father)
				return this.father.find(id);
			return null
		},

		add: function (id, item) {
			if (id == '_')
				return
			if (this.findLocal(id))
				err("ID assigned twice: " + id);
			this.elements[id] = item
		},

		toString: function () {
			let s = this.id + ": [\n"
			for (let p in this.elements) {
				s += '\t' + p + ": [\n"
				for (let pp in this.elements[p])
					s += '\t\t' + pp + ':\t' + this.elements[p][pp] + '\n'
				s += '\t]\n'
			}
			s += ']\n'
			return s
		}
	}

	var scopes = []
	var scope_reserved = Object.create(ScopeTable)
	scope_reserved.init("_reserved_")
	scope_reserved.add("delay1", { 
		type: 'func', 
		inputsN: 1,
		outputsN: 1,
	})	

	function validate (AST_root) {
		scopes = []
		scopes.push(scope_reserved)
		let scope_program = Object.create(ScopeTable)
		scope_program.init("_program_")
		scope_program.father = scope_reserved
		scopes.push(scope_program)

		AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(
			block => analyze_block_signature(scope_program, block))

		AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(ass => ass.outputs.forEach(function (output) {
				if (output.init)
					err("Cannot use '@' in consts definitions")
				analyze_left_assignment(scope_program, output)
				scope_program.elements[output.val].kind = 'const'
		}))

		AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(
			ass => analyze_right_assignment(scope_program, ass.expr, ass.outputs.length))

		AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(
			block => analyze_block_body(scope_program, block))

		for (let i in scope_program.elements) {
			let item = scope_program.elements[i]
			if (item.kind == 'const' && !item.used)
				warn(item.kind + " " + i + " not used")
		}

		return scopes;
	}

	function analyze_block_signature(parent_scope, block) {
		if (block.inputs.some(o => o.name != 'ID'))
			err("Invalid arguments in block definition. Use only IDs")
		if (block.outputs.some(o => o.init))
			err("Cannot use '@' in block definitions")
		if (block.outputs.some(o => o.val == '_'))
			err("Cannot use '_' in block definitions")
		parent_scope.add(block.id.val, {
			kind: 		"block",
			inputsN: 	block.inputs.length,
			outputsN: 	block.outputs.length
		})
	}

	function analyze_anonym_block_signature(block) {
		if (block.outputs.some(o => o.val == '_'))
			err("Cannot use '_' in block definitions")
		if (block.outputs.some(o => o.init))
			err("Cannot use '@' in block definitions")
	}

	function analyze_block_body(parent_scope, block) {
		let scope_block = Object.create(ScopeTable)
		scope_block.init(block.id.val)
		scope_block.father = parent_scope
		scopes.push(scope_block)

		block.inputs.forEach(i => scope_block.add(i.val, {
			kind: 	'port_in',
			used: 	false
		}))

		block.outputs.forEach(o => scope_block.add(o.val, {
			kind: 	'port_out',
			used: 	true
		}))

		// Create scopes

		block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(function (block) {
			analyze_block_signature(scope_block, block)
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			ass.outputs.filter(o => !o.init).forEach(function (o) {
				analyze_left_assignment(scope_block, o)
			})
		})

		block.body.filter(stmt => stmt.name == 'ANONYM_BLOCK_DEF').forEach(function (block) {
			block.outputs.filter(o => !o.init).forEach(function (o) {
				analyze_left_assignment(scope_block, o)
			})
			analyze_anonym_block_signature(block);
		})

		block.body.filter(stmt => stmt.name == 'IF_THEN_ELSE').forEach(function (ifthenelse) {
			ifthenelse.outputs.filter(o => !o.init).forEach(function (o) {
				analyze_left_assignment(scope_block, o)
			})
			analyze_anonym_block_signature(ifthenelse.if)
			analyze_anonym_block_signature(ifthenelse.else)
		})

		// Validate expr

		block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(function (block) {
			analyze_block_body(scope_block, block)
		})

		block.body.filter(stmt => stmt.name == 'ANONYM_BLOCK_DEF').forEach(function (block) {
			analyze_block_body(scope_block, block);
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			ass.outputs.filter(o => o.init).forEach(function (o) {
				analyze_left_assignment_init(scope_block, o)
			})
		})

		block.body.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(function (ass) {
			analyze_right_assignment(scope_block, ass.expr, ass.outputs.length)
		})

		block.body.filter(stmt => stmt.name == 'IF_THEN_ELSE').forEach(function (ifthenelse) {
			analyze_right_assignment(scope_block, ifthenelse.condition, 1)
			analyze_block_body(scope_block, ifthenelse.if)
			analyze_block_body(scope_block, ifthenelse.else)
		})

		for (let i in scope_block.elements) {
			let item = scope_block.elements[i]
			if (item.kind == 'port_out' && !item.assigned)
				err("Output port not assigned: " + i)
			if (!item.used)
				warn(item.kind + " " + i + " not used")
		}
	}

	function analyze_left_assignment(scope, id_node) {
		if (scope_reserved.find(id_node.val))
			err(id_node.val + " is a reserved keyword");

		let item = scope.findLocal(id_node.val)
		if (item) {
			if (item.kind == 'port_in')
				err("Input ports cannot be assigned: " + id_node.val)
			if (item.kind == 'port_out') {
				if (item.assigned)
					err("Output ports can be assigned only once: " + id_node.val)
				else
					item.assigned = true
			}
			if (item.kind == 'var' || item.kind == 'const')
				err("Variables can be assigned only once: " + id_node.val)
		}
		else
			scope.add(id_node.val, {
				kind: 	'var',
				used: 	false
			})
	}

	function analyze_left_assignment_init(scope, id_node) {
		let item = scope.findLocal(id_node.val)

		if (!item)
			err("Cannot set initial value of undefined: " + id_node.val)

		if (item.hasInit)
			err("Cannot set initial value of variables more than once: " + id_node.val)

		if (item.kind == 'port_in')
			err("Cannot set initial value of input ports: " + id_node.val)

		item.hasInit = true
	}

	function analyze_right_assignment(scope, expr_node, outputsN) {
		if (expr_node.name == 'ID') {
			let item = scope.find(expr_node.val)

			if (!item)
				err("ID not found: " + expr_node.val + ". Scope: \n" + scope)

			if (item.kind == 'var' || item.kind == 'const' || item.kind == 'port_in' || item.kind == 'port_out')
				item.used = true;
			else
				err("Unexpected identifier in expression: " + expr_node.val)
		}
		else if (expr_node.name == 'CALL_EXPR') {
			let item = scope.find(expr_node.id.val)

			if (!item) {
				warn("Using unknown external function " + expr_node.id.val)
				expr_node.kind = 'FUNC_CALL'
			}
			else {
				if (item.outputsN != outputsN)
					err(expr_node.id.val + " requires " + item.outputsN + " outputs while " + outputsN + " were provided")

				if (item.inputsN != expr_node.args.length)
					err(expr_node.id.val + " requires " + item.inputsN + " inputs while "  + expr_node.args.length + " were provided")

				if (expr_node.id.val == 'delay1')
					expr_node.kind = 'DELAY1_EXPR'
				else
					expr_node.kind = 'BLOCK_CALL'
			}
		}
		if (expr_node.args)
			expr_node.args.forEach(arg => analyze_right_assignment(scope, arg, 1))
	}

	function warn(e) {
		console.warn("***Warning*** ", e)
	}

	function err(e) {
		throw new Error("***Error*** " + e)
	}

	exports["validate"] = validate

}());
},{}],2:[function(require,module,exports){
(function (process){(function (){
/* parser generated by jison 0.4.18 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var grammar = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,3],$V1=[1,6],$V2=[1,10],$V3=[1,11],$V4=[1,8,25,39],$V5=[1,26],$V6=[1,23],$V7=[1,22],$V8=[1,25],$V9=[1,28],$Va=[1,8,25,30,31,33,34,39],$Vb=[2,35],$Vc=[1,8,15,25,26,30,31,39],$Vd=[1,33],$Ve=[1,34],$Vf=[1,8,15,25,26,30,31,33,34,39],$Vg=[2,42],$Vh=[2,41],$Vi=[1,60],$Vj=[8,18,25,39],$Vk=[1,77],$Vl=[2,12],$Vm=[16,24];
var parser = {trace: function trace () { },
yy: {},
symbols_: {"error":2,"program":3,"program_stmts0":4,"program_stmt":5,"const":6,"block_def":7,"END":8,"assignment":9,"ids_list1":10,"ASSIGN":11,"id":12,"LPAREN":13,"exprs_list0":14,"RPAREN":15,"LBRACE":16,"block_stmts1":17,"RBRACE":18,"anonym_block_def":19,"if_then_else":20,"IF":21,"expr":22,"mayend":23,"ELSE":24,"INIT":25,"COMMA":26,"block_stmt":27,"additive_expr":28,"multiplicative_expr":29,"PLUS":30,"MINUS":31,"unary_expr":32,"TIMES":33,"DIV":34,"primary_expr":35,"number":36,"SAMPLERATE":37,"fb_call":38,"ID":39,"NUMBER":40,"exprs_list1":41,"$accept":0,"$end":1},
terminals_: {2:"error",8:"END",11:"ASSIGN",13:"LPAREN",15:"RPAREN",16:"LBRACE",18:"RBRACE",21:"IF",24:"ELSE",25:"INIT",26:"COMMA",30:"PLUS",31:"MINUS",33:"TIMES",34:"DIV",37:"SAMPLERATE",39:"ID",40:"NUMBER"},
productions_: [0,[3,1],[4,2],[4,0],[5,1],[5,1],[5,1],[6,1],[7,9],[19,5],[20,16],[23,2],[23,0],[10,1],[10,2],[10,3],[17,2],[17,1],[27,2],[27,2],[27,2],[27,2],[27,1],[9,3],[22,1],[28,1],[28,3],[28,3],[29,1],[29,3],[29,3],[32,1],[32,2],[32,2],[35,1],[35,1],[35,1],[35,3],[35,1],[12,1],[36,1],[38,4],[14,0],[14,1],[41,1],[41,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 
                            this.$ = {
                                name: 'PROGRAM',
                                stmts: $$[$0]
                            }; 
                            return this.$; 
                        
break;
case 2:

                            this.$ = $$[$0-1].concat($$[$0]); 
                        
break;
case 3:

                            this.$ = [];
                        
break;
case 4: case 5: case 13: case 44:

                            this.$ = [$$[$0]]
                        
break;
case 6: case 22: case 42:

                            this.$ = []
                        
break;
case 7: case 17: case 24: case 25: case 28: case 31: case 33: case 34: case 35: case 38: case 43:

                            this.$ = $$[$0]
                        
break;
case 8:

                            this.$ = {
                                name: 'BLOCK_DEF',
                                id: $$[$0-6],
                                inputs: $$[$0-4],
                                outputs: $$[$0-8],
                                body: $$[$0-1]
                            }
                        
break;
case 9:

                            this.$ = {
                                name:    'ANONYM_BLOCK_DEF',
                                id:      {name: 'ID', val: ''},
                                inputs:  [],
                                outputs: $$[$0-4],
                                body:    $$[$0-1]
                            }
                        
break;
case 10:

                            this.$ = {
                                name:       'IF_THEN_ELSE',
                                condition:  $$[$0-11],
                                outputs:    $$[$0-15],
                                if: {
                                    name:       'ANONYM_BLOCK_DEF',
                                    id:         {name: 'ID', val: ''},
                                    inputs:     [],
                                    outputs:    $$[$0-15],
                                    body:       $$[$0-7]
                                },
                                else: {
                                    name:       'ANONYM_BLOCK_DEF',
                                    id:         {name: 'ID', val: ''},
                                    inputs:     [],
                                    outputs:    $$[$0-15],
                                    body:       $$[$0-1]
                                }
                            }
                        
break;
case 14:

                            $$[$0].init = true
                            this.$ = [$$[$0]]
                        
break;
case 15:

                            this.$ = [$$[$0-2]].concat($$[$0])
                        
break;
case 16:

                            this.$ = $$[$0-1].concat($$[$0])
                        
break;
case 18: case 19: case 20: case 21:

                            this.$ = [$$[$0-1]]
                        
break;
case 23:

                            this.$ = {
                                name: 'ASSIGNMENT',
                                expr: $$[$0],
                                outputs: $$[$0-2]
                            }
                        
break;
case 26:

                            this.$ = {
                                name: 'PLUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 27:

                            this.$ = {
                                name: 'MINUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 29:

                            this.$ = {
                                name: 'TIMES_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 30:

                            this.$ = {
                                name: 'DIV_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 32:

                            this.$ = {
                                name: 'UMINUS_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 36:

                            this.$ = {
                                name: 'SAMPLERATE',
                                val: "fs"
                            }
                        
break;
case 37:

                            this.$ = $$[$0-1]
                        
break;
case 39:
 
                            this.$ = { name: 'ID', val: yytext}; 
                        
break;
case 40:
 
                            this.$ = { name: 'NUMBER', val: parseFloat(yytext)}; 
                        
break;
case 41:

                            this.$ = {
                                name: 'CALL_EXPR',
                                id: $$[$0-3],
                                args: $$[$0-1]
                            }
                        
break;
case 45:
 
                            this.$ = [$$[$0-2]].concat($$[$0]) 
                        
break;
}
},
table: [{1:$V0,3:1,4:2,5:3,6:4,7:5,8:$V1,9:7,10:8,12:9,25:$V2,39:$V3},{1:[3]},{1:[2,1]},{1:$V0,4:12,5:3,6:4,7:5,8:$V1,9:7,10:8,12:9,25:$V2,39:$V3},o($V4,[2,4]),o($V4,[2,5]),o($V4,[2,6]),o($V4,[2,7]),{11:[1,13]},{11:[2,13],26:[1,14]},{12:15,39:$V3},o([1,8,11,13,15,25,26,30,31,33,34,39],[2,39]),{1:[2,2]},{12:16,13:$V5,22:17,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{10:29,12:9,25:$V2,39:$V3},{11:[2,14]},o($Va,$Vb,{13:[1,30]}),o($V4,[2,23]),o([1,8,15,25,26,39],[2,24],{30:[1,31],31:[1,32]}),o($Vc,[2,25],{33:$Vd,34:$Ve}),o($Vf,[2,28]),o($Vf,[2,31]),{12:36,13:$V5,35:35,36:24,37:$V8,38:27,39:$V3,40:$V9},{12:36,13:$V5,35:37,36:24,37:$V8,38:27,39:$V3,40:$V9},o($Vf,[2,34]),o($Vf,[2,36]),{12:36,13:$V5,22:38,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},o($Vf,[2,38]),o($Vf,[2,40]),{11:[2,15]},{12:36,13:$V5,14:39,15:$Vg,22:41,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9,41:40},{12:36,13:$V5,29:42,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{12:36,13:$V5,29:43,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{12:36,13:$V5,30:$V6,31:$V7,32:44,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{12:36,13:$V5,30:$V6,31:$V7,32:45,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},o($Vf,[2,32]),o($Vf,$Vb,{13:[1,46]}),o($Vf,[2,33]),{15:[1,47]},{15:[1,48]},{15:[2,43]},{15:[2,44],26:[1,49]},o($Vc,[2,26],{33:$Vd,34:$Ve}),o($Vc,[2,27],{33:$Vd,34:$Ve}),o($Vf,[2,29]),o($Vf,[2,30]),{12:36,13:$V5,14:50,15:$Vg,22:41,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9,41:40},o($Vf,[2,37]),o($Va,$Vh,{16:[1,51]}),{12:36,13:$V5,22:41,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9,41:52},{15:[1,53]},{7:57,8:$Vi,9:56,10:61,12:9,17:54,19:58,20:59,25:$V2,27:55,39:$V3},{15:[2,45]},o($Vf,$Vh),{18:[1,62]},{7:57,8:$Vi,9:56,10:61,12:9,17:63,18:[2,17],19:58,20:59,25:$V2,27:55,39:$V3},{8:[1,64]},{8:[1,65]},{8:[1,66]},{8:[1,67]},o($Vj,[2,22]),{11:[1,68]},o($V4,[2,8]),{18:[2,16]},o($Vj,[2,18]),o($Vj,[2,19]),o($Vj,[2,20]),o($Vj,[2,21]),{12:16,13:$V5,16:[1,69],21:[1,70],22:17,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{7:57,8:$Vi,9:56,10:61,12:9,17:71,19:58,20:59,25:$V2,27:55,39:$V3},{13:[1,72]},{18:[1,73]},{12:36,13:$V5,22:74,28:18,29:19,30:$V6,31:$V7,32:20,35:21,36:24,37:$V8,38:27,39:$V3,40:$V9},{8:[2,9]},{15:[1,75]},{8:$Vk,16:$Vl,23:76},{16:[1,78]},o($Vm,$Vl,{23:79,8:$Vk}),{7:57,8:$Vi,9:56,10:61,12:9,17:80,19:58,20:59,25:$V2,27:55,39:$V3},o($Vm,[2,11]),{18:[1,81]},{8:$Vk,23:82,24:$Vl},{24:[1,83]},{8:$Vk,16:$Vl,23:84},{16:[1,85]},{7:57,8:$Vi,9:56,10:61,12:9,17:86,19:58,20:59,25:$V2,27:55,39:$V3},{18:[1,87]},{8:[2,10]}],
defaultActions: {2:[2,1],12:[2,2],15:[2,14],29:[2,15],40:[2,43],52:[2,45],63:[2,16],73:[2,9],87:[2,10]},
parseError: function parseError (str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function(match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex () {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin (condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState () {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules () {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState (n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState (condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* inline comment */
break;
case 1:/* pause comment */
break;
case 2:return 11;
break;
case 3:return 16;
break;
case 4:return 18;
break;
case 5:return 40;
break;
case 6:return 37;
break;
case 7:return 21
break;
case 8:return "ELSE"
break;
case 9:return 39;
break;
case 10:return 30;
break;
case 11:return 31;
break;
case 12:return 33;
break;
case 13:return 34;
break;
case 14:return 13;
break;
case 15:return 15;
break;
case 16:return 26;
break;
case 17:return 25;
break;
case 18:return 8;
break;
case 19:return 8;
break;
case 20:/* skip whitespace */
break;
}
},
rules: [/^(?:#[^\n\r]*)/,/^(?:\.\.\.[^\n^\n]*[\n\r]+)/,/^(?:=)/,/^(?:\{)/,/^(?:\})/,/^(?:((0|[1-9][0-9]*)(\.[0-9]+)?([eE](\+|-)?[0-9]+)?))/,/^(?:fs\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:([_a-zA-Z][_a-zA-Z0-9]*))/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:\()/,/^(?:\))/,/^(?:,)/,/^(?:@)/,/^(?:[\n\r]+)/,/^(?:[;]+)/,/^(?:[ \t]+)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = grammar;
exports.Parser = grammar.Parser;
exports.parse = function () { return grammar.parse.apply(grammar, arguments); };
exports.main = function commonjsMain (args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this)}).call(this,require('_process'))
},{"_process":13,"fs":8,"path":12}],3:[function(require,module,exports){
/*
	Copyright (C) 2021, 2022 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/

(function() {

	var Graph = {
		init: function () {
			this.blocks = []
			this.connections = []
			this.input_ports = []  // external input
			this.output_ports = [] // output toward outside
		},
		getOutputBlocks: function (block) {
			return this.connections.filter(c => c.in.block == block).map(c => c.out.block)
		},
		getInputBlocks: function (block) {
			return this.connections.filter(c => c.out.block == block).map(c => c.in.block)
		},
		crossDFS: function (callbackF) {
			let self = this
			this.output_ports.forEach(p => visitNode(p.block))
			function visitNode(block) {
				if (block.visited)
					return
				block.visited = true
				
				self.getInputBlocks(block).forEach(b => visitNode(b))
				callbackF(block)
			}
			this.blocks.forEach(b => delete b.visited)
		}
	}

	var Block = {
		init: function (nInputs = 0, nOutputs = 0, operation = "", id = "", postfix = "", val = NaN, if_owner = null) {
			let self = this
			this.input_ports = new Array(nInputs).fill().map(function () { 
				let port = Object.create(Port)
				port.block = self
				return port
			})
			this.output_ports = new Array(nOutputs).fill().map(function () { 
				let port = Object.create(Port)
				port.block = self
				return port
			})
			this.operation = operation
			this.id = id
			this.postfix = postfix
			this.val = val
			this.control_dependencies = new Set()
			this.if_owner = if_owner // most local if the block belongs to
			this.if_subgraph = new Set() // set of if_blocks 
			if (if_owner)
				this.if_subgraph.add(if_owner)
		},
		get label() {
			return "" + this.id + this.postfix
		},
		getUpdateRateMax: function () {
			return this.input_ports.concat(this.output_ports).map(p=>p.update_rate).reduce(function
				(p1, p2) { return  p1 > p2 ? p1 : p2})
		},
		propagateUpdateRate: function () {
			let update_rate_max = this.getUpdateRateMax()
			this.output_ports.forEach((p => p.update_rate = update_rate_max))
		},
		toString: function () {
			return '{ ' + [this.operation, this.id, this.postfix, this.val, this.input_ports.length, this.output_ports.length, this.control_dependencies.size].join(', ') + ' }'
		}
	}

	var Port = {
		block: null,
		update_rate: -1 // 0 = constants, 1 = fs, 2 = control, 3 = audio
	}

	var Connection = {
		in: null,
		out: null
	}

	function ASTToGraph (AST_root, initial_block, control_inputs, initial_values) {

		let graph = convertToGraph()
		let graph_init = convertToGraph()
		distinguishGraphs(graph, graph_init)

		graph = removeUnreachableNodes(graph)
		graph_init = removeUnreachableNodes(graph_init)

		setStartingUpdateRates(graph)
		setStartingUpdateRatesInit(graph_init)

		propagateUpdateRate(graph)
		propagateUpdateRateInit(graph_init)

		discoverAtomicIfGraphs(graph)
		discoverAtomicIfGraphs(graph_init)

		optimize(graph)
		optimize(graph_init)

		return [graph, graph_init]



		function convertToGraph() {
			let graph = Object.create(Graph)
			graph.init()
			graph.id = initial_block

			let named_blocks = {}
			let named_vars 	= {}
			let expansions_count = 0

			AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(block => named_blocks[block.id.val] = block)

			if (!named_blocks[initial_block])
				throw new Error("Undefined initial block: " + initial_block + ". Available blocks: " + Object.keys(named_blocks))

			let postfix = '_0'

			let block_fs = Object.create(Block)
			block_fs.init(0, 1, "SAMPLERATE", "fs", postfix, NaN, undefined)
			named_vars[block_fs.id] = block_fs
			graph.blocks.push(block_fs)

			AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(stmt => stmt.outputs.forEach(function (output) {
				let block_const = Object.create(Block)
				block_const.init(1, 1, 'VAR', output.val, postfix, NaN, undefined)
				named_vars[block_const.id] = block_const
				graph.blocks.push(block_const)
			}))

			AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(stmt => {
				let ports = convertExpr(stmt.expr, {}, named_blocks, named_vars, null /*if_owner*/)
				stmt.outputs.forEach((output, index) => {
					let block_const = named_vars[output.val]
					let connection = Object.create(Connection)
					connection.in = ports[1][index]
					connection.out = block_const.input_ports[0]
					graph.connections.push(connection)
				})
			})

			let ports = expandCompositeBlock(named_blocks[initial_block], ++expansions_count, {}, {...named_blocks}, {...named_vars}, undefined)
			graph.input_ports = ports[0]
			graph.output_ports = ports[1]

			return graph

			function expandCompositeBlock (block, expansions_count, expansion_stack, named_blocks, named_vars, if_owner) {
				if (block.id.val != "" && expansion_stack[block.id.val])
					throw new Error("Recursive block expansion. Stack: " + Object.keys(expansion_stack) + "," + block.id.val)
				expansion_stack[block.id.val] = true

				let prefix  = '_' + block.id.val + '_'
				let postfix = expansions_count == 1 ? "" : '_' + expansions_count

				let input_ports = []
				let output_ports = []

				block.inputs.forEach(function (input) {
					let block_var = Object.create(Block)
					block_var.init(1, 1, "VAR", input.val, postfix, NaN, if_owner)
					named_vars[block_var.id] = block_var
					graph.blocks.push(block_var)
					input_ports.push(block_var.input_ports[0])
				})

				block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(block => named_blocks[block.id.val] = block)

				block.body.filter(stmt => stmt.name == 'ASSIGNMENT' || stmt.name == 'ANONYM_BLOCK_DEF' || stmt.name == 'IF_THEN_ELSE').forEach(
					stmt => stmt.outputs.filter(output => !output.init).forEach(output => {
						let block_var = Object.create(Block)
						block_var.init(1, 1, "VAR", output.val, postfix, NaN, if_owner)
						named_vars[block_var.id] = block_var
						graph.blocks.push(block_var)
					})
				)

				block.outputs.forEach(o => {
					output_ports.push(named_vars[o.val].output_ports[0])
				})

				block.body.filter(stmt => stmt.name == 'ASSIGNMENT' || stmt.name == 'ANONYM_BLOCK_DEF' || stmt.name == 'IF_THEN_ELSE').forEach(function (stmt) {
					let ports;
					if (stmt.name == 'ASSIGNMENT')
						ports = convertExpr(stmt.expr, {...expansion_stack}, {...named_blocks}, {...named_vars}, if_owner)
					else if (stmt.name == 'ANONYM_BLOCK_DEF')
						ports = expandCompositeBlock(stmt, ++expansions_count, {...expansion_stack}, {...named_blocks}, {...named_vars}, if_owner)
					else if (stmt.name == 'IF_THEN_ELSE')
						ports = convertIfthenelse(stmt, expansions_count, expansion_stack, named_blocks, named_vars, if_owner)

					stmt.outputs.forEach(function (output, index) {
						if (!output.init) {
							let block_var = named_vars[output.val]
							let connection = Object.create(Connection)
							connection.in  = ports[1][index]
							connection.out = block_var.input_ports[0]
							graph.connections.push(connection)
						}
					})
					stmt.outputs.forEach(function(output, index) {
						if (output.init) {
							named_vars[output.val].block_init = ports[1][index].block
						}
					})
				})				

				return [input_ports, output_ports]
			}

			function convertExpr(expr_node, expansion_stack, named_blocks, named_vars, if_owner) {
				let block_expr = Object.create(Block)

				let input_ports = []
				let output_ports = []
				
				switch (expr_node.name) {
					case 'MINUS_EXPR':
					case 'PLUS_EXPR':
					case 'TIMES_EXPR':
					case 'DIV_EXPR':
					case 'UMINUS_EXPR':
						block_expr.init(expr_node.args.length, 1, expr_node.name, null, null, null, if_owner)
						graph.blocks.push(block_expr)
						input_ports = block_expr.input_ports
						output_ports = block_expr.output_ports
						break
					case 'NUMBER':
						block_expr.init(0, 1, expr_node.name, null, null, expr_node.val, if_owner)
						graph.blocks.push(block_expr)
						input_ports = block_expr.input_ports
						output_ports = block_expr.output_ports
						break
					case 'SAMPLERATE':
					case 'ID':
						let block_var = named_vars[expr_node.val]
						output_ports = block_var.output_ports
						break
					case 'CALL_EXPR':
						switch (expr_node.kind) {
							case 'DELAY1_EXPR':
								block_expr.init(1, 1, 'DELAY1_EXPR', null, null, NaN, if_owner)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'FUNC_CALL':
								block_expr.init(expr_node.args.length, 1, 'EXTERNAL_FUNC_CALL', expr_node.id.val, null, NaN, if_owner)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'BLOCK_CALL':
								let ports = expandCompositeBlock(named_blocks[expr_node.id.val], ++expansions_count, 
									{...expansion_stack}, {...named_blocks}, {...named_vars}, if_owner)
								input_ports = ports[0]
								output_ports = ports[1]
								break
							default:
								throw new Error("Unexpected BLOCK_CALL kind: " + expr_node.kind)
						}
						break
					default:
						throw new Error("Unexpected AST node: " + expr_node.name)

				}

				for (let argi = 0; argi < input_ports.length; argi++) {
					let ports = convertExpr(expr_node.args[argi], expansion_stack, named_blocks, named_vars, if_owner)
					let connection = Object.create(Connection)
					connection.in = ports[1][0]
					connection.out = input_ports[argi]
					graph.connections.push(connection)
				}

				return [input_ports, output_ports]
			}

			function convertIfthenelse(stmt, expansions_count, expansion_stack, named_blocks, named_vars, if_owner) {
				block_ifthenelse = Object.create(Block)
				block_ifthenelse.init(stmt.outputs.length * 2 + 1, stmt.outputs.length, 'IF_THEN_ELSE', null, null, NaN, if_owner)

				let condition_ports = convertExpr(stmt.condition, expansion_stack, named_blocks, named_vars, if_owner)
				let if_ports = expandCompositeBlock(stmt.if, ++expansions_count, {...expansion_stack}, {...named_blocks}, {...named_vars}, 
					{ ifblock: block_ifthenelse, branch: 0 })
				let else_ports = expandCompositeBlock(stmt.else, ++expansions_count, {...expansion_stack}, {...named_blocks}, {...named_vars},
					{ ifblock: block_ifthenelse, branch: 1 })

				let incoming_ports = condition_ports[1].concat(if_ports[1]).concat(else_ports[1])
				for (let p = 0; p < incoming_ports.length; p++) {
					let connection = Object.create(Connection)
					connection.in = incoming_ports[p]
					connection.out = block_ifthenelse.input_ports[p]
					graph.connections.push(connection)
				}

				return [[], block_ifthenelse.output_ports]
			}
		}

		function distinguishGraphs(graph, graph_init) {
			// Adjusts the graph_init and connect the graph nodes to the graph_init init nodes
			graph_init.output_ports = []
			for (let bi = 0; bi < graph_init.blocks.length; bi++) {
				let block_init = graph_init.blocks[bi].block_init
				if (block_init) {
					block_init.output_ports = graph_init.blocks[bi].output_ports
					block_init.output_ports.forEach(p => p.block = block_init)
					graph_init.blocks[bi].output_ports = []
				}
			}
			graph_init.blocks.forEach(function (block, blocki) {
				if (block.operation == 'DELAY1_EXPR') {
					let input_block = graph_init.getInputBlocks(block)[0]
					graph_init.output_ports = graph_init.output_ports.concat(input_block.output_ports)
					graph.getInputBlocks(graph.blocks[blocki])[0].block_init = input_block
				}
			})

			graph_init.blocks.filter(b => b.operation == 'VAR').forEach(b => b.postfix = b.postfix + "_I")

			graph_init.input_ports.map(p => p.block).forEach(function (block, blocki) {
				block.operation = 'NUMBER'
				block.input_ports = []
				if (initial_values[block.id])
					block.val = initial_values[block.id]
				else
					block.val = 0
				graph.input_ports[blocki].block.block_init = block
				graph_init.output_ports.push(block.output_ports[0])
			})
		}
		
		function removeUnreachableNodes (graph) {
			let newGraph = Object.create(Graph)
			newGraph.init()
			newGraph.id = graph.id
			newGraph.input_ports = graph.input_ports
			newGraph.output_ports = graph.output_ports
			graph.crossDFS(block => newGraph.blocks.push(block))
			newGraph.connections = graph.connections.filter(c => newGraph.blocks.some(b => b == c.out.block))
			newGraph.connections = Array.from(new Set(newGraph.connections))
			return newGraph
		}

		function setStartingUpdateRates (graph) {
			graph.input_ports.map(p => p.block).forEach(function (block) {
				if (control_inputs.some(ctr => ctr == block.id))
					block.input_ports.forEach(p => p.update_rate = 2)
				else
					block.input_ports.forEach(p => p.update_rate = 3)
			})
			graph.blocks.filter(block => block.operation == 'NUMBER').forEach(
				block => block.output_ports[0].update_rate = 0)
			graph.blocks.filter(block => block.operation == 'SAMPLERATE').forEach(
				block => block.output_ports[0].update_rate = 1)
			graph.blocks.filter(block => block.operation == 'DELAY1_EXPR').forEach(
				block => block.output_ports[0].update_rate = 3)
		}

		function setStartingUpdateRatesInit (graph_init) {
			graph_init.blocks.filter(block => block.operation == 'NUMBER').forEach(
				block => block.output_ports[0].update_rate = 0)
			graph_init.blocks.filter(block => block.operation == 'SAMPLERATE').forEach(
				block => block.output_ports[0].update_rate = 1)
		}

		function propagateUpdateRate (graph) {
			let blocks_delay = []
			graph.output_ports.forEach(p => visitNode(p.block))
			for (let b of blocks_delay) 
				visitNode(b)

			function visitNode(block) {
				if (block.visited)
					return
				block.visited = true

				let input_blocks = graph.getInputBlocks(block)

				if (block.operation == 'DELAY1_EXPR') {
					blocks_delay.push(input_blocks[0])
				}
				else {
					input_blocks.forEach(b => visitNode(b))
					block.propagateUpdateRate()
				}
				graph.connections.filter(c => c.in.block == block).forEach(
					c => c.out.update_rate = block.output_ports[0].update_rate)
			}

			graph.blocks.forEach(b => delete b.visited)
		}

		function propagateUpdateRateInit (graph_init) {
			graph_init.crossDFS(function (block) {
				block.propagateUpdateRate()
				graph_init.connections.filter(c => c.in.block == block).forEach(
					c => c.out.update_rate = block.output_ports[0].update_rate)
			})
		}
/*
		function propagateIfDependencies (graph) {
			graph.blocks.filter(b => b.operation == 'IF_THEN_ELSE').forEach(function (ifthenelse) {
				graph.getOutputBlocks(ifthenelse).forEach(function (block) {
					visitBlock(block, ifthenelse)
				})
			})
			function visitBlock (block, ifthenelse) {
				if (block.visited)
					return
				block.visited = true
				block.if_dependencies.add(ifthenelse)
				graph.getOutputBlocks(block).forEach(b => visitBlock(b, ifthenelse))
			}
			graph.blocks.forEach(b => delete b.visited)
		}
*/
		function discoverAtomicIfGraphs (graph) {
			graph.blocks.filter(b => b.operation == 'IF_THEN_ELSE').forEach(function (ifthenelse) {
				graph.getOutputBlocks(ifthenelse).forEach(function (block) {
					visitBlock(block, ifthenelse)
				})
			})
			function visitBlock (block, ifthenelse) {
				if (block.visited)
					return
				block.visited = true
				block.if_subgraph.add(ifthenelse)
				graph.getOutputBlocks(block).forEach(b => visitBlock(b, ifthenelse))
			}
			graph.blocks.forEach(b => delete b.visited)
		}

		function optimize(graph) {
			removeUselessVariables()
			labelToBeCachedBlocks()
			propagateControlDependencies()

			function removeUselessVariables () {
			}

			function labelToBeCachedBlocks () {
				graph.blocks.forEach (function (block) {
					let input_blocks = graph.getInputBlocks(block)
					input_blocks.forEach(function (iblock) {
						if (iblock.output_ports[0].update_rate < block.output_ports[0].update_rate)
							iblock.output_ports[0].toBeCached = true
					})
				})
			}

			function propagateControlDependencies () {
				graph.input_ports.filter(p => p.update_rate == 2).forEach(function (p) {
					visitBlock(p.block, p.block.label)
					graph.blocks.forEach(b => delete b.visited)
				})

				function visitBlock (block, control_dep) {
					if (block.visited)
						return
					block.visited = true
					block.control_dependencies.add(control_dep)
					graph.getOutputBlocks(block).forEach(b => visitBlock(b, control_dep))
				}
			}
		}
		
	}

	exports["ASTToGraph"] = ASTToGraph

}());
},{}],4:[function(require,module,exports){
/*
	Copyright (C) 2021, 2022 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/

(function() {

	function convert(doT, templates, target_lang, graph, graph_init, schedule, schedule_init) {
		
		let program = {
			class_name: 	graph.id,
			control_inputs: graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block.label),
			audio_inputs: 	graph.input_ports.filter(p => p.update_rate == 3).map(p => p.block.label),
			outputs: 		[],

			declarations1: 	[],
			declarations2:  [],

			reset1: 		[],
			reset2: 		[],

			constant_rate: 	[],
			sampling_rate: 	[],
			controls_rate: 	[],
			audio_rate: 	[],

			delay_updates: 	[],
			output_updates: []
		}

		let extra_vars_n = 0

		graph.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = new MagicString()))
		graph_init.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = new MagicString()))


		graph.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')
		graph.output_ports.forEach(op => op.block.operation = "VAR_OUT")
		graph_init.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')

		const id_prefix = target_lang == 'js' ? "this." : "";

		schedule.forEach(block => convertBlock(block))
		schedule_init.forEach(block => convertBlockInit(block))

		for (let outi = 0; outi < graph.output_ports.length; outi++) {
			program.outputs[outi] = graph.output_ports[outi].block.label + '__out__'
			appendAssignment(program.outputs[outi], graph.output_ports[outi].code, 5, null)
		}

		groupControls()

		program.declarations2 = program.declarations2.concat(
			graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block).map(function (block) {
				return { left: block.output_ports[0].code, right: block.block_init.output_ports[0].code }
			})
		)

		doT.templateSettings.strip = false
		if (target_lang == 'cpp') {
			return [
				{ name: "vst2_" + graph.id + ".h", str: doT.template(templates["vst2_main_h"])(program) },
				{ name: "vst2_" + graph.id + ".cpp", str: doT.template(templates["vst2_main_cpp"])(program) },
				{ name: "vst2_effect.h", str: doT.template(templates["vst2_effect_h"])(program) },
				{ name: "vst2_effect.cpp", str: doT.template(templates["vst2_effect_cpp"])(program) }
			]
		}
		else if (target_lang == 'MATLAB') {
			return [
				{ name: graph.id + '.m', str: doT.template(templates["matlab"])(program) }
			]
		}
		else if (target_lang == "js") {
			return [
				{ name: "main.html", str: doT.template(templates["js_html"])(program) },
				{ name: "processor.js", str: doT.template(templates["js_processor"])(program) }
			]
		}

		function convertBlock(block) {
			const input_blocks = graph.getInputBlocks(block)
			const output_blocks = graph.getOutputBlocks(block)

			const input_blocks_code = input_blocks.map(b => b.output_ports[0].code)
			const update_rate = block.output_ports[0].update_rate
			const code = block.output_ports[0].code

			const auxcode = new MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			switch (block.operation) {
				case 'VAR':
					if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label)
						appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 3) {
						if (target_lang == 'cpp' || target_lang == 'js')
							code.add(block.label, "[i]")
						else if (target_lang == 'MATLAB')
							code.add(block.label, "(i)")
					}
					else if (update_rate == 2)
						code.add(id_prefix, block.label)
					return
				case 'VAR_OUT':
					code.add(id_prefix, block.label)
					appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally)
					return
				case 'DELAY1_EXPR':
					const id = '__delayed__' + extra_vars_n++
					code.add(id_prefix, id)
					appendAssignment(code, input_blocks_code[0], 4, block.control_dependencies, false, null)
					appendAssignment(code, input_blocks[0].block_init.output_ports[0].code, -1, null, true, false)
					return
				case 'NUMBER':
					if (target_lang == 'cpp')
						code.add(block.val + ((block.val.toString().includes('.') || block.val.toString().toLowerCase().includes('e')) ? 'f' : '.f'));
					else if (target_lang == 'MATLAB' || target_lang == 'js')
						code.add(block.val)
					return
				case 'SAMPLERATE':
					code.add(id_prefix, 'fs')
					return
				case 'UMINUS_EXPR':
					auxcode.add('-(', input_blocks_code[0], ')')
					break
				case 'PLUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' + ', input_blocks_code[1], ')')
					break
				case 'MINUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' - ', input_blocks_code[1], ')')
					break
				case 'TIMES_EXPR':
					auxcode.add('(', input_blocks_code[0], ' * ', input_blocks_code[1], ')')
					break
				case 'DIV_EXPR':
					auxcode.add('(', input_blocks_code[0], ' / ', input_blocks_code[1], ')')
					break
				case 'EXTERNAL_FUNC_CALL':
					auxcode.add(block.id, '(', input_blocks_code.join(', '), ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '__extra__' + extra_vars_n++)
				appendAssignment(code, auxcode, update_rate, block.control_dependencies, true, is_used_locally)
			}
			else
				code.add(auxcode)
		}

		function convertBlockInit(block) {
			const input_blocks = graph_init.getInputBlocks(block)
			const output_blocks = graph_init.getOutputBlocks(block)
			const input_blocks_code = input_blocks.map(b => b.output_ports[0].code)
			const update_rate = block.output_ports[0].update_rate
			const level = update_rate == 2 ? -2 : update_rate
			const code = block.output_ports[0].code

			const auxcode = new MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			switch (block.operation) {
				case 'VAR':
					if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label)
						appendAssignment(code, input_blocks_code[0], level, block.control_dependencies, true, is_used_locally)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 0)
						code.add(block.val)
					else
						throw new Error("Unexpected update_rate in init graph " + block + ": " + update_rate)
					return
				case 'DELAY1_EXPR':
					code.add(input_blocks_code[0])
					return
				case 'NUMBER':
					if (target_lang == 'cpp')
						code.add(block.val + ((block.val.toString().includes('.') || block.val.toString().toLowerCase().includes('e')) ? 'f' : '.f'));
					else if (target_lang == 'MATLAB' || target_lang == 'js')
						code.add(block.val)
					return
				case 'SAMPLERATE':
					code.add(id_prefix, 'fs')
					return
				case 'UMINUS_EXPR':
					auxcode.add('-(', input_blocks_code[0], ')')
					break
				case 'PLUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' + ', input_blocks_code[1], ')')
					break
				case 'MINUS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' - ', input_blocks_code[1], ')')
					break
				case 'TIMES_EXPR':
					auxcode.add('(', input_blocks_code[0], ' * ', input_blocks_code[1], ')')
					break
				case 'DIV_EXPR':
					auxcode.add('(', input_blocks_code[0], ' / ', input_blocks_code[1], ')')
					break
				case 'EXTERNAL_FUNC_CALL':
					auxcode.add(block.id, '(', input_blocks_code.join(', '), ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '__extraI__' + extra_vars_n++)
				appendAssignment(code, auxcode, level, block.control_dependencies, true, is_used_locally)
			}
			else
				code.add(auxcode)
		}

		function appendAssignment(left, right, level, control_dependencies, to_be_declared, is_used_locally) {
			let stmt = {left: left, right: right}

			if (to_be_declared && level != 0) {
				if (is_used_locally) 
					stmt.is_used_locally = true
				else
					program.declarations1.push(stmt)
			}

			switch (level) {
				case -2:
					program.reset1.push(stmt)
					break
				case -1:
					program.reset2.push(stmt)
					break
				case 0:
					program.constant_rate.push(stmt)
					break
				case 1:
					program.sampling_rate.push(stmt)
					break
				case 2:
					stmt.control_dependencies = control_dependencies
					program.controls_rate.push(stmt)
					break
				case 3:
					program.audio_rate.push(stmt)
					break
				case 4:
					program.delay_updates.push(stmt)
					break
				case 5:
					program.output_updates.push(stmt)
					break
			}
		}

		function groupControls() {
			var Group = function (set) {
				this.label = Array.from(set).join('_')
				this.set = set
				this.cardinality = set.size
				this.equals = (s) => checkSetEquality(this.set, s)
				this.stmts = []
			}
			let groups = []
			program.controls_rate.forEach(function (stmt) {
				let group = groups.find(g => g.equals(stmt.control_dependencies))
				if (group == undefined) {
					group = new Group(stmt.control_dependencies)
					groups.push(group)
				}
				group.stmts.push(stmt)
			})

			groups.sort((A, B) => A.cardinality < B.cardinality ? -1 : A.cardinality == B.cardinality ? 0 : 1 )

			program.controls_rate = groups
		}
	}

	function MagicString(...init) {
		this.s = []
		this.add = function(...x) {
			for (let k of x)
				this.s.push(k);
			return this
		}
		this.toString = function(){
			let str = ''
			for (let p of this.s)
				str += p.toString()
			return str
		}
		for (i of init)
			this.add(i)	
	}

	function checkSetsInclusion(A, B) { // if A is included in B
		return Array.from(A).every(Av => Array.from(B).some(Bv => Av == Bv))
	}
	function checkSetEquality(A, B) {
		return checkSetsInclusion(A, B) && checkSetsInclusion(B, A)
	}


	exports["convert"] = convert;

}())
},{}],5:[function(require,module,exports){
/*
	Copyright (C) 2021, 2022 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/

(function() {

	function schedule (graph) {
		let scheduled_nodes = []

		let roots = [].concat(graph.output_ports.map(p => p.block))
		roots = roots.concat(graph.blocks.filter(b => b.operation == 'DELAY1_EXPR'))
		let stack = []

		roots.forEach(b => schedule_block(b))

		graph.blocks.forEach(b => delete b.visited)

		return scheduled_nodes

		function schedule_block(block) {
			if (stack.some(b => block == b))
				throw new Error("Found loop in scheduling at block: " + block + ". Stack: \n" + stack.join('\n'))

			if (block.visited)
				return
			block.visited = true

			stack.push(block)

			graph.getInputBlocks(block).forEach(function (b) {
				if (b.operation != 'DELAY1_EXPR')
					schedule_block(b)
			})
			scheduled_nodes.push(block)
			stack.pop()
		}
	}

	function scheduleInit (graph) {
		let scheduled_nodes = []

		let roots = [].concat(graph.output_ports.map(p => p.block))
		let stack = []

		roots.forEach(b => schedule_block(b))

		graph.blocks.forEach(b => delete b.visited)

		return scheduled_nodes

		function schedule_block(block) {
			if (stack.some(b => block == b))
				throw new Error("Found loop in tnit scheduling at block: " + block + ". Stack: \n" + stack.join('\n'))

			if (block.visited)
				return
			block.visited = true

			stack.push(block)

			graph.getInputBlocks(block).forEach(function (b) {
				schedule_block(b)
			})
			scheduled_nodes.push(block)
			stack.pop()
		}
	}


	exports["schedule"] = schedule
	exports["scheduleInit"] = scheduleInit

}())
},{}],6:[function(require,module,exports){
(function (Buffer){(function (){
/*
	Copyright (C) 2021, 2022 Orastron Srl

	Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
	hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
	INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE 
	FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
	ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

	Author: Paolo Marrone
*/

(function() {

	function compile(env, debug, code, initial_block, control_inputs, initial_values, target_lang) {
		if (!env) {
			
			const path = require('path')

			env = {
				"parser": 			require("./grammar"),
				"extended_syntax": 	require("./extended_syntax"),
				"graph": 			require("./graph"),
				"scheduler": 		require("./scheduler"),
				"output_generation":require("./output_generation"),
				"doT": 				require("dot"),
				"templates":{
					"matlab": 			String(Buffer("ZnVuY3Rpb24gW3t7PWl0Lm91dHB1dHMuam9pbignLCAnKX19XSA9IHt7PWl0LmNsYXNzX25hbWV9fSh7ez1pdC5hdWRpb19pbnB1dHMuam9pbignLCAnKX19e3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSx7ez99fSBmc3t7P2l0LmNvbnRyb2xfaW5wdXRzLmxlbmd0aCA+IDB9fSx7ez99fSB7ez1pdC5jb250cm9sX2lucHV0cy5qb2luKCcsICcpfX0pCgogICUgY29uc3RhbnRzCgogIHt7fml0LmNvbnN0YW50X3JhdGU6Y319e3s9Yy5sZWZ0fX0gPSB7ez1jLnJpZ2h0fX07CiAge3t+fX0KCgogICUgZnMKCiAge3t+aXQuc2FtcGxpbmdfcmF0ZTpzfX17ez1zLmxlZnR9fSA9IHt7PXMucmlnaHR9fTsKICB7e359fQoKCiAgJSBjb250cm9sbGkvY29lZmZpY2llbnRpCgogIHt7fml0LmNvbnRyb2xzX3JhdGU6Y319IAogICUge3s9Yy5sYWJlbH19CiAge3t+Yy5zdG10czogc319CiAge3s9cy5sZWZ0fX0gPSB7ez1zLnJpZ2h0fX07e3t+fX0KICB7e359fQogIAoKICAKICAlIGluaXQgZGVsYXkKCiAge3t+aXQucmVzZXQxOnJ9fXt7PXIubGVmdH19ID0ge3s9ci5yaWdodH19OwogIHt7fn19CiAge3t+aXQucmVzZXQyOnJ9fXt7PXIubGVmdH19ID0ge3s9ci5yaWdodH19OwogIHt7fn19CiAgCiAgCiAgZm9yIGkgPSAxOmxlbmd0aCh7ez1pdC5hdWRpb19pbnB1dHNbMF19fSkKCiAgICAlIGF1ZGlvIHJhdGUKCiAgICB7e35pdC5hdWRpb19yYXRlOiBhfX0KICAgIHt7PWEubGVmdH19ID0ge3s9YS5yaWdodH19O3t7fn19CgogICAgJSBkZWxheSB1cGRhdGVzCiAgICAKICAgIHt7fml0LmRlbGF5X3VwZGF0ZXM6dX19e3s9dS5sZWZ0fX0gPSB7ez11LnJpZ2h0fX07CiAgICB7e359fQoKICAgICUgb3V0cHV0CgogICAge3t+aXQub3V0cHV0X3VwZGF0ZXM6dX19CiAgICB7ez11LmxlZnR9fShpKSA9IHt7PXUucmlnaHR9fTt7e359fQogICAgCiAgZW5kZm9yCgplbmRmdW5jdGlvbgo=","base64")),
					"vst2_main_h": 		String(Buffer("Y2xhc3Mge3s9aXQuY2xhc3NfbmFtZX19CnsKcHVibGljOgoJdm9pZCBzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpOwoJdm9pZCByZXNldCgpOwoJdm9pZCBwcm9jZXNzKHt7PWl0LmF1ZGlvX2lucHV0cy5jb25jYXQoaXQub3V0cHV0cykubWFwKHggPT4gJ2Zsb2F0IConICsgeCkuam9pbignLCAnKX19LCBpbnQgblNhbXBsZXMpOwp7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWZsb2F0IGdldHt7PWN9fSgpOwoJdm9pZCBzZXR7ez1jfX0oZmxvYXQgdmFsdWUpO3t7fn19Cgpwcml2YXRlOgoKCXt7fml0LmRlY2xhcmF0aW9uczE6ZH19CglmbG9hdCB7ez1kLmxlZnR9fTt7e359fQoJCgl7e35pdC5kZWNsYXJhdGlvbnMyOmR9fQoJZmxvYXQge3s9ZC5sZWZ0fX0gPSB7ez1kLnJpZ2h0fX07e3t+fX0KCgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWZsb2F0IHt7PWN9fV96MTsKCWNoYXIge3s9Y319X0NIQU5HRUQ7Cgl7e359fQoKCWZsb2F0IGZzOwoJY2hhciBmaXJzdFJ1bjsKCn07Cg==","base64")),
					"vst2_main_cpp": 	String(Buffer("I2luY2x1ZGUgInZzdDJfe3s9aXQuY2xhc3NfbmFtZX19LmgiCgoKe3t+aXQuY29uc3RhbnRfcmF0ZTpjfX1zdGF0aWMgY29uc3QgZmxvYXQge3s9Yy5sZWZ0fX0gPSB7ez1jLnJpZ2h0fX07Cnt7fn19Cgp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fTo6cmVzZXQoKQp7CglmaXJzdFJ1biA9IDE7Cn0KCnZvaWQge3s9aXQuY2xhc3NfbmFtZX19OjpzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpCnsKCWZzID0gc2FtcGxlUmF0ZTsKCXt7fml0LnNhbXBsaW5nX3JhdGU6c319e3s/cy5pc191c2VkX2xvY2FsbHl9fXN0YXRpYyBjb25zdCBmbG9hdCB7ez99fXt7PXMubGVmdH19ID0ge3s9cy5yaWdodH19OwoJe3t+fX0KfQoKdm9pZCB7ez1pdC5jbGFzc19uYW1lfX06OnByb2Nlc3Moe3s9aXQuYXVkaW9faW5wdXRzLmNvbmNhdChpdC5vdXRwdXRzKS5tYXAoeCA9PiAnZmxvYXQgKicgKyB4KS5qb2luKCcsICcpfX0sIGludCBuU2FtcGxlcykKewoJaWYgKGZpcnN0UnVuKSB7e3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJe3s9Y319X0NIQU5HRUQgPSAxO3t7fn19Cgl9CgllbHNlIHt7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQl7ez1jfX1fQ0hBTkdFRCA9IHt7PWN9fSAhPSB7ez1jfX1fejE7e3t+fX0KCX0KCXt7fml0LmNvbnRyb2xzX3JhdGU6Y319CglpZiAoe3s9QXJyYXkuZnJvbShjLnNldCkubWFwKGUgPT4gZSArICJfQ0hBTkdFRCIpLmpvaW4oJyB8ICcpfX0pIHt7e35jLnN0bXRzOiBzfX0KCQl7ez9zLmlzX3VzZWRfbG9jYWxseX19c3RhdGljIGNvbnN0IGZsb2F0IHt7P319e3s9cy5sZWZ0fX0gPSB7ez1zLnJpZ2h0fX07e3t+fX0KCX17e359fQoJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319Cgl7ez1jfX1fQ0hBTkdFRCA9IDA7e3t+fX0KCglpZiAoZmlyc3RSdW4pIHt7e35pdC5yZXNldDE6cn19CgkJe3s/ci5pc191c2VkX2xvY2FsbHl9fXN0YXRpYyBjb25zdCBmbG9hdCB7ez99fXt7PXIubGVmdH19ID0ge3s9ci5yaWdodH19O3t7fn19CgkJe3t+aXQucmVzZXQyOnJ9fQoJCXt7P3IuaXNfdXNlZF9sb2NhbGx5fX1zdGF0aWMgY29uc3QgZmxvYXQge3s/fX17ez1yLmxlZnR9fSA9IHt7PXIucmlnaHR9fTt7e359fQoJfQoKCWZvciAoaW50IGkgPSAwOyBpIDwgblNhbXBsZXM7IGkrKykgewoJCXt7fml0LmF1ZGlvX3JhdGU6IGF9fQoJCXt7P2EuaXNfdXNlZF9sb2NhbGx5fX1jb25zdCBmbG9hdCB7ez99fXt7PWEubGVmdH19ID0ge3s9YS5yaWdodH19O3t7fn19CgkJCgkJe3t+aXQuZGVsYXlfdXBkYXRlczp1fX17ez11LmxlZnR9fSA9IHt7PXUucmlnaHR9fTsKCQl7e359fQoJCXt7fml0Lm91dHB1dF91cGRhdGVzOnV9fQoJCXt7PXUubGVmdH19W2ldID0ge3s9dS5yaWdodH19O3t7fn19Cgl9CgoJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319Cgl7ez1jfX1fejEgPSB7ez1jfX07e3t+fX0KCWZpcnN0UnVuID0gMDsKfQoKe3t+aXQuY29udHJvbF9pbnB1dHM6IGN9fQpmbG9hdCB7ez1pdC5jbGFzc19uYW1lfX06OmdldHt7PWN9fSgpIHsKCXJldHVybiB7ez1jfX07Cn0Kdm9pZCB7ez1pdC5jbGFzc19uYW1lfX06OnNldHt7PWN9fShmbG9hdCB2YWx1ZSkgewoJe3s9Y319ID0gdmFsdWU7Cn0Ke3t+fX0=","base64")),
					"vst2_effect_h": 	String(Buffer("I2lmbmRlZiBfRUZGRUNUX0gKI2RlZmluZSBfRUZGRUNUX0gKCiNpbmNsdWRlICJhdWRpb2VmZmVjdHguaCIKI2luY2x1ZGUgInZzdDJfe3s9aXQuY2xhc3NfbmFtZX19LmgiCgpjbGFzcyBFZmZlY3QgOiBwdWJsaWMgQXVkaW9FZmZlY3RYCnsKcHVibGljOgoJRWZmZWN0KGF1ZGlvTWFzdGVyQ2FsbGJhY2sgYXVkaW9NYXN0ZXIpOwoJfkVmZmVjdCgpOwoKCXZpcnR1YWwgdm9pZCBzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpOwoJdmlydHVhbCB2b2lkIHByb2Nlc3MoZmxvYXQgKippbnB1dHMsIGZsb2F0ICoqb3V0cHV0cywgVnN0SW50MzIgc2FtcGxlRnJhbWVzKTsKCXZpcnR1YWwgdm9pZCBwcm9jZXNzUmVwbGFjaW5nKGZsb2F0ICoqaW5wdXRzLCBmbG9hdCAqKm91dHB1dHMsIFZzdEludDMyIHNhbXBsZUZyYW1lcyk7Cgl2aXJ0dWFsIHZvaWQgc2V0UHJvZ3JhbU5hbWUoY2hhciAqbmFtZSk7Cgl2aXJ0dWFsIHZvaWQgZ2V0UHJvZ3JhbU5hbWUoY2hhciAqbmFtZSk7Cgl2aXJ0dWFsIGJvb2wgZ2V0UHJvZ3JhbU5hbWVJbmRleGVkKFZzdEludDMyIGNhdGVnb3J5LCBWc3RJbnQzMiBpbmRleCwgY2hhciogbmFtZSk7Cgl2aXJ0dWFsIHZvaWQgc2V0UGFyYW1ldGVyKFZzdEludDMyIGluZGV4LCBmbG9hdCB2YWx1ZSk7Cgl2aXJ0dWFsIGZsb2F0IGdldFBhcmFtZXRlcihWc3RJbnQzMiBpbmRleCk7Cgl2aXJ0dWFsIHZvaWQgZ2V0UGFyYW1ldGVyTGFiZWwoVnN0SW50MzIgaW5kZXgsIGNoYXIgKmxhYmVsKTsKCXZpcnR1YWwgdm9pZCBnZXRQYXJhbWV0ZXJEaXNwbGF5KFZzdEludDMyIGluZGV4LCBjaGFyICp0ZXh0KTsKCXZpcnR1YWwgdm9pZCBnZXRQYXJhbWV0ZXJOYW1lKFZzdEludDMyIGluZGV4LCBjaGFyICp0ZXh0KTsKCgl2aXJ0dWFsIGJvb2wgZ2V0RWZmZWN0TmFtZShjaGFyICpuYW1lKTsKCXZpcnR1YWwgYm9vbCBnZXRWZW5kb3JTdHJpbmcoY2hhciAqdGV4dCk7Cgl2aXJ0dWFsIGJvb2wgZ2V0UHJvZHVjdFN0cmluZyhjaGFyICp0ZXh0KTsKCXZpcnR1YWwgVnN0SW50MzIgZ2V0VmVuZG9yVmVyc2lvbigpIHsgcmV0dXJuIDEwMDA7IH0KCnByaXZhdGU6CgljaGFyIHByb2dyYW1OYW1lWzMyXTsKCgl7ez1pdC5jbGFzc19uYW1lfX0gaW5zdGFuY2U7Cn07CgojZW5kaWYK","base64")),
					"vst2_effect_cpp": 	String(Buffer("I2luY2x1ZGUgInZzdDJfZWZmZWN0LmgiCgojaW5jbHVkZSA8Y3N0ZGxpYj4KI2luY2x1ZGUgPGNzdGRpbz4KI2luY2x1ZGUgPGNtYXRoPgojaW5jbHVkZSA8YWxnb3JpdGhtPgoKQXVkaW9FZmZlY3QgKmNyZWF0ZUVmZmVjdEluc3RhbmNlKGF1ZGlvTWFzdGVyQ2FsbGJhY2sgYXVkaW9NYXN0ZXIpIHsgcmV0dXJuIG5ldyBFZmZlY3QoYXVkaW9NYXN0ZXIpOyB9CgpFZmZlY3Q6OkVmZmVjdChhdWRpb01hc3RlckNhbGxiYWNrIGF1ZGlvTWFzdGVyKSA6IEF1ZGlvRWZmZWN0WChhdWRpb01hc3RlciwgMSwge3s9aXQuY29udHJvbF9pbnB1dHMubGVuZ3RofX0pIHsKCXNldE51bUlucHV0cyh7ez1pdC5hdWRpb19pbnB1dHMubGVuZ3RofX0pOwoJc2V0TnVtT3V0cHV0cyh7ez1pdC5vdXRwdXRzLmxlbmd0aH19KTsKCXNldFVuaXF1ZUlEKCdmeGZ4Jyk7CglERUNMQVJFX1ZTVF9ERVBSRUNBVEVEKGNhbk1vbm8pICgpOwoJY2FuUHJvY2Vzc1JlcGxhY2luZygpOwoJc3RyY3B5KHByb2dyYW1OYW1lLCAiRWZmZWN0Iik7CgoJaW5zdGFuY2UgPSB7ez1pdC5jbGFzc19uYW1lfX0oKTsKfQoKRWZmZWN0Ojp+RWZmZWN0KCkge30KCmJvb2wgRWZmZWN0OjpnZXRQcm9kdWN0U3RyaW5nKGNoYXIqIHRleHQpIHsgc3RyY3B5KHRleHQsICJFZmZlY3QiKTsgcmV0dXJuIHRydWU7IH0KYm9vbCBFZmZlY3Q6OmdldFZlbmRvclN0cmluZyhjaGFyKiB0ZXh0KSB7IHN0cmNweSh0ZXh0LCAiQ2lhcmFtZWxsYSIpOyByZXR1cm4gdHJ1ZTsgfQpib29sIEVmZmVjdDo6Z2V0RWZmZWN0TmFtZShjaGFyKiBuYW1lKSB7IHN0cmNweShuYW1lLCAiRWZmZWN0Iik7IHJldHVybiB0cnVlOyB9Cgp2b2lkIEVmZmVjdDo6c2V0UHJvZ3JhbU5hbWUoY2hhciAqbmFtZSkgeyBzdHJjcHkocHJvZ3JhbU5hbWUsIG5hbWUpOyB9CnZvaWQgRWZmZWN0OjpnZXRQcm9ncmFtTmFtZShjaGFyICpuYW1lKSB7IHN0cmNweShuYW1lLCBwcm9ncmFtTmFtZSk7IH0KCmJvb2wgRWZmZWN0OjpnZXRQcm9ncmFtTmFtZUluZGV4ZWQoVnN0SW50MzIgY2F0ZWdvcnksIFZzdEludDMyIGluZGV4LCBjaGFyKiBuYW1lKSB7CglpZiAoaW5kZXggPT0gMCkgewoJCXN0cmNweShuYW1lLCBwcm9ncmFtTmFtZSk7CgkJcmV0dXJuIHRydWU7Cgl9CglyZXR1cm4gZmFsc2U7Cn0KCnZvaWQgRWZmZWN0OjpzZXRQYXJhbWV0ZXIoVnN0SW50MzIgaW5kZXgsIGZsb2F0IHZhbHVlKSB7Cglzd2l0Y2ggKGluZGV4KSB7Cgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWNhc2Uge3s9aXQuY29udHJvbF9pbnB1dHMuaW5kZXhPZihjKX19OgoJCWluc3RhbmNlLnNldHt7PWN9fSh2YWx1ZSk7CgkJYnJlYWs7e3t+fX0KCX0KfQoKZmxvYXQgRWZmZWN0OjpnZXRQYXJhbWV0ZXIoVnN0SW50MzIgaW5kZXgpIHsKCWZsb2F0IHYgPSAwLmY7Cglzd2l0Y2ggKGluZGV4KSB7Cgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWNhc2Uge3s9aXQuY29udHJvbF9pbnB1dHMuaW5kZXhPZihjKX19OgoJCXYgPSBpbnN0YW5jZS5nZXR7ez1jfX0oKTsKCQlicmVhazt7e359fQoJfQoJcmV0dXJuIHY7Cn0KCnZvaWQgRWZmZWN0OjpnZXRQYXJhbWV0ZXJOYW1lKFZzdEludDMyIGluZGV4LCBjaGFyICp0ZXh0KSB7Cgljb25zdCBjaGFyICpuYW1lc1tdID0geyB7ez1pdC5jb250cm9sX2lucHV0cy5tYXAoYyA9PiAnXCInICtjKydcIicpfX19OwoJc3RyY3B5KHRleHQsIG5hbWVzW2luZGV4XSk7Cn0KCnZvaWQgRWZmZWN0OjpnZXRQYXJhbWV0ZXJEaXNwbGF5KFZzdEludDMyIGluZGV4LCBjaGFyICp0ZXh0KSB7Cgl0ZXh0WzBdID0gJ1wwJzsKfQoKdm9pZCBFZmZlY3Q6OmdldFBhcmFtZXRlckxhYmVsKFZzdEludDMyIGluZGV4LCBjaGFyICp0ZXh0KSAgewoJdGV4dFswXSA9ICdcMCc7Cn0KCnZvaWQgRWZmZWN0OjpzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpIHsKCWluc3RhbmNlLnNldFNhbXBsZVJhdGUoc2FtcGxlUmF0ZSk7CglpbnN0YW5jZS5yZXNldCgpOwp9Cgp2b2lkIEVmZmVjdDo6cHJvY2VzcyhmbG9hdCAqKmlucHV0cywgZmxvYXQgKipvdXRwdXRzLCBWc3RJbnQzMiBzYW1wbGVGcmFtZXMpIHsKCWluc3RhbmNlLnByb2Nlc3Moe3s9aXQuYXVkaW9faW5wdXRzLm1hcChpID0+ICdpbnB1dHNbJytpdC5hdWRpb19pbnB1dHMuaW5kZXhPZihpKSsnXScpfX0sIHt7PWl0Lm91dHB1dHMubWFwKGkgPT4gJ291dHB1dHNbJytpdC5vdXRwdXRzLmluZGV4T2YoaSkrJ10nKX19LCBzYW1wbGVGcmFtZXMpOwp9Cgp2b2lkIEVmZmVjdDo6cHJvY2Vzc1JlcGxhY2luZyhmbG9hdCAqKmlucHV0cywgZmxvYXQgKipvdXRwdXRzLCBWc3RJbnQzMiBzYW1wbGVGcmFtZXMpIHsKCWluc3RhbmNlLnByb2Nlc3Moe3s9aXQuYXVkaW9faW5wdXRzLm1hcChpID0+ICdpbnB1dHNbJytpdC5hdWRpb19pbnB1dHMuaW5kZXhPZihpKSsnXScpfX0sIHt7PWl0Lm91dHB1dHMubWFwKGkgPT4gJ291dHB1dHNbJytpdC5vdXRwdXRzLmluZGV4T2YoaSkrJ10nKX19LCBzYW1wbGVGcmFtZXMpOwp9","base64")),
					"js_html": 			String(Buffer("PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPHRpdGxlPlBsdWdpbjwvdGl0bGU+CjxzY3JpcHQgdHlwZT0idGV4dC9qYXZhc2NyaXB0Ij4KCnZhciBub2RlOwp2YXIgY3R4Owp2YXIgaW5wdXROb2RlOwoKdmFyIGJlZ2luID0gYXN5bmMgZnVuY3Rpb24gKCkgewoJY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpOwoKCWF3YWl0IGN0eC5hdWRpb1dvcmtsZXQuYWRkTW9kdWxlKCJwcm9jZXNzb3IuanMiKTsKCglub2RlID0gbmV3IEF1ZGlvV29ya2xldE5vZGUoY3R4LCAiUGx1Z2luUHJvY2Vzc29yIiwgeyBvdXRwdXRDaGFubmVsQ291bnQ6IFsxXSB9KTsKCglub2RlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTsKCgl2YXIgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoeyBhdWRpbzogeyBhdXRvR2FpbkNvbnRyb2w6IGZhbHNlLCBlY2hvQ2FuY2VsbGF0aW9uOiBmYWxzZSwgbm9pc2VTdXBwcmVzc2lvbjogZmFsc2UsIGxhdGVuY3k6IDAuMDA1IH0gfSk7CglpbnB1dE5vZGUgPSBjdHguY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTsKCglpbnB1dE5vZGUuY29ubmVjdChub2RlKTsKCiAge3t+aXQuY29udHJvbF9pbnB1dHM6Y319CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInt7PWN9fSIpLm9uaW5wdXQgPSBoYW5kbGVJbnB1dDsge3t+fX0KICAKfTsKCmZ1bmN0aW9uIGhhbmRsZUlucHV0KGUpIHsKCW5vZGUucG9ydC5wb3N0TWVzc2FnZSh7dHlwZTogInBhcmFtQ2hhbmdlIiwgaWQ6IGUudGFyZ2V0LmlkLCB2YWx1ZTogZS50YXJnZXQudmFsdWV9KQp9Owo8L3NjcmlwdD4KPC9oZWFkPgo8Ym9keT4KICA8aDE+e3s9aXQuY2xhc3NfbmFtZX19PC9oMT4KICAKICB7e35pdC5jb250cm9sX2lucHV0czpjfX0KICA8bGFiZWwgZm9yPSJ7ez1jfX0iPnt7PWN9fTwvbGFiZWw+CiAgPGlucHV0IHR5cGU9InJhbmdlIiBpZD0ie3s9Y319IiBuYW1lPSJ7ez1jfX0iIG1pbj0iMCIgbWF4PSIxIiB2YWx1ZT0iMC41IiBzdGVwPSJhbnkiPjxicj57e359fQoKICA8YnV0dG9uIG9uY2xpY2s9ImJlZ2luKCkiPlN0YXJ0PC9idXR0b24+CjwvYm9keT4KPC9odG1sPgo=","base64")),
					"js_processor": 	String(Buffer("dmFyIFBsdWdpbiA9IHsKCWluaXQ6IGZ1bmN0aW9uICgpIHsKCQl0aGlzLmZzID0gMDsKCQl0aGlzLmZpcnN0UnVuID0gMTsKCgkJe3t+aXQuY29uc3RhbnRfcmF0ZTpjfX17ez1jLmxlZnR9fSA9IHt7PWMucmlnaHR9fTsKCQl7e359fQoKCQl0aGlzLnBhcmFtcyA9IFt7ez1pdC5jb250cm9sX2lucHV0cy5tYXAoYyA9PiAnIicgKyBjICsgJyInKS5qb2luKCIsICIpfX1dOwoKCQl7e35pdC5kZWNsYXJhdGlvbnMxOmR9fQoJCXt7PWQubGVmdH19ID0gMDt7e359fQoKCQl7e35pdC5kZWNsYXJhdGlvbnMyOmR9fQoJCXt7PWQubGVmdH19ID0ge3s9ZC5yaWdodH19O3t7fn19CgoJCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJCXRoaXMue3s9Y319X3oxID0gMDsKCQl0aGlzLnt7PWN9fV9DSEFOR0VEID0gdHJ1ZTsKCQl7e359fQoJfSwKCglyZXNldDogZnVuY3Rpb24gKCkgewoJCXRoaXMuZmlyc3RSdW4gPSAxCgl9LAoKCXNldFNhbXBsZVJhdGU6IGZ1bmN0aW9uIChzYW1wbGVSYXRlKSB7CgkJdGhpcy5mcyA9IHNhbXBsZVJhdGU7CgkJe3t+aXQuc2FtcGxpbmdfcmF0ZTpzfX17ez1zLmxlZnR9fSA9IHt7PXMucmlnaHR9fTsKCQl7e359fQoJfSwKCglwcm9jZXNzOiBmdW5jdGlvbiAoe3s9aXQuYXVkaW9faW5wdXRzLmNvbmNhdChpdC5vdXRwdXRzKS5qb2luKCcsICcpfX0sIG5TYW1wbGVzKSB7CgkJaWYgKHRoaXMuZmlyc3RSdW4pIHt7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQkJdGhpcy57ez1jfX1fQ0hBTkdFRCA9IHRydWU7e3t+fX0KCQl9CgkJZWxzZSB7e3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJCXRoaXMue3s9Y319X0NIQU5HRUQgPSB0aGlzLnt7PWN9fSAhPSB0aGlzLnt7PWN9fV96MTt7e359fQoJCX0KCgkJe3t+aXQuY29udHJvbHNfcmF0ZTpjfX0KCQlpZiAoe3s9QXJyYXkuZnJvbShjLnNldCkubWFwKGUgPT4gInRoaXMuIiArIGUgKyAiX0NIQU5HRUQiKS5qb2luKCcgfCAnKX19KSB7e3t+Yy5zdG10czogc319CgkJCXt7PXMubGVmdH19ID0ge3s9cy5yaWdodH19O3t7fn19CgkJfXt7fn19CgkJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJdGhpcy57ez1jfX1fQ0hBTkdFRCA9IGZhbHNlO3t7fn19CgoJCWlmICh0aGlzLmZpcnN0UnVuKSB7IHt7fml0LnJlc2V0MTpyfX0KCQkJe3s9ci5sZWZ0fX0gPSB7ez1yLnJpZ2h0fX07e3t+fX0KCQkJe3t+aXQucmVzZXQyOnJ9fQoJCQl7ez1yLmxlZnR9fSA9IHt7PXIucmlnaHR9fTt7e359fQoJCX0KCgkJZm9yIChsZXQgaSA9IDA7IGkgPCBuU2FtcGxlczsgaSsrKSB7CgkJCXt7fml0LmF1ZGlvX3JhdGU6IGF9fQoJCQl7ez1hLmxlZnR9fSA9IHt7PWEucmlnaHR9fTt7e359fQoJCQkKCQkJe3t+aXQuZGVsYXlfdXBkYXRlczp1fX17ez11LmxlZnR9fSA9IHt7PXUucmlnaHR9fTsKCQkJe3t+fX0KCQkJe3t+aXQub3V0cHV0X3VwZGF0ZXM6dX19CgkJCXt7PXUubGVmdH19W2ldID0ge3s9dS5yaWdodH19O3t7fn19CgkJfQoKCQl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQl0aGlzLnt7PWN9fV96MSA9IHRoaXMue3s9Y319O3t7fn19CgkJdGhpcy5maXJzdFJ1biA9IDA7Cgl9Cn0KCi8vIFN0YXRpYyBwYXJ0CmNsYXNzIFBsdWdpblByb2Nlc3NvciBleHRlbmRzIEF1ZGlvV29ya2xldFByb2Nlc3NvciB7Cgljb25zdHJ1Y3RvciAoKSB7CgoJCXN1cGVyKCk7CgkJdGhpcy5pbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoUGx1Z2luKTsKCQl0aGlzLmluc3RhbmNlLmluaXQoKTsKCQl0aGlzLmluc3RhbmNlLnNldFNhbXBsZVJhdGUoc2FtcGxlUmF0ZSk7CgkJdGhpcy5pbnN0YW5jZS5yZXNldCgpOwoKCQl0aGlzLnBvcnQub25tZXNzYWdlID0gKGUpID0+IHsKCQkJaWYgKGUuZGF0YS50eXBlID09ICJjaGFuZ2VJbnN0YW5jZSIpIHsKCQkJCWV2YWwoZS5kYXRhLnZhbHVlKQoJCQkJdGhpcy5pbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoUGx1Z2luKTsKCQkJCXRoaXMuaW5zdGFuY2UuaW5pdCgpOwoJCQkJdGhpcy5pbnN0YW5jZS5zZXRTYW1wbGVSYXRlKHNhbXBsZVJhdGUpOwoJCQkJdGhpcy5pbnN0YW5jZS5yZXNldCgpOwoJCQl9CgkJCWVsc2UgaWYgKGUuZGF0YS50eXBlID09ICJwYXJhbUNoYW5nZSIpIHsKCQkJCXRoaXMuaW5zdGFuY2VbZS5kYXRhLmlkXSA9IGUuZGF0YS52YWx1ZQoJCQl9CgkJfQoJfQoJcHJvY2VzcyAoaW5wdXRzLCBvdXRwdXRzLCBwYXJhbWV0ZXJzKSB7CgoJCXZhciBpbnB1dCA9IGlucHV0c1swXTsKCQl2YXIgb3V0cHV0ID0gb3V0cHV0c1swXTsKCQlsZXQgblNhbXBsZXMgPSBNYXRoLm1pbihpbnB1dC5sZW5ndGggPj0gMSA/IGlucHV0WzBdLmxlbmd0aCA6IDAsIG91dHB1dFswXS5sZW5ndGgpCgkJdGhpcy5pbnN0YW5jZS5wcm9jZXNzKGlucHV0WzBdLCBvdXRwdXRbMF0sIG5TYW1wbGVzKTsKCgkJcmV0dXJuIHRydWU7Cgl9CgoJc3RhdGljIGdldCBwYXJhbWV0ZXJEZXNjcmlwdG9ycygpIHsKCQlyZXR1cm4gW107Cgl9Cn0KCnJlZ2lzdGVyUHJvY2Vzc29yKCJQbHVnaW5Qcm9jZXNzb3IiLCBQbHVnaW5Qcm9jZXNzb3IpOwo=","base64"))
				}
			}
		}

		let tree = env["parser"].parse(code);
		if (debug) console.log(tree)
		
		let scopes = env["extended_syntax"].validate(tree)
		if (debug) console.log(scopes.join("").toString())

		let graphes = env["graph"].ASTToGraph(tree, initial_block, control_inputs, initial_values)
		if (debug) console.log("G1__: ", graphes[0])
		if (debug) console.log("G2__: ", graphes[1])

		let scheduled_blocks = env["scheduler"].schedule(graphes[0])
		let scheduled_blocks_init = env["scheduler"].scheduleInit(graphes[1])
		if (debug) console.log(scheduled_blocks.map(b => b.operation + "   " + (b.id ? b.id : "") + " " + (b.val ? b.val : "")))
		if (debug) console.log(scheduled_blocks_init.map(b => b.operation + "   " + (b.id ? b.id : "") + " " + (b.val ? b.val : "")))

		let files = env["output_generation"].convert(env["doT"], env["templates"], target_lang, graphes[0], graphes[1], scheduled_blocks, scheduled_blocks_init)
		return files
	}

	exports["compile"] = compile

}());
}).call(this)}).call(this,require("buffer").Buffer)
},{"./extended_syntax":1,"./grammar":2,"./graph":3,"./output_generation":4,"./scheduler":5,"buffer":10,"dot":7,"path":12}],7:[function(require,module,exports){
// doT.js
// 2011-2014, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function () {
	"use strict";

	var doT = {
		name: "doT",
		version: "1.1.1",
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	"it",
			strip:		true,
			append:		true,
			selfcontained: false,
			doNotSkipEncoded: false
		},
		template: undefined, //fn, compile template
		compile:  undefined, //fn, for express
		log: true
	}, _globals;

	doT.encodeHTMLSource = function(doNotSkipEncoded) {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" },
			matchHTML = doNotSkipEncoded ? /[&<>"'\/]/g : /&(?!#?\w+;)|<|>|"|'|\//g;
		return function(code) {
			return code ? code.toString().replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : "";
		};
	};

	_globals = (function(){ return this || (0,eval)("this"); }());

	/* istanbul ignore else */
	if (typeof module !== "undefined" && module.exports) {
		module.exports = doT;
	} else if (typeof define === "function" && define.amd) {
		define(function(){return doT;});
	} else {
		_globals.doT = doT;
	}

	var startend = {
		append: { start: "'+(",      end: ")+'",      startencode: "'+encodeHTML(" },
		split:  { start: "';out+=(", end: ");out+='", startencode: "';out+=encodeHTML(" }
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === "string") ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf("def.") === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ":") {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return "";
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, "_");
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g," ")
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,""): str)
			.replace(/'|\\/g, "\\$&")
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.startencode + unescape(code) + cse.end;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, "\\n").replace(/\t/g, '\\t').replace(/\r/g, "\\r")
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, "");
			//.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode) {
			if (!c.selfcontained && _globals && !_globals._encodeHTML) _globals._encodeHTML = doT.encodeHTMLSource(c.doNotSkipEncoded);
			str = "var encodeHTML = typeof _encodeHTML !== 'undefined' ? _encodeHTML : ("
				+ doT.encodeHTMLSource.toString() + "(" + (c.doNotSkipEncoded || '') + "));"
				+ str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			/* istanbul ignore else */
			if (typeof console !== "undefined") console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());

},{}],8:[function(require,module,exports){

},{}],9:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],10:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":9,"buffer":10,"ieee754":11}],11:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],12:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":13}],13:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[6])(6)
});
