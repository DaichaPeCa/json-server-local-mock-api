const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { prepareRuntimeDb } = require('../lib/runtime-db.cjs');

test('recreates the runtime DB without modifying the initial DB', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-db-'));
  const seedFile = path.join(temporaryDirectory, 'db.json');
  const runtimeFile = path.join(temporaryDirectory, 'runtime', 'db.json');
  const initialContents = '{"items":[{"id":1}]}';

  try {
    fs.writeFileSync(seedFile, initialContents, 'utf8');
    prepareRuntimeDb(seedFile, runtimeFile);
    fs.writeFileSync(runtimeFile, '{"items":[]}', 'utf8');
    prepareRuntimeDb(seedFile, runtimeFile);

    assert.equal(fs.readFileSync(seedFile, 'utf8'), initialContents);
    assert.equal(fs.readFileSync(runtimeFile, 'utf8'), initialContents);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
