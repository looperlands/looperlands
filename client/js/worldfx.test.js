const fs = require('fs'), vm = require('vm');
const Config = require('./worldfxconfig');
function setup() {
    let WorldFx;
    vm.runInNewContext(fs.readFileSync(require.resolve('./worldfx'), 'utf8'), {
        define: (_, factory) => { WorldFx = factory(Config); }, console,
    });
    const settings = {getReducedMotion: () => false};
    const player = {id: 1, x: 160, y: 320}, item = {id: 2};
    const renderer = {registerExtension: jest.fn(), setExtensionData: jest.fn()};
    const game = {mapId: 'main', sessionId: 'session', started: true, currentTime: 1000, player, renderer,
        app: {settings}, getEntityById: id => id === 2 ? item : player,
        map: {getCurrentScene: () => ({x: 0, y: 0, width: 100, height: 100, ambience: 'forest'})}};
    const fx = new WorldFx(game, () => 0.5);
    return {fx, game, renderer, settings, item};
}
test('only the seven approved effects are enabled by default', () => {
    expect(Object.keys(setup().fx.flags)).toEqual(['stage', 'loot', 'teleport', 'fireflies', 'leaves', 'heat', 'ambience']);
    expect(Object.values(setup().fx.flags).every(Boolean)).toBe(true);
});
test('stage effects require a transient event and leave tile state alone', () => {
    const {fx, game, renderer} = setup();
    fx.tileChanged({x: 10, y: 20, tile: 123}); expect(fx.particles).toHaveLength(0);
    fx.tileChanged({x: 10, y: 20, particlesOnly: true, particles: 'water'});
    fx.render(renderer, 1000);
    const state = renderer.setExtensionData.mock.calls.find(([id, data]) => id === 'world-fx' && data)[1];
    expect(state.particles[0]).toMatchObject({x: 168, y: 332, alpha: 1});
    expect(game.tileStages).toBeUndefined();
});
test.each(['toggle', 'reduced', 'map', 'session', 'stop', 'death', 'removed'])('particles cannot leak after %s', reason => {
    const {fx, game, renderer, settings} = setup();
    fx.tileChanged({x: 10, y: 20, particlesOnly: true, particles: 'soil'});
    if (reason === 'toggle') fx.flags.stage = false;
    if (reason === 'reduced') settings.getReducedMotion = () => true;
    if (reason === 'map') game.mapId = 'other';
    if (reason === 'session') game.sessionId = 'other';
    if (reason === 'stop') game.isStopped = true;
    if (reason === 'death') game.player.isDead = true;
    if (reason === 'removed') game.player = null;
    expect(() => fx.render(renderer, 1050)).not.toThrow();
    expect(fx.particles).toHaveLength(0);
});
test('loot bounce moves art without moving shadows or gameplay coordinates', () => {
    const {fx, game, item} = setup(); fx.drop(item); game.currentTime = 1200;
    const data = {drawData: [{spriteName: 'shadow16', dy: 6}, {spriteName: 'item-flask', dy: -10}]};
    fx.decorate(item, data, 3);
    expect(data.drawData[0].dy).toBe(6); expect(data.drawData[1].dy).toBeLessThan(-10);
    expect(item).toEqual({id: 2});
    fx.flags.loot = false; data.drawData[1].dy = -10; fx.decorate(item, data, 3);
    expect(data.drawData[1].dy).toBe(-10);
});
test('expired and replaced drops stop affecting items, even when an ID is reused', () => {
    const {fx, game, renderer, item} = setup(); fx.drop(item);
    const data = {drawData: [{spriteName: 'item-flask', dy: 0}]};
    game.currentTime = 1200; fx.decorate({id: 2}, data, 3); expect(data.drawData[0].dy).toBe(0);
    fx.render(renderer, 1801); expect(fx.drops.size).toBe(0);
});
test('bursts are bounded, expire, and do not replay after being disabled', () => {
    const {fx, game, renderer} = setup();
    for (let i = 0; i < 100; i++) fx.tileChanged({x: 4, y: 4, particlesOnly: true, particles: 'soil'});
    expect(fx.particles).toHaveLength(256);
    fx.flags.stage = false; fx.render(renderer, game.currentTime);
    fx.flags.stage = true; fx.render(renderer, game.currentTime);
    expect(fx.particles).toHaveLength(0);
    fx.tileChanged({x: 4, y: 4, particlesOnly: true, particles: 'soil'}); fx.render(renderer, 1800);
    expect(fx.particles).toHaveLength(0);
});
test('scene ambience works without NPC config and obeys the map opt-out', () => {
    const {fx} = setup();
    expect(fx.ambience(null).effects).toEqual(Config.ambient('forest'));
    fx.configure({worldFx: {enabled: {ambience: false}}}); expect(fx.ambience(null).effects).toEqual([]);
});
test('existing NPC ambience and its epoch are preserved when no scene override is present', () => {
    const {fx, game} = setup(); game.map.getCurrentScene = () => null;
    const base = {effects: [{type: 'fireflies', count: 12}], epoch: 123, bounds: {x: 0, y: 0, width: 16, height: 16}};
    expect(fx.ambience(base)).toMatchObject(base);
});
test('reactive particle velocity resets after a local teleport', () => {
    const {fx, game, renderer} = setup(); fx.render(renderer, 1000);
    game.player.sprite = {name: 'NFT_avatar', width: 48, height: 48, offsetX: -16, offsetY: -20, scale: 1};
    game.player.currentAnimation = {currentFrame: {x: 48, y: 96}};
    fx.teleport(game.player, 20, 30); game.player.x = 320; game.player.y = 480;
    fx.render(renderer, 1100); expect(fx.actor).toMatchObject({vx: 0, vy: 0});
    expect(fx.teleports[0]).toMatchObject({frame: {spriteName: 'NFT_avatar', x: 48, y: 96, scale: 1}, to: {x: 320, y: 480}});
    expect(fx.teleports[0].fragments.length).toBeLessThanOrEqual(180);
    expect(fx.teleports[0].fragments.some(p => p.sy >= 40)).toBe(true);
});
test('teleport and drop budgets stay bounded and disabled teleports do not dim avatars', () => {
    const {fx, game, renderer} = setup();
    game.player.sprite = {name: 'NFT_avatar', width: 16, height: 512, offsetX: 0, offsetY: 0};
    game.player.currentAnimation = {currentFrame: {x: 0, y: 0}};
    for (let i = 0; i < 100; i++) { fx.teleport(game.player, i, 30); fx.drop({id: 100 + i}); }
    expect(fx.teleports).toHaveLength(8); expect(fx.drops.size).toBe(64);
    expect(fx.teleports[0].fragments.length).toBeLessThanOrEqual(180);
    fx.flags.teleport = false; const data = {drawData: []}; fx.decorate(game.player, data, 3);
    expect(data.globalAlpha).toBeUndefined(); fx.render(renderer, 2000); expect(fx.teleports).toHaveLength(0);
});
test('scene flags revert on exit and map changes clear previous configuration', () => {
    const {fx, game, item} = setup(); fx.drop(item);
    game.map.getCurrentScene = () => ({fx: {enabled: {heat: false}}}); fx.scene(); expect(fx.enabled('heat')).toBe(false);
    game.map.getCurrentScene = () => null; fx.scene(); expect(fx.enabled('heat')).toBe(true);
    fx.configure({worldFx: {enabled: {loot: false}, ambience: 'campfire', scenery: {fires: [{x: 10, y: 10, width: 16, height: 16}]}}});
    fx.scene(); game.mapId = 'other'; fx.sync(); fx.scene();
    expect(fx.packet).toBeNull(); expect(fx.drops.size).toBe(0); expect(fx.scenery.fires).toBeUndefined();
    expect(fx.enabled('loot')).toBe(true);
});
