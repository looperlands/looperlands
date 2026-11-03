const fs = require('fs'), vm = require('vm');
function setup(reduced = false) {
    let now = 0, effects;
    const sound=jest.fn();
    const track = {children: [], style: {}, replaceChildren() {this.children=[];}, append(child) {this.children.push(child);}};
    const status = {textContent: ''}, classes = new Set();
    const context = {clearRect: jest.fn(), drawImage: jest.fn()};
    const stage = {querySelector: name => name === '.ps-reel-track' ? track : name === '.ps-ritual-status' ? status : {getContext: () => context},
        classList: {add: value => classes.add(value), remove: value => classes.delete(value)}};
    vm.runInNewContext(fs.readFileSync(__dirname+'/reforgefx.js','utf8'), {
        define: (_, factory) => {effects=factory();}, document: {createElement: () => ({})},
        window: {matchMedia: () => ({matches: reduced})}, performance: {now: () => now},
        Image: class {}, requestAnimationFrame: jest.fn(() => 1), cancelAnimationFrame: jest.fn()
    });
    return {fx: new effects.ReforgeFX(stage,['aoe','crit'],sound), track, status, classes, sound, time: value => {now=value;}};
}
test('the reel only reveals the confirmed trait and lands on its center slot',async () => {
    const f=setup();f.fx.tick(600);expect(f.classes.has('ps-revealed')).toBe(false);
    f.time(600);const done=f.fx.settle('crit');
    f.fx.tick(2100);expect(f.track.children[48].textContent).toBe('Critical strike');
    expect(f.track.style.transform).toBe('translateX(-4888px)');expect(f.status.textContent).toBe('Critical strike — forged!');
    f.fx.tick(3300);await done;expect(f.fx.stopped).toBe(true);expect(f.sound.mock.calls.map(row=>row[0])).toEqual(['chest','chat','achievement']);
});
test('closing a running reveal releases the purchase flow',async () => {
    const f=setup();const done=f.fx.settle('aoe');f.fx.stop();await done;expect(f.fx.stopped).toBe(true);expect(f.classes.has('ps-charging')).toBe(false);expect(f.sound).not.toHaveBeenCalledWith('achievement');
});
test('reduced motion completes without a spinning reel',async () => {
    const f=setup(true);await f.fx.settle('crit');expect(f.fx.stopped).toBe(true);expect(f.classes.has('ps-revealed')).toBe(false);expect(f.sound.mock.calls.map(row=>row[0])).toEqual(['chest','achievement']);
});
test('a slow response pauses effects without inventing a result and can resume',async () => {
    const f=setup();f.fx.tick(9000);expect(f.status.textContent).toContain('Waiting');expect(f.classes.has('ps-charging')).toBe(false);expect(f.classes.has('ps-revealed')).toBe(false);
    f.time(10000);const done=f.fx.settle('aoe');f.fx.tick(11500);f.fx.tick(12700);await done;expect(f.status.textContent).toBe('Area damage — forged!');
});
