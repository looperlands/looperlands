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
 <objectgroup id="3" name="shadows"><object id="8" x="96" y="64"><properties><property name="proxyOwner" value="tile:234,1,2"/></properties><polygon points="0,0 16,0 16,32 0,32"/></object></objectgroup>
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
function exportClient() {
    const jsonFile = path.join(root, 'converted.json');
    const converter = fs.readFileSync(path.resolve(__dirname, '../../tools/maps/tmx2json.py'), 'utf8').replace('from lxml import etree', 'import xml.etree.ElementTree as etree');
    execFileSync('python3', ['-c', converter, file, jsonFile]);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {return processMap(JSON.parse(fs.readFileSync(jsonFile)), {mode: 'client'});} finally {log.mockRestore();}
}
test('batch lighting adds reuse self-closing layers, create missing layers once and allocate unique IDs', async () => {
    const initial=await readLighting(root,'empty');
    const saved=await saveObject(root,{mapId:'empty',revision:initial.revision,operations:[
        {operation:'add',object:L.preset('lamp',6,6)}, {operation:'add',object:L.preset('torch',10,10)},
        {operation:'add',object:L.preset('shadow-rect',12,12)}, {operation:'add',object:L.preset('shadow-rect',15,15)}
    ]});
    expect(saved.objects).toHaveLength(4);expect(new Set(saved.objects.map(row=>row.id)).size).toBe(4);
    const source=fs.readFileSync(path.join(root,'tools/maps/tmx/empty.tmx'),'utf8');
    expect(source.match(/name="shadows"/g)).toHaveLength(1);expect(source.match(/name="lights"/g)).toHaveLength(1);
});
test('batch updates preserve unknown fields, reject invalid rows atomically and keep stale-save protection', async () => {
    const data=await readLighting(root,'one'),before=fs.readFileSync(file);
    await expect(saveObject(root,{mapId:'one',revision:data.revision,operations:[
        {operation:'add',object:L.preset('lamp',6,6)}, {operation:'add',object:{...L.preset('lamp',10,10),width:-1}}
    ]})).rejects.toThrow();expect(fs.readFileSync(file)).toEqual(before);
    const saved=await saveObject(root,{mapId:'one',revision:data.revision,operations:[
        {operation:'update',objectId:'7',object:{...data.objects[0],name:'Changed lamp'}},
        {operation:'add',object:L.preset('lamp',10,10)}
    ]});
    expect(saved.objects.find(row=>row.id==='7').properties.future).toBe('keep');
    await expect(saveObject(root,{mapId:'one',revision:data.revision,operations:[{operation:'remove',objectId:'7'}]})).rejects.toThrow('changed');
});
test('reads existing lighting geometry and legacy custom properties without a map build', async () => {
    const data = await readLighting(root, 'one');
    expect(data.objects).toHaveLength(2);
    expect(data.objects[0]).toMatchObject({id: '7', shape: 'ellipse', x: 32, properties: {future: 'keep'}});
    expect(L.light(data.objects[0], 16)).toMatchObject({x: 64, y: 80, radius: 2, intensity: .6, color: {r: 255, g: 180, b: 90}});
    expect(L.light(data.objects[0], 16)).not.toHaveProperty('glowIntensity');
    expect(L.preset('torch', 6, 6).properties).not.toHaveProperty('glowIntensity');
});
test('source glow survives save, reload and client export with optional color inheritance and explicit off', async () => {
    let data = await readLighting(root, 'one');
    const update = async properties => {
        const current = data.objects.find(row => row.id === '7');
        data = await saveObject(root, {mapId: 'one', operation: 'update', objectId: '7', revision: data.revision,
            object: {...current, properties: {...current.properties, ...properties}}});
        return exportClient().lights.find(light => light.id === 7);
    };
    const glowing = await update({intensity: '0', glowIntensity: '0,3', glowRadius: '2e1', glowColor: '255,120,40', glowTexture: 'cottage-window'});
    expect(glowing).toMatchObject({intensity: 0, glowIntensity: .3, glowRadius: 20, glowColor: {r: 255, g: 120, b: 40}, glowTexture: 'cottage-window'});
    expect(glowing).toEqual(L.light(data.objects.find(row => row.id === '7'), 16));
    const inherited = await update({glowColor: null});
    expect(inherited).not.toHaveProperty('glowColor');
    expect(inherited.color).toEqual({r: 255, g: 180, b: 90});
    expect((await update({glowIntensity: '0'})).glowIntensity).toBe(0);
    const removed = await update({glowIntensity: null, glowRadius: null});
    expect(removed).not.toHaveProperty('glowIntensity');expect(removed).not.toHaveProperty('glowRadius');
    expect(data.objects.find(row => row.id === '7').properties.future).toBe('keep');
});
test.each([
    'name="glowIntensity" value="2"', 'name="glowRadius" value="65"',
    'name="glowRadius" value="1.5"', 'name="glowColor" value="255,0"', 'name="glowTexture" value="../window"'
])('direct Tiled exports reject invalid glow properties: %s', property => {
    fs.writeFileSync(file, xml.replace('name="intensity" value="0.6"', property));
    expect(exportClient).toThrow(/Glow|glow/);
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
    const edited = data.objects.find(row => row.id === '8');
    data = await saveObject(root, {mapId: 'one', operation: 'update', objectId: edited.id, revision: data.revision,
        object: {...edited, x: 112, name: 'Moved legacy shadow'}});
    expect(data.objects.find(row => row.id === '8').properties.proxyOwner).toBe('tile:234,1,2');
    const built = exportClient();
    expect(built.lights).toHaveLength(3);expect(built.shadows).toHaveLength(2);
    expect(built.shadows.find(s => s.id === 8).proxyOwner).toEqual({gid: 234, tileX: 8, tileY: 6});
    expect(built.shadows.find(s => s.id !== 8).proxyOwner).toBeUndefined();
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
    row => {row.width = Infinity;}, row => {row.properties.glowIntensity = '-0.1';},
    row => {row.properties.glowIntensity = 'Infinity';}, row => {row.properties.glowRadius = '0';},
    row => {row.properties.glowRadius = '65';}, row => {row.properties.glowRadius = '2.5';},
    row => {row.properties.glowColor = '256,120,40';}, row => {row.properties.glowColor = '255,40';},
    row => {row.properties.glowIntensity = '.3';row.properties.spread = '90';},
    row => {row.shape = 'rectangle';row.properties.glowIntensity = '0.3';},
    row => {row.kind = 'shadow';row.shape = 'rectangle';row.properties = {glowIntensity: '0.3'};}
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
