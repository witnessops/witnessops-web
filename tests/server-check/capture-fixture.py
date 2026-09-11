"""Generate frozen live-classified test input. No collection or production signing."""
import json
from pathlib import Path
import sys
from witnessops_local_audit import package
from witnessops_local_audit.capture import freeze_capture
from witnessops_local_audit.authority import evaluate_authority
from witnessops_local_audit.canonical import parse_utc
from unittest.mock import patch

a=json.loads(Path(sys.argv[1]).read_text())
producer=Path(package.__file__).resolve().parents[2]
o=json.loads((producer/'tests/fixtures/observations.pass.json').read_text())
o['synthetic']=False
o['data_classification']='customer_host_posture'
o['target']['hostname']=a['target']['allowed_hostnames'][0]
o['target']['asset_id']=a['target']['asset_id']
o['observed_at_utc']=a['authorization_window']['starts_at_utc']
if len(sys.argv)>3 and sys.argv[3]=='partial':
 o['sections']['updates'].update(status='partial',available_update_count=2,security_update_count=None,security_classification='unavailable')
admission=evaluate_authority(a,observed_hostname=o['target']['hostname'],operator_id=a['operator_id'],evaluation_time=parse_utc(o['observed_at_utc']))
with patch.object(package,'collect_live',side_effect=AssertionError('No collection')):
 data=freeze_capture(authority=a,admission=admission,operator_id=a['operator_id'],observations=o,collector_hash=package.source_fingerprint(),finished_at=o['observed_at_utc'],mode='live_approved')
Path(sys.argv[2]).write_bytes(data)
