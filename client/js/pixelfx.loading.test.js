const fs = require('fs'), path = require('path'), vm = require('vm');

test('the shipped legacy AMD loader resolves the shared FX catalog without fetching a missing module', () => {
    const callbacks = [], context = {setTimeout: callback => callbacks.push(callback), console};
    vm.createContext(context);
    const loader = fs.readFileSync(path.join(__dirname, 'lib/require-jquery.js'), 'utf8').split('/*!\n * jQuery JavaScript Library')[0];
    vm.runInContext(loader, context);
    for (const id of ['../../shared/js/pixelfxcatalog', 'pixelfxcatalog', '../../shared/js/placedfxconfig']) {
        const source = fs.readFileSync(path.resolve(__dirname, id + '.js'), 'utf8');
        // The optimizer names each AMD definition when placing it in game.js.
        vm.runInContext(source.replace(/\bdefine\(/g, 'define(' + JSON.stringify(id) + ','), context);
    }
    let loaded;
    context.requirejs(['../../shared/js/placedfxconfig'], config => {loaded = config;});
    for (let i = 0; callbacks.length && i < 20; i++) callbacks.shift()();
    expect(loaded).toBeDefined();
    expect(Object.keys(loaded.catalog)).toHaveLength(244);
    expect(loaded.phase({effect:'fire/campfire', hazard:null}, 3500)).toMatchObject({kind:'decoration', effectMs:500});
});
