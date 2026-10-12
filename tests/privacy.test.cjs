const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app-init.js'), 'utf8');
const csvFn = source.match(/function csv\(value\) \{[\s\S]*?\n\}/);
assert.ok(csvFn, 'CSV serializer exists');
const csv = vm.runInNewContext('(' + csvFn[0] + ')');

test('financial notes cannot create spreadsheet formulas on CSV opening', () => {
  for(const risk of ['=SUM(1,2)', '+cmd', '@SUM(1,2)', '-1+2','  =HYPERLINK("bad")','\t=1+1']){
    assert.ok(csv(risk).startsWith('"\''), risk);
  }
});
test('ordinary CSV fields and embedded quotes retain correct formatting', () => {
  assert.equal(csv('Coffee "small"'), '"Coffee ""small"""');
  assert.equal(csv('Groceries'), '"Groceries"');
  assert.equal(csv(29.5), '"29.5"');
});

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
test('service worker isolates caches and ignores dynamic API endpoints', () => {
  assert.match(sw, /startsWith\(PREFIX\)/);
  assert.match(sw, /netlify\/functions/);
  assert.match(sw, /response\.ok/);
});
