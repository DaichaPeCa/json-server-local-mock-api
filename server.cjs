const path = require('node:path');
const jsonServer = require('json-server');
const { registerCustomGetRoutes } = require('./custom-get-routes.cjs');
const { prepareRuntimeDb } = require('./lib/runtime-db.cjs');
const { createRequestLogger } = require('./lib/request-logger.cjs');

const projectRoot = __dirname;
const seedDbFile = path.join(projectRoot, 'db.json');
const runtimeDirectory = process.env.MOCK_RUNTIME_DIR
  ? path.resolve(process.env.MOCK_RUNTIME_DIR)
  : path.join(projectRoot, 'runtime');
const runtimeDbFile = path.join(runtimeDirectory, 'db.json');
const logFile = process.env.MOCK_LOG_FILE
  ? path.resolve(process.env.MOCK_LOG_FILE)
  : path.join(runtimeDirectory, 'requests.jsonl');

const port = parsePort(process.env.PORT ?? '3000');
const host = process.env.HOST ?? '127.0.0.1';

prepareRuntimeDb(seedDbFile, runtimeDbFile);

const server = jsonServer.create();
const router = jsonServer.router(runtimeDbFile);

server.use(createRequestLogger({ logFile }));
server.use(jsonServer.defaults({ logger: false }));
server.use(jsonServer.bodyParser);

registerCustomGetRoutes(server, { db: router.db });
server.use(router);

server.listen(port, host, () => {
  console.log(`Mock API: http://${host}:${port}`);
  console.log(`Initial DB (unchanged): ${seedDbFile}`);
  console.log(`Runtime DB: ${runtimeDbFile}`);
  console.log(`Request log: ${logFile}`);
});

function parsePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`PORT must be an integer from 1 to 65535: ${value}`);
  }
  return parsed;
}
