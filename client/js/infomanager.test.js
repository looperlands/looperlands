const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(reducedMotion = false) {
    let InfoManager;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'infomanager.js'), 'utf8'), {
        define: factory => { InfoManager = factory(); },
        Class: {extend: methods => function (...args) { Object.assign(this, methods); this.init(...args); }},
        _: {each: (items, callback) => Object.entries(items).forEach(([key, value]) => callback(value, key))},
    });
    const game = {currentTime: 1000, app: {settings: {getReducedMotion: () => reducedMotion}}};
    return {info: new InfoManager(game), game};
}

test('same-target burst hits combine their exact amounts without restarting their flight', () => {
    const {info, game} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    game.currentTime += 50;
    info.addDamageInfo(5, 48, 48, 'inflicted', 7);
    const numbers = Object.values(info.infos);
    expect(numbers).toHaveLength(1);
    expect(numbers[0].value).toBe(15);
    expect(numbers[0].startedAt).toBe(1000);
    expect(numbers[0].initialX).toBe(28);
    expect(numbers[0].fillColor).toBe('white');
});

test('stacking ends 200 ms after the initial hit even while hits keep arriving', () => {
    const {info, game} = setup();
    for (const time of [1000, 1100, 1199, 1200, 1300, 1400]) {
        game.currentTime = time;
        info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    }
    const numbers = Object.values(info.infos);
    expect(numbers.map(number => number.value)).toEqual([15, 10, 5]);
    expect(numbers.map(number => number.initialX)).toEqual([28, 36, 24]);
    info.update(1650);
    expect(Object.values(info.infos).map(number => number.value)).toEqual([10, 5]);
});

test('different targets, text types and critical status never combine', () => {
    const {info} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 8);
    info.addDamageInfo(-5, 32, 48, 'received', 7);
    info.addDamageInfo('+5', 32, 48, 'healed', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 7, true);
    expect(Object.values(info.infos)).toHaveLength(5);
    const [normal, , , , critical] = Object.values(info.infos);
    expect(critical.initialX).not.toBe(normal.initialX);
    expect(critical.fillColor).toBe('#fce045');
    expect(critical.value).toBe('5!');
    expect(critical.baseScale).toBeGreaterThan(normal.baseScale);
    const sameTarget = Object.values(info.infos).filter((number, index) => index !== 1);
    expect(new Set(sameTarget.map(number => number.initialY)).size).toBe(4);
});

test.each([['healed', '+5', '+10'], ['received', -5, -10]])('%s retains its sign when stacking', (type, value, total) => {
    const {info} = setup();
    info.addDamageInfo(value, 32, 48, type, 1);
    info.addDamageInfo(value, 32, 48, type, 1);
    expect(Object.values(info.infos).map(number => number.value)).toEqual([total]);
});

test('emote and fishing labels remain independent and retain their old animation', () => {
    const {info} = setup();
    for (const type of ['emote', 'fishTrait']) {
        info.addDamageInfo('Hello', 32, 48, type);
        info.addDamageInfo('Hello', 32, 48, type);
    }
    info.update(1500);
    expect(Object.values(info.infos)).toHaveLength(4);
    for (const label of Object.values(info.infos)) {
        expect(label.combat).toBeUndefined();
        expect(label.value).toBe('Hello');
        expect(label.y).toBe(47);
    }
});

test.each([false, true])('XP rewards use combat motion and fading with reduced motion=%s', reducedMotion => {
    const {info} = setup(reducedMotion);
    info.addDamageInfo('+10 XP', 32, 48, 'xp');
    const xp = Object.values(info.infos)[0];
    expect(xp.value).toBe('+10 XP');
    expect(xp.fillColor).toBe('rgb(0, 0, 255)');
    info.update(1040);
    expect(xp.textScale).toBe(reducedMotion ? 1 : 1.45);
    info.update(1325);
    expect(xp.y).toBe(reducedMotion ? 48 : 42.5);
    expect(xp.x).toBe(reducedMotion ? 28 : 26);
    expect(xp.rotation).toBe(reducedMotion ? 0 : -0.04);
    expect(xp.opacity).toBe(1);
    info.update(1503.75);
    expect(xp.opacity).toBeCloseTo(0.25);
    info.update(1650);
    expect(Object.values(info.infos)).toHaveLength(0);
    expect(Object.keys(info.damageLanes)).toHaveLength(0);
    expect(Object.keys(info.damageStacks)).toHaveLength(0);
});

test('simultaneous XP rewards stay distinct and use separate animation lanes', () => {
    const {info} = setup();
    info.addDamageInfo('+10 XP', 32, 48, 'xp');
    info.addDamageInfo('+25 XP', 32, 48, 'xp');
    const rewards = Object.values(info.infos);
    expect(rewards.map(reward => reward.value)).toEqual(['+10 XP', '+25 XP']);
    expect(new Set(rewards.map(reward => reward.initialY)).size).toBe(2);
    expect(Object.keys(info.damageStacks)).toHaveLength(0);
});

test('combat text expires after a long frame gap and releases its lane state', () => {
    const {info} = setup();
    info.addDamageInfo(-5, 32, 48, 'received', 1);
    info.update(5000);
    expect(Object.keys(info.infos)).toHaveLength(0);
    expect(Object.keys(info.damageLanes)).toHaveLength(0);
    expect(Object.keys(info.damageStacks)).toHaveLength(0);
});

test.each([false, true])('reduced motion=%s preserves the readable hold and fade', reducedMotion => {
    const {info} = setup(reducedMotion);
    info.addDamageInfo('+5', 32, 48, 'healed', 1);
    info.update(1325);
    const number = Object.values(info.infos)[0];
    expect(number.y).toBe(reducedMotion ? 48 : 42.5);
    expect(number.x).toBe(reducedMotion ? 28 : 26);
    expect(number.opacity).toBe(1);
    if (reducedMotion) {
        expect(number.rotation).toBe(0);
        expect(number.textScale).toBe(number.baseScale);
    }
    expect(number.fillColor).toBe('rgb(80, 255, 80)');
    info.update(1503.75);
    expect(number.opacity).toBeCloseTo(0.25);
});

test('animation is independent of frame rate and larger amounts have bounded emphasis', () => {
    const direct = setup().info, stepped = setup().info;
    for (const manager of [direct, stepped]) manager.addDamageInfo(500, 32, 48, 'inflicted', 7);
    for (let time = 1000; time < 1520; time += 16) stepped.update(time);
    direct.update(1520); stepped.update(1520);
    const a = Object.values(direct.infos)[0], b = Object.values(stepped.infos)[0];
    for (const key of ['x', 'y', 'textScale', 'rotation', 'opacity']) expect(a[key]).toBeCloseTo(b[key]);
    const {info} = setup();
    info.addDamageInfo(1, 32, 48, 'inflicted', 1);
    info.addDamageInfo(1e12, 32, 48, 'inflicted', 2);
    const [small, large] = Object.values(info.infos);
    expect(large.baseScale).toBeGreaterThan(small.baseScale);
    expect(large.baseScale).toBeLessThanOrEqual(1.3);
    info.update(1040);
    expect(small.textScale).toBeGreaterThan(small.baseScale);
    info.update(1200);
    expect(small.textScale).toBe(small.baseScale);
});

test('clearing the manager discards text and lane state without reusing IDs', () => {
    const {info} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    const firstId = Object.keys(info.infos)[0];
    info.clear();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    expect(Object.keys(info.infos)).not.toContain(firstId);
    expect(Object.values(info.infos)[0].x).toBe(28);
});

test.each([1, 2, 3])('combat transforms and a defined font size reach the renderer at scale %s', scale => {
    const {info} = setup();
    info.addDamageInfo(25, 32, 48, 'inflicted', 7);
    info.addDamageInfo('+10 XP', 32, 48, 'xp');
    const sandbox = {define: (dependencies, factory) => {sandbox.Renderer = factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'), sandbox);
    const renderer = Object.assign(Object.create(sandbox.Renderer.prototype), {scale, game: {infoManager: info}});
    const [combat, xp] = renderer.drawCombatInfo();
    expect(combat).toMatchObject({fontSize: 10 * scale, fontWeight: 'bold', textScale: expect.any(Number), rotation: expect.any(Number)});
    expect(xp).toMatchObject({fontSize: 10 * scale, text: '+10 XP', fontWeight: 'bold', textScale: expect.any(Number), rotation: expect.any(Number)});
});


test.each([false,true])('combo labels share combat lanes, expire, and respect reduced motion=%s',reducedMotion=>{
    const {info,game}=setup(reducedMotion);
    info.addDamageInfo('+125 XP',32,48,'xp',1);
    info.addDamageInfo('2x combo',32,48,'combo',1);
    const labels=Object.values(info.infos), combo=labels[1];
    expect(combo.combat).toBe(true);expect(combo.fillColor).toBe('#fce045');
    expect(combo.initialY).not.toBe(labels[0].initialY);
    info.update(game.currentTime+40);
    expect(combo.textScale).toBe(reducedMotion?1:1.45);
    info.update(game.currentTime+650);expect(Object.values(info.infos)).toHaveLength(0);
});


test.each([false,true])('combo emphasis survives animation and reduced motion=%s',reducedMotion=>{
    const {info,game}=setup(reducedMotion);
    info.addDamageInfo('4x combo',32,48,'combo',1,false,{scale:1.4});
    const combo=Object.values(info.infos)[0];
    info.update(game.currentTime+40);
    expect(combo.textScale).toBeCloseTo(1.4*(reducedMotion?1:1.45));
    info.update(game.currentTime+200);
    expect(combo.textScale).toBeCloseTo(1.4);
});


test.each([false,true])('praise is a separate delayed tilted popup beside its combo with reduced motion=%s',reducedMotion=>{
    const {info,game}=setup(reducedMotion);
    info.addDamageInfo('4x combo',32,48,'combo',1,false,{scale:1.4,praise:'Awesome!',color:'#ffad49'});
    info.addDamageInfo('+175 XP',32,48,'xp',1);
    const [combo,praise,xp]=Object.values(info.infos);
    expect(combo).toMatchObject({fillColor:'#ffad49',strokeColor:'#352137',tilt:0,initialY:36});
    expect(praise).toMatchObject({value:'Awesome!',fontSize:7,initialX:combo.initialX+10,initialY:combo.initialY+14,opacity:0});
    expect(xp.initialY).toBe(16);
    info.update(game.currentTime+110);
    expect(praise.opacity).toBe(1);
    expect(praise.rotation).toEqual(reducedMotion?0:expect.any(Number));
    if (!reducedMotion) expect(praise.rotation).toBeLessThan(0);
    const sandbox={define:(dependencies,factory)=>{sandbox.Renderer=factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'lib/class.js'),'utf8'),sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'renderer.js'),'utf8'),sandbox);
    const renderer=Object.assign(Object.create(sandbox.Renderer.prototype),{scale:3,game:{infoManager:info}});
    const data=renderer.drawCombatInfo();
    expect(data).toHaveLength(3);
    expect(data[0]).toMatchObject({text:'4x combo',color:'#ffad49',fontSize:30});
    expect(data[1]).toMatchObject({text:'Awesome!',fontSize:21});
});

test.each([[false,false],[true,false],[false,true],[true,true]])('counter text stays close and separated: reduced motion %s, label first %s',(reduced,labelFirst)=>{
    const {info}=setup(reduced);
    const addDamage=()=>info.addDamageInfo(22,64,49,'inflicted',100,true);
    const addLabel=()=>info.addDamageInfo('Counter!',64,49,'combo',100,false,{motion:'counter'});
    const pair=labelFirst ? [addLabel(),addDamage()] : [addDamage(),addLabel()];
    const [damage,label]=labelFirst ? pair.reverse() : pair;
    expect(label.x-damage.x).toBe(20);expect(damage.y-label.y).toBe(24);
    const gap=label.x-damage.x;
    info.update(1300);
    if(reduced)expect(label.x-damage.x).toBe(gap);
    else {
        expect(label.x-damage.x).toBeGreaterThan(gap);
        expect(label.x-damage.x).toBeLessThanOrEqual(gap+8);
        expect(Math.abs(label.y-label.initialY)).toBeLessThan(6);
        expect(Math.abs(damage.y-damage.initialY)).toBeLessThan(6);
    }
});
