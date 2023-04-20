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