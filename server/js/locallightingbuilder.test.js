const fs = require('fs'), os = require('os'), path = require('path');
const {execFileSync} = require('child_process');
const {readLighting, saveObject} = require('./locallightingbuilder');
const L = require('../../shared/js/mapmakerlighting');
global.Types = {};
const processMap = require('../../tools/maps/processmap');
let root, file;
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<map width="40" height="30" tilewidth="16" tileheight="16" nextobjectid="30" nextlayerid="9">
 <!-- Outside: café &amp; unchanged -->
 <tileset firstgid="1" name="tiles" tilewidth="16" tileheight="16"/>
 <layer id="1" name="tiles"><data><tile gid="0"/></data></layer>
 <objectgroup id="2" name="lights">
  <object id="7" name="Old torch" x="32" y="48" width="64" height="64" custom="retain">
   <!-- Keep this note -->
   <properties><property name="intensity" value="0.6"/><property name="color" value="255,180,90"/><property name="future" value="keep"/></properties><ellipse/>
  </object>
 </objectgroup>
 <objectgroup id="3" name="shadows"><object id="8" x="96" y="64"><polygon points="0,0 16,0 16,32 0,32"/></object></objectgroup>
 <objectgroup id="4" name="doors"><object id="20" x="0" y="0"/></objectgroup>
</map>\n`;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-lighting-'));
    fs.mkdirSync(path.join(root, 'server'), {recursive: true});
    fs.writeFileSync(path.join(root, 'server/config.json'), JSON.stringify({maps: ['one', 'empty']}));
    fs.mkdirSync(path.join(root, 'tools/maps/tmx'), {recursive: true});
    file = path.join(root, 'tools/maps/tmx/one.tmx');fs.writeFileSync(file, xml.replaceAll('\n', '\r\n'));
    fs.writeFileSync(path.join(root, 'tools/maps/tmx/empty.tmx'), '<map width="40" height="30" tilewidth="16" tileheight="16">\n <objectgroup id="1" name="lights"/>\n</map>');
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
async function add(type, mapId = 'one', data) {
    data ||= await readLighting(root, mapId);
    return saveObject(root, {mapId, operation: 'add', revision: data.revision, object: L.preset(type, 6, 6)});
}
test('reads existing lighting geometry and legacy custom properties without a map build', async () => {
    const data = await readLighting(root, 'one');
    expect(data.objects).toHaveLength(2);
    expect(data.objects[0]).toMatchObject({id: '7', shape: 'ellipse', x: 32, properties: {future: 'keep'}});
    expect(L.light(data.objects[0], 16)).toMatchObject({x: 64, y: 80, radius: 2, intensity: .6, color: {r: 255, g: 180, b: 90}});
});
test('updates only the chosen object and preserves other bytes, comments and custom properties', async () => {
    const before = fs.readFileSync(file, 'utf8'), data = await readLighting(root, 'one');
    const object = {...data.objects[0], name: 'Torch & "gate"', properties: {...data.objects[0].properties, intensity: '0.9', shadow: '0.8'}};
    const saved = await saveObject(root, {mapId: 'one', operation: 'update', objectId: '7', revision: data.revision, object});
    const after = fs.readFileSync(file, 'utf8'), start = before.indexOf('<object id="7"'), end = before.indexOf('</object>', start) + 9, newEnd = after.indexOf('</object>', start) + 9;
    expect(after.slice(0, start)).toBe(before.slice(0, start));expect(after.slice(newEnd)).toBe(before.slice(end));
    expect(after).toContain('custom="retain"');expect(after).toContain('<!-- Keep this note -->');expect(after).not.toMatch(/(?<!\r)\n/);
    expect(saved.objects[0]).toMatchObject({name: 'Torch & "gate"', properties: {future: 'keep', shadow: '0.8'}});
    expect((await readLighting(root, 'one')).revision).toBe(saved.revision);
});
test('creates missing and self-closing layers, allocates unique IDs, removes objects and properties', async () => {
    let data = await add('torch', 'empty');expect(data.objects).toHaveLength(1);
    data = await add('shadow-polygon', 'empty', data);expect(data.objects).toHaveLength(2);
    const shadow = data.objects.find(r => r.kind === 'shadow');
    expect(fs.readFileSync(path.join(root, 'tools/maps/tmx/empty.tmx'), 'utf8')).toContain('name="shadows"');
    data = await saveObject(root, {mapId: 'empty', operation: 'remove', objectId: shadow.id, revision: data.revision});
    const light = data.objects[0];light.properties.animation = null;
    data = await saveObject(root, {mapId: 'empty', operation: 'update', objectId: light.id, revision: data.revision, object: light});
    expect(data.objects).toHaveLength(1);expect(data.objects[0].properties.animation).toBeUndefined();
});
test('new radial, area and polygon objects survive the normal TMX and client exporter', async () => {
    let data = await add('torch');data = await add('area', 'one', data);data = await add('shadow-polygon', 'one', data);
    const jsonFile = path.join(root, 'converted.json');
    // The converter has no lxml dependency in this test: use ElementTree for its element traversal.
    const converter = fs.readFileSync(path.resolve(__dirname, '../../tools/maps/tmx2json.py'), 'utf8').replace('from lxml import etree', 'import xml.etree.ElementTree as etree');
    execFileSync('python3', ['-c', converter, file, jsonFile]);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    let built;try {built = processMap(JSON.parse(fs.readFileSync(jsonFile)), {mode: 'client'});} finally {log.mockRestore();}
    expect(built.lights).toHaveLength(3);expect(built.shadows).toHaveLength(2);
    for (const row of data.objects.filter(r => r.kind === 'light')) expect(built.lights.find(l => String(l.id) === row.id)).toEqual(L.light(row, 16));
    for (const shadow of built.shadows) {expect(shadow.polygon.points).toBeTruthy();expect(shadow.width).toBeUndefined();}
});
test('stale and simultaneous saves cannot overwrite another change', async () => {
    const data = await readLighting(root, 'one');
    const results = await Promise.allSettled([add('torch', 'one', data), add('lamp', 'one', data)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(r => r.status === 'rejected').reason.status).toBe(409);
    await expect(add('lamp', 'one', data)).rejects.toMatchObject({status: 409});
});
test('clearing an explicit radius restores ellipse bounds after save and readback', async () => {
    let data = await add('lamp');
    const row = data.objects.find(r => r.name === 'Lamp');row.properties.radius = '6';
    expect(row.id).toBe('30'); // Respect Tiled's nextobjectid, including IDs reserved by deleted objects.
    data = await saveObject(root, {mapId: 'one', operation: 'update', objectId: row.id, revision: data.revision, object: row});
    const saved = data.objects.find(r => r.id === row.id);saved.properties.radius = null;
    expect(L.light(saved, 16).radius).toBe(4);
    data = await saveObject(root, {mapId: 'one', operation: 'update', objectId: row.id, revision: data.revision, object: saved});
    expect(data.objects.find(r => r.id === row.id).properties.radius).toBeUndefined();
});
test('rejects incomplete or degenerate polygon coordinates', async () => {
    const data = await readLighting(root, 'one');
    for (const points of ['0, 16,0 16,16', '0,0 16,16 32,32']) {
        await expect(saveObject(root, {mapId: 'one', operation: 'add', revision: data.revision, object: {...L.preset('shadow-polygon', 5, 5), points}})).rejects.toMatchObject({status: 400});
    }
});
test.each([
    row => {row.properties.radius = '0';}, row => {row.properties.intensity = 'NaN';},
    row => {row.properties.innerRadius = '12';}, row => {row.properties.color = '999,0,0';},
    row => {row.properties.innerSpread = '90';}, row => {row.x = -10000;},
    row => {row.properties.future = 'changed';}, row => {row.shape = 'polygon';},
    row => {row.width = Infinity;}
])('rejects invalid geometry or settings before writing', async mutate => {
    const data = await readLighting(root, 'one'), row = L.preset('torch', 6, 6), before = fs.readFileSync(file);mutate(row);
    await expect(saveObject(root, {mapId: 'one', operation: 'add', revision: data.revision, object: row})).rejects.toMatchObject({status: 400});
    expect(fs.readFileSync(file)).toEqual(before);
});
test('rejects unsafe sources and checks build state immediately before writing', async () => {
    await expect(readLighting(root, '../one')).rejects.toMatchObject({status: 400});
    const data = await readLighting(root, 'one');
    await expect(saveObject(root, {mapId: 'one', operation: 'add', revision: data.revision, object: L.preset('lamp', 5, 5)}, () => {throw Object.assign(new Error('Build started'), {status: 409});})).rejects.toMatchObject({status: 409});
    fs.unlinkSync(file);fs.symlinkSync(path.join(root, 'server/config.json'), file);
    await expect(readLighting(root, 'one')).rejects.toThrow('symbolic');fs.unlinkSync(file);
    fs.writeFileSync(file, '<!DOCTYPE map [<!ENTITY secret SYSTEM "file:///etc/passwd">]><map/>');
    await expect(readLighting(root, 'one')).rejects.toThrow('DTD');
});
