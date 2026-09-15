"""Non-signing deployment readiness; normal adapter preflight additionally checks key/trust pairing."""
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
from importlib.metadata import version
from witnessops_local_audit.package import source_fingerprint

FINGERPRINT = '2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8'
REGISTRY = '4f3ef3b9468a9de3e0a4d3ec573db25bbff86c9c458901931d01e36f4493e939'

def check():
    assert os.getuid() == 1001
    assert version('witnessops-local-server-audit') == '1.2.2'
    assert version('cryptography') == '50.0.1'
    assert source_fingerprint() == FINGERPRINT
    assert hashlib.sha256(Path('/opt/witnessops/registry.json').read_bytes()).hexdigest() == REGISTRY
    assert os.environ['WITNESSOPS_FINALIZER_PYTHON'] == '/opt/witnessops/finalizer/venv/bin/python'
    assert os.environ['WITNESSOPS_FINALIZER_DIRECTORY'] == '/var/lib/witnessops-finalizer'
    assert os.environ['WITNESSOPS_FINALIZER_KEY'] == '/run/witnessops-finalizer/key'
    assert os.environ['WITNESSOPS_FINALIZER_SIGNER'] == 'witnessops_local_audit_prod_2026_01'
    for name, directory in [('WITNESSOPS_FINALIZER_DIRECTORY', True), ('WITNESSOPS_FINALIZER_KEY', False)]:
        path = Path(os.environ[name]); info = path.lstat()
        assert path.resolve() == path and not stat.S_ISLNK(info.st_mode)
        assert (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode))
        assert info.st_uid == os.getuid() and info.st_mode & 0o077 == 0
    # Check access/durability without signing, collecting or retaining a capture.
    root = os.environ['WITNESSOPS_FINALIZER_DIRECTORY']
    with tempfile.NamedTemporaryFile(dir=root) as probe:
        os.fchmod(probe.fileno(), 0o600); probe.write(b'readiness'); probe.flush(); os.fsync(probe.fileno())
    key = Path(os.environ['WITNESSOPS_FINALIZER_KEY']).read_bytes()
    assert key and len(key) <= 4096
    print(json.dumps({'runtime': 'ready', 'collectorHash': FINGERPRINT, 'keyTrustPairing': 'checked by execution preflight; not exercised here'}))

if __name__ == '__main__':
    try:
        check()
    except Exception:
        raise SystemExit('Finalizer prerequisites unavailable') from None
