const fs = require('node:fs');
const path = require('node:path');

/**
 * Creates middleware that writes one JSON object per request.
 * `clock` and `output` are injectable so the timing logic can be tested.
 */
function createRequestLogger({
  logFile,
  clock = Date.now,
  output = console,
} = {}) {
  if (!logFile) {
    throw new Error('logFile is required');
  }

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  let previousReceivedAtMs = null;
  let recentRequestTimes = [];

  return function requestLogger(req, _res, next) {
    const receivedAtMs = clock();
    const intervalFromPreviousMs = previousReceivedAtMs === null
      ? null
      : receivedAtMs - previousReceivedAtMs;

    recentRequestTimes = recentRequestTimes.filter(
      (timestamp) => receivedAtMs - timestamp < 1000,
    );
    recentRequestTimes.push(receivedAtMs);

    const requestsInLastSecond = recentRequestTimes.length;
    const entry = {
      receivedAt: new Date(receivedAtMs).toISOString(),
      intervalFromPreviousMs,
      requestsInLastSecond,
      exceeds10RequestsPerSecond: requestsInLastSecond > 10,
      method: req.method,
      path: req.originalUrl || req.url,
      clientIp: getClientIp(req),
    };

    fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, 'utf8');

    const summary = [
      entry.receivedAt,
      entry.method,
      entry.path,
      `interval=${entry.intervalFromPreviousMs ?? '-'}ms`,
      `last1s=${entry.requestsInLastSecond}`,
      entry.exceeds10RequestsPerSecond ? 'LIMIT_EXCEEDED' : null,
    ].filter(Boolean).join(' ');

    if (entry.exceeds10RequestsPerSecond) {
      output.warn(summary);
    } else {
      output.log(summary);
    }

    previousReceivedAtMs = receivedAtMs;
    next();
  };
}

function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

module.exports = { createRequestLogger };
