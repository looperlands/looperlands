const fs = require('fs'), vm = require('vm');

async function setup(failure, options = {}) {
    let boot, mapOptions, failSave = false;
    const payloads = [], requests = [], listeners = {}, document = {activeElement: null};
    function element(tag = 'div') {
        const node = {tag, children: [], attributes: {}, classList: {toggle() {}},
            append(...children) {this.children.push(...children); if (this.tag === 'select' && !this.value) this.value = children[0]?.value;},
            prepend(...children) {this.children.unshift(...children);}, replaceChildren(...children) {this.children = []; this.append(...children);},
            setAttribute(key, value) {this.attributes[key] = value;}, addEventListener() {}, focus() {document.activeElement = this;},
            reportValidity: () => true, all() {return this.children.flatMap(child => [child, ...(child.all?.() || [])]);},
            querySelector(selector) {return this.all().find(child => selector === 'form' ? child.tag === 'form' : child.className?.split(' ').includes(selector.slice(1)));},
            getContext: () => ({drawImage() {}})};
        let value = ''; Object.defineProperty(node, 'value', {get: () => value, set: next => {value = String(next ?? '');}}); return node;
    }
    const selectors = ['.seasons-status', '.seasons-save', '.seasons-new', '.seasons-reload', '#seasons-map', '.seasons-workspace', '.seasons-discard', '.seasons-discard-no', '.seasons-discard-yes', '.seasons-mode', '.seasons-collisions', '.seasons-events', '.seasons-tabs', '.seasons-items', '.seasons-editor', '.seasons-preview', '.seasons-build', '.seasons-map-host', '.seasons-select', '.seasons-focus', '.seasons-map-column', '.seasons-columns'];
    const nodes = Object.fromEntries(selectors.map(selector => [selector, element()])), pane = element();
    pane.querySelector = selector => nodes[selector]; document.getElementById = () => pane; document.createElement = element;
    document.createTextNode = text => ({textContent: text});
    const event = {id: 'halloween', name: 'Halloween', enabled: false, availability: {annual: {start: '10-15', end: '11-09'}},
        actors: [{key: 'halloween:witch', kind: 'witch', label: 'Whispy', x: 4, y: 6}, {key: 'halloween:ghost', kind: 'ghost', label: 'Fisherman', x: 8, y: 9,
            area: {x: 7, y: 8, width: 8, height: 8}, route: [{x: 12, y: 13, waitSeconds: 8, activity: 'walking'}]}],
        decorations: [{image: '/img/1/pumpkin.png', x: 10, y: 10, width: 32, height: 24}],
        tiles: [{x: 14, y: 12, from: 22, colorShift: {colorDifference: {r: 10, g: -10, b: 0}, progress: 1}}],
        ambientSounds: [{id: 'well', name: 'Well', preset: 'water', x: 15, y: 17, radius: 6, volume: .4}],
        parallax: [{sceneId: 1, layers: [{image: '/img/parallax/mist.png', plane: 'foreground', width: 64, height: 64}]}], textOverrides: {hint: 'Existing override'}};
    const mapId = options.mapId || 'main';
    let data = {mapId, revision: 'initial', source: 'tools/seasons/' + mapId + '.json', events: options.empty ? [] : [event], activeEvents: [], catalog: {
        width: 40, height: 40, scenes: [{id: 1, name: 'Town', x: 0, y: 0, w: 20, h: 20}, {id: 2, name: 'Forest', x: 20, y: 0, w: 20, h: 20}],
        npcs: [{id: 'witch', name: 'Witch'}, {id: 'ghost', name: 'Ghost'}],
        registeredEvents: options.empty ? [] : [{id: 'halloween', requiredActors: event.actors.map(({key, kind}) => ({key, kind}))}],
        decorationImages: [{image: '/img/1/pumpkin.png', name: 'Pumpkin', url: '/local/api/seasons/image?image=pumpkin'}],
        ambientPresets: [{id: 'water', name: 'Water', radius: 8, volume: .5}], customSounds: [], storyLinks: [],
        storyTextConflicts: [{id: 'title', questId: 'SHADOW', field: 'name', value: 'Quest builder title'}],
        storyTexts: [{eventId: 'halloween', id: 'hint', label: 'Pumpkin direction', value: 'Existing override', original: 'Go west.', format: 'dialogue', maxLength: 1000},
            {eventId: 'halloween', id: 'title', label: 'Quest title', value: 'Missing shadow', original: 'Missing shadow', format: 'plain', maxLength: 120}]}};
    const copy = value => JSON.parse(JSON.stringify(value));
    const fetch = async (url, options = {}) => {
        requests.push(url);
        if ((failure === 'catalog' && url === './api/seasons') || (failure === 'map' && url.includes('?mapId='))) {failure = null; return {ok: false, json: async () => ({error: 'Temporary loading failure'})};}
        if (url === './api/entity-library') return {ok: true, json: async () => ({entries: []})};
        if (options.method === 'POST') {
            const body = JSON.parse(options.body); payloads.push(body);
            if (failSave) return {ok: false, status: 409, json: async () => ({error: 'Source changed on disk.'})};
            data = {...data, revision: 'saved', events: body.events}; return {ok: true, json: async () => copy(data)};
        }
        return {ok: true, json: async () => copy(url.includes('?mapId=') ? data : {maps: ['main', 'other']})};
    };
    const window = {addEventListener: (name, handler) => {listeners[name] = handler;},
        ToolboxNavigation: {route(name, handler) {boot = handler;}, params: () => new URLSearchParams('map=' + mapId)},
        ToolboxEntityPicker: {attach: jest.fn()},
        ToolboxEnvironment: {loadImages: async () => {}, renderParallax: jest.fn()}, ToolboxDialogueEditor: {attach: jest.fn()},
        MapmakerCanvas: {invalidate() {}, attach(parent, mapId, options) {mapOptions = options; return {map: {tiles: Array(1600).fill(22)}, draw() {}, set: jest.fn(), fit: jest.fn(), destroy() {}};}}};
    class Image {set src(value) {this.url = value; queueMicrotask(() => this.onload?.());}}
    class FixedDate extends Date {constructor(...args) {super(...(args.length ? args : ['2026-12-29T12:00:00Z']));}}
    vm.runInNewContext(fs.readFileSync(require.resolve('./seasonbuilder'), 'utf8'), {window, document, fetch, AbortSignal, URLSearchParams, Image, Date: FixedDate});
    await boot(new URLSearchParams('map=' + mapId));
    const all = () => Object.values(nodes).flatMap(node => [node, ...node.all()]);
    const button = label => all().find(node => node.tag === 'button' && node.textContent === label);
    const field = label => {const control = all().find(node => node.tag === 'label' && node.textContent === label); return control ? all().find(node => node.id === control.htmlFor) : undefined;};
    const edit = (label, value, change = false) => {const input = field(label); input.value = value; input[change ? 'onchange' : 'oninput'](); return input;};
    return {nodes, payloads, requests, window, listeners, button, field, edit, get map() {return mapOptions;}, stale() {failSave = true;}};
}

test('inactive registered content remains editable and map movement preserves actor identity', async () => {
    const h = await setup(); expect(h.button('Halloween · disabled')).toBeDefined();
    h.button('Actors (2)').onclick(); expect(h.field('Actor label').value).toBe('Whispy');
    h.button('Move tile on map').onclick(); h.map.onPick({x: 5, y: 7});
    expect(h.field('Tile X').value).toBe('5'); expect(h.field('Tile Y').value).toBe('7');
    await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[0]).toMatchObject({mapId: 'main', revision: 'initial', events: [{enabled: false, actors: [{key: 'halloween:witch', kind: 'witch', x: 5, y: 7}, {}]}]});
    expect(h.nodes['.seasons-status'].textContent).toContain('Build main');
    expect(h.nodes['.seasons-status'].textContent).toContain('fresh playtest');
});

test('map selection exposes another category and stale saves retain the full multi-category draft', async () => {
    const h = await setup(); h.map.onPick({x: 10, y: 10});
    expect(h.field('Decoration image').value).toBe('/img/1/pumpkin.png');
    h.edit('Tile X', 11); h.button('Sounds (1)').onclick(); h.edit('Radius (tiles)', 12);
    h.button('Actors (2)').onclick(); h.edit('Actor label', 'Whispy moved'); h.stale(); await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[0].events[0]).toMatchObject({actors: [{label: 'Whispy moved'}, {}], decorations: [{x: 11}], ambientSounds: [{radius: 12}]});
    expect(h.nodes['.seasons-status'].textContent).toContain('draft is still here'); expect(h.nodes['.seasons-save'].disabled).toBe(false);
    h.nodes['.seasons-reload'].onclick(); expect(h.nodes['.seasons-discard'].hidden).toBe(false);
    h.nodes['.seasons-discard-no'].onclick(); expect(h.field('Actor label').value).toBe('Whispy moved');
    const event = {preventDefault: jest.fn()}; h.listeners.beforeunload(event); expect(event.preventDefault).toHaveBeenCalled();
});

test('one-time timestamps are authored in UTC and switching tabs does not lose the draft', async () => {
    const h = await setup(); h.edit('Availability', 'once', true);
    h.edit('Starts at (UTC, included)', '2027-10-31T18:00'); h.edit('Ends at (UTC, excluded)', '2027-11-01T02:00:30');
    h.button('Layers (1)').onclick();
    expect(h.window.ToolboxEnvironment.renderParallax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({parallax: expect.objectContaining({sceneId: 1})}), expect.anything(), {allowDisable: false, allowPlaced: false, planes: ['ground', 'foreground']});
    await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[0].events[0].availability).toEqual({startsAt: '2027-10-31T18:00:00Z', endsAt: '2027-11-01T02:00:30Z'});
});

test('story overrides stay sparse, search preserves edits and reset restores the baseline', async () => {
    const h = await setup(); h.button('Story text').onclick(); expect(h.field('Pumpkin direction').value).toBe('Existing override');
    h.edit('Pumpkin direction', 'Follow the bridge east.'); h.edit('Search story text', 'title');
    expect(h.field('Pumpkin direction')).toBeUndefined(); h.edit('Quest title', 'The wandering shadow');
    h.edit('Search story text', 'Pumpkin'); h.button('Reset to original text').onclick();
    expect(h.field('Pumpkin direction').value).toBe('Go west.');
    await h.nodes['.seasons-save'].onclick(); expect(h.payloads[0].events[0].textOverrides).toEqual({title: 'The wandering shadow'});
});

test('decoration map preview uses the same implicit frame size as the runtime', async () => {
    const h = await setup(); const context = {save() {}, restore() {}, beginPath() {}, arc() {}, stroke() {}, fillText() {}, drawImage: jest.fn()};
    const view = {project: point => ({x: point.x * 16, y: point.y * 16}), scale: 16};
    h.map.interaction.draw(context, view); await Promise.resolve(); h.map.interaction.draw(context, view);
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 32, 24, 160, 160, 32, 24);
});

test('Quest builder conflicts show the effective value without replacing editable seasonal text', async () => {
    const h = await setup(); h.button('Story text').onclick();
    expect(h.field('Quest title').value).toBe('Missing shadow');
    const content = h.nodes['.seasons-editor'].all();
    expect(content.some(node => node.textContent === 'Quest builder title')).toBe(true);
    expect(content.find(node => node.textContent === 'Edit SHADOW in Quest builder').href).toBe('#quests/?map=main&quest=SHADOW');
});

test.each(['catalog', 'map'])('Reload recovers an initial %s load failure without a draft', async failure => {
    const h = await setup(failure); expect(h.nodes['.seasons-status'].textContent).toBe('Temporary loading failure');
    await h.nodes['.seasons-reload'].onclick(); expect(h.map).toBeDefined(); expect(h.button('Halloween · disabled')).toBeDefined();
});

test('an empty map can create a seasonal event and custom actor with stable IDs and a UTC week window', async () => {
    const h = await setup(undefined, {mapId: 'other', empty: true});
    h.nodes['.seasons-new'].onclick(); h.edit('Event name', 'Winter visitors');
    expect(h.field('Start month-day (UTC, included)').value).toBe('12-29');
    expect(h.field('End month-day (UTC, excluded)').value).toBe('01-05');
    h.button('Actors (0)').onclick(); h.button('Add actor').onclick(); h.map.onPick({x: 9, y: 12});
    expect(h.window.ToolboxEntityPicker.attach).toHaveBeenCalledWith(expect.anything(), {type: 'npc', label: 'NPC kind'});
    h.edit('NPC kind', 'ghost', true); h.edit('Actor label', 'Winter messenger'); await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[0]).toMatchObject({mapId: 'other', events: [{id: 'seasonal_event_1', name: 'Winter visitors', enabled: true,
        availability: {annual: {start: '12-29', end: '01-05'}}, actors: [{key: 'seasonal_event_1:actor_1', kind: 'ghost', label: 'Winter messenger', x: 9, y: 12}],
        decorations: [], tiles: [], parallax: [], ambientSounds: [], textOverrides: {}}]});
    h.button('Story text').onclick();
    expect(h.nodes['.seasons-editor'].all().find(node => node.textContent === 'Open Quest builder').href).toBe('#quests/?map=other');
});

test('registered events and required actors stay protected while extra actors and custom events can be removed', async () => {
    const h = await setup(); expect(h.button('Remove event from draft')).toBeUndefined();
    h.button('Actors (2)').onclick(); expect(h.field('NPC kind')).toBeUndefined(); expect(h.field('Greeting (optional)')).toBeUndefined(); expect(h.button('Remove actor from draft')).toBeUndefined();
    h.button('Add actor').onclick(); expect(h.field('NPC kind')).toBeDefined(); h.button('Remove actor from draft').onclick();
    expect(h.button('Remove actor from draft')).toBeUndefined();
    h.nodes['.seasons-new'].onclick(); h.nodes['.seasons-new'].onclick(); h.button('Remove event from draft').onclick();
    h.edit('Event name', 'Keep this event'); await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[0].events.map(event => event.id)).toEqual(['halloween', 'seasonal_event_1']);
    expect(h.payloads[0].events[0].actors.map(actor => actor.key)).toEqual(['halloween:witch', 'halloween:ghost']);
});

test('custom actor greetings use the styled editor and clearing text removes the optional field', async () => {
    const h = await setup(undefined, {empty: true}); h.nodes['.seasons-new'].onclick();
    h.button('Actors (0)').onclick(); h.button('Add actor').onclick(); h.map.onPick({x: 9, y: 12});
    const input = h.edit('Greeting (optional)', 'Welcome to the winter gathering.');
    expect(input.maxLength).toBe(400);
    expect(h.window.ToolboxDialogueEditor.attach).toHaveBeenCalledWith(input, {label: 'Seasonal actor greeting'});
    await h.nodes['.seasons-save'].onclick(); expect(h.payloads[0].events[0].actors[0].greeting).toBe('Welcome to the winter gathering.');
    h.edit('Greeting (optional)', ''); await h.nodes['.seasons-save'].onclick();
    expect(h.payloads[1].events[0].actors[0]).not.toHaveProperty('greeting');
});
