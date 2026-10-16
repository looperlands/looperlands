const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
const start = source.indexOf('        app.get("/session/:sessionId/quests"');
const end = source.indexOf('        app.get("/session/:sessionId/owns/', start);

function request(session = true) {
    let handler;
    const definitions = [
        {id: 'finished', npc: 1},
        {id: 'active', npc: 1, eventType: 'KILL_MOB', target: 'rat', amount: 3},
        {id: 'foreign', npc: 2},
        {id: 'locked', npc: 1}
    ];
    const data = {gameData: {quests: {
        COMPLETED: [{questKey: 'finished'}],
        IN_PROGRESS: [{questKey: 'active'}, {questKey: 'foreign'}]
    }, items: {}, mobKills: {rat: 2}}};
    vm.runInNewContext(source.slice(start, end), {
        app: {get: (url, callback) => {handler = callback;}}, _,
        cache: {get: () => session ? data : undefined},
        quests: {questsByID: Object.fromEntries(definitions.map(quest => [quest.id, quest]))},
        self: {worldsMap: {main: {npcs: {giver: {kind: 1}}}, farm: {npcs: {giver: {kind: 2}}}}},
        require: path => path === './worlddefinitions' ? {definitions: {maps: new Map()}} : require(path)
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    return {res, run: () => handler({params: {sessionId: 'test'}}, res)};
}

test('quest response identifies maps for completed and active quests without exposing locked quests', async () => {
    const route = request();
    await route.run();
    expect(route.res.status).toHaveBeenCalledWith(200);
    const entries = route.res.json.mock.calls[0][0];
    expect(entries.map(entry => entry.id)).toEqual(['finished', 'active', 'foreign']);
    expect(entries[0]).toMatchObject({status: 'COMPLETED', mapIds: ['main']});
    expect(entries[1]).toMatchObject({status: 'IN_PROGRESS', progressCount: 2, amount: 3, mapIds: ['main']});
    expect(entries[2].mapIds).toEqual(['farm']);
});

test('quest response still rejects missing sessions', async () => {
    const route = request(false);
    await route.run();
    expect(route.res.status).toHaveBeenCalledWith(404);
});
