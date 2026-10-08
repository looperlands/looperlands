#!/usr/bin/env python3
"""Exercise routine deploy guards with isolated Docker/systemd fakes."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
SERVICES = ('gameserver', 'gameserver2')
CONFIG = {'services': {}, 'volumes': {}}
for index, service in enumerate(SERVICES):
    alias = 'chat-history' + ('-2' if index else '')
    CONFIG['services'][service] = {'volumes': [{'type': 'volume', 'source': alias, 'target': '/opt/app/data/chat'}], 'environment': {'PRIVATE_TOKEN': 'never-log-me'}}
    CONFIG['volumes'][alias] = {'name': 'production_' + alias}

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
if command in ('flock', 'sleep'): pass
elif command == 'systemctl': pass
elif command == 'sudo':
    assert a == ['-n', 'systemctl', 'restart', 'looperlands']
    if state.get('fail') == 'restart': finish(1)
    state['restarted'] = True
elif command == 'docker':
    if a[0] == 'ps': print('old1\nold2')
    elif a[0] == 'inspect':
        fmt, container = a[2], a[3]
        if '.Config.Image' in fmt: print('balkshamster/looperlands:latest')
        elif 'project.config_files' in fmt: print(root / 'host.yml')
        elif '.Config.Labels' in fmt: print('production')
        else:
            service = 'gameserver2' if container.endswith('2') else 'gameserver'
            default = 'volume production_chat-history' + ('-2' if service == 'gameserver2' else '') + ' true'
            mounts = state.get('after_mounts' if state['restarted'] else 'mounts', {})
            value = mounts.get(service, default)
            entries = []
            if value:
                kind, name, writable = value.split()
                entries = [{'Type': kind, 'Name': name, 'RW': writable == 'true', 'Destination': '/opt/app/data/chat'}]
            entries += state.get('extra_mounts', [])
            print(json.dumps(entries))
    elif a[0] == 'compose':
        if a[1] == 'version': finish()
        assert a[a.index('-f') + 1] == str(root / 'host.yml')
        operation = a[a.index('-f') + 2:]
        if operation[0] == 'config': print((root / 'config.json').read_text())
        elif operation[0] == 'ps': print(('new' if state['restarted'] else 'old') + ('2' if operation[-1] == 'gameserver2' else '1'))
        elif operation[0] != 'pull': finish(2)
    elif a[0] == 'exec':
        code = a[4]
        stub = 'require("fs").accessSync = () => {};'
        if state.get('fail') == 'history': stub = 'require("fs").accessSync = () => { throw Error("unreadable"); };'
        environment = dict(os.environ)
        environment.pop('CHAT_HISTORY_FILE', None)
        if state.get('history_path'): environment['CHAT_HISTORY_FILE'] = state['history_path']
        result = subprocess.run(['node', '-e', stub + code] + a[5:], env=environment)
        if result.returncode: finish(result.returncode)
    else: finish(2)
else: finish(2)
finish()
'''


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.config = copy.deepcopy(CONFIG)
        self.state = {'calls': [], 'restarted': False}
        (self.root / 'host.yml').write_text('installed persistent compose')
        (self.root / 'backups').mkdir()
        (self.root / 'backups' / 'private-history.json').write_text('private-fixture-do-not-log')
        for command in ('docker', 'systemctl', 'sudo', 'flock', 'sleep'):
            filename = self.root / command
            filename.write_text(FAKE)
            filename.chmod(0o755)
        script = (ROOT / 'deploy-game-server.sh').read_text().replace('${HOME:?}/.looperlands-chat', str(self.root))
        (self.root / 'deploy-game-server.sh').write_text(script)

    def tearDown(self):
        self.temp.cleanup()

    def run_deploy(self):
        (self.root / 'config.json').write_text(json.dumps(self.config))
        (self.root / 'state.json').write_text(json.dumps(self.state))
        result = subprocess.run(['bash', str(self.root / 'deploy-game-server.sh')], env={**os.environ, 'DEPLOY_FIXTURE': str(self.root), 'PATH': str(self.root) + ':' + os.environ['PATH']}, capture_output=True, text=True)
        self.state = json.loads((self.root / 'state.json').read_text())
        self.assertNotIn('private-fixture-do-not-log', result.stdout + result.stderr)
        self.assertNotIn('never-log-me', result.stdout + result.stderr)
        self.assertEqual((self.root / 'host.yml').read_text(), 'installed persistent compose')
        self.assertEqual((self.root / 'backups' / 'private-history.json').read_text(), 'private-fixture-do-not-log')
        self.assertFalse(any(call[:2] in (['docker', 'pause'], ['docker', 'cp'], ['docker', 'run'], ['docker', 'volume']) for call in self.state['calls']))
        return result

    def assert_stops_before_pull_or_restart(self):
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertFalse(self.state['restarted'])
        self.assertFalse(any('pull' in call for call in self.state['calls']))

    def test_deploy_preserves_host_compose_and_private_backup(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.state['restarted'])
        operations = self.state['calls']
        pull = next(i for i, call in enumerate(operations) if 'pull' in call)
        restart = next(i for i, call in enumerate(operations) if call[0] == 'sudo')
        self.assertLess(pull, restart)
        self.assertTrue(any(call[:2] == ['docker', 'exec'] and call[2].startswith('old') for call in operations[:pull]))
        self.assertTrue(any(call[:2] == ['docker', 'exec'] and call[2].startswith('new') for call in operations[restart + 1:]))

    def test_missing_live_mount_blocks_restart(self):
        self.state['mounts'] = {'gameserver2': ''}
        self.assert_stops_before_pull_or_restart()

    def test_wrong_volume_blocks_restart(self):
        self.state['mounts'] = {'gameserver': 'volume some_other_history true'}
        self.assert_stops_before_pull_or_restart()

    def test_read_only_live_mount_blocks_restart(self):
        self.state['mounts'] = {'gameserver': 'volume production_chat-history false'}
        self.assert_stops_before_pull_or_restart()

    def test_unreadable_history_blocks_restart(self):
        self.state['fail'] = 'history'
        self.assert_stops_before_pull_or_restart()

    def test_custom_history_path_blocks_restart(self):
        self.state['history_path'] = '/custom/history.json'
        self.assert_stops_before_pull_or_restart()

    def test_nested_mount_overriding_history_blocks_restart(self):
        self.state['extra_mounts'] = [{'Type': 'bind', 'Destination': '/opt/app/data/chat/history.json', 'RW': True}]
        self.assert_stops_before_pull_or_restart()

    def test_shared_config_volume_blocks_restart(self):
        self.config['volumes']['chat-history-2']['name'] = 'production_chat-history'
        self.assert_stops_before_pull_or_restart()

    def test_missing_config_mount_blocks_restart(self):
        self.config['services']['gameserver']['volumes'] = []
        self.assert_stops_before_pull_or_restart()

    def test_read_only_config_mount_blocks_restart(self):
        self.config['services']['gameserver']['volumes'][0]['read_only'] = True
        self.assert_stops_before_pull_or_restart()

    def test_restart_failure_is_reported_without_reading_private_history(self):
        self.state['fail'] = 'restart'
        self.assertNotEqual(self.run_deploy().returncode, 0)

    def test_mount_loss_after_restart_is_reported(self):
        self.state['after_mounts'] = {'gameserver2': ''}
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertTrue(self.state['restarted'])


if __name__ == '__main__':
    unittest.main()
