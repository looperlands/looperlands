#!/usr/bin/env python3
"""Select HMR or an announced reboot independently for verified game services."""
import base64
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time


class DeploymentError(RuntimeError):
    pass


class Deployer:
    def __init__(self, environment=None, run=None, sleep=time.sleep, state_dir=None):
        self.env = dict(os.environ if environment is None else environment)
        self.run_process = run or subprocess.run
        self.sleep = sleep
        self.state_dir = Path(state_dir) if state_dir else Path(self.env['HOME']) / '.looperlands-chat'
        self.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.image = self.env.get('LIVE_UPDATE_IMAGE', '')
        self.built_at = None
        self.mode = self.env.get('DEPLOY_MODE', 'auto')
        self.action = self.env.get('LIVE_UPDATE_ACTION', 'apply')
        if self.mode not in ('auto', 'hmr', 'reboot') or self.action not in ('apply', 'rollback'):
            raise DeploymentError('Invalid deployment mode or action')
        if self.action == 'apply' and not re.fullmatch(r'balkshamster/looperlands:[a-f0-9]{40}', self.image):
            raise DeploymentError('Deployments require an immutable game image tagged with a full Git SHA')

    def command(self, args, data=None, output=None):
        source = data.open('rb') if isinstance(data, Path) else None
        target = output.open('wb') if output else subprocess.PIPE
        try:
            result = self.run_process(args, input=None if source else data, stdin=source,
                stdout=target, stderr=subprocess.PIPE, check=False)
        finally:
            if source:
                source.close()
            if output:
                target.close()
        if result.returncode:
            # Command bodies, configuration and credential-bearing responses stay private.
            raise DeploymentError('Command failed: ' + ' '.join(args[:2]))
        return result.stdout or b''

    def json(self, args, data=None):
        try:
            return json.loads(self.command(args, data))
        except (ValueError, TypeError) as error:
            raise DeploymentError('Invalid deployment response') from error

    def inspect(self, template, container=None):
        return self.command(['docker', 'inspect', '--format', template, container or self.container]).decode().strip()

    def discover(self):
        service = self.env.get('LIVE_UPDATE_SERVICE', '')
        if service and not re.fullmatch(r'[a-zA-Z0-9_-]+', service):
            raise DeploymentError('Invalid Compose service name')
        args = ['docker', 'ps', '-q']
        if service:
            args += ['--filter', 'label=com.docker.compose.service=' + service]
        found = []
        for container in self.command(args).decode().split():
            image = self.inspect('{{.Config.Image}}', container)
            if re.fullmatch(r'balkshamster/looperlands(?::[^\s]+|@[^\s]+)?', image):
                found.append(container)
        if len(found) != 1:
            raise DeploymentError('Expected one running game server; select LIVE_UPDATE_SERVICE when multiple servers exist')
        self.container = found[0]
        labels = json.loads(self.inspect('{{json .Config.Labels}}'))
        self.service = labels.get('com.docker.compose.service')
        self.project = labels.get('com.docker.compose.project')
        if not self.service or not re.fullmatch(r'[a-zA-Z0-9_-]+', self.service) or not self.project:
            raise DeploymentError('Expected an installed game Compose service')
        self.override = self.state_dir / ('release-' + self.service + '.json')
        files = labels.get('com.docker.compose.project.config_files', '').split(',')
        if len(files) > 2 or len(files) == 2 and Path(files[1]) != self.override or any(not Path(filename).is_file() for filename in files):
            raise DeploymentError('Expected the installed game Compose file and optional managed release override')
        self.compose_file = files[0]
        self.compose_args = ['docker', 'compose', '--project-directory', str(Path(self.compose_file).parent),
            '-p', self.project, '-f', self.compose_file]
        if len(files) == 2:
            self.compose_args += ['-f', str(self.override)]
        config = self.json(self.compose_args + ['config', '--format', 'json'])
        mounts = [mount for mount in config['services'][self.service].get('volumes', []) if mount['target'] == '/opt/app/data/chat']
        if len(mounts) != 1 or mounts[0]['type'] != 'volume' or mounts[0].get('read_only'):
            raise DeploymentError('Selected game service must preserve writable named chat storage')
        self.volume = config['volumes'][mounts[0]['source']]['name']
        for name, definition in config['services'].items():
            if name == self.service:
                continue
            for mount in definition.get('volumes', []):
                if mount.get('type') == 'volume' and config['volumes'][mount['source']]['name'] == self.volume:
                    raise DeploymentError('Game services must not share the chat writer volume')
        self.storage()

    def storage(self):
        mounts = self.inspect('{{json .Mounts}}')
        script = '''
const fs=require('fs'),path=require('path');
const mounts=JSON.parse(fs.readFileSync(0,'utf8'));
const history=path.resolve(process.env.CHAT_HISTORY_FILE||'/opt/app/data/chat/history.json');
if(history!=='/opt/app/data/chat/history.json')process.exit(2);
const spool=path.resolve(process.env.CLIENT_RELOAD_SPOOL_PATH||path.join(path.dirname(history),'client-reloads.json'));
for(const filename of [history,spool]){
 const mount=mounts.filter(m=>filename===m.Destination||filename.startsWith(m.Destination.replace(/\\/$/,'')+'/'))
  .sort((a,b)=>b.Destination.length-a.Destination.length)[0];
 if(!mount||mount.Type!=='volume'||mount.Name!==process.argv[1]||mount.RW!==true)process.exit(2);
 fs.accessSync(filename===history?history:path.dirname(spool),fs.constants.R_OK|fs.constants.W_OK);
}
'''
        self.command(['docker', 'exec', '-i', self.container, 'node', '-e', script, self.volume], mounts.encode())

    def request(self, action, body=None):
        result = self.json(['docker', 'exec', '-i', '--env', 'LIVE_UPDATE_ACTION=' + action,
            self.container, 'node', '/opt/app/bin/live-update-request.js'],
            None if body is None else json.dumps(body).encode())
        if result.get('protocol') != 1 or not re.fullmatch('[a-f0-9]{40}', result.get('revision', '')) or type(result.get('pid')) is not int:
            raise DeploymentError('Invalid running game-server status')
        return result

    def probe(self):
        script = "process.stdout.write(JSON.stringify({requester:require('fs').existsSync('/opt/app/bin/live-update-request.js')}));"
        probe = self.json(['docker', 'exec', self.container, 'node', '-e', script])
        if probe.get('requester') is not True:
            return None
        # If a hook exists but its HTTP request fails, abort; do not infer reboot.
        return self.request('status')

    def pull(self):
        self.command(['docker', 'pull', self.image])
        bundle = self.json(['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'node', self.image,
            '/opt/app/bin/live-update-artifact.js', 'bundle'])
        if bundle.get('manifest', {}).get('revision') != self.image.rsplit(':', 1)[1]:
            raise DeploymentError('Image contents do not match the immutable release tag')
        self.built_at = self.build_date(self.image)
        bundle['manifest']['builtAt'] = self.built_at
        print('Image build date: ' + self.built_at, flush=True)
        return bundle

    def build_date(self, image):
        try:
            # Docker emits nanoseconds; older host Python versions accept fewer digits.
            timestamp = re.sub(r'(\d{2}:\d{2}:\d{2})\.\d+', r'\1', self.inspect('{{.Created}}', image))
            created = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if created.tzinfo is None:
                raise ValueError('Missing image build timezone')
            return created.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
        except ValueError as error:
            raise DeploymentError('Invalid image build date') from error

    def release_definition(self, image):
        built_at = self.built_at if image == self.image else self.build_date(image)
        return {'services': {self.service: {'image': image, 'environment': {'GAME_BUILD_DATE': built_at}}}}

    def stage_client(self, before, work):
        data = json.dumps(before).encode()
        stream = Path(work) / 'client.ndjson'
        self.command(['docker', 'run', '--rm', '-i', '--network', 'none', '--entrypoint', 'node', self.image,
            '/opt/app/bin/live-update-artifact.js', 'client-files'], data, output=stream)
        self.command(['docker', 'exec', '-i', self.container, 'node', '/opt/app/bin/stage-client-update.js'], stream)

    def readback(self, revision, previous_pid=None):
        for attempt in range(60):
            try:
                result = self.request('status')
                if result['revision'] == revision and result.get('ready', True):
                    if previous_pid is not None and result['pid'] != previous_pid:
                        raise DeploymentError('Game process changed during HMR')
                    return result
            except DeploymentError:
                if previous_pid is not None:
                    raise
            self.sleep(1)
        raise DeploymentError('Game release did not become ready')

    def reboot(self, bundle, before, work):
        seconds = self.env.get('REBOOT_NOTICE_SECONDS', '60')
        if not re.fullmatch(r'[1-9][0-9]{0,2}', seconds) or int(seconds) > 600:
            raise DeploymentError('Reboot notice must be between 1 and 600 seconds')
        revision = bundle['manifest']['revision']
        # Save a durable desired image for future recreation; never replace host Compose.
        override = self.override
        desired = self.release_definition(self.image)
        temporary = override.with_suffix('.tmp')
        temporary.write_text(json.dumps(desired)); temporary.chmod(0o600)
        previous = override.read_bytes() if override.exists() else None
        self.command(['docker', 'exec', '-i', '--env', 'REBOOT_NOTICE_SECONDS=' + seconds,
            '--env', 'CLIENT_RECONNECT_AVAILABLE=' + ('1' if before and before.get('clientReload') else '0'),
            '--env', 'REBOOT_REASON_BASE64=' + self.env.get('REBOOT_REASON_BASE64', base64.b64encode(b'We are deploying a game update.').decode()),
            self.container, 'node', '-e', ANNOUNCE])
        print('Reboot required. Waiting ' + seconds + ' seconds after the player announcement.', flush=True)
        self.sleep(int(seconds))
        handoffs = False
        old_container = self.container
        try:
            if before and before.get('clientReload'):
                handoffs = True
                self.request('reboot-handoffs', {'expectedRevision': before['revision'], 'revision': revision})
            temporary.replace(override)
            compose = self.compose_args if str(override) in self.compose_args else self.compose_args + ['-f', str(override)]
            self.command(compose + ['up', '--detach', '--no-deps', '--pull', 'never', '--force-recreate', self.service])
            self.container = self.command(compose + ['ps', '-q', self.service]).decode().strip()
            if not self.container or '\n' in self.container:
                raise DeploymentError('Selected game service did not return')
            self.storage()
            self.readback(revision)
        except Exception:
            if previous is None:
                override.unlink(missing_ok=True)
            else:
                override.write_bytes(previous)
            if handoffs:
                self.container = old_container
                try: self.request('cancel-reboot', {'expectedRevision': before['revision']})
                except DeploymentError: pass
            raise
        finally:
            temporary.unlink(missing_ok=True)

    def deploy(self):
        with (self.state_dir / 'deploy.lock').open('a') as lock:
            try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error: raise DeploymentError('Another game deployment is running') from error
            services = self.env.get('LIVE_UPDATE_SERVICES', '')
            if services:
                if self.env.get('LIVE_UPDATE_SERVICE'):
                    raise DeploymentError('Select LIVE_UPDATE_SERVICE or LIVE_UPDATE_SERVICES, not both')
                names = services.split()
                if not names or len(names) != len(set(names)) or any(not re.fullmatch(r'[a-zA-Z0-9_-]+', name) for name in names):
                    raise DeploymentError('LIVE_UPDATE_SERVICES must contain distinct Compose service names separated by spaces')
                selected = [Deployer(dict(self.env, LIVE_UPDATE_SERVICE=name, LIVE_UPDATE_SERVICES=''),
                    self.run_process, self.sleep, self.state_dir) for name in names]
                # Validate every target and its private storage before changing any server.
                for engine in selected:
                    engine.discover()
                results = {}
                for engine in selected:
                    print('Deploying Compose service ' + engine.service + '.', flush=True)
                    results[engine.service] = engine.deploy_selected()
                return results
            self.discover()
            return self.deploy_selected()

    def deploy_selected(self):
        before = self.probe()
        if self.action == 'rollback':
            if not before or not before.get('rollbackAvailable'):
                raise DeploymentError('No HMR rollback is available')
            result = self.request('rollback', {'expectedRevision': before['revision']})
            self.readback(result['revision'], before['pid'])
            self.save_desired_image('balkshamster/looperlands:' + result['revision'])
            return 'rollback'
        if self.mode == 'hmr' and (not before or before.get('automaticDeployment') != 1):
            raise DeploymentError('HMR is unavailable; install live updates with an announced reboot first')
        bundle = self.pull()
        revision = bundle['manifest']['revision']
        if before and before.get('automaticDeployment') == 1:
            plan = self.request('plan', {'expectedRevision': before['revision'], 'bundle': bundle})
            if plan.get('method') not in ('hmr', 'reboot'):
                raise DeploymentError('Invalid deployment plan')
        else:
            plan = {'method': 'reboot', 'files': ['initial live-update installation']}
        method = 'reboot' if self.mode == 'reboot' else plan['method']
        if method == 'reboot' and self.mode == 'hmr':
            raise DeploymentError('This release requires a reboot')
        print('Selected deployment method: ' + method + '.', flush=True)
        with tempfile.TemporaryDirectory(prefix='looperlands-deploy-') as work:
            if method == 'reboot': self.reboot(bundle, before, work)
            else:
                manifest = self.request('manifest')
                if manifest['revision'] != before['revision']:
                    raise DeploymentError('Running release changed during deployment')
                self.stage_client(manifest, work)
                request = {'expectedRevision': before['revision'], 'bundle': bundle}
                self.request('prepare', request)
                if revision != before['revision']:
                    self.request('apply', request)
                self.readback(revision, before['pid'])
                print('Verified HMR in the same game-server process.', flush=True)
                self.save_desired_image(self.image)
        print('Verified release ' + revision + ' for ' + self.service + '.', flush=True)
        return method

    def save_desired_image(self, image):
        temporary = self.override.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.release_definition(image)))
        temporary.chmod(0o600)
        temporary.replace(self.override)


ANNOUNCE = r'''
async function main(){
 const apiKey=process.env.LOOPWORMS_API_KEY;if(!apiKey)throw Error('Announcement key missing');
 const url=new URL(process.env.APP_URL),port=url.port||(url.protocol==='https:'?443:8000);
 const seconds=Number(process.env.REBOOT_NOTICE_SECONDS);
 const reason=Buffer.from(process.env.REBOOT_REASON_BASE64,'base64').toString('utf8')
  .replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const reconnect=process.env.CLIENT_RECONNECT_AVAILABLE==='1'?'Reconnecting automatically after the update.':'Please reconnect after the update.';
 const response=await fetch('http://127.0.0.1:'+port+'/announce',{method:'POST',
  headers:{'Content-Type':'application/json','x-api-key':apiKey},
  body:JSON.stringify({message:`The game server will restart in ${seconds} seconds. ${reason} ${reconnect}`,timeToShow:seconds}),
  signal:AbortSignal.timeout(10000)});
 if(!response.ok||(await response.json()).success!==true)throw Error('Announcement was not accepted');
}main().catch(error=>{console.error(error.message);process.exitCode=1;});
'''


if __name__ == '__main__':
    try: Deployer().deploy()
    except (DeploymentError, KeyError, ValueError, OSError) as error:
        print('Deployment aborted: ' + str(error), file=sys.stderr)
        sys.exit(1)
