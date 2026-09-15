"""Invalid producer inputs must fail before a runtime or package install exists."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1] / 'server-check/producer'

class ProducerIdentityTest(unittest.TestCase):
    def test_altered_archive_and_missing_manifest_fail_closed(self):
        for case in ('altered', 'missing'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                package = directory / 'producer'
                shutil.copytree(ROOT, package)
                if case == 'altered':
                    artifact = package / 'local-audit-1.2.2.tar.gz'
                    artifact.write_bytes(artifact.read_bytes() + b'changed')
                else:
                    (package / 'identity.json').unlink()
                result = subprocess.run([sys.executable, str(package / 'prepare.py'), str(directory / 'runtime')], capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((directory / 'runtime').exists())

if __name__ == '__main__':
    unittest.main()
