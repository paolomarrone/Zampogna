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

	'use strict';

	const bs = require("./blocks").BlockTypes;
	
	function schedule (bdef) {
		const incoming = new Map();
		for (const c of bdef.connections) {
			if (incoming.has(c.out))
				throw new Error("Multiple sources for input: " + c.out);
			incoming.set(c.out, c.in);
		}
		function source(port) {
			const p = incoming.get(port);
			if (!p) throw new Error("Unconnected input: " + port);
			return p.block;
		}
		const writers = new Map();
		for (const b of bdef.blocks) {
			if (!bs.MemoryWriterBlock.isPrototypeOf(b)) continue;
			if (!writers.has(b.memoryblock)) writers.set(b.memoryblock, []);
			writers.get(b.memoryblock).push(b);
		}

		const roots = bdef.o_ports.map(source);
		const scheduled = [];
		const visited = new Set();
		const visiting = new Set();
		for (let i = 0; i < roots.length; i++) {
			const stack = [{ block: roots[i], exit: false }];
			while (stack.length) {
				const { block: b, exit } = stack.pop();
				if (b == bdef || visited.has(b)) continue;
				if (exit) {
					visiting.delete(b);
					visited.add(b);
					scheduled.push(b);
					continue;
				}
				if (visiting.has(b))
					throw new Error("Found loop while scheduling: " + [...visiting, b].join(', '));
				visiting.add(b);
				// Previous-state reads break temporal feedback. Storage initialization
				// and writes are additional roots, not dependencies of the read value.
				if (bs.MemoryReaderBlock.isPrototypeOf(b)) roots.push(b.memoryblock);
				if (bs.MemoryBlock.isPrototypeOf(b)) roots.push(...(writers.get(b) || []));
				stack.push({ block: b, exit: true });
				const inputs = b.inputs();
				for (let j = inputs.length - 1; j >= 0; j--)
					stack.push({ block: source(inputs[j]), exit: false });
			}
		}
		return scheduled;
	}
	exports["schedule"] = schedule;
}());
