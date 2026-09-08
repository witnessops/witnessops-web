// Local Audit 1.2.2 browser primitives. No package code is ever executed.
export const VERSION = 'witnessops.local_server_audit.verifier.v1.2.2';
export const LIMITS = Object.freeze({ proofpack: 100 * 1024 * 1024, signature: 1024 * 1024, trust_registry: 5 * 1024 * 1024, entry: 25 * 1024 * 1024, entries: 200 });
export const encoder = new TextEncoder();
// Preserve a leading BOM just as Python's UTF-8 reader does. JSON.parse then
// rejects it instead of silently verifying a differently decoded document.
export const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
export function demand(condition, message) { if (!condition)
    throw new Error(message); }
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const integer = value => Number.isSafeInteger(value) && value >= 0;
export function exact(value, required, optional = []) {
    demand(object(value), 'Expected an object');
    demand(required.every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => required.includes(k) || optional.includes(k)), 'Missing or unknown contract fields');
}
export function canonical(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number') {
        demand(Number.isSafeInteger(value), 'Unsupported numeric representation');
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    demand(object(value), 'Unsupported JSON value');
    const order = (a, b) => { const x = Array.from(a, c => c.codePointAt(0)), y = Array.from(b, c => c.codePointAt(0)); for (let i = 0; i < Math.min(x.length, y.length); i++)
        if (x[i] !== y[i])
            return x[i] - y[i]; return x.length - y.length; };
    return '{' + Object.keys(value).sort(order).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export const same = (a, b) => canonical(a) === canonical(b);
export async function hash(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join(''); }
export function hex(text, size) { demand(typeof text === 'string' && new RegExp(`^[a-fA-F0-9]{${size * 2}}$`).test(text), 'Invalid hex length'); return Uint8Array.from(text.match(/../g), b => parseInt(b, 16)); }
export async function verifySignature(key, signature, value) {
    const imported = await crypto.subtle.importKey('raw', hex(key, 32), { name: 'Ed25519' }, false, ['verify']);
    demand(await crypto.subtle.verify('Ed25519', imported, hex(signature, 64), encoder.encode(canonical(value))), 'Ed25519 signature did not verify');
}
// Bound nesting and reject ambiguous duplicate keys before JSON.parse loses them.
export function json(bytes) {
    const text = decoder.decode(bytes);
    let i = 0;
    const whitespace = () => { while (/\s/.test(text[i] ?? '') && i < text.length)
        i++; };
    const string = () => { const start = i++; while (i < text.length) {
        if (text[i] === '\\') {
            i += 2;
            continue;
        }
        if (text[i++] === '"') {
            const value = JSON.parse(text.slice(start, i));
            demand(!/[\uD800-\uDFFF]/u.test(value), 'Unpaired Unicode surrogate is unsupported');
            return value;
        }
    } throw Error('Unterminated JSON string'); };
    const parse = (depth) => {
        demand(depth < 64, 'JSON nesting limit exceeded');
        whitespace();
        if (text[i] === '{') {
            i++;
            const keys = new Set();
            whitespace();
            if (text[i] === '}') {
                i++;
                return;
            }
            while (true) {
                whitespace();
                demand(text[i] === '"', 'Invalid JSON key');
                const key = string();
                demand(!keys.has(key), 'Duplicate JSON key');
                keys.add(key);
                whitespace();
                demand(text[i++] === ':', 'Invalid JSON object');
                parse(depth + 1);
                whitespace();
                const next = text[i++];
                if (next === '}')
                    return;
                demand(next === ',', 'Invalid JSON object');
            }
        }
        else if (text[i] === '[') {
            i++;
            whitespace();
            if (text[i] === ']') {
                i++;
                return;
            }
            while (true) {
                parse(depth + 1);
                whitespace();
                const next = text[i++];
                if (next === ']')
                    return;
                demand(next === ',', 'Invalid JSON array');
            }
        }
        else if (text[i] === '"')
            string();
        else {
            const m = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));
            demand(m, 'Invalid JSON value');
            // Python retains float type; JSON.parse would irreversibly turn 1.0 into 1.
            demand(!/^-?[0-9]/.test(m[0]) || !/[.eE]/.test(m[0]), 'Fractional and exponent JSON numbers are unsupported. Use the Local Audit 1.2.2 CLI.');
            i += m[0].length;
        }
    };
    parse(0);
    whitespace();
    demand(i === text.length, 'Trailing JSON content');
    const result = JSON.parse(text);
    canonical(result);
    return result;
}
export function safePath(name) {
    demand(typeof name === 'string' && name.length > 0 && name.length <= 1024 && name === name.normalize('NFC') && !/[\\\x00-\x1f:]/.test(name), 'Unsafe package path');
    demand(/^[\x20-\x7e]+$/.test(name), 'Non-ASCII package paths are unsupported. Use the Local Audit 1.2.2 CLI.');
    demand(name.split('/').every(p => p && p !== '.' && p !== '..' && !/[ .]$/.test(p) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)), 'Unsafe package path');
    return name;
}
// Include implicit directories in the portable path namespace. Producer paths
// are ASCII; rejecting other encodings avoids incomplete Unicode case folding.
export function validatePackagePaths(paths) {
    const nodes = new Map();
    for (const path of paths) {
        const parts = safePath(path).split('/');
        for (let i = 1; i <= parts.length; i++) {
            const name = parts.slice(0, i).join('/');
            const kind = i === parts.length ? 'file' : 'directory';
            const folded = name.toLowerCase();
            const previous = nodes.get(folded);
            demand(!previous || (previous.name === name && previous.kind === 'directory' && kind === 'directory'), 'Portable package path collision');
            nodes.set(folded, { name, kind });
            demand(nodes.size <= LIMITS.entries * 2, 'Package tree entry limit exceeded');
        }
    }
}
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) {
    crc ^= byte;
    for (let j = 0; j < 8; j++)
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
} return (crc ^ 0xffffffff) >>> 0; }
export async function unzip(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = i => view.getUint16(i, true), u32 = i => view.getUint32(i, true);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
        if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) {
            end = i;
            break;
        }
    demand(end >= 0, 'ZIP end record missing');
    demand(u16(end + 4) === 0 && u16(end + 6) === 0 && u16(end + 8) === u16(end + 10), 'Multi-volume ZIP unsupported');
    const count = u16(end + 10), centralSize = u32(end + 12), centralStart = u32(end + 16);
    demand(count > 0 && count <= LIMITS.entries && centralStart + centralSize === end, 'Invalid ZIP directory or entry limit');
    const files = new Map(), portable = new Set(), regions = [];
    let pos = centralStart, total = 0;
    for (let index = 0; index < count; index++) {
        demand(pos + 46 <= end && u32(pos) === 0x02014b50, 'Invalid ZIP entry');
        const flags = u16(pos + 8), method = u16(pos + 10), crc = u32(pos + 16), compressed = u32(pos + 20), size = u32(pos + 24), nl = u16(pos + 28), el = u16(pos + 30), cl = u16(pos + 32), mode = u32(pos + 38) >>> 16, local = u32(pos + 42);
        demand(pos + 46 + nl + el + cl <= end, 'Truncated ZIP entry');
        const rawName = bytes.subarray(pos + 46, pos + 46 + nl);
        demand((flags & 2048) !== 0 || rawName.every(b => b < 128), 'Non-UTF8 ZIP name unsupported');
        const name = safePath(decoder.decode(rawName));
        const folded = name.toLowerCase();
        demand(!portable.has(folded), 'Portable ZIP path collision');
        portable.add(folded);
        demand((flags & 1) === 0 && [0, 8].includes(method) && [0, 0o100000].includes(mode & 0o170000), 'Unsupported ZIP entry type');
        total += size;
        demand(size <= LIMITS.entry && total <= LIMITS.proofpack, 'Expanded ZIP size limit exceeded');
        demand(local + 30 <= centralStart && u32(local) === 0x04034b50, 'Invalid local ZIP header');
        const lnl = u16(local + 26), lel = u16(local + 28), start = local + 30 + lnl + lel, finish = start + compressed;
        demand(finish <= centralStart && u16(local + 6) === flags && u16(local + 8) === method && decoder.decode(bytes.subarray(local + 30, local + 30 + lnl)) === name, 'ZIP headers disagree');
        demand(regions.every(([a, b]) => finish <= a || local >= b), 'Overlapping ZIP entries');
        regions.push([local, finish]);
        const input = bytes.slice(start, finish);
        let output;
        if (method === 0) {
            demand(input.length === size, 'Stored ZIP size mismatch');
            output = input;
        }
        else {
            const stream = new ReadableStream({ start(controller) { controller.enqueue(input); controller.close(); } }).pipeThrough(new DecompressionStream('deflate-raw'));
            const reader = stream.getReader();
            const chunks = [];
            let length = 0;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    length += value.length;
                    demand(length <= size && length <= LIMITS.entry, 'Expanded entry exceeds declared size');
                    chunks.push(value);
                }
            }
            catch (error) {
                await reader.cancel().catch(() => { });
                throw error;
            }
            demand(length === size, 'ZIP size mismatch');
            output = new Uint8Array(length);
            let offset = 0;
            for (const c of chunks) {
                output.set(c, offset);
                offset += c.length;
            }
        }
        demand(crc32(output) === crc, 'ZIP checksum mismatch');
        files.set(name, output);
        pos += 46 + nl + el + cl;
    }
    demand(pos === end, 'Unexpected central directory bytes');
    validatePackagePaths(files.keys());
    return files;
}
