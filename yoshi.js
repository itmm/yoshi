'use strict';

window.addEventListener('load', () => {
	const query = window.location.search;
	const $html = document.getElementsByTagName('HTML')[0];
	if (query.indexOf('theme=dark') >= 0) {
		$html.setAttribute('data-theme', 'dark');
	} else if (query.indexOf('theme=light') >= 0) {
		$html.setAttribute('data-theme', 'light');
	}
	const $source = document.getElementById('source');
	$source.value = "(markiere 10)\n" +
		"(drehe 120)\n" + 
		"(markiere 10)\n" + 
		"(drehe 120)\n" +
		"(markiere 10)\n" +
		"(drehe 120)";

	$source.addEventListener('keydown', evt => {
        if (evt.keyCode === 9) { // tab was pressed
            const val = $source.value;
			const start = $source.selectionStart;
			const end = $source.selectionEnd;
            $source.value = val.substring(0, start) + '\t' + val.substring(end);
            $source.selectionStart = $source.selectionEnd = start + 1;
			evt.preventDefault();
        }
    });

	const $output = document.getElementById('output');
	const svg_ns = "http://www.w3.org/2000/svg";

	let x = 0;
	let y = 0;
	let angle = 0;

	const clear_output = () => {
		x = y = angle = 0;
		while ($output.firstChild) {
			$output.removeChild($output.firstChild);
		}
	};
	const parse = src => {
		let root = [];
		let stack = [];
		let cur = root;
		const end = src.length;
		let i = 0;
		while (i < end) {
			let c = src.charAt(i);
			if (c <= ' ') { ++i; continue; }
			if (c === '(') {
				let nw = [];
				cur.push(nw);
				stack.push(cur);
				cur = nw;
				++i; continue;
			}
			if (c === ')') {
				cur = stack.pop();
				if (! cur) {
					throw "zu viele ')'";
				}
				++i; continue;
			}
			let tok = '';
			while (i < end && c > ' ' && c !== '(' && c !== ')') {
				tok += c;
				++i;
				if (i >= end) { break; }
				c = src.charAt(i);
			}
			cur.push(tok);
		}
		if (cur != root) {
			throw "nicht alle Listen geschlossen";
		}
		return root;
	};
	const check_length = (lst, len) => {
		if (lst.length !== len) {
			throw `Liste ${lst} hat falsche Länge (${lst.length} anstatt ${len}`;
		}
	};
	const to_num = val => {
		const res = +do_eval(val);
		if (isNaN(res)) {
			throw `Zahl erwartet anstatt "${val}"`;
		}
		return res;
	};
	const do_eval = cmd => {
		if (! cmd.forEach) {
			return cmd;
		}
		if (cmd.length === 0) {
			throw "kann leere Liste nicht ausführen";
		} else if (cmd[0] == 'markiere') {
			check_length(cmd, 2);
			const len = to_num(cmd[1]);
			const line = document.createElementNS(svg_ns,'line');
			line.setAttribute('x1', '' + x);
			line.setAttribute('y1', '' + y);
			x = x + len * Math.sin(angle);
			y = y - len * Math.cos(angle);
			line.setAttribute('x2', '' + x);
			line.setAttribute('y2', '' + y);
			$output.append(line);
		} else if (cmd[0] == 'drehe') {
			check_length(cmd, 2);
			const val = to_num(cmd[1]);
			angle += val * Math.PI / 180;
		} else if (cmd[0] == '+') {
			let val = 0;
			for (let i = 1; i < cmd.length; ++i) {
				val += to_num(cmd[i]);
			}
			return val;
		} else if (cmd[0] == '-') {
			let val = 0;
			if (cmd.length == 2) {
				val = -to_num(cmd[1]);
			} else if (cmd.length > 2) {
				val = to_num(cmd[1]);
				for (let i = 2; i < cmd.length; ++i) {
					val -= to_num(cmd[i]);
				}
			}
			return val;
		} else if (cmd[0] == '*') {
			let val = 1;
			for (let i = 1; i < cmd.length; ++i) {
				val *= to_num(cmd[i]);
			}
			return val;
		} else if (cmd[0] == '/') {
			let val = 1;
			if (cmd.length == 2) {
				val /= to_num(cmd[1]);
			} else if (cmd.length > 2) {
				val = to_num(cmd[1]);
				for (let i = 2; i < cmd.length; ++i) {
					val /= to_num(cmd[i]);
				}
				return val;
			}
		} else if (cmd[0] == 'wiederhole') {
			if (cmd.length > 1) {
				let count = to_num(cmd[1]);
				for (; count > 0; count -= 1) {
					for (let i = 2; i < cmd.length; ++i) {
						do_eval(cmd[i]);
					}
				}
			}
		} else {
			throw `unbekanntes Kommando ${cmd[0]}`;
		}
	};
	const run = src => {
		clear_output();
		parse(src).forEach(cmd => {
			do_eval(cmd);
		});
	};

	document.getElementById('run').addEventListener('click', evt => {
		evt.preventDefault();
		try {
			run($source.value);
		} catch (err) {
			alert(`Fehler: ${err}`);
		}
	});

	const assert = (cond, msg) => {
		if (! cond) {
			throw(msg);
		}
	};

	const eq_lists = (a, b) => {
		if (! a.forEach) {
			assert(! b.forEach, 'only one list');
			assert(a == b, 'different values');
		} else {
			assert(a.length == b.length, `different length ${a.length}, ${b.length}`);
			a.forEach((v, i) => {
				eq_lists(v, b[i]);
			});
		}
	};
	const test_parse = (src, exp) => {
		eq_lists(exp, parse(src));
	};
	const test_eval = (src, exp) => {
		assert(do_eval(parse(src)[0]) === exp, src);
	};

	if (query.indexOf('unit-tests=true') >= 0) {
		try {
			run("");
			test_parse("(a b c)", [['a', 'b', 'c']]);
			test_eval("(+ 1 2 3)", 6);
			test_eval("(+ 2)", 2);
			test_eval("(+)", 0);
			test_eval("(-)", 0);
			test_eval("(- 3)", -3);
			test_eval("(- 4 1)", 3);
			test_eval("(* 2 3)", 6);
			test_eval("(/ 12 3)", 4);
			clear_output();
			
			console.log("did run unit-tests");
		} catch (err) {
			console.error("unit-test failed", err);
		}
	}
});
