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

	function parse_include (s) {
		s = s.substr(8).replace(/[; \t]+$/, '');
		var id = s.match(/[_a-zA-Z0-9]*/);
		if (id)
			id = id[0];
		if (!id || s.length != id.length)
			throw new Error("Bad include line");
		return id;
	}

	function detach_includes (str) {

		const includes = [];

		var lines = str.split('\n');
		var i = 0;
		for (; i < lines.length; i++) {
			const l = lines[i].trim();

			if (l.length == 0)
				continue;
			if (l[0] == '#')
				continue;
			if (l.startsWith('include ')) {
				includes.push(parse_include(l));
				continue;
			}
			break;
		}

		lines = lines.slice(i, lines.length);
		str = lines.join('\n');

		return [str, includes];
	}

	function preprocess (str, filereader) {

		var program = "";
		var jsons = [];
		var included_files = [];

		const toparse = [ str ];
		for (let i = 0; i < toparse.length; i++) {
			const tp = toparse[i];

			const r = detach_includes(tp);
			program += '\n' + r[0];

			r[1].forEach(include => {
				var filename;
				var s;
				filename = include + '.crm';
				if (included_files.includes(filename))
					return;
				s = filereader(filename);
				if (s) {
					included_files.push(filename);
					toparse.push(s);
					return;
				}
				filename = include + ".json";
				if (included_files.includes(filename))
					return;
				s = filereader(filename);
				if (s) {
					included_files.push(filename);
					jsons.push(JSON.parse(s));
					return;
				}
				throw new Error("Invalid/Not found included file");
			});
		}

		return [program, jsons];
	}

	exports["preprocess"] = preprocess;
}());