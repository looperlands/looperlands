const fs = require('fs'), vm = require('vm');
const L = require('../../shared/js/mapmakerlighting');

async function setup(map = 'one') {
    let interaction, mounts = 0, nextId = 3;
    const payloads = [], document = {activeElement: null};
    function element(tag = 'div') {
        return {tag, children: [], hidden: false, value: '', attributes: {}, style: {}, classList: {toggle() {}},
            append(...nodes) {this.children.push(...nodes);}, replaceChildren(...nodes) {this.children = nodes;},
            setAttribute(name, value) {this.attributes[name] = value;}, addEventListener() {}, reportValidity: () => true,
            focus() {document.activeElement = this;},
            all() {return this.children.flatMap(child => [child, ...(child.all?.() || [])]);}
        };
    }
    const selectors = ['.lighting-save', '.lighting-reload', '#lighting-map', '.lighting-workspace', '.lighting-status', '.lighting-discard', '.lighting-discard-no', '.lighting-discard-yes', '.lighting-mode-hint', '.lighting-build', '.lighting-atmosphere', '.lighting-tools', '.lighting-view-controls', '.lighting-preview-status', '.lighting-map-host', '.world-content', '.world-list', '.lighting-count', '#lighting-search', '#lighting-filter'];
    const nodes = Object.fromEntries(selectors.map(selector => [selector, element()]));
    nodes['#lighting-search'].value = nodes['#lighting-filter'].value = '';
    const pane = {...element(), querySelector(selector) {
        if (selector === '.lighting-form') return nodes['.world-content'].all().find(node => node.className === 'lighting-form');
        if (selector === '.lighting-tools button') return nodes['.lighting-tools'].children.find(node => node.tag === 'button');
        return nodes[selector];
    }};
    pane.hidden = false;
    document.getElementById = () => pane;document.createElement = element;document.createTextNode = text => ({textContent: text});
    const one = {...L.preset('lamp', 8.5, 8.5), id: '1'}, two = {...L.preset('lamp', 18.5, 8.5), id: '2'};
    let data = {mapId: map, revision: 'initial', source: 'one.tmx', dimensions: {width: 40, height: 30, tilewidth: 16, tileheight: 16}, objects: map === 'empty' ? [] : [one, two]};
    let boot;
    const window = {MapmakerLighting: L, MapmakerObjectDrafts: require('./objectdrafts'), addEventListener() {}, matchMedia: () => ({matches: true}),
        ToolboxNavigation: {params: () => new URLSearchParams('map=' + map), route: (tool, handler) => {boot = handler;}},
        MapmakerCanvas: {attach(parent, id, options) {mounts++;interaction = options.interaction;return {ready: Promise.resolve(), draw() {}, fit() {}, destroy() {}};}}
    };
    const fetch = async (url, options = {}) => {
        let result;
        if (options.method === 'POST') {
            const body = JSON.parse(options.body);payloads.push(body);
            for(const change of body.operations){data.objects=data.objects.filter(row=>row.id!==change.objectId);if(change.operation!=='remove')data.objects.push({...change.object,id:change.objectId||String(nextId++)});}
            data = {...data, revision: 'saved'};result = data;
        } else if (url === './api/lighting') result = {maps: [map]};
        else if (url === './api/catalog') result = {maps: [{id: map, checkpoints: [{x: 12, y: 10, starting: true}]}]};
        else result = data;
        return {ok: true, json: async () => JSON.parse(JSON.stringify(result))};
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./lightingbuilder'), 'utf8'), {
        document, window, fetch, URLSearchParams, AbortSignal, Worker: class {}, setInterval: () => 1, clearInterval() {}
    });
    await boot(new URLSearchParams('map=' + map));
    const all = () => Object.values(nodes).flatMap(node => [node, ...node.all()]);
    const button = label => all().find(node => node.tag === 'button' && node.textContent === label);
    const field = label => {const node = all().find(node => node.tag === 'label' && node.textContent === label);return all().find(input => input.id === node.htmlFor);};
    const context = (x, y, shiftKey = false) => ({tile: {x, y}, screen: {x: x * 20, y: y * 20}, project: p => ({x: p.x * 20, y: p.y * 20}), shiftKey});
    return {nodes, button, field, context, get interaction() {return interaction;}, get mounts() {return mounts;}, payloads};
}

test('an empty map remains visible and choosing a preset waits for the actual click location', async () => {
    const h = await setup('empty');expect(h.mounts).toBe(1);
    h.button('Torch').onclick();expect(h.nodes['.lighting-save'].disabled).toBe(true);
    h.interaction.start(h.context(12.1, 10.8));h.interaction.end(h.context(12.1, 10.8), false);
    expect(h.field('X (tiles)').value).toBe(12.5);expect(h.field('Y (tiles)').value).toBe(10.5);
    expect(h.nodes['.lighting-save'].disabled).toBe(false);expect(h.mounts).toBe(1);
});

test('click placement and saving preserve the map viewport and persist the chosen tile', async () => {
    const h = await setup();h.button('Lamp').onclick();
    h.interaction.start(h.context(11.2, 14.1));h.interaction.end(h.context(11.2, 14.1), false);
    await h.nodes['.lighting-save'].onclick();
    const saved = h.payloads[0].operations[0];expect(saved.operation).toBe('add');
    expect(L.position(saved.object, {tilewidth: 16, tileheight: 16})).toEqual({x: 11.5, y: 14.5});
    expect(h.mounts).toBe(1);expect(h.nodes['.lighting-save'].disabled).toBe(true);
});

test('markers move directly and radius handles resize the saved source without a placement toggle', async () => {
    const h = await setup();
    h.interaction.start(h.context(8.5, 8.5));h.interaction.move(h.context(10.5, 9.5));h.interaction.end(h.context(10.5, 9.5), false);
    expect(h.field('X (tiles)').value).toBe(10.5);expect(h.field('Y (tiles)').value).toBe(9.5);
    h.interaction.start(h.context(14.5, 9.5));h.interaction.move(h.context(17.5, 9.5));h.interaction.end(h.context(17.5, 9.5), false);
    expect(h.field('Radius (tiles)').value).toBe(7);
    await h.nodes['.lighting-save'].onclick();expect(h.payloads[0].operations[0].object.properties.radius).toBe('7');expect(h.mounts).toBe(1);
});

test('cancelled gestures restore geometry and Shift-drag leaves panning to the map', async () => {
    const h = await setup();expect(h.interaction.start(h.context(8.5, 8.5, true))).toBe(false);
    h.interaction.start(h.context(8.5, 8.5));h.interaction.move(h.context(12.5, 10.5));h.interaction.end(h.context(12.5, 10.5), true);
    expect(h.field('X (tiles)').value).toBe(8.5);expect(h.nodes['.lighting-save'].disabled).toBe(true);
    h.button('Torch').onclick();expect(h.interaction.keydown({key: 'Escape'})).toBe(true);
    expect(h.interaction.start(h.context(30, 20))).toBe(false);expect(h.nodes['.lighting-save'].disabled).toBe(true);
});

test('switching markers retains both edits and saves them in one batch', async () => {
    const h=await setup();h.interaction.keydown({key:'ArrowRight'});
    h.interaction.start(h.context(18.5,8.5));h.interaction.end(h.context(18.5,8.5),false);
    expect(h.field('X (tiles)').value).toBe(18.5);h.interaction.keydown({key:'ArrowDown'});
    expect(h.payloads).toHaveLength(0);await h.nodes['.lighting-save'].onclick();
    expect(h.payloads).toHaveLength(1);expect(h.payloads[0].operations).toHaveLength(2);
    expect(L.position(h.payloads[0].operations[0].object,{tilewidth:16,tileheight:16})).toEqual({x:9.5,y:8.5});
    expect(L.position(h.payloads[0].operations[1].object,{tilewidth:16,tileheight:16})).toEqual({x:18.5,y:9.5});
});
test('a placement preset stays active for several additions before saving', async () => {
    const h=await setup('empty');h.button('Lamp').onclick();
    for(const [x,y]of [[6,6],[10,10],[14,14]]){h.interaction.start(h.context(x,y));h.interaction.end(h.context(x,y),false);}
    expect(h.payloads).toHaveLength(0);expect(h.nodes['.lighting-save'].textContent).toContain('(3)');
    await h.nodes['.lighting-save'].onclick();expect(h.payloads).toHaveLength(1);
    expect(h.payloads[0].operations).toHaveLength(3);expect(h.mounts).toBe(1);
});

test('keyboard moves stay within map bounds and shrinking radius keeps falloff valid', () => {
    const row = L.preset('lamp', 1, 1), dimensions = {width: 40, height: 30, tilewidth: 16, tileheight: 16};
    L.move(row, {x: -10, y: 100}, dimensions);expect(L.position(row, dimensions)).toEqual({x: 0, y: 29.9375});
    row.properties.innerRadius = '12';L.setRadius(row, 3);expect(row.properties).toMatchObject({radius: '3', innerRadius: '3'});
});
