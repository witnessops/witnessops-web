import { hash, json } from './primitives.mjs';
import { LOCAL_AUDIT_TRUST, pinnedRegistryInput } from './pinned-registry';
import { verifyProofpack, type ProofpackInputFile } from './verify.mjs';

export const WITNESSOPS_PROOFPACK_BUNDLE_V1 = 'witnessops-proofpack-bundle';
export const BUNDLE_LIMITS = Object.freeze({ outer: 110 * 1024 * 1024, 'payload.zip': 100 * 1024 * 1024, 'payload.sig.json': 1024 * 1024, 'bundle.json': 16 * 1024 });
const names = ['bundle.json', 'payload.zip', 'payload.sig.json'] as const;
type EntryName = typeof names[number];

export class BundleError extends Error {}
function requireBundle(condition: unknown, message: string): asserts condition {
    if (!condition) throw new BundleError(message);
}
function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function parseJson(bytes: Uint8Array, message: string): unknown {
    try { return json(bytes); } catch { throw new BundleError(message); }
}
function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/** Strict STORE-only envelope. No decompression, ZIP64, extra fields, descriptors or comments. */
function readEnvelope(bytes: Uint8Array): Record<EntryName, Uint8Array> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = bytes.length - 22;
    requireBundle(end >= 0 && view.getUint32(end, true) === 0x06054b50, 'Malformed Proofpack archive. A plain ZIP STORE envelope is required.');
    requireBundle(view.getUint16(end + 4, true) === 0 && view.getUint16(end + 6, true) === 0
        && view.getUint16(end + 8, true) === 3 && view.getUint16(end + 10, true) === 3
        && view.getUint16(end + 20, true) === 0, 'The bundle must contain exactly three files in a single archive.');
    const centralSize = view.getUint32(end + 12, true), centralStart = view.getUint32(end + 16, true);
    requireBundle(centralStart + centralSize === end, 'Malformed Proofpack archive directory.');
    const entries = Object.create(null) as Record<EntryName, Uint8Array>;
    const regions: { start: number; end: number }[] = [];
    let cursor = centralStart;
    for (let i = 0; i < 3; i++) {
        requireBundle(cursor + 46 <= end && view.getUint32(cursor, true) === 0x02014b50, 'Malformed Proofpack file entry.');
        const version = view.getUint16(cursor + 6, true), flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
        const crc = view.getUint32(cursor + 16, true), size = view.getUint32(cursor + 24, true);
        const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
        const attributes = view.getUint32(cursor + 38, true), offset = view.getUint32(cursor + 42, true);
        requireBundle(version <= 20 && (flags === 0 || flags === 0x800) && method === 0
            && extraLength === 0 && commentLength === 0 && view.getUint16(cursor + 34, true) === 0,
        'Unsupported archive entry. Use unencrypted ZIP STORE files without extra fields or data descriptors.');
        requireBundle(cursor + 46 + nameLength <= end, 'Malformed Proofpack filename.');
        const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
        requireBundle(names.includes(name as EntryName) && !Object.hasOwn(entries, name), 'Only bundle.json, payload.zip and payload.sig.json are allowed, once each.');
        const key = name as EntryName;
        const type = (attributes >>> 16) & 0xf000;
        requireBundle((type === 0 || type === 0x8000) && (attributes & 0x10) === 0, 'Directories, links and special files are not allowed in a bundle.');
        requireBundle(size <= BUNDLE_LIMITS[key], `${key} exceeds its supported size limit.`);
        requireBundle(view.getUint32(cursor + 20, true) === size, 'Compressed entries are not supported. Use ZIP STORE.');
        requireBundle(offset + 30 <= centralStart && view.getUint32(offset, true) === 0x04034b50, 'Malformed Proofpack local header.');
        requireBundle(view.getUint16(offset + 4, true) === version && view.getUint16(offset + 6, true) === flags
            && view.getUint16(offset + 8, true) === method && view.getUint32(offset + 14, true) === crc
            && view.getUint32(offset + 18, true) === size && view.getUint32(offset + 22, true) === size
            && view.getUint16(offset + 26, true) === nameLength && view.getUint16(offset + 28, true) === 0,
        'Conflicting Proofpack archive headers.');
        const start = offset + 30 + nameLength, stop = start + size;
        requireBundle(stop <= centralStart && bytes.subarray(offset + 30, start).every((byte, index) => byte === bytes[cursor + 46 + index]), 'Invalid Proofpack entry bounds or filename.');
        entries[key] = bytes.subarray(start, stop);
        requireBundle(crc32(entries[key]) === crc, 'Proofpack entry integrity check failed.');
        regions.push({ start: offset, end: stop });
        cursor += 46 + nameLength;
    }
    regions.sort((a, b) => a.start - b.start);
    requireBundle(cursor === end && regions[0].start === 0 && regions[2].end === centralStart
        && regions.slice(1).every((region, index) => region.start === regions[index].end), 'Overlapping entries or unaccounted archive bytes are not allowed.');
    return entries;
}

/** Envelope integrity is not signature verification or signer admission. */
export async function extractBundle(input: ProofpackInputFile) {
    requireBundle(input.bytes instanceof Uint8Array && input.bytes.byteLength <= BUNDLE_LIMITS.outer, 'Proofpack exceeds the 110 MiB size limit.');
    requireBundle(/\.proofpack$/i.test(input.name), 'Choose a .proofpack file.');
    // Own the bytes across asynchronous digest checks. Callers cannot change them mid-check.
    let entries: Record<EntryName, Uint8Array>;
    try { entries = readEnvelope(new Uint8Array(input.bytes)); }
    catch (error) { if (error instanceof BundleError) throw error; throw new BundleError('Malformed Proofpack archive.'); }
    const manifest = parseJson(entries['bundle.json'], 'bundle.json must be valid, unambiguous JSON.');
    requireBundle(exactKeys(manifest, ['format', 'format_version', 'declared_product', 'payload', 'signature'])
        && manifest.format === WITNESSOPS_PROOFPACK_BUNDLE_V1 && manifest.format_version === 1, 'Unsupported Proofpack bundle format or version.');
    requireBundle(exactKeys(manifest.declared_product, ['id', 'version']) && manifest.declared_product.id === 'local-audit'
        && manifest.declared_product.version === '1.2.2', 'This verifier supports Local Audit 1.2.2 bundles only.');
    for (const [field, path] of [['payload', 'payload.zip'], ['signature', 'payload.sig.json']] as const) {
        const item = manifest[field];
        requireBundle(exactKeys(item, ['path', 'sha256']) && item.path === path && typeof item.sha256 === 'string'
            && /^[a-f0-9]{64}$/.test(item.sha256), 'Invalid bundle file declaration.');
        requireBundle(await hash(entries[path]) === item.sha256, `${path} SHA-256 does not match the bundle manifest.`);
    }
    const signature = parseJson(entries['payload.sig.json'], 'The enclosed detached signature must be valid JSON.');
    // Local Audit's signature binds the ORIGINAL ZIP filename. payload.zip is only the envelope slot.
    // This untrusted subject is admitted later by the unchanged cryptographic verifier.
    requireBundle(!!signature && typeof signature === 'object' && !Array.isArray(signature)
        && 'subject' in signature && typeof signature.subject === 'string'
        && /^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.zip$/.test(signature.subject), 'The detached signature must name a safe original ZIP filename.');
    return { proofpack: { name: signature.subject, bytes: entries['payload.zip'] }, signature: { name: `${signature.subject}.sig.json`, bytes: entries['payload.sig.json'] } };
}

/** The only public bundle-verification path. There is deliberately no registry argument. */
export async function verifyBundle(input: ProofpackInputFile) {
    const extracted = await extractBundle(input);
    const trust_registry = pinnedRegistryInput();
    requireBundle(await hash(trust_registry.bytes) === LOCAL_AUDIT_TRUST.sha256, 'The verifier trust profile does not match its approved snapshot. No report can be generated.');
    return verifyProofpack({ ...extracted, trust_registry });
}
