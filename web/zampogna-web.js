var zampogna = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/grammar.js
  var require_grammar = __commonJS({
    "src/grammar.js"(exports, module) {
      var grammar = (function() {
        var o = function(k, v, o2, l) {
          for (o2 = o2 || {}, l = k.length; l--; o2[k[l]] = v) ;
          return o2;
        }, $V0 = [2, 3], $V1 = [1, 6], $V2 = [1, 10], $V3 = [1, 11], $V4 = [1, 8, 25, 52], $V5 = [1, 31], $V6 = [1, 27], $V7 = [1, 26], $V8 = [1, 28], $V9 = [1, 30], $Va = [1, 33], $Vb = [1, 8, 25, 30, 32, 34, 35, 37, 38, 39, 40, 42, 43, 45, 46, 52], $Vc = [2, 48], $Vd = [1, 8, 15, 25, 26, 30, 52], $Ve = [1, 37], $Vf = [1, 8, 15, 25, 26, 30, 32, 52], $Vg = [1, 38], $Vh = [1, 39], $Vi = [1, 8, 15, 25, 26, 30, 32, 34, 35, 52], $Vj = [1, 40], $Vk = [1, 41], $Vl = [1, 42], $Vm = [1, 43], $Vn = [1, 8, 15, 25, 26, 30, 32, 34, 35, 37, 38, 39, 40, 52], $Vo = [1, 44], $Vp = [1, 45], $Vq = [1, 8, 15, 25, 26, 30, 32, 34, 35, 37, 38, 39, 40, 42, 43, 52], $Vr = [1, 46], $Vs = [1, 47], $Vt = [1, 8, 15, 25, 26, 30, 32, 34, 35, 37, 38, 39, 40, 42, 43, 45, 46, 52], $Vu = [2, 55], $Vv = [2, 54], $Vw = [1, 82], $Vx = [8, 18, 25, 52], $Vy = [1, 99], $Vz = [2, 12], $VA = [16, 24];
        var parser = {
          trace: function trace() {
          },
          yy: {},
          symbols_: { "error": 2, "program": 3, "program_stmts0": 4, "program_stmt": 5, "const": 6, "block_def": 7, "END": 8, "assignment": 9, "ids_list1": 10, "ASSIGN": 11, "id": 12, "LPAREN": 13, "exprs_list0": 14, "RPAREN": 15, "LBRACE": 16, "block_stmts1": 17, "RBRACE": 18, "anonym_block_def": 19, "if_then_else": 20, "IF": 21, "expr": 22, "mayend": 23, "ELSE": 24, "INIT": 25, "COMMA": 26, "block_stmt": 27, "or_expr": 28, "and_expr": 29, "OR": 30, "equality_expr": 31, "AND": 32, "relational_expr": 33, "EQUAL": 34, "NOTEQUAL": 35, "additive_expr": 36, "LESS": 37, "LESSEQUAL": 38, "GREATER": 39, "GREATEREQUAL": 40, "multiplicative_expr": 41, "PLUS": 42, "MINUS": 43, "unary_expr": 44, "TIMES": 45, "DIV": 46, "primary_expr": 47, "NOT": 48, "number": 49, "SAMPLERATE": 50, "fb_call": 51, "ID": 52, "NUMBER": 53, "exprs_list1": 54, "$accept": 0, "$end": 1 },
          terminals_: { 2: "error", 8: "END", 11: "ASSIGN", 13: "LPAREN", 15: "RPAREN", 16: "LBRACE", 18: "RBRACE", 21: "IF", 24: "ELSE", 25: "INIT", 26: "COMMA", 30: "OR", 32: "AND", 34: "EQUAL", 35: "NOTEQUAL", 37: "LESS", 38: "LESSEQUAL", 39: "GREATER", 40: "GREATEREQUAL", 42: "PLUS", 43: "MINUS", 45: "TIMES", 46: "DIV", 48: "NOT", 50: "SAMPLERATE", 52: "ID", 53: "NUMBER" },
          productions_: [0, [3, 1], [4, 2], [4, 0], [5, 1], [5, 1], [5, 1], [6, 1], [7, 9], [19, 5], [20, 16], [23, 2], [23, 0], [10, 1], [10, 2], [10, 3], [17, 2], [17, 1], [27, 2], [27, 2], [27, 2], [27, 2], [27, 1], [9, 3], [22, 1], [28, 1], [28, 3], [29, 1], [29, 3], [31, 1], [31, 3], [31, 3], [33, 1], [33, 3], [33, 3], [33, 3], [33, 3], [36, 1], [36, 3], [36, 3], [41, 1], [41, 3], [41, 3], [44, 1], [44, 2], [44, 2], [44, 2], [47, 1], [47, 1], [47, 1], [47, 3], [47, 1], [12, 1], [49, 1], [51, 4], [14, 0], [14, 1], [54, 1], [54, 3]],
          performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
            var $0 = $$.length - 1;
            switch (yystate) {
              case 1:
                this.$ = {
                  name: "PROGRAM",
                  stmts: $$[$0]
                };
                return this.$;
                break;
              case 2:
                this.$ = $$[$0 - 1].concat($$[$0]);
                break;
              case 3:
                this.$ = [];
                break;
              case 4:
              case 5:
              case 13:
              case 57:
                this.$ = [$$[$0]];
                break;
              case 6:
              case 22:
              case 55:
                this.$ = [];
                break;
              case 7:
              case 17:
              case 24:
              case 25:
              case 27:
              case 29:
              case 32:
              case 37:
              case 40:
              case 43:
              case 45:
              case 47:
              case 48:
              case 51:
              case 56:
                this.$ = $$[$0];
                break;
              case 8:
                this.$ = {
                  name: "BLOCK_DEF",
                  id: $$[$0 - 6],
                  inputs: $$[$0 - 4],
                  outputs: $$[$0 - 8],
                  body: $$[$0 - 1]
                };
                break;
              case 9:
                this.$ = {
                  name: "ANONYM_BLOCK_DEF",
                  id: { name: "ID", val: "" },
                  inputs: [],
                  outputs: $$[$0 - 4],
                  body: $$[$0 - 1]
                };
                break;
              case 10:
                this.$ = {
                  name: "IF_THEN_ELSE",
                  condition: $$[$0 - 11],
                  outputs: $$[$0 - 15],
                  if: {
                    name: "ANONYM_BLOCK_DEF",
                    id: { name: "ID", val: "" },
                    inputs: [],
                    outputs: $$[$0 - 15],
                    body: $$[$0 - 7]
                  },
                  else: {
                    name: "ANONYM_BLOCK_DEF",
                    id: { name: "ID", val: "" },
                    inputs: [],
                    outputs: $$[$0 - 15],
                    body: $$[$0 - 1]
                  }
                };
                break;
              case 14:
                $$[$0].init = true;
                this.$ = [$$[$0]];
                break;
              case 15:
                this.$ = [$$[$0 - 2]].concat($$[$0]);
                break;
              case 16:
                this.$ = $$[$0 - 1].concat($$[$0]);
                break;
              case 18:
              case 19:
              case 20:
              case 21:
                this.$ = [$$[$0 - 1]];
                break;
              case 23:
                this.$ = {
                  name: "ASSIGNMENT",
                  expr: $$[$0],
                  outputs: $$[$0 - 2]
                };
                break;
              case 26:
                this.$ = {
                  name: "OR_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 28:
                this.$ = {
                  name: "AND_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 30:
                this.$ = {
                  name: "EQUAL_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 31:
                this.$ = {
                  name: "NOTEQUAL_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 33:
                this.$ = {
                  name: "LESS_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 34:
                this.$ = {
                  name: "LESSEQUAL_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 35:
                this.$ = {
                  name: "GREATER_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 36:
                this.$ = {
                  name: "GREATEREQUAL_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 38:
                this.$ = {
                  name: "PLUS_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 39:
                this.$ = {
                  name: "MINUS_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 41:
                this.$ = {
                  name: "TIMES_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 42:
                this.$ = {
                  name: "DIV_EXPR",
                  args: [$$[$0 - 2], $$[$0]]
                };
                break;
              case 44:
                this.$ = {
                  name: "UMINUS_EXPR",
                  args: [$$[$0]]
                };
                break;
              case 46:
                this.$ = {
                  name: "NOT_EXPR",
                  args: [$$[$0]]
                };
                break;
              case 49:
                this.$ = {
                  name: "SAMPLERATE",
                  val: "fs"
                };
                break;
              case 50:
                this.$ = $$[$0 - 1];
                break;
              case 52:
                this.$ = { name: "ID", val: yytext };
                break;
              case 53:
                this.$ = { name: "NUMBER", val: parseFloat(yytext) };
                break;
              case 54:
                this.$ = {
                  name: "CALL_EXPR",
                  id: $$[$0 - 3],
                  args: $$[$0 - 1]
                };
                break;
              case 58:
                this.$ = [$$[$0 - 2]].concat($$[$0]);
                break;
            }
          },
          table: [{ 1: $V0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: $V1, 9: 7, 10: 8, 12: 9, 25: $V2, 52: $V3 }, { 1: [3] }, { 1: [2, 1] }, { 1: $V0, 4: 12, 5: 3, 6: 4, 7: 5, 8: $V1, 9: 7, 10: 8, 12: 9, 25: $V2, 52: $V3 }, o($V4, [2, 4]), o($V4, [2, 5]), o($V4, [2, 6]), o($V4, [2, 7]), { 11: [1, 13] }, { 11: [2, 13], 26: [1, 14] }, { 12: 15, 52: $V3 }, o([1, 8, 11, 13, 15, 25, 26, 30, 32, 34, 35, 37, 38, 39, 40, 42, 43, 45, 46, 52], [2, 52]), { 1: [2, 2] }, { 12: 16, 13: $V5, 22: 17, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 10: 34, 12: 9, 25: $V2, 52: $V3 }, { 11: [2, 14] }, o($Vb, $Vc, { 13: [1, 35] }), o($V4, [2, 23]), o([1, 8, 15, 25, 26, 52], [2, 24], { 30: [1, 36] }), o($Vd, [2, 25], { 32: $Ve }), o($Vf, [2, 27], { 34: $Vg, 35: $Vh }), o($Vi, [2, 29], { 37: $Vj, 38: $Vk, 39: $Vl, 40: $Vm }), o($Vn, [2, 32], { 42: $Vo, 43: $Vp }), o($Vq, [2, 37], { 45: $Vr, 46: $Vs }), o($Vt, [2, 40]), o($Vt, [2, 43]), { 12: 49, 13: $V5, 47: 48, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 47: 50, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 47: 51, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, o($Vt, [2, 47]), o($Vt, [2, 49]), { 12: 49, 13: $V5, 22: 52, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, o($Vt, [2, 51]), o($Vt, [2, 53]), { 11: [2, 15] }, { 12: 49, 13: $V5, 14: 53, 15: $Vu, 22: 55, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va, 54: 54 }, { 12: 49, 13: $V5, 29: 56, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 31: 57, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 33: 58, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 33: 59, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 36: 60, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 36: 61, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 36: 62, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 36: 63, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 41: 64, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 41: 65, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 42: $V6, 43: $V7, 44: 66, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 12: 49, 13: $V5, 42: $V6, 43: $V7, 44: 67, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, o($Vt, [2, 44]), o($Vt, $Vc, { 13: [1, 68] }), o($Vt, [2, 45]), o($Vt, [2, 46]), { 15: [1, 69] }, { 15: [1, 70] }, { 15: [2, 56] }, { 15: [2, 57], 26: [1, 71] }, o($Vd, [2, 26], { 32: $Ve }), o($Vf, [2, 28], { 34: $Vg, 35: $Vh }), o($Vi, [2, 30], { 37: $Vj, 38: $Vk, 39: $Vl, 40: $Vm }), o($Vi, [2, 31], { 37: $Vj, 38: $Vk, 39: $Vl, 40: $Vm }), o($Vn, [2, 33], { 42: $Vo, 43: $Vp }), o($Vn, [2, 34], { 42: $Vo, 43: $Vp }), o($Vn, [2, 35], { 42: $Vo, 43: $Vp }), o($Vn, [2, 36], { 42: $Vo, 43: $Vp }), o($Vq, [2, 38], { 45: $Vr, 46: $Vs }), o($Vq, [2, 39], { 45: $Vr, 46: $Vs }), o($Vt, [2, 41]), o($Vt, [2, 42]), { 12: 49, 13: $V5, 14: 72, 15: $Vu, 22: 55, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va, 54: 54 }, o($Vt, [2, 50]), o($Vb, $Vv, { 16: [1, 73] }), { 12: 49, 13: $V5, 22: 55, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va, 54: 74 }, { 15: [1, 75] }, { 7: 79, 8: $Vw, 9: 78, 10: 83, 12: 9, 17: 76, 19: 80, 20: 81, 25: $V2, 27: 77, 52: $V3 }, { 15: [2, 58] }, o($Vt, $Vv), { 18: [1, 84] }, { 7: 79, 8: $Vw, 9: 78, 10: 83, 12: 9, 17: 85, 18: [2, 17], 19: 80, 20: 81, 25: $V2, 27: 77, 52: $V3 }, { 8: [1, 86] }, { 8: [1, 87] }, { 8: [1, 88] }, { 8: [1, 89] }, o($Vx, [2, 22]), { 11: [1, 90] }, o($V4, [2, 8]), { 18: [2, 16] }, o($Vx, [2, 18]), o($Vx, [2, 19]), o($Vx, [2, 20]), o($Vx, [2, 21]), { 12: 16, 13: $V5, 16: [1, 91], 21: [1, 92], 22: 17, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 7: 79, 8: $Vw, 9: 78, 10: 83, 12: 9, 17: 93, 19: 80, 20: 81, 25: $V2, 27: 77, 52: $V3 }, { 13: [1, 94] }, { 18: [1, 95] }, { 12: 49, 13: $V5, 22: 96, 28: 18, 29: 19, 31: 20, 33: 21, 36: 22, 41: 23, 42: $V6, 43: $V7, 44: 24, 47: 25, 48: $V8, 49: 29, 50: $V9, 51: 32, 52: $V3, 53: $Va }, { 8: [2, 9] }, { 15: [1, 97] }, { 8: $Vy, 16: $Vz, 23: 98 }, { 16: [1, 100] }, o($VA, $Vz, { 23: 101, 8: $Vy }), { 7: 79, 8: $Vw, 9: 78, 10: 83, 12: 9, 17: 102, 19: 80, 20: 81, 25: $V2, 27: 77, 52: $V3 }, o($VA, [2, 11]), { 18: [1, 103] }, { 8: $Vy, 23: 104, 24: $Vz }, { 24: [1, 105] }, { 8: $Vy, 16: $Vz, 23: 106 }, { 16: [1, 107] }, { 7: 79, 8: $Vw, 9: 78, 10: 83, 12: 9, 17: 108, 19: 80, 20: 81, 25: $V2, 27: 77, 52: $V3 }, { 18: [1, 109] }, { 8: [2, 10] }],
          defaultActions: { 2: [2, 1], 12: [2, 2], 15: [2, 14], 34: [2, 15], 54: [2, 56], 74: [2, 58], 85: [2, 16], 95: [2, 9], 109: [2, 10] },
          parseError: function parseError(str, hash) {
            if (hash.recoverable) {
              this.trace(str);
            } else {
              var error = new Error(str);
              error.hash = hash;
              throw error;
            }
          },
          parse: function parse(input) {
            var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
            var args = lstack.slice.call(arguments, 1);
            var lexer2 = Object.create(this.lexer);
            var sharedState = { yy: {} };
            for (var k in this.yy) {
              if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
                sharedState.yy[k] = this.yy[k];
              }
            }
            lexer2.setInput(input, sharedState.yy);
            sharedState.yy.lexer = lexer2;
            sharedState.yy.parser = this;
            if (typeof lexer2.yylloc == "undefined") {
              lexer2.yylloc = {};
            }
            var yyloc = lexer2.yylloc;
            lstack.push(yyloc);
            var ranges = lexer2.options && lexer2.options.ranges;
            if (typeof sharedState.yy.parseError === "function") {
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
              var lex = function() {
                var token;
                token = lexer2.lex() || EOF;
                if (typeof token !== "number") {
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
                if (symbol === null || typeof symbol == "undefined") {
                  symbol = lex();
                }
                action = table[state] && table[state][symbol];
              }
              if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                expected = [];
                for (p in table[state]) {
                  if (this.terminals_[p] && p > TERROR) {
                    expected.push("'" + this.terminals_[p] + "'");
                  }
                }
                if (lexer2.showPosition) {
                  errStr = "Parse error on line " + (yylineno + 1) + ":\n" + lexer2.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                  errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {
                  text: lexer2.match,
                  token: this.terminals_[symbol] || symbol,
                  line: lexer2.yylineno,
                  loc: yyloc,
                  expected
                });
              }
              if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
              }
              switch (action[0]) {
                case 1:
                  stack.push(symbol);
                  vstack.push(lexer2.yytext);
                  lstack.push(lexer2.yylloc);
                  stack.push(action[1]);
                  symbol = null;
                  if (!preErrorSymbol) {
                    yyleng = lexer2.yyleng;
                    yytext = lexer2.yytext;
                    yylineno = lexer2.yylineno;
                    yyloc = lexer2.yylloc;
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
                  if (typeof r !== "undefined") {
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
          }
        };
        var lexer = /* @__PURE__ */ (function() {
          var lexer2 = {
            EOF: 1,
            parseError: function parseError(str, hash) {
              if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
              } else {
                throw new Error(str);
              }
            },
            // resets the lexer, sets new input
            setInput: function(input, yy) {
              this.yy = yy || this.yy || {};
              this._input = input;
              this._more = this._backtrack = this.done = false;
              this.yylineno = this.yyleng = 0;
              this.yytext = this.matched = this.match = "";
              this.conditionStack = ["INITIAL"];
              this.yylloc = {
                first_line: 1,
                first_column: 0,
                last_line: 1,
                last_column: 0
              };
              if (this.options.ranges) {
                this.yylloc.range = [0, 0];
              }
              this.offset = 0;
              return this;
            },
            // consumes and returns one char from the input
            input: function() {
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
            unput: function(ch) {
              var len = ch.length;
              var lines = ch.split(/(?:\r\n?|\n)/g);
              this._input = ch + this._input;
              this.yytext = this.yytext.substr(0, this.yytext.length - len);
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
                last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
              };
              if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
              }
              this.yyleng = this.yytext.length;
              return this;
            },
            // When called from action, caches matched text and appends it on next action
            more: function() {
              this._more = true;
              return this;
            },
            // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
            reject: function() {
              if (this.options.backtrack_lexer) {
                this._backtrack = true;
              } else {
                return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
                });
              }
              return this;
            },
            // retain first n characters of the match
            less: function(n) {
              this.unput(this.match.slice(n));
            },
            // displays already matched input, i.e. for error messages
            pastInput: function() {
              var past = this.matched.substr(0, this.matched.length - this.match.length);
              return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
            },
            // displays upcoming input, i.e. for error messages
            upcomingInput: function() {
              var next = this.match;
              if (next.length < 20) {
                next += this._input.substr(0, 20 - next.length);
              }
              return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
            },
            // displays the character position where the lexing error occurred, i.e. for error messages
            showPosition: function() {
              var pre = this.pastInput();
              var c = new Array(pre.length + 1).join("-");
              return pre + this.upcomingInput() + "\n" + c + "^";
            },
            // test the lexed token: return FALSE when not a match, otherwise return token
            test_match: function(match, indexed_rule) {
              var token, lines, backup;
              if (this.options.backtrack_lexer) {
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
                last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
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
                for (var k in backup) {
                  this[k] = backup[k];
                }
                return false;
              }
              return false;
            },
            // return next match in input
            next: function() {
              if (this.done) {
                return this.EOF;
              }
              if (!this._input) {
                this.done = true;
              }
              var token, match, tempMatch, index;
              if (!this._more) {
                this.yytext = "";
                this.match = "";
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
                      continue;
                    } else {
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
                return false;
              }
              if (this._input === "") {
                return this.EOF;
              } else {
                return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
                });
              }
            },
            // return next match that has a token
            lex: function lex() {
              var r = this.next();
              if (r) {
                return r;
              } else {
                return this.lex();
              }
            },
            // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
            begin: function begin(condition) {
              this.conditionStack.push(condition);
            },
            // pop the previously active lexer condition state off the condition stack
            popState: function popState() {
              var n = this.conditionStack.length - 1;
              if (n > 0) {
                return this.conditionStack.pop();
              } else {
                return this.conditionStack[0];
              }
            },
            // produce the lexer rule set which is active for the currently active lexer condition state
            _currentRules: function _currentRules() {
              if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
              } else {
                return this.conditions["INITIAL"].rules;
              }
            },
            // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
            topState: function topState(n) {
              n = this.conditionStack.length - 1 - Math.abs(n || 0);
              if (n >= 0) {
                return this.conditionStack[n];
              } else {
                return "INITIAL";
              }
            },
            // alias for begin(condition)
            pushState: function pushState(condition) {
              this.begin(condition);
            },
            // return the number of states currently on the stack
            stateStackSize: function stateStackSize() {
              return this.conditionStack.length;
            },
            options: {},
            performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
              var YYSTATE = YY_START;
              switch ($avoiding_name_collisions) {
                case 0:
                  break;
                case 1:
                  break;
                case 2:
                  return "GREATEREQUAL";
                  break;
                case 3:
                  return "LESSEQUAL";
                  break;
                case 4:
                  return "LESS";
                  break;
                case 5:
                  return "GREATER";
                  break;
                case 6:
                  return "EQUAL";
                  break;
                case 7:
                  return "NOTEQUAL";
                  break;
                case 8:
                  return "NOT";
                  break;
                case 9:
                  return "AND";
                  break;
                case 10:
                  return "OR";
                  break;
                case 11:
                  return 11;
                  break;
                case 12:
                  return 16;
                  break;
                case 13:
                  return 18;
                  break;
                case 14:
                  return 53;
                  break;
                case 15:
                  return 50;
                  break;
                case 16:
                  return 21;
                  break;
                case 17:
                  return "ELSE";
                  break;
                case 18:
                  return 52;
                  break;
                case 19:
                  return 42;
                  break;
                case 20:
                  return 43;
                  break;
                case 21:
                  return 45;
                  break;
                case 22:
                  return 46;
                  break;
                case 23:
                  return 13;
                  break;
                case 24:
                  return 15;
                  break;
                case 25:
                  return 26;
                  break;
                case 26:
                  return 25;
                  break;
                case 27:
                  return 8;
                  break;
                case 28:
                  return 8;
                  break;
                case 29:
                  break;
              }
            },
            rules: [/^(?:#[^\n\r]*)/, /^(?:\.\.\.[^\n^\n]*[\n\r]+)/, /^(?:>=)/, /^(?:<=)/, /^(?:<)/, /^(?:>)/, /^(?:==)/, /^(?:!=)/, /^(?:!)/, /^(?:&&)/, /^(?:\|\|)/, /^(?:=)/, /^(?:\{)/, /^(?:\})/, /^(?:((0|[1-9][0-9]*)(\.[0-9]+)?([eE](\+|-)?[0-9]+)?))/, /^(?:fs\b)/, /^(?:if\b)/, /^(?:else\b)/, /^(?:([_a-zA-Z][_a-zA-Z0-9]*))/, /^(?:\+)/, /^(?:-)/, /^(?:\*)/, /^(?:\/)/, /^(?:\()/, /^(?:\))/, /^(?:,)/, /^(?:@)/, /^(?:[\n\r]+)/, /^(?:[;]+)/, /^(?:[ \t]+)/],
            conditions: { "INITIAL": { "rules": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29], "inclusive": true } }
          };
          return lexer2;
        })();
        parser.lexer = lexer;
        function Parser() {
          this.yy = {};
        }
        Parser.prototype = parser;
        parser.Parser = Parser;
        return new Parser();
      })();
      if (typeof __require !== "undefined" && typeof exports !== "undefined") {
        exports.parser = grammar;
        exports.Parser = grammar.Parser;
        exports.parse = function() {
          return grammar.parse.apply(grammar, arguments);
        };
        exports.main = function commonjsMain(args) {
          if (!args[1]) {
            console.log("Usage: " + args[0] + " FILE");
            process.exit(1);
          }
          var source = __require("fs").readFileSync(__require("path").normalize(args[1]), "utf8");
          return exports.parser.parse(source);
        };
        if (typeof module !== "undefined" && __require.main === module) {
          exports.main(process.argv.slice(1));
        }
      }
    }
  });

  // src/extended_syntax.js
  var require_extended_syntax = __commonJS({
    "src/extended_syntax.js"(exports) {
      (function() {
        "use strict";
        const ScopeTable = {
          elements: {},
          father: null,
          id: "",
          init: function(id) {
            this.id = id;
            this.elements = {};
          },
          findLocal: function(id) {
            return this.elements[id];
          },
          find: function(id) {
            const found = this.findLocal(id);
            if (found)
              return found;
            if (this.father)
              return this.father.find(id);
            return null;
          },
          add: function(id, item) {
            if (id === "_")
              return;
            if (this.findLocal(id))
              err("ID assigned twice: " + id);
            this.elements[id] = item;
          },
          toString: function() {
            let s = this.id + ": [\n";
            for (let p in this.elements) {
              s += "	" + p + ": [\n";
              for (let pp in this.elements[p])
                s += "		" + pp + ":	" + this.elements[p][pp] + "\n";
              s += "	]\n";
            }
            s += "]\n";
            return s;
          }
        };
        let scopes = [];
        const scope_reserved = Object.create(ScopeTable);
        scope_reserved.init("_reserved_");
        scope_reserved.add("delay1", {
          type: "func",
          inputsN: 1,
          outputsN: 1
        });
        function validate(AST_root) {
          scopes = [];
          scopes.push(scope_reserved);
          let scope_program = Object.create(ScopeTable);
          scope_program.init("_program_");
          scope_program.father = scope_reserved;
          scopes.push(scope_program);
          AST_root.stmts.filter((stmt) => stmt.name === "BLOCK_DEF").forEach(
            (block) => analyze_block_signature(scope_program, block)
          );
          AST_root.stmts.filter((stmt) => stmt.name === "ASSIGNMENT").forEach((ass) => ass.outputs.forEach(function(output) {
            if (output.init)
              err("Cannot use '@' in consts definitions");
            analyze_left_assignment(scope_program, output);
            scope_program.elements[output.val].kind = "const";
          }));
          AST_root.stmts.filter((stmt) => stmt.name === "ASSIGNMENT").forEach(
            (ass) => analyze_right_assignment(scope_program, ass.expr, ass.outputs.length)
          );
          AST_root.stmts.filter((stmt) => stmt.name === "BLOCK_DEF").forEach(
            (block) => analyze_block_body(scope_program, block)
          );
          for (let i in scope_program.elements) {
            const item = scope_program.elements[i];
            if (item.kind === "const" && !item.used)
              warn(item.kind + " " + i + " not used");
          }
          return scopes;
        }
        function analyze_block_signature(parent_scope, block) {
          if (block.inputs.some((o) => o.name !== "ID"))
            err("Invalid arguments in block definition. Use only IDs");
          if (block.outputs.some((o) => o.init))
            err("Cannot use '@' in block definitions");
          if (block.outputs.some((o) => o.val === "_"))
            err("Cannot use '_' in block definitions");
          parent_scope.add(block.id.val, {
            kind: "block",
            inputsN: block.inputs.length,
            outputsN: block.outputs.length
          });
        }
        function analyze_anonym_block_signature(block) {
          if (block.outputs.some((o) => o.val === "_"))
            err("Cannot use '_' in block definitions");
          if (block.outputs.some((o) => o.init))
            err("Cannot use '@' in block definitions");
        }
        function analyze_block_body(parent_scope, block) {
          let scope_block = Object.create(ScopeTable);
          scope_block.init(block.id.val);
          scope_block.father = parent_scope;
          scopes.push(scope_block);
          block.inputs.forEach((i) => scope_block.add(i.val, {
            kind: "port_in",
            used: false
          }));
          block.outputs.forEach((o) => scope_block.add(o.val, {
            kind: "port_out",
            used: true
          }));
          block.body.filter((stmt) => stmt.name === "BLOCK_DEF").forEach(function(block2) {
            analyze_block_signature(scope_block, block2);
          });
          block.body.filter((stmt) => stmt.name === "ASSIGNMENT").forEach(function(ass) {
            ass.outputs.filter((o) => !o.init).forEach(function(o) {
              analyze_left_assignment(scope_block, o);
            });
          });
          block.body.filter((stmt) => stmt.name === "ANONYM_BLOCK_DEF").forEach(function(block2) {
            block2.outputs.filter((o) => !o.init).forEach(function(o) {
              analyze_left_assignment(scope_block, o);
            });
            analyze_anonym_block_signature(block2);
          });
          block.body.filter((stmt) => stmt.name === "IF_THEN_ELSE").forEach(function(ifthenelse) {
            ifthenelse.outputs.filter((o) => !o.init).forEach(function(o) {
              analyze_left_assignment(scope_block, o);
            });
            analyze_anonym_block_signature(ifthenelse.if);
            analyze_anonym_block_signature(ifthenelse.else);
          });
          block.body.filter((stmt) => stmt.name === "BLOCK_DEF").forEach(function(block2) {
            analyze_block_body(scope_block, block2);
          });
          block.body.filter((stmt) => stmt.name === "ANONYM_BLOCK_DEF").forEach(function(block2) {
            analyze_block_body(scope_block, block2);
          });
          block.body.filter((stmt) => stmt.name === "ASSIGNMENT").forEach(function(ass) {
            ass.outputs.filter((o) => o.init).forEach(function(o) {
              analyze_left_assignment_init(scope_block, o);
            });
          });
          block.body.filter((stmt) => stmt.name === "ASSIGNMENT").forEach(function(ass) {
            analyze_right_assignment(scope_block, ass.expr, ass.outputs.length);
          });
          block.body.filter((stmt) => stmt.name === "IF_THEN_ELSE").forEach(function(ifthenelse) {
            analyze_right_assignment(scope_block, ifthenelse.condition, 1);
            analyze_block_body(scope_block, ifthenelse.if);
            analyze_block_body(scope_block, ifthenelse.else);
          });
          for (let i in scope_block.elements) {
            const item = scope_block.elements[i];
            if (item.kind === "port_out" && !item.assigned)
              err("Output port not assigned: " + i);
            if (!item.used)
              warn(item.kind + " " + i + " not used");
          }
        }
        function analyze_left_assignment(scope, id_node) {
          if (scope_reserved.find(id_node.val))
            err(id_node.val + " is a reserved keyword");
          const item = scope.findLocal(id_node.val);
          if (item) {
            if (item.kind === "port_in")
              err("Input ports cannot be assigned: " + id_node.val);
            if (item.kind === "port_out") {
              if (item.assigned)
                err("Output ports can be assigned only once: " + id_node.val);
              else
                item.assigned = true;
            }
            if (item.kind === "var" || item.kind === "const")
              err("Variables can be assigned only once: " + id_node.val);
          } else
            scope.add(id_node.val, {
              kind: "var",
              used: false
            });
        }
        function analyze_left_assignment_init(scope, id_node) {
          const item = scope.findLocal(id_node.val);
          if (!item)
            err("Cannot set initial value of undefined: " + id_node.val);
          if (item.hasInit)
            err("Cannot set initial value of variables more than once: " + id_node.val);
          if (item.kind === "port_in")
            err("Cannot set initial value of input ports: " + id_node.val);
          item.hasInit = true;
        }
        function analyze_right_assignment(scope, expr_node, outputsN) {
          if (expr_node.name === "ID") {
            const item = scope.find(expr_node.val);
            if (!item)
              err("ID not found: " + expr_node.val + ". Scope: \n" + scope);
            if (item.kind === "var" || item.kind === "const" || item.kind === "port_in" || item.kind === "port_out")
              item.used = true;
            else
              err("Unexpected identifier in expression: " + expr_node.val);
          } else if (expr_node.name === "CALL_EXPR") {
            const item = scope.find(expr_node.id.val);
            if (!item) {
              warn("Using unknown external function " + expr_node.id.val);
              expr_node.kind = "FUNC_CALL";
            } else {
              if (item.outputsN !== outputsN)
                err(expr_node.id.val + " requires " + item.outputsN + " outputs while " + outputsN + " were provided");
              if (item.inputsN !== expr_node.args.length)
                err(expr_node.id.val + " requires " + item.inputsN + " inputs while " + expr_node.args.length + " were provided");
              if (expr_node.id.val === "delay1")
                expr_node.kind = "DELAY1_EXPR";
              else
                expr_node.kind = "BLOCK_CALL";
            }
          }
          if (expr_node.args)
            expr_node.args.forEach((arg) => analyze_right_assignment(scope, arg, 1));
        }
        function warn(e) {
          console.warn("***Warning*** ", e);
        }
        function err(e) {
          throw new Error("***Error*** " + e);
        }
        exports["validate"] = validate;
      })();
    }
  });

  // src/graph.js
  var require_graph = __commonJS({
    "src/graph.js"(exports) {
      (function() {
        "use strict";
        function Graph(id) {
          let self = this;
          this.id = id;
          this.blocks = [];
          this.connections = [];
          this.input_ports = [];
          this.output_ports = [];
          this.getOutputBlocks = function(block) {
            let cs = self.connections.filter((c) => c.in.block === block);
            cs.sort((a, b) => block.output_ports.indexOf(a.in) < block.output_ports.indexOf(b.in) ? -1 : 1);
            return cs.map((p) => p.out.block);
          };
          this.getInputBlocks = function(block) {
            return block.input_ports.map((p) => self.connections.find((c) => c.out === p)).filter(
              (c) => c !== void 0
            ).map((c) => c.in.block);
          };
          this.clone = function() {
            let c = new Graph(self.id);
            self.blocks.forEach((b) => {
              let bc = b.clone();
              b.__son__ = bc;
              c.blocks.push(bc);
            });
            self.connections.forEach((conn) => {
              let i_in = conn.in.block.output_ports.indexOf(conn.in);
              let i_out = conn.out.block.input_ports.indexOf(conn.out);
              let new_conn = new Connection(conn.in.block.__son__.output_ports[i_in], conn.out.block.__son__.input_ports[i_out]);
              c.connections.push(new_conn);
            });
            self.input_ports.forEach((in_p) => {
              let i_in = in_p.block.input_ports.indexOf(in_p);
              c.input_ports.push(in_p.block.__son__.input_ports[i_in]);
            });
            self.output_ports.forEach((out_p) => {
              let i_out = out_p.block.output_ports.indexOf(out_p);
              c.output_ports.push(out_p.block.__son__.output_ports[i_out]);
            });
            self.blocks.forEach((b) => delete b.__son__);
            return c;
          };
          this.cloneSubGraph = function(blocks) {
            let c = new Graph(self.id + "_sub");
            blocks.forEach((b) => {
              let bc = b.clone();
              bc.postfix += "_c_";
              b.__son__ = bc;
              c.blocks.push(bc);
            });
            self.connections.filter((conn) => blocks.includes(conn.in.block) || blocks.includes(conn.out.block)).forEach((conn) => {
              let i_in = conn.in.block.output_ports.indexOf(conn.in);
              let i_out = conn.out.block.input_ports.indexOf(conn.out);
              let new_p_in = conn.in.block.__son__ ? conn.in.block.__son__.output_ports[i_in] : conn.in;
              let new_p_out = conn.out.block.__son__ ? conn.out.block.__son__.input_ports[i_out] : conn.out;
              let new_conn = new Connection(new_p_in, new_p_out);
              c.connections.push(new_conn);
            });
            blocks.filter((b) => b.operation === "IF_THEN_ELSE").forEach((b) => {
              blocks.forEach((bb) => {
                let io = bb.__son__.if_owners.find((io2) => io2.ifblock === b);
                if (io !== void 0) {
                  let ioi = bb.__son__.if_owners.indexOf(io);
                  bb.__son__.if_owners.splice(ioi, 1, { ifblock: b.__son__, branch: io.branch });
                }
              });
            });
            return c;
          };
          this.merge = function(g) {
            self.blocks = self.blocks.concat(g.blocks);
            self.connections = self.connections.concat(g.connections);
          };
          this.crossDFS = function(callbackF) {
            self.output_ports.forEach((p) => visitNode(p.block));
            function visitNode(block) {
              if (block.visited)
                return;
              block.visited = true;
              self.getInputBlocks(block).forEach((b) => visitNode(b));
              callbackF(block);
            }
            self.blocks.forEach((b) => delete b.visited);
          };
          this.toString = function() {
            let s = "{\n	" + id + ", " + this.input_ports.length + ", " + this.output_ports.length + "\n	blocks: [\n";
            s += this.blocks.map((b) => "		" + b.toString()).join("\n") + "\n	],";
            s += " connections: [\n";
            s += this.connections.map((c) => "		" + c.toString()).join("\n") + "\n	]\n}";
            return s;
          };
        }
        let blocksCounter = 0;
        function Block(nInputs = 0, nOutputs = 0, operation = "", id = "", postfix = "", val = NaN, if_owners = []) {
          let self = this;
          this.uniqueId = blocksCounter++;
          this.input_ports = new Array(nInputs).fill().map(() => new Port(self));
          this.output_ports = new Array(nOutputs).fill().map(() => new Port(self));
          this.operation = operation;
          this.id = id;
          this.postfix = postfix;
          this.val = val;
          this.control_dependencies = /* @__PURE__ */ new Set();
          this.if_owners = [...if_owners];
          this.label = function() {
            return "" + self.id + self.postfix;
          };
          this.getUpdateRateMax = function() {
            return self.input_ports.concat(self.output_ports).map((p) => p.update_rate).reduce(function(p1, p2) {
              return max(p1, p2);
            });
          };
          this.propagateUpdateRate = function() {
            if (self.operation === "IF_THEN_ELSE") {
              let cond_update_rate = self.input_ports[0].update_rate;
              for (let i = 0; i < self.output_ports.length; i++) {
                let m = max(
                  self.input_ports[i + 1].update_rate,
                  self.input_ports[i + 1 + self.output_ports.length].update_rate,
                  cond_update_rate
                );
                self.output_ports[i].update_rate = m;
              }
            } else {
              let update_rate_max = self.getUpdateRateMax();
              self.output_ports.forEach(((p) => p.update_rate = update_rate_max));
            }
          };
          this.clone = function() {
            let c = new Block(self.input_ports.length, self.output_ports.length, self.operation, self.id, self.postfix, self.val, self.if_owners);
            c.ifoutputindex = self.ifoutputindex;
            c.block_init = self.block_init;
            return c;
          };
          this.toString = function() {
            return "{ " + [self.operation, self.id, self.postfix, self.val, self.input_ports.length, self.output_ports.length, self.control_dependencies.size].join(", ") + " }";
          };
        }
        function Port(block) {
          this.block = block;
          this.update_rate = -1;
          this.getIndex = function() {
            if (this.block.input_ports.includes(this))
              return this.block.input_ports.indexOf(this);
            else if (this.block.output_ports.includes(this))
              return this.block.output_ports.indexOf(this);
            else
              throw new Error("Hanging port: " + this.block.toString());
          };
          this.toString = function() {
            return "{ " + this.block.toString() + ", id: " + this.getIndex() + ", ur: " + this.update_rate + " }";
          };
        }
        function Connection(in_port, out_port) {
          if (!in_port || !out_port)
            throw new Error("Undefined ports for the new Connection: " + in_port + ", " + out_port);
          this.in = in_port;
          this.out = out_port;
          this.toString = function() {
            return this.in.toString() + "	==>	" + this.out.toString();
          };
        }
        function max(x1, ...xn) {
          let M = x1;
          for (let a of xn)
            if (a > M)
              M = a;
          return M;
        }
        function ASTToGraph(AST_root, initial_block, control_inputs, initial_values) {
          let graph = convertToGraph();
          let graph_init = convertToGraph();
          distinguishGraphs(graph, graph_init);
          normalizeIfGraphs(graph);
          normalizeIfGraphs(graph_init);
          graph = removeUnreachableNodes(graph);
          graph_init = removeUnreachableNodes(graph_init);
          setStartingUpdateRates(graph);
          setStartingUpdateRatesInit(graph_init);
          propagateUpdateRate(graph);
          propagateUpdateRateInit(graph_init);
          optimize(graph);
          optimize(graph_init);
          return [graph, graph_init];
          function convertToGraph() {
            let graph2 = new Graph(initial_block);
            let named_blocks = {};
            let named_vars = {};
            let expansions_count = 0;
            AST_root.stmts.filter((stmt) => stmt.name === "BLOCK_DEF").forEach((block) => named_blocks[block.id.val] = block);
            if (!named_blocks[initial_block])
              throw new Error("Undefined initial block: " + initial_block + ". Available blocks: " + Object.keys(named_blocks));
            let postfix = "_0";
            let block_fs = new Block(0, 1, "SAMPLERATE", "fs", postfix, NaN, void 0);
            named_vars[block_fs.id] = block_fs;
            graph2.blocks.push(block_fs);
            AST_root.stmts.filter((stmt) => stmt.name === "ASSIGNMENT").forEach((stmt) => stmt.outputs.forEach(function(output) {
              let block_const = new Block(1, 1, "VAR", output.val, postfix, NaN, void 0);
              named_vars[block_const.id] = block_const;
              graph2.blocks.push(block_const);
            }));
            AST_root.stmts.filter((stmt) => stmt.name === "ASSIGNMENT").forEach((stmt) => {
              let ports2 = convertExpr(stmt.expr, {}, named_blocks, named_vars, []);
              stmt.outputs.forEach((output, index) => {
                let block_const = named_vars[output.val];
                let connection = new Connection(ports2[1][index], block_const.input_ports[0]);
                graph2.connections.push(connection);
              });
            });
            let ports = expandCompositeBlock(named_blocks[initial_block], {}, { ...named_blocks }, { ...named_vars }, []);
            graph2.input_ports = ports[0];
            graph2.output_ports = ports[1];
            return graph2;
            function expandCompositeBlock(block, expansion_stack, named_blocks2, named_vars2, if_owners) {
              expansions_count++;
              if (block.id.val !== "" && expansion_stack[block.id.val])
                throw new Error("Recursive block expansion. Stack: " + Object.keys(expansion_stack) + "," + block.id.val);
              expansion_stack[block.id.val] = true;
              let prefix = "_" + block.id.val + "_";
              let postfix2 = expansions_count === 1 ? "" : "_" + expansions_count;
              let input_ports = [];
              let output_ports = [];
              block.inputs.forEach(function(input) {
                let block_var = new Block(1, 1, "VAR", input.val, postfix2, NaN, if_owners);
                named_vars2[block_var.id] = block_var;
                graph2.blocks.push(block_var);
                input_ports.push(block_var.input_ports[0]);
              });
              block.body.filter((stmt) => stmt.name === "BLOCK_DEF").forEach((block2) => named_blocks2[block2.id.val] = block2);
              block.body.filter((stmt) => ["ASSIGNMENT", "ANONYM_BLOCK_DEF", "IF_THEN_ELSE"].includes(stmt.name)).forEach(
                (stmt) => stmt.outputs.forEach((output, index) => {
                  if (output.init)
                    return;
                  let block_var = new Block(1, 1, "VAR", output.val, postfix2, NaN, if_owners);
                  if (stmt.name === "IF_THEN_ELSE")
                    block_var.ifoutputindex = index;
                  named_vars2[block_var.id] = block_var;
                  graph2.blocks.push(block_var);
                })
              );
              block.outputs.forEach((o) => {
                output_ports.push(named_vars2[o.val].output_ports[0]);
              });
              block.body.filter((stmt) => ["ASSIGNMENT", "ANONYM_BLOCK_DEF", "IF_THEN_ELSE"].includes(stmt.name)).forEach(function(stmt) {
                let ports2;
                if (stmt.name === "ASSIGNMENT")
                  ports2 = convertExpr(stmt.expr, { ...expansion_stack }, { ...named_blocks2 }, { ...named_vars2 }, if_owners);
                else if (stmt.name === "ANONYM_BLOCK_DEF")
                  ports2 = expandCompositeBlock(stmt, { ...expansion_stack }, { ...named_blocks2 }, { ...named_vars2 }, if_owners);
                else if (stmt.name === "IF_THEN_ELSE")
                  ports2 = convertIfthenelse(stmt, expansion_stack, named_blocks2, named_vars2, if_owners);
                stmt.outputs.forEach(function(output, index) {
                  if (!output.init) {
                    let block_var = named_vars2[output.val];
                    let connection = new Connection(ports2[1][index], block_var.input_ports[0]);
                    graph2.connections.push(connection);
                  }
                });
                stmt.outputs.forEach(function(output, index) {
                  if (output.init) {
                    named_vars2[output.val].block_init = ports2[1][index].block;
                  }
                });
              });
              return [input_ports, output_ports];
            }
            function convertExpr(expr_node, expansion_stack, named_blocks2, named_vars2, if_owners) {
              let block_expr;
              let input_ports = [];
              let output_ports = [];
              switch (expr_node.name) {
                case "MINUS_EXPR":
                case "PLUS_EXPR":
                case "TIMES_EXPR":
                case "DIV_EXPR":
                case "UMINUS_EXPR":
                case "EQUAL_EXPR":
                case "NOTEQUAL_EXPR":
                case "LESS_EXPR":
                case "LESSEQUAL_EXPR":
                case "GREATER_EXPR":
                case "GREATEREQUAL_EXPR":
                case "NOT_EXPR":
                  block_expr = new Block(expr_node.args.length, 1, expr_node.name, void 0, void 0, void 0, if_owners);
                  graph2.blocks.push(block_expr);
                  input_ports = block_expr.input_ports;
                  output_ports = block_expr.output_ports;
                  break;
                case "NUMBER":
                  block_expr = new Block(0, 1, expr_node.name, void 0, void 0, expr_node.val, if_owners);
                  graph2.blocks.push(block_expr);
                  input_ports = block_expr.input_ports;
                  output_ports = block_expr.output_ports;
                  break;
                case "SAMPLERATE":
                case "ID":
                  let block_var = named_vars2[expr_node.val];
                  output_ports = block_var.output_ports;
                  break;
                case "CALL_EXPR":
                  switch (expr_node.kind) {
                    case "DELAY1_EXPR":
                      block_expr = new Block(1, 1, "DELAY1_EXPR", void 0, void 0, NaN, if_owners);
                      graph2.blocks.push(block_expr);
                      input_ports = block_expr.input_ports;
                      output_ports = block_expr.output_ports;
                      break;
                    case "FUNC_CALL":
                      block_expr = new Block(expr_node.args.length, 1, "EXTERNAL_FUNC_CALL", expr_node.id.val, void 0, NaN, if_owners);
                      graph2.blocks.push(block_expr);
                      input_ports = block_expr.input_ports;
                      output_ports = block_expr.output_ports;
                      break;
                    case "BLOCK_CALL":
                      let ports2 = expandCompositeBlock(
                        named_blocks2[expr_node.id.val],
                        { ...expansion_stack },
                        { ...named_blocks2 },
                        { ...named_vars2 },
                        if_owners
                      );
                      input_ports = ports2[0];
                      output_ports = ports2[1];
                      break;
                    default:
                      throw new Error("Unexpected BLOCK_CALL kind: " + expr_node.kind);
                  }
                  break;
                default:
                  throw new Error("Unexpected AST node: " + expr_node.name);
              }
              for (let argi = 0; argi < input_ports.length; argi++) {
                let ports2 = convertExpr(expr_node.args[argi], expansion_stack, named_blocks2, named_vars2, if_owners);
                let connection = new Connection(ports2[1][0], input_ports[argi]);
                graph2.connections.push(connection);
              }
              return [input_ports, output_ports];
            }
            function convertIfthenelse(stmt, expansion_stack, named_blocks2, named_vars2, if_owners) {
              let block_ifthenelse = new Block(stmt.outputs.length * 2 + 1, stmt.outputs.length, "IF_THEN_ELSE", void 0, void 0, NaN, if_owners);
              let condition_ports = convertExpr(stmt.condition, expansion_stack, named_blocks2, named_vars2, if_owners);
              let if_ports = expandCompositeBlock(
                stmt.if,
                { ...expansion_stack },
                { ...named_blocks2 },
                { ...named_vars2 },
                if_owners.concat({ ifblock: block_ifthenelse, branch: 0 })
              );
              let else_ports = expandCompositeBlock(
                stmt.else,
                { ...expansion_stack },
                { ...named_blocks2 },
                { ...named_vars2 },
                if_owners.concat({ ifblock: block_ifthenelse, branch: 1 })
              );
              let incoming_ports = condition_ports[1].concat(if_ports[1]).concat(else_ports[1]);
              for (let p = 0; p < incoming_ports.length; p++) {
                let connection = new Connection(incoming_ports[p], block_ifthenelse.input_ports[p]);
                graph2.connections.push(connection);
              }
              graph2.blocks.push(block_ifthenelse);
              return [[], block_ifthenelse.output_ports];
            }
          }
          function distinguishGraphs(graph2, graph_init2) {
            graph_init2.output_ports = [];
            for (let bi = 0; bi < graph_init2.blocks.length; bi++) {
              let block_init = graph_init2.blocks[bi].block_init;
              if (block_init) {
                block_init.output_ports = graph_init2.blocks[bi].output_ports;
                block_init.output_ports.forEach((p) => p.block = block_init);
                graph_init2.blocks[bi].output_ports = [];
              }
            }
            graph_init2.blocks.forEach(function(block, blocki) {
              if (block.operation === "DELAY1_EXPR") {
                let input_block = graph_init2.getInputBlocks(block)[0];
                graph_init2.output_ports = graph_init2.output_ports.concat(input_block.output_ports);
                graph2.getInputBlocks(graph2.blocks[blocki])[0].block_init = input_block;
              }
            });
            graph_init2.blocks.filter((b) => b.operation === "VAR").forEach((b) => b.postfix = b.postfix + "_I");
            graph_init2.input_ports.map((p) => p.block).forEach(function(block, blocki) {
              block.operation = "NUMBER";
              block.input_ports = [];
              if (initial_values[block.id] !== void 0)
                block.val = initial_values[block.id];
              else
                block.val = 0;
              graph2.input_ports[blocki].block.block_init = block;
              graph_init2.output_ports.push(block.output_ports[0]);
            });
          }
          function removeUnreachableNodes(graph2) {
            let newGraph = new Graph(graph2.id);
            graph2.output_ports.forEach((p) => visitNode(p.block));
            function visitNode(block, i) {
              if (block.operation === "IF_THEN_ELSE") {
                if (!block.visited)
                  block.visited = [];
                if (block.visited.includes(i))
                  return;
                block.visited.push(i);
                let inbs = graph2.getInputBlocks(block);
                if (block.visited.length === 1) {
                  visitNode(inbs[0], NaN);
                  newGraph.blocks.push(block);
                }
                visitNode(inbs[i + 1], NaN);
                visitNode(inbs[i + 1 + block.output_ports.length], NaN);
              } else {
                if (block.visited)
                  return;
                block.visited = true;
                graph2.getInputBlocks(block).forEach((b) => visitNode(b, block.ifoutputindex));
                newGraph.blocks.push(block);
              }
            }
            graph2.blocks.filter((b) => b.visited && b.operation === "IF_THEN_ELSE").forEach((b) => {
              for (let i = b.output_ports.length - 1; i >= 0; i--) {
                if (!b.visited.includes(i)) {
                  b.input_ports.splice(i + 1 + b.output_ports.length, 1);
                  b.input_ports.splice(i + 1, 1);
                  b.output_ports.splice(i, 1);
                }
              }
            });
            newGraph.connections = graph2.connections.filter(
              (c) => newGraph.blocks.some((b) => b === c.out.block && b.input_ports.concat(b.output_ports).includes(c.out)) && newGraph.blocks.some((b) => b === c.in.block && b.input_ports.concat(b.output_ports).includes(c.in))
            );
            newGraph.connections = Array.from(new Set(newGraph.connections));
            graph2.blocks.forEach((b) => delete b.visited);
            newGraph.input_ports = graph2.input_ports.filter((p) => newGraph.blocks.includes(p.block));
            newGraph.output_ports = graph2.output_ports;
            return newGraph;
          }
          function setStartingUpdateRates(graph2) {
            graph2.input_ports.map((p) => p.block).forEach(function(block) {
              if (control_inputs.some((ctr) => ctr === block.id))
                block.input_ports.forEach((p) => p.update_rate = 2);
              else
                block.input_ports.forEach((p) => p.update_rate = 3);
            });
            graph2.blocks.filter((block) => block.operation === "NUMBER").forEach(
              (block) => block.output_ports[0].update_rate = 0
            );
            graph2.blocks.filter((block) => block.operation === "SAMPLERATE").forEach(
              (block) => block.output_ports[0].update_rate = 1
            );
            graph2.blocks.filter((block) => block.operation === "DELAY1_EXPR").forEach(
              (block) => block.output_ports[0].update_rate = 3
            );
          }
          function setStartingUpdateRatesInit(graph_init2) {
            graph_init2.blocks.filter((block) => block.operation === "NUMBER").forEach(
              (block) => block.output_ports[0].update_rate = 0
            );
            graph_init2.blocks.filter((block) => block.operation === "SAMPLERATE").forEach(
              (block) => block.output_ports[0].update_rate = 1
            );
          }
          function propagateUpdateRate(graph2) {
            let blocks_delay = [];
            graph2.output_ports.forEach((p) => visitNode(p.block));
            for (let b of blocks_delay)
              visitNode(b);
            function visitNode(block) {
              if (block.visited)
                return;
              block.visited = true;
              let input_blocks = graph2.getInputBlocks(block);
              if (block.operation === "DELAY1_EXPR") {
                blocks_delay.push(input_blocks[0]);
              } else {
                input_blocks.forEach((b) => visitNode(b));
                block.propagateUpdateRate();
              }
              graph2.connections.filter((c) => c.in.block === block).forEach(
                (c) => c.out.update_rate = c.in.update_rate
              );
            }
            graph2.blocks.forEach((b) => delete b.visited);
          }
          function propagateUpdateRateInit(graph_init2) {
            graph_init2.crossDFS(function(block) {
              block.propagateUpdateRate();
              graph_init2.connections.filter((c) => c.in.block === block).forEach(
                (c) => c.out.update_rate = block.output_ports[0].update_rate
              );
            });
          }
          function normalizeIfGraphs(graph2) {
            graph2.output_ports.forEach((p) => visitBlock1(p.block));
            function visitBlock1(block) {
              if (block.visited1)
                return;
              block.visited1 = true;
              if (block.operation === "IF_THEN_ELSE" && !block.handled) {
                visitIfThenElse(block);
              }
              graph2.getInputBlocks(block).forEach((b) => visitBlock1(b));
            }
            function visitIfThenElse(ifthenelse) {
              let in_blocks = graph2.getInputBlocks(ifthenelse);
              in_blocks.shift();
              in_blocks.forEach((b) => {
                visitBlock2(b);
              });
              in_blocks.forEach((b) => {
                b.__tobecopied__.compute();
              });
              graph2.getOutputBlocks(ifthenelse).forEach((b) => b.__ifoutput__ = true);
              graph2.blocks.filter((b) => b.__ifoutput__).forEach((b) => {
                delete b.__tobecopied__;
              });
              graph2.blocks.filter((b) => b.if_owners.map((i) => i.ifblock).includes(ifthenelse)).forEach((b) => {
                delete b.__tobecopied__;
              });
              graph2.blocks.filter((b) => b.__tobecopied__ !== void 0).forEach((b) => {
                b.__tobecopied__ = b.__tobecopied__.res;
              });
              function visitBlock2(block) {
                if (block === ifthenelse)
                  return "found";
                if (block.__tobecopied__ === void 0)
                  block.__tobecopied__ = new MagicOR();
                if (block.operation === "DELAY1_EXPR") {
                  block.__tobecopied__.res = false;
                  return;
                }
                if (block.visited2)
                  return;
                block.visited2 = true;
                graph2.getInputBlocks(block).forEach((b) => {
                  let ret = visitBlock2(b);
                  if (ret === "found") {
                    block.__tobecopied__.res = true;
                    return;
                  }
                  block.__tobecopied__.add(b.__tobecopied__);
                });
              }
              graph2.blocks.filter((b) => b.__tobecopied__ && b.operation === "IF_THEN_ELSE").forEach((b) => {
                graph2.blocks.filter((bb) => bb.if_owners.map((i) => i.ifblock).includes(b)).forEach((bb) => {
                  bb.__tobecopied__ = true;
                });
              });
              let tobecopied_blocks = graph2.blocks.filter((b) => b.__tobecopied__);
              let copied_subgraph = graph2.cloneSubGraph(tobecopied_blocks);
              let ifinputblocks = graph2.getInputBlocks(ifthenelse);
              {
                let tobedeleted_connections = graph2.connections.filter((c) => c.in.block.__tobecopied__ && c.out.block.if_owners.some((i) => i.ifblock === ifthenelse && i.branch !== 0));
                tobedeleted_connections.forEach((dc) => graph2.connections.splice(graph2.connections.indexOf(dc), 1));
                let tobeedited_connections = graph2.connections.filter((c) => c.out.block.__tobecopied__ && c.in.block.__ifoutput__);
                tobeedited_connections.forEach((c) => {
                  let index = c.in.block.ifoutputindex;
                  c.in = ifinputblocks[1 + index].output_ports[0];
                });
              }
              {
                let tobedeleted_connections = copied_subgraph.connections.filter((c) => copied_subgraph.blocks.includes(c.in.block) && c.out.block.if_owners.some((i) => i.ifblock === ifthenelse && i.branch !== 1));
                tobedeleted_connections.forEach((dc) => copied_subgraph.connections.splice(copied_subgraph.connections.indexOf(dc), 1));
                let tobeedited_connections = copied_subgraph.connections.filter(
                  (c) => copied_subgraph.blocks.includes(c.out.block) && c.in.block.__ifoutput__
                );
                tobeedited_connections.forEach((c) => {
                  let index = c.in.block.ifoutputindex;
                  c.in = ifinputblocks[1 + index + (ifthenelse.input_ports.length - 1) / 2].output_ports[0];
                });
              }
              let copiedifs = graph2.blocks.filter((b) => b.operation === "IF_THEN_ELSE" && b.__tobecopied__);
              let copiedifinnervariables = graph2.blocks.filter((b) => b.operation === "VAR" && b.if_owners.map((i) => i.ifblock).some((ib) => copiedifs.includes(ib)));
              let variables = graph2.blocks.filter((b) => b.__tobecopied__ && !copiedifinnervariables.includes(b)).filter((b) => b.operation === "VAR");
              variables.forEach((v) => {
                ifthenelse.output_ports.push(new Port(ifthenelse));
                let newoutport = ifthenelse.output_ports[ifthenelse.output_ports.length - 1];
                let i = ifthenelse.output_ports.length;
                ifthenelse.input_ports.splice(i, 0, new Port(ifthenelse));
                ifthenelse.input_ports.push(new Port(ifthenelse));
                let newinport1 = ifthenelse.input_ports[i];
                let newinport2 = ifthenelse.input_ports[ifthenelse.input_ports.length - 1];
                let newblockvar = new Block(1, 1, "VAR", v.id, v.postfix, NaN, v.if_owners);
                newblockvar.ifoutputindex = ifthenelse.output_ports.length - 1;
                newblockvar.block_init = v.block_init;
                graph2.connections.filter((c) => c.in.block === v && !c.out.block.if_owners.some((i2) => i2.ifblock === ifthenelse)).forEach((c) => {
                  let c2 = copied_subgraph.connections.find((cc) => cc.in.block === c.in.block.__son__ && cc.out === c.out);
                  c.in = newblockvar.output_ports[0];
                  copied_subgraph.connections.splice(copied_subgraph.connections.indexOf(c2), 1);
                });
                graph2.connections.filter((c) => c.in.block === v && c.out.block.operation === "DELAY1_EXPR").forEach((c) => {
                  c.in = newblockvar.output_ports[0];
                });
                copied_subgraph.connections.filter((c) => c.in.block === v.__son__ && c.out.block.operation === "DELAY1_EXPR").forEach((c) => {
                  c.in = newblockvar.output_ports[0];
                });
                graph2.connections.push(new Connection(newoutport, newblockvar.input_ports[0]));
                graph2.connections.push(new Connection(v.output_ports[0], newinport1));
                graph2.connections.push(new Connection(v.__son__.output_ports[0], newinport2));
                let oid = graph2.output_ports.indexOf(v.output_ports[0]);
                if (oid !== -1) {
                  graph2.output_ports[oid] = newblockvar.output_ports[0];
                }
                graph2.blocks.push(newblockvar);
              });
              tobecopied_blocks.forEach((b) => {
                b.if_owners.push({ ifblock: ifthenelse, branch: 0 });
                b.postfix = b.postfix + "_b0";
              });
              copied_subgraph.blocks.forEach((b) => {
                b.if_owners.push({ ifblock: ifthenelse, branch: 1 });
                b.postfix = b.postfix + "_b1";
              });
              graph2.merge(copied_subgraph);
              graph2.blocks.forEach((b) => {
                delete b.__tobecopied__;
                delete b.visited2;
                delete b.__ifoutput__;
              });
              ifthenelse.handled = true;
            }
            graph2.blocks.forEach((b) => {
              delete b.visited1;
              delete b.handled;
            });
            function MagicOR(...init) {
              let self = this;
              this.ops = [];
              this.add = function(...x) {
                for (let k of x)
                  this.ops.push(k);
                return this;
              };
              this.res = void 0;
              this.compute = function(stack = []) {
                if (self.res !== void 0)
                  return self.res;
                if (stack.includes(self))
                  return void 0;
                stack.push(self);
                let left = false;
                for (let o of self.ops) {
                  let r = o.compute([...stack]);
                  if (r !== void 0) {
                    if (r) {
                      self.res = true;
                      break;
                    }
                  } else
                    left = true;
                }
                if (self.res === void 0) {
                  if (left)
                    return void 0;
                  else
                    self.res = false;
                }
                for (let o of self.ops)
                  o.compute([...stack]);
                return self.res;
              };
              for (let i of init)
                self.add(i);
            }
          }
          function optimize(graph2) {
            removeUselessVariables();
            labelToBeCachedBlocks();
            propagateControlDependencies();
            function removeUselessVariables() {
            }
            function labelToBeCachedBlocks() {
              graph2.blocks.forEach(function(block) {
                let input_blocks = graph2.getInputBlocks(block);
                input_blocks.forEach(function(iblock) {
                  if (iblock.output_ports[0].update_rate < block.output_ports[0].update_rate)
                    iblock.output_ports[0].toBeCached = true;
                });
              });
            }
            function propagateControlDependencies() {
              graph2.input_ports.filter((p) => p.update_rate === 2).forEach(function(p) {
                visitBlock(p.block, p.block.label());
                graph2.blocks.forEach((b) => delete b.visited);
              });
              function visitBlock(block, control_dep) {
                if (block.visited)
                  return;
                block.visited = true;
                block.control_dependencies.add(control_dep);
                graph2.getOutputBlocks(block).forEach((b) => visitBlock(b, control_dep));
              }
            }
          }
        }
        exports["ASTToGraph"] = ASTToGraph;
      })();
    }
  });

  // src/scheduler.js
  var require_scheduler = __commonJS({
    "src/scheduler.js"(exports) {
      (function() {
        "use strict";
        function schedule(graph) {
          const scheduled_nodes = [];
          let roots = [].concat(graph.output_ports.map((p) => p.block));
          roots = roots.concat(graph.blocks.filter((b) => b.operation === "DELAY1_EXPR"));
          const stack = [];
          roots.forEach((b) => schedule_block(b));
          graph.blocks.forEach((b) => delete b.visited);
          return scheduled_nodes;
          function schedule_block(block) {
            if (stack.some((b) => block === b))
              throw new Error("Found loop in scheduling at block: " + block + ". Stack: \n" + stack.join("\n"));
            if (block.visited)
              return;
            block.visited = true;
            stack.push(block);
            graph.getInputBlocks(block).forEach(function(b) {
              if (b.operation !== "DELAY1_EXPR")
                schedule_block(b);
            });
            scheduled_nodes.push(block);
            stack.pop();
          }
        }
        function scheduleInit(graph) {
          const scheduled_nodes = [];
          const roots = [].concat(graph.output_ports.map((p) => p.block));
          const stack = [];
          roots.forEach((b) => schedule_block(b));
          graph.blocks.forEach((b) => delete b.visited);
          return scheduled_nodes;
          function schedule_block(block) {
            if (stack.some((b) => block === b))
              throw new Error("Found loop in init scheduling at block: " + block + ". Stack: \n" + stack.join("\n"));
            if (block.visited)
              return;
            block.visited = true;
            stack.push(block);
            graph.getInputBlocks(block).forEach(function(b) {
              schedule_block(b);
            });
            scheduled_nodes.push(block);
            stack.pop();
          }
        }
        exports["schedule"] = schedule;
        exports["scheduleInit"] = scheduleInit;
      })();
    }
  });

  // src/output_generation.js
  var require_output_generation = __commonJS({
    "src/output_generation.js"(exports) {
      (function() {
        "use strict";
        function getIndexer(target_lang, index) {
          if (["C", "cpp", "VST2", "yaaaeapa", "d", "js"].includes(target_lang))
            return "[" + index + "]";
          else if (target_lang === "MATLAB")
            return "(" + index + ")";
        }
        function getNumber(target_lang, n) {
          const value = n.toString();
          if (["C", "cpp", "VST2", "yaaaeapa", "d"].includes(target_lang))
            return value + (value.includes(".") || value.toLowerCase().includes("e") ? "f" : ".0f");
          else if (["MATLAB", "js"].includes(target_lang))
            return value;
          return value;
        }
        function getIdPrefix(target_lang) {
          if (["C", "yaaaeapa"].includes(target_lang))
            return "instance->";
          else if (["js"].includes(target_lang))
            return "this.";
          else
            return "";
        }
        function getConstType(target_lang) {
          if (["C", "cpp", "VST2", "yaaaeapa", "d"].includes(target_lang))
            return "const float ";
          else if (["js"].includes(target_lang))
            return "const ";
          else
            return "";
        }
        function convert(doT, templates, target_lang, graph, graph_init, schedule, schedule_init) {
          const ct = getConstType(target_lang);
          const MagicStringProto = {
            s: null,
            add: function(...x) {
              for (let k of x) {
                if (k === void 0) {
                  throw new Error(k);
                }
                this.s.push(k);
              }
              return this;
            },
            toString: function() {
              let str = this.is_used_locally ? ct : "";
              for (let p of this.s)
                str += p.toString();
              return str;
            }
          };
          function MagicString(...init) {
            const m = Object.create(MagicStringProto);
            m.s = [];
            for (let i of init)
              m.add(i);
            return m;
          }
          const program = {
            class_name: graph.id,
            control_inputs: graph.input_ports.filter((p) => p.update_rate === 2).map((p) => p.block.label()),
            audio_inputs: graph.input_ports.filter((p) => p.update_rate === 3).map((p) => p.block.label()),
            outputs: [],
            declarations1: [],
            declarations2: [],
            init: [],
            reset1: [],
            reset2: [],
            constant_rate: [],
            sampling_rate: [],
            controls_rate: [],
            audio_rate: [],
            delay_updates: [],
            output_updates: []
          };
          let extra_vars_n = 0;
          graph.blocks.forEach((block) => block.output_ports.forEach((oport) => oport.code = MagicString()));
          graph_init.blocks.forEach((block) => block.output_ports.forEach((oport) => oport.code = MagicString()));
          graph.input_ports.forEach((ip) => ip.block.operation = "VAR_IN");
          graph.output_ports.forEach((op) => op.block.operation = "VAR_OUT");
          graph_init.input_ports.forEach((ip) => ip.block.operation = "VAR_IN");
          const id_prefix_ = getIdPrefix(target_lang);
          schedule.forEach((block) => convertBlock(block));
          schedule_init.forEach((block) => convertBlockInit(block));
          for (let outi = 0; outi < graph.output_ports.length; outi++) {
            program.outputs[outi] = graph.output_ports[outi].block.label() + "_out_";
            appendAssignment(program.outputs[outi] + getIndexer(target_lang, "i"), graph.output_ports[outi].code, 5, null);
          }
          groupControls();
          graph.input_ports.filter((p) => p.update_rate === 2).map((p) => p.block).forEach(function(block) {
            program.declarations2.push(MagicString(block.output_ports[0].code));
            program.init.push(MagicString(block.output_ports[0].code, " = ", getNumber(target_lang, block.block_init.output_ports[0].code.toString())));
          });
          doT.templateSettings.strip = false;
          if (target_lang === "C") {
            return [
              { name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
              { name: graph.id + ".c", str: doT.template(templates["C_c"])(program) }
            ];
          } else if (target_lang === "cpp") {
            return [
              { name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
              { name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) }
            ];
          } else if (target_lang === "VST2") {
            return [
              { name: graph.id + ".h", str: doT.template(templates["cpp_h"])(program) },
              { name: graph.id + ".cpp", str: doT.template(templates["cpp_cpp"])(program) },
              { name: graph.id + "_vst2_wrapper.h", str: doT.template(templates["vst2_wrapper_h"])(program) },
              { name: graph.id + "_vst2_wrapper.cpp", str: doT.template(templates["vst2_wrapper_cpp"])(program) }
            ];
          } else if (target_lang === "yaaaeapa") {
            return [
              { name: graph.id + ".h", str: doT.template(templates["C_h"])(program) },
              { name: graph.id + ".c", str: doT.template(templates["C_c"])(program) },
              { name: graph.id + "_yaaaeapa_wrapper.c", str: doT.template(templates["yaaaeapa_wrapper_c"])(program) }
            ];
          } else if (target_lang === "MATLAB") {
            return [
              { name: graph.id + ".m", str: doT.template(templates["matlab"])(program) }
            ];
          } else if (target_lang === "js") {
            return [
              { name: "main.html", str: doT.template(templates["js_html"])(program) },
              { name: "processor.js", str: doT.template(templates["js_processor"])(program) }
            ];
          } else if (target_lang === "d") {
            return [
              { name: "d_processor.d", str: doT.template(templates["d_processor"])(program) }
            ];
          }
          function convertBlock(block) {
            const input_blocks = graph.getInputBlocks(block);
            const output_blocks = graph.getOutputBlocks(block);
            const input_blocks_code = input_blocks.map((b) => b.output_ports[0].code);
            const update_rate = block.output_ports[0].update_rate;
            const code = block.output_ports[0].code;
            const auxcode = MagicString();
            let is_used_locally = true;
            is_used_locally = output_blocks.every((b) => b.output_ports[0].update_rate === update_rate);
            if (update_rate === 2 && is_used_locally)
              is_used_locally = output_blocks.every((b) => checkSetEquality(b.control_dependencies, block.control_dependencies));
            if (is_used_locally && block.if_owners.length > 0) {
              let bb = block.if_owners[block.if_owners.length - 1];
              is_used_locally = output_blocks.every((b) => b.if_owners.some((i) => i.ifblock === bb.ifblock && i.branch === bb.branch));
              if (output_blocks.some((b) => b.operation === "DELAY1_EXPR"))
                is_used_locally = false;
            }
            const id_prefix = is_used_locally || update_rate === 0 ? "" : id_prefix_;
            if (!block.output_ports[0].toBeCached) {
              if (update_rate === 2 && output_blocks.length > 0 && !checkSetEquality(output_blocks[0].control_dependencies, block.control_dependencies))
                block.output_ports[0].toBeCached = true;
            }
            if (block.ifoutputindex !== void 0 && !isNaN(block.ifoutputindex)) {
              code.add(id_prefix_, block.label());
              appendAssignment(code, "", 666, null, true, false, null);
              return;
            }
            switch (block.operation) {
              case "VAR":
                if (input_blocks[0].operation === "NUMBER")
                  code.add(input_blocks_code[0]);
                else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
                  code.add(id_prefix, block.label());
                  appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners);
                } else
                  code.add(input_blocks_code[0]);
                return;
              case "VAR_IN":
                if (update_rate === 3) {
                  code.add(block.label(), getIndexer(target_lang, "i"));
                } else if (update_rate === 2)
                  code.add(id_prefix_, block.label());
                return;
              case "VAR_OUT":
                code.add(id_prefix, block.label());
                appendAssignment(code, input_blocks_code[0], update_rate, block.control_dependencies, true, is_used_locally, block.if_owners);
                return;
              case "DELAY1_EXPR":
                const id = "_delayed_" + extra_vars_n++;
                code.add(id_prefix_, id);
                appendAssignment(code, input_blocks_code[0], 4, block.control_dependencies, false, false, block.if_owners);
                appendAssignment(code, input_blocks[0].block_init.output_ports[0].code, -1, null, true, false, block.if_owners);
                return;
              case "NUMBER":
                code.add(getNumber(target_lang, block.val.toString()));
                return;
              case "SAMPLERATE":
                code.add(id_prefix_, "fs");
                return;
              case "IF_THEN_ELSE":
                if (["C", "cpp", "VST2", "yaaaeapa", "d", "js"].includes(target_lang)) {
                  code.add("if (", input_blocks_code[0], ") {\n");
                  code.add("_branch0_");
                  code.add("\n} else {\n");
                  code.add("_branch1_");
                  code.add("\n}\n");
                } else if (target_lang === "MATLAB") {
                  code.add("if (", input_blocks_code[0], ")\n");
                  code.add("_branch0_");
                  code.add("\nelse\n");
                  code.add("_branch1_");
                  code.add("\nendif\n");
                }
                appendIfStatement(block, code, input_blocks[0].output_ports[0].update_rate, block.if_owners, output_blocks, input_blocks, block.control_dependencies);
                return;
              case "UMINUS_EXPR":
                auxcode.add("-(", input_blocks_code[0], ")");
                break;
              case "PLUS_EXPR":
                auxcode.add("(", input_blocks_code[0], " + ", input_blocks_code[1], ")");
                break;
              case "MINUS_EXPR":
                auxcode.add("(", input_blocks_code[0], " - ", input_blocks_code[1], ")");
                break;
              case "TIMES_EXPR":
                auxcode.add("(", input_blocks_code[0], " * ", input_blocks_code[1], ")");
                break;
              case "DIV_EXPR":
                auxcode.add("(", input_blocks_code[0], " / ", input_blocks_code[1], ")");
                break;
              case "EXTERNAL_FUNC_CALL":
                auxcode.add(block.id, "(");
                for (let ii = 0; ii < input_blocks_code.length; ii++) {
                  auxcode.add(input_blocks_code[ii]);
                  if (ii !== input_blocks_code.length - 1)
                    auxcode.add(", ");
                }
                auxcode.add(")");
                break;
              case "OR_EXPR":
                auxcode.add("(", input_blocks_code[0], " || ", input_blocks_code[1], ")");
                break;
              case "AND_EXPR":
                auxcode.add("(", input_blocks_code[0], " && ", input_blocks_code[1], ")");
                break;
              case "EQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " == ", input_blocks_code[1], ")");
                break;
              case "NOTEQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " != ", input_blocks_code[1], ")");
                break;
              case "LESS_EXPR":
                auxcode.add("(", input_blocks_code[0], " < ", input_blocks_code[1], ")");
                break;
              case "LESSEQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " <= ", input_blocks_code[1], ")");
                break;
              case "GREATER_EXPR":
                auxcode.add("(", input_blocks_code[0], " > ", input_blocks_code[1], ")");
                break;
              case "GREATEREQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " >= ", input_blocks_code[1], ")");
                break;
              case "NOT_EXPR":
                auxcode.add("!(", input_blocks_code[0], ")");
                break;
              default:
                throw new Error("Unexpected block operation: " + block.operation);
            }
            if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
              code.add(id_prefix, program.class_name + "_extra_" + extra_vars_n++);
              appendAssignment(code, auxcode, update_rate, block.control_dependencies, true, is_used_locally, block.if_owners);
            } else
              code.add(auxcode);
          }
          function convertBlockInit(block) {
            const input_blocks = graph_init.getInputBlocks(block);
            const output_blocks = graph_init.getOutputBlocks(block);
            const input_blocks_code = input_blocks.map((b) => b.output_ports[0].code);
            const update_rate = block.output_ports[0].update_rate;
            const level = update_rate === 2 ? -2 : update_rate;
            const code = block.output_ports[0].code;
            const auxcode = MagicString();
            let is_used_locally = true;
            is_used_locally = false;
            const id_prefix = is_used_locally || update_rate === 0 ? "" : id_prefix_;
            switch (block.operation) {
              case "VAR":
                if (input_blocks[0].operation === "NUMBER")
                  code.add(input_blocks_code[0]);
                else if (block.output_ports[0].toBeCached || output_blocks.length > 1) {
                  code.add(id_prefix, block.label());
                  appendAssignment(code, input_blocks_code[0], level, block.control_dependencies, true, is_used_locally);
                } else
                  code.add(input_blocks_code[0]);
                return;
              case "VAR_IN":
                if (update_rate === 0)
                  code.add(block.val);
                else
                  throw new Error("Unexpected update_rate in init graph " + block + ": " + update_rate);
                return;
              case "DELAY1_EXPR":
                code.add(input_blocks_code[0]);
                return;
              case "NUMBER":
                code.add(getNumber(target_lang, block.val.toString()));
                return;
              case "SAMPLERATE":
                code.add(id_prefix, "fs");
                return;
              case "UMINUS_EXPR":
                auxcode.add("-(", input_blocks_code[0], ")");
                break;
              case "PLUS_EXPR":
                auxcode.add("(", input_blocks_code[0], " + ", input_blocks_code[1], ")");
                break;
              case "MINUS_EXPR":
                auxcode.add("(", input_blocks_code[0], " - ", input_blocks_code[1], ")");
                break;
              case "TIMES_EXPR":
                auxcode.add("(", input_blocks_code[0], " * ", input_blocks_code[1], ")");
                break;
              case "DIV_EXPR":
                auxcode.add("(", input_blocks_code[0], " / ", input_blocks_code[1], ")");
                break;
              case "EXTERNAL_FUNC_CALL":
                auxcode.add(block.id, "(");
                for (let ii = 0; ii < input_blocks_code.length; ii++) {
                  auxcode.add(input_blocks_code[ii]);
                  if (ii !== input_blocks_code.length - 1)
                    auxcode.add(", ");
                }
                auxcode.add(")");
                break;
              case "OR_EXPR":
                auxcode.add("(", input_blocks_code[0], " || ", input_blocks_code[1], ")");
                break;
              case "AND_EXPR":
                auxcode.add("(", input_blocks_code[0], " && ", input_blocks_code[1], ")");
                break;
              case "EQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " == ", input_blocks_code[1], ")");
                break;
              case "NOTEQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " != ", input_blocks_code[1], ")");
                break;
              case "LESS_EXPR":
                auxcode.add("(", input_blocks_code[0], " < ", input_blocks_code[1], ")");
                break;
              case "LESSEQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " <= ", input_blocks_code[1], ")");
                break;
              case "GREATER_EXPR":
                auxcode.add("(", input_blocks_code[0], " > ", input_blocks_code[1], ")");
                break;
              case "GREATEREQUAL_EXPR":
                auxcode.add("(", input_blocks_code[0], " >= ", input_blocks_code[1], ")");
                break;
              case "NOT_EXPR":
                auxcode.add("!(", input_blocks_code[0], ")");
                break;
              default:
                throw new Error("Unexpected block operation: " + block.operation);
            }
            if (block.output_ports[0].toBeCached) {
              code.add(id_prefix, program.class_name + "_extraI_" + extra_vars_n++);
              appendAssignment(code, auxcode, level, block.control_dependencies, true, is_used_locally);
            } else
              code.add(auxcode);
          }
          function appendAssignment(left, right, level, control_dependencies, to_be_declared, is_used_locally, if_owners) {
            let stmt = MagicString(left, " = ", right);
            stmt.if_owners = if_owners;
            if (is_used_locally) {
              if (level !== 0)
                stmt.is_used_locally = true;
            } else {
              if (to_be_declared && level !== 0) {
                program.declarations1.push(left);
                program.init.push(MagicString(left, " = ", getNumber(target_lang, "0")));
              }
            }
            switch (level) {
              case -2:
                program.reset1.push(stmt);
                break;
              case -1:
                program.reset2.push(stmt);
                break;
              case 0:
                program.constant_rate.push(stmt);
                break;
              case 1:
                program.sampling_rate.push(stmt);
                break;
              case 2:
                stmt.control_dependencies = control_dependencies;
                program.controls_rate.push(stmt);
                break;
              case 3:
                program.audio_rate.push(stmt);
                break;
              case 4:
                program.delay_updates.push(stmt);
                break;
              case 5:
                program.output_updates.push(stmt);
                break;
            }
          }
          function appendIfStatement(block, code, cond_level, if_owners, output_blocks, input_blocks, control_dependencies) {
            if (block.output_ports.length !== output_blocks.length)
              throw new Error("Something is wrong");
            const levels = ["constant_rate", "sampling_rate", "controls_rate", "audio_rate"];
            for (let lvl = cond_level; lvl < levels.length; lvl++) {
              let out_i = [];
              for (let i = 0; i < block.output_ports.length; i++) {
                let ur = block.output_ports[i].update_rate;
                if (ur === lvl || lvl === cond_level && ur <= lvl) {
                  out_i.push(i);
                }
              }
              if (out_i.length === 0)
                continue;
              let stmts = program[levels[lvl]].filter((s) => s.if_owners[s.if_owners.length - 1] && s.if_owners[s.if_owners.length - 1].ifblock === block);
              let b0 = stmts.filter((s) => s.if_owners[s.if_owners.length - 1].branch === 0);
              let b1 = stmts.filter((s) => s.if_owners[s.if_owners.length - 1].branch === 1);
              for (let i of out_i) {
                b0.push(MagicString(
                  output_blocks[i].output_ports[0].code,
                  " = ",
                  input_blocks[i + 1].output_ports[0].code
                ));
                b1.push(MagicString(
                  output_blocks[i].output_ports[0].code,
                  " = ",
                  input_blocks[i + 1 + block.output_ports.length].output_ports[0].code
                ));
              }
              b0.forEach((s) => s.add(";\n"));
              b1.forEach((s) => s.add(";\n"));
              let newcode = MagicString(...code.s);
              newcode.s.splice(newcode.s.indexOf("_branch0_"), 1, ...b0);
              newcode.s.splice(newcode.s.indexOf("_branch1_"), 1, ...b1);
              newcode.control_dependencies = control_dependencies;
              newcode.if_owners = if_owners;
              program[levels[lvl]] = program[levels[lvl]].filter((s) => !stmts.includes(s));
              program[levels[lvl]].push(newcode);
            }
          }
          function groupControls() {
            const Group = function(set) {
              let self = this;
              this.label = Array.from(set).join("_");
              this.set = set;
              this.cardinality = set.size;
              this.equals = (s) => checkSetEquality(self.set, s);
              this.stmts = [];
            };
            let groups = [];
            program.controls_rate.forEach(function(stmt) {
              let group = groups.find((g) => g.equals(stmt.control_dependencies));
              if (group === void 0) {
                group = new Group(stmt.control_dependencies);
                groups.push(group);
              }
              group.stmts.push(stmt);
            });
            groups.sort((a, b) => a.cardinality - b.cardinality);
            program.controls_rate = groups;
          }
        }
        function checkSetsInclusion(A, B) {
          return Array.from(A).every((Av) => Array.from(B).some((Bv) => Av === Bv));
        }
        function checkSetEquality(A, B) {
          return checkSetsInclusion(A, B) && checkSetsInclusion(B, A);
        }
        exports["convert"] = convert;
      })();
    }
  });

  // node_modules/dot/doT.js
  var require_doT = __commonJS({
    "node_modules/dot/doT.js"(exports, module) {
      (function() {
        "use strict";
        var doT = {
          name: "doT",
          version: "1.1.1",
          templateSettings: {
            evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g,
            interpolate: /\{\{=([\s\S]+?)\}\}/g,
            encode: /\{\{!([\s\S]+?)\}\}/g,
            use: /\{\{#([\s\S]+?)\}\}/g,
            useParams: /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
            define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
            defineParams: /^\s*([\w$]+):([\s\S]+)/,
            conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
            iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
            varname: "it",
            strip: true,
            append: true,
            selfcontained: false,
            doNotSkipEncoded: false
          },
          template: void 0,
          //fn, compile template
          compile: void 0,
          //fn, for express
          log: true
        }, _globals;
        doT.encodeHTMLSource = function(doNotSkipEncoded) {
          var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" }, matchHTML = doNotSkipEncoded ? /[&<>"'\/]/g : /&(?!#?\w+;)|<|>|"|'|\//g;
          return function(code) {
            return code ? code.toString().replace(matchHTML, function(m) {
              return encodeHTMLRules[m] || m;
            }) : "";
          };
        };
        _globals = (function() {
          return this || (0, eval)("this");
        })();
        if (typeof module !== "undefined" && module.exports) {
          module.exports = doT;
        } else if (typeof define === "function" && define.amd) {
          define(function() {
            return doT;
          });
        } else {
          _globals.doT = doT;
        }
        var startend = {
          append: { start: "'+(", end: ")+'", startencode: "'+encodeHTML(" },
          split: { start: "';out+=(", end: ");out+='", startencode: "';out+=encodeHTML(" }
        }, skip = /$^/;
        function resolveDefs(c, block, def) {
          return (typeof block === "string" ? block : block.toString()).replace(c.define || skip, function(m, code, assign, value) {
            if (code.indexOf("def.") === 0) {
              code = code.substring(4);
            }
            if (!(code in def)) {
              if (assign === ":") {
                if (c.defineParams) value.replace(c.defineParams, function(m2, param, v) {
                  def[code] = { arg: param, text: v };
                });
                if (!(code in def)) def[code] = value;
              } else {
                new Function("def", "def['" + code + "']=" + value)(def);
              }
            }
            return "";
          }).replace(c.use || skip, function(m, code) {
            if (c.useParams) code = code.replace(c.useParams, function(m2, s, d, param) {
              if (def[d] && def[d].arg && param) {
                var rw = (d + ":" + param).replace(/'|\\/g, "_");
                def.__exp = def.__exp || {};
                def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
                return s + "def.__exp['" + rw + "']";
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
          var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv, str = c.use || c.define ? resolveDefs(c, tmpl, def || {}) : tmpl;
          str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, " ").replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") : str).replace(/'|\\/g, "\\$&").replace(c.interpolate || skip, function(m, code) {
            return cse.start + unescape(code) + cse.end;
          }).replace(c.encode || skip, function(m, code) {
            needhtmlencode = true;
            return cse.startencode + unescape(code) + cse.end;
          }).replace(c.conditional || skip, function(m, elsecase, code) {
            return elsecase ? code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='" : code ? "';if(" + unescape(code) + "){out+='" : "';}out+='";
          }).replace(c.iterate || skip, function(m, iterate, vname, iname) {
            if (!iterate) return "';} } out+='";
            sid += 1;
            indv = iname || "i" + sid;
            iterate = unescape(iterate);
            return "';var arr" + sid + "=" + iterate + ";if(arr" + sid + "){var " + vname + "," + indv + "=-1,l" + sid + "=arr" + sid + ".length-1;while(" + indv + "<l" + sid + "){" + vname + "=arr" + sid + "[" + indv + "+=1];out+='";
          }).replace(c.evaluate || skip, function(m, code) {
            return "';" + unescape(code) + "out+='";
          }) + "';return out;").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r").replace(/(\s|;|\}|^|\{)out\+='';/g, "$1").replace(/\+''/g, "");
          if (needhtmlencode) {
            if (!c.selfcontained && _globals && !_globals._encodeHTML) _globals._encodeHTML = doT.encodeHTMLSource(c.doNotSkipEncoded);
            str = "var encodeHTML = typeof _encodeHTML !== 'undefined' ? _encodeHTML : (" + doT.encodeHTMLSource.toString() + "(" + (c.doNotSkipEncoded || "") + "));" + str;
          }
          try {
            return new Function(c.varname, str);
          } catch (e) {
            if (typeof console !== "undefined") console.log("Could not create a template function: " + str);
            throw e;
          }
        };
        doT.compile = function(tmpl, def) {
          return doT.template(tmpl, null, def);
        };
      })();
    }
  });

  // src/templates/matlab_template.js
  var require_matlab_template = __commonJS({
    "src/templates/matlab_template.js"(exports, module) {
      module.exports = `function [{{=it.outputs.join(', ')}}] = {{=it.class_name}}({{=it.audio_inputs.join(', ')}}{{?it.audio_inputs.length > 0}},{{??}}nSamples,{{?}} fs{{?it.control_inputs.length > 0}},{{?}} {{=it.control_inputs.join(', ')}})

  % constants

  {{~it.constant_rate:c}}{{=c}};
  {{~}}

  % declarations
  {{~it.declarations1:d}}
  {{=d}} = 0;{{~}}

  % fs

  {{~it.sampling_rate:s}}{{=s}};
  {{~}}


  % controlli/coefficienti

  {{~it.controls_rate:c}} 
  % {{=c.label}}
  {{~c.stmts: s}}
  {{=s}};{{~}}
  {{~}}
  

  
  % init delay

  {{~it.reset1:r}}{{=r}};
  {{~}}
  {{~it.reset2:r}}{{=r}};
  {{~}}
  
  
  for i = 1:{{?it.audio_inputs.length > 0}}length({{=it.audio_inputs[0]}}){{??}}nSamples{{?}}

    % audio rate

    {{~it.audio_rate: a}}
    {{=a}};{{~}}

    % delay updates
    
    {{~it.delay_updates:u}}{{=u}};
    {{~}}

    % output

    {{~it.output_updates:u}}
    {{=u}};{{~}}
    
  endfor

endfunction
`;
    }
  });

  // src/templates/C_h_template.js
  var require_C_h_template = __commonJS({
    "src/templates/C_h_template.js"(exports, module) {
      module.exports = `#ifndef _{{=it.class_name.toUpperCase()}}_H
#define _{{=it.class_name.toUpperCase()}}_H

{{?it.control_inputs.length > 0}}
enum {
	{{~it.control_inputs:c}}
	p_{{=c}},{{~}}
};
{{?}}

struct _{{=it.class_name}} {
	{{~it.declarations1:d}}
	float {{=d.toString().replace("instance->", "")}};{{~}}
	
	{{~it.declarations2:d}}
	float {{=d.toString().replace("instance->", "")}};{{~}}

	{{~it.control_inputs:c}}
	float {{=c}}_z1;
	char {{=c}}_CHANGED;
	{{~}}

	float fs;
	char firstRun;
};
typedef struct _{{=it.class_name}} {{=it.class_name}};


void {{=it.class_name}}_init({{=it.class_name}} *instance);
void {{=it.class_name}}_set_sample_rate({{=it.class_name}} *instance, float sample_rate);
void {{=it.class_name}}_reset({{=it.class_name}} *instance);
void {{=it.class_name}}_process({{=it.class_name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.outputs.length > 0}}{{=it.outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples);
float {{=it.class_name}}_get_parameter({{=it.class_name}} *instance, int index);
void {{=it.class_name}}_set_parameter({{=it.class_name}} *instance, int index, float value);

#endif
`;
    }
  });

  // src/templates/C_c_template.js
  var require_C_c_template = __commonJS({
    "src/templates/C_c_template.js"(exports, module) {
      module.exports = `#include "{{=it.class_name}}.h"

{{~it.constant_rate:c}}static const float {{=c}};
{{~}}

void {{=it.class_name}}_init({{=it.class_name}} *instance) {
	{{~it.init:d}}
	{{=d}};{{~}}
}

void {{=it.class_name}}_reset({{=it.class_name}} *instance) {
	instance->firstRun = 1;
}

void {{=it.class_name}}_set_sample_rate({{=it.class_name}} *instance, float sample_rate) {
	instance->fs = sample_rate;
	{{~it.sampling_rate:s}}{{=s}};
	{{~}}
}

void {{=it.class_name}}_process({{=it.class_name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.outputs.length > 0}}{{=it.outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples) {
	if (instance->firstRun) {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = instance->{{=c}} != instance->{{=c}}_z1;{{~}}
	}
	{{~it.controls_rate:c}}
	if ({{=Array.from(c.set).map(e => "instance->" + e + "_CHANGED").join(' | ')}}) {{{~c.stmts: s}}
		{{=s}};{{~}}
	}{{~}}
	{{~it.control_inputs:c}}
	instance->{{=c}}_CHANGED = 0;{{~}}

	if (instance->firstRun) {{{~it.reset1:r}}
		{{=r}};{{~}}
		{{~it.reset2:r}}
		{{=r}};{{~}}
	}

	for (int i = 0; i < nSamples; i++) {
		{{~it.audio_rate: a}}
		{{=a}};{{~}}
		
		{{~it.delay_updates:u}}{{=u}};
		{{~}}
		{{~it.output_updates:u}}
		{{=u}};{{~}}
	}

	{{~it.control_inputs:c}}
	instance->{{=c}}_z1 = instance->{{=c}};{{~}}
	instance->firstRun = 0;
}

float {{=it.class_name}}_get_parameter({{=it.class_name}} *instance, int index) {
	switch (index) {
		{{~it.control_inputs:c}}case p_{{=c}}:
			return instance->{{=c}};
		{{~}}
		default:
			(void)instance;
			return 0.0f;
	}
}

void {{=it.class_name}}_set_parameter({{=it.class_name}} *instance, int index, float value) {
	switch (index) {
		{{~it.control_inputs:c}}case p_{{=c}}:
			instance->{{=c}} = value;
			break;
		{{~}}
		default:
			(void)instance;
			(void)value;
			return;
	}
}
`;
    }
  });

  // src/templates/cpp_h_template.js
  var require_cpp_h_template = __commonJS({
    "src/templates/cpp_h_template.js"(exports, module) {
      module.exports = `class {{=it.class_name}}
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process({{=it.audio_inputs.concat(it.outputs).map(x => 'float *' + x).join(', ')}}, int nSamples);
{{~it.control_inputs:c}}
	float get{{=c}}();
	void set{{=c}}(float value);{{~}}

private:

	{{~it.init:d}}
	float {{=d}};{{~}}

	{{~it.control_inputs:c}}
	float {{=c}}_z1;
	char {{=c}}_CHANGED;
	{{~}}

	float fs;
	char firstRun;

};
`;
    }
  });

  // src/templates/cpp_cpp_template.js
  var require_cpp_cpp_template = __commonJS({
    "src/templates/cpp_cpp_template.js"(exports, module) {
      module.exports = `#include "{{=it.class_name}}.h"


{{~it.constant_rate:c}}static const float {{=c}};
{{~}}

void {{=it.class_name}}::reset()
{
	firstRun = 1;
}

void {{=it.class_name}}::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	{{~it.sampling_rate:s}}{{=s}};
	{{~}}
}

void {{=it.class_name}}::process({{=it.audio_inputs.concat(it.outputs).map(x => 'float *' + x).join(', ')}}, int nSamples)
{
	if (firstRun) {{{~it.control_inputs:c}}
		{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.control_inputs:c}}
		{{=c}}_CHANGED = {{=c}} != {{=c}}_z1;{{~}}
	}
	{{~it.controls_rate:c}}
	if ({{=Array.from(c.set).map(e => e + "_CHANGED").join(' | ')}}) {{{~c.stmts: s}}
		{{=s}};{{~}}
	}{{~}}
	{{~it.control_inputs:c}}
	{{=c}}_CHANGED = 0;{{~}}

	if (firstRun) {{{~it.reset1:r}}
		{{=r}};{{~}}
		{{~it.reset2:r}}
		{{=r}};{{~}}
	}

	for (int i = 0; i < nSamples; i++) {
		{{~it.audio_rate: a}}
		{{=a}};{{~}}
		
		{{~it.delay_updates:u}}{{=u}};
		{{~}}
		{{~it.output_updates:u}}
		{{=u}};{{~}}
	}

	{{~it.control_inputs:c}}
	{{=c}}_z1 = {{=c}};{{~}}
	firstRun = 0;
}

{{~it.control_inputs: c}}
float {{=it.class_name}}::get{{=c}}() {
	return {{=c}};
}
void {{=it.class_name}}::set{{=c}}(float value) {
	{{=c}} = value;
}
{{~}}
`;
    }
  });

  // src/templates/vst2_wrapper_h_template.js
  var require_vst2_wrapper_h_template = __commonJS({
    "src/templates/vst2_wrapper_h_template.js"(exports, module) {
      module.exports = `#ifndef _EFFECT_H
#define _EFFECT_H

#include "audioeffectx.h"
#include "{{=it.class_name}}.h"

class Effect : public AudioEffectX
{
public:
	Effect(audioMasterCallback audioMaster);
	~Effect();

	virtual void setSampleRate(float sampleRate);
	virtual void process(float **inputs, float **outputs, VstInt32 sampleFrames);
	virtual void processReplacing(float **inputs, float **outputs, VstInt32 sampleFrames);
	virtual void setProgramName(char *name);
	virtual void getProgramName(char *name);
	virtual bool getProgramNameIndexed(VstInt32 category, VstInt32 index, char* name);
	virtual void setParameter(VstInt32 index, float value);
	virtual float getParameter(VstInt32 index);
	virtual void getParameterLabel(VstInt32 index, char *label);
	virtual void getParameterDisplay(VstInt32 index, char *text);
	virtual void getParameterName(VstInt32 index, char *text);

	virtual bool getEffectName(char *name);
	virtual bool getVendorString(char *text);
	virtual bool getProductString(char *text);
	virtual VstInt32 getVendorVersion() { return 1000; }

private:
	char programName[32];

	{{=it.class_name}} instance;
};

#endif
`;
    }
  });

  // src/templates/vst2_wrapper_cpp_template.js
  var require_vst2_wrapper_cpp_template = __commonJS({
    "src/templates/vst2_wrapper_cpp_template.js"(exports, module) {
      module.exports = `#include "{{=it.class_name}}_vst2_wrapper.h"

#include <cstdlib>
#include <cstdio>
#include <cmath>
#include <algorithm>

AudioEffect *createEffectInstance(audioMasterCallback audioMaster) { return new Effect(audioMaster); }

Effect::Effect(audioMasterCallback audioMaster) : AudioEffectX(audioMaster, 1, {{=it.control_inputs.length}}) {
	setNumInputs({{=it.audio_inputs.length}});
	setNumOutputs({{=it.outputs.length}});
	setUniqueID('fxfx');
	DECLARE_VST_DEPRECATED(canMono) ();
	canProcessReplacing();
	strcpy(programName, "Effect");

	instance = {{=it.class_name}}();
}

Effect::~Effect() {}

bool Effect::getProductString(char* text) { strcpy(text, "Effect"); return true; }
bool Effect::getVendorString(char* text) { strcpy(text, "Ciaramella"); return true; }
bool Effect::getEffectName(char* name) { strcpy(name, "Effect"); return true; }

void Effect::setProgramName(char *name) { strcpy(programName, name); }
void Effect::getProgramName(char *name) { strcpy(name, programName); }

bool Effect::getProgramNameIndexed(VstInt32 category, VstInt32 index, char* name) {
	if (index == 0) {
		strcpy(name, programName);
		return true;
	}
	return false;
}

void Effect::setParameter(VstInt32 index, float value) {
	switch (index) {
	{{~it.control_inputs:c}}
	case {{=it.control_inputs.indexOf(c)}}:
		instance.set{{=c}}(value);
		break;{{~}}
	}
}

float Effect::getParameter(VstInt32 index) {
	float v = 0.f;
	switch (index) {
	{{~it.control_inputs:c}}
	case {{=it.control_inputs.indexOf(c)}}:
		v = instance.get{{=c}}();
		break;{{~}}
	}
	return v;
}

void Effect::getParameterName(VstInt32 index, char *text) {
	const char *names[] = { {{=it.control_inputs.map(c => '\\"' +c+'\\"')}}};
	strcpy(text, names[index]);
}

void Effect::getParameterDisplay(VstInt32 index, char *text) {
	text[0] = '\\0';
}

void Effect::getParameterLabel(VstInt32 index, char *text)  {
	text[0] = '\\0';
}

void Effect::setSampleRate(float sampleRate) {
	instance.setSampleRate(sampleRate);
	instance.reset();
}

void Effect::process(float **inputs, float **outputs, VstInt32 sampleFrames) {
	instance.process({{=it.audio_inputs.map(i => 'inputs['+it.audio_inputs.indexOf(i)+']')}}, {{=it.outputs.map(i => 'outputs['+it.outputs.indexOf(i)+']')}}, sampleFrames);
}

void Effect::processReplacing(float **inputs, float **outputs, VstInt32 sampleFrames) {
	instance.process({{=it.audio_inputs.map(i => 'inputs['+it.audio_inputs.indexOf(i)+']')}}, {{=it.outputs.map(i => 'outputs['+it.outputs.indexOf(i)+']')}}, sampleFrames);
}
`;
    }
  });

  // src/templates/yaaaeapa_wrapper_c_template.js
  var require_yaaaeapa_wrapper_c_template = __commonJS({
    "src/templates/yaaaeapa_wrapper_c_template.js"(exports, module) {
      module.exports = `#include "{{=it.class_name}}.h"

// Implementing the yaaaeapa interface

{{=it.class_name}} instance;

void yaaaeapa_init(void) {
	{{=it.class_name}}_init(&instance);
}
void yaaaeapa_fini(void) {
}
void yaaaeapa_set_sample_rate(float sample_rate) {
	{{=it.class_name}}_set_sample_rate(&instance, sample_rate);
}
void yaaaeapa_reset(void) {
	{{=it.class_name}}_reset(&instance);
}
void yaaaeapa_process(const float** x, float** y, int n_samples) {
	{{=it.class_name}}_process(&instance, {{~it.audio_inputs:a:i}}x[{{=i}}], {{~}}{{~it.outputs:o:i}}y[{{=i}}], {{~}} n_samples);
}
void yaaaeapa_set_parameter(int index, float value) {
	{{=it.class_name}}_set_parameter(&instance, index, value);
}
float yaaaeapa_get_parameter(int index) {
	return {{=it.class_name}}_get_parameter(&instance, index);
}
void yaaaeapa_note_on(char note, char velocity) {
	(void)note;
	(void)velocity;
}
void yaaaeapa_note_off(char note) {
	(void)note;
}
void yaaaeapa_pitch_bend(int bend) {
	(void)bend;
}
void yaaaeapa_mod_wheel(char wheel) {
	(void)wheel;
}

int yaaaeapa_parameters_n 	= {{=it.control_inputs.length}};
int yaaaeapa_buses_in_n 	= 1;
int yaaaeapa_buses_out_n 	= 1;
int yaaaeapa_channels_in_n 	= {{=it.audio_inputs.length}};
int yaaaeapa_channels_out_n	= {{=it.outputs.length}};
//void* yaaaeapa_data 		= NULL;

void yaaaeapa_get_parameter_info (int index, char** name, char** shortName, char** units, char* out, char* bypass, int* steps, float* defaultValueUnmapped) {
	if (index < 0 || index >= {{=it.control_inputs.length}}) return;
	switch (index) {
	{{~it.control_inputs:c:i}}
		case {{=i}}:
			if (name) *name = (char*) "{{=c}}";
			if (shortName) *shortName = (char*) "{{=c}}";
			if (units) *units = (char*) "";
			if (out) *out = 0;
			if (bypass) *bypass = 0;
			if (steps) *steps = 0;
			if (defaultValueUnmapped) *defaultValueUnmapped = 0.f; // Fix
			break;
	{{~}}
	}
}
`;
    }
  });

  // src/templates/js_html_template.js
  var require_js_html_template = __commonJS({
    "src/templates/js_html_template.js"(exports, module) {
      module.exports = `<!DOCTYPE html>
<html>
<head>
<title>Plugin</title>
<script type="text/javascript">

let node;
let ctx;
let inputNode;

const begin = async function () {
	ctx = new AudioContext();

	await ctx.audioWorklet.addModule("processor.js");

	node = new AudioWorkletNode(ctx, "PluginProcessor", { numberOfInputs:1,  numberOfOutputs:1, outputChannelCount: [{{=it.outputs.length}}] });

	node.connect(ctx.destination);

	const stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false, latency: 0.005 } });
	inputNode = ctx.createMediaStreamSource(stream);

	inputNode.connect(node);

  {{~it.control_inputs:c}}
  document.getElementById("{{=c}}").oninput = handleInput; {{~}}
  
}

function handleInput(e) {
	node.port.postMessage({type: "paramChange", id: e.target.id, value: e.target.value})
}
<\/script>
</head>
<body>
  <h1>{{=it.class_name}}</h1>
  
  {{~it.control_inputs:c}}
  <label for="{{=c}}">{{=c}}</label>
  <input type="range" id="{{=c}}" name="{{=c}}" min="0" max="1" value="0.5" step="any"><br>{{~}}

  <button onclick="begin()">Start</button>
</body>
</html>
`;
    }
  });

  // src/templates/js_processor_template.js
  var require_js_processor_template = __commonJS({
    "src/templates/js_processor_template.js"(exports, module) {
      module.exports = `{{~it.constant_rate:c}}const {{=c}};
{{~}}

const Plugin = {
	init: function () {
		this.fs = 0;
		this.firstRun = 1;

		this.params = [{{=it.control_inputs.map(c => '"' + c + '"').join(", ")}}];

		{{~it.init:d}}
		{{=d}};{{~}}

		{{~it.control_inputs:c}}
		this.{{=c}}_z1 = 0;
		this.{{=c}}_CHANGED = true;
		{{~}}
	},

	reset: function () {
		this.firstRun = 1
	},

	setSampleRate: function (sampleRate) {
		this.fs = sampleRate;
		{{~it.sampling_rate:s}}{{=s}};
		{{~}}
	},

	process: function ({{=it.audio_inputs.concat(it.outputs).join(', ')}}, nSamples) {
		if (this.firstRun) {{{~it.control_inputs:c}}
			this.{{=c}}_CHANGED = true;{{~}}
		}
		else {{{~it.control_inputs:c}}
			this.{{=c}}_CHANGED = this.{{=c}} !== this.{{=c}}_z1;{{~}}
		}

		{{~it.controls_rate:c}}
		if ({{=Array.from(c.set).map(e => "this." + e + "_CHANGED").join(' | ')}}) {{{~c.stmts: s}}
			{{=s}};{{~}}
		}{{~}}
		{{~it.control_inputs:c}}
		this.{{=c}}_CHANGED = false;{{~}}

		if (this.firstRun) { {{~it.reset1:r}}
			{{=r}};{{~}}
			{{~it.reset2:r}}
			{{=r}};{{~}}
		}

		for (let i = 0; i < nSamples; i++) {
			{{~it.audio_rate: a}}
			{{=a}};{{~}}
			
			{{~it.delay_updates:u}}{{=u}};
			{{~}}
			{{~it.output_updates:u}}
			{{=u}};{{~}}
		}

		{{~it.control_inputs:c}}
		this.{{=c}}_z1 = this.{{=c}};{{~}}
		this.firstRun = 0;
	}
}

// Static part
class PluginProcessor extends AudioWorkletProcessor {
	constructor () {

		super();
		this.instance = Object.create(Plugin);
		this.instance.init();
		this.instance.setSampleRate(sampleRate);
		this.instance.reset();

		this.port.onmessage = (e) => {
			if (e.data.type === "changeInstance") {
				eval(e.data.value)
				this.instance = Object.create(Plugin);
				this.instance.init();
				this.instance.setSampleRate(sampleRate);
				this.instance.reset();
			}
			else if (e.data.type === "paramChange") {
				this.instance[e.data.id] = e.data.value
			}
		}
	}
	process (inputs, outputs, parameters) {

		const input = inputs[0];
		const output = outputs[0];
		let nSamples = Math.min(input.length >= 1 ? input[0].length : 0, output[0].length)
		


		this.instance.process({{=it.audio_inputs.map((ii, i) => "input[" + i + "]")}}{{?it.audio_inputs.length > 0}}, {{?}} {{=it.outputs.map((ii, i) => "output[" + i + "]")}}, nSamples);

		return true;
	}

	static get parameterDescriptors() {
		return [];
	}
}

registerProcessor("PluginProcessor", PluginProcessor);
`;
    }
  });

  // src/templates/d_processor_template.js
  var require_d_processor_template = __commonJS({
    "src/templates/d_processor_template.js"(exports, module) {
      module.exports = `struct {{=it.class_name}}
{
nothrow:
public:
@nogc:

    {{~it.constant_rate:c}}enum float {{=c}};
    {{~}}

    void setSampleRate(float sampleRate)
    {
        fs = sampleRate;
        {{~it.sampling_rate:s}}{{=s}};
        {{~}}
    }

    void reset()
    {
        firstRun = 1;
    }

    void process({{=it.audio_inputs.concat(it.outputs).map(x => 'float *' + x).join(', ')}}, int nSamples)
    {
        if (firstRun) 
        {
            {{~it.control_inputs:c}}{{=c}}_CHANGED = 1;
            {{~}}
        }
        else {{{~it.control_inputs:c}}
            {{=c}}_CHANGED = {{=c}} != {{=c}}_z1;{{~}}
        }
        {{~it.controls_rate:c}}
        if ({{=Array.from(c.set).map(e => e + "_CHANGED").join(' | ')}}) {{{~c.stmts: s}}
            {{=s}};{{~}}
        }{{~}}
        {{~it.control_inputs:c}}
        {{=c}}_CHANGED = 0;{{~}}

        if (firstRun) {{{~it.reset1:r}}
            {{=r}};{{~}}
            {{~it.reset2:r}}
            {{=r}};{{~}}
        }

        for (int i = 0; i < nSamples; i++) {
            {{~it.audio_rate: a}}
            {{=a}};{{~}}

            {{~it.delay_updates:u}}{{=u}};
            {{~}}
            {{~it.output_updates:u}}
            {{=u}};{{~}}
        }

        {{~it.control_inputs:c}}
        {{=c}}_z1 = {{=c}};{{~}}
        firstRun = 0;
    }

    {{~it.control_inputs:c}}
    float get{{=c}}()
    {
        return {{=c}};
    }
    void set{{=c}}(float value)
    {
        {{=c}} = value;
    }
    {{~}}

private:

    {{~it.init:d}}
    float {{=d}};{{~}}

    {{~it.control_inputs:c}}
    float {{=c}}_z1;
    char {{=c}}_CHANGED;
    {{~}}

    float fs;
    int firstRun;

};
`;
    }
  });

  // src/zampogna.js
  var require_zampogna = __commonJS({
    "src/zampogna.js"(exports) {
      (function() {
        "use strict";
        function createDefaultEnv() {
          return {
            "parser": require_grammar(),
            "extended_syntax": require_extended_syntax(),
            "graph": require_graph(),
            "scheduler": require_scheduler(),
            "output_generation": require_output_generation(),
            "doT": require_doT(),
            "templates": {
              "matlab": require_matlab_template(),
              "C_h": require_C_h_template(),
              "C_c": require_C_c_template(),
              "cpp_h": require_cpp_h_template(),
              "cpp_cpp": require_cpp_cpp_template(),
              "vst2_wrapper_h": require_vst2_wrapper_h_template(),
              "vst2_wrapper_cpp": require_vst2_wrapper_cpp_template(),
              "yaaaeapa_wrapper_c": require_yaaaeapa_wrapper_c_template(),
              "js_html": require_js_html_template(),
              "js_processor": require_js_processor_template(),
              "d_processor": require_d_processor_template()
            }
          };
        }
        function compile(env, debug, code, initial_block, control_inputs, initial_values, target_lang) {
          if (!env)
            env = createDefaultEnv();
          const tree = env["parser"].parse(code);
          if (debug) console.log(tree);
          const scopes = env["extended_syntax"].validate(tree);
          if (debug) console.log(scopes.join("").toString());
          const graphes = env["graph"].ASTToGraph(tree, initial_block, control_inputs, initial_values);
          if (debug) console.log("G1__: ", graphes[0]);
          if (debug) console.log("G2__: ", graphes[1]);
          const scheduled_blocks = env["scheduler"].schedule(graphes[0]);
          const scheduled_blocks_init = env["scheduler"].scheduleInit(graphes[1]);
          if (debug) console.log(scheduled_blocks.map((b) => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")));
          if (debug) console.log(scheduled_blocks_init.map((b) => b.operation + "   " + b.label() + " " + (b.val ? b.val : "")));
          const files = env["output_generation"].convert(env["doT"], env["templates"], target_lang, graphes[0], graphes[1], scheduled_blocks, scheduled_blocks_init);
          return files;
        }
        exports["compile"] = compile;
      })();
    }
  });
  return require_zampogna();
})();
