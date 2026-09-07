"""Refresh unsigned verifier material; never change signed or captured artifacts."""
import hashlib
import io
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'apps/witnessops-web/public/bundles'
VERIFIER = Path(__file__).with_name('witnessops_verify_receipt.py')
NOTE = '''Verifier maintenance, 7 September 2026: this download now checks every artifact
in the receipt-bound source manifest. Signed receipts, signatures, source files,
authority documents and captured evidence are unchanged. Files under verification/
are historical outputs from the original run, not a result of this repaired verifier.
Run the command in VERIFY.md to check the files in your downloaded copy.
'''
BOUNDARY = '''A valid result checks the receipt signature against the supplied signer registry
and the bytes of every artifact in the receipt-bound source manifest, including
recorded evidence and authority documents. Trust in that registry is a separate
input. Matching bytes does not establish that an observation was true, that an
action was authorized in the source system, or that the system is secure today.

This historical sample does not establish current deployment state, absence of
authorization bypasses, complete endpoint coverage, legal compliance or a security
certification. The unsigned outer MANIFEST.sha256 is a file index, not signing authority.
'''


def main():
    registry_path = ROOT / 'apps/witnessops-web/src/lib/public-proof-bundles.ts'
    registry = registry_path.read_text()
    for archive in sorted(PUBLIC.glob('*.zip')):
        old_digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if old_digest not in registry:
            raise ValueError(f'archive digest not present in registry: {archive.name}')
        with zipfile.ZipFile(archive) as source:
            infos = source.infolist()
            contents = {info.filename: source.read(info) for info in infos if not info.is_dir()}
        prefix = infos[0].filename.split('/')[0] + '/'
        contents[prefix + 'verifier/witnessops_verify_receipt.py'] = VERIFIER.read_bytes()
        for name in ('README.md', 'VERIFY.md'):
            original = contents[prefix + name].decode().split('\n\nVerifier maintenance, 7 September 2026:')[0].rstrip()
            contents[prefix + name] = (original + '\n\n' + NOTE).encode()
        contents[prefix + 'CLAIM_BOUNDARY.md'] = BOUNDARY.encode()
        contents[prefix + 'MANIFEST.sha256'] = ''.join(
            f'{hashlib.sha256(data).hexdigest()}  ./{name[len(prefix):]}\n'
            for name, data in sorted(contents.items()) if name != prefix + 'MANIFEST.sha256'
        ).encode()
        result = io.BytesIO()
        with zipfile.ZipFile(result, 'w') as target:
            for info in infos:
                target.writestr(info, b'' if info.is_dir() else contents[info.filename])
        archive.write_bytes(result.getvalue())
        new_digest = hashlib.sha256(result.getvalue()).hexdigest()
        registry = registry.replace(old_digest, new_digest)
    registry_path.write_text(registry)


if __name__ == '__main__':
    main()
