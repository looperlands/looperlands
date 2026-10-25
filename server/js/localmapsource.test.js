const fs = require('fs'), os = require('os'), path = require('path');
const childProcess = require('child_process');
global.Types = {};
test('one TMX scan produces the same public data as every individual editor', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-source-'));
    const file = path.join(root, 'tools/maps/tmx/one.tmx'); fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.mkdirSync(path.join(root, 'server')); fs.writeFileSync(path.join(root, 'server/config.json'), '{"maps":["one"]}');
    fs.writeFileSync(file, `<map width="8" height="6" tilewidth="16" tileheight="16">
      <tileset firstgid="1" name="Mobs"><tile id="0"><properties><property name="type" value="rat"/></properties></tile></tileset>
      <layer id="1" name="entities"><data encoding="csv">0,1,0,0</data></layer>
      <objectgroup id="2" name="mapmaker-entities"><object id="1" name="guard" x="32" y="32"><point/></object></objectgroup>
      <objectgroup id="3" name="doors"><object id="2" type="portal" x="16" y="32"><properties><property name="message">Café &amp; gate</property><property name="x" value="3"/></properties></object></objectgroup>
      <objectgroup id="4" name="lights"><object id="3" x="16" y="32" width="32" height="48"><ellipse/><properties><property name="radius" value="4"/></properties></object></objectgroup>
      <objectgroup id="5" name="shadows"><object id="4" x="16" y="32"><polygon points="0,0 16,0 0,16"/></object></objectgroup>
      <objectgroup id="6" name="chests"><object id="5" x="16" y="32"><point/><properties><property name="items" value="GOLD"/></properties></object></objectgroup>
      <objectgroup id="7" name="roaming"><object id="6" type="rat" x="16" y="32" width="32" height="32"/></objectgroup>
      <objectgroup id="8" name="chestareas"><object id="7" x="16" y="32" width="32" height="32"/></objectgroup>
      <objectgroup id="9" name="fishing"><object id="8" name="Pond" x="16" y="32" width="32" height="16"><properties><property name="scope" value="area"/><property name="fish" value="cobguppy:common"/></properties></object></objectgroup>
      <objectgroup id="10" name="checkpoints"><object id="9" name="Spawn" type="start" x="16" y="16" width="16" height="16"/></objectgroup>
    </map>`);
    try {
        const raw = JSON.parse(childProcess.execFileSync('python3', ['-B', path.resolve(__dirname, '../../tools/maps/readmap.py'), file], {encoding: 'utf8'}));
        for (const [key, script, input] of [['doors', 'editdoors.py', {action:'read'}], ['lighting', 'editlighting.py', {}], ['encounters', 'editencounters.py', {}], ['entities', 'editentities.py', {}], ['fishing', 'editfishing.py', {}], ['zones', 'editzones.py', {}]]) {
            const expected = JSON.parse(childProcess.execFileSync('python3', ['-B', path.resolve(__dirname, '../../tools/maps', script), file], {input: JSON.stringify(input), encoding: 'utf8'}));
            expect(raw[key]).toEqual(expected);
        }
        const run = jest.spyOn(childProcess, 'execFile');
        try {
            let preload; jest.isolateModules(() => {preload = require('./localmapsource').preload;});
            await Promise.all([preload(root, 'one'), preload(root, 'one')]);
            expect(run).toHaveBeenCalledTimes(1);
        } finally {run.mockRestore();}
    } finally {fs.rmSync(root, {recursive: true, force: true});}
});
