const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync(require.resolve('./toolboxnavigation.js'), 'utf8');
function setup(hash) {
    const listeners = {}, document = {addEventListener: (event, fn) => {listeners[event] = fn;}};
    const window = {addEventListener: (event, fn) => {listeners[event] = fn;}};
    const location = {hash};
    vm.runInNewContext(code, {document, window, location, URLSearchParams, queueMicrotask, console});
    return {nav: window.ToolboxNavigation, location, listeners};
}
const settled = () => new Promise(resolve => setImmediate(resolve));
test('parses a nested editor route and URL-encoded identifiers', () => {
    const {nav} = setup('#npcs/behaviour/?map=one&routine=night%20guard');
    expect(nav.screen()).toBe('npcs');
    expect(nav.params().get('routine')).toBe('night guard');
});
test('applies each hash once despite pane and hash events, and reapplies after returning', async () => {
    const {nav, location, listeners} = setup('#doors/?map=one&object=99');
    const handler = jest.fn(); nav.route('doors', handler); await settled();
    listeners['toolbox:pane'](); listeners.hashchange(); await settled();
    expect(handler).toHaveBeenCalledTimes(1);
    location.hash = '#inspector'; listeners.hashchange(); await settled();
    location.hash = '#doors/?map=one&object=99'; listeners.hashchange(); await settled();
    expect(handler).toHaveBeenCalledTimes(2);
});
test('serializes asynchronous editor loads and applies the newest queued target', async () => {
    const {nav, location, listeners} = setup('#quests/?map=one');
    let release; const visits = [];
    nav.route('quests', async params => {visits.push(params.get('map')); if (visits.length === 1) await new Promise(resolve => {release = resolve;});});
    await settled(); location.hash = '#quests/?map=two'; listeners.hashchange(); await settled();
    expect(visits).toEqual(['one']); release(); await settled();
    expect(visits).toEqual(['one', 'two']);
});
