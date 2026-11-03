/**
 * Report formulas. A small language of its own, parsed by hand into a tree and evaluated by walking it. The text is never run as
 * code (no eval, no Function), so a formula can only do what this file lets it do: arithmetic and a short list of functions over the
 * fields of the report's data.
 *
 *   amount * 0.18                         arithmetic: + - * / %  and parentheses
 *   if(balance > 0, 'Due', 'Paid')        if(test, then, else); comparisons > < >= <= == !=; && || !
 *   round(sum(amount) / count(), 2)       sum(f) count() avg(f) min(f) max(f): over the group in a group band, else the whole report
 *   upper(firstName) + ' ' + lastName     text: 'single quotes', upper(), lower(), concat(), len()
 *   percent(paidAmount, amount)           a share, as a number from 0 to 100
 *
 * A field name stands for that field's value in the current row, so outside the detail band it can only be used inside sum(), avg(),
 * min() and max().
 */

export const MAX_LENGTH = 300;
const MAX_NODES = 120;
const MAX_DEPTH = 24;

export class FormulaError extends Error {}
const fail = (message) => {
  throw new FormulaError(message);
};

/* ---------- tokens ---------- */

const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;
const NUMBER = /(?:\d+\.?\d*|\.\d+)/y;
const OPERATORS = ['&&', '||', '>=', '<=', '==', '!=', '+', '-', '*', '/', '%', '>', '<', '!', '(', ')', ','];

function tokenize(text) {
  if (typeof text !== 'string' || !text.trim()) fail('The formula is empty');
  if (text.length > MAX_LENGTH) fail(`The formula is too long (${MAX_LENGTH} characters at most)`);
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      let value = '';
      for (; j < text.length && text[j] !== "'"; j += 1) value += text[j];
      if (j >= text.length) fail("A piece of text is missing its closing quote (')");
      tokens.push({ type: 'string', value, at: i });
      i = j + 1;
      continue;
    }
    NUMBER.lastIndex = i;
    const num = /[0-9.]/.test(c) ? NUMBER.exec(text) : null;
    if (num) {
      tokens.push({ type: 'number', value: Number(num[0]), at: i });
      i += num[0].length;
      continue;
    }
    NAME.lastIndex = i;
    const name = /[A-Za-z_]/.test(c) ? NAME.exec(text) : null;
    if (name) {
      tokens.push({ type: 'name', value: name[0], at: i });
      i += name[0].length;
      continue;
    }
    const op = OPERATORS.find((o) => text.startsWith(o, i));
    if (!op) fail(`Unexpected “${c}” at position ${i + 1}`);
    tokens.push({ type: 'op', value: op, at: i });
    i += op.length;
  }
  return tokens;
}

/* ---------- the parser: precedence climbing into a plain tree ---------- */

const PRECEDENCE = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

export function parse(text) {
  const tokens = tokenize(text);
  let pos = 0;
  let nodes = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const isOp = (v) => peek()?.type === 'op' && peek().value === v;
  const count = () => {
    nodes += 1;
    if (nodes > MAX_NODES) fail('The formula is too complicated');
  };

  function primary(depth) {
    if (depth > MAX_DEPTH) fail('The formula is nested too deeply');
    const t = take();
    if (!t) fail('The formula ends too soon');
    count();
    if (t.type === 'number') return { k: 'num', v: t.value };
    if (t.type === 'string') return { k: 'str', v: t.value };
    if (t.type === 'op' && t.value === '(') {
      const inner = expression(0, depth + 1);
      if (!isOp(')')) fail('A bracket is not closed');
      take();
      return inner;
    }
    if (t.type === 'op' && (t.value === '-' || t.value === '!'))
      return { k: 'unary', op: t.value, a: primary(depth + 1) };
    if (t.type === 'name') {
      if (isOp('(')) {
        take();
        const args = [];
        if (!isOp(')')) {
          do args.push(expression(0, depth + 1));
          while (isOp(',') && take());
        }
        if (!isOp(')')) fail(`The brackets of ${t.value}( ) are not closed`);
        take();
        return { k: 'call', name: t.value, args };
      }
      return { k: 'name', v: t.value };
    }
    return fail(`Unexpected “${t.value}” at position ${t.at + 1}`);
  }

  function expression(min, depth) {
    let left = primary(depth);
    for (;;) {
      const t = peek();
      const p = t?.type === 'op' ? PRECEDENCE[t.value] : undefined;
      if (p === undefined || p < min) return left;
      take();
      count();
      left = { k: 'bin', op: t.value, a: left, b: expression(p + 1, depth + 1) };
    }
  }

  const tree = expression(0, 0);
  if (pos < tokens.length) fail(`Unexpected “${tokens[pos].value}” at position ${tokens[pos].at + 1}`);
  return tree;
}

/* ---------- what the language knows ---------- */

const AGGREGATES = new Set(['sum', 'avg', 'min', 'max', 'count']);
const FUNCTIONS = {
  if: [3, 3],
  round: [1, 2],
  abs: [1, 1],
  upper: [1, 1],
  lower: [1, 1],
  len: [1, 1],
  concat: [1, 10],
  percent: [2, 2],
  sum: [1, 1],
  avg: [1, 1],
  min: [1, 1],
  max: [1, 1],
  count: [0, 0],
};
export const FUNCTION_NAMES = Object.keys(FUNCTIONS);

/**
 * Checks a parsed formula against the data it will run on: only known functions with the right number of arguments, and only real
 * columns. `rowContext` is true in the detail band, where a bare field means the current row's value. Throws a FormulaError.
 */
export function check(tree, columns, rowContext) {
  const known = new Set(columns);
  const walk = (n, insideAggregate) => {
    switch (n.k) {
      case 'num':
      case 'str':
        return;
      case 'name':
        if (!known.has(n.v)) fail(`“${n.v}” is not a field of this data`);
        if (!rowContext && !insideAggregate)
          fail(`“${n.v}” has no single value here. Use sum(${n.v}), avg(${n.v}), min(${n.v}) or max(${n.v})`);
        return;
      case 'unary':
        return walk(n.a, insideAggregate);
      case 'bin':
        walk(n.a, insideAggregate);
        return walk(n.b, insideAggregate);
      case 'call': {
        const spec = FUNCTIONS[n.name];
        if (!spec) fail(`“${n.name}” is not a function. Available: ${FUNCTION_NAMES.join(', ')}`);
        if (n.args.length < spec[0] || n.args.length > spec[1])
          fail(
            `${n.name}( ) takes ${spec[0] === spec[1] ? spec[0] : `${spec[0]} to ${spec[1]}`} value(s), not ${n.args.length}`,
          );
        if (AGGREGATES.has(n.name) && n.name !== 'count') {
          if (n.args[0].k !== 'name') fail(`${n.name}( ) works on a field, for example ${n.name}(amount)`);
          return walk(n.args[0], true);
        }
        return n.args.forEach((a) => walk(a, insideAggregate));
      }
      default:
        return fail('Unknown formula part');
    }
  };
  walk(tree, false);
  return tree;
}

/* ---------- evaluating ---------- */

const isNum = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));
const num = (v) => (isNum(v) ? Number(v) : Number.NaN);
const text = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * Evaluates a checked tree. `ctx` is { row, groupRows, all, inGroupBand }.
 * Returns a number, text or boolean; anything that cannot be worked out (a missing number, a division by zero) gives '' so the
 * report shows a blank rather than NaN or Infinity.
 */
export function evaluate(tree, ctx) {
  const rowsForAggregate = ctx.inGroupBand ? (ctx.groupRows ?? ctx.all) : ctx.all;
  const aggregate = (name, field) => {
    if (name === 'count') return rowsForAggregate.length;
    const values = rowsForAggregate
      .map((r) => (Object.hasOwn(r, field) ? r[field] : ''))
      .filter(isNum)
      .map(Number);
    if (!values.length) return '';
    if (name === 'sum') return values.reduce((a, b) => a + b, 0);
    if (name === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
    return name === 'min' ? Math.min(...values) : Math.max(...values);
  };
  const clean = (v) => (typeof v === 'number' && !Number.isFinite(v) ? '' : v);

  const go = (n) => {
    switch (n.k) {
      case 'num':
      case 'str':
        return n.v;
      case 'name':
        return ctx.row && Object.hasOwn(ctx.row, n.v) ? (ctx.row[n.v] ?? '') : '';
      case 'unary': {
        const a = go(n.a);
        if (n.op === '!') return !a;
        return isNum(a) ? -Number(a) : '';
      }
      case 'bin': {
        const a = go(n.a);
        if (n.op === '&&') return Boolean(a) && Boolean(go(n.b));
        if (n.op === '||') return Boolean(a) || Boolean(go(n.b));
        const b = go(n.b);
        if (n.op === '+' && (!isNum(a) || !isNum(b)) && (typeof a === 'string' || typeof b === 'string'))
          return text(a) + text(b);
        if (['==', '!='].includes(n.op)) {
          const same =
            isNum(a) && isNum(b) ? Number(a) === Number(b) : text(a).toLowerCase() === text(b).toLowerCase();
          return n.op === '==' ? same : !same;
        }
        if (['<', '>', '<=', '>='].includes(n.op)) {
          const [x, y] = isNum(a) && isNum(b) ? [Number(a), Number(b)] : [text(a), text(b)];
          return { '<': x < y, '>': x > y, '<=': x <= y, '>=': x >= y }[n.op];
        }
        const x = num(a);
        const y = num(b);
        if (Number.isNaN(x) || Number.isNaN(y)) return '';
        return clean(
          { '+': x + y, '-': x - y, '*': x * y, '/': y === 0 ? '' : x / y, '%': y === 0 ? '' : x % y }[n.op],
        );
      }
      case 'call': {
        const f = n.name;
        if (AGGREGATES.has(f)) return aggregate(f, n.args[0]?.v);
        if (f === 'if') return go(n.args[0]) ? go(n.args[1]) : go(n.args[2]);
        const a = n.args.map(go);
        switch (f) {
          case 'round': {
            const x = num(a[0]);
            if (Number.isNaN(x)) return '';
            const d = Math.min(8, Math.max(0, Math.trunc(num(a[1] ?? 0)) || 0));
            const k = 10 ** d;
            return Math.round((x + Number.EPSILON) * k) / k;
          }
          case 'abs':
            return isNum(a[0]) ? Math.abs(Number(a[0])) : '';
          case 'upper':
            return text(a[0]).toUpperCase();
          case 'lower':
            return text(a[0]).toLowerCase();
          case 'len':
            return text(a[0]).length;
          case 'concat':
            return a.map(text).join('');
          case 'percent': {
            const x = num(a[0]);
            const y = num(a[1]);
            return Number.isNaN(x) || Number.isNaN(y) || y === 0 ? '' : (x / y) * 100;
          }
          default:
            return '';
        }
      }
      default:
        return '';
    }
  };
  return go(tree);
}

/** Parses once per distinct formula: the same text on many rows is not parsed again. */
const parsed = new Map();
export function compile(exprText) {
  let tree = parsed.get(exprText);
  if (!tree) {
    tree = parse(exprText);
    if (parsed.size > 500) parsed.clear();
    parsed.set(exprText, tree);
  }
  return tree;
}

/** The field names a formula reads, so the data it needs is fetched. */
export function fieldsOf(tree, found = new Set()) {
  if (tree.k === 'name') found.add(tree.v);
  else if (tree.k === 'unary') fieldsOf(tree.a, found);
  else if (tree.k === 'bin') {
    fieldsOf(tree.a, found);
    fieldsOf(tree.b, found);
  } else if (tree.k === 'call') tree.args.forEach((a) => fieldsOf(a, found));
  return found;
}
