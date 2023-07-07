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

%{
    function printAST () {
        console.log("asd")
    }   
%}

%%

program             : statements
                        {{ 
                            $$ = {
                                name: 'PROGRAM',
                                stmts: $1
                            }; 
                            return $$; 
                        }}
                    ;

statements      	: statements statement
                        {{
                            $$ = $1.concat($2); 
                        }}
                    |   
                        {{
                            $$ = []
                        }}
                    ;

statement 			: block_definition
						{{ $$ = $1 }}
                    | memory_declaration
                        {{ $$ = $1 }}
					| assignment
						{{ $$ = $1 }}
                    | END
                        {{ $$ = [] }}
					;

block_definition    : exprs '=' id '(' exprs ')' block
                        {{
                            $$ = {
                                name: 'BLOCK_DEFINITION',
                                id: $3,
                                inputs: $5,
                                outputs: $1,
                                statemetns: $7.statements
                            }
                        }}
                    | exprs '=' id '(' ')' block
                        {{
                            $$ = {
                                name: 'BLOCK_DEFINITION',
                                id: $3,
                                inputs: [],
                                outputs: $1,
                                statemetns: $7.statements
                            }
                        }}
                    ;

memory_declaration  : MEM '[' expr ']' type id END
                        {{
                            $$ = {
                                name: 'MEMORY_DEFINITION',
                                type: $5,
                                amount: $3,
                                id: $6
                            }
                        }}
                    ;

assignment 			: exprs '=' expr END
                        {{
                            $$ = {
                                name: 'ASSIGNMENT',
                                type: 'EXPR',
                                expr: $3,
                                outputs: $1
                            }
                        }}
                    | exprs '=' if_then_elses END
                        {{
                            $3.outputs = $1
                            $$ = {
                                name: 'ASSIGNMENT',
                                type: 'IF_THEN_ELSE',
                                expr: $3,
                                outputs: $1
                            }
                        }}
                    | exprs '=' block END
                        {{
                            $3.outputs = $1
                            $$ = {
                                name: 'ASSIGNMENT',
                                type: 'ANONYMOUS_BLOCK',
                                expr: $3,
                                outputs: $1
                            }
                        }}
                    ;

if_then_elses       : IF '(' expr ')' branch elseifs ELSE branch
                        {{
                            $3.condition = $3,
                            $$ = {
                                name: 'IF_THEN_ELSES',
                                branches: [$5, $6, $8].flat()
                            }
                        }}
                    ;

branch              : block
                        {{
                            $$ = {
                                name: 'BRANCH',
                                condition: null, // expr or null if else
                                block: $1
                            }
                        }}
                    ;

elseifs             : elseifs ELSE IF '(' expr ')' branch
                        {{
                            $7.condition = $5
                            $$ = [$7].concat($8)
                        }}
                    |
                        {{ $$ = [] }}
                    ;

block               : '{' statements '}'
                        {{
                            $$ = {
                                name: 'BLOCK',
                                statements: $2
                            }
                        }}
                    ;

expr                : conditional_expr
                        {{ $$ = $1 }}
                    ;

conditional_expr    : logical_or_expr
                        {{ $$ = $1 }}
                    | logical_or_expr '?' expr ':' conditional_expr
                        {{
                            $$ = {
                                name: 'INLINE_IF_THEN_ELSE',
                                condition: $2,
                                args: [$2, $4, $6]
                            }
                        }}
                    ;

logical_or_expr     : logical_and_expr
                        {{ $$ = $1 }}
                    | logical_or_expr '||' logical_and_expr
                        {{
                            $$ = {
                                name: 'LOGICAL_OR_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

logical_and_expr    : inclusive_or_expr
                        {{ $$ = $1 }}
                    | logical_and_expr '&&' inclusive_or_expr
                        {{
                            $$ = {
                                name: 'LOGICAL_AND_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

inclusive_or_expr   : exclusive_or_expr
                        {{ $$ = $1 }}
                    | inclusive_or_expr '|' exclusive_or_expr
                        {{
                            $$ = {
                                name: 'BITWISE_INCLUSIVE_OR_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

exclusive_or_expr   : and_expr
                        {{ $$ = $1 }}
                    | exclusive_or_expr '^' and_expr
                        {{
                            $$ = {
                                name: 'BITWISE_EXCLUSIVE_OR_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

and_expr            :  equality_expr
                        {{ $$ = $1 }}
                    | and_expr '&' equality_expr
                        {{
                            $$ = {
                                name: 'BITWISE_AND_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

equality_expr       : relational_expr
                        {{
                            $$ = $1
                        }}
                    | equality_expr '==' relational_expr
                        {{
                            $$ = {
                                name: 'EQUAL_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | equality_expr '!=' relational_expr
                        {{
                            $$ = {
                                name: 'NOTEQUAL_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

relational_expr     : shift_expr
                        {{
                            $$ = $1
                        }}
                    | relational_expr '<' shift_expr
                        {{
                            $$ = {
                                name: 'LESS_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | relational_expr '<=' shift_expr
                        {{
                            $$ = {
                                name: 'LESSEQUAL_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | relational_expr '>' shift_expr
                        {{
                            $$ = {
                                name: 'GREATER_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | relational_expr '>=' shift_expr
                        {{
                            $$ = {
                                name: 'GREATEREQUAL_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

shift_expr          : additive_expr 
                        {{ $$ = $1 }}
                    | shift_expr '<<' additive_expr
                        {{
                            $$ = {
                                name: 'SHIFT_LEFT_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | shift_expr '>>' additive_expr
                        {{
                            $$ = {
                                name: 'SHIFT_RIGHT_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

additive_expr       : multiplicative_expr
                        {{
                            $$ = $1
                        }}
                    | additive_expr '+' multiplicative_expr
                        {{
                            $$ = {
                                name: 'PLUS_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | additive_expr '-' multiplicative_expr
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
                    | multiplicative_expr '*' unary_expr
                        {{
                            $$ = {
                                name: 'TIMES_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    | multiplicative_expr '/' unary_expr
                        {{
                            $$ = {
                                name: 'DIV_EXPR',
                                args: [$1, $3]
                            }
                        }}
                    ;

unary_expr          : postfix_expr
                        {{ $$ = $1 }}
                    | '-' postfix_expr
                        {{
                            $$ = {
                                name: 'UMINUS_EXPR',
                                args: [$2]
                            }
                        }}
                    | '+' postfix_expr
                        {{ $$ = $2 }}
                    | '!' postfix_expr
                        {{
                            $$ = {
                                name: 'LOGICAL_NOT_EXPR',
                                args: [$2]
                            }
                        }}
                    | '~' postfix_expr
                        {{
                            $$ = {
                                name: 'BITWISE_NOT_EXPR',
                                args: [$2]
                            }
                        }}
                    ;

postfix_expr        : primary_expr
                        {{ $$ = $1 }}
                    | id '(' ')'
                        {{
                            $$ = {
                                name: 'CALL_EXPR',
                                id: $1,
                                args: []
                            }
                        }}
                    | id '(' exprs ')'
                        {{
                            $$ = {
                                name: 'CALL_EXPR',
                                id: $1,
                                args: $3
                            }
                        }}
                    | id '[' expr ']'
                        {{
                            $1.index = $3
                            $$ = $1
                        }}
                    ;

primary_expr        : id
                        {{ $$ = $1 }}
                    | type id
                        {{
                            $2.declaredType = $1
                            $$ = $2
                        }}
                    | id '.' id
                        {{
                            $$ = {
                                name: 'PROPERTY',
                                var: $1,
                                property: $3
                            }
                        }}
                    | '_'
                        {{ $$ = { name: 'DISCARD' } }}
                    | value
                        {{ $$ = $1 }}
                    | '(' expr ')'
                        {{ $$ = $2 }}
                    ;

value               : VALUE_INT
                        {{ 
                            $$ = { name: 'VALUE', type: 'INT', val: parseInt(yytext) };
                        }}
                    | VALUE_FLOAT32
                        {{ $$ = { name: 'VALUE', type: 'FLOAT', val: parseFloat(yytext) };
                        }}
                    | VALUE_TRUE
                        {{ 
                            $$ = { name: 'VALUE', type:'BOOL', val: true }; 
                        }}
                    | VALUE_FALSE
                        {{ 
                            $$ = { name: 'VALUE', type:'BOOL', val: false }; 
                        }}
                    ;

exprs               : expr
                        {{ $$ = [$1] }}
                    | exprs ',' expr
                        {{ 
                            $$ = $1.concat($3) 
                        }}
                    ;

id                  : ID
                        {{ 
                            $$ = { name: 'ID', value: yytext}; 
                        }}
                    ;

type                : TYPE_INT32 
                        {{
                            $$ = {
                                name: 'TYPE',
                                value: 'INT32'
                            }
                        }}
                    | TYPE_FLOAT32 
                        {{
                            $$ = {
                                name: 'TYPE',
                                value: 'FLOAT32'
                            }
                        }}
                    | TYPE_BOOL
                        {{
                            $$ = {
                                name: 'TYPE',
                                value: 'BOOL'
                            }
                        }}
                    ;