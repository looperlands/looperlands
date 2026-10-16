const fs = require('fs');
const path = require('path');
const vm = require('vm');
let Guide;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8'), {
    define: (dependencies, factory) => {Guide = factory({}, {bat: {width: 32, height: 48, animations: {idle_down: {row: 8}}}});}
});
const unknown = {id: 'hidden', category: 'monsters', state: 'unknown', name: null, completion: 'defeat'};
const encountered = {...unknown, id: 'known', name: 'Bat', state: 'discovered'};
const completed = {...encountered, id: 'done', state: 'completed'};
test('Current map shows active and completed local quests without changing the other views', () => {
    const records = [{id: 'local', status: 'IN_PROGRESS', mapIds: ['main']},
        {id: 'shared', status: 'COMPLETED', mapIds: ['main', 'cave']},
        {id: 'other', status: 'IN_PROGRESS', mapIds: ['farm']}, {id: 'unscoped', status: 'IN_PROGRESS'}];
    expect(Guide.filterQuests(records, 'current-map', 'main').map(q => q.id)).toEqual(['local', 'shared']);
    expect(Guide.filterQuests(records, 'current-map', 'cave').map(q => q.id)).toEqual(['shared']);
    expect(Guide.filterQuests(records, 'current-map', 'unknown')).toEqual([]);
    expect(Guide.filterQuests(records, 'IN_PROGRESS', 'main').map(q => q.id)).toEqual(['local', 'other', 'unscoped']);
    expect(Guide.filterQuests(records, 'all', 'main')).toHaveLength(4);
});
test('entry status distinguishes encountering a monster from beating it', () => {
    expect(Guide.status(encountered)).toBe('Encountered');
    expect(Guide.status(completed)).toBe('Defeated');
});
test('receiving a fish does not label it caught', () => {
    expect(Guide.status({...encountered, category: 'fish', completion: 'catch'})).toBe('Obtained · Not caught');
});
test('tall sprite frames fit the slot without revealing other rows of the atlas', () => {
    const style = Guide.spriteStyle('bat');
    expect(style.height).toBe('48px');
    expect(style.backgroundPosition).toBe('0px -384px');
    expect(Number(style.transform.slice(6, -1)) * 48).toBeLessThanOrEqual(40);
    expect(Guide.spriteStyle('missing')).toBeNull();
    const enlarged = Guide.spriteStyle('bat', 128, 4);
    expect(Number(enlarged.transform.slice(6, -1)) * 48).toBe(128);
    expect(enlarged.backgroundPosition).toBe(style.backgroundPosition);
});
test('only supported quest medals reference the existing atlas', () => {
    expect(Guide.medalStyle(3)).toEqual({backgroundPosition: '-48px -222px'});
    expect(Guide.medalStyle(20)).toEqual({backgroundPosition: '-264px -274px'});
    for (const invalid of [undefined, null, 0, -1, 21, '3', 1.5]) expect(Guide.medalStyle(invalid)).toBeNull();
});
test('entry details float beside the tile and flip left at the viewport edge', () => {
    const tile = {left: 100, right: 156, top: 180, bottom: 236, width: 56};
    expect(Guide.popoverPosition(tile, {width: 280, height: 180}, {width: 1000, height: 700})).toEqual({left: 164, top: 180});
    expect(Guide.popoverPosition({...tile, left: 900, right: 956}, {width: 280, height: 180}, {width: 1000, height: 700})).toEqual({left: 612, top: 180});
});
test('narrow-screen details fit above or below their tile and stay inside the viewport', () => {
    const tile = {left: 124, right: 180, top: 250, bottom: 306, width: 56};
    expect(Guide.popoverPosition(tile, {width: 276, height: 180}, {width: 300, height: 500})).toEqual({left: 12, top: 62});
    expect(Guide.popoverPosition({...tile, top: 20, bottom: 76}, {width: 276, height: 180}, {width: 300, height: 500})).toEqual({left: 12, top: 84});
});
test('the fixed Journal uses its own scroll containers for clipping, independent of page scrolling', () => {
    let Loaded;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8'), {
        define: (dependencies, factory) => {Loaded = factory({}, {});},
        document: {documentElement: {clientWidth: 900}}, window: {innerHeight: 600},
        getComputedStyle: () => ({overflowX: 'auto', overflowY: 'auto'})
    });
    let tile = {left: 55, right: 111, top: 424, bottom: 480, width: 56};
    const details = {style: {}, getBoundingClientRect: () => ({width: 280, height: 250})};
    const root = {parentElement: {getBoundingClientRect: () => {throw new Error('Page clipping must not affect a fixed overlay');}},
        querySelector: selector => selector === '.fg-selected' ? anchor : details};
    const column = {parentElement: root, getBoundingClientRect: () => ({left: 53, right: 318, top: 164, bottom: 487})};
    const anchor = {parentElement: column, getBoundingClientRect: () => tile};
    Loaded.prototype.positionDetails.call({root, opened: true});
    expect(details.hidden).toBe(false);
    expect(details.style.left).toBe('119px');
    tile = {...tile, top: 80, bottom: 136};
    Loaded.prototype.positionDetails.call({root, opened: true});
    expect(details.hidden).toBe(true);
});
test('a response from the previous map cannot appear after the player changes map', async () => {
    const source = fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8');
    let resolve, Loaded;
    vm.runInNewContext(source, {define: (dependencies, factory) => {Loaded = factory({}, {});}, axios: {get: () => new Promise(done => {resolve = done;})}});
    const instance = Object.create(Loaded.prototype);
    Object.assign(instance, {opened: true, request: 0, mapId: 'first', app: {sessionId: 'session', game: {mapId: 'first'}}, render: jest.fn()});
    const request = instance.load();
    instance.app.game.mapId = 'second';
    resolve({data: {map: 'first', entries: []}});
    await request;
    expect(instance.data).toBeUndefined();
    expect(instance.render).not.toHaveBeenCalled();
});
test('Escape closes the guide and keyboard events never reach movement handlers', () => {
    const guide = {opened: true, close: jest.fn()};
    const event = {key: 'Escape', preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    Guide.prototype.keyboard.call(guide, event);
    expect(guide.close).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
});
test('Journal shortcuts switch between Quests and Field Guide and preserve text input', () => {
    const guide = {opened: true, view: 'field-guide', switchView: jest.fn(), close: jest.fn()};
    const event = {key: 'x', target: {matches: () => false}, preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    Guide.prototype.keyboard.call(guide, event);
    expect(guide.switchView).toHaveBeenCalledWith('quests');
    guide.view = 'quests';
    Guide.prototype.keyboard.call(guide, event);
    expect(guide.close).toHaveBeenCalled();
    guide.switchView.mockClear(); guide.close.mockClear();
    event.target.matches = () => true;
    Guide.prototype.keyboard.call(guide, event);
    expect(guide.close).not.toHaveBeenCalled();
    expect(guide.switchView).not.toHaveBeenCalled();
});
test('the quest tab loads existing quest records rather than inventing new progress', async () => {
    let Loaded;
    const records = [{id: 'existing', name: 'A local adventure', status: 'IN_PROGRESS', objectives: [{label: 'Talk to a friend', count: 0, amount: 1}]}];
    const get = jest.fn().mockResolvedValue({data: records});
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8'), {define: (dependencies, factory) => {Loaded = factory({}, {});}, axios: {get}});
    const guide = Object.create(Loaded.prototype);
    Object.assign(guide, {opened: true, request: 0, mapId: 'main', view: 'quests', app: {sessionId: 'session', game: {mapId: 'main'}}, render: jest.fn()});
    await guide.load();
    expect(get.mock.calls[0][0]).toBe('/session/session/quests');
    expect(guide.quests).toBe(records);
    expect(guide.data).toBeUndefined();
});
