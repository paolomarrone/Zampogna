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




	exports["printAST"] = printAST;

}());