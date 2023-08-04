(function() {

	function printAST (root) {

		return printNode(root, 0);

		function printNode (node, depth) {

			console.log("Printing node: ", node, depth)

			if (typeof node == "string")
				return node;

			if (node.name == "VALUE")
				return node.type + " " + node.val;

			let s = "\n";
			for (let i = 0; i < depth - 1; i++)
				s += "│  ";
			if (depth > 0)
				s += "┝ "

			s += node.name + ": ";

			let entries = Object.entries(node);
			console.log("entries: ", entries)
			entries.filter(e => !Array.isArray(e[1]) && e[0] != "name").forEach(e => {
				console.log("nee", node, e, e[1])
				s += e[0] + ": " + printNode(e[1], depth + 1)
			});
			console.log("B")
			entries.filter(e => Array.isArray(e[1])).forEach(e => {
				console.log("B", e)
				s += e[0];
				for (let i of e[1]) {
					console.log("Cazzi", i, e[1], "fine cazzi")
					s += printNode(i, depth + 1)
				}
			})

			return s;
		}
	}

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

			s += u + "[" + "label = \"" + (b.id || (b.value != undefined ? b.value + "" : null ) || b.operation || ".") + "\"" + "]; \n";
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


	// TODO: make it better
	function warn (msg) {
		console.log("***Warning***", msg);
	}


	exports.printAST = printAST;
	exports.graphToGraphviz = graphToGraphviz;

}());