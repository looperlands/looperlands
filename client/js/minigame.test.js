const fs = require('fs');
const vm = require('vm');

function fixture() {
    const nodes = new Map();
    const document = {baseURI: 'https://game.example/_client/release/', handlers: []};
    const window = {location: {href: 'https://game.example/?sessionId=playing'}};
    let lastEvent;
    const matches = (node, selector) => selector === 'a[href="#"]'
        ? node.tag === 'a' && node.href === '#'
        : selector === `#${node.id}`;
    function dispatch(target, synthetic = false) {
        const event = lastEvent = {target, isTrigger: synthetic, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() { this.stopped = true; },
            stopImmediatePropagation() { this.stopped = this.immediate = true; }};
        for (let node = target; node; node = node.parent) {
            for (const handler of node.handlers.slice()) {
                if (handler.type !== 'click' || !matches(target, handler.selector)) continue;
                if (handler.callback.call(target, event) === false) {
                    event.preventDefault(); event.stopPropagation();
                }
                if (event.immediate) break;
            }
            if (event.stopped) break;
        }
        if (!event.defaultPrevented && target.tag === 'a') {
            window.location.href = new URL(target.href, document.baseURI).href;
        }
        return event;
    }
    function create(html, parent) {
        return [...html.matchAll(/<(\w+)\b([^>]*)>/g)].flatMap(([, tag, attributes]) => {
            const attrs = Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
            if (!attrs.id) return [];
            const node = {id: attrs.id, tag, href: attrs.href, parent, handlers: [], classes: new Set((attrs.class || '').split(' '))};
            node.click = () => dispatch(node);
            if (parent) nodes.set(node.id, node);
            return [node];
        });
    }
    function $(selector) {
        const elements = typeof selector !== 'string' ? (selector?.elements || (Array.isArray(selector) ? selector : [selector]))
            : selector.startsWith('<') ? create(selector)
            : selector.startsWith('#') ? [nodes.get(selector.slice(1))].filter(Boolean) : [];
        const collection = {elements, length: elements.length, 0: elements[0],
            append(content) {
                for (const parent of elements) {
                    if (typeof content === 'string') create(content, parent);
                    else for (const node of content.elements) { node.parent = parent; nodes.set(node.id, node); }
                }
                return this;
            },
            prepend(content) { return this.append(content); },
            on(type, selector, callback) {
                for (const node of elements) node.handlers.push({type: type.split('.')[0], selector, callback});
                return this;
            },
            off(type, selector) {
                for (const node of elements) node.handlers = node.handlers.filter(handler => handler.type !== type.split('.')[0] || handler.selector !== selector);
                return this;
            },
            trigger(type) { if (type === 'click') for (const node of elements) dispatch(node, true); return this; },
            addClass(value) { for (const node of elements) value.split(' ').forEach(name => node.classes.add(name)); return this; },
            removeClass(value) { for (const node of elements) value.split(' ').forEach(name => node.classes.delete(name)); return this; },
            hasClass(value) { return elements.some(node => node.classes.has(value)); },
            css(value, setting) { return typeof value === 'string' && setting === undefined ? (this.hasClass('hidden') ? 'none' : 'block') : this; },
            children() { return {length: 0}; },
            find() { return $([]); }, not() { return this; }, fadeOut() { return this; }};
        return collection;
    }
    for (const id of ['body', 'head', 'resources', 'resources-minigame', 'mgMenuStyle']) {
        nodes.set(id, {id, handlers: [], classes: new Set()});
    }
    // The production setup selects these by tag name.
    const select = selector => ['body', 'head'].includes(selector) ? $(`#${selector}`) : $(selector);
    const timeline = {to() { return this; }, play() {}, then(callback) { return Promise.resolve().then(callback); }};
    const context = {window, document, URLSearchParams, console: {log: jest.fn(), error: jest.fn()}, $: select,
        fetch: () => Promise.resolve({text: async () => ''}),
        gsap: {timeline: () => timeline, to: () => Promise.resolve()}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./minigame'), 'utf8'), context);
    return {context, $: select, window, event: () => lastEvent};
}

test.each(['native', 'synthetic'])('%s casino close preserves the session and runs existing callbacks', async mode => {
    const f = fixture();
    await f.context.setupMinigamePlatform();
    f.$('#minigame').append('<div id="luckyfunkz"></div>');
    await f.context.loadSpecificMinigame('luckyfunkz');
    const stopGame = jest.fn();
    f.$('#minigameMenu').on('click', '#mgClose', stopGame);

    if (mode === 'native') f.$('#mgClose')[0].click();
    else f.$('#mgClose').trigger('click');
    await Promise.resolve();

    expect(f.event().defaultPrevented).toBe(true);
    expect(stopGame).toHaveBeenCalledTimes(1);
    expect(f.$('#minigame').hasClass('active')).toBe(false);
    expect(f.$('#minigame').hasClass('hidden')).toBe(true);
    expect(f.window.location.href).toBe('https://game.example/?sessionId=playing');
});

test('MAIZ.fm and dynamically added help and payouts run without following the asset base', async () => {
    const f = fixture();
    await f.context.setupMinigamePlatform();
    const radio = f.context.loadMAIZFM = jest.fn();
    for (const id of ['mgJackAceHelp', 'mgPayouts']) {
        f.$('#minigameMenu').append(`<a href="#" id="${id}">Help</a>`);
        const openPanel = jest.fn();
        f.$('#minigameMenu').on('click', `#${id}`, openPanel);
        f.$(`#${id}`)[0].click();
        expect(openPanel).toHaveBeenCalledTimes(1);
        expect(f.event().defaultPrevented).toBe(true);
    }
    f.$('#mgMAIZfm')[0].click();
    expect(radio).toHaveBeenCalledTimes(1);
    expect(f.window.location.href).toBe('https://game.example/?sessionId=playing');
    expect(f.$('#minigame').hasClass('active')).toBe(true);
});

test('Escape during a spin respects pauseClose and still prevents navigation', async () => {
    const f = fixture();
    await f.context.setupMinigamePlatform();
    f.$('#minigame').append('<div id="luckyfunkz"></div>').addClass('pauseClose');
    await f.context.loadSpecificMinigame('luckyfunkz');
    const queueClose = jest.fn();
    f.$('#minigameMenu').on('click', '#mgClose', queueClose);

    f.context.minigameKeyDown({which: 27});

    expect(f.event().defaultPrevented).toBe(true);
    expect(queueClose).toHaveBeenCalledTimes(1);
    expect(f.$('#minigame').hasClass('active')).toBe(true);
    expect(f.window.location.href).toBe('https://game.example/?sessionId=playing');
});
