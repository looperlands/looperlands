const fs = require('fs');
const path = require('path');
const vm = require('vm');

const underscoreSource = fs.readFileSync(path.join(__dirname, 'lib/underscore.min.js'), 'utf8');

function mainGrids(data) {
    let definition;
    const context = vm.createContext({
        Class: {extend: value => value},
        define: (names, factory) => {definition = factory();},
        console: {log: () => {}},
    });
    vm.runInContext(underscoreSource, context);
    vm.runInContext(fs.readFileSync(require.resolve('./map'), 'utf8'), context);
    const map = Object.assign(Object.create(definition), data);
    map._generateCollisionGrid();
    map._generatePlateauGrid();
    return map;
}

function workerGrids(data) {
    let result;
    const context = vm.createContext({
        postMessage: map => {result = map;},
        importScripts: file => {
            if (file === 'lib/underscore.min.js') {
                vm.runInContext(underscoreSource, context);
            } else {
                expect(file).toBe('../maps/world_client_fixture.js');
                context.mapData = Object.assign({}, data);
            }
        },
    });
    vm.runInContext(fs.readFileSync(require.resolve('./mapworker'), 'utf8'), context);
    context.onmessage({data: 'fixture'});
    return result;
}

describe.each([['main thread', mainGrids], ['worker', workerGrids]])('%s grid preparation', (name, generate) => {
    test('preserves tile indices, collision overlap and blocking outside the map', () => {
        const data = {
            width: 4, height: 3,
            collisions: [0, 3, 4, 11], blocking: [-4, 4, 6, 10, 12, 500],
            plateau: [0, 3, 4, 11, 4],
        };
        const result = generate(data);
        expect(result.grid).toEqual([[1, 0, 0, 1], [1, 0, 1, 0], [0, 0, 1, 1]]);
        expect(result.plateauGrid).toEqual([[1, 0, 0, 1], [1, 0, 0, 0], [0, 0, 0, 1]]);
        expect(data.plateau).toEqual([0, 3, 4, 11, 4]);
    });

    test('only numeric, whole plateau indices inside the map match a tile', () => {
        const result = generate({
            width: 4, height: 2, collisions: [], blocking: [],
            plateau: ['0', null, false, true, 1, 2.5, -1, 8, Infinity, NaN],
        });
        expect(result.plateauGrid).toEqual([[0, 1, 0, 0], [0, 0, 0, 0]]);
    });

    test.each([undefined, [], [99]])('missing, empty or out-of-range plateau data leaves an empty grid: %j', plateau => {
        const result = generate({width: 2, height: 2, collisions: [], plateau});
        expect(result.grid).toEqual([[0, 0], [0, 0]]);
        expect(result.plateauGrid).toEqual([[0, 0], [0, 0]]);
        expect(result.grid[0]).not.toBe(result.grid[1]);
        expect(result.plateauGrid[0]).not.toBe(result.plateauGrid[1]);
    });

    test('matches the previous plateau membership rule across the main world map', () => {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../maps/world_client_main.json'), 'utf8'));
        const result = generate(data);
        let tileIndex = 0;
        const expected = Array.from({length: data.height}, () =>
            Array.from({length: data.width}, () => data.plateau.indexOf(tileIndex++) >= 0 ? 1 : 0));
        expect(result.plateauGrid).toEqual(expected);
    });
});

test('coordinate action placements override exported action tiles while preserving ordinary neighbours',()=>{
    let definition;const context=vm.createContext({isInt:Number.isInteger,Class:{extend:value=>value},define:(names,factory)=>{definition=factory();},console:{log:()=>{}}});
    vm.runInContext(underscoreSource,context);vm.runInContext(fs.readFileSync(require.resolve('./map'),'utf8'),context);
    const map=Object.assign(Object.create(definition),{width:8,height:8,tilesize:16,data:Array(64).fill([1]),actionTiles:{1:{action:'farm'}},authoringActions:{'3.4':{action:'repair'}}});
    expect(map.findNearestActionTileAround(3,4,0)).toMatchObject({name:'repair',gridX:3,gridY:4});
    expect(map.findNearestActionTileAround(4,4,0)).toMatchObject({name:'farm',gridX:4,gridY:4});
});
