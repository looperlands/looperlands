const fs = require('fs');
const crypto = require('crypto');
const Config = require('../../client/js/ambientconfig');
const {safe} = require('./localtilebuilder');
const fail = message => {throw Object.assign(new Error(message), {status: 400});};
const MAX_BYTES = 44 + 22050 * 2 * 30;
function inspect(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 46 || bytes.length > MAX_BYTES ||
        bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.readUInt32LE(4) !== bytes.length - 8 ||
        bytes.toString('ascii', 8, 16) !== 'WAVEfmt ' || bytes.readUInt32LE(16) !== 16 ||
        bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== 22050 ||
        bytes.readUInt32LE(28) !== 44100 || bytes.readUInt16LE(32) !== 2 || bytes.readUInt16LE(34) !== 16 ||
        bytes.toString('ascii', 36, 40) !== 'data' || bytes.readUInt32LE(40) !== bytes.length - 44 || (bytes.length - 44) % 2) {
        fail('Upload a valid audio clip through the Toolbox (up to 30 seconds).');
    }
    const duration = (bytes.length - 44) / 44100;
    if (duration < .1) fail('Audio clips must be at least 0.1 seconds long.');
    return duration;
}
function folder(root) {return safe(root, 'client/audio/ambient');}
function read(root, filename) {
    if (!Config.uploadFile('upload:' + filename)) fail('Invalid sound file.');
    const file = safe(root, 'client/audio/ambient/' + filename);
    if (!fs.existsSync(file)) fail('Uploaded sound is missing: ' + filename);
    if (fs.statSync(file).size > MAX_BYTES) fail('Uploaded sound is too large.');
    const bytes = fs.readFileSync(file), duration = inspect(bytes);
    if (!filename.endsWith('--' + crypto.createHash('sha256').update(bytes).digest('hex') + '.wav')) fail('Uploaded sound content changed. Upload it again.');
    return {id: 'upload:' + filename, name: filename.split('--')[0].replace(/-/g, ' '), url: '/audio/ambient/' + filename, duration};
}
function catalog(root) {
    const dir = folder(root); if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(file => Config.uploadFile('upload:' + file));
    if (files.length > 100) fail('The sound library supports up to 100 uploaded clips.');
    return files.map(file => read(root, file)).sort((a, b) => a.name.localeCompare(b.name));
}
function validateReferences(root, entries) {
    for (const filename of new Set(entries.map(row => Config.uploadFile(row.preset)).filter(Boolean))) read(root, filename);
}
function upload(root, input) {
    if (!input || Object.keys(input).some(key => !['name', 'audio'].includes(key)) || typeof input.name !== 'string' || input.name.length > 160 ||
        typeof input.audio !== 'string' || input.audio.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.audio)) fail('Choose an audio file to upload.');
    const bytes = Buffer.from(input.audio, 'base64'); inspect(bytes);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const existing = catalog(root); const same = existing.find(row => row.id.endsWith('--' + hash + '.wav')); if (same) return same;
    if (existing.length >= 100) fail('The sound library is full (100 clips).');
    const name = input.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '') || 'sound';
    const filename = name + '--' + hash + '.wav';
    fs.mkdirSync(folder(root), {recursive: true});
    const file = safe(root, 'client/audio/ambient/' + filename);
    // Content-addressed assets cannot overwrite an existing clip or reference.
    try {fs.writeFileSync(file, bytes, {flag: 'wx'});} catch (error) {if (error.code !== 'EEXIST') throw error;}
    return read(root, filename);
}
function install(app, toolbox) {
    app.post('/local/api/ambient-assets', (req, res) => {
        try {
            if (toolbox.closed) throw Object.assign(new Error('The toolbox is shutting down.'), {status: 503});
            if (toolbox.job?.status === 'running') throw Object.assign(new Error('Wait for the build to finish before uploading sounds.'), {status: 409});
            res.json(upload(toolbox.root, req.body));
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {inspect, catalog, upload, validateReferences, install};
