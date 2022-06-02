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