const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('Paradise Point door approaches are open in Tiled and matching client/server exports', () => {
    const source = fs.readFileSync(path.join(root, 'tools/maps/tmx/duckville.tmx'), 'utf8');
    const blocking = source.match(/<layer\b[^>]*name="blocking"[^>]*>[\s\S]*?<\/layer>/)[0].match(/<tile\b[^>]*\/>/g);
    const client = read('client/maps/world_client_duckville.json'), server = read('server/maps/world_server_duckville.json');
    const destination = read('server/maps/world_server_m88n2.json');
    const doors = client.doors.filter(d => d.y === 201 && d.tmap === 'm88n2');
    expect(doors.map(d => d.x)).toEqual([155, 156, 97, 98]);
    expect(client.doors).toEqual(server.doors);
    for (const door of doors) {
        const approach = (door.y + 1) * client.width + door.x;
        expect(blocking[approach]).toBe('<tile/>');
        expect(client.blocking).not.toContain(approach);
        expect(server.collisions).not.toContain(approach);
        expect(server.collisions).not.toContain(door.y * server.width + door.x);
        expect(destination.collisions).not.toContain(door.ty * destination.width + door.tx);
    }
    const context = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'client/maps/world_client_duckville.js'), 'utf8'), context);
    expect(JSON.parse(JSON.stringify(context.mapData))).toEqual(client);
});

test('saved Garden scenes follow current Tiled winner names while preserving the authored cavern', () => {
    const client = read('client/maps/world_client_duckville.json'), document = read('tools/worlds/duckville.json');
    const scenes = require('./localworldscenes').applyScenes(client, document.scenes, document.sceneBaseline).scenes;
    expect(scenes.find(s => String(s.id) === '1002').name).toBe('Welcome home gardener!');
    expect(scenes.find(s => String(s.id) === '1003').name).toBe('Welcome home Crono!');
    expect(scenes.some(s => String(s.id) === '1139')).toBe(false);
    expect(scenes.find(s => s.id === 'scene_1')).toMatchObject({name: 'Lava Falls Caverns', x: 103, y: 439});
});
