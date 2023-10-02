/*
	Copyright (C) 2021, 2022, 2023 Orastron Srl

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

	const bs = require("./blocks").BlockTypes;
	
	function schedule (bdef, options) {

		const iconns = bdef.o_ports.map(p => bdef.connections.find(c => c.out == p));
		const roots = iconns.map(c => c.in.block);
		const scheduled_blocks = [];
		
		for (let i = 0; i < roots.length; i++) {
			schedule_block (roots[i], []);
		}

		bdef.blocks.forEach(b => delete b.__visited__);

		function schedule_block (b, stack) {
			if (b == bdef)
				return;

			if (stack.includes(b))
				throw new Error("Found loop while scheduling. Stack: " + stack.join(', ') + ". + " + b);
			const nstack = stack.concat(b);

			if (b.__visited__)
				return;
			b.__visited__ = true;

			if (bs.MemoryReaderBlock.isPrototypeOf(b)) {
				roots.push(b.memoryblock);
			}

			if (bs.MemoryBlock.isPrototypeOf(b)) {
				const mwriters = bdef.blocks.filter(bb => bs.MemoryWriterBlock.isPrototypeOf(bb) && bb.memoryblock == b);
				mwriters.forEach(mw => roots.push(mw));
			}

			b.i_ports.forEach(p => {
				const bb = bdef.connections.find(c => c.out == p).in.block;
				schedule_block(bb, nstack);
			});

			scheduled_blocks.push(b);
		}

		return scheduled_blocks;

	}
	exports["schedule"] = schedule;
}());
