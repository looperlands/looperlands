const fs = require('fs'), vm = require('vm');

function setup({entries = [], fail = false} = {}) {
    const document = {activeElement: null, addEventListener: jest.fn()}, images = [];
    function element(tag) {
        const attrs = {}, classes = new Set();
        const node = {tag, children: [], value: '', textContent: '', tabIndex: 0, validity: {valid: true}, listeners: {},
            classList: {add: key => classes.add(key), toggle(key, enabled) {if (enabled) classes.add(key);else classes.delete(key);}},
            append(...nodes) {for (const child of nodes) {child.remove();this.children.push(child);child.parent = this;}},
            before(child) {const parent = this.parent, index = parent.children.indexOf(this);parent.children.splice(index, 0, child);child.parent = parent;},
            replaceChildren(...nodes) {for (const child of this.children) child.parent = null;this.children = [];this.append(...nodes);},
            remove() {if (this.parent) {this.parent.children.splice(this.parent.children.indexOf(this), 1);this.parent = null;}},
            setAttribute(key, value) {attrs[key] = value;}, getAttribute: key => attrs[key], removeAttribute(key) {delete attrs[key];},
            matches() {return this.disabled || this.parentDisabled;}, closest() {return this.inert ? {} : null;},
            addEventListener(type, callback) {(this.listeners[type] ||= []).push(callback);},
            dispatchEvent(event) {this['on' + event.type]?.(event);for (const callback of this.listeners[event.type] || []) callback(event);},
            click() {this.onclick?.();}, focus() {document.activeElement = this;this.dispatchEvent({type: 'focus'});},
            querySelectorAll(tag) {return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]);},
            querySelector(tag) {return this.querySelectorAll(tag)[0];},
            showModal() {this.open = true;}, close() {this.open = false;},
            getBoundingClientRect: () => ({left: 100, right: 600, top: 100, bottom: 500}),
            getContext: () => ({drawImage: jest.fn()})
        };
        Object.defineProperties(node, {options: {get: () => node.children}, childElementCount: {get: () => node.children.length}, isConnected: {get: () => !!node.parent}, labels: {get: () => document.body.querySelectorAll('label').filter(label => label.htmlFor === node.id)}});
        return node;
    }
    document.createElement = element;document.body = element('body');
    document.querySelectorAll = () => [...document.body.querySelectorAll('select'), ...document.body.querySelectorAll('input')];
    const window = {}, fetch = jest.fn(async () => ({ok: !fail, json: async () => ({entries})}));
    vm.runInNewContext(fs.readFileSync(require.resolve('./entitypicker'), 'utf8'), {
        window, document, fetch, AbortSignal, Event: class {constructor(type) {this.type = type;}}, MutationObserver: class {observe() {}},
        Image: class {constructor() {images.push(this);}}
    });
    function mount(choices, value = '', options = {}, tag = 'select') {
        const control = element(tag);control.id = 'source';control.value = value;
        for (const choice of choices) control.append(Object.assign(element('option'), {value: String(choice.id), textContent: choice.name}));
        const label = Object.assign(element('label'), {htmlFor: 'source', textContent: 'Test entity'});document.body.append(label, control);
        const picker = window.ToolboxEntityPicker.attach(control, options);
        return {control, picker, label};
    }
    const dialog = () => document.body.children.find(node => node.tag === 'dialog');
    const results = () => dialog().querySelectorAll('div').find(node => node.className === 'entity-picker-results');
    const search = value => {const input = dialog().querySelector('input');input.value = value;input.oninput();};
    return {document, window, fetch, mount, dialog, results, search, images};
}
const assets = [{id: 'rat', kind: 2, type: 'mob', name: 'Rat'}, {id: 'guard', kind: 40, type: 'npc', name: 'Guard'}];

test('search matches display names, canonical IDs, numeric kinds and all query words', () => {
    const {window: {ToolboxEntityPicker: picker}} = setup();
    expect(picker.resolve({id: '40'}, assets, 'npc')).toBe(assets[1]);
    expect(picker.resolve({id: 'GUARD'}, assets, 'npc')).toBe(assets[1]);
    expect(picker.resolve({id: '40'}, assets, 'mob')).toBeUndefined();
    expect(picker.matches({id: '40', name: 'City sentry'}, 'CITY guard 40', assets[1])).toBe(true);
    expect(picker.matches({id: '40', name: 'City sentry'}, 'city rat', assets[1])).toBe(false);
});

test('selection preserves the original ID and dispatches existing model events once', () => {
    const h = setup(), choices = [{id: '40', name: 'Guard'}, {id: '41', name: 'King'}];
    const {control, picker, label} = h.mount(choices, '40', {type: 'npc'}), events = [];
    for (const type of ['input', 'change']) control.addEventListener(type, () => events.push([type, control.value]));
    expect(label.htmlFor).toBe(picker.trigger.id);
    picker.trigger.click();h.search('king');h.results().children[0].click();
    expect(control.value).toBe('41');expect(events).toEqual([['input', '41'], ['change', '41']]);
    expect(h.document.activeElement).toBe(picker.trigger);
    picker.trigger.click();h.search('king');h.results().children[0].click();expect(events).toHaveLength(2);
    expect(h.window.ToolboxEntityPicker.attach(control)).toBe(picker);
});

test('optional empty choices clear values while browsing and cancellation do not edit them', () => {
    const h = setup(), {control, picker} = h.mount([{id: '', name: 'No reward'}, {id: 'wood', name: 'Wood'}], 'wood', {type: 'item'});
    picker.trigger.click();h.search('missing');expect(h.results().querySelectorAll('button')).toHaveLength(0);
    h.dialog().querySelector('button').click();expect(control.value).toBe('wood');
    picker.trigger.click();h.search('no reward');h.results().children[0].click();expect(control.value).toBe('');
});

test('outside clicks dismiss the picker without edits and return focus to its trigger', () => {
    const h = setup(), {control, picker} = h.mount([{id: 'rat', name: 'Rat'}], 'rat', {type: 'mob'}), changed = jest.fn();
    control.addEventListener('change', changed);picker.trigger.click();
    const panel = h.dialog();
    const pointer = (type, x, y, target = panel) => panel.dispatchEvent({type, clientX: x, clientY: y, target});
    pointer('pointerdown', 110, 110);pointer('click', 110, 110);expect(h.dialog()).toBe(panel);
    pointer('pointerdown', 10, 10);pointer('click', 10, 10);
    expect(h.dialog()).toBeUndefined();expect(control.value).toBe('rat');expect(changed).not.toHaveBeenCalled();
    expect(h.document.activeElement).toBe(picker.trigger);
});

test('dragging from the panel to its backdrop does not dismiss it', () => {
    const h = setup(), {picker} = h.mount([{id: 'rat', name: 'Rat'}], 'rat', {type: 'mob'});picker.trigger.click();
    const panel = h.dialog();
    panel.dispatchEvent({type: 'pointerdown', clientX: 150, clientY: 150, target: panel.querySelector('input')});
    panel.dispatchEvent({type: 'click', clientX: 10, clientY: 10, target: panel});
    expect(h.dialog()).toBe(panel);
});

test('required selects exclude placeholder choices and preserve unavailable current values', () => {
    const h = setup(), {control, picker} = h.mount([{id: '', name: 'Choose'}, {id: 'rat', name: 'Rat'}], 'old', {type: 'mob'});
    control.required = true;picker.refresh();picker.trigger.click();
    expect(h.results().querySelectorAll('button')).toHaveLength(1);expect(control.value).toBe('old');
    expect(picker.trigger.getAttribute('aria-label')).toContain('old');
    control.disabled = true;picker.refresh();expect(picker.trigger.disabled).toBe(true);
    h.results().children[0].click();expect(control.value).toBe('old');
});

test('input adapters keep their own catalog scope and optional empty entry', () => {
    const h = setup(), {control, picker} = h.mount([], 'rat', {type: 'mob', entries: [{id: '', name: 'All mobs'}, {id: 'rat', name: 'Rat'}]}, 'input');
    picker.trigger.click();h.search('all mobs');h.results().children[0].click();expect(control.value).toBe('');
    picker.update({enabled: false});expect(picker.trigger.hidden).toBe(true);expect(control.getAttribute('aria-hidden')).toBeUndefined();
    picker.update({enabled: true});expect(control.getAttribute('aria-hidden')).toBe('true');
});

test('sprite fetching is shared and numeric catalogs resolve real sprite previews', async () => {
    const h = setup({entries: assets}), first = h.mount([{id: '40', name: 'Sentry'}], '40', {type: 'npc'});
    h.mount([{id: '2', name: 'Rat'}], '2', {type: 'mob'});
    await new Promise(resolve => setImmediate(resolve));
    expect(h.fetch).toHaveBeenCalledTimes(1);
    first.picker.trigger.click();h.search('guard 40');expect(h.results().querySelectorAll('button')).toHaveLength(1);
});

test('preview failures retain selectable text results and permit a later retry', async () => {
    const h = setup({fail: true}), {picker, control} = h.mount([{id: 'rat', name: 'Rat'}], '', {type: 'mob'});
    await new Promise(resolve => setImmediate(resolve));
    picker.trigger.click();h.results().children[0].click();expect(control.value).toBe('rat');
    expect(h.fetch).toHaveBeenCalledTimes(2);
});

test('saved assets refresh sprite metadata in mounted pickers without changing the selection', async () => {
    const entries = [], h = setup({entries}), {control, picker} = h.mount([{id: '3', name: 'Custom'}], '3', {type: 'npc'});
    await new Promise(resolve => setImmediate(resolve));
    entries.push({id: 'newnpc', kind: 3, type: 'npc'});
    h.document.addEventListener.mock.calls.find(([type]) => type === 'toolbox:assets-saved')[1]();
    await new Promise(resolve => setImmediate(resolve));
    expect(h.fetch).toHaveBeenCalledTimes(2);expect(control.value).toBe('3');
    picker.trigger.click();h.search('newnpc');expect(h.results().querySelectorAll('button')).toHaveLength(1);
});

test('sprite previews crop the idle animation frame and keep pixel scaling', () => {
    const h = setup(), frame = h.window.ToolboxEntityPicker.thumbnail({id: 'rat', preview: {url: 'rat.png', width: 16, height: 24, row: 3}});
    const canvas = {imageSmoothingEnabled: true, drawImage: jest.fn()};
    // A real canvas is populated only after the sprite image has loaded.
    expect(frame.children[0].textContent).toBe('RA');expect(h.images[0].src).toBe('rat.png');
    const original = h.document.createElement;h.document.createElement = tag => {const node = original(tag);if (tag === 'canvas') node.getContext = () => canvas;return node;};
    const loaded = h.window.ToolboxEntityPicker.thumbnail({id: 'rat', preview: {url: 'rat.png', width: 16, height: 24, row: 3}});
    h.images[1].onload();expect(loaded.children[0].tag).toBe('canvas');expect(canvas.imageSmoothingEnabled).toBe(false);
    expect(canvas.drawImage.mock.calls[0].slice(1, 5)).toEqual([0, 72, 16, 24]);
});
