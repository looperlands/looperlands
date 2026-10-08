const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup() {
    class Mob {
        constructor(id) { Object.assign(this, {id, x: 40, y: 64, normalSprite: {offsetX: -4, offsetY: -8, width: 24, height: 32}}); }
        isVisible() { return true; }
    }
    let CombatFeedback;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'combatfeedback.js'), 'utf8'), {
        define: (deps, factory) => { CombatFeedback = factory(Mob); },
    });
    const settings = {getCombatEffectsEnabled: () => true, getReducedMotion: () => false};
    const mob = new Mob(7);
    const game = {started: true, mapId: 'main', app: {settings}, player: {target: mob}, entities: {7: mob}};
    return {feedback: new CombatFeedback(game), game, mob, settings, Mob};
}

test('positive confirmed hits animate independently and expire by elapsed time', () => {
    const {feedback, mob} = setup();
    feedback.addImpact(mob, 10, 1000);
    feedback.addImpact(mob, 20, 1050);
    feedback.addImpact(mob, 0, 1060);
    feedback.addImpact(mob, -5, 1060);
    const frame = feedback.getFrame(1100);
    expect(frame.impacts).toHaveLength(2);
    expect(frame.impacts[0].progress).toBeCloseTo(100 / 220);
    expect(frame.impacts[1].progress).toBeCloseTo(50 / 220);
    expect(feedback.getFrame(1220).impacts).toHaveLength(1);
    expect(feedback.getFrame(5000).impacts).toHaveLength(0);
});

test('rapid hits are bounded and retain the most recent impacts', () => {
    const {feedback, mob} = setup();
    for (let i = 0; i < 100; i++) feedback.addImpact(mob, 10, 1000 + i);
    const impacts = feedback.getFrame(1100).impacts;
    expect(impacts).toHaveLength(24);
    expect(impacts[0].progress).toBeCloseTo(24 / 220);
});

test.each(['disabled', 'reduced motion'])('%s suppresses bursts while retaining the target', preference => {
    const {feedback, mob, settings} = setup();
    feedback.addImpact(mob, 10, 1000);
    if (preference === 'disabled') settings.getCombatEffectsEnabled = () => false;
    else settings.getReducedMotion = () => true;
    feedback.addImpact(mob, 10, 1050);
    const frame = feedback.getFrame(1100);
    expect(frame.impacts).toHaveLength(0);
    expect(frame.target).not.toBeNull();
});

test('marker follows the active target independently of hover', () => {
    const {feedback, game, mob, Mob} = setup();
    game.highlightedTarget = new Mob(8);
    expect(feedback.getFrame(1000).target).toEqual({x: 38, y: 62, width: 20, height: 20});
    mob.x += 16;
    expect(feedback.getFrame(1010).target.x).toBe(54);
    game.player.target = null;
    expect(feedback.getFrame(1020).target).toBeNull();
});

test.each(['dead', 'friendly', 'despawned', 'invisible'])('marker clears for a %s target', state => {
    const {feedback, game, mob} = setup();
    if (state === 'dead') mob.isDead = true;
    if (state === 'friendly') mob.isFriendly = true;
    if (state === 'despawned') delete game.entities[mob.id];
    if (state === 'invisible') mob.isVisible = () => false;
    expect(feedback.getFrame(1000).target).toBeNull();
});

test.each(['map', 'disconnect', 'death', 'stop'])('%s clears old bursts', transition => {
    const {feedback, game, mob} = setup();
    feedback.addImpact(mob, 10, 1000);
    if (transition === 'map') game.mapId = 'cobsfarm';
    if (transition === 'disconnect') game.started = false;
    if (transition === 'death') game.player.isDead = true;
    if (transition === 'stop') game.isStopped = true;
    expect(feedback.getFrame(1050).impacts).toHaveLength(0);
});

function damageHandler(mob) {
    const gameSource = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
    const start = gameSource.indexOf('self.client.onPlayerDamageMob(function');
    const end = gameSource.indexOf('\n                    });', start) + '\n                    });'.length;
    const self = {currentTime: 1200, getEntityById: jest.fn(() => mob),
        infoManager: {addDamageInfo: jest.fn()}, combatFeedback: {addImpact: jest.fn()},
        client: {onPlayerDamageMob: handler => { self.handler = handler; }}};
    vm.runInNewContext(gameSource.slice(start, end), {self});
    return self;
}

test.each([0, -5])('server damage=%s does not produce a hit effect or damage number', damage => {
    const self = damageHandler({id: 7, x: 32, y: 48});
    self.handler(7, damage);
    expect(self.combatFeedback.addImpact).not.toHaveBeenCalled();
    expect(self.infoManager.addDamageInfo).not.toHaveBeenCalled();
});

test('confirmed mob damage produces exactly one effect and passes the target identity to text lanes', () => {
    const mob = {id: 7, x: 32, y: 48};
    const self = damageHandler(mob);
    self.handler(7, 5);
    expect(self.combatFeedback.addImpact).toHaveBeenCalledTimes(1);
    expect(self.combatFeedback.addImpact).toHaveBeenCalledWith(mob, 5, 1200);
    expect(self.infoManager.addDamageInfo).toHaveBeenCalledWith(5, 32, 33, 'inflicted', 7);
});

test('late damage for an already removed entity is ignored', () => {
    const self = damageHandler(undefined);
    self.handler(7, 5);
    expect(self.combatFeedback.addImpact).not.toHaveBeenCalled();
});
