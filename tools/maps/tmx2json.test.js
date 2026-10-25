const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
let root;
beforeEach(() => {root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-converter-'));});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
function convert(source) {
    const file = path.join(root, 'map.tmx'), output = path.join(root, 'map.json');
    fs.writeFileSync(file, source);
    const converter = fs.readFileSync(path.join(__dirname, 'tmx2json.py'), 'utf8')
        .replace('from lxml import etree', 'import xml.etree.ElementTree as etree');
    execFileSync('python3', ['-c', converter, file, output]);
    return JSON.parse(fs.readFileSync(output, 'utf8'));
}
test('preserves empty maps, single children, attributes and CSV normalization', () => {
    expect(convert('<map width="5" height="6"/>')).toEqual({map: {width: 5, height: 6}});
    expect(convert('<map width="5"><layer name="tiles"><data encoding="csv">1,0,2</data></layer></map>'))
        .toEqual({map: {width: 5, layer: {name: 'tiles', data: {tile: [{gid: 1}, {gid: 0}, {gid: 2}]}}}});
});
test('groups repeated and interleaved children without changing nested object shapes', () => {
    const result = convert(`<map width="2" height="2"><layer name="tiles"><data><tile gid="1"/><tile gid="0"/></data></layer>
        <objectgroup name="doors"><object id="7" x="16" y="32"><properties><property name="map" value="one"/></properties></object></objectgroup>
        <layer name="entity"><data encoding="csv">0, 0, 1, 0</data></layer></map>`);
    expect(result.map.layer).toHaveLength(2);
    expect(result.map.layer[0].data.tile).toEqual([{gid: 1}, {gid: 0}]);
    expect(result.map.layer[1].data.tile).toEqual([{gid: 0}, {gid: 0}, {gid: 1}, {gid: 0}]);
    expect(result.map.objectgroup).toEqual([{name: 'doors', object: {id: 7, x: 16, y: 32,
        properties: {property: {name: 'map', value: 'one'}}}}]);
});
