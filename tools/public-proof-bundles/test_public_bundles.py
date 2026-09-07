"""Exercise the actual downloadable verifier, not a substitute implementation."""
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PUBLIC = REPO / 'apps/witnessops-web/public/bundles'
SOURCE = Path(__file__).with_name('witnessops_verify_receipt.py')


class PublicBundleTests(unittest.TestCase):
    def extracted(self, archive):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(temp.name)
        return next(Path(temp.name).iterdir())

    def verify(self, root):
        result = subprocess.run([sys.executable, 'verifier/witnessops_verify_receipt.py',
            '--receipt', 'witnessops-receipt.json', '--signature', 'witnessops-receipt.sig',
            '--manifest', 'source/manifest.json', '--hash-manifest', 'source/hash-manifest.txt',
            '--state', 'source/state.json', '--source-receipt', 'source/receipt.json',
            '--trusted-signers', 'trusted-signers.json', '--json'], cwd=root, capture_output=True, text=True)
        self.assertIn(result.returncode, (0, 1), result.stderr)
        return json.loads(result.stdout)['result']

    def test_actual_downloads_accept_original_and_reject_each_missing_or_changed_artifact(self):
        for archive in sorted(PUBLIC.glob('*.zip')):
            root = self.extracted(archive)
            self.assertEqual(self.verify(root), 'valid', archive.name)
            manifest = json.loads((root / 'source/manifest.json').read_text())
            for artifact in manifest['artifacts']:
                path = root / artifact['path']
                original = path.read_bytes()
                for mutation in ('modify', 'delete', 'symlink'):
                    with self.subTest(archive=archive.name, artifact=artifact['path'], mutation=mutation):
                        if mutation == 'modify': path.write_bytes(original + b'\nchanged')
                        else:
                            path.unlink()
                            if mutation == 'symlink':
                                outside = root.parent / 'outside.txt'
                                outside.write_bytes(original)
                                path.symlink_to(outside)
                        self.assertEqual(self.verify(root), 'invalid')
                        if path.is_symlink(): path.unlink()
                        path.write_bytes(original)
            self.assertEqual(self.verify(root), 'valid')

    def test_hash_index_cannot_omit_rewrite_duplicate_or_redirect_signed_evidence(self):
        for archive in sorted(PUBLIC.glob('*.zip')):
            root = self.extracted(archive)
            index = root / 'source/hash-manifest.txt'
            original = index.read_text()
            lines = original.splitlines()
            for changed in [
                '\n'.join(lines[1:]), original + lines[0] + '\n',
                original.replace('sha256:', 'sha512:', 1),
                original.replace('authority/', '../authority/', 1),
                original.replace('authority/', '/authority/', 1),
                original.replace('authority/', 'authority\\', 1),
                original.replace(lines[0].split()[-1], 'sha256:' + '0' * 64),
            ]:
                with self.subTest(archive=archive.name, index=changed):
                    index.write_text(changed)
                    self.assertEqual(self.verify(root), 'invalid')
            index.write_text(original)
            self.assertEqual(self.verify(root), 'valid')

    def test_archive_verifier_and_outer_checksums_match_source_and_public_registry(self):
        registry = (REPO / 'apps/witnessops-web/src/lib/public-proof-bundles.ts').read_text()
        for archive in sorted(PUBLIC.glob('*.zip')):
            root = self.extracted(archive)
            self.assertEqual((root / 'verifier/witnessops_verify_receipt.py').read_bytes(), SOURCE.read_bytes())
            self.assertIn(hashlib.sha256(archive.read_bytes()).hexdigest(), registry)
            for line in (root / 'MANIFEST.sha256').read_text().splitlines():
                digest, logical = line.split(maxsplit=1)
                self.assertEqual(hashlib.sha256((root / logical).read_bytes()).hexdigest(), digest, logical)


if __name__ == '__main__':
    unittest.main()
