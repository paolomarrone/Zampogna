(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.zampogna = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,3],$V1=[1,6],$V2=[1,10],$V3=[1,11],$V4=[1,8,25,52],$V5=[1,31],$V6=[1,27],$V7=[1,26],$V8=[1,28],$V9=[1,30],$Va=[1,33],$Vb=[1,8,25,30,32,34,35,37,38,39,40,42,43,45,46,52],$Vc=[2,48],$Vd=[1,8,15,25,26,30,52],$Ve=[1,37],$Vf=[1,8,15,25,26,30,32,52],$Vg=[1,38],$Vh=[1,39],$Vi=[1,8,15,25,26,30,32,34,35,52],$Vj=[1,40],$Vk=[1,41],$Vl=[1,42],$Vm=[1,43],$Vn=[1,8,15,25,26,30,32,34,35,37,38,39,40,52],$Vo=[1,44],$Vp=[1,45],$Vq=[1,8,15,25,26,30,32,34,35,37,38,39,40,42,43,52],$Vr=[1,46],$Vs=[1,47],$Vt=[1,8,15,25,26,30,32,34,35,37,38,39,40,42,43,45,46,52],$Vu=[2,55],$Vv=[2,54],$Vw=[1,82],$Vx=[8,18,25,52],$Vy=[1,99],$Vz=[2,12],$VA=[16,24];
var parser = {trace: function trace () { },
yy: {},
symbols_: {"error":2,"program":3,"program_stmts0":4,"program_stmt":5,"const":6,"block_def":7,"END":8,"assignment":9,"ids_list1":10,"ASSIGN":11,"id":12,"LPAREN":13,"exprs_list0":14,"RPAREN":15,"LBRACE":16,"block_stmts1":17,"RBRACE":18,"anonym_block_def":19,"if_then_else":20,"IF":21,"expr":22,"mayend":23,"ELSE":24,"INIT":25,"COMMA":26,"block_stmt":27,"or_expr":28,"and_expr":29,"OR":30,"equality_expr":31,"AND":32,"relational_expr":33,"EQUAL":34,"NOTEQUAL":35,"additive_expr":36,"LESS":37,"LESSEQUAL":38,"GREATER":39,"GREATEREQUAL":40,"multiplicative_expr":41,"PLUS":42,"MINUS":43,"unary_expr":44,"TIMES":45,"DIV":46,"primary_expr":47,"NOT":48,"number":49,"SAMPLERATE":50,"fb_call":51,"ID":52,"NUMBER":53,"exprs_list1":54,"$accept":0,"$end":1},
terminals_: {2:"error",8:"END",11:"ASSIGN",13:"LPAREN",15:"RPAREN",16:"LBRACE",18:"RBRACE",21:"IF",24:"ELSE",25:"INIT",26:"COMMA",30:"OR",32:"AND",34:"EQUAL",35:"NOTEQUAL",37:"LESS",38:"LESSEQUAL",39:"GREATER",40:"GREATEREQUAL",42:"PLUS",43:"MINUS",45:"TIMES",46:"DIV",48:"NOT",50:"SAMPLERATE",52:"ID",53:"NUMBER"},
productions_: [0,[3,1],[4,2],[4,0],[5,1],[5,1],[5,1],[6,1],[7,9],[19,5],[20,16],[23,2],[23,0],[10,1],[10,2],[10,3],[17,2],[17,1],[27,2],[27,2],[27,2],[27,2],[27,1],[9,3],[22,1],[28,1],[28,3],[29,1],[29,3],[31,1],[31,3],[31,3],[33,1],[33,3],[33,3],[33,3],[33,3],[36,1],[36,3],[36,3],[41,1],[41,3],[41,3],[44,1],[44,2],[44,2],[44,2],[47,1],[47,1],[47,1],[47,3],[47,1],[12,1],[49,1],[51,4],[14,0],[14,1],[54,1],[54,3]],
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
case 4: case 5: case 13: case 57:

                            this.$ = [$$[$0]]
                        
break;
case 6: case 22: case 55:

                            this.$ = []
                        
break;
case 7: case 17: case 24: case 25: case 27: case 29: case 32: case 37: case 40: case 43: case 45: case 47: case 48: case 51: case 56:

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
                                name: 'OR_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 28:

                            this.$ = {
                                name: 'AND_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 30:

                            this.$ = {
                                name: 'EQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 31:

                            this.$ = {
                                name: 'NOTEQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 33:

                            this.$ = {
                                name: 'LESS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 34:

                            this.$ = {
                                name: 'LESSEQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 35:

                            this.$ = {
                                name: 'GREATER_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 36:

                            this.$ = {
                                name: 'GREATEREQUAL_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 38:

                            this.$ = {
                                name: 'PLUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 39:

                            this.$ = {
                                name: 'MINUS_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 41:

                            this.$ = {
                                name: 'TIMES_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 42:

                            this.$ = {
                                name: 'DIV_EXPR',
                                args: [$$[$0-2], $$[$0]]
                            }
                        
break;
case 44:

                            this.$ = {
                                name: 'UMINUS_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 46:

                            this.$ = {
                                name: 'NOT_EXPR',
                                args: [$$[$0]]
                            }
                        
break;
case 49:

                            this.$ = {
                                name: 'SAMPLERATE',
                                val: "fs"
                            }
                        
break;
case 50:

                            this.$ = $$[$0-1]
                        
break;
case 52:
 
                            this.$ = { name: 'ID', val: yytext}; 
                        
break;
case 53:
 
                            this.$ = { name: 'NUMBER', val: parseFloat(yytext)}; 
                        
break;
case 54:

                            this.$ = {
                                name: 'CALL_EXPR',
                                id: $$[$0-3],
                                args: $$[$0-1]
                            }
                        
break;
case 58:
 
                            this.$ = [$$[$0-2]].concat($$[$0]) 
                        
break;
}
},
table: [{1:$V0,3:1,4:2,5:3,6:4,7:5,8:$V1,9:7,10:8,12:9,25:$V2,52:$V3},{1:[3]},{1:[2,1]},{1:$V0,4:12,5:3,6:4,7:5,8:$V1,9:7,10:8,12:9,25:$V2,52:$V3},o($V4,[2,4]),o($V4,[2,5]),o($V4,[2,6]),o($V4,[2,7]),{11:[1,13]},{11:[2,13],26:[1,14]},{12:15,52:$V3},o([1,8,11,13,15,25,26,30,32,34,35,37,38,39,40,42,43,45,46,52],[2,52]),{1:[2,2]},{12:16,13:$V5,22:17,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{10:34,12:9,25:$V2,52:$V3},{11:[2,14]},o($Vb,$Vc,{13:[1,35]}),o($V4,[2,23]),o([1,8,15,25,26,52],[2,24],{30:[1,36]}),o($Vd,[2,25],{32:$Ve}),o($Vf,[2,27],{34:$Vg,35:$Vh}),o($Vi,[2,29],{37:$Vj,38:$Vk,39:$Vl,40:$Vm}),o($Vn,[2,32],{42:$Vo,43:$Vp}),o($Vq,[2,37],{45:$Vr,46:$Vs}),o($Vt,[2,40]),o($Vt,[2,43]),{12:49,13:$V5,47:48,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,47:50,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,47:51,49:29,50:$V9,51:32,52:$V3,53:$Va},o($Vt,[2,47]),o($Vt,[2,49]),{12:49,13:$V5,22:52,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},o($Vt,[2,51]),o($Vt,[2,53]),{11:[2,15]},{12:49,13:$V5,14:53,15:$Vu,22:55,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va,54:54},{12:49,13:$V5,29:56,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,31:57,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,33:58,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,33:59,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,36:60,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,36:61,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,36:62,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,36:63,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,41:64,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,41:65,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,42:$V6,43:$V7,44:66,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{12:49,13:$V5,42:$V6,43:$V7,44:67,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},o($Vt,[2,44]),o($Vt,$Vc,{13:[1,68]}),o($Vt,[2,45]),o($Vt,[2,46]),{15:[1,69]},{15:[1,70]},{15:[2,56]},{15:[2,57],26:[1,71]},o($Vd,[2,26],{32:$Ve}),o($Vf,[2,28],{34:$Vg,35:$Vh}),o($Vi,[2,30],{37:$Vj,38:$Vk,39:$Vl,40:$Vm}),o($Vi,[2,31],{37:$Vj,38:$Vk,39:$Vl,40:$Vm}),o($Vn,[2,33],{42:$Vo,43:$Vp}),o($Vn,[2,34],{42:$Vo,43:$Vp}),o($Vn,[2,35],{42:$Vo,43:$Vp}),o($Vn,[2,36],{42:$Vo,43:$Vp}),o($Vq,[2,38],{45:$Vr,46:$Vs}),o($Vq,[2,39],{45:$Vr,46:$Vs}),o($Vt,[2,41]),o($Vt,[2,42]),{12:49,13:$V5,14:72,15:$Vu,22:55,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va,54:54},o($Vt,[2,50]),o($Vb,$Vv,{16:[1,73]}),{12:49,13:$V5,22:55,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va,54:74},{15:[1,75]},{7:79,8:$Vw,9:78,10:83,12:9,17:76,19:80,20:81,25:$V2,27:77,52:$V3},{15:[2,58]},o($Vt,$Vv),{18:[1,84]},{7:79,8:$Vw,9:78,10:83,12:9,17:85,18:[2,17],19:80,20:81,25:$V2,27:77,52:$V3},{8:[1,86]},{8:[1,87]},{8:[1,88]},{8:[1,89]},o($Vx,[2,22]),{11:[1,90]},o($V4,[2,8]),{18:[2,16]},o($Vx,[2,18]),o($Vx,[2,19]),o($Vx,[2,20]),o($Vx,[2,21]),{12:16,13:$V5,16:[1,91],21:[1,92],22:17,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{7:79,8:$Vw,9:78,10:83,12:9,17:93,19:80,20:81,25:$V2,27:77,52:$V3},{13:[1,94]},{18:[1,95]},{12:49,13:$V5,22:96,28:18,29:19,31:20,33:21,36:22,41:23,42:$V6,43:$V7,44:24,47:25,48:$V8,49:29,50:$V9,51:32,52:$V3,53:$Va},{8:[2,9]},{15:[1,97]},{8:$Vy,16:$Vz,23:98},{16:[1,100]},o($VA,$Vz,{23:101,8:$Vy}),{7:79,8:$Vw,9:78,10:83,12:9,17:102,19:80,20:81,25:$V2,27:77,52:$V3},o($VA,[2,11]),{18:[1,103]},{8:$Vy,23:104,24:$Vz},{24:[1,105]},{8:$Vy,16:$Vz,23:106},{16:[1,107]},{7:79,8:$Vw,9:78,10:83,12:9,17:108,19:80,20:81,25:$V2,27:77,52:$V3},{18:[1,109]},{8:[2,10]}],
defaultActions: {2:[2,1],12:[2,2],15:[2,14],34:[2,15],54:[2,56],74:[2,58],85:[2,16],95:[2,9],109:[2,10]},
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
case 2:return "GREATEREQUAL";
break;
case 3:return "LESSEQUAL";
break;
case 4:return "LESS";
break;
case 5:return "GREATER";
break;
case 6:return "EQUAL";
break;
case 7:return "NOTEQUAL";
break;
case 8:return "NOT";
break;
case 9:return "AND";
break;
case 10:return "OR";
break;
case 11:return 11;
break;
case 12:return 16;
break;
case 13:return 18;
break;
case 14:return 53;
break;
case 15:return 50;
break;
case 16:return 21
break;
case 17:return "ELSE"
break;
case 18:return 52;
break;
case 19:return 42;
break;
case 20:return 43;
break;
case 21:return 45;
break;
case 22:return 46;
break;
case 23:return 13;
break;
case 24:return 15;
break;
case 25:return 26;
break;
case 26:return 25;
break;
case 27:return 8;
break;
case 28:return 8;
break;
case 29:/* skip whitespace */
break;
}
},
rules: [/^(?:#[^\n\r]*)/,/^(?:\.\.\.[^\n^\n]*[\n\r]+)/,/^(?:>=)/,/^(?:<=)/,/^(?:<)/,/^(?:>)/,/^(?:==)/,/^(?:!=)/,/^(?:!)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:=)/,/^(?:\{)/,/^(?:\})/,/^(?:((0|[1-9][0-9]*)(\.[0-9]+)?([eE](\+|-)?[0-9]+)?))/,/^(?:fs\b)/,/^(?:if\b)/,/^(?:else\b)/,/^(?:([_a-zA-Z][_a-zA-Z0-9]*))/,/^(?:\+)/,/^(?:-)/,/^(?:\*)/,/^(?:\/)/,/^(?:\()/,/^(?:\))/,/^(?:,)/,/^(?:@)/,/^(?:[\n\r]+)/,/^(?:[;]+)/,/^(?:[ \t]+)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],"inclusive":true}}
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
},{"_process":13,"fs":8,"path":12}],4:[function(require,module,exports){
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

	function Graph (id) {
		let self = this
		this.id = id
		this.blocks = []
		this.connections = []
		this.input_ports = []  // external input
		this.output_ports = [] // output toward outside
		this.getOutputBlocks = function (block) {
			let cs = self.connections.filter(c => c.in.block == block)
			cs.sort((a, b) => block.output_ports.indexOf(a.in) < block.output_ports.indexOf(b.in) ? -1 : 1)
			return cs.map(p => p.out.block)
		}
		this.getInputBlocks = function (block) {
			return block.input_ports.map(p => self.connections.find(c => c.out == p)).filter(
				c => c != undefined).map(c => c.in.block)
		}
		this.clone = function () {
			let c = new Graph(self.id)
			self.blocks.forEach(b => {
				let bc = b.clone()
				b.__son__ = bc
				c.blocks.push(bc)
			})
			self.connections.forEach(conn => {
				let i_in = conn.in.block.output_ports.indexOf(conn.in)
				let i_out = conn.out.block.input_ports.indexOf(conn.out)
				let new_conn = new Connection(conn.in.block.__son__.output_ports[i_in], conn.out.block.__son__.input_ports[i_out])
				c.connections.push(new_conn)
			})

			self.input_ports.forEach(in_p => {
				let i_in = in_p.block.input_ports.indexOf(in_p)
				c.input_ports.push(in_p.block.__son__.input_ports[i_in])
			})

			self.output_ports.forEach(out_p => {
				let i_out = out_p.block.output_ports.indexOf(out_p)
				c.output_ports.push(out_p.block.__son__.output_ports[i_out])
			})

			//c.blocks.forEach(b => {
			//	b.if_owners = b.if_owners.map(io => { ifblock: io.__son__.ifblock, branch: io.__son__.branch })
			//})

			self.blocks.forEach(b => delete b.__son__)

			return c;
		}
		this.cloneSubGraph = function (blocks) {
			let c = new Graph(self.id + "_sub")
			blocks.forEach(b => {
				let bc = b.clone()
				bc.postfix += "_c_"
				b.__son__ = bc
				c.blocks.push(bc)
			})
			self.connections.filter(conn => blocks.includes(conn.in.block) || blocks.includes(conn.out.block)).forEach(conn => {
				let i_in =  conn.in.block.output_ports.indexOf(conn.in)
				let i_out = conn.out.block.input_ports.indexOf(conn.out)
				let new_p_in = conn.in.block.__son__ ? conn.in.block.__son__.output_ports[i_in] : conn.in
				let new_p_out = conn.out.block.__son__ ? conn.out.block.__son__.input_ports[i_out] : conn.out
				let new_conn = new Connection(new_p_in, new_p_out)
				c.connections.push(new_conn)
			})

			blocks.filter(b => b.operation == "IF_THEN_ELSE").forEach(b => {
				blocks.forEach(bb => {
					let io = bb.__son__.if_owners.find(io => io.ifblock == b)
					if (io != undefined) {
						let ioi = bb.__son__.if_owners.indexOf(io)
						bb.__son__.if_owners.splice(ioi, 1, {ifblock: b.__son__, branch: io.branch})
					}
				})
			})

			//blocks.forEach(b => delete b.__son__)

			return c;
		}
		this.merge = function (g) {
			self.blocks = self.blocks.concat(g.blocks)
			self.connections = self.connections.concat(g.connections)
		}
		this.crossDFS = function (callbackF) {
			self.output_ports.forEach(p => visitNode(p.block))
			function visitNode(block) {
				if (block.visited)
					return
				block.visited = true
				
				self.getInputBlocks(block).forEach(b => visitNode(b))
				callbackF(block)
			}
			self.blocks.forEach(b => delete b.visited)
		}
		this.toString = function () {
			let s = "{\n\t" + id + ', ' + this.input_ports.length + ', ' + this.output_ports.length + "\n\tblocks: [\n"
			s += this.blocks.map(b => '\t\t' + b.toString()).join('\n') + "\n\t],"
			s += ' connections: [\n'
			s += this.connections.map(c => '\t\t' + c.toString()).join('\n') + "\n\t]\n}"
			return s;
		}
	}

	var blocksCounter = 0;

	function Block (nInputs = 0, nOutputs = 0, operation = "", id = "", postfix = "", val = NaN, if_owners = []) {
		let self = this
		this.uniqueId = blocksCounter++
		this.input_ports = new Array(nInputs).fill().map(() => new Port(self))
		this.output_ports = new Array(nOutputs).fill().map(() => new Port(self))
		this.operation = operation
		this.id = id
		this.postfix = postfix
		this.val = val
		this.control_dependencies = new Set()
		this.if_owners = [...if_owners]
		
		this.label = function () {
			return "" + self.id + self.postfix
		}
		this.getUpdateRateMax = function () {
			return self.input_ports.concat(self.output_ports).map(p => p.update_rate).reduce(function
				(p1, p2) { return  max(p1, p2)})
		}
		this.propagateUpdateRate = function () {
			if (self.operation == "IF_THEN_ELSE") {
				let cond_update_rate = self.input_ports[0].update_rate
				for (let i = 0; i < self.output_ports.length; i++) {
					let m = max(
						self.input_ports[i + 1].update_rate, 
						self.input_ports[i + 1 + self.output_ports.length].update_rate, 
						cond_update_rate)
					self.output_ports[i].update_rate = m
				}
			}
			else {
				let update_rate_max = self.getUpdateRateMax()
				self.output_ports.forEach((p => p.update_rate = update_rate_max))
			}
		}
		this.clone = function () {
			let c = new Block(self.input_ports.length, self.output_ports.length, self.operation, self.id, self.postfix, self.val, self.if_owners);
			c.ifoutputindex = self.ifoutputindex
			c.block_init = self.block_init
			return c

		}
		this.toString = function () {
			return '{ ' + [self.operation, self.id, self.postfix, self.val, self.input_ports.length, self.output_ports.length, self.control_dependencies.size].join(', ') + ' }'
		}
	}

	function Port (block) {
		this.block = block
		this.update_rate = -1 // 0 = constants, 1 = fs, 2 = control, 3 = audio
		this.getIndex = function () {
			if (this.block.input_ports.includes(this))
				return this.block.input_ports.indexOf(this)
			else if (this.block.output_ports.includes(this))
				return this.block.output_ports.indexOf(this)
			else
				throw new Error("Hanging port: " + this.block.toString())
		}
		this.toString = function () {
			return "{ " + this.block.toString() + ", id: " + this.getIndex() + ", ur: " + this.update_rate + " }"
		}
	}

	function Connection (in_port, out_port) {
		if (!in_port || !out_port)
			throw new Error("Undefined ports for the new Connection: " + in_port + ", " + out_port)
		this.in  = in_port
		this.out = out_port
		this.toString = function () {
			return this.in.toString() + "\t==>\t" + this.out.toString()
		}
	}

	function max (x1, ...xn) {
		let M = x1
		for (a of xn)
			if (a > M)
				M = a
		return M
	}

	function ASTToGraph (AST_root, initial_block, control_inputs, initial_values) {

		let graph = convertToGraph()
		let graph_init = convertToGraph()
		distinguishGraphs(graph, graph_init)

		normalizeIfGraphs(graph)
		normalizeIfGraphs(graph_init)

		graph = removeUnreachableNodes(graph)
		graph_init = removeUnreachableNodes(graph_init)

		setStartingUpdateRates(graph)
		setStartingUpdateRatesInit(graph_init)

		propagateUpdateRate(graph)
		propagateUpdateRateInit(graph_init)

		optimize(graph)
		optimize(graph_init)

		return [graph, graph_init]



		function convertToGraph() {
			let graph = new Graph(initial_block)

			let named_blocks = {}
			let named_vars 	= {}
			let expansions_count = 0

			AST_root.stmts.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(block => named_blocks[block.id.val] = block)

			if (!named_blocks[initial_block])
				throw new Error("Undefined initial block: " + initial_block + ". Available blocks: " + Object.keys(named_blocks))

			let postfix = '_0'

			let block_fs = new Block(0, 1, "SAMPLERATE", "fs", postfix, NaN, undefined)
			named_vars[block_fs.id] = block_fs
			graph.blocks.push(block_fs)

			AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(stmt => stmt.outputs.forEach(function (output) {
				let block_const = new Block(1, 1, 'VAR', output.val, postfix, NaN, undefined)
				named_vars[block_const.id] = block_const
				graph.blocks.push(block_const)
			}))

			AST_root.stmts.filter(stmt => stmt.name == 'ASSIGNMENT').forEach(stmt => {
				let ports = convertExpr(stmt.expr, {}, named_blocks, named_vars, [])
				stmt.outputs.forEach((output, index) => {
					let block_const = named_vars[output.val]
					let connection = new Connection(ports[1][index], block_const.input_ports[0])
					graph.connections.push(connection)
				})
			})

			let ports = expandCompositeBlock(named_blocks[initial_block], {}, {...named_blocks}, {...named_vars}, [])
			graph.input_ports = ports[0]
			graph.output_ports = ports[1]

			return graph

			function expandCompositeBlock (block, expansion_stack, named_blocks, named_vars, if_owners) {
				expansions_count++
				if (block.id.val != "" && expansion_stack[block.id.val])
					throw new Error("Recursive block expansion. Stack: " + Object.keys(expansion_stack) + "," + block.id.val)
				expansion_stack[block.id.val] = true

				let prefix  = '_' + block.id.val + '_'
				let postfix = expansions_count == 1 ? "" : '_' + expansions_count

				let input_ports = []
				let output_ports = []

				block.inputs.forEach(function (input) {
					let block_var = new Block(1, 1, "VAR", input.val, postfix, NaN, if_owners)
					named_vars[block_var.id] = block_var
					graph.blocks.push(block_var)
					input_ports.push(block_var.input_ports[0])
				})

				block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(block => named_blocks[block.id.val] = block)

				block.body.filter(stmt => ['ASSIGNMENT', 'ANONYM_BLOCK_DEF', 'IF_THEN_ELSE'].includes(stmt.name)).forEach(
					stmt => stmt.outputs.forEach((output, index) => {
						if (output.init)
							return
						let block_var = new Block(1, 1, "VAR", output.val, postfix, NaN, if_owners)
						if (stmt.name == 'IF_THEN_ELSE')
							block_var.ifoutputindex = index
						named_vars[block_var.id] = block_var
						graph.blocks.push(block_var)
					})
				)

				block.outputs.forEach(o => {
					output_ports.push(named_vars[o.val].output_ports[0])
				})

				block.body.filter(stmt => ['ASSIGNMENT', 'ANONYM_BLOCK_DEF', 'IF_THEN_ELSE'].includes(stmt.name)).forEach(function (stmt) {
					let ports;
					if (stmt.name == 'ASSIGNMENT')
						ports = convertExpr(stmt.expr, {...expansion_stack}, {...named_blocks}, {...named_vars}, if_owners)
					else if (stmt.name == 'ANONYM_BLOCK_DEF')
						ports = expandCompositeBlock(stmt, {...expansion_stack}, {...named_blocks}, {...named_vars}, if_owners)
					else if (stmt.name == 'IF_THEN_ELSE')
						ports = convertIfthenelse(stmt, expansion_stack, named_blocks, named_vars, if_owners)

					stmt.outputs.forEach(function (output, index) {
						if (!output.init) {
							let block_var = named_vars[output.val]
							let connection = new Connection(ports[1][index], block_var.input_ports[0])
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

			function convertExpr(expr_node, expansion_stack, named_blocks, named_vars, if_owners) {
				let block_expr;

				let input_ports = []
				let output_ports = []
				
				switch (expr_node.name) {
					case 'MINUS_EXPR':
					case 'PLUS_EXPR':
					case 'TIMES_EXPR':
					case 'DIV_EXPR':
					case 'UMINUS_EXPR':
					case 'EQUAL_EXPR':
					case 'NOTEQUAL_EXPR':
					case 'LESS_EXPR':
					case 'LESSEQUAL_EXPR':
					case 'GREATER_EXPR':
					case 'GREATEREQUAL_EXPR':
					case 'NOT_EXPR':
						block_expr = new Block(expr_node.args.length, 1, expr_node.name, undefined, undefined, undefined, if_owners)
						graph.blocks.push(block_expr)
						input_ports = block_expr.input_ports
						output_ports = block_expr.output_ports
						break
					case 'NUMBER':
						block_expr = new Block(0, 1, expr_node.name, undefined, undefined, expr_node.val, if_owners)
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
								block_expr = new Block(1, 1, 'DELAY1_EXPR', undefined, undefined, NaN, if_owners)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'FUNC_CALL':
								block_expr = new Block(expr_node.args.length, 1, 'EXTERNAL_FUNC_CALL', expr_node.id.val, undefined, NaN, if_owners)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'BLOCK_CALL':
								let ports = expandCompositeBlock(named_blocks[expr_node.id.val], 
									{...expansion_stack}, {...named_blocks}, {...named_vars}, if_owners)
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
					let ports = convertExpr(expr_node.args[argi], expansion_stack, named_blocks, named_vars, if_owners)
					let connection = new Connection(ports[1][0], input_ports[argi])
					graph.connections.push(connection)
				}

				return [input_ports, output_ports]
			}

			function convertIfthenelse(stmt, expansion_stack, named_blocks, named_vars, if_owners) {
				let block_ifthenelse = new Block(stmt.outputs.length * 2 + 1, stmt.outputs.length, 'IF_THEN_ELSE', undefined, undefined, NaN, if_owners)

				let condition_ports = convertExpr(stmt.condition, expansion_stack, named_blocks, named_vars, if_owners)
				// TODO: ? if branch bodies should not ovveride named_vars that are if output...
				let if_ports = expandCompositeBlock(stmt.if, {...expansion_stack}, {...named_blocks}, {...named_vars}, 
					if_owners.concat({ ifblock: block_ifthenelse, branch: 0 }))
				let else_ports = expandCompositeBlock(stmt.else, {...expansion_stack}, {...named_blocks}, {...named_vars},
					if_owners.concat({ ifblock: block_ifthenelse, branch: 1 }))

				let incoming_ports = condition_ports[1].concat(if_ports[1]).concat(else_ports[1])
				for (let p = 0; p < incoming_ports.length; p++) {
					let connection = new Connection(incoming_ports[p], block_ifthenelse.input_ports[p])
					graph.connections.push(connection)
				}
				graph.blocks.push(block_ifthenelse)
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
			let newGraph = new Graph(graph.id)
			
			graph.output_ports.forEach(p => visitNode(p.block))
			function visitNode(block, i) {
				if (block.operation == 'IF_THEN_ELSE') {
					if (!block.visited) 
						block.visited = []
					if (block.visited.includes(i))
						return
					block.visited.push(i)

					let inbs = graph.getInputBlocks(block)
					if (block.visited.length == 1) {
						visitNode(inbs[0], NaN)
						newGraph.blocks.push(block)
					}
					visitNode(inbs[i + 1], NaN)
					visitNode(inbs[i + 1 + block.output_ports.length], NaN)
				}
				else {
					if (block.visited)
						return
					block.visited = true
				
					graph.getInputBlocks(block).forEach(b => visitNode(b, block.ifoutputindex))
					newGraph.blocks.push(block)
				}
			}

			graph.blocks.filter(b => b.visited && b.operation == "IF_THEN_ELSE").forEach(b => {
				for (let i = b.output_ports.length - 1; i >= 0; i--) {
					if (!b.visited.includes(i)) {
						b.input_ports.splice(i + 1 + b.output_ports.length, 1)
						b.input_ports.splice(i + 1, 1)
						b.output_ports.splice(i, 1)
					}
				}
			})

			newGraph.connections = graph.connections.filter(c => 
				  	newGraph.blocks.some(b => b == c.out.block && b.input_ports.concat(b.output_ports).includes(c.out))
				&& 	newGraph.blocks.some(b => b == c.in.block  && b.input_ports.concat(b.output_ports).includes(c.in))
			)
			newGraph.connections = Array.from(new Set(newGraph.connections))

			graph.blocks.forEach(b => delete b.visited)

			newGraph.input_ports = graph.input_ports.filter(p => newGraph.blocks.includes(p.block))
			newGraph.output_ports = graph.output_ports

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
					c => c.out.update_rate = c.in.update_rate)
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

		function normalizeIfGraphs (graph) {

			// We have to normalize every IF 
			graph.output_ports.forEach(p => visitBlock1(p.block))

			function visitBlock1 (block) {
				if (block.visited1)
					return
				block.visited1 = true

				if (block.operation == 'IF_THEN_ELSE' && !block.handled) {
					visitIfThenElse(block)
				}
				graph.getInputBlocks(block).forEach(b => visitBlock1(b))
			}

			function visitIfThenElse(ifthenelse) {
			
				let in_blocks = graph.getInputBlocks(ifthenelse)
				in_blocks.shift()

				in_blocks.forEach(b => {
					visitBlock2(b)
				})

				in_blocks.forEach(b => {
					b.__tobecopied__.compute()
				})

				// very unsafe, we should not do this
				graph.getOutputBlocks(ifthenelse).forEach(b => b.__ifoutput__ = true)
				graph.blocks.filter(b => b.__ifoutput__).forEach(b => {
					delete b.__tobecopied__
				})

				// Stuff in the branches must not be copied ofc
				graph.blocks.filter(b => b.if_owners.map(i => i.ifblock).includes(ifthenelse)).forEach(b => {
					delete b.__tobecopied__
				})

				// We're just interested in the bool
				graph.blocks.filter(b => b.__tobecopied__ != undefined).forEach(b => {
					b.__tobecopied__ = b.__tobecopied__.res
				})
				
				function visitBlock2(block) {
					if (block == ifthenelse)
						return "found"
					if (block.__tobecopied__ == undefined)
						block.__tobecopied__ = new MagicOR()
					if (block.operation == "DELAY1_EXPR") {
						block.__tobecopied__.res = false
						return
					}
					if (block.visited2)
						return
					block.visited2 = true

					graph.getInputBlocks(block).forEach(b => {
						let ret = visitBlock2(b)
						if (ret == "found") {
							//block.__ifoutput__ = true
							block.__tobecopied__.res = true
							return
						}
						block.__tobecopied__.add(b.__tobecopied__)
					})
				}

				// If an if has to be copied, all its blocks have to too
				graph.blocks.filter(b => b.__tobecopied__ && b.operation == "IF_THEN_ELSE").forEach(b => {
					graph.blocks.filter(bb => bb.if_owners.map(i => i.ifblock).includes(b)).forEach(bb => {
						bb.__tobecopied__ = true
					})
				})

				//graph.blocks.filter(b => b.operation == "TIMES_EXPR").forEach(b=>
				
				let tobecopied_blocks = graph.blocks.filter(b => b.__tobecopied__)
				let copied_subgraph = graph.cloneSubGraph(tobecopied_blocks)
				let ifinputblocks = graph.getInputBlocks(ifthenelse)

				// bring tobecopied_blocks in the first branch
				{
					// remove conections to the second branch
					let tobedeleted_connections = graph.connections.filter(c => 
									c.in.block.__tobecopied__
								&& 	c.out.block.if_owners.some(i => i.ifblock == ifthenelse && i.branch != 0))
					
					tobedeleted_connections.forEach(dc => graph.connections.splice(graph.connections.indexOf(dc), 1))

					// bring loops within the branch: use the branch outputs instead of the IF ones
					let tobeedited_connections = graph.connections.filter(c => 
							c.out.block.__tobecopied__ 
						&& 	c.in.block.__ifoutput__ )
					tobeedited_connections.forEach(c => {
							let index = c.in.block.ifoutputindex
							c.in = ifinputblocks[1 + index].output_ports[0]
						})
				}

				// bring copied_subgraph in the second branch
				{
					let tobedeleted_connections = copied_subgraph.connections.filter(c =>
							copied_subgraph.blocks.includes(c.in.block) 
						&& 	c.out.block.if_owners.some(i => i.ifblock == ifthenelse && i.branch != 1))
					tobedeleted_connections.forEach(dc => copied_subgraph.connections.splice(copied_subgraph.connections.indexOf(dc), 1))

					let tobeedited_connections = copied_subgraph.connections.filter(
						c => 	copied_subgraph.blocks.includes(c.out.block) 
							&& 	c.in.block.__ifoutput__ )
					tobeedited_connections.forEach(c => {
							let index = c.in.block.ifoutputindex
							c.in = ifinputblocks[1 + index + ((ifthenelse.input_ports.length - 1) / 2)].output_ports[0]
						})
				}

				//graph.blocks.filter(b => b.operation == "TIMES_EXPR").forEach(b=>
			
				// Let's put the variables out
				// The inner variables of the "inner" IFs must not be put out
				let copiedifs = graph.blocks.filter(b =>
					b.operation == "IF_THEN_ELSE" && b.__tobecopied__)
				let copiedifinnervariables = graph.blocks.filter(b =>
					b.operation == "VAR" && b.if_owners.map(i => i.ifblock).some(ib => copiedifs.includes(ib)))
				let variables = graph.blocks.filter(b => 
					b.__tobecopied__ && !copiedifinnervariables.includes(b)).filter(b => b.operation == "VAR")


				variables.forEach(v => {
					ifthenelse.output_ports.push(new Port(ifthenelse))
					let newoutport = ifthenelse.output_ports[ifthenelse.output_ports.length - 1]
					let i = ifthenelse.output_ports.length
					ifthenelse.input_ports.splice(i, 0, new Port(ifthenelse))					
					ifthenelse.input_ports.push(new Port(ifthenelse))
					let newinport1 = ifthenelse.input_ports[i]
					let newinport2 = ifthenelse.input_ports[ifthenelse.input_ports.length - 1]

					let newblockvar = new Block(1, 1, "VAR", v.id, v.postfix, NaN, v.if_owners)
					newblockvar.ifoutputindex = ifthenelse.output_ports.length - 1
					newblockvar.block_init = v.block_init

					graph.connections.filter(c => c.in.block == v && !c.out.block.if_owners.some(i => i.ifblock == ifthenelse)).forEach(c => {
						let c2 = copied_subgraph.connections.find(cc => cc.in.block == c.in.block.__son__ && cc.out == c.out)
						c.in = newblockvar.output_ports[0]
						copied_subgraph.connections.splice(copied_subgraph.connections.indexOf(c2), 1)
					})

					graph.connections.filter(c => c.in.block == v && c.out.block.operation == 'DELAY1_EXPR').forEach(c => {
						c.in = newblockvar.output_ports[0]
					})
					copied_subgraph.connections.filter(c => c.in.block == v.__son__ && c.out.block.operation == 'DELAY1_EXPR').forEach(c => {
						c.in = newblockvar.output_ports[0]
					})

					graph.connections.push(new Connection(newoutport, newblockvar.input_ports[0]))
					graph.connections.push(new Connection(v.output_ports[0], newinport1))
					graph.connections.push(new Connection(v.__son__.output_ports[0], newinport2))

					let oid = graph.output_ports.indexOf(v.output_ports[0])
					if (oid != -1) {
						graph.output_ports[oid] = newblockvar.output_ports[0]
					}


					graph.blocks.push(newblockvar)
				})

				tobecopied_blocks.forEach(b => {
					b.if_owners.push({ifblock: ifthenelse, branch: 0})
					b.postfix = b.postfix + "_b0"
				})
				copied_subgraph.blocks.forEach(b => {
					b.if_owners.push({ifblock: ifthenelse, branch: 1})
					b.postfix = b.postfix + "_b1"
				})

				graph.merge(copied_subgraph)

				graph.blocks.forEach(b => {
					delete b.__tobecopied__
					delete b.visited2
					delete b.__ifoutput__
				})

				ifthenelse.handled = true

			}

			graph.blocks.forEach(b => {
				delete b.visited1
				delete b.handled
			})

			function MagicOR (...init) {
				let self = this
				this.ops = []
				this.add = function (...x) {
					for (let k of x)
						this.ops.push(k)
					return this
				}
				this.res = undefined
				this.compute = function (stack = []) {
					if (self.res != undefined)
						return self.res
					if (stack.includes(self)) 
						return undefined
					stack.push(self)
					let left = false
					for (let o of self.ops) {
						let r = o.compute([...stack])
						if (r != undefined) {
							if (r) {
								self.res = true
								break
							}
						}
						else
							left = true
					}
					if (self.res == undefined) {
						if (left)
							return undefined
						else
							self.res = false
					}					
					for (let o of self.ops)
						o.compute([...stack])
					return self.res
				}
				for (i of init)
					self.add(i)
			}
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
					visitBlock(p.block, p.block.label())
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
	function getIndexer (target_lang, index) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd', 'js'].includes(target_lang))
			return "[" + index + "]"
		else if (target_lang == 'MATLAB')
			return "(" + index + ")"
	}

	function getNumber(target_lang, n) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd'].includes(target_lang))
			return n + ((n.includes('.') || n.toLowerCase().includes('e')) ? 'f' : '.0f');
		else if (['MATLAB', 'js'].includes(target_lang))
			return n;
		return n;
	}

	function getIdPrefix(target_lang) {
		if (['C', 'yaaaeapa'].includes(target_lang))
			return "instance->"
		else if (['js'].includes(target_lang))
			return "this."
		else
			return ""
	}
	function getConstType(target_lang) {
		if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd'].includes(target_lang))
			return "const float "
		else if (['js'].includes(target_lang))
			return "const "
		else
			return ""
	}

	function convert(doT, templates, target_lang, graph, graph_init, schedule, schedule_init) {
		
		const ct = getConstType(target_lang)
		var MagicStringProto = {
			s: null,
			add: function(...x) {
				for (let k of x) {
					if (k == undefined) {
						throw new Error(k)
					}
					this.s.push(k)
				}
				return this
			},
			toString: function(){
				let str = this.is_used_locally ? ct : ""
				for (let p of this.s)
					str += p.toString()
				return str
			}
		}
		function MagicString(...init) {
			var m = Object.create(MagicStringProto);
			m.s = []
			for (let i of init)
				m.add(i)	
			return m;
		}

		let program = {
			class_name: 	graph.id,
			control_inputs: graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block.label()),
			audio_inputs: 	graph.input_ports.filter(p => p.update_rate == 3).map(p => p.block.label()),
			outputs: 		[],

			declarations1: 	[],
			declarations2:  [],

			init: 			[],

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
	
		graph.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = MagicString()))
		graph_init.blocks.forEach(block => block.output_ports.forEach(oport => oport.code = MagicString()))


		graph.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')
		graph.output_ports.forEach(op => op.block.operation = "VAR_OUT")
		graph_init.input_ports.forEach(ip => ip.block.operation = 'VAR_IN')

		const id_prefix_ = getIdPrefix(target_lang);

		schedule.forEach(block => convertBlock(block))
		schedule_init.forEach(block => convertBlockInit(block))

		for (let outi = 0; outi < graph.output_ports.length; outi++) {
			program.outputs[outi] = graph.output_ports[outi].block.label() + '_out_';
			appendAssignment(program.outputs[outi] + getIndexer(target_lang, 'i'), graph.output_ports[outi].code, 5, null)
		}

		groupControls()

		graph.input_ports.filter(p => p.update_rate == 2).map(p => p.block).forEach(function (block) {
			program.declarations2.push(MagicString(block.output_ports[0].code));
			program.init.push(MagicString(block.output_ports[0].code, " = ", getNumber(target_lang, block.block_init.output_ports[0].code.toString())));
		})

		doT.templateSettings.strip = false

		if (target_lang == 'C') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
				{ name: graph.id + ".c", str: doT.template(templates["C_c"])(program) },
			]
		}
		else if (target_lang == 'cpp') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
				{ name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) }
			]
		}
		else if (target_lang == 'VST2') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
				{ name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) },
				{ name: graph.id + "_vst2_wrapper.h", str: doT.template(templates["vst2_wrapper_h"])(program) },
				{ name: graph.id + "_vst2_wrapper.cpp", str: doT.template(templates["vst2_wrapper_cpp"])(program) }
			]
		}
		else if (target_lang == 'yaaaeapa') {
			return [
				{ name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
				{ name: graph.id + ".c", str: doT.template(templates["C_c"])(program) },
				{ name: graph.id + "_yaaaeapa_wrapper.c", str: doT.template(templates["yaaaeapa_wrapper_c"])(program) }
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
		else if (target_lang == "d") {
			return [
				{ name: "d_processor.d", str: doT.template(templates["d_processor"])(program) }
			]
		}

		function convertBlock(block) {
			const input_blocks = graph.getInputBlocks(block)
			const output_blocks = graph.getOutputBlocks(block)

			const input_blocks_code = input_blocks.map(b => b.output_ports[0].code)
			const update_rate = block.output_ports[0].update_rate
			const code = block.output_ports[0].code

			const auxcode = MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))
			if (is_used_locally && block.if_owners.length > 0) {
				let bb = block.if_owners[block.if_owners.length - 1]
				is_used_locally = output_blocks.every(b => b.if_owners.some(i => i.ifblock == bb.ifblock && i.branch == bb.branch))
				if (output_blocks.some(b => b.operation == "DELAY1_EXPR"))
					is_used_locally = false;
			}
			const id_prefix = is_used_locally || update_rate == 0 ? "" : id_prefix_;

			if (block.ifoutputindex != undefined && !isNaN(block.ifoutputindex)) {
				code.add(id_prefix_, block.label())
				appendAssignment(code, "",  666, null, true, false, null)
				return
			}

			switch (block.operation) {
				case 'VAR':
					if (input_blocks[0].operation == 'NUMBER')
						code.add(input_blocks_code[0])
					else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label())
						appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 3) {
						code.add(block.label(), getIndexer(target_lang, 'i'))
					}
					else if (update_rate == 2)
						code.add(id_prefix_, block.label())
					return
				case 'VAR_OUT':
					code.add(id_prefix, block.label())
					appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
					return
				case 'DELAY1_EXPR':
					const id = '_delayed_' + extra_vars_n++
					code.add(id_prefix_, id)
					appendAssignment(code, input_blocks_code[0], 4, block.control_dependencies, false, false, block.if_owners)
					appendAssignment(code, input_blocks[0].block_init.output_ports[0].code, -1, null, true, false, block.if_owners)
					return
				case 'NUMBER':
					code.add(getNumber(target_lang, block.val.toString()));
					return
				case 'SAMPLERATE':
					code.add(id_prefix_, 'fs')
					return
				case 'IF_THEN_ELSE':
					if (['C', 'cpp', 'VST2', 'yaaaeapa', 'd', 'js'].includes(target_lang)) {
						code.add("if (", input_blocks_code[0], ') {\n')
						code.add('_branch0_') // 3
						code.add("\n} else {\n")
						code.add('_branch1_') // 5
						code.add("\n}\n")
					}
					else if (target_lang == 'MATLAB') {
						code.add("if (", input_blocks_code[0], ')\n')
						code.add('_branch0_') // 3
						code.add("\nelse\n")
						code.add('_branch1_') // 5
						code.add("\nendif\n")
					}
					appendIfStatement(block, code, input_blocks[0].output_ports[0].update_rate, block.if_owners, output_blocks, input_blocks, block.control_dependencies)
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
					auxcode.add(block.id, '(')
					for (let ii = 0; ii < input_blocks_code.length; ii++) {
						auxcode.add(input_blocks_code[ii])
						if (ii != input_blocks_code.length - 1)
							auxcode.add(', ')
					}
					auxcode.add(')')
					break
				case 'OR_EXPR':
					auxcode.add('(', input_blocks_code[0], ' || ', input_blocks_code[1], ')')
					break
				case 'AND_EXPR':
					auxcode.add('(', input_blocks_code[0], ' && ', input_blocks_code[1], ')')
					break
				case 'EQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' == ', input_blocks_code[1], ')')
					break
				case 'NOTEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' != ', input_blocks_code[1], ')')
					break
				case 'LESS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' < ', input_blocks_code[1], ')')
					break
				case 'LESSEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' <= ', input_blocks_code[1], ')')
					break
				case 'GREATER_EXPR':
					auxcode.add('(', input_blocks_code[0], ' > ', input_blocks_code[1], ')')
					break
				case 'GREATEREQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' >= ', input_blocks_code[1], ')')
					break
				case 'NOT_EXPR':
					auxcode.add('!(', input_blocks_code[0], ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
				code.add(id_prefix, program.class_name + '_extra_' + extra_vars_n++)
				appendAssignment(code, auxcode, update_rate, block.control_dependencies, true, is_used_locally, block.if_owners)
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

			const auxcode = MagicString()

			let is_used_locally = true
			is_used_locally = output_blocks.every(b => b.output_ports[0].update_rate == update_rate)
			if (update_rate == 2 && is_used_locally)
				is_used_locally = output_blocks.every(b => checkSetEquality(b.control_dependencies, block.control_dependencies))

			const id_prefix = is_used_locally ? "" : id_prefix_;

			switch (block.operation) {
				case 'VAR':
					if (input_blocks[0].operation == 'NUMBER')
						code.add(input_blocks_code[0])
					else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
						code.add(id_prefix, block.label())
						appendAssignment(code, input_blocks_code[0], level, block.control_dependencies, true, is_used_locally)
					}
					else
						code.add(input_blocks_code[0])
					return
				case 'VAR_IN':
					if (update_rate == 0)
						code.add(block.val) // This surely is a number
					else
						throw new Error("Unexpected update_rate in init graph " + block + ": " + update_rate)
					return
				case 'DELAY1_EXPR':
					code.add(input_blocks_code[0])
					return
				case 'NUMBER':
					code.add(getNumber(target_lang, block.val.toString()));
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
					auxcode.add(block.id, '(')
					for (let ii = 0; ii < input_blocks_code.length; ii++) {
						auxcode.add(input_blocks_code[ii])
						if (ii != input_blocks_code.length - 1)
							auxcode.add(', ')
					}
					auxcode.add(')')
					break;
				case 'OR_EXPR':
					auxcode.add('(', input_blocks_code[0], ' || ', input_blocks_code[1], ')')
					break
				case 'AND_EXPR':
					auxcode.add('(', input_blocks_code[0], ' && ', input_blocks_code[1], ')')
					break
				case 'EQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' == ', input_blocks_code[1], ')')
					break
				case 'NOTEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' != ', input_blocks_code[1], ')')
					break
				case 'LESS_EXPR':
					auxcode.add('(', input_blocks_code[0], ' < ', input_blocks_code[1], ')')
					break
				case 'LESSEQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' <= ', input_blocks_code[1], ')')
					break
				case 'GREATER_EXPR':
					auxcode.add('(', input_blocks_code[0], ' > ', input_blocks_code[1], ')')
					break
				case 'GREATEREQUAL_EXPR':
					auxcode.add('(', input_blocks_code[0], ' >= ', input_blocks_code[1], ')')
					break
				case 'NOT_EXPR':
					auxcode.add('!(', input_blocks_code[0], ')')
					break

				default:
					throw new Error("Unexpected block operation: " + block.operation)
			}

			if (block.output_ports[0].toBeCached) {
				code.add(id_prefix, program.class_name + '_extraI_' + extra_vars_n++)
				appendAssignment(code, auxcode, level, block.control_dependencies, true, is_used_locally)
			}
			else
				code.add(auxcode)
		}

		function appendAssignment(left, right, level, control_dependencies, to_be_declared, is_used_locally, if_owners) {
			let stmt = MagicString(left, ' = ', right)
			stmt.if_owners = if_owners

			if (is_used_locally) {
				stmt.is_used_locally = true
			}
			else {
				if (to_be_declared && level != 0) {
					program.declarations1.push(left)
					program.init.push(MagicString(left, ' = ', getNumber(target_lang, "0")))
				}
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

		function appendIfStatement(block, code, cond_level, if_owners, output_blocks, input_blocks, control_dependencies) {

			if (block.output_ports.length != output_blocks.length)
				throw new Error("Something is wrong")

			const levels = ["constant_rate", "sampling_rate", "controls_rate", "audio_rate"]

			for (let lvl = cond_level; lvl < levels.length; lvl++) {
				let out_i = []
				for (let i = 0; i < block.output_ports.length; i++) {
					let ur = block.output_ports[i].update_rate
					if (ur == lvl || (lvl == cond_level && ur <= lvl)) {
						out_i.push(i)
					}
				}
				if (out_i.length == 0)
					continue

				let stmts = program[levels[lvl]].filter(s => s.if_owners[s.if_owners.length - 1] && s.if_owners[s.if_owners.length - 1].ifblock == block)
				let b0 = stmts.filter(s => s.if_owners[s.if_owners.length - 1].branch == 0)
				let b1 = stmts.filter(s => s.if_owners[s.if_owners.length - 1].branch == 1)

				for (let i of out_i) {
					b0.push(MagicString(
						output_blocks[i].output_ports[0].code, 
						' = ', 
						input_blocks[i + 1].output_ports[0].code,
					))

					b1.push(MagicString(
						output_blocks[i].output_ports[0].code,
						' = ',
						input_blocks[i + 1 + block.output_ports.length].output_ports[0].code
					))
				}

				b0.forEach(s => s.add(';\n'))
				b1.forEach(s => s.add(';\n'))

				let newcode = MagicString(...code.s)

				newcode.s.splice(newcode.s.indexOf('_branch0_'), 1, ...b0)
				newcode.s.splice(newcode.s.indexOf('_branch1_'), 1, ...b1)

				newcode.control_dependencies = control_dependencies
				newcode.if_owners = if_owners
				
				program[levels[lvl]] = program[levels[lvl]].filter(s => !stmts.includes(s))
				program[levels[lvl]].push(newcode)
			}
		}

		function groupControls() {
			var Group = function (set) {
				let self = this
				this.label = Array.from(set).join('_')
				this.set = set
				this.cardinality = set.size
				this.equals = (s) => checkSetEquality(self.set, s)
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

	function checkSetsInclusion(A, B) { // if A is included in B
		return Array.from(A).every(Av => Array.from(B).some(Bv => Av == Bv))
	}
	function checkSetEquality(A, B) {
		return checkSetsInclusion(A, B) && checkSetsInclusion(B, A)
	}


	exports["convert"] = convert;
}())
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
					"matlab": 			String(Buffer("ZnVuY3Rpb24gW3t7PWl0Lm91dHB1dHMuam9pbignLCAnKX19XSA9IHt7PWl0LmNsYXNzX25hbWV9fSh7ez1pdC5hdWRpb19pbnB1dHMuam9pbignLCAnKX19e3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSx7ez8/fX1uU2FtcGxlcyx7ez99fSBmc3t7P2l0LmNvbnRyb2xfaW5wdXRzLmxlbmd0aCA+IDB9fSx7ez99fSB7ez1pdC5jb250cm9sX2lucHV0cy5qb2luKCcsICcpfX0pCgogICUgY29uc3RhbnRzCgogIHt7fml0LmNvbnN0YW50X3JhdGU6Y319e3s9Y319OwogIHt7fn19CgogICUgZnMKCiAge3t+aXQuc2FtcGxpbmdfcmF0ZTpzfX17ez1zfX07CiAge3t+fX0KCgogICUgY29udHJvbGxpL2NvZWZmaWNpZW50aQoKICB7e35pdC5jb250cm9sc19yYXRlOmN9fSAKICAlIHt7PWMubGFiZWx9fQogIHt7fmMuc3RtdHM6IHN9fQogIHt7PXN9fTt7e359fQogIHt7fn19CiAgCgogIAogICUgaW5pdCBkZWxheQoKICB7e35pdC5yZXNldDE6cn19e3s9cn19OwogIHt7fn19CiAge3t+aXQucmVzZXQyOnJ9fXt7PXJ9fTsKICB7e359fQogIAogIAogIGZvciBpID0gMTp7ez9pdC5hdWRpb19pbnB1dHMubGVuZ3RoID4gMH19bGVuZ3RoKHt7PWl0LmF1ZGlvX2lucHV0c1swXX19KXt7Pz99fW5TYW1wbGVze3s/fX0KCiAgICAlIGF1ZGlvIHJhdGUKCiAgICB7e35pdC5hdWRpb19yYXRlOiBhfX0KICAgIHt7PWF9fTt7e359fQoKICAgICUgZGVsYXkgdXBkYXRlcwogICAgCiAgICB7e35pdC5kZWxheV91cGRhdGVzOnV9fXt7PXV9fTsKICAgIHt7fn19CgogICAgJSBvdXRwdXQKCiAgICB7e35pdC5vdXRwdXRfdXBkYXRlczp1fX0KICAgIHt7PXV9fTt7e359fQogICAgCiAgZW5kZm9yCgplbmRmdW5jdGlvbg==","base64")),
					"C_h": 				String(Buffer("I2lmbmRlZiBfe3s9aXQuY2xhc3NfbmFtZS50b1VwcGVyQ2FzZSgpfX1fSAojZGVmaW5lIF97ez1pdC5jbGFzc19uYW1lLnRvVXBwZXJDYXNlKCl9fV9ICgp7ez9pdC5jb250cm9sX2lucHV0cy5sZW5ndGggPiAwfX0KZW51bSB7Cgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCXBfe3s9Y319LHt7fn19Cn07Cnt7P319CgpzdHJ1Y3QgX3t7PWl0LmNsYXNzX25hbWV9fSB7Cgl7e35pdC5kZWNsYXJhdGlvbnMxOmR9fQoJZmxvYXQge3s9ZC50b1N0cmluZygpLnJlcGxhY2UoImluc3RhbmNlLT4iLCAiIil9fTt7e359fQoJCgl7e35pdC5kZWNsYXJhdGlvbnMyOmR9fQoJZmxvYXQge3s9ZC50b1N0cmluZygpLnJlcGxhY2UoImluc3RhbmNlLT4iLCAiIil9fTt7e359fQoKCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJZmxvYXQge3s9Y319X3oxOwoJY2hhciB7ez1jfX1fQ0hBTkdFRDsKCXt7fn19CgoJZmxvYXQgZnM7CgljaGFyIGZpcnN0UnVuOwp9Owp0eXBlZGVmIHN0cnVjdCBfe3s9aXQuY2xhc3NfbmFtZX19IHt7PWl0LmNsYXNzX25hbWV9fTsKCgp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fV9pbml0KHt7PWl0LmNsYXNzX25hbWV9fSAqaW5zdGFuY2UpOwp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fV9zZXRfc2FtcGxlX3JhdGUoe3s9aXQuY2xhc3NfbmFtZX19ICppbnN0YW5jZSwgZmxvYXQgc2FtcGxlX3JhdGUpOwp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fV9yZXNldCh7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlKTsKdm9pZCB7ez1pdC5jbGFzc19uYW1lfX1fcHJvY2Vzcyh7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlLCB7ez9pdC5hdWRpb19pbnB1dHMubGVuZ3RoID4gMH19IHt7PWl0LmF1ZGlvX2lucHV0cy5tYXAoeCA9PiAnY29uc3QgZmxvYXQgKicgKyB4KS5qb2luKCcsICcpfX0sIHt7P319e3s/aXQub3V0cHV0cy5sZW5ndGggPiAwfX17ez1pdC5vdXRwdXRzLm1hcCh4ID0+ICdmbG9hdCAqJyArIHgpLmpvaW4oJywgJyl9fSwge3s/fX1pbnQgblNhbXBsZXMpOwpmbG9hdCB7ez1pdC5jbGFzc19uYW1lfX1fZ2V0X3BhcmFtZXRlcih7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlLCBpbnQgaW5kZXgpOwp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fV9zZXRfcGFyYW1ldGVyKHt7PWl0LmNsYXNzX25hbWV9fSAqaW5zdGFuY2UsIGludCBpbmRleCwgZmxvYXQgdmFsdWUpOwoKI2VuZGlm","base64")),
					"C_c": 				String(Buffer("I2luY2x1ZGUgInt7PWl0LmNsYXNzX25hbWV9fS5oIgoKe3t+aXQuY29uc3RhbnRfcmF0ZTpjfX1zdGF0aWMgY29uc3QgZmxvYXQge3s9Y319Owp7e359fQoKdm9pZCB7ez1pdC5jbGFzc19uYW1lfX1faW5pdCh7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlKSB7Cgl7e35pdC5pbml0OmR9fQoJe3s9ZH19O3t7fn19Cn0KCnZvaWQge3s9aXQuY2xhc3NfbmFtZX19X3Jlc2V0KHt7PWl0LmNsYXNzX25hbWV9fSAqaW5zdGFuY2UpIHsKCWluc3RhbmNlLT5maXJzdFJ1biA9IDE7Cn0KCnZvaWQge3s9aXQuY2xhc3NfbmFtZX19X3NldF9zYW1wbGVfcmF0ZSh7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlLCBmbG9hdCBzYW1wbGVfcmF0ZSkgewoJaW5zdGFuY2UtPmZzID0gc2FtcGxlX3JhdGU7Cgl7e35pdC5zYW1wbGluZ19yYXRlOnN9fXt7PXN9fTsKCXt7fn19Cn0KCnZvaWQge3s9aXQuY2xhc3NfbmFtZX19X3Byb2Nlc3Moe3s9aXQuY2xhc3NfbmFtZX19ICppbnN0YW5jZSwge3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSB7ez1pdC5hdWRpb19pbnB1dHMubWFwKHggPT4gJ2NvbnN0IGZsb2F0IConICsgeCkuam9pbignLCAnKX19LCB7ez99fXt7P2l0Lm91dHB1dHMubGVuZ3RoID4gMH19e3s9aXQub3V0cHV0cy5tYXAoeCA9PiAnZmxvYXQgKicgKyB4KS5qb2luKCcsICcpfX0sIHt7P319aW50IG5TYW1wbGVzKSB7CglpZiAoaW5zdGFuY2UtPmZpcnN0UnVuKSB7e3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJaW5zdGFuY2UtPnt7PWN9fV9DSEFOR0VEID0gMTt7e359fQoJfQoJZWxzZSB7e3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJaW5zdGFuY2UtPnt7PWN9fV9DSEFOR0VEID0gaW5zdGFuY2UtPnt7PWN9fSAhPSBpbnN0YW5jZS0+e3s9Y319X3oxO3t7fn19Cgl9Cgl7e35pdC5jb250cm9sc19yYXRlOmN9fQoJaWYgKHt7PUFycmF5LmZyb20oYy5zZXQpLm1hcChlID0+ICJpbnN0YW5jZS0+IiArIGUgKyAiX0NIQU5HRUQiKS5qb2luKCcgfCAnKX19KSB7e3t+Yy5zdG10czogc319CgkJe3s9c319O3t7fn19Cgl9e3t+fX0KCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJaW5zdGFuY2UtPnt7PWN9fV9DSEFOR0VEID0gMDt7e359fQoKCWlmIChpbnN0YW5jZS0+Zmlyc3RSdW4pIHt7e35pdC5yZXNldDE6cn19CgkJe3s9cn19O3t7fn19CgkJe3t+aXQucmVzZXQyOnJ9fQoJCXt7PXJ9fTt7e359fQoJfQoKCWZvciAoaW50IGkgPSAwOyBpIDwgblNhbXBsZXM7IGkrKykgewoJCXt7fml0LmF1ZGlvX3JhdGU6IGF9fQoJCXt7PWF9fTt7e359fQoJCQoJCXt7fml0LmRlbGF5X3VwZGF0ZXM6dX19e3s9dX19OwoJCXt7fn19CgkJe3t+aXQub3V0cHV0X3VwZGF0ZXM6dX19CgkJe3s9dX19O3t7fn19Cgl9CgoJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319CglpbnN0YW5jZS0+e3s9Y319X3oxID0gaW5zdGFuY2UtPnt7PWN9fTt7e359fQoJaW5zdGFuY2UtPmZpcnN0UnVuID0gMDsKfQoKZmxvYXQge3s9aXQuY2xhc3NfbmFtZX19X2dldF9wYXJhbWV0ZXIoe3s9aXQuY2xhc3NfbmFtZX19ICppbnN0YW5jZSwgaW50IGluZGV4KSB7Cglzd2l0Y2ggKGluZGV4KSB7CgkJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319Y2FzZSBwX3t7PWN9fToKCQkJcmV0dXJuIGluc3RhbmNlLT57ez1jfX07CgkJe3t+fX0KCX0KfQoKdm9pZCB7ez1pdC5jbGFzc19uYW1lfX1fc2V0X3BhcmFtZXRlcih7ez1pdC5jbGFzc19uYW1lfX0gKmluc3RhbmNlLCBpbnQgaW5kZXgsIGZsb2F0IHZhbHVlKSB7Cglzd2l0Y2ggKGluZGV4KSB7CgkJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319Y2FzZSBwX3t7PWN9fToKCQkJaW5zdGFuY2UtPnt7PWN9fSA9IHZhbHVlOwoJCQlicmVhazsKCQl7e359fQoJfQp9","base64")),
					"cpp_h": 			String(Buffer("Y2xhc3Mge3s9aXQuY2xhc3NfbmFtZX19CnsKcHVibGljOgoJdm9pZCBzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpOwoJdm9pZCByZXNldCgpOwoJdm9pZCBwcm9jZXNzKHt7PWl0LmF1ZGlvX2lucHV0cy5jb25jYXQoaXQub3V0cHV0cykubWFwKHggPT4gJ2Zsb2F0IConICsgeCkuam9pbignLCAnKX19LCBpbnQgblNhbXBsZXMpOwp7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWZsb2F0IGdldHt7PWN9fSgpOwoJdm9pZCBzZXR7ez1jfX0oZmxvYXQgdmFsdWUpO3t7fn19Cgpwcml2YXRlOgoKCXt7fml0LmluaXQ6ZH19CglmbG9hdCB7ez1kfX07e3t+fX0KCgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCWZsb2F0IHt7PWN9fV96MTsKCWNoYXIge3s9Y319X0NIQU5HRUQ7Cgl7e359fQoKCWZsb2F0IGZzOwoJY2hhciBmaXJzdFJ1bjsKCn07Cg==","base64")),
					"cpp_cpp": 			String(Buffer("I2luY2x1ZGUgInt7PWl0LmNsYXNzX25hbWV9fS5oIgoKCnt7fml0LmNvbnN0YW50X3JhdGU6Y319c3RhdGljIGNvbnN0IGZsb2F0IHt7PWN9fTsKe3t+fX0KCnZvaWQge3s9aXQuY2xhc3NfbmFtZX19OjpyZXNldCgpCnsKCWZpcnN0UnVuID0gMTsKfQoKdm9pZCB7ez1pdC5jbGFzc19uYW1lfX06OnNldFNhbXBsZVJhdGUoZmxvYXQgc2FtcGxlUmF0ZSkKewoJZnMgPSBzYW1wbGVSYXRlOwoJe3t+aXQuc2FtcGxpbmdfcmF0ZTpzfX17ez1zfX07Cgl7e359fQp9Cgp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fTo6cHJvY2Vzcyh7ez1pdC5hdWRpb19pbnB1dHMuY29uY2F0KGl0Lm91dHB1dHMpLm1hcCh4ID0+ICdmbG9hdCAqJyArIHgpLmpvaW4oJywgJyl9fSwgaW50IG5TYW1wbGVzKQp7CglpZiAoZmlyc3RSdW4pIHt7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQl7ez1jfX1fQ0hBTkdFRCA9IDE7e3t+fX0KCX0KCWVsc2Uge3t7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJCXt7PWN9fV9DSEFOR0VEID0ge3s9Y319ICE9IHt7PWN9fV96MTt7e359fQoJfQoJe3t+aXQuY29udHJvbHNfcmF0ZTpjfX0KCWlmICh7ez1BcnJheS5mcm9tKGMuc2V0KS5tYXAoZSA9PiBlICsgIl9DSEFOR0VEIikuam9pbignIHwgJyl9fSkge3t7fmMuc3RtdHM6IHN9fQoJCXt7PXN9fTt7e359fQoJfXt7fn19Cgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCXt7PWN9fV9DSEFOR0VEID0gMDt7e359fQoKCWlmIChmaXJzdFJ1bikge3t7fml0LnJlc2V0MTpyfX0KCQl7ez1yfX07e3t+fX0KCQl7e35pdC5yZXNldDI6cn19CgkJe3s9cn19O3t7fn19Cgl9CgoJZm9yIChpbnQgaSA9IDA7IGkgPCBuU2FtcGxlczsgaSsrKSB7CgkJe3t+aXQuYXVkaW9fcmF0ZTogYX19CgkJe3s9YX19O3t7fn19CgkJCgkJe3t+aXQuZGVsYXlfdXBkYXRlczp1fX17ez11fX07CgkJe3t+fX0KCQl7e35pdC5vdXRwdXRfdXBkYXRlczp1fX0KCQl7ez11fX07e3t+fX0KCX0KCgl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCXt7PWN9fV96MSA9IHt7PWN9fTt7e359fQoJZmlyc3RSdW4gPSAwOwp9Cgp7e35pdC5jb250cm9sX2lucHV0czogY319CmZsb2F0IHt7PWl0LmNsYXNzX25hbWV9fTo6Z2V0e3s9Y319KCkgewoJcmV0dXJuIHt7PWN9fTsKfQp2b2lkIHt7PWl0LmNsYXNzX25hbWV9fTo6c2V0e3s9Y319KGZsb2F0IHZhbHVlKSB7Cgl7ez1jfX0gPSB2YWx1ZTsKfQp7e359fQ==","base64")),
					"vst2_wrapper_h": 	String(Buffer("I2lmbmRlZiBfRUZGRUNUX0gKI2RlZmluZSBfRUZGRUNUX0gKCiNpbmNsdWRlICJhdWRpb2VmZmVjdHguaCIKI2luY2x1ZGUgInt7PWl0LmNsYXNzX25hbWV9fS5oIgoKY2xhc3MgRWZmZWN0IDogcHVibGljIEF1ZGlvRWZmZWN0WAp7CnB1YmxpYzoKCUVmZmVjdChhdWRpb01hc3RlckNhbGxiYWNrIGF1ZGlvTWFzdGVyKTsKCX5FZmZlY3QoKTsKCgl2aXJ0dWFsIHZvaWQgc2V0U2FtcGxlUmF0ZShmbG9hdCBzYW1wbGVSYXRlKTsKCXZpcnR1YWwgdm9pZCBwcm9jZXNzKGZsb2F0ICoqaW5wdXRzLCBmbG9hdCAqKm91dHB1dHMsIFZzdEludDMyIHNhbXBsZUZyYW1lcyk7Cgl2aXJ0dWFsIHZvaWQgcHJvY2Vzc1JlcGxhY2luZyhmbG9hdCAqKmlucHV0cywgZmxvYXQgKipvdXRwdXRzLCBWc3RJbnQzMiBzYW1wbGVGcmFtZXMpOwoJdmlydHVhbCB2b2lkIHNldFByb2dyYW1OYW1lKGNoYXIgKm5hbWUpOwoJdmlydHVhbCB2b2lkIGdldFByb2dyYW1OYW1lKGNoYXIgKm5hbWUpOwoJdmlydHVhbCBib29sIGdldFByb2dyYW1OYW1lSW5kZXhlZChWc3RJbnQzMiBjYXRlZ29yeSwgVnN0SW50MzIgaW5kZXgsIGNoYXIqIG5hbWUpOwoJdmlydHVhbCB2b2lkIHNldFBhcmFtZXRlcihWc3RJbnQzMiBpbmRleCwgZmxvYXQgdmFsdWUpOwoJdmlydHVhbCBmbG9hdCBnZXRQYXJhbWV0ZXIoVnN0SW50MzIgaW5kZXgpOwoJdmlydHVhbCB2b2lkIGdldFBhcmFtZXRlckxhYmVsKFZzdEludDMyIGluZGV4LCBjaGFyICpsYWJlbCk7Cgl2aXJ0dWFsIHZvaWQgZ2V0UGFyYW1ldGVyRGlzcGxheShWc3RJbnQzMiBpbmRleCwgY2hhciAqdGV4dCk7Cgl2aXJ0dWFsIHZvaWQgZ2V0UGFyYW1ldGVyTmFtZShWc3RJbnQzMiBpbmRleCwgY2hhciAqdGV4dCk7CgoJdmlydHVhbCBib29sIGdldEVmZmVjdE5hbWUoY2hhciAqbmFtZSk7Cgl2aXJ0dWFsIGJvb2wgZ2V0VmVuZG9yU3RyaW5nKGNoYXIgKnRleHQpOwoJdmlydHVhbCBib29sIGdldFByb2R1Y3RTdHJpbmcoY2hhciAqdGV4dCk7Cgl2aXJ0dWFsIFZzdEludDMyIGdldFZlbmRvclZlcnNpb24oKSB7IHJldHVybiAxMDAwOyB9Cgpwcml2YXRlOgoJY2hhciBwcm9ncmFtTmFtZVszMl07CgoJe3s9aXQuY2xhc3NfbmFtZX19IGluc3RhbmNlOwp9OwoKI2VuZGlm","base64")),
					"vst2_wrapper_cpp": String(Buffer("I2luY2x1ZGUgInt7PWl0LmNsYXNzX25hbWV9fV92c3QyX3dyYXBwZXIuaCIKCiNpbmNsdWRlIDxjc3RkbGliPgojaW5jbHVkZSA8Y3N0ZGlvPgojaW5jbHVkZSA8Y21hdGg+CiNpbmNsdWRlIDxhbGdvcml0aG0+CgpBdWRpb0VmZmVjdCAqY3JlYXRlRWZmZWN0SW5zdGFuY2UoYXVkaW9NYXN0ZXJDYWxsYmFjayBhdWRpb01hc3RlcikgeyByZXR1cm4gbmV3IEVmZmVjdChhdWRpb01hc3Rlcik7IH0KCkVmZmVjdDo6RWZmZWN0KGF1ZGlvTWFzdGVyQ2FsbGJhY2sgYXVkaW9NYXN0ZXIpIDogQXVkaW9FZmZlY3RYKGF1ZGlvTWFzdGVyLCAxLCB7ez1pdC5jb250cm9sX2lucHV0cy5sZW5ndGh9fSkgewoJc2V0TnVtSW5wdXRzKHt7PWl0LmF1ZGlvX2lucHV0cy5sZW5ndGh9fSk7CglzZXROdW1PdXRwdXRzKHt7PWl0Lm91dHB1dHMubGVuZ3RofX0pOwoJc2V0VW5pcXVlSUQoJ2Z4ZngnKTsKCURFQ0xBUkVfVlNUX0RFUFJFQ0FURUQoY2FuTW9ubykgKCk7CgljYW5Qcm9jZXNzUmVwbGFjaW5nKCk7CglzdHJjcHkocHJvZ3JhbU5hbWUsICJFZmZlY3QiKTsKCglpbnN0YW5jZSA9IHt7PWl0LmNsYXNzX25hbWV9fSgpOwp9CgpFZmZlY3Q6On5FZmZlY3QoKSB7fQoKYm9vbCBFZmZlY3Q6OmdldFByb2R1Y3RTdHJpbmcoY2hhciogdGV4dCkgeyBzdHJjcHkodGV4dCwgIkVmZmVjdCIpOyByZXR1cm4gdHJ1ZTsgfQpib29sIEVmZmVjdDo6Z2V0VmVuZG9yU3RyaW5nKGNoYXIqIHRleHQpIHsgc3RyY3B5KHRleHQsICJDaWFyYW1lbGxhIik7IHJldHVybiB0cnVlOyB9CmJvb2wgRWZmZWN0OjpnZXRFZmZlY3ROYW1lKGNoYXIqIG5hbWUpIHsgc3RyY3B5KG5hbWUsICJFZmZlY3QiKTsgcmV0dXJuIHRydWU7IH0KCnZvaWQgRWZmZWN0OjpzZXRQcm9ncmFtTmFtZShjaGFyICpuYW1lKSB7IHN0cmNweShwcm9ncmFtTmFtZSwgbmFtZSk7IH0Kdm9pZCBFZmZlY3Q6OmdldFByb2dyYW1OYW1lKGNoYXIgKm5hbWUpIHsgc3RyY3B5KG5hbWUsIHByb2dyYW1OYW1lKTsgfQoKYm9vbCBFZmZlY3Q6OmdldFByb2dyYW1OYW1lSW5kZXhlZChWc3RJbnQzMiBjYXRlZ29yeSwgVnN0SW50MzIgaW5kZXgsIGNoYXIqIG5hbWUpIHsKCWlmIChpbmRleCA9PSAwKSB7CgkJc3RyY3B5KG5hbWUsIHByb2dyYW1OYW1lKTsKCQlyZXR1cm4gdHJ1ZTsKCX0KCXJldHVybiBmYWxzZTsKfQoKdm9pZCBFZmZlY3Q6OnNldFBhcmFtZXRlcihWc3RJbnQzMiBpbmRleCwgZmxvYXQgdmFsdWUpIHsKCXN3aXRjaCAoaW5kZXgpIHsKCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJY2FzZSB7ez1pdC5jb250cm9sX2lucHV0cy5pbmRleE9mKGMpfX06CgkJaW5zdGFuY2Uuc2V0e3s9Y319KHZhbHVlKTsKCQlicmVhazt7e359fQoJfQp9CgpmbG9hdCBFZmZlY3Q6OmdldFBhcmFtZXRlcihWc3RJbnQzMiBpbmRleCkgewoJZmxvYXQgdiA9IDAuZjsKCXN3aXRjaCAoaW5kZXgpIHsKCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJY2FzZSB7ez1pdC5jb250cm9sX2lucHV0cy5pbmRleE9mKGMpfX06CgkJdiA9IGluc3RhbmNlLmdldHt7PWN9fSgpOwoJCWJyZWFrO3t7fn19Cgl9CglyZXR1cm4gdjsKfQoKdm9pZCBFZmZlY3Q6OmdldFBhcmFtZXRlck5hbWUoVnN0SW50MzIgaW5kZXgsIGNoYXIgKnRleHQpIHsKCWNvbnN0IGNoYXIgKm5hbWVzW10gPSB7IHt7PWl0LmNvbnRyb2xfaW5wdXRzLm1hcChjID0+ICdcIicgK2MrJ1wiJyl9fX07CglzdHJjcHkodGV4dCwgbmFtZXNbaW5kZXhdKTsKfQoKdm9pZCBFZmZlY3Q6OmdldFBhcmFtZXRlckRpc3BsYXkoVnN0SW50MzIgaW5kZXgsIGNoYXIgKnRleHQpIHsKCXRleHRbMF0gPSAnXDAnOwp9Cgp2b2lkIEVmZmVjdDo6Z2V0UGFyYW1ldGVyTGFiZWwoVnN0SW50MzIgaW5kZXgsIGNoYXIgKnRleHQpICB7Cgl0ZXh0WzBdID0gJ1wwJzsKfQoKdm9pZCBFZmZlY3Q6OnNldFNhbXBsZVJhdGUoZmxvYXQgc2FtcGxlUmF0ZSkgewoJaW5zdGFuY2Uuc2V0U2FtcGxlUmF0ZShzYW1wbGVSYXRlKTsKCWluc3RhbmNlLnJlc2V0KCk7Cn0KCnZvaWQgRWZmZWN0Ojpwcm9jZXNzKGZsb2F0ICoqaW5wdXRzLCBmbG9hdCAqKm91dHB1dHMsIFZzdEludDMyIHNhbXBsZUZyYW1lcykgewoJaW5zdGFuY2UucHJvY2Vzcyh7ez1pdC5hdWRpb19pbnB1dHMubWFwKGkgPT4gJ2lucHV0c1snK2l0LmF1ZGlvX2lucHV0cy5pbmRleE9mKGkpKyddJyl9fSwge3s9aXQub3V0cHV0cy5tYXAoaSA9PiAnb3V0cHV0c1snK2l0Lm91dHB1dHMuaW5kZXhPZihpKSsnXScpfX0sIHNhbXBsZUZyYW1lcyk7Cn0KCnZvaWQgRWZmZWN0Ojpwcm9jZXNzUmVwbGFjaW5nKGZsb2F0ICoqaW5wdXRzLCBmbG9hdCAqKm91dHB1dHMsIFZzdEludDMyIHNhbXBsZUZyYW1lcykgewoJaW5zdGFuY2UucHJvY2Vzcyh7ez1pdC5hdWRpb19pbnB1dHMubWFwKGkgPT4gJ2lucHV0c1snK2l0LmF1ZGlvX2lucHV0cy5pbmRleE9mKGkpKyddJyl9fSwge3s9aXQub3V0cHV0cy5tYXAoaSA9PiAnb3V0cHV0c1snK2l0Lm91dHB1dHMuaW5kZXhPZihpKSsnXScpfX0sIHNhbXBsZUZyYW1lcyk7Cn0=","base64")),
					"yaaaeapa_wrapper_c": String(Buffer("I2luY2x1ZGUgInt7PWl0LmNsYXNzX25hbWV9fS5oIgoKLy8gSW1wbGVtZW50aW5nIHRoZSB5YWFhZWFwYSBpbnRlcmZhY2UKCnt7PWl0LmNsYXNzX25hbWV9fSBpbnN0YW5jZTsKCnZvaWQgeWFhYWVhcGFfaW5pdCh2b2lkKSB7Cgl7ez1pdC5jbGFzc19uYW1lfX1faW5pdCgmaW5zdGFuY2UpOwp9CnZvaWQgeWFhYWVhcGFfZmluaSh2b2lkKSB7Cn0Kdm9pZCB5YWFhZWFwYV9zZXRfc2FtcGxlX3JhdGUoZmxvYXQgc2FtcGxlX3JhdGUpIHsKCXt7PWl0LmNsYXNzX25hbWV9fV9zZXRfc2FtcGxlX3JhdGUoJmluc3RhbmNlLCBzYW1wbGVfcmF0ZSk7Cn0Kdm9pZCB5YWFhZWFwYV9yZXNldCh2b2lkKSB7Cgl7ez1pdC5jbGFzc19uYW1lfX1fcmVzZXQoJmluc3RhbmNlKTsKfQp2b2lkIHlhYWFlYXBhX3Byb2Nlc3MoY29uc3QgZmxvYXQqKiB4LCBmbG9hdCoqIHksIGludCBuX3NhbXBsZXMpIHsKCXt7PWl0LmNsYXNzX25hbWV9fV9wcm9jZXNzKCZpbnN0YW5jZSwge3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fXt7fml0LmF1ZGlvX2lucHV0czphOml9fXhbe3s9aX19XXt7fn19LCB7ez99fXt7fml0Lm91dHB1dHM6bzppfX15W3t7PWl9fV17e359fSwgbl9zYW1wbGVzKTsKfQp2b2lkIHlhYWFlYXBhX3NldF9wYXJhbWV0ZXIoaW50IGluZGV4LCBmbG9hdCB2YWx1ZSkgewoJe3s9aXQuY2xhc3NfbmFtZX19X3NldF9wYXJhbWV0ZXIoJmluc3RhbmNlLCBpbmRleCwgdmFsdWUpOwp9CmZsb2F0IHlhYWFlYXBhX2dldF9wYXJhbWV0ZXIoaW50IGluZGV4KSB7CglyZXR1cm4ge3s9aXQuY2xhc3NfbmFtZX19X2dldF9wYXJhbWV0ZXIoJmluc3RhbmNlLCBpbmRleCk7Cn0Kdm9pZCB5YWFhZWFwYV9ub3RlX29uKGNoYXIgbm90ZSwgY2hhciB2ZWxvY2l0eSkgewoJKHZvaWQpbm90ZTsKCSh2b2lkKXZlbG9jaXR5Owp9CnZvaWQgeWFhYWVhcGFfbm90ZV9vZmYoY2hhciBub3RlKSB7Cgkodm9pZClub3RlOwp9CnZvaWQgeWFhYWVhcGFfcGl0Y2hfYmVuZChpbnQgYmVuZCkgewoJKHZvaWQpYmVuZDsKfQp2b2lkIHlhYWFlYXBhX21vZF93aGVlbChjaGFyIHdoZWVsKSB7Cgkodm9pZCl3aGVlbDsKfQoKaW50IHlhYWFlYXBhX3BhcmFtZXRlcnNfbiAJPSB7ez1pdC5jb250cm9sX2lucHV0cy5sZW5ndGh9fTsKaW50IHlhYWFlYXBhX2J1c2VzX2luX24gCT0gMTsKaW50IHlhYWFlYXBhX2J1c2VzX291dF9uIAk9IDE7CmludCB5YWFhZWFwYV9jaGFubmVsc19pbl9uIAk9IHt7PWl0LmF1ZGlvX2lucHV0cy5sZW5ndGh9fTsKaW50IHlhYWFlYXBhX2NoYW5uZWxzX291dF9uCT0ge3s9aXQub3V0cHV0cy5sZW5ndGh9fTsKLy92b2lkKiB5YWFhZWFwYV9kYXRhIAkJPSBOVUxMOwoKdm9pZCB5YWFhZWFwYV9nZXRfcGFyYW1ldGVyX2luZm8gKGludCBpbmRleCwgY2hhcioqIG5hbWUsIGNoYXIqKiBzaG9ydE5hbWUsIGNoYXIqKiB1bml0cywgY2hhciogb3V0LCBjaGFyKiBieXBhc3MsIGludCogc3RlcHMsIGZsb2F0KiBkZWZhdWx0VmFsdWVVbm1hcHBlZCkgewoJaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB7ez1pdC5jb250cm9sX2lucHV0cy5sZW5ndGh9fSkgcmV0dXJuOwoJc3dpdGNoIChpbmRleCkgewoJe3t+aXQuY29udHJvbF9pbnB1dHM6YzppfX0KCQljYXNlIHt7PWl9fToKCQkJaWYgKG5hbWUpICpuYW1lID0gKGNoYXIqKSAie3s9Y319IjsKCQkJaWYgKHNob3J0TmFtZSkgKnNob3J0TmFtZSA9IChjaGFyKikgInt7PWN9fSI7CgkJCWlmICh1bml0cykgKnVuaXRzID0gKGNoYXIqKSAiIjsKCQkJaWYgKG91dCkgKm91dCA9IDA7CgkJCWlmIChieXBhc3MpICpieXBhc3MgPSAwOwoJCQlpZiAoc3RlcHMpICpzdGVwcyA9IDA7CgkJCWlmIChkZWZhdWx0VmFsdWVVbm1hcHBlZCkgKmRlZmF1bHRWYWx1ZVVubWFwcGVkID0gMC5mOyAvLyBGaXgKCQkJYnJlYWs7Cgl7e359fQoJfQp9","base64")),
					"js_html": 			String(Buffer("PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPHRpdGxlPlBsdWdpbjwvdGl0bGU+CjxzY3JpcHQgdHlwZT0idGV4dC9qYXZhc2NyaXB0Ij4KCnZhciBub2RlOwp2YXIgY3R4Owp2YXIgaW5wdXROb2RlOwoKdmFyIGJlZ2luID0gYXN5bmMgZnVuY3Rpb24gKCkgewoJY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpOwoKCWF3YWl0IGN0eC5hdWRpb1dvcmtsZXQuYWRkTW9kdWxlKCJwcm9jZXNzb3IuanMiKTsKCglub2RlID0gbmV3IEF1ZGlvV29ya2xldE5vZGUoY3R4LCAiUGx1Z2luUHJvY2Vzc29yIiwgeyBvdXRwdXRDaGFubmVsQ291bnQ6IFsxXSB9KTsKCglub2RlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTsKCgl2YXIgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoeyBhdWRpbzogeyBhdXRvR2FpbkNvbnRyb2w6IGZhbHNlLCBlY2hvQ2FuY2VsbGF0aW9uOiBmYWxzZSwgbm9pc2VTdXBwcmVzc2lvbjogZmFsc2UsIGxhdGVuY3k6IDAuMDA1IH0gfSk7CglpbnB1dE5vZGUgPSBjdHguY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTsKCglpbnB1dE5vZGUuY29ubmVjdChub2RlKTsKCiAge3t+aXQuY29udHJvbF9pbnB1dHM6Y319CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInt7PWN9fSIpLm9uaW5wdXQgPSBoYW5kbGVJbnB1dDsge3t+fX0KICAKfTsKCmZ1bmN0aW9uIGhhbmRsZUlucHV0KGUpIHsKCW5vZGUucG9ydC5wb3N0TWVzc2FnZSh7dHlwZTogInBhcmFtQ2hhbmdlIiwgaWQ6IGUudGFyZ2V0LmlkLCB2YWx1ZTogZS50YXJnZXQudmFsdWV9KQp9Owo8L3NjcmlwdD4KPC9oZWFkPgo8Ym9keT4KICA8aDE+e3s9aXQuY2xhc3NfbmFtZX19PC9oMT4KICAKICB7e35pdC5jb250cm9sX2lucHV0czpjfX0KICA8bGFiZWwgZm9yPSJ7ez1jfX0iPnt7PWN9fTwvbGFiZWw+CiAgPGlucHV0IHR5cGU9InJhbmdlIiBpZD0ie3s9Y319IiBuYW1lPSJ7ez1jfX0iIG1pbj0iMCIgbWF4PSIxIiB2YWx1ZT0iMC41IiBzdGVwPSJhbnkiPjxicj57e359fQoKICA8YnV0dG9uIG9uY2xpY2s9ImJlZ2luKCkiPlN0YXJ0PC9idXR0b24+CjwvYm9keT4KPC9odG1sPgo=","base64")),
					"js_processor": 	String(Buffer("e3t+aXQuY29uc3RhbnRfcmF0ZTpjfX1jb25zdCB7ez1jfX07Cnt7fn19Cgp2YXIgUGx1Z2luID0gewoJaW5pdDogZnVuY3Rpb24gKCkgewoJCXRoaXMuZnMgPSAwOwoJCXRoaXMuZmlyc3RSdW4gPSAxOwoKCQl0aGlzLnBhcmFtcyA9IFt7ez1pdC5jb250cm9sX2lucHV0cy5tYXAoYyA9PiAnIicgKyBjICsgJyInKS5qb2luKCIsICIpfX1dOwoKCQl7e35pdC5pbml0OmR9fQoJCXt7PWR9fTt7e359fQoKCQl7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQl0aGlzLnt7PWN9fV96MSA9IDA7CgkJdGhpcy57ez1jfX1fQ0hBTkdFRCA9IHRydWU7CgkJe3t+fX0KCX0sCgoJcmVzZXQ6IGZ1bmN0aW9uICgpIHsKCQl0aGlzLmZpcnN0UnVuID0gMQoJfSwKCglzZXRTYW1wbGVSYXRlOiBmdW5jdGlvbiAoc2FtcGxlUmF0ZSkgewoJCXRoaXMuZnMgPSBzYW1wbGVSYXRlOwoJCXt7fml0LnNhbXBsaW5nX3JhdGU6c319e3s9c319OwoJCXt7fn19Cgl9LAoKCXByb2Nlc3M6IGZ1bmN0aW9uICh7ez1pdC5hdWRpb19pbnB1dHMuY29uY2F0KGl0Lm91dHB1dHMpLmpvaW4oJywgJyl9fSwgblNhbXBsZXMpIHsKCQlpZiAodGhpcy5maXJzdFJ1bikge3t7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJCQl0aGlzLnt7PWN9fV9DSEFOR0VEID0gdHJ1ZTt7e359fQoJCX0KCQllbHNlIHt7e35pdC5jb250cm9sX2lucHV0czpjfX0KCQkJdGhpcy57ez1jfX1fQ0hBTkdFRCA9IHRoaXMue3s9Y319ICE9IHRoaXMue3s9Y319X3oxO3t7fn19CgkJfQoKCQl7e35pdC5jb250cm9sc19yYXRlOmN9fQoJCWlmICh7ez1BcnJheS5mcm9tKGMuc2V0KS5tYXAoZSA9PiAidGhpcy4iICsgZSArICJfQ0hBTkdFRCIpLmpvaW4oJyB8ICcpfX0pIHt7e35jLnN0bXRzOiBzfX0KCQkJe3s9c319O3t7fn19CgkJfXt7fn19CgkJe3t+aXQuY29udHJvbF9pbnB1dHM6Y319CgkJdGhpcy57ez1jfX1fQ0hBTkdFRCA9IGZhbHNlO3t7fn19CgoJCWlmICh0aGlzLmZpcnN0UnVuKSB7IHt7fml0LnJlc2V0MTpyfX0KCQkJe3s9cn19O3t7fn19CgkJCXt7fml0LnJlc2V0MjpyfX0KCQkJe3s9cn19O3t7fn19CgkJfQoKCQlmb3IgKGxldCBpID0gMDsgaSA8IG5TYW1wbGVzOyBpKyspIHsKCQkJe3t+aXQuYXVkaW9fcmF0ZTogYX19CgkJCXt7PWF9fTt7e359fQoJCQkKCQkJe3t+aXQuZGVsYXlfdXBkYXRlczp1fX17ez11fX07CgkJCXt7fn19CgkJCXt7fml0Lm91dHB1dF91cGRhdGVzOnV9fQoJCQl7ez11fX07e3t+fX0KCQl9CgoJCXt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQoJCXRoaXMue3s9Y319X3oxID0gdGhpcy57ez1jfX07e3t+fX0KCQl0aGlzLmZpcnN0UnVuID0gMDsKCX0KfQoKLy8gU3RhdGljIHBhcnQKY2xhc3MgUGx1Z2luUHJvY2Vzc29yIGV4dGVuZHMgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHsKCWNvbnN0cnVjdG9yICgpIHsKCgkJc3VwZXIoKTsKCQl0aGlzLmluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShQbHVnaW4pOwoJCXRoaXMuaW5zdGFuY2UuaW5pdCgpOwoJCXRoaXMuaW5zdGFuY2Uuc2V0U2FtcGxlUmF0ZShzYW1wbGVSYXRlKTsKCQl0aGlzLmluc3RhbmNlLnJlc2V0KCk7CgoJCXRoaXMucG9ydC5vbm1lc3NhZ2UgPSAoZSkgPT4gewoJCQlpZiAoZS5kYXRhLnR5cGUgPT0gImNoYW5nZUluc3RhbmNlIikgewoJCQkJZXZhbChlLmRhdGEudmFsdWUpCgkJCQl0aGlzLmluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShQbHVnaW4pOwoJCQkJdGhpcy5pbnN0YW5jZS5pbml0KCk7CgkJCQl0aGlzLmluc3RhbmNlLnNldFNhbXBsZVJhdGUoc2FtcGxlUmF0ZSk7CgkJCQl0aGlzLmluc3RhbmNlLnJlc2V0KCk7CgkJCX0KCQkJZWxzZSBpZiAoZS5kYXRhLnR5cGUgPT0gInBhcmFtQ2hhbmdlIikgewoJCQkJdGhpcy5pbnN0YW5jZVtlLmRhdGEuaWRdID0gZS5kYXRhLnZhbHVlCgkJCX0KCQl9Cgl9Cglwcm9jZXNzIChpbnB1dHMsIG91dHB1dHMsIHBhcmFtZXRlcnMpIHsKCgkJdmFyIGlucHV0ID0gaW5wdXRzWzBdOwoJCXZhciBvdXRwdXQgPSBvdXRwdXRzWzBdOwoJCWxldCBuU2FtcGxlcyA9IE1hdGgubWluKGlucHV0Lmxlbmd0aCA+PSAxID8gaW5wdXRbMF0ubGVuZ3RoIDogMCwgb3V0cHV0WzBdLmxlbmd0aCkKCQkKCgoJCXRoaXMuaW5zdGFuY2UucHJvY2Vzcyh7ez1pdC5hdWRpb19pbnB1dHMubWFwKChpaSwgaSkgPT4gImlucHV0WyIgKyBpICsgIl0iKX19e3s/aXQuYXVkaW9faW5wdXRzLmxlbmd0aCA+IDB9fSwge3s/fX0ge3s9aXQub3V0cHV0cy5tYXAoKGlpLCBpKSA9PiAib3V0cHV0WyIgKyBpICsgIl0iKX19LCBuU2FtcGxlcyk7CgoJCXJldHVybiB0cnVlOwoJfQoKCXN0YXRpYyBnZXQgcGFyYW1ldGVyRGVzY3JpcHRvcnMoKSB7CgkJcmV0dXJuIFtdOwoJfQp9CgpyZWdpc3RlclByb2Nlc3NvcigiUGx1Z2luUHJvY2Vzc29yIiwgUGx1Z2luUHJvY2Vzc29yKTsK","base64")),
					"d_processor":		String(Buffer("c3RydWN0IHt7PWl0LmNsYXNzX25hbWV9fQp7Cm5vdGhyb3c6CnB1YmxpYzoKQG5vZ2M6CgogICAge3t+aXQuY29uc3RhbnRfcmF0ZTpjfX1lbnVtIGZsb2F0IHt7PWN9fTsKICAgIHt7fn19CgogICAgdm9pZCBzZXRTYW1wbGVSYXRlKGZsb2F0IHNhbXBsZVJhdGUpCiAgICB7CiAgICAgICAgZnMgPSBzYW1wbGVSYXRlOwogICAgICAgIHt7fml0LnNhbXBsaW5nX3JhdGU6c319e3s9c319OwogICAgICAgIHt7fn19CiAgICB9CgogICAgdm9pZCByZXNldCgpCiAgICB7CiAgICAgICAgZmlyc3RSdW4gPSAxOwogICAgfQoKICAgIHZvaWQgcHJvY2Vzcyh7ez1pdC5hdWRpb19pbnB1dHMuY29uY2F0KGl0Lm91dHB1dHMpLm1hcCh4ID0+ICdmbG9hdCAqJyArIHgpLmpvaW4oJywgJyl9fSwgaW50IG5TYW1wbGVzKQogICAgewogICAgICAgIGlmIChmaXJzdFJ1bikgCiAgICAgICAgewogICAgICAgICAgICB7e35pdC5jb250cm9sX2lucHV0czpjfX17ez1jfX1fQ0hBTkdFRCA9IDE7CiAgICAgICAgICAgIHt7fn19CiAgICAgICAgfQogICAgICAgIGVsc2Uge3t7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQogICAgICAgICAgICB7ez1jfX1fQ0hBTkdFRCA9IHt7PWN9fSAhPSB7ez1jfX1fejE7e3t+fX0KICAgICAgICB9CiAgICAgICAge3t+aXQuY29udHJvbHNfcmF0ZTpjfX0KICAgICAgICBpZiAoe3s9QXJyYXkuZnJvbShjLnNldCkubWFwKGUgPT4gZSArICJfQ0hBTkdFRCIpLmpvaW4oJyB8ICcpfX0pIHt7e35jLnN0bXRzOiBzfX0KICAgICAgICAgICAge3s9c319O3t7fn19CiAgICAgICAgfXt7fn19CiAgICAgICAge3t+aXQuY29udHJvbF9pbnB1dHM6Y319CiAgICAgICAge3s9Y319X0NIQU5HRUQgPSAwO3t7fn19CgogICAgICAgIGlmIChmaXJzdFJ1bikge3t7fml0LnJlc2V0MTpyfX0KICAgICAgICAgICAge3s9cn19O3t7fn19CiAgICAgICAgICAgIHt7fml0LnJlc2V0MjpyfX0KICAgICAgICAgICAge3s9cn19O3t7fn19CiAgICAgICAgfQoKICAgICAgICBmb3IgKGludCBpID0gMDsgaSA8IG5TYW1wbGVzOyBpKyspIHsKICAgICAgICAgICAge3t+aXQuYXVkaW9fcmF0ZTogYX19CiAgICAgICAgICAgIHt7PWF9fTt7e359fQoKICAgICAgICAgICAge3t+aXQuZGVsYXlfdXBkYXRlczp1fX17ez11fX07CiAgICAgICAgICAgIHt7fn19CiAgICAgICAgICAgIHt7fml0Lm91dHB1dF91cGRhdGVzOnV9fQogICAgICAgICAgICB7ez11fX07e3t+fX0KICAgICAgICB9CgogICAgICAgIHt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQogICAgICAgIHt7PWN9fV96MSA9IHt7PWN9fTt7e359fQogICAgICAgIGZpcnN0UnVuID0gMDsKICAgIH0KCiAgICB7e35pdC5jb250cm9sX2lucHV0czpjfX0KICAgIGZsb2F0IGdldHt7PWN9fSgpCiAgICB7CiAgICAgICAgcmV0dXJuIHt7PWN9fTsKICAgIH0KICAgIHZvaWQgc2V0e3s9Y319KGZsb2F0IHZhbHVlKQogICAgewogICAgICAgIHt7PWN9fSA9IHZhbHVlOwogICAgfQogICAge3t+fX0KCnByaXZhdGU6CgogICAge3t+aXQuaW5pdDpkfX0KICAgIGZsb2F0IHt7PWR9fTt7e359fQoKICAgIHt7fml0LmNvbnRyb2xfaW5wdXRzOmN9fQogICAgZmxvYXQge3s9Y319X3oxOwogICAgY2hhciB7ez1jfX1fQ0hBTkdFRDsKICAgIHt7fn19CgogICAgZmxvYXQgZnM7CiAgICBpbnQgZmlyc3RSdW47Cgp9Ow==","base64"))
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
		if (debug) console.log(scheduled_blocks.map(b => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")))
		if (debug) console.log(scheduled_blocks_init.map(b => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")))

		let files = env["output_generation"].convert(env["doT"], env["templates"], target_lang, graphes[0], graphes[1], scheduled_blocks, scheduled_blocks_init)
		return files
	}

	exports["compile"] = compile

}());
}).call(this)}).call(this,require("buffer").Buffer)
},{"./extended_syntax":2,"./grammar":3,"./graph":4,"./output_generation":5,"./scheduler":6,"buffer":10,"dot":1,"path":12}],8:[function(require,module,exports){

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

},{}]},{},[7])(7)
});
