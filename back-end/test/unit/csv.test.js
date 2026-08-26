const { test } = require('node:test');
const assert = require('node:assert');
const { parseCsv } = require('../../src/utils/csv');

test('parseCsv splits simple comma-separated rows', () => {
  const rows = parseCsv('a,b,c\n1,2,3');
  assert.deepStrictEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCsv handles quoted cells containing commas and newlines', () => {
  const rows = parseCsv('name,notes\n"Widget, Large","line one\nline two"');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1][0], 'Widget, Large');
  assert.strictEqual(rows[1][1], 'line one\nline two');
});

test('parseCsv unescapes doubled quotes inside quoted cells', () => {
  const rows = parseCsv('"He said ""hello""",plain');
  assert.strictEqual(rows[0][0], 'He said "hello"');
  assert.strictEqual(rows[0][1], 'plain');
});

test('parseCsv tolerates CRLF line endings and trailing newline', () => {
  const rows = parseCsv('a,b\r\n1,2\r\n3,4\r\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('parseCsv skips blank lines between records', () => {
  const rows = parseCsv('a,b\n\n1,2\n\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['1', '2']]);
});
