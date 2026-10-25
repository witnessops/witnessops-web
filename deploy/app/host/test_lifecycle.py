import importlib.machinery
import importlib.util
import io
import json
import pathlib
import tempfile
import types
import unittest
from test_caddy_snippet import CaddySnippetTests
from unittest.mock import patch

loader = importlib.machinery.SourceFileLoader('lifecycle', str(pathlib.Path(__file__).with_name('witnessops-app-lifecycle')))
spec = importlib.util.spec_from_loader(loader.name, loader)
m = importlib.util.module_from_spec(spec)
loader.exec_module(m)
IMAGE = 'sha256:' + 'a' * 64
CONFIG_DIGEST = 'sha256:' + 'c' * 64
ARCHIVE = 'b' * 64


def install_candidate(path, image=IMAGE, archive=ARCHIVE, image_digest=None, config_digest=CONFIG_DIGEST,
                      vulnerabilities=0, secrets=0, archive_sha=None, identity=None, checksum=None):
    root = path / 'ci-candidate'
    root.mkdir(exist_ok=True)
    (root / 'identity.json').write_text(identity if identity is not None else json.dumps({
        'image_digest': IMAGE if image_digest is None else image_digest,
        'config_digest': config_digest,
    }))
    (root / 'image.sha256').write_text(checksum if checksum is not None else f'{archive}  image.tar\n')
    (path / 'image-security-approved').write_text(json.dumps({
        'imageConfig': image, 'vulnerabilities': vulnerabilities, 'secrets': secrets,
        'archiveSha256': archive if archive_sha is None else archive_sha,
    }))


def container(running=False, name='witnessops-app', image=IMAGE, status='exited'):
    return {'Id': 'b' * 64, 'Name': name, 'Image': image, 'Config': {'Labels': {m.LABEL: 'app'}},
            'State': {'Running': running, 'Status': status}}


class Lifecycle(unittest.TestCase):
    def test_identity_requires_name_label_image(self):
        self.assertTrue(m.identity(container(), IMAGE))
        self.assertFalse(m.identity(container(name='witnessops-app-other'), IMAGE))
        self.assertFalse(m.identity(container(image='sha256:'+'c'*64), IMAGE))
        c=container();c['Config']['Labels']={};self.assertFalse(m.identity(c, IMAGE))

    def test_inventory_rejects_second_or_wrong_image(self):
        for items in [[container(),container(name='witnessops-app-other')],[container(image='wrong')]]:
            with patch.object(m,'inventory',return_value=items):
                with self.assertRaises(RuntimeError):m.inspect_expected(IMAGE)

    def start_case(self, previous):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        calls=[]
        with patch.object(m,'LOCK',temp.name+'/lock'),patch.object(m,'preflight'), \
             patch.object(m,'inspect_expected',side_effect=[previous,None]), \
             patch.object(m,'podman_json',return_value=[previous]), \
             patch.object(m,'call',side_effect=lambda args,**kw:calls.append(args)), \
             patch.object(m.subprocess,'run',return_value=types.SimpleNamespace(returncode=0)) as run:
            result=m.start(IMAGE)
        return calls,run.call_args.args[0],result

    def test_clean_start_never_removes(self):
        calls,args,result=self.start_case(None);self.assertEqual(calls,[]);self.assertEqual(result,0)
        self.assertIn('--pull=never',args);self.assertNotIn('--rm',args);self.assertEqual(args[-1],IMAGE)
        self.assertIn('--publish=127.0.0.1:3020:3020',args);self.assertIn('--cap-drop=all',args)

    def test_exited_crashed_created_cleanup_is_exact(self):
        for state in ['exited','created','configured','stopped']:
            calls,_,_=self.start_case(container(status=state))
            self.assertEqual(calls,[[m.PODMAN,'rm','b'*64]])

    def test_running_refused_without_removal(self):
        with self.assertRaises(RuntimeError):self.start_case(container(running=True,status='running'))

    def test_ambiguous_state_refused(self):
        with self.assertRaises(RuntimeError):self.start_case(container(status='unknown'))

    def test_preflight_failure_prevents_cleanup_and_run(self):
        with tempfile.TemporaryDirectory() as d,patch.object(m,'LOCK',d+'/lock'), \
             patch.object(m,'preflight',side_effect=RuntimeError()),patch.object(m,'inspect_expected') as inv:
            with self.assertRaises(RuntimeError):m.start(IMAGE)
            inv.assert_not_called()

    def test_stop_by_exact_id_no_force_or_volume_delete(self):
        c=container(running=True)
        with patch.object(m,'inspect_expected',return_value=c),patch.object(m,'call') as call, \
             patch.object(m,'podman_json',return_value=[container()]):
            self.assertEqual(m.stop(IMAGE),0)
            call.assert_called_once_with([m.PODMAN,'stop','--time=45','b'*64],stdout=m.subprocess.DEVNULL)

    def test_mutable_or_shell_image_rejected(self):
        for image in ['latest','repo:latest','sha256:x; touch /tmp/x','sha256:'+'a'*63]:
            with self.assertRaises(RuntimeError):m.preflight(image)

    def test_database_failure_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);install_candidate(p)
            (p/'runtime.env').write_text('DATABASE_URL=postgresql://fixture:password@localhost/fixture?host=/var/run/postgresql\n')
            with patch.object(m,'CONFIG',p),patch.object(m,'podman_json',return_value=[{'Id':IMAGE}]), \
                 patch.object(m,'call',side_effect=[None,RuntimeError('database down')]):
                with self.assertRaises(RuntimeError):m.preflight(IMAGE)

    def test_finalizer_mounts_are_durable_and_key_read_only(self):
        args=m.run_args(IMAGE,finalizer=True)
        self.assertIn('--mount=type=bind,source=/var/lib/witnessops-finalizer,destination=/var/lib/witnessops-finalizer',args)
        self.assertIn('--mount=type=bind,source=/etc/witnessops-app/finalizer-key,destination=/run/witnessops-finalizer/key,ro=true',args)
        check=m.run_args(IMAGE,readiness=True,finalizer=True)
        self.assertIn('--network=none',check)
        self.assertIn('--entrypoint=/opt/witnessops/finalizer/venv/bin/python',check)
        self.assertEqual(check[-2:],['-I','/opt/witnessops/finalizer-readiness.py'])
        self.assertNotIn('--rm',args)

    def runtime(self, extra):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        p=pathlib.Path(temp.name)
        install_candidate(p)
        (p/'runtime.env').write_text('DATABASE_URL=postgresql://fixture:password@localhost/fixture?host=/var/run/postgresql\n'+extra)
        return p

    def test_finalizer_off_skips_key_mount_and_readiness(self):
        for extra in ['','WITNESSOPS_FINALIZER_ENABLED=true\n','WITNESSOPS_FINALIZER_ENABLED=1 \n','WITNESSOPS_FINALIZER_ENABLED=\n']:
            calls=[]
            with patch.object(m,'CONFIG',self.runtime(extra)),patch.object(m,'podman_json',return_value=[{'Id':IMAGE}]), \
                 patch.object(m,'call',side_effect=lambda args,**kw:calls.append(args)):
                self.assertIs(m.preflight(IMAGE),False)
            self.assertEqual(len(calls),2)
            self.assertNotIn('finalizer-readiness.py',' '.join(' '.join(item) for item in calls))
        args=m.run_args(IMAGE)
        self.assertNotIn('--mount=type=bind,source=/etc/witnessops-app/finalizer-key,destination=/run/witnessops-finalizer/key,ro=true',args)
        self.assertNotIn('--mount=type=bind,source=/var/lib/witnessops-finalizer,destination=/var/lib/witnessops-finalizer',args)
        self.assertNotIn('--env=WITNESSOPS_FINALIZER_KEY=/run/witnessops-finalizer/key',args)
        with self.assertRaises(RuntimeError):m.run_args(IMAGE,readiness=True)

    def test_finalizer_on_runs_readiness_against_the_read_only_key(self):
        calls=[]
        with patch.object(m,'CONFIG',self.runtime('WITNESSOPS_FINALIZER_ENABLED=1\n')), \
             patch.object(m,'podman_json',return_value=[{'Id':IMAGE}]), \
             patch.object(m,'call',side_effect=lambda args,**kw:calls.append(args)):
            self.assertIs(m.preflight(IMAGE),True)
        self.assertEqual(len(calls),3)
        self.assertIn('--mount=type=bind,source=/etc/witnessops-app/finalizer-key,destination=/run/witnessops-finalizer/key,ro=true',calls[2])
        self.assertIn('--network=none',calls[2])
        self.assertEqual(calls[2][-2:],['-I','/opt/witnessops/finalizer-readiness.py'])

    def test_start_follows_the_preflight_finalizer_gate(self):
        for enabled in (False,True):
            temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
            with patch.object(m,'LOCK',temp.name+'/lock'),patch.object(m,'preflight',return_value=enabled), \
                 patch.object(m,'inspect_expected',side_effect=[None,None]), \
                 patch.object(m.subprocess,'run',return_value=types.SimpleNamespace(returncode=0)) as run:
                self.assertEqual(m.start(IMAGE),0)
            args=run.call_args.args[0]
            key='--mount=type=bind,source=/etc/witnessops-app/finalizer-key,destination=/run/witnessops-finalizer/key,ro=true'
            self.assertEqual(key in args,enabled)
            self.assertEqual(args[-1],IMAGE)
            self.assertIn('--cap-drop=all',args)

    def candidate_dir(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        return pathlib.Path(temp.name)

    def assert_candidate_reason(self, path, reason, image=IMAGE):
        with patch.object(m,'CONFIG',path), \
             patch.object(m,'call') as call,patch.object(m,'podman_json') as podman:
            with self.assertRaises(m.CandidateMismatch) as caught:
                m.preflight(image)
        self.assertEqual(caught.exception.reason,reason)
        call.assert_not_called();podman.assert_not_called()

    def test_missing_candidate_manifest_fails_closed(self):
        path=self.candidate_dir();install_candidate(path);(path/'ci-candidate').rename(path/'hidden-candidate')
        self.assert_candidate_reason(path,'missing_manifest')
        path=self.candidate_dir();install_candidate(path);(path/'ci-candidate'/'image.sha256').unlink()
        self.assert_candidate_reason(path,'missing_manifest')

    def test_invalid_or_linked_manifest_fails_closed(self):
        secret='SUPERSECRETTOKENVALUE'
        path=self.candidate_dir();install_candidate(path,identity=secret,checksum=secret+'  image.tar\n')
        self.assert_candidate_reason(path,'invalid_manifest')
        path=self.candidate_dir();install_candidate(path,checksum='d'*64+'  other.tar\n')
        self.assert_candidate_reason(path,'invalid_manifest')
        path=self.candidate_dir();install_candidate(path)
        identity=path/'ci-candidate'/'identity.json'
        target=path/'ci-candidate'/'identity-target.json'
        target.write_text(identity.read_text());identity.unlink();identity.symlink_to(target.name)
        self.assert_candidate_reason(path,'invalid_manifest')

    def test_approval_and_digest_mismatch_fail_before_container_work(self):
        path=self.candidate_dir();install_candidate(path,vulnerabilities=1)
        self.assert_candidate_reason(path,'approval_mismatch')
        path=self.candidate_dir();install_candidate(path,image_digest='sha256:'+'d'*64,config_digest='sha256:'+'e'*64)
        self.assert_candidate_reason(path,'digest_mismatch')
        path=self.candidate_dir();install_candidate(path,archive_sha='f'*64)
        self.assert_candidate_reason(path,'digest_mismatch')
        path=self.candidate_dir();install_candidate(path,image_digest='sha256:'+'d'*64,config_digest='sha256:'+'e'*64)
        with patch.object(m,'LOCK',str(path/'lock')),patch.object(m,'CONFIG',path), \
             patch.object(m,'inspect_expected') as inv:
            with self.assertRaises(m.CandidateMismatch):
                m.start(IMAGE)
            inv.assert_not_called()

    def test_matching_manifest_digest_or_config_digest_passes(self):
        for image,image_digest,config_digest in (
            (IMAGE,IMAGE,CONFIG_DIGEST),(CONFIG_DIGEST,IMAGE,CONFIG_DIGEST),
        ):
            path=self.candidate_dir();install_candidate(path,image=image,image_digest=image_digest,config_digest=config_digest)
            (path/'runtime.env').write_text('DATABASE_URL=postgresql://fixture:password@localhost/fixture?host=/var/run/postgresql\n')
            output=io.StringIO()
            with patch.object(m,'CONFIG',path), \
                 patch.object(m,'podman_json',return_value=[{'Id':image}]), \
                 patch.object(m,'call',side_effect=lambda args,**kw:None),patch('sys.stdout',output):
                self.assertIs(m.preflight(image),False)
            text=output.getvalue()
            self.assertIn('finalizer_disabled',text);self.assertNotIn('password',text);self.assertNotIn('fixture:',text)

    def test_main_mismatch_exits_78_without_echoing_manifest_bytes(self):
        secret='SUPERSECRETTOKENVALUE'
        path=self.candidate_dir()
        (path/'image-security-approved').write_text('{"imageConfig":"'+IMAGE+'","note":"'+secret+'"}')
        output=io.StringIO()
        with patch.object(m,'LOCK',str(path/'lock')),patch.object(m,'CONFIG',path), \
             patch.object(m.os,'geteuid',return_value=0), \
             patch.object(m.sys,'argv',['lifecycle','start',IMAGE]),patch('sys.stdout',output), \
             patch.object(m,'inspect_expected') as inv:
            self.assertEqual(m.main(),78)
        text=output.getvalue();self.assertNotIn(secret,text);inv.assert_not_called()
        record=json.loads(text)
        self.assertEqual(record,{'event':'candidate_mismatch','reason':'missing_manifest','exit_code':78})
        install_candidate(path,identity=secret,checksum=secret)
        output=io.StringIO()
        with patch.object(m,'LOCK',str(path/'lock')),patch.object(m,'CONFIG',path), \
             patch.object(m.os,'geteuid',return_value=0), \
             patch.object(m.sys,'argv',['lifecycle','start',IMAGE]),patch('sys.stdout',output):
            self.assertEqual(m.main(),78)
        self.assertNotIn(secret,output.getvalue())
        self.assertEqual(json.loads(output.getvalue())['reason'],'invalid_manifest')

    def test_unit_prevents_a_mismatch_restart_loop(self):
        text=pathlib.Path(__file__).with_name('witnessops-app.service').read_text()
        self.assertIn('Restart=on-failure\nRestartSec=15\n',text)
        self.assertIn('RestartPreventExitStatus=78\n',text)
        self.assertIn('StartLimitIntervalSec=300\n',text)
        self.assertIn('StartLimitBurst=10\n',text)
        self.assertIn('ConditionPathExists=/etc/witnessops-app/launch-enabled\n',text)
        self.assertIn('ConditionPathExists=/etc/witnessops-app/image-security-approved\n',text)

    def test_image_copies_finalizer_adapter_where_the_runtime_resolves_it(self):
        root=pathlib.Path(__file__).resolve().parents[3]
        dockerfile=(root/'deploy'/'app'/'Dockerfile').read_text()
        readiness=(root/'deploy'/'app'/'finalizer-readiness.py').read_text()
        runtime=(root/'apps'/'witnessops-app'/'src'/'lib'/'server-check'/'runtime.ts').read_text()
        self.assertIn("path.resolve('scripts/server-check-finalize.py')",runtime)
        self.assertIn('COPY apps/witnessops-app/scripts/server-check-finalize.py /app/scripts/server-check-finalize.py',dockerfile)
        self.assertIn("Path('/app/scripts/server-check-finalize.py')",readiness)

if __name__=='__main__':unittest.main()
