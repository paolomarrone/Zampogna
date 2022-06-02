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

%%

program             : program_stmts0
                        {{ 
                            $$ = {
                                name: 'PROGRAM',
                                stmts: $1
                            }; 
                            return $$; 
                        }}
                    ;

program_stmts0      : program_stmt program_stmts0
                        {{
                            $$ = $1.concat($2); 
                        }}
                    |
                        {{
                            $$ = [];
                        }}
                    ;

program_stmt        : const
                        {{
                            $$ = [$1]
                        }}
                    | block_def
                        {{
                            $$ = [$1]
                        }}
                    | END
                        {{
                            $$ = []
                        }}
                    ;

const               : assignment
                        {{
                            $$ = $1
                        }}
                    ;

block_def           : ids_list1 ASSIGN id LPAREN exprs_list0 RPAREN LBRACE block_stmts1 RBRACE
                        {{
                            $$ = {
                                name: 'BLOCK_DEF',
                                id: $3,
                                inputs: $5,
                                outputs: $1,
                                body: $8
                            }
                        }}
                    ;

anonym_block_def    : ids_list1 ASSIGN LBRACE block_stmts1 RBRACE
                        {{
                            $$ = {
                                name:    'ANONYM_BLOCK_DEF',
                                id:      {name: 'ID', val: ''},
                                inputs:  [],
                                outputs: $1,
                                body:    $4
                            }
                        }}
                    ;

ids_list1           : id
                        {{
                            $$ = [$1]
                        }}
                    | INIT id
                        {{
                            $2.init = true
                            $$ = [$2]
                        }}
                    | id COMMA ids_list1
                        {{
                            $$ = [$1].concat($3)
                        }}
                    ;

block_stmts1        : block_stmt block_stmts1
                        {{
                            $$ = $1.concat($2)
                        }}
                    | block_stmt
                        {{
                            $$ = $1
                        }}
                    ;

block_stmt          : assignment END
                        {{
                            $$ = [$1]
                        }}
                    | block_def END
                        {{
                            $$ = [$1]
                        }}
                    | anonym_block_def END
                        {{
                            $$ = [$1]
                        }}
                    | END
                        {{
                            $$ = []
                        }}
                    ;

assignment          : ids_list1 ASSIGN expr
                        {{
                            $$ = {
                                name: 'ASSIGNMENT',
                                expr: $3,
                                outputs: $1
                            }
                        }}
                    ;

expr                : additive_expr
                        {{
                            $$ = $1
                        }}
                    ;

additive_expr       : multiplicative_expr
                        {{
                            $$ = $1
                        }}
                    | additive_expr PLUS multiplicative_expr
                        {{
                            $$ = {
                                name: 'PLUS_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | additive_expr MINUS multiplicative_expr
                        {{
                            $$ = {
                                name: 'MINUS_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

multiplicative_expr : unary_expr
                        {{
                            $$ = $1
                        }}                        
                    | multiplicative_expr TIMES unary_expr
                        {{
                            $$ = {
                                name: 'TIMES_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | multiplicative_expr DIV unary_expr
                        {{
                            $$ = {
                                name: 'DIV_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

unary_expr          : primary_expr
                        {{
                            $$ = $1
                        }}
                    | MINUS primary_expr
                        {{
                            $$ = {
                                name: 'UMINUS_EXPR',
                                args: [$2]
                            }
                        }}
                    | PLUS primary_expr
                        {{
                            $$ = $2
                        }}
                    ;

primary_expr        : number
                        {{
                            $$ = $1
                        }}
                    | id
                        {{
                            $$ = $1
                        }}
                    | SAMPLERATE
                        {{
                            $$ = {
                                name: 'SAMPLERATE',
                                val: "fs"
                            }
                        }}
                    | LPAREN expr RPAREN
                        {{
                            $$ = $2
                        }}
                    | fb_call
                        {{
                            $$ = $1
                        }}
                    ;

id                  : ID
                        {{ 
                            $$ = { name: 'ID', val: yytext}; 
                        }}
                    ;

number              : NUMBER
                        {{ 
                            $$ = { name: 'NUMBER', val: parseFloat(yytext)}; 
                        }}
                    ;

fb_call             : id LPAREN exprs_list0 RPAREN
                        {{
                            $$ = {
                                name: 'CALL_EXPR',
                                id: $1,
                                args: $3
                            }
                        }}
                    ;

exprs_list0         :
                        {{
                            $$ = []
                        }}
                    | exprs_list1
                        {{
                            $$ = $1
                        }}
                    ;

exprs_list1         : expr
                        {{
                            $$ = [$1]
                        }}
                    | expr COMMA exprs_list1
                        {{ 
                            $$ = [$1].concat($3) 
                        }}
                    ;