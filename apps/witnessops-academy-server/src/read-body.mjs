import { MAX_BODY_BYTES } from './draft-input.mjs';

export function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        req.pause();
        req.removeAllListeners('data');
        fail(Object.assign(new Error('too large'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', fail);
  });
}

export function discardAfterResponse(res, req) {
  res.once('finish', () => {
    if (typeof req.destroy === 'function') req.destroy();
  });
}
