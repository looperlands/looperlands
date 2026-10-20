#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {MANIFEST, createManifest, createBundle} = require('../server/js/hotreloadmanifest');
const root = path.resolve(__dirname, '..');
if (process.argv[2] === 'manifest') {
    const revision = process.argv[3];
    if (!/^[a-f0-9]{40}$/.test(revision || '')) throw new Error('Expected a full Git revision');
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(createManifest(root, revision)));
} else if (process.argv[2] === 'bundle') {
    process.stdout.write(JSON.stringify(createBundle(root)));
} else if (process.argv[2] === 'client-files') {
    const {once} = require('events');
    async function stream() {
        const before = JSON.parse(fs.readFileSync(0, 'utf8')).manifest?.client?.files || {};
        const next = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), 'utf8')).client;
        const directory = path.join(root, 'client-build');
        async function write(value) { if (!process.stdout.write(JSON.stringify(value) + '\n')) await once(process.stdout, 'drain'); }
        await write(next);
        for (const [file, hash] of Object.entries(next.files)) {
            if (before[file] === hash) continue;
            const data = fs.readFileSync(path.join(directory, file));
            if (require('../server/js/hotreloadmanifest').hash(data) !== hash) throw new Error('Client artifact differs from manifest');
            await write({file, hash, data: data.toString('base64')});
        }
    }
    stream().catch(error => { console.error(error.message); process.exitCode = 1; });
} else throw new Error('Usage: live-update-artifact.js manifest <revision> | bundle');
