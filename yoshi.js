'use strict';

window.addEventListener('load', () => {
	const $source = document.getElementById('source');
	$source.value = "(markiere 10)\n(drehe 120)\n(markiere 10)\n(drehe 120)\n(markiere 10)\n(drehe 120)";

	const $output = document.getElementById('output');
	const svg_ns = "http://www.w3.org/2000/svg";

	const clear_output = () => {
		while ($output.firstChild) {
			$output.removeChild($output.firstChild);
		}
	};

	const run = src => {
		clear_output();
		let x = 10;
		let y = 10;
		let angle = 0;
		const end = src.length;
		let i = 0;
		while (i < end) {
			let c = src.charAt(i);
			if (c <= ' ') { ++i; continue; }
			if (c === '(') {
				++i;
				let line = '';
				while (i < end) {
					c = src.charAt(i);
					if (c === ')') { break; }
					line = line + c;
					++i;
				}
				if (c !== ')') { i = 0; break; }
				++i;
				if (line === "markiere 10") {
					const line = document.createElementNS(svg_ns,'line');
					line.setAttribute('x1', '' + x);
					line.setAttribute('y1', '' + y);
					x = x + 10 * Math.sin(angle);
					y = y - 10 * Math.cos(angle);
					line.setAttribute('x2', '' + x);
					line.setAttribute('y2', '' + y);
					line.setAttribute("stroke", "black")
					$output.append(line);
					continue;
				}
				if (line === "drehe 120") {
					angle += 120 * Math.PI / 180;
					continue;
				}
				alert("unknown line \"" + line + "\"");
			}
			break;
		}
		if (i !== end) {
			alert("Fehler in \"" + src + "\"");
		}
	};

	document.getElementById('run').addEventListener('click', evt => {
		evt.preventDefault();
		run($source.value);
	});
});
