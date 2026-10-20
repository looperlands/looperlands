#!/usr/bin/env python3
"""Exercise production deployment decisions and real storage checks without Docker."""
import base64
import contextlib
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest

SPEC = importlib.util.spec_from_file_location('deployment', Path(__file__).with_name('deploy-game-server.py'))
deployment = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(deployment)
OLD, NEW = 'a' * 40, 'b' * 40
IMAGE = 'balkshamster/looperlands:' + NEW


class Docker:
    def __init__(self, root):
        self.root = root
        self.host = root / 'host.yml'
        self.host.write_text('installed compose configuration')
        self.config = {'services': {'gameserver': {'volumes': [{'type': 'volume', 'source': 'chat', 'target': '/opt/app/data/chat'}],
            'environment': {'PRIVATE_TOKEN': 'never-log-me'}}}, 'volumes': {'chat': {'name': 'production_chat'}}}
        self.mounts = [{'Destination': '/opt/app/data/chat', 'Type': 'volume', 'Name': 'production_chat', 'RW': True}]
        self.calls, self.actions, self.delays = [], [], []
        self.containers = ['old']
        self.files = str(self.host)
        self.image = 'balkshamster/looperlands:latest'
        self.requester, self.automatic, self.client_reload, self.rollback_available = True, 1, True, True
        self.method, self.revision, self.pid = 'hmr', OLD, 1
        self.failure, self.after_mounts, self.storage_env, self.announce_env = None, None, {}, {}
        self.bundle = {'manifest': {'protocol': 1, 'revision': NEW, 'files': {}}, 'sources': {}}

    def run(self, args, input=None, stdin=None, stdout=None, stderr=None, check=False):
        self.calls.append(args)
        data = stdin.read() if stdin else input
        operation, value, code = '', b'', 0
        if args[:2] == ['docker', 'ps']:
            value = '\n'.join(self.containers).encode()
        elif args[:2] == ['docker', 'inspect']:
            template = args[3]
            if template == '{{.Config.Image}}': value = self.image.encode()
            elif template == '{{json .Config.Labels}}': value = json.dumps({'com.docker.compose.service': 'gameserver',
                'com.docker.compose.project': 'production', 'com.docker.compose.project.config_files': self.files}).encode()
            elif template == '{{json .Mounts}}': value = json.dumps(self.after_mounts if self.revision == NEW and self.after_mounts is not None else self.mounts).encode()
            else: raise AssertionError(args)
        elif args[:2] == ['docker', 'pull']:
            assert args[-1] == IMAGE
            operation = 'pull'
        elif args[:2] == ['docker', 'run']:
            assert '--network' in args and args[args.index('--network') + 1] == 'none'
            assert not any(item in args for item in ['-v', '--volume', '--mount'])
            assert args[args.index('--entrypoint') + 2] == IMAGE
            if args[-1] == 'bundle': operation, value = 'bundle', json.dumps(self.bundle).encode()
            elif args[-1] == 'client-files': operation, value = 'export-client', b'{"staged":"fixture"}\n'
            else: raise AssertionError(args)
        elif args[:2] == ['docker', 'exec']:
            if args[-1].endswith('live-update-request.js'):
                operation = next(item.split('=', 1)[1] for item in args if item.startswith('LIVE_UPDATE_ACTION='))
                body = json.loads(data) if data else None
                self.actions.append((operation, body))
                if operation == 'plan': result = self.status(method=self.method)
                elif operation == 'manifest': result = self.status(manifest={'client': {'files': {}}})
                elif operation in ('apply', 'rollback'):
                    self.revision = NEW if operation == 'apply' else 'c' * 40
                    if self.failure == 'pid': self.pid = 2
                    if self.failure == 'wrong-revision': self.revision = OLD
                    result = self.status()
                else: result = self.status()
                value = json.dumps(result).encode()
                if operation == 'status' and self.revision == NEW and self.failure == 'readback': code = 1
            elif args[-1].endswith('stage-client-update.js'): operation = 'stage-client'
            elif '-e' in args:
                script = args[args.index('-e') + 1]
                if 'requester:' in script:
                    value = json.dumps({'requester': self.requester}).encode()
                elif 'fs.accessSync' in script:
                    # Execute production path/mount checks, replacing only access to the history file.
                    prefix = "require('fs').accessSync=()=>{if(process.env.DENY_STORAGE==='1')throw Error('denied');};\n"
                    environment = dict(os.environ, CHAT_HISTORY_FILE='/opt/app/data/chat/history.json', CLIENT_RELOAD_SPOOL_PATH='')
                    environment.update(self.storage_env)
                    result = subprocess.run(['node', '-e', prefix + script, args[-1]], input=data, capture_output=True, env=environment)
                    code, value = result.returncode, result.stdout
                else:
                    operation = 'announce'
                    environment = dict(os.environ, APP_URL='https://example.invalid', LOOPWORMS_API_KEY='fixture-secret')
                    for index, argument in enumerate(args):
                        if argument == '--env':
                            key, content = args[index + 1].split('=', 1)
                            environment[key] = content
                    environment.update(self.announce_env)
                    prefix = "global.fetch=async(url,options)=>{process.stdout.write(JSON.stringify({url,options}));return {ok:true,json:async()=>({success:true})};};\n"
                    result = subprocess.run(['node', '-e', prefix + script], capture_output=True, env=environment)
                    code, value = result.returncode, result.stdout
                    if not code: self.announcement = json.loads(value)
            else: raise AssertionError(args)
        elif args[:2] == ['docker', 'compose']:
            if 'config' in args: value = json.dumps(self.config).encode()
            elif 'up' in args:
                operation = 'recreate'
                assert args[-1] == 'gameserver'
                assert '--no-deps' in args and '--force-recreate' in args
                assert args[args.index('--pull') + 1] == 'never'
                self.revision = NEW
                self.files = str(self.host) + ',' + str(self.root / 'state/release-gameserver.json')
            elif 'ps' in args: value = b'new'
            else: raise AssertionError(args)
        else: raise AssertionError(args)
        if self.failure == operation: code = 1
        if hasattr(stdout, 'write'): stdout.write(value); value = None
        return SimpleNamespace(returncode=code, stdout=value, stderr=b'never-log-me')

    def status(self, **extra):
        return dict(protocol=1, revision=self.revision, pid=self.pid, ready=True, automaticDeployment=self.automatic,
            clientReload=self.client_reload, rollbackAvailable=self.rollback_available, **extra)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='looperlands-deploy-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.docker = Docker(self.root)
        self.environment = {'LIVE_UPDATE_IMAGE': IMAGE, 'REBOOT_NOTICE_SECONDS': '1'}
        self.output = io.StringIO()

    def execute(self):
        engine = deployment.Deployer(self.environment, self.docker.run, self.docker.delays.append, self.root / 'state')
        with contextlib.redirect_stdout(self.output): return engine.deploy()

    def stopped(self, phase):
        self.assertFalse(any(action == phase for action, _ in self.docker.actions))

    def test_auto_hmr_preserves_process_and_host_config_without_recreating(self):
        backup = self.root / 'host.previous.yml'
        backup.write_text('private backup')
        self.assertEqual(self.execute(), 'hmr')
        self.assertEqual([name for name, _ in self.docker.actions], ['status', 'plan', 'manifest', 'prepare', 'apply', 'status'])
        self.assertEqual(self.docker.delays, [])
        self.assertFalse(any('up' in call for call in self.docker.calls))
        self.assertEqual(json.loads((self.root / 'state/release-gameserver.json').read_text()), {'services': {'gameserver': {'image': IMAGE}}})
        self.assertEqual(self.docker.host.read_text(), 'installed compose configuration')
        self.assertEqual(backup.read_text(), 'private backup')
        self.assertNotIn('never-log-me', self.output.getvalue())
        self.assertFalse(any(call[:2] in [['docker', 'system'], ['docker', 'image']] for call in self.docker.calls))

    def test_auto_reboot_announces_then_hands_off_and_recreates_only_the_selected_service(self):
        self.docker.method = 'reboot'
        self.assertEqual(self.execute(), 'reboot')
        self.assertEqual(self.docker.delays, [1])
        self.stopped('apply')
        self.assertIn(('reboot-handoffs', {'expectedRevision': OLD, 'revision': NEW}), self.docker.actions)
        calls = self.docker.calls
        announcement = next(i for i, call in enumerate(calls) if deployment.ANNOUNCE in call)
        handoff = next(i for i, call in enumerate(calls) if 'LIVE_UPDATE_ACTION=reboot-handoffs' in call)
        recreate = next(i for i, call in enumerate(calls) if 'up' in call)
        pull = next(i for i, call in enumerate(calls) if call[:2] == ['docker', 'pull'])
        self.assertLess(pull, announcement); self.assertLess(announcement, handoff); self.assertLess(handoff, recreate)
        self.assertIn('Reconnecting automatically', json.loads(self.docker.announcement['options']['body'])['message'])

    def test_initial_install_reboots_and_gives_older_clients_an_accurate_notice(self):
        self.docker.requester = False
        self.assertEqual(self.execute(), 'reboot')
        self.stopped('reboot-handoffs'); self.stopped('plan')
        self.assertIn('Please reconnect', json.loads(self.docker.announcement['options']['body'])['message'])

    def test_forced_hmr_rejects_incompatible_changes(self):
        self.environment['DEPLOY_MODE'] = 'hmr'; self.docker.method = 'reboot'
        with self.assertRaisesRegex(deployment.DeploymentError, 'requires a reboot'): self.execute()
        self.assertEqual(self.docker.delays, [])
        self.assertFalse(any('up' in call for call in self.docker.calls))

    def test_hmr_unavailable_aborts_before_pulling(self):
        self.environment['DEPLOY_MODE'] = 'hmr'; self.docker.requester = False
        with self.assertRaisesRegex(deployment.DeploymentError, 'HMR is unavailable'): self.execute()
        self.assertFalse(any(call[:2] == ['docker', 'pull'] for call in self.docker.calls))

    def test_forced_reboot_is_announced_even_for_a_compatible_release(self):
        self.environment['DEPLOY_MODE'] = 'reboot'
        self.assertEqual(self.execute(), 'reboot')
        self.assertEqual(self.docker.delays, [1])

    def test_errors_never_fall_back_to_reboot(self):
        for phase in ['status', 'plan', 'pull', 'bundle', 'manifest', 'export-client', 'stage-client', 'prepare', 'apply']:
            with self.subTest(phase=phase):
                self.docker = Docker(self.root); self.docker.failure = phase
                with self.assertRaises(deployment.DeploymentError): self.execute()
                self.assertEqual(self.docker.delays, [])
                self.assertFalse(any('up' in call or deployment.ANNOUNCE in call for call in self.docker.calls))

    def test_hmr_readback_rejects_process_changes(self):
        self.docker.failure = 'pid'
        with self.assertRaisesRegex(deployment.DeploymentError, 'process changed'): self.execute()

    def test_hmr_readback_rejects_wrong_revision(self):
        self.docker.failure = 'wrong-revision'
        with self.assertRaisesRegex(deployment.DeploymentError, 'did not become ready'): self.execute()

    def test_mismatched_image_revision_stops_before_any_announcement(self):
        self.docker.bundle['manifest']['revision'] = OLD
        with self.assertRaisesRegex(deployment.DeploymentError, 'immutable'): self.execute()
        self.assertEqual(self.docker.delays, [])

    def test_ambiguous_or_missing_online_server_aborts(self):
        for containers in [[], ['one', 'two']]:
            self.docker.containers = containers
            with self.assertRaisesRegex(deployment.DeploymentError, 'one running'): self.execute()
        self.stopped('apply')

    def test_unrelated_container_image_is_rejected(self):
        self.docker.image = 'unrelated/image:latest'
        with self.assertRaisesRegex(deployment.DeploymentError, 'one running'): self.execute()

    def test_explicit_service_selection_is_used_for_discovery(self):
        self.environment['LIVE_UPDATE_SERVICE'] = 'gameserver'
        self.execute()
        self.assertEqual(self.docker.calls[0], ['docker', 'ps', '-q', '--filter', 'label=com.docker.compose.service=gameserver'])

    def test_other_compose_files_are_rejected(self):
        self.docker.files += ',' + str(self.docker.host)
        with self.assertRaisesRegex(deployment.DeploymentError, 'Compose file'): self.execute()

    def test_repeated_deployment_accepts_its_own_release_override(self):
        self.docker.method = 'reboot'; self.execute()
        self.docker.method = 'hmr'
        self.assertEqual(self.execute(), 'hmr')
        config_calls = [call for call in self.docker.calls if 'config' in call]
        self.assertEqual(config_calls[-1].count('-f'), 2)

    def test_no_persistent_chat_mount_or_a_shared_writer_aborts(self):
        for change in ['absent', 'bind', 'read-only', 'shared']:
            with self.subTest(change=change):
                self.docker = Docker(self.root)
                mount = self.docker.config['services']['gameserver']['volumes'][0]
                if change == 'absent': self.docker.config['services']['gameserver']['volumes'] = []
                elif change == 'bind': mount['type'] = 'bind'
                elif change == 'read-only': mount['read_only'] = True
                else: self.docker.config['services']['other'] = copy.deepcopy(self.docker.config['services']['gameserver'])
                with self.assertRaises(deployment.DeploymentError): self.execute()
                self.stopped('apply')

    def test_real_container_mount_guard_rejects_nested_mounts_wrong_names_and_access(self):
        original = copy.deepcopy(self.docker.mounts)
        variations = [[], [dict(original[0], RW=False)], [dict(original[0], Name='unrelated')],
            [dict(original[0], Type='bind')], original + [{'Destination': '/opt/app/data/chat/history.json', 'Type': 'tmpfs', 'RW': True}]]
        for mounts in variations:
            self.docker.mounts = mounts
            with self.assertRaises(deployment.DeploymentError): self.execute()
        self.docker.mounts = original; self.docker.storage_env = {'DENY_STORAGE': '1'}
        with self.assertRaises(deployment.DeploymentError): self.execute()

    def test_custom_history_path_aborts(self):
        self.docker.storage_env = {'CHAT_HISTORY_FILE': '/tmp/history.json'}
        with self.assertRaises(deployment.DeploymentError): self.execute()

    def test_reload_spool_must_also_be_on_the_private_chat_volume(self):
        self.docker.storage_env = {'CLIENT_RELOAD_SPOOL_PATH': '/tmp/client-reloads.json'}
        with self.assertRaises(deployment.DeploymentError): self.execute()
        self.stopped('apply')

    def test_failed_handoff_cancels_and_does_not_recreate(self):
        self.docker.method = 'reboot'; self.docker.failure = 'reboot-handoffs'
        with self.assertRaises(deployment.DeploymentError): self.execute()
        self.assertIn(('cancel-reboot', {'expectedRevision': OLD}), self.docker.actions)
        self.assertFalse(any('up' in call for call in self.docker.calls))

    def test_failed_recreation_restores_desired_image_and_cancels_handoffs(self):
        override = self.root / 'state/release-gameserver.json'
        override.parent.mkdir(); override.write_text('{"previous":true}')
        self.docker.method = 'reboot'; self.docker.failure = 'recreate'
        with self.assertRaises(deployment.DeploymentError): self.execute()
        self.assertEqual(json.loads(override.read_text()), {'previous': True})
        self.assertIn(('cancel-reboot', {'expectedRevision': OLD}), self.docker.actions)

    def test_readback_requires_persistent_storage_after_recreation(self):
        self.docker.method = 'reboot'; self.docker.after_mounts = []
        with self.assertRaises(deployment.DeploymentError): self.execute()

    def test_announcement_failure_does_not_handoff_or_recreate(self):
        self.docker.method = 'reboot'; self.docker.failure = 'announce'
        with self.assertRaises(deployment.DeploymentError): self.execute()
        self.stopped('reboot-handoffs')
        self.assertEqual(self.docker.delays, [])

    def test_missing_announcement_key_aborts(self):
        self.docker.method = 'reboot'; self.docker.announce_env = {'LOOPWORMS_API_KEY': ''}
        with self.assertRaises(deployment.DeploymentError): self.execute()
        self.stopped('reboot-handoffs')
        self.assertEqual(self.docker.delays, [])

    def test_announcement_escapes_operator_text_and_uses_custom_http_port(self):
        self.docker.method = 'reboot'
        self.docker.announce_env = {'APP_URL': 'https://example.invalid:9123'}
        self.environment['REBOOT_NOTICE_SECONDS'] = '90'
        self.environment['REBOOT_REASON_BASE64'] = base64.b64encode(b'<b>fix & tune</b>').decode()
        self.execute()
        self.assertEqual(self.docker.announcement['url'], 'http://127.0.0.1:9123/announce')
        self.assertEqual(self.docker.delays, [90])
        self.assertIn('&lt;b&gt;fix &amp; tune&lt;/b&gt;', json.loads(self.docker.announcement['options']['body'])['message'])

    def test_reboot_notice_and_modes_are_validated(self):
        for seconds in ['0', '601', '-1', '1; touch no', '']:
            self.environment.update(DEPLOY_MODE='reboot', REBOOT_NOTICE_SECONDS=seconds)
            with self.assertRaises(deployment.DeploymentError): self.execute()
        for mode in ['rolling', ';reboot']:
            self.environment['DEPLOY_MODE'] = mode
            with self.assertRaises(deployment.DeploymentError): self.execute()

    def test_immutable_release_tag_is_mandatory(self):
        for image in ['balkshamster/looperlands:latest', 'other/image:' + NEW, 'balkshamster/looperlands:abcd']:
            self.environment['LIVE_UPDATE_IMAGE'] = image
            with self.assertRaises(deployment.DeploymentError): self.execute()
        self.assertEqual(self.docker.calls, [])

    def test_rollback_keeps_pid_and_pins_restored_release_without_downloading(self):
        self.environment = {'LIVE_UPDATE_ACTION': 'rollback'}
        self.assertEqual(self.execute(), 'rollback')
        self.assertEqual([name for name, _ in self.docker.actions], ['status', 'rollback', 'status'])
        self.assertEqual(json.loads((self.root / 'state/release-gameserver.json').read_text())['services']['gameserver']['image'], 'balkshamster/looperlands:' + 'c' * 40)
        self.assertFalse(any(call[:2] in [['docker', 'run'], ['docker', 'pull']] for call in self.docker.calls))

    def test_unavailable_rollback_does_not_mutate(self):
        self.environment = {'LIVE_UPDATE_ACTION': 'rollback'}; self.docker.rollback_available = False
        with self.assertRaisesRegex(deployment.DeploymentError, 'No HMR rollback'): self.execute()
        self.stopped('rollback')

    def test_concurrent_deployment_is_rejected_before_touching_docker(self):
        directory = self.root / 'state'; directory.mkdir()
        with (directory / 'deploy.lock').open('a') as lock:
            deployment.fcntl.flock(lock, deployment.fcntl.LOCK_EX)
            with self.assertRaisesRegex(deployment.DeploymentError, 'Another game deployment'): self.execute()
        self.assertEqual(self.docker.calls, [])


if __name__ == '__main__': unittest.main()
