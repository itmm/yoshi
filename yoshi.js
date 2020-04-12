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
	$source.value = "(markiere 20)\n" +
		"(drehe 120)\n" + 
		"(markiere 20)\n" + 
		"(drehe 120)\n" +
		"(markiere 20)\n" +
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

	const to_num = val => {
		const res = +do_eval(val);
		if (isNaN(res)) {
			throw `Zahl erwartet anstatt "${val}"`;
		}
		return res;
	};

	const cons = (car, cdr) => {
		if (typeof car == 'undefined' && typeof cdr == 'undefined') {
			return undefined;
		} else {
			return {
				'car': car,
				'cdr': cdr
			};
		}
	};
	const car = lst => {
		return typeof lst == 'object' ? lst.car : undefined;
	}
	const cdr = lst => {
		return typeof lst == 'object' ? lst.cdr : undefined;
	}

	const format_lst = lst => {
		if (typeof lst == 'undefined') { return '()'; }
		if (typeof lst == 'object') {
			let result = '(';
			for (let i = lst; i; i = cdr(i)) {
				if (i !== lst) { result += ' '; }
				result += format_lst(car(i));
			}
			result += ')';
			return result;
		}
		return lst;
	};
	let top_frame = {
		'markiere': cmd => {
			const len = to_num(car(cmd));
			if (isNaN(len)) { throw 'markiere: erwarte Zahl'; }
			if (cdr(cmd)) { throw 'markiere: zu viele Argumente'; }
			const line = document.createElementNS(svg_ns, 'line');
			line.setAttribute('x1', '' + x);
			line.setAttribute('y1', '' + y);
			x = x + len * Math.sin(angle);
			y = y - len * Math.cos(angle);
			line.setAttribute('x2', '' + x);
			line.setAttribute('y2', '' + y);
			$output.append(line);
		},
		'drehe': cmd => {
			const val = to_num(car(cmd));
			if (isNaN(val)) { throw 'drehe: erwarte Zahl'; }
			if (cdr(cmd)) { throw 'drehe: zu viele Argumente'; }
			angle += val * Math.PI / 180;
		},
		'+': cmd => {
			let val = 0;
			for (; cmd; cmd = cdr(cmd)) {
				val += to_num(car(cmd));
			}
			return val;
		},
		'-': cmd => {
			let val = 0;
			if (cmd) {
				if (! cdr(cmd)) {
					val = -to_num(car(cmd));
				} else {
					val = to_num(car(cmd));
					for (cmd = cdr(cmd); cmd; cmd = cdr(cmd)) {
						val -= to_num(car(cmd));
					}
				}
			}
			return val;
		},
		'*': cmd => {
			let val = 1;
			for (; cmd; cmd = cdr(cmd)) {
				val *= to_num(car(cmd));
			}
			return val;
		},
		'/': cmd => {
			let val = 1;
			if (cmd) {
				if (! cdr(cmd)) {
					val /= to_num(car(cmd));
				} else {
					val = to_num(car(cmd));
					for (cmd = cdr(cmd); cmd; cmd = cdr(cmd)) {
						val /= to_num(car(cmd));
					}
				}
			}
			return val;
		},
		'wiederhole': cmd => {
			let count = to_num(car(cmd));
			let result = undefined;
			for (; count > 0; count -= 1) {
				for (let cm = cdr(cmd); cm; cm = cdr(cm)) {
					result = do_eval(car(cm));
				}
			}
			return result;
		},
		'def-fn': cmd => {
			const name = car(cmd);
			if (typeof name != 'string') {
				throw "def-fn: Name erwartet";
			}
			cmd = cdr(cmd);
			const refs = car(cmd);
			if (typeof refs != 'object' && typeof refs != 'undefined') {
				throw "def-fn: Argument-Liste erwartet";
			}
			cmd = cdr(cmd);
			const ref_frames = frames.slice();
			const fn = args => {
				let frame = {};
				for (let rl = refs; rl; rl = cdr(rl)) {
					frame[car(rl)] = do_eval(car(args));
					args = cdr(args);
				}
				const old_frames = frames;
				frames = ref_frames;
				frames.push(frame);
				let result = undefined;
				for (let cm = cmd; cm; cm = cdr(cm)) {
					result = do_eval(car(cm));
				}
				frames.pop();
				frames = old_frames;
				return result;
			};
			frames[frames.length - 1][name] = fn;
			return fn;
		},
		'car': cmd => {
			if (! cmd) { throw "car: zu wenig Argumente"; }
			if (cdr(cmd)) { throw "car: zu viele Argumente"; }
			return car(do_eval(car(cmd)));
		},
		'cdr': cmd => {
			if (! cmd) { throw "car: zu wenig Argumente"; }
			if (cdr(cmd)) { throw "car: zu viele Argumente"; }
			return cdr(do_eval(car(cmd)));
		},
		'nil': undefined,
		'cons': cmd => {
			if (cdr(cdr(cmd))) {
				throw "cons: zu viele Argumente";
			}
			return cons(do_eval(car(cmd)), do_eval(car(cdr(cmd))));
		},
		'ist-nil?': cmd => {
			if (! cmd) {
				throw "ist-nil?: zu wenig Argumente";
			}
			if (cdr(cmd)) {
				throw "ist-nil?: zu viele Argumente";
			}
			console.log(do_eval(car(cmd)));
			return typeof do_eval(car(cmd)) === 'undefined';
		},
		'wenn': cmd => {
			if (do_eval(car(cmd))) {
				return do_eval(car(cdr(cmd)));
			} else {
				return do_eval(car(cdr(cdr(cmd))));
			}
		},
		'abs': cmd => {
			return Math.abs(to_num(car(cmd)));
		},
		'x-koord': cmd => {
			return x;
		},
		'y-koord': cmd => {
			return y;
		},
		'>': cmd => {
			return to_num(car(cmd)) > to_num(car(cdr(cmd)));
		},
		'<': cmd => {
			return to_num(car(cmd)) < to_num(car(cdr(cmd)));
		},
		'nicht': cmd => {
			return ! do_eval(car(cmd));
		}
	};
	let frames = [top_frame, {}];

	const get = name => {
		for (let i = frames.length - 1; i >= 0; --i) {
			const f = frames[i];
			if (name in f) {
				return f[name];
			}
		}
		return undefined;
	};

	let x = 0;
	let y = 0;
	let angle = 0;

	const clear_output = () => {
		x = y = angle = 0;
		frames = [top_frame, {}];
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
				stack.push(cur);
				cur = nw;
				++i; continue;
			}
			if (c === ')') {
				const lst = cur;
				cur = stack.pop();
				if (! cur) {
					throw "zu viele ')'";
				}
				let cr = undefined;
				for (let i = lst.length - 1; i >= 0; --i) {
					cr = cons(lst[i], cr);
				}
				cur.push(cr);
				++i; continue;
			}
			let tok = '';
			while (i < end && c > ' ' && c !== '(' && c !== ')') {
				tok += c;
				++i;
				if (i >= end) { break; }
				c = src.charAt(i);
			}
			if (! isNaN(+tok)) {
				cur.push(+tok);
			} else {
				cur.push(tok);
			}
		}
		if (cur != root) {
			throw "nicht alle Listen geschlossen";
		}
		let cr = undefined;
		for (let i = root.length - 1; i >= 0; --i) {
			cr = cons(root[i], cr);
		}
		return cr;
	};
	const do_eval = cmd => {
		if (typeof cmd == 'string') {
			return get(cmd);
		}
		if (typeof cmd != 'object') {
			return cmd;
		}
		const f = do_eval(car(cmd));
		if (typeof f === 'function') {
			return f(cdr(cmd));
		} else {
			throw `unbekanntes Kommando ${cmd[0]}`;
		}
	};
	const run = src => {
		clear_output();
		for (let lst = parse(src); lst; lst = cdr(lst)) {
			do_eval(car(lst));
		}
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
		if (typeof a !== 'object') {
			assert(typeof b !== 'object', 'only one list');
			assert(a == b, 'different values');
		} else {
			eq_lists(car(a), car(b));
			eq_lists(cdr(a), cdr(b));
		}
	};
	const test_parse = (src, exp) => {
		eq_lists(exp, parse(src));
	};
	const test_eval = (src, exp) => {
		assert(do_eval(car(parse(src))) == exp, src);
	};

	if (query.indexOf('unit-tests=true') >= 0) {
		try {
			run("");
			test_parse("(a b c)", cons(cons('a', cons('b', cons('c')))));
			test_eval("(+ 1 2 3)", 6);
			test_eval("(+ 2)", 2);
			test_eval("(+)", 0);
			test_eval("(-)", 0);
			test_eval("(- 3)", -3);
			test_eval("(- 4 1)", 3);
			test_eval("(* 2 3)", 6);
			test_eval("(/ 12 3)", 4);
			test_eval("(car (cons 1 (cons 2)))", 1);
			test_eval("(car (cdr (cons 1 (cons 2))))", 2);
			clear_output();
			
			console.log("did run unit-tests");
		} catch (err) {
			console.error("unit-test failed", err);
		}
	}
});
