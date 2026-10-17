const vm = require('vm');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../sprites/clotharmor.json'), 'utf8'));

async function boot() {
    let now = 0, sequence = 0;
    const frames = new Map(), timers = new Map(), nodes = new Map(), events = new Map();
    const context2d = new Proxy({}, {get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true)});
    const node = id => {
        if (nodes.has(id)) return nodes.get(id);
        const listeners = new Map(), classes = new Set(id === 'preRunPanel' || id === 'leaderboardPanel' ? ['hidden'] : []);
        const el = {id, textContent: '', value: '', width: id === 'game' ? 960 : 160, height: id === 'game' ? 600 : 160,
            style: {}, dataset: {}, disabled: false,
            classList: {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); }},
            getContext: () => context2d, getBoundingClientRect: () => ({width:960, height:600}),
            addEventListener(type, cb) { const list = listeners.get(type) || []; list.push(cb); listeners.set(type, list); },
            click() { (listeners.get('click') || []).forEach(cb => cb({preventDefault(){}})); },
            querySelectorAll: () => [], select() {}, parentElement: {getBoundingClientRect: () => ({width:960, height:600})}
        };
        nodes.set(id, el); return el;
    };
    const send = jest.fn();
    const storage = new Map();
    const window = {
        LooperArcadeGuest: {connect: async () => ({name: 'Test Knight', avatar: {src: '/img/1/goldenarmor.png', config: {...config, scale:1.75}}}), send},
        addEventListener(type, cb) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(cb); },
        removeEventListener(type, cb) { events.get(type)?.delete(cb); },
        setTimeout: (cb, delay) => { const id = ++sequence; timers.set(id,{cb,at:now + delay}); return id; },
        location: {reload: jest.fn()}
    };
    const sandbox = {window, console, document: {getElementById: node, getElementsByTagName: () => [], querySelectorAll: () => [], addEventListener(){}},
        performance: {now: () => now},
        Audio: class { play() {return Promise.resolve();} pause() {} load() {} },
        Image: class {set src(value) {this._src = value; queueMicrotask(() => this.onload());}},
        ResizeObserver: class {observe() {}},
        requestAnimationFrame: cb => { const id = ++sequence; frames.set(id, cb); return id; },
        cancelAnimationFrame: id => frames.delete(id), setTimeout: window.setTimeout, clearTimeout: id => timers.delete(id),
        localStorage: {getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val)},
        Math: Object.assign(Object.create(Math), {random: () => .5})
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), sandbox);
    for (let i=0; i<8; i++) await Promise.resolve();
    function key(code, type = 'keydown') { [...events.get(type) || []].forEach(cb => cb({code, preventDefault(){}})); }
    function tick(count) {
        for (let i=0; i<count; i++) {
            now += 1000/60;
            for (const [id,timer] of [...timers]) if(timer.at <= now) {timers.delete(id); timer.cb();}
            const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(now));
        }
    }
    return {node, send, tick, key, storage, window};
}

test('avatar handoff loads and starting then firing updates the visible score', async () => {
    const f = await boot();
    expect(f.send).toHaveBeenCalledWith('loaded');
    expect(f.node('owlName').textContent).toBe('TEST KNIGHT');
    f.node('startBtn').click();
    expect(f.node('lives').textContent).toBe('LIVES: ❤️❤️❤️');
    f.key('Space'); f.tick(600); f.key('Space','keyup');
    expect(Number(f.node('score').textContent.replace('SCORE: ', ''))).toBeGreaterThan(0);
    expect(f.send.mock.calls.some(([type]) => type === 'result')).toBe(false);
});

test('a finished run emits one display-only result and Enter restarts it', async () => {
    const f = await boot();
    f.node('startBtn').click();
    f.tick(18000); // Let the formation reach the player without firing.
    const results = f.send.mock.calls.filter(([type]) => type === 'result');
    expect(results).toHaveLength(1);
    expect(results[0][1]).toEqual({score:0, level:1});
    expect(f.storage.size).toBe(1);
    f.key('Enter'); f.tick(1);
    expect(f.node('lives').textContent).toBe('LIVES: ❤️❤️❤️');
    expect(f.node('score').textContent).toBe('SCORE: 0');
});
