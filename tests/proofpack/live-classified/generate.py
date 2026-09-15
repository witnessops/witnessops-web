"""Test-only classified inputs. No host collection or production key.
Run with the accepted producer src on PYTHONPATH; outputs use disposable keys.
"""
from pathlib import Path
import tempfile,json,shutil
from unittest.mock import patch
from witnessops_local_audit import package,collector
from witnessops_local_audit.capture import freeze_capture
from witnessops_local_audit.canonical import parse_utc
from witnessops_local_audit.authority import evaluate_authority
from witnessops_local_audit.crypto import create_test_key_material
root=Path(__file__).resolve().parent
producer=Path(package.__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp); key=t/'key.hex';registry=t/'registry.json'
 create_test_key_material(key,registry,'disposable_app_live_test')
 shutil.copyfile(registry,root/'registry.json')
 for synthetic in (True,False):
  o=json.loads((producer/'tests/fixtures/observations.pass.json').read_text())
  a=json.loads((producer/'examples/authority.fixture.json').read_text())
  o['synthetic']=synthetic;o['data_classification']='synthetic_non_customer' if synthetic else 'customer_host_posture'
  admission=evaluate_authority(a,observed_hostname=o['target']['hostname'],operator_id=a['operator_id'],evaluation_time=parse_utc(o['observed_at_utc']))
  capture=freeze_capture(authority=a,admission=admission,operator_id=a['operator_id'],observations=o,collector_hash=package.source_fingerprint(),finished_at=o['observed_at_utc'],mode='fixture' if synthetic else 'live_approved')
  with patch.object(package,'collect_live',side_effect=AssertionError('No collection')),patch.object(collector,'collect_live',side_effect=AssertionError('No collection')):
   built=package.finalize_product(capture,signing_key_path=key,public_key_id='disposable_app_live_test',output_root=t/str(synthetic))
  directory=root/('synthetic' if synthetic else 'live-classified');directory.mkdir(exist_ok=True)
  for k in ('proofpack','signature'):shutil.copyfile(built[k],directory/Path(built[k]).name)
print('Disposable test key discarded. No collection.')
