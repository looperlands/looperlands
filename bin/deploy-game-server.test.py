#!/usr/bin/env python3
"""Exercise routine deploy guards with isolated Docker/systemd fakes."""
import base64
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
    elif a[0] == 'exec' and a[1] == '-i':
        arguments = a[2:]
        environment = dict(os.environ)
        while arguments[0] == '--env':
            key, value = arguments[1].split('=', 1)
            environment[key] = value
            arguments = arguments[2:]
        container = arguments[0]
        environment['APP_URL'] = state.get('app_url', 'https://game.example.com')
        environment['LOOPWORMS_API_KEY'] = '' if state.get('fail') == 'missing-api-key' else 'fixture-key-' + container
        code = sys.stdin.read()
        rejected = state.get('fail') == 'announcement' and container == 'old1'
        timed_out = state.get('fail') == 'timeout' and container == 'old1'
        bad_response = state.get('fail') == 'bad-response'
        environment['TEST_REJECT'] = 'true' if rejected else ''
        environment['TEST_TIMEOUT'] = 'true' if timed_out else ''
        environment['TEST_BAD_RESPONSE'] = 'true' if bad_response else ''
        stub = r"""
        global.fetch = async (url, options) => {
            if (options.headers['x-api-key'] !== process.env.LOOPWORMS_API_KEY) throw Error('Wrong container API key');
            console.log(JSON.stringify({url, body: JSON.parse(options.body)}));
            if (process.env.TEST_TIMEOUT) throw Error('Announcement timed out');
            const rejected = !!process.env.TEST_REJECT;
            return {ok: !rejected, status: rejected ? 401 : 200,
                json: async () => ({success: !process.env.TEST_BAD_RESPONSE})};
        };
        """
        result = subprocess.run(['node'], input=stub + code, env=environment, capture_output=True, text=True)
        for line in result.stdout.splitlines():
            record = json.loads(line)
            record['container'] = container
            state.setdefault('announcements', []).append(record)
        if result.returncode:
            print(result.stderr, file=sys.stderr)
            finish(result.returncode)
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
        self.environment = {}
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
        result = subprocess.run(['bash', str(self.root / 'deploy-game-server.sh')], env={**os.environ, 'DEPLOY_FIXTURE': str(self.root), 'PATH': str(self.root) + ':' + os.environ['PATH'], **self.environment}, capture_output=True, text=True)
        self.state = json.loads((self.root / 'state.json').read_text())
        self.assertNotIn('private-fixture-do-not-log', result.stdout + result.stderr)
        self.assertNotIn('never-log-me', result.stdout + result.stderr)
        self.assertNotIn('fixture-key-', result.stdout + result.stderr)
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


    def test_announces_after_pull_and_waits_before_restart(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        notices = self.state['announcements']
        self.assertEqual([notice['container'] for notice in notices], ['old1', 'old2'])
        self.assertEqual(notices[0]['url'], 'http://127.0.0.1:443/announce')
        self.assertEqual(notices[0]['body'], {
            'message': 'The game servers will restart in 60 seconds. We are deploying a game update. Please reconnect after the restart.',
            'timeToShow': 60,
        })
        calls = self.state['calls']
        pull = next(i for i, call in enumerate(calls) if 'pull' in call)
        announcements = [i for i, call in enumerate(calls) if call[:3] == ['docker', 'exec', '-i']]
        wait = next(i for i, call in enumerate(calls) if call == ['sleep', '60'])
        restart = next(i for i, call in enumerate(calls) if call[0] == 'sudo')
        self.assertLess(pull, min(announcements))
        self.assertLess(max(announcements), wait)
        self.assertLess(wait, restart)

    def test_custom_reason_is_plain_text_and_uses_custom_port_and_countdown(self):
        reason = 'Fix "chat" & <script>alert(1)</script>\n$(echo unsafe) 😀'
        self.environment = {'REBOOT_REASON_BASE64': base64.b64encode(reason.encode()).decode(), 'REBOOT_NOTICE_SECONDS': '120'}
        self.state['app_url'] = 'http://localhost:8123'
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        notice = self.state['announcements'][0]
        self.assertEqual(notice['url'], 'http://127.0.0.1:8123/announce')
        self.assertEqual(notice['body'], {
            'message': 'The game servers will restart in 120 seconds. Fix &quot;chat&quot; &amp; &lt;script&gt;alert(1)&lt;/script&gt;\n$(echo unsafe) 😀 Please reconnect after the restart.',
            'timeToShow': 120,
        })
        self.assertIn(['sleep', '120'], self.state['calls'])

    def test_invalid_durations_stop_before_pull_or_restart(self):
        for seconds in ('0', '-1', '601', '08', '0001000', '18446744073709551676', '1.5', '60; echo unsafe'):
            with self.subTest(seconds=seconds):
                self.environment['REBOOT_NOTICE_SECONDS'] = seconds
                self.state = {'calls': [], 'restarted': False}
                self.assert_stops_before_pull_or_restart()

    def test_failed_announcements_notify_other_instances_and_abort_restart(self):
        for failure in ('announcement', 'timeout', 'bad-response'):
            with self.subTest(failure=failure):
                self.state = {'calls': [], 'restarted': False, 'fail': failure}
                result = self.run_deploy()
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.state['restarted'])
                self.assertEqual([notice['container'] for notice in self.state['announcements']], ['old1', 'old2'])
                self.assertNotIn(['sleep', '60'], self.state['calls'])

    def test_missing_api_key_aborts_restart(self):
        self.state['fail'] = 'missing-api-key'
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.state['restarted'])
        self.assertNotIn('announcements', self.state)


if __name__ == '__main__':
    unittest.main()
