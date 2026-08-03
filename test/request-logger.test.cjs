const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createRequestLogger } = require('../lib/request-logger.cjs');

test('logs intervals and flags the 11th request within one second', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-api-'));
  const logFile = path.join(temporaryDirectory, 'requests.jsonl');
  const timestamps = Array.from({ length: 11 }, (_, index) => 1_700_000_000_000 + index * 50);
  const output = { log() {}, warn() {} };
  const middleware = createRequestLogger({
    logFile,
    clock: () => timestamps.shift(),
    output,
  });

  try {
    for (let index = 0; index < 11; index += 1) {
      let calledNext = false;
      middleware(
        { method: 'GET', url: `/items/${index}`, headers: {} },
        {},
        () => { calledNext = true; },
      );
      assert.equal(calledNext, true);
    }

    const entries = fs.readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse);

    assert.equal(entries.length, 11);
    assert.equal(entries[0].intervalFromPreviousMs, null);
    assert.equal(entries[1].intervalFromPreviousMs, 50);
    assert.equal(entries[9].requestsInLastSecond, 10);
    assert.equal(entries[9].exceeds10RequestsPerSecond, false);
    assert.equal(entries[10].requestsInLastSecond, 11);
    assert.equal(entries[10].exceeds10RequestsPerSecond, true);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
