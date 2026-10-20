#!/usr/bin/env node
// Runs inside the selected container. Credentials stay in its environment.
const fs = require('fs');

async function main() {
    const action = process.env.LIVE_UPDATE_ACTION || 'status';
    if (!['status', 'manifest', 'plan', 'prepare', 'apply', 'rollback', 'reboot-handoffs', 'cancel-reboot'].includes(action)) throw new Error('Invalid live-update action');
    const apiKey = process.env.LIVE_UPDATE_KEY || process.env.LOOPWORMS_API_KEY;
    if (!apiKey) throw new Error('No live-update API key configured');
    const appUrl = new URL(process.env.APP_URL);
    const port = appUrl.port || (appUrl.protocol === 'https:' ? 443 : 8000);
    const read = action === 'status' || action === 'manifest';
    const response = await fetch('http://127.0.0.1:' + port + '/_live-update' + (action === 'status' ? '' : '/' + action), {
        method: read ? 'GET' : 'POST',
        headers: {'Content-Type': 'application/json', 'x-api-key': apiKey},
        body: read ? undefined : fs.readFileSync(0, 'utf8'),
        signal: AbortSignal.timeout(30000),
    });
    let result;
    try { result = await response.json(); }
    catch (error) {
        if (response.status === 413) throw new Error('HMR payload exceeds the 8 MiB limit');
        throw new Error('HMR endpoint unavailable (HTTP ' + response.status + '); install HMR with a planned restart first');
    }
    if (!response.ok) {
        if (result.restartRequired) throw new Error('Planned restart required for: ' + result.files.join(', '));
        throw new Error('Live update rejected (HTTP ' + response.status + '): ' + (result.error || 'unknown response'));
    }
    if (result.protocol !== 1 || !/^[a-f0-9]{40}$/.test(result.revision || '') || !Number.isInteger(result.pid)) throw new Error('Invalid live-update response');
    process.stdout.write(JSON.stringify(result));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
