const path = require('path');
const {execFile} = require('child_process');
const {readTmx, primeTmx, signature} = require('./localtmxcache');
async function preload(root, mapId) {
    // Reuse the same configured-map and symlink checks as the entrance editor.
    const file = require('./localdoorbuilder').mapFile(root, mapId);
    const version = signature(file);
    const data = await readTmx(file, 'workspace', () => new Promise((resolve, reject) => {
        execFile('python3', ['-B', path.resolve(__dirname, '../../tools/maps/readmap.py'), file],
            {timeout: 45000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8'}, (error, stdout) => {
                let result;
                try {result = JSON.parse(stdout);} catch (_) {return reject(new Error('The map source could not be loaded. Check Python and the Tiled source.'));}
                if (error || result.error) return reject(Object.assign(new Error(result.error || 'Map source loading failed.'), {status: result.status || 500}));
                resolve(result);
            });
    }));
    const decorate = value => ({...value, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx'});
    primeTmx(file, 'doors', data.doors, version);
    primeTmx(file, 'encounters', data.encounters, version);
    primeTmx(file, 'zones', data.zones, version);
    primeTmx(file, 'fishing', data.fishing, version);
    primeTmx(file, 'lighting', decorate(data.lighting), version);
    primeTmx(file, 'entities', decorate(data.entities), version);
    return data;
}
module.exports = {preload};
