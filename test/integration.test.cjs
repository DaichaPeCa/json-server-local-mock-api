const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('serves custom GETs, persists writes only at runtime, and logs requests', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-api-integration-'));
  const port = await getAvailablePort();
  const initialDbFile = path.join(projectRoot, 'db.json');
  const initialDbBeforeTest = fs.readFileSync(initialDbFile, 'utf8');

  const child = spawn(process.execPath, ['server.cjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      MOCK_RUNTIME_DIR: temporaryDirectory,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitUntilStarted(child);

    const searchResponse = await fetch(
      `http://127.0.0.1:${port}/api/products/search?q=note&pageSize=10`,
    );
    assert.equal(searchResponse.status, 200);
    const searchBody = await searchResponse.json();
    assert.deepEqual(searchBody.items.map((product) => product.name), ['Notebook']);
    assert.equal(searchBody.pagination.totalItems, 1);

    const createResponse = await fetch(`http://127.0.0.1:${port}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Eraser', price: 120, stock: 12 }),
    });
    assert.equal(createResponse.status, 201);

    const runtimeDb = JSON.parse(
      fs.readFileSync(path.join(temporaryDirectory, 'db.json'), 'utf8'),
    );
    assert.equal(runtimeDb.products.some((product) => product.name === 'Eraser'), true);
    assert.equal(fs.readFileSync(initialDbFile, 'utf8'), initialDbBeforeTest);

    const logEntries = fs.readFileSync(
      path.join(temporaryDirectory, 'requests.jsonl'),
      'utf8',
    ).trim().split('\n').map(JSON.parse);

    assert.equal(logEntries.length, 2);
    assert.equal(logEntries[0].path, '/api/products/search?q=note&pageSize=10');
    assert.equal(logEntries[0].intervalFromPreviousMs, null);
    assert.equal(typeof logEntries[1].intervalFromPreviousMs, 'number');
  } finally {
    child.kill();
    await new Promise((resolve) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', resolve);
    });
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitUntilStarted(child) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timed out. stdout=${stdout} stderr=${stderr}`));
    }, 10_000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.includes('Mock API:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup with code ${code}. ${stderr}`));
    });
  });
}
