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
test('only the six approved effects are enabled by default', () => {
    expect(Object.keys(setup().fx.flags)).toEqual(['stage', 'loot', 'fireflies', 'leaves', 'heat', 'ambience']);
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

test('custom burst appearance survives transient events and fades with its lifetime', () => {
    const {fx, renderer} = setup(), design = Config.custom({shape: 'soft', colors: ['#abcdef'], glow: 8});
    fx.tileChanged({x: 10,y: 20,particlesOnly: true,particles: {preset: 'sparks',count: 2,lifetimeMs: 1000,design}});
    fx.render(renderer, 1500);
    const state = renderer.setExtensionData.mock.calls.find(([id, data]) => id === 'world-fx' && data)[1];
    expect(state.particles).toHaveLength(2);
    expect(state.particles[0]).toMatchObject({design: {shape: 'soft',colors: ['#abcdef'],glow: 8},alpha: 0.5,elapsed: 0.5});
    fx.render(renderer, 2000);expect(fx.particles).toHaveLength(0);
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

test('cutscene ambience follows the camera scene, including positions outside every scene', () => {
    const {fx, game} = setup();
    const destination = {x: 70, y: 60, width: 50, height: 45, ambience: 'forest'};
    game.getViewScene = () => destination;
    expect(fx.scene()).toBe(destination);
    expect(fx.ambience(null).bounds).toEqual({x: 1120, y: 960, width: 800, height: 720});
    game.getViewScene = () => undefined;
    expect(fx.scene()).toBeUndefined();
    expect(fx.ambience(null)).toMatchObject({effects: [{type: 'none', count: 0}], bounds: undefined});
});
test('existing NPC ambience and its epoch are preserved when no scene override is present', () => {
    const {fx, game} = setup(); game.map.getCurrentScene = () => null;
    const base = {effects: [{type: 'fireflies', count: 12}], epoch: 123, bounds: {x: 0, y: 0, width: 16, height: 16}};
    expect(fx.ambience(base)).toMatchObject(base);
});
test('drop budgets stay bounded without changing avatar opacity', () => {
    const {fx, game, renderer} = setup();
    for (let i = 0; i < 100; i++) fx.drop({id: 100 + i});
    expect(fx.drops.size).toBe(64);
    const data = {drawData: [], globalAlpha: 0.8}; fx.decorate(game.player, data, 3);
    expect(data.globalAlpha).toBe(0.8);
    fx.render(renderer, 2000); expect(fx.drops.size).toBe(0);
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

test('level-up feedback is enabled without scenery flags and expires', () => {
    const {fx, game, renderer} = setup(); fx.flags = {};
    fx.levelUp(game.player, 'Avatar');
    expect(fx.particles).toHaveLength(44); expect(fx.rings).toHaveLength(1);
    expect(fx.particles[0]).toMatchObject({x: 168, y: 322, owner: 'levelup'});
    fx.render(renderer, 2700); expect(fx.particles).toHaveLength(0); expect(fx.rings).toHaveLength(0);
});
test.each([2, 3])('level-up bursts respect reduced motion and originate at the held item (direction %s)', direction => {
    const {fx, game, settings, renderer} = setup(); game.player.orientation = direction;
    fx.levelUp(game.player, 'Tool'); expect(fx.particles[0]).toMatchObject({x: 160, y: 325});
    settings.getReducedMotion = () => true; fx.render(renderer, 1050);
    fx.levelUp(game.player, 'Avatar'); fx.levelUp(null, 'Companion');
    expect(fx.particles).toHaveLength(0); expect(fx.rings).toHaveLength(0);
});

test('static weather can respect ambience toggles independently of reduced motion', () => {
    const {fx, settings} = setup();settings.getReducedMotion = () => true;
    expect(fx.enabled('ambience')).toBe(false);
    expect(fx.enabled('ambience', false)).toBe(true);
    fx.sceneFlags.ambience = false;
    expect(fx.enabled('ambience', false)).toBe(false);
});
