global.Types = {};
const fs = require('fs'), os = require('os'), path = require('path');
const Assets = require('./localambientassets'), Config = require('../../client/js/ambientconfig');
let root;
function wav(seconds = 1) {
    const bytes = Buffer.alloc(44 + Math.round(44100 * seconds));
    bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(22050, 24); bytes.writeUInt32LE(44100, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40); return bytes;
}
beforeEach(() => {root = fs.mkdtempSync(path.join(os.tmpdir(), 'ambient-assets-'));});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
test('upload persists a portable clip, deduplicates content, and is available after reload', () => {
    const bytes = wav(), sound = Assets.upload(root, {name: '../../My Brook.MP3', audio: bytes.toString('base64')});
    expect(sound).toMatchObject({name: 'my brook', duration: 1});
    expect(sound.url).toMatch(/^\/audio\/ambient\/my-brook--[a-f0-9]{64}\.wav$/);
    expect(Assets.catalog(root)).toEqual([sound]);
    expect(Assets.upload(root, {name: 'renamed.wav', audio: bytes.toString('base64')})).toEqual(sound);
    const row = {id: 'a', name: 'Brook', preset: sound.id, x: 1, y: 1, radius: 8, volume: .5};
    expect(Config.validate([row], {customSounds: Assets.catalog(root)})).toEqual([row]);
    Assets.validateReferences(root, [row]);
    expect(() => Config.validate([row], {customSounds: []})).toThrow('missing');
    fs.unlinkSync(path.join(root, 'client', sound.url));
    expect(() => Assets.validateReferences(root, [row])).toThrow('missing');
});
test('malformed, oversized and unconverted audio cannot be saved', () => {
    for (const bytes of [Buffer.from('not audio'), wav(.05), wav(31), (() => {const b = wav(); b.writeUInt32LE(48000, 24); return b;})()]) {
        expect(() => Assets.upload(root, {name: 'bad.wav', audio: bytes.toString('base64')})).toThrow();
    }
    expect(() => Assets.upload(root, {name: 'a', audio: 'x', url: '../outside'})).toThrow();
    expect(Assets.catalog(root)).toEqual([]);
});
test('changed content and path traversal references are rejected', () => {
    const sound = Assets.upload(root, {name: 'clip.wav', audio: wav().toString('base64')});
    const target = path.join(root, 'client', sound.url), changed = fs.readFileSync(target); changed[50] = 1; fs.writeFileSync(target, changed);
    expect(() => Assets.catalog(root)).toThrow('content changed');
    expect(Config.uploadFile('upload:../../outside.wav')).toBeNull();
});
