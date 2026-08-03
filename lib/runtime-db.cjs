const fs = require('node:fs');
const path = require('node:path');

/**
 * Copies the read-only seed DB to the writable runtime location.
 * The destination is deliberately overwritten on every server start.
 */
function prepareRuntimeDb(seedFile, runtimeFile) {
  if (!fs.existsSync(seedFile)) {
    throw new Error(`Initial DB was not found: ${seedFile}`);
  }

  fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });
  fs.copyFileSync(seedFile, runtimeFile);
}

module.exports = { prepareRuntimeDb };
