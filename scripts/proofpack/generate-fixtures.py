"""Offline fixture builder. Usage: python generate-fixtures.py PATH_TO_LOCAL_AUDIT_1_2_2.
Only synthetic inputs are admitted; generated private keys stay in a temporary directory.
"""
import sys, json, tempfile, shutil, hashlib, copy
from pathlib import Path
from datetime import datetime, timezone
source = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(source / 'src'))
from witnessops_local_audit import __version__
from witnessops_local_audit.crypto import create_test_key_material, load_private_key, sign_record, build_detached_file_signature
from witnessops_local_audit.authority import evaluate_authority
from witnessops_local_audit.package import assemble_product, write_core_manifest, deterministic_zip
from witnessops_local_audit.verifier import verify_proofpack
from witnessops_local_audit.canonical import canonical_json_bytes, write_json
assert __version__ == '1.2.2'
out = Path(__file__).resolve().parents[2] / 'tests/proofpack/fixtures'
out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as directory:
    temp=Path(directory)
    key=temp/'test-key.hex'; registry=temp/'trusted-keys.json'
    create_test_key_material(key,registry,'witnessops_lsa_synthetic_test_001')
    authority=json.loads((source/'examples/authority.fixture.json').read_text())
    admission=evaluate_authority(authority,observed_hostname='demo-host',operator_id='operator-synthetic-01',evaluation_time=datetime(2026,7,10,12,tzinfo=timezone.utc))
    for name,fixture in [('complete','pass'),('adverse','risky'),('partial','pass')]:
        observations=json.loads((source/f'tests/fixtures/observations.{fixture}.json').read_text())
        assert observations['synthetic'] is True
        if name=='partial':
            observations['sections']['updates'].update(status='partial',security_update_count=None,security_classification='unavailable',command_status='captured',returncode=0,cache_freshness='unknown',diagnostic_reason='Cached update plan does not classify security updates.')
        fp=temp/(name+'.json');fp.write_text(json.dumps(observations))
        built=assemble_product(authority=authority,admission=admission,operator_id='operator-synthetic-01',signing_key_path=key,public_key_id='witnessops_lsa_synthetic_test_001',output_root=temp/name,fixture_path=fp)
        dest=out/name;dest.mkdir(exist_ok=True)
        for field in ['proofpack','signature']:
            shutil.copyfile(built[field],dest/Path(built[field]).name)
        shutil.copyfile(registry,dest/registry.name)
        expected=verify_proofpack(Path(built['proofpack']),Path(built['signature']),registry)
        assert expected['status']=='valid',expected
        (dest/'expected.json').write_text(json.dumps(expected,indent=2)+'\n')
        for file in ['posture.json','findings.json','evidence/collection-completeness.json','evidence/scope.json']:
            shutil.copyfile(Path(built['package_dir'])/file,dest/Path(file).name)
    # Authenticated hostile packages must still fail semantic reconstruction.
    for negative in ['signed-bad-findings','signed-bad-coverage','signed-bad-authority','signed-bad-embedded']:
        package=temp/negative/'package'
        shutil.copytree(next((temp/'complete').glob('local-server-audit-*')),package)
        filename={'signed-bad-findings':'findings.json','signed-bad-coverage':'evidence/collection-completeness.json','signed-bad-authority':'evidence/authority.json','signed-bad-embedded':'verification_result.json'}[negative]
        data=json.loads((package/filename).read_text())
        if negative=='signed-bad-findings': data['counts']['high']=99
        elif negative=='signed-bad-coverage':data['section_results'][0]['complete']=False
        elif negative=='signed-bad-authority':data['target']['allowed_hostnames']=['different-host']
        else:data['status']='invalid'
        write_json(package/filename,data)
        manifest=json.loads((package/'evidence_manifest.json').read_text())
        for a in manifest['artifacts']:a['sha256']='sha256:'+hashlib.sha256((package/a['path']).read_bytes()).hexdigest()
        write_json(package/'evidence_manifest.json',manifest)
        receipt=json.loads((package/'receipt.json').read_text());receipt.pop('signature');receipt['manifest_hash']='sha256:'+hashlib.sha256(canonical_json_bytes(manifest)).hexdigest()
        receipt=sign_record(receipt,load_private_key(key),'witnessops_lsa_synthetic_test_001')
        for n in ['receipt.json','RECEIPT-COMPAT.json']:write_json(package/n,receipt)
        write_core_manifest(package)
        dest=out/negative;dest.mkdir(exist_ok=True);z=dest/'proofpack-negative.zip'
        z.unlink(missing_ok=True);deterministic_zip(package,z)
        sig=dest/'proofpack-negative.zip.sig.json';write_json(sig,build_detached_file_signature(z,load_private_key(key),'witnessops_lsa_synthetic_test_001'))
        shutil.copyfile(registry,dest/registry.name)
        result=verify_proofpack(z,sig,registry);assert result['status']=='invalid'
        (dest/'expected.json').write_text(json.dumps(result,indent=2)+'\n')
    # A byte alteration must fail transport admission, before parsing any package content.
    good=out/'complete'; bad=out/'tampered';bad.mkdir(exist_ok=True)
    for p in good.glob('*'):
        if p.suffix=='.zip' or p.name.endswith('.sig.json') or p.name=='trusted-keys.json':shutil.copyfile(p,bad/p.name)
    zipfile=next(bad.glob('*.zip'));b=bytearray(zipfile.read_bytes());b[len(b)//2]^=1;zipfile.write_bytes(b)
    (bad/'expected.json').write_text(json.dumps(verify_proofpack(zipfile,next(bad.glob('*.sig.json')),bad/'trusted-keys.json'),indent=2)+'\n')
    wrong=out/'wrong-registry';wrong.mkdir(exist_ok=True)
    for p in good.glob('*'):
        if p.suffix=='.zip' or p.name.endswith('.sig.json'):shutil.copyfile(p,wrong/p.name)
    data=json.loads(registry.read_text());data['keys'][0]['public_key']='00'*32
    (wrong/'trusted-keys.json').write_text(json.dumps(data,indent=2)+'\n')
    (wrong/'expected.json').write_text(json.dumps(verify_proofpack(next(wrong.glob('*.zip')),next(wrong.glob('*.sig.json')),wrong/'trusted-keys.json'),indent=2)+'\n')
    provenance={'version':__version__,'kind':'synthetic_only','source_hashes':{str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((source/'src/witnessops_local_audit').glob('*.py'))},'private_key_retained':False}
    (out/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print('Synthetic CLI reference and authenticated negative cases written; temporary private key removed.')
