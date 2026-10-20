#!/usr/bin/env python3
"""Run the HMR deploy script with isolated Docker fakes; never contact Docker."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
OLD, NEW = 'a' * 40, 'b' * 40
FAKE = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
root = pathlib.Path(os.environ['LIVE_FIXTURE'])
state = json.loads((root / 'state.json').read_text())
args = sys.argv[1:]
state['calls'].append([pathlib.Path(sys.argv[0]).name] + args)
def finish(code=0):
    (root / 'state.json').write_text(json.dumps(state))
    sys.exit(code)
if pathlib.Path(sys.argv[0]).name == 'flock': finish()
if pathlib.Path(sys.argv[0]).name != 'docker': finish(92)
if args[:2] == ['ps', '-q']:
    assert args[2:] == ['--filter', 'label=com.docker.compose.service=gameserver']
    print(state.get('containers', 'selected'))
elif args[0] == 'inspect':
    assert args[-1] == 'selected'
    if args[3-1] == '{{.Config.Image}}': print(state.get('image', 'balkshamster/looperlands:latest'))
    elif args[3-1] == '{{json .Config.Labels}}': print(json.dumps({'com.docker.compose.service':'gameserver',
        'com.docker.compose.project':'production','com.docker.compose.project.config_files':str(root/'host.yml')}))
    elif args[3-1] == '{{json .Mounts}}': print('[]')
    else: finish(94)
elif args[0] == 'compose':
    assert args[-3:] == ['config', '--format', 'json']
    print(json.dumps({'services':{'gameserver':{'volumes':[{'type':'volume','source':'chat','target':'/opt/app/data/chat'}]}},
        'volumes':{'chat':{'name':'private_chat'}}}))
elif args[0] == 'pull':
    if state.get('fail') == 'pull': finish(1)
elif args[0] == 'run':
    if args[-1] == 'client-files':
        assert '--network' in args and args[args.index('--network')+1]=='none'
        assert not any(flag in args for flag in ['-v','--volume','--mount'])
        print('{}'); finish()
    assert args == ['run', '--rm', '--network', 'none', '--entrypoint', 'node',
        'balkshamster/looperlands:' + 'b'*40, '/opt/app/bin/live-update-artifact.js', 'bundle']
    print(json.dumps({'manifest': {'revision': state.get('artifact', 'b'*40), 'protocol': 1, 'files': {}}, 'sources': {}}))
elif args[0] == 'exec':
    if '-e' in args:
        script=args[args.index('-e')+1]
        assert 'fs.accessSync' in script or 'requester:' in script
        if 'requester:' in script: print('{"requester":true}')
        finish()
    if args[-1].endswith('/stage-client-update.js'):
        assert args[:3]==['exec','-i','selected']
        finish()
    assert args[:3] == ['exec', '-i', '--env']
    action = args[3].split('=', 1)[1]
    assert args[4:] == ['selected', 'node', '/opt/app/bin/live-update-request.js']
    if state.get('fail') == action:
        print('HMR endpoint refused the update', file=sys.stderr)
        finish(1)
    if action not in ('status', 'manifest'):
        request = json.loads(sys.stdin.read())
        assert request['expectedRevision'] == state.get('revision', 'a'*40)
    if action in ('apply', 'rollback'):
        state['revision'] = 'b'*40 if action == 'apply' else 'a'*40
        state['applied'] = True
    status = {'protocol': 1, 'pid': 13 if state.get('fail') == 'pid' and state.get('applied') else 12,
        'revision': state.get('revision', 'a'*40), 'rollbackAvailable': state.get('rollback', False),
        'automaticDeployment':1,'clientReload':True,'ready':True}
    if action=='plan': status['method']=state.get('method','hmr')
    if action=='manifest': status['manifest']={'client':{'files':{}}}
    if state.get('fail') == 'readback' and state.get('applied') and action == 'status': status['revision'] = 'c'*40
    print(json.dumps(status))
else: finish(93)
finish()
'''


class LiveDeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.state = {'calls': []}
        self.environment = {'LIVE_UPDATE_SERVICE': 'gameserver', 'LIVE_UPDATE_IMAGE': 'balkshamster/looperlands:' + NEW}
        for name in ('docker', 'flock', 'systemctl', 'sudo'):
            filename = self.root / name
            filename.write_text(FAKE)
            filename.chmod(0o755)
        source = (ROOT / 'deploy-live-game-server.sh').read_text().replace('${HOME:?}/.looperlands-chat', str(self.root))
        (self.root / 'deploy.sh').write_text(source)
        engine = (ROOT / 'deploy-game-server.py').read_text().replace("Path(self.env['HOME']) / '.looperlands-chat'", "Path(self.env['LIVE_FIXTURE']) / 'deploy-state'")
        engine = engine.replace('sleep=time.sleep', 'sleep=lambda _seconds: None')
        (self.root / 'deploy-game-server.py').write_text(engine)
        (self.root / 'host.yml').write_text('installed host configuration')

    def tearDown(self):
        self.temp.cleanup()

    def run_deploy(self):
        (self.root / 'state.json').write_text(json.dumps(self.state))
        result = subprocess.run(['bash', str(self.root / 'deploy.sh')], capture_output=True, text=True,
            env={**os.environ, 'PATH': str(self.root) + ':' + os.environ['PATH'], 'LIVE_FIXTURE': str(self.root), **self.environment})
        self.state = json.loads((self.root / 'state.json').read_text())
        for call in self.state['calls']:
            self.assertIn(call[0], ('docker', 'flock'))
            if call[0] == 'docker':
                self.assertIn(call[1], ('ps', 'inspect', 'exec', 'pull', 'run', 'compose'))
                if call[1]=='compose': self.assertEqual(call[-3:], ['config','--format','json'])
        return result

    def actions(self):
        return [call[4].split('=', 1)[1] for call in self.state['calls'] if call[:4] == ['docker', 'exec', '-i', '--env']]

    def test_updates_only_the_selected_single_server_and_checks_the_same_process(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.actions(), ['status', 'plan', 'manifest', 'prepare', 'apply', 'status'])
        self.assertIn('same game-server process', result.stdout)

    def test_requires_an_explicit_service(self):
        self.environment['LIVE_UPDATE_SERVICE'] = ''
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.state['calls'], [])

    def test_refuses_multiple_or_missing_containers(self):
        for value in ('', 'selected\nother'):
            with self.subTest(value=value):
                self.state = {'calls': [], 'containers': value}
                self.assertNotEqual(self.run_deploy().returncode, 0)
                self.assertNotIn('apply', self.actions())

    def test_refuses_an_unrelated_image(self):
        self.state['image'] = 'unrelated/private-service:latest'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), [])

    def test_requires_an_immutable_image(self):
        self.environment['LIVE_UPDATE_IMAGE'] = 'balkshamster/looperlands:latest'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.state['calls'], [])

    def test_missing_hmr_stops_before_downloading_or_starting_an_artifact(self):
        self.state['fail'] = 'status'
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Command failed: docker exec', result.stderr)
        self.assertFalse(any(call[:2] in (['docker', 'pull'], ['docker', 'run']) for call in self.state['calls']))

    def test_rejected_preparation_does_not_apply(self):
        self.state['fail'] = 'prepare'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status', 'plan', 'manifest', 'prepare'])
        self.assertFalse(self.state.get('applied'))

    def test_wrong_artifact_revision_does_not_prepare(self):
        self.state['artifact'] = 'c' * 40
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status'])

    def test_readback_rejects_changed_pid_or_wrong_revision(self):
        for failure in ('pid', 'readback'):
            with self.subTest(failure=failure):
                self.state = {'calls': [], 'fail': failure}
                self.assertNotEqual(self.run_deploy().returncode, 0)

    def test_repeat_release_does_not_apply_or_discard_rollback(self):
        self.state['revision'] = NEW
        self.state['rollback'] = True
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status', 'plan', 'manifest', 'prepare', 'status'])
        self.assertTrue(self.state['rollback'])

    def test_incompatible_release_never_reboots_in_manual_hmr_mode(self):
        self.state['method'] = 'reboot'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status', 'plan'])
        self.assertFalse(self.state.get('applied'))

    def test_rollback_does_not_download_an_image(self):
        self.environment['LIVE_UPDATE_ACTION'] = 'rollback'
        self.state.update(revision=NEW, rollback=True)
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status', 'rollback', 'status'])
        self.assertFalse(any(call[:2] == ['docker', 'pull'] for call in self.state['calls']))

    def test_unavailable_rollback_does_not_mutate(self):
        self.environment['LIVE_UPDATE_ACTION'] = 'rollback'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.actions(), ['status'])


if __name__ == '__main__':
    unittest.main()
