const fs = require('fs');
const os = require('os');
const path = require('path');
const {readTmx} = require('./localtmxcache');
let root, file;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-tmx-cache-'));
    file = path.join(root, 'map.tmx');
    fs.writeFileSync(file, '<map/>');
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));

test('concurrent tools share a read but receive independent objects', async () => {
    const load = jest.fn(async () => ({doors: [{id: '7'}]}));
    const [a, b] = await Promise.all([readTmx(file, 'doors', load), readTmx(file, 'doors', load)]);
    a.doors[0].id = 'changed';
    expect(b.doors[0].id).toBe('7');
    expect((await readTmx(file, 'doors', load)).doors[0].id).toBe('7');
    expect(load).toHaveBeenCalledTimes(1);
    await readTmx(file, 'entities', load);
    expect(load).toHaveBeenCalledTimes(2);
});

test('same-size edits with preserved mtime and atomic replacements invalidate reads', async () => {
    const load = jest.fn(async () => fs.readFileSync(file, 'utf8'));
    const stat = fs.statSync(file);
    expect(await readTmx(file, 'doors', load)).toBe('<map/>');
    fs.writeFileSync(file, '<new/>');
    fs.utimesSync(file, stat.atime, stat.mtime);
    expect(await readTmx(file, 'doors', load)).toBe('<new/>');
    const replacement = path.join(root, 'replacement');
    fs.writeFileSync(replacement, '<old/>'); fs.renameSync(replacement, file);
    expect(await readTmx(file, 'doors', load)).toBe('<old/>');
    expect(load).toHaveBeenCalledTimes(3);
});

test('failed reads and files edited while a read runs are never cached', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('invalid XML')).mockResolvedValue({});
    await expect(readTmx(file, 'doors', load)).rejects.toThrow('invalid XML');
    await readTmx(file, 'doors', load);
    expect(load).toHaveBeenCalledTimes(2);
    const changing = jest.fn(async () => {fs.writeFileSync(file, '<changed/>'); return {};});
    await readTmx(file, 'entities', changing);
    await readTmx(file, 'entities', changing);
    expect(changing).toHaveBeenCalledTimes(2);
});
