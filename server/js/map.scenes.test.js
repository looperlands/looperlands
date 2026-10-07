const path = require('path');
global.Types = {};
const ServerMap = require('./map');

test('existing server exports use their companion client scene names and exact boundaries', async () => {
    const map = await new Promise(resolve => {
        const loaded = new ServerMap(path.join(__dirname, '../maps/world_server_main.json'));
        loaded.ready(() => resolve(loaded));
    });
    expect(map.getSceneAt(40, 193).name).toBe('Town');
    expect(map.getSceneAt(40, 192).name).toBe('Forest');
    expect(map.getSceneAt(40, 108).name).toBe('Graveyard');
    expect(map.getSceneAt(40, 61).name).toBe('Desert');
    expect(map.getSceneAt(-1, -1)).toBeUndefined();
});

test('scene lookup uses each map configuration rather than hardcoded main-map names', () => {
    const map = Object.create(ServerMap.prototype);
    map.scenes = [{id: 9, x: 10, y: 20, w: 5, h: 8, name: 'Cloud Observatory'}];
    expect(map.getSceneAt(10, 20).name).toBe('Cloud Observatory');
    expect(map.getSceneAt(15, 20)).toBeUndefined();
    expect(map.getSceneAt(10, 28)).toBeUndefined();
});

function configuredMap() {
    const map = Object.create(ServerMap.prototype);
    map.initMap({width: 112, height: 48, collisions: [113], roamingAreas: [], chestAreas: [], staticChests: [], staticEntities: [],
        doors: [{x: 1, y: 1, tx: 85, ty: 37, tnft: 'token', ttid: '!gate'}, {x: 2, y: 1, tx: 85, ty: 37, tnft: 'token', ttid: 'gate'}],
        checkpoints: [{id: 1, x: 2, y: 3, w: 2, h: 2, s: 1}, {id: 2, x: 90, y: 40, w: 1, h: 1}],
        triggers: [{id: 'gate', x: 1, y: 1, w: 2, h: 1, trigger: 'open', delay: 10}]});
    return map;
}

test('adding scenes preserves collision coordinates and hidden layer gates', () => {
    const map = configuredMap(); map.generateCollisionGrid();
    expect(map.isColliding(1, 1)).toBe(true);
    expect(map.isColliding(2, 1)).toBe(false);
    expect(map.isColliding(0, 1)).toBe(false);
    expect(map.isColliding(1.5, 1.5)).toBe(true);
    map.hiddenLayers = {gate: {[map.GridPositionToTileIndex(1, 1)]: 'wall'}};
    map.toggledLayers.gate = true; map.collidingTiles.wall = true;
    expect(map.isColliding(2, 1)).toBe(true);
    map.collidingTiles.wall = false;
    expect(map.isColliding(2, 1)).toBe(false);
    expect(map.tileIndexToGridPosition(112)).toEqual({x: 111, y: 0});
    expect(map.tileIndexToGridPosition(113)).toEqual({x: 0, y: 1});
});

test('scene initialization retains portal presence groups, token gates and checkpoints', () => {
    const map = configuredMap(); const groups = [];
    map.forEachGroup(id => groups.push(id));
    expect(groups).toHaveLength(16);
    const adjacent = map.getAdjacentGroupPositions('0-0');
    expect(adjacent).toContainEqual({x: 3, y: 3});
    expect(adjacent.every(p => p.x >= 0 && p.y >= 0 && p.x < 4 && p.y < 4)).toBe(true);
    expect(map.getAdjacentGroupPositions('0-0')).toBe(adjacent);
    const broadcast = jest.fn(); map.forEachAdjacentGroup('0-0', broadcast);
    expect(broadcast).toHaveBeenCalledWith('3-3');
    map.forEachAdjacentGroup('', broadcast);
    expect(map.getRequiredNFT(1, 1)).toBe('token');
    expect(map.getRequiredNFT(2, 1)).toBe('token');
    expect(map.getDoorTrigger(1, 1)).toBe('gate');
    expect(map.getDoorTrigger(8, 8)).toBeUndefined();
    expect(map.getCheckpoint(9)).toBeUndefined();
    expect(map.getCheckpoint(1)).toMatchObject({x: 2, y: 3});
    expect(map.findClosestCheckpoint(89, 40).id).toBe(2);
    const start = map.getRandomStartingPosition();
    expect([2, 3]).toContain(start.x); expect([3, 4]).toContain(start.y);
    expect(map.triggers.gate.trigger).toBe('open');
});
