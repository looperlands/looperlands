const fs = require('fs');
const path = require('path');
const vm = require('vm');
let Guide;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8'), {
    define: (dependencies, factory) => {Guide = factory({}, {}, {bat: {width: 32, height: 48, animations: {idle_down: {row: 8}}}});}
});
const unknown = {id: 'hidden', category: 'monsters', state: 'unknown', name: null, completion: 'defeat'};
const encountered = {...unknown, id: 'known', name: 'Bat', state: 'discovered'};
const completed = {...encountered, id: 'done', state: 'completed'};
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
});
test('a response from the previous map cannot appear after the player changes map', async () => {
    const source = fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8');
    let resolve, Loaded;
    vm.runInNewContext(source, {define: (dependencies, factory) => {Loaded = factory({}, {}, {});}, axios: {get: () => new Promise(done => {resolve = done;})}});
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
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fieldguide.js'), 'utf8'), {define: (dependencies, factory) => {Loaded = factory({}, {}, {});}, axios: {get}});
    const guide = Object.create(Loaded.prototype);
    Object.assign(guide, {opened: true, request: 0, mapId: 'main', view: 'quests', app: {sessionId: 'session', game: {mapId: 'main'}}, render: jest.fn()});
    await guide.load();
    expect(get.mock.calls[0][0]).toBe('/session/session/quests');
    expect(guide.quests).toBe(records);
    expect(guide.data).toBeUndefined();
});
