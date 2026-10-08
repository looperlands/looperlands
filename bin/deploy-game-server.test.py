#!/usr/bin/env python3
"""Exercise deployment ordering and failure recovery with isolated Docker/systemd fakes."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('storage_plan', ROOT / 'chat-storage-plan.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def configurations():
    old = {'name': 'production', 'services': {name: {'image': 'balkshamster/looperlands:latest', 'environment': {'PRIVATE_TOKEN': 'never-log-me'}} for name in module.SERVICES}}
    new = copy.deepcopy(old)
    new['volumes'] = {}
    for index, service in enumerate(module.SERVICES):
        alias = 'chat-history' + ('-2' if index else '')
        new['services'][service]['volumes'] = [{'type': 'volume', 'source': alias, 'target': module.CHAT_DIRECTORY}]
        new['volumes'][alias] = {'name': 'production_' + alias}
    return old, new


FAKE = r'''#!/usr/bin/env python3
import json, os, pathlib, subprocess, sys
root = pathlib.Path(os.environ['DEPLOY_FIXTURE'])
a = sys.argv[1:]
state = json.loads((root / 'state.json').read_text())
command = pathlib.Path(sys.argv[0]).name
state['calls'].append([command] + a)
def finish(code=0):
    (root / 'state.json').write_text(json.dumps(state))
    sys.exit(code)
def service(container):
    return 'gameserver2' if container.endswith('2') else 'gameserver'
if command == 'id': print('0')
elif command in ('flock', 'sync'): pass
elif command in ('systemctl', 'sudo'):
    if command == 'sudo': a = a[2:]
    if a[0] == 'restart':
        assert all(state['paused'].values()), 'Writers must remain paused until restart'
        assert (root / 'host.yml').read_text() == 'new compose', 'Host Compose was not updated'
        if state.get('fail') == 'restart': finish(1)
        state['restarted'] = True
        state['paused'] = {'old1': False, 'old2': False}
elif command == 'docker':
    if a[0] == 'ps': print('old1\nold2')
    elif a[0] == 'inspect':
        fmt, container = a[2], a[3]
        if '.Config.Image' in fmt: print('balkshamster/looperlands:latest')
        elif 'project.config_files' in fmt: print(root / 'host.yml')
        elif '.Config.Labels' in fmt: print('production')
        elif '.State.Paused' in fmt: print(str(state['paused'].get(container, False)).lower())
        elif 'json .Mounts' in fmt:
            print(json.dumps(state.get('mounts', {}).get(service(container), [])))
        else:
            volume = 'production_chat-history' + ('-2' if service(container) == 'gameserver2' else '')
            print('volume ' + volume + ' true')
    elif a[0] == 'compose':
        if a[1] == 'version': finish()
        source = a[a.index('-f') + 1]
        operation = a[a.index('-f') + 2:]
        if operation[0] == 'config':
            print((root / ('current.json' if source.endswith('host.yml') else 'proposed.json')).read_text())
        elif operation[0] == 'ps':
            print(('new' if state['restarted'] else 'old') + ('2' if operation[-1] == 'gameserver2' else '1'))
        elif operation[0] != 'pull': finish(2)
    elif a[0] == 'volume':
        volume = a[-1]
        destination = root / volume
        if a[1] == 'create': destination.mkdir(exist_ok=True)
        elif a[1] == 'inspect':
            print('local' if '.Driver' in a[3] else 'null' if '.Options' in a[3] else destination)
    elif a[0] == 'run':
        mount = a[a.index('--mount') + 1]
        volume = next(entry[4:] for entry in mount.split(',') if entry.startswith('src='))
        destination = root / volume
        code = a[a.index('-e') + 1].replace('/chat', str(destination))
        args = a[a.index('-e') + 2:]
        result = subprocess.run(['node', '-e', code] + args)
        if result.returncode: finish(result.returncode)
    elif a[0] == 'exec':
        if 'path' in a[4]: print(state.get('history_path', '/opt/app/data/chat/history.json'))
    elif a[0] == 'pause': state['paused'][a[1]] = True
    elif a[0] == 'unpause': state['paused'][a[1]] = False
    elif a[0] == 'cp':
        assert all(state['paused'].values()), 'All writers must pause before the first copy'
        if state.get('fail') == 'copy': finish(1)
        payload = {'version': 1, 'identities': {'wallet': 'a' * 32}, 'streams': {'world': [{'id': service(a[1].split(':')[0]), 'epoch': state['epoch'], 'message': 'private-fixture-do-not-log'}]}}
        pathlib.Path(a[2]).write_text(json.dumps(payload))
    else: finish(2)
else: finish(2)
finish()
'''


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.old, self.new = configurations()
        self.state = {'calls': [], 'paused': {'old1': False, 'old2': False}, 'restarted': False, 'epoch': int(time.time() * 1000)}
        (self.root / 'host.yml').write_text('old compose')
        (self.root / 'candidate.yml').write_text('new compose')
        for command in ('docker', 'systemctl', 'sudo', 'id', 'flock', 'sync'):
            filename = self.root / command
            filename.write_text(FAKE)
            filename.chmod(0o755)
        script = (ROOT / 'deploy-game-server.sh').read_text()
        # Redirect only the deployment account state directory to the isolated fixture.
        script = script.replace('${HOME:?}/.looperlands-chat', str(self.root))
        (self.root / 'deploy-game-server.sh').write_text(script)
        (self.root / 'chat-storage-plan.py').write_text((ROOT / 'chat-storage-plan.py').read_text())

    def tearDown(self):
        self.temp.cleanup()

    def run_deploy(self, check=False):
        (self.root / 'current.json').write_text(json.dumps(self.old))
        (self.root / 'proposed.json').write_text(json.dumps(self.new))
        (self.root / 'state.json').write_text(json.dumps(self.state))
        result = subprocess.run(['bash', str(self.root / 'deploy-game-server.sh')] + (['--check'] if check else []) + [str(self.root / 'candidate.yml'), 'a' * 40], env={**os.environ, 'DEPLOY_FIXTURE': str(self.root), 'PATH': str(self.root) + ':' + os.environ['PATH']}, capture_output=True, text=True)
        self.state = json.loads((self.root / 'state.json').read_text())
        self.assertNotIn('private-fixture-do-not-log', result.stdout + result.stderr)
        self.assertNotIn('never-log-me', result.stdout + result.stderr)
        return result

    def test_migrates_both_streams_before_restart_and_keeps_private_backups(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.state['restarted'])
        self.assertEqual([call for call in self.state['calls'] if call[0] == 'sudo'], [['sudo', '-n', 'systemctl', 'restart', 'looperlands']])
        for call in self.state['calls']:
            if call[:2] == ['docker', 'run']:
                self.assertEqual(call[call.index('--network') + 1], 'none')
                self.assertIn('--read-only', call)
                self.assertNotIn('--privileged', call)
                self.assertIn('type=volume,', call[call.index('--mount') + 1])
                self.assertNotIn('type=bind', call[call.index('--mount') + 1])
        self.assertEqual((self.root / 'host.yml').read_text(), 'new compose')
        for service, _, volume in module.storage_plan(self.old, self.new):
            filename = self.root / volume / 'history.json'
            self.assertEqual(json.loads(filename.read_text())['streams']['world'][0]['id'], service)
            self.assertEqual(filename.stat().st_mode & 0o777, 0o600)
            self.assertEqual(len(list((self.root / 'backups').glob('*/' + service + '.json'))), 1)

    def test_incompatible_compose_stops_before_pausing_or_pulling(self):
        self.new['services']['gameserver']['environment']['PRIVATE_TOKEN'] = 'different'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse(any(call[:2] == ['docker', 'pause'] for call in self.state['calls']))
        self.assertFalse(any('pull' in call for call in self.state['calls']))
        self.assertEqual((self.root / 'host.yml').read_text(), 'old compose')

    def test_copy_failure_resumes_both_originals_without_changing_compose(self):
        self.state['fail'] = 'copy'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse(any(self.state['paused'].values()))
        self.assertFalse(self.state['restarted'])
        self.assertEqual((self.root / 'host.yml').read_text(), 'old compose')
        self.assertFalse(list(self.root.glob('production_*/history.json')))

    def test_existing_unmounted_history_is_never_overwritten(self):
        directory = self.root / 'production_chat-history'
        directory.mkdir()
        filename = directory / 'history.json'
        filename.write_text('existing history')
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(filename.read_text(), 'existing history')
        self.assertFalse(any(call[:2] == ['docker', 'pause'] for call in self.state['calls']))

    def test_existing_persistent_volumes_are_not_reseeded(self):
        self.old = copy.deepcopy(self.new)
        self.state['mounts'] = {}
        for service, _, volume in module.storage_plan(self.old, self.new):
            self.state['mounts'][service] = [{'Type': 'volume', 'Name': volume, 'Destination': module.CHAT_DIRECTORY, 'RW': True}]
            directory = self.root / volume
            directory.mkdir()
            (directory / 'history.json').write_text('existing persistent history')
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(all(filename.read_text() == 'existing persistent history' for filename in self.root.glob('production_*/history.json')))

    def test_custom_history_path_stops_before_downtime(self):
        self.state['history_path'] = '/custom/history.json'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse(any(call[:2] == ['docker', 'pause'] for call in self.state['calls']))

    def test_failed_restart_keeps_backups_and_resumes_remaining_originals(self):
        self.state['fail'] = 'restart'
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse(any(self.state['paused'].values()))
        self.assertEqual(len(list(self.root.glob('production_*/history.json'))), 2)
        self.assertEqual(len(list((self.root / 'backups').glob('*/gameserver*.json'))), 2)

    def test_check_mode_does_not_pull_pause_create_volumes_or_restart(self):
        result = self.run_deploy(check=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.state['restarted'])
        self.assertEqual((self.root / 'host.yml').read_text(), 'old compose')
        self.assertFalse(any(call[:2] in (['docker', 'pause'], ['docker', 'volume'], ['docker', 'run']) or 'pull' in call for call in self.state['calls']))

    def test_shared_volume_is_rejected(self):
        self.new['volumes']['chat-history-2']['name'] = 'production_chat-history'
        with self.assertRaises(ValueError):
            module.storage_plan(self.old, self.new)

    def test_read_only_volume_is_rejected(self):
        self.new['services']['gameserver']['volumes'][0]['read_only'] = True
        with self.assertRaises(ValueError):
            module.storage_plan(self.old, self.new)


if __name__ == '__main__':
    unittest.main()
