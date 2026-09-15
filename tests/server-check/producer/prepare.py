"""Verify immutable producer bytes before preparing an isolated CI test runtime."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile

if sys.version_info < (3, 11):
    raise RuntimeError('Python 3.11 or newer required')

def require(condition):
    if not condition:
        raise RuntimeError('Producer identity verification failed')

root = Path(__file__).resolve().parent
identity = json.loads((root / 'identity.json').read_text())
require(identity['implementationCommit'] == 'fce41c194522e9d08d0683aa786bd4361c5ae0c2')
require(identity['collectorFingerprint'] == '2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8')
archive = (root / 'local-audit-1.2.2.tar.gz').read_bytes()
require(identity['artifactSha256'] == 'f5797a09d9cbaa87b55dd8511aef7316d1a3a5317df245a3d66f30e2b1a8a884')
require(hashlib.sha256(archive).hexdigest() == identity['artifactSha256'])
dest = Path(sys.argv[1]).resolve()
dest.mkdir(mode=0o700)  # Existing paths are refused.
source = dest / 'source'
with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
    members = tar.getmembers()
    require(len(members) == len(identity['files']))
    require({m.name for m in members} == set(identity['files']))
    for m in members:
        require(m.isfile() and not Path(m.name).is_absolute() and '..' not in Path(m.name).parts)
        data = tar.extractfile(m).read()
        require(hashlib.sha256(data).hexdigest() == identity['files'][m.name])
        target = source / m.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
hash_ = hashlib.sha256()
for path in sorted((source / 'src/witnessops_local_audit').glob('*.py')):
    hash_.update(path.name.encode() + b'\0' + path.read_bytes() + b'\0')
require(hash_.hexdigest() == identity['collectorFingerprint'])
subprocess.run([sys.executable, '-m', 'venv', str(dest / 'venv')], check=True)
python = str(dest / 'venv/bin/python')
subprocess.run([python, '-m', 'pip', 'install', 'setuptools==80.9.0', 'cryptography==50.0.1'], check=True)
subprocess.run([python, '-m', 'pip', 'install', '--no-deps', '--no-build-isolation', '-e', str(source)], check=True)
subprocess.run([python, '-I', '-c', 'from importlib.metadata import version; from witnessops_local_audit.package import source_fingerprint; from witnessops_local_audit.capture import freeze_capture; from witnessops_local_audit.package import finalize_product; assert version("witnessops-local-server-audit")=="1.2.2"; assert source_fingerprint()=="2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8"'], check=True)
subprocess.run([python, '-I', '-m', 'witnessops_local_audit.operator', 'audit', 'capture', '--help'], check=True)
subprocess.run([python, '-I', '-m', 'witnessops_local_audit.operator', 'audit', 'finalize', '--help'], check=True)
print(python)
