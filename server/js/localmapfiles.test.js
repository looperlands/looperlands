const fs = require('fs'), os = require('os'), path = require('path');
const {readJson} = require('./localmapfiles');
test('map readers parse one shared file once, isolate overlays, and refresh on disk edits', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-files-')), file = path.join(root, 'map.json');
    fs.writeFileSync(file, '{"width":10,"scenes":[]}');
    const read = jest.spyOn(fs, 'readFileSync');
    try {
        const first = readJson(file); first.scenes.push({id: 'draft'});
        expect(readJson(file)).toEqual({width: 10, scenes: []});
        expect(read.mock.calls.filter(([name]) => name === file)).toHaveLength(1);
        const stat = fs.statSync(file);
        fs.writeFileSync(file, '{"width":20,"scenes":[]}'); fs.utimesSync(file, stat.atime, stat.mtime);
        expect(readJson(file).width).toBe(20);
        expect(read.mock.calls.filter(([name]) => name === file)).toHaveLength(2);
    } finally {read.mockRestore(); fs.rmSync(root, {recursive: true, force: true});}
});
