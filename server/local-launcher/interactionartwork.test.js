const fs = require('fs'), vm = require('vm');
const Templates = require('../../shared/js/interactiontemplates');

function setup(options = {}) {
    const contexts = [], images = [];
    function element(tag) {
        const context = {clearRect: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), strokeRect: jest.fn()};
        const node = {tag, children: [], attributes: {}, isConnected: true, textContent: '',
            append(...nodes) {this.children.push(...nodes);}, replaceChildren(...nodes) {this.children = nodes;},
            setAttribute(key, value) {this.attributes[key] = value;}, focus: jest.fn(),
            getContext: () => context, getBoundingClientRect: () => ({left: 0, top: 0, width: 256, height: 128})};
        if (tag === 'canvas') contexts.push({node, context});
        return node;
    }
    const el = (tag, text = '', attrs = {}) => Object.assign(element(tag), {textContent: text, ...attrs});
    const data = {width: 5, height: 5, tilesize: 16, tileset: '/tiles.png', tiles: Array(25).fill([1, 3])};
    const window = {MapmakerCanvas: {load: jest.fn(async () => data)}};
    class Image {
        constructor() {this.width = 256; this.height = 32; images.push(this);}
        set src(value) {this.url = value; if (!options.delayed) Promise.resolve().then(() => options.error ? this.onerror() : this.onload());}
    }
    vm.runInNewContext(fs.readFileSync(require.resolve('./interactionartwork'), 'utf8'), {window, Image});
    const action = Templates.create('switch');
    action.appearances = {one: {initialTile: 0, stages: {use: 3, turn_off: 0}}, two: {initialTile: 2, stages: {use: 4}}};
    const form = el('form');
    const c = {action, form, el, mapId: 'one', interactionId: 'switch', touch: jest.fn(),
        data: {document: {placements: [{action: 'switch', x: 2, y: 2, width: 2, height: 1}]}},
        button(parent, label, run, attrs = {}) {const node = el('button', label, attrs); node.onclick = run; parent.append(node); return node;},
        section(parent, label, help) {const node = el('section'); node.append(el('h3', label), el('p', help)); parent.append(node); return node;}};
    const nodes = () => {const walk = node => [node, ...node.children.filter(n => n && typeof n === 'object').flatMap(walk)]; return walk(form);};
    const button = label => nodes().find(n => n.tag === 'button' && (n.ariaLabel === label || n.textContent === label));
    const flush = async () => {for (let i = 0; i < 10; i++) await Promise.resolve();};
    return {api: window.MapmakerInteractionArtwork, c, action, contexts, images, el, nodes, button, flush};
}

test('original artwork draws the real placement layers and overlays use Tiled tile IDs', async () => {
    const h = setup(), canvas = h.el('canvas', '', {width: 48, height: 48});
    await h.api.preview(canvas, 'one', 0, {x: 2, y: 2});
    const context = h.contexts[0].context;
    expect(context.drawImage.mock.calls.map(call => call.slice(1, 3))).toEqual([[0, 0], [32, 0]]);
    context.drawImage.mockClear();
    await h.api.preview(canvas, 'one', 17, {x: 2, y: 2});
    expect(context.drawImage.mock.calls.at(-1).slice(1)).toEqual([0, 16, 16, 16, 0, 0, 48, 48]);
});

test('a pending image cannot overwrite a newer appearance preview', async () => {
    const h = setup({delayed: true}), canvas = h.el('canvas', '', {width: 48, height: 48});
    const first = h.api.preview(canvas, 'one', 3), second = h.api.preview(canvas, 'one', 17);
    await h.flush(); h.images[0].onload(); await Promise.all([first, second]);
    expect(h.contexts[0].context.drawImage).toHaveBeenCalledTimes(1);
    expect(h.contexts[0].context.drawImage.mock.calls[0].slice(1, 3)).toEqual([0, 16]);
});

test('every action has artwork controls; browsing previews is clean and choosing preserves other states and maps', async () => {
    const h = setup(); h.api.render(h.c); await h.flush();
    expect(h.button('Choose tile · After “Turn off”')).toBeTruthy();
    const after = h.nodes().find(n => n.tag === 'button' && n.children.some(child => child.textContent === 'After “Turn on”'));
    after.onclick(); expect(h.c.touch).not.toHaveBeenCalled();
    h.button('Choose tile · After “Turn on”').onclick(); await h.flush();
    const grid = h.nodes().find(n => n.tag === 'canvas' && n.width === 512);
    // The used-tile list is [1, 3]. At half its CSS size, the first cell still selects tile 1.
    grid.onclick({clientX: 8, clientY: 8});
    expect(h.action.appearances.one).toEqual({initialTile: 0, stages: {use: 1, turn_off: 0}});
    expect(h.action.appearances.two).toEqual({initialTile: 2, stages: {use: 4}});
    expect(h.c.touch).toHaveBeenCalledTimes(1);
    h.button('Choose tile · After “Turn on”').onclick(); await h.flush();
    h.button('Use original map artwork').onclick();
    expect(h.action.appearances.one.stages).toEqual({use: 0, turn_off: 0});
    expect(h.button('Choose tile · After “Turn on”').focus).toHaveBeenCalled();
});

test('keyboard navigation can select the first tile, close without changes, and jump to a tile outside map usage', async () => {
    const h = setup(); h.api.render(h.c);
    h.button('Choose tile · Before the first action').onclick(); await h.flush();
    let grid = h.nodes().find(n => n.tag === 'canvas' && n.width === 512);
    const key = key => ({key, preventDefault() {}});
    grid.onkeydown(key('Escape')); expect(h.c.touch).not.toHaveBeenCalled();
    h.button('Choose tile · Before the first action').onclick(); await h.flush();
    grid = h.nodes().find(n => n.tag === 'canvas' && n.width === 512);
    grid.onkeydown(key('Enter')); expect(h.action.appearances.one.initialTile).toBe(1);
    h.button('Choose tile · Before the first action').onclick(); await h.flush();
    const jump = h.nodes().find(n => n.tag === 'input'); jump.value = '17'; h.button('Show tile').onclick();
    grid = h.nodes().find(n => n.tag === 'canvas' && n.width === 512); grid.onkeydown(key('Enter'));
    expect(h.action.appearances.one.initialTile).toBe(17);
});

test('unplaced interactions and artwork failures explain the recovery without marking data dirty', async () => {
    const h = setup({error: true}); h.c.data.document.placements = [];
    h.api.render(h.c); await h.flush();
    expect(h.nodes().some(n => n.textContent.includes('Build this map'))).toBe(true);
    expect(h.c.touch).not.toHaveBeenCalled();
});

test('existing defaults match runtime resolution until this map has its own appearance', () => {
    const h = setup(); delete h.action.appearances.one;
    h.action.initialTile = 8; h.action.stages[0].tile = 9;
    expect(h.api.appearance(h.action, 'one')).toEqual({initialTile: 8, stages: {use: 9, turn_off: 0}});
    h.action.appearances.one = {initialTile: 0, stages: {}};
    expect(h.api.appearance(h.action, 'one')).toEqual({initialTile: 0, stages: {}});
});
