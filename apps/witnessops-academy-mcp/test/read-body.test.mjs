import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { discardAfterResponse, readBody } from '../src/read-body.mjs';

test('an oversized body returns 413 instead of resetting the socket', async () => {
  const server = http.createServer((req, res) => {
    readBody(req, 32).then(() => {
      res.writeHead(200);
      res.end('ok');
    }).catch((error) => {
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'body_too_large' }));
      discardAfterResponse(res, req);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const status = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/' }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end(Buffer.alloc(64, 1));
    });
    assert.equal(status, 413);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
