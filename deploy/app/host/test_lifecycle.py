import importlib.machinery
import importlib.util
import pathlib
import tempfile
import types
import unittest
from unittest.mock import patch

loader = importlib.machinery.SourceFileLoader('lifecycle', str(pathlib.Path(__file__).with_name('witnessops-app-lifecycle')))
spec = importlib.util.spec_from_loader(loader.name, loader)
m = importlib.util.module_from_spec(spec)
loader.exec_module(m)
IMAGE = 'sha256:' + 'a' * 64


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
            p=pathlib.Path(d);(p/'image-security-approved').write_text('{"imageConfig":"'+IMAGE+'","vulnerabilities":0,"secrets":0}')
            (p/'runtime.env').write_text('DATABASE_URL=postgresql://fixture:password@localhost/fixture?host=/var/run/postgresql\n')
            with patch.object(m,'CONFIG',p),patch.object(m,'podman_json',return_value=[{'Id':IMAGE}]), \
                 patch.object(m,'call',side_effect=[None,RuntimeError('database down')]):
                with self.assertRaises(RuntimeError):m.preflight(IMAGE)

    def test_finalizer_mounts_are_durable_and_key_read_only(self):
        args=m.run_args(IMAGE)
        self.assertIn('--mount=type=bind,source=/var/lib/witnessops-finalizer,destination=/var/lib/witnessops-finalizer',args)
        self.assertIn('--mount=type=bind,source=/etc/witnessops-app/finalizer-key,destination=/run/witnessops-finalizer/key,ro=true',args)
        check=m.run_args(IMAGE,readiness=True)
        self.assertIn('--network=none',check)
        self.assertIn('--entrypoint=/opt/witnessops/finalizer/venv/bin/python',check)
        self.assertEqual(check[-2:],['-I','/opt/witnessops/finalizer-readiness.py'])
        self.assertNotIn('--rm',args)

if __name__=='__main__':unittest.main()
