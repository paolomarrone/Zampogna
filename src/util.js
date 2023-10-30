(function() {

	Array.checkInclusion = function (A, B) {
		return A.every(a => B.some(b => a == b));
	};
	Set.checkInclusion = function (A, B) { // if A is included in B
		return Array.checkInclusion(Array.from(A), Array.from(B));
	};
	Set.checkEquality = function (A, B) {
		A = Array.from(A);
		B = Array.from(B);
		return Array.checkInclusion(A, B) && Array.checkInclusion(B, A);
	};

	function graphToGraphviz (g, path) {
		let ui = 0;
		function getUID () {
			return "A" + ui++;
		}
		function convertCompositeBlock (bdef) {
			let s = "";
			let conns = "";
			let props = "";
			s += "subgraph cluster" + getUID() + " { \n";
			s += "label = \"" + bdef.id + "\"; \n";
			bdef.i_ports.forEach((p, i) => {
				s += p.__gvizid__ + "[ label = \"i_" + i + "\" style=filled,color=lightgrey ]; \n";
			});
			bdef.blocks.forEach(b => {
				s += convertBlock(b);
			});
			bdef.bdefs.forEach(bd => {
				let r = convertCompositeBlock(bd);
				s += r[0];
				conns += r[1];
				props += r[2];
			});
			bdef.o_ports.forEach((p, i) => {
				s += p.__gvizid__ + "[ label = \"o_" + i + "\" style=filled,color=darkgrey ]; \n";
			});
			bdef.connections.forEach(c => {
				if (!c.in || !c.out || !c.in.__gvizid__ || !c.out.__gvizid__)
					console.warn("Invalid connection, ", c.toString());
				conns += c.in.__gvizid__ + " -> " + c.out.__gvizid__ + ";\n";
			});
			bdef.properties.forEach(p => {
				if (!bdef.blocks.includes(p.of) || !bdef.blocks.includes(p.block)) {
					//console.warn("Invalid property, ", p.of.toString(), p.block.toString() );
					return
				}
				props += (p.block.o_ports[0] || p.block.i_ports[0]).__gvizid__ + " -> " + (p.of.o_ports[0] || p.of.i_ports[0]).__gvizid__ + "[style=\"dotted\", color=\"purple\", arrowhead=none];\n";
			});
			s += "} \n";
			return [s, conns, props];
		}
		function convertBlock (b) {
			let s = "";
			// same uid for every port
			let u = (b.o_ports[0] || b.i_ports[0]).__gvizid__;
			b.i_ports.forEach(p => p.__gvizid__ = u);
			b.o_ports.forEach(p => p.__gvizid__ = u);

			const ur = b.i_ports.concat(b.o_ports).map(x =>  {
				try {
					return x.updaterate();
				}
				catch (e) {
					return { level: undefined };
				}
			}).reduce((a, b) => b.level > a.level ? b : a);
			const urc = ur.level == undefined ? "red" : (ur.level == 0 ? "green" : (ur.level == 1 ? "yellow" : (ur.level == 2 ? "orange" : "blue"))); 
			s += u + "[" + "label = \"" + (b.id || (b.value != undefined ? " " + b.value : null ) || b.operation || ".") + "\"" + "color=" + urc + "]; \n";
			return s;
		}

		function bdefsetUID (bdef) {
			bdef.i_ports.forEach(p => p.__gvizid__ = getUID());
			bdef.o_ports.forEach(p => p.__gvizid__ = getUID());
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => p.__gvizid__ = getUID());
				b.o_ports.forEach(p => p.__gvizid__ = getUID());
			})
			bdef.bdefs.forEach(bd => bdefsetUID(bd));
		}
		function bdefremUID (bdef) {
			bdef.i_ports.forEach(p => delete p.__gvizid__);
			bdef.o_ports.forEach(p => delete p.__gvizid__);
			bdef.blocks.forEach(b => {
				b.i_ports.forEach(p => delete p.__gvizid__);
				b.o_ports.forEach(p => delete p.__gvizid__);
			})
			bdef.bdefs.forEach(bd => bdefremUID(bd));
		}

		bdefsetUID(g);

		let s = "";
		s += "digraph D {\n";
		s += "rankdir=LR; \n";
		s += "compound=true \n";
		s += "node [shape=record];\n";
		let r = convertCompositeBlock(g);
		s += r[0];
		s += r[1];
		s += r[2];
		s += "\n}\n";

		bdefremUID(g);

		return s;
	}


	// Is this the best place for this?


	function get_filereader (dirs) {
	
		const fs = require("fs");
		const path = require("path");

		return function (filename) {

			for (var i = 0; i < dirs.length; i++) {
				const d = dirs[i];
				try {
					const p = path.join(d, filename);
					const data = fs.readFileSync(p, 'utf8');
					return data;
				} catch (err) {
			  		// Not in this dir;
				}
			}
			return null;
		};
	}
	

	// TODO: make it better
	function warn (msg) {
		console.log("***Warning***", msg);
	}

	exports["graphToGraphviz"] = graphToGraphviz;
	exports["get_filereader"] = get_filereader;

}());