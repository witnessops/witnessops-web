// Test/development helper only. No signing, key access, networking or production route.
import { createHash } from 'node:crypto';

export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/** Fixed metadata, order supplied by caller, STORE only. Can construct hostile test entries. */
export function storeArchive(entries: { name: string; bytes: Uint8Array }[]): Uint8Array {
    const locals: Buffer[] = [], directory: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
        const name = Buffer.from(entry.name), data = Buffer.from(entry.bytes), crc = crc32(data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x21, 12);
        local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50); central.writeUInt16LE(0x314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x21, 14);
        central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(0x81a40000, 38); central.writeUInt32LE(offset, 42);
        locals.push(local, name, data); directory.push(central, name);
        offset += local.length + name.length + data.length;
    }
    const records = Buffer.concat(directory), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(records.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, records, end]);
}

export function bundleEntries(payload: Uint8Array, signature: Uint8Array) {
    const manifest = {
        format: 'witnessops-proofpack-bundle', format_version: 1,
        declared_product: { id: 'local-audit', version: '1.2.2' },
        payload: { path: 'payload.zip', sha256: sha256(payload) },
        signature: { path: 'payload.sig.json', sha256: sha256(signature) },
    };
    return [
        { name: 'bundle.json', bytes: Buffer.from(JSON.stringify(manifest) + '\n') },
        { name: 'payload.zip', bytes: payload },
        { name: 'payload.sig.json', bytes: signature },
    ];
}
export function createBundle(payload: Uint8Array, signature: Uint8Array) {
    return storeArchive(bundleEntries(payload, signature));
}
