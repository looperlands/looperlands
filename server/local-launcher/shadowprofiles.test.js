const vm = require('vm');
const fs = require('fs');

function node(tag = 'div') {
    const events = {};
    return {tag, value: '', children: [], style: {}, dataset: {}, clientWidth: 320, clientHeight: 200, scrollLeft: 0, scrollTop: 0,
        classList: {toggle() {}}, setAttribute(key, val) {this[key] = val;}, getAttribute(key) {return this[key];},
        append(...children) {this.children.push(...children);}, prepend(child) {this.children.unshift(child);},
        replaceChildren(...children) {this.children = children;}, get options() {return this.children;},
        addEventListener(key, listener) {events[key] = listener;}, emit(key) {return events[key]?.();},
        reportValidity: () => true, checkValidity: () => true, focus() {}, scrollTo() {}, click() {return this.onclick?.();},
        setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 320}),
        all() {return this.children.flatMap(c => [c, ...c.all()]);}, querySelector(s) {return this.all().find(c => c.tag === s);}
    };
}

const body = {name: 'Town tree', bounds: [15, 28, 49, 78], shape: 'round-crown', front: 14, slope: .6,
    depth: 24, crownBottom: 36, foliageColors: ['#00aa44'], trunk: [12, 19]};
const data = id => ({mapId: id, tileset: id, artWidth: 320, artHeight: 320, mapWidth: 160, mapHeight: 160,
    revision: 'v1', artwork: '/local/art/' + id, bodies: id === 'main' ? [JSON.parse(JSON.stringify(body))] : [], paint: [], outdoors: []});

async function setup() {
    const controls = new Map(), pane = node(), posts = [], loads = [], listeners = {};
    pane.querySelector = selector => {
        if (!controls.has(selector)) controls.set(selector, node());
        return controls.get(selector);
    };
    const base = './api/shadow-profiles', settle = () => new Promise(resolve => setImmediate(resolve));
    let route;
    const window = {addEventListener: (name, listener) => {listeners[name] = listener;},
        ToolboxNavigation: {route: (_, listener) => {route = listener;}}};
    const fetch = async (url, init) => {
        let result;
        if (init?.method === 'POST') {
            const post = JSON.parse(init.body); posts.push(post);
            result = {...data(post.mapId), ...post, revision: 'v2'};
        } else if (url === base) result = {maps: [{id: 'main'}, {id: 'empty'}]};
        else {const id = url.split('=')[1]; loads.push(id); result = data(id);}
        return {ok: true, json: async () => result};
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./shadowprofiles'), 'utf8'), {document: {getElementById: () => pane, createElement: tag => node(tag)},
        window, fetch, Image: class {}, setTimeout: () => 1, clearTimeout() {}});
    await route(new URLSearchParams('map=main')); await settle();
    const get = selector => controls.get(selector);
    const field = label => get('.sp-fields').all().find(n => n.children[0]?.tag === 'label' && n.children[0].textContent === label).children[1];
    const mode = key => get('.sp-modes').children.find(n => n.dataset.key === key).click();
    return {get, field, mode, posts, loads, listeners, settle};
}

test('renaming a specialized tree retains its geometry and saves the revision with all three draft collections', async () => {
    const h = await setup(), name = h.field('Body name');
    name.value = 'River tree'; name.emit('input');
    h.mode('paint'); h.get('#sp-add').click();
    h.mode('outdoors'); h.get('#sp-add').click();
    expect(h.posts).toHaveLength(0);
    await h.get('#sp-save').click();
    expect(h.posts).toEqual([{mapId: 'main', revision: 'v1', bodies: [{...body, name: 'River tree'}],
        paint: [[0, 0, 16, 16]], outdoors: [{x: 0, y: 0, width: 8, height: 8}]}]);
    expect(h.get('#sp-save').disabled).toBe(true);
});

test('the same editable body can be drawn in reverse and selection includes the last touched native pixel', async () => {
    const h = await setup(), surface = h.get('.sp-stage');
    const pointer = (x, y) => ({button: 0, pointerId: 7, clientX: x, clientY: y});
    surface.onpointerdown(pointer(50, 88)); surface.onpointerup(pointer(11, 22));
    expect(h.get('#sp-save').disabled).toBe(false);
    await h.get('#sp-save').click();
    expect(h.posts[0].bodies[0]).toEqual({...body, bounds: [11, 22, 51, 89]});
});

test('keeping an unsaved deletion protects the draft, discarding allows another map to load', async () => {
    const h = await setup(), maps = h.get('#sp-map');
    h.get('#sp-delete').click();
    const leave = {preventDefault: jest.fn()}; h.listeners.beforeunload(leave);
    expect(leave.preventDefault).toHaveBeenCalled();
    maps.value = 'empty'; maps.onchange();
    expect(h.get('.sp-discard').hidden).toBe(false);
    h.get('.sp-discard-no').click();
    expect(h.loads).toEqual(['main']); expect(maps.value).toBe('main');
    maps.value = 'empty'; maps.onchange(); h.get('.sp-discard-yes').click(); await h.settle();
    expect(h.loads).toEqual(['main', 'empty']); expect(h.get('#sp-save').disabled).toBe(true);
    expect(h.posts).toHaveLength(0);
});

test('a new rounded crown takes editable defaults and field limits from its actual crop', async () => {
    const h = await setup(); h.get('#sp-add').click();
    const surface = h.get('.sp-stage');
    surface.onpointerdown({button: 0, pointerId: 4, clientX: 20, clientY: 10});
    surface.onpointerup({pointerId: 4, clientX: 59, clientY: 69});
    const shape = h.field('Shape'); shape.value = 'round-crown'; shape.emit('change');
    expect(h.field('Crown bottom').max).toBe('60');
    expect(h.field('Front height').max).toBe('160');
    expect(h.field('Ground depth').max).toBe('255');
    const palette = h.field('Foliage colors'); palette.value = '#aabbcc, #002233'; palette.emit('input');
    await h.get('#sp-save').click();
    expect(h.posts[0].bodies.at(-1)).toMatchObject({shape: 'round-crown', bounds: [20, 10, 60, 70],
        trunk: [16, 24], crownBottom: 43, depth: 19, foliageColors: ['#aabbcc', '#002233']});
});

test('the cast preview includes distant branches, faint penumbra and the artwork with a clear border on every side', () => {
    const context = {importScripts() {}, self: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./shadowprofilepreview-worker'), 'utf8'), context);
    const w = 70, h = 80, pixels = new Uint8ClampedArray(w * h * 4);
    for (const [x, y, alpha] of [[3, 36, 1], [45, 66, 2], [65, 32, 99]]) pixels[4 * (y * w + x) + 3] = alpha;
    const ground = {width: w, height: h, getContext: () => ({getImageData: () => ({data: pixels})})};
    expect(context.castBounds(ground, 16, {width: 24, height: 33})).toEqual({x: -3, y: 10, width: 75, height: 63});
});
