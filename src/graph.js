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
		init: function (nInputs = 0, nOutputs = 0, operation = "", id = "", postfix = "", val = NaN) {
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
				let ports = convertExpr(stmt.expr, {}, named_blocks, named_vars)
				stmt.outputs.forEach((output, index) => {
					let block_const = named_vars[output.val]
					let connection = Object.create(Connection)
					connection.in = ports[1][index]
					connection.out = block_const.input_ports[0]
					graph.connections.push(connection)
				})
			})

			let ports = expandCompositeBlock(named_blocks[initial_block], ++expansions_count, {}, {...named_blocks}, {...named_vars})
			graph.input_ports = ports[0]
			graph.output_ports = ports[1]

			return graph

			function expandCompositeBlock (block, expansions_count, expansion_stack, named_blocks, named_vars) {
				if (block.id.val != "" && expansion_stack[block.id.val])
					throw new Error("Recursive block expansion. Stack: " + Object.keys(expansion_stack) + "," + block.id.val)
				expansion_stack[block.id.val] = true

				let prefix  = '_' + block.id.val + '_'
				let postfix = expansions_count == 1 ? "" : '_' + expansions_count

				let input_ports = []
				let output_ports = []

				block.inputs.forEach(function (input) {
					let block_var = Object.create(Block)
					block_var.init(1, 1, "VAR", input.val, postfix, NaN)
					named_vars[block_var.id] = block_var
					graph.blocks.push(block_var)
					input_ports.push(block_var.input_ports[0])
				})

				block.body.filter(stmt => stmt.name == 'BLOCK_DEF').forEach(block => named_blocks[block.id.val] = block)

				block.body.filter(stmt => stmt.name == 'ASSIGNMENT' || stmt.name == 'ANONYM_BLOCK_DEF').forEach(
					stmt => stmt.outputs.filter(output => !output.init).forEach(output => {
						let block_var = Object.create(Block)
						block_var.init(1, 1, "VAR", output.val, postfix, NaN)
						named_vars[block_var.id] = block_var
						graph.blocks.push(block_var)
					})
				)

				block.outputs.forEach(o => {
					output_ports.push(named_vars[o.val].output_ports[0])
				})

				block.body.filter(stmt => stmt.name == 'ASSIGNMENT' || stmt.name == 'ANONYM_BLOCK_DEF').forEach(function (stmt) {
					let ports;
					if (stmt.name == 'ASSIGNMENT')
						ports = convertExpr(stmt.expr, {...expansion_stack}, {...named_blocks}, {...named_vars})
					else if (stmt.name == 'ANONYM_BLOCK_DEF')
						ports = expandCompositeBlock(stmt, ++expansions_count, {...expansion_stack}, {...named_blocks}, {...named_vars})

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

			function convertExpr(expr_node, expansion_stack, named_blocks, named_vars) {
				let block_expr = Object.create(Block)

				let input_ports = []
				let output_ports = []
				
				switch (expr_node.name) {
					case 'MINUS_EXPR':
					case 'PLUS_EXPR':
					case 'TIMES_EXPR':
					case 'DIV_EXPR':
					case 'UMINUS_EXPR':
						block_expr.init(expr_node.args.length, 1, expr_node.name, null, null, null)
						graph.blocks.push(block_expr)
						input_ports = block_expr.input_ports
						output_ports = block_expr.output_ports
						break
					case 'NUMBER':
						block_expr.init(0, 1, expr_node.name, null, null, expr_node.val)
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
								block_expr.init(1, 1, 'DELAY1_EXPR', null, null, NaN)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'FUNC_CALL':
								block_expr.init(expr_node.args.length, 1, 'EXTERNAL_FUNC_CALL', expr_node.id.val, null, NaN)
								graph.blocks.push(block_expr)
								input_ports = block_expr.input_ports
								output_ports = block_expr.output_ports
								break
							case 'BLOCK_CALL':
								let ports = expandCompositeBlock(named_blocks[expr_node.id.val], ++expansions_count, 
									{...expansion_stack}, {...named_blocks}, {...named_vars})
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
					let ports = convertExpr(expr_node.args[argi], expansion_stack, named_blocks, named_vars)
					let connection = Object.create(Connection)
					connection.in = ports[1][0]
					connection.out = input_ports[argi]
					graph.connections.push(connection)
				}

				return [input_ports, output_ports]
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