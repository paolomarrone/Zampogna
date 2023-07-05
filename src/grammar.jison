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

program             : statements
                        {{ 
                            $$ = {
                                name: 'PROGRAM',
                                stmts: $1
                            }; 
                            return $$; 
                        }}
                    ;

statements      	: statement statements
                        {{
                            $$ = $1.concat($2); 
                        }}
                    | END // ??
                    	{{
                    		$$ = [];
                    	}}
                    |
                        {{
                            $$ = [];
                        }}
                    ;

statement 			: assignment
						{{
							$$ = [$1]
						}}
					| block_definition
						{{
							$$ = [$1]
						}}
					;

assignment 			: 
 // TODO WIP



statement        	: const
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



statement          	: assignment END
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
                    | if_then_else END
                        {{
                            $$ = [$1]
                        }}
                    | END
                        {{
                            $$ = []
                        }}
                    ;