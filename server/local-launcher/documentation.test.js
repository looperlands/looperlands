const fs = require('fs');
const vm = require('vm');
const path = require('path');

class Element {
    constructor(tag, text = '') {this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.value = text;}
    append(...children) {this.children.push(...children);}
    replaceChildren(...children) {this.value = ''; this.children = children;}
    set textContent(value) {this.value = value; this.children = [];}
    get textContent() {return this.value + this.children.map(child => child.textContent).join('');}
    setAttribute(key, value) {this.attributes[key] = value;}
    removeAttribute(key) {delete this.attributes[key];}
    addEventListener() {}
}
function harness() {
    const content = new Element('article'), handlers = {}, pending = [];
    const location = {hash: '#documentation/mapmaker-toolbox', replace(value) {this.hash = value;}};
    const links = ['mapmaker-toolbox', 'mapmaker-sessions', 'mapmaker-building', 'mapmaker-quest-builder'].map(slug => {
        const link = new Element('a'); link.hash = '#documentation/' + slug; return link;
    });
    const fetch = jest.fn(() => new Promise(resolve => pending.push(resolve)));
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'documentation.js'), 'utf8'), {
        document: {getElementById: () => content, createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment'),
            createTextNode: text => new Element('#text', text), querySelectorAll: () => links, addEventListener() {}},
        window: {addEventListener: (name, handler) => {handlers[name] = handler;}, scrollTo: jest.fn()}, location, fetch, AbortSignal
    });
    return {content, pending, links, fetch, navigate: slug => {location.hash = '#documentation/' + slug; return handlers.hashchange();}};
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const respond = (resolve, source) => resolve({ok: true, text: async () => source});

test('renders repository guides as text and routes their guide links inside the toolbox', async () => {
    const h = harness();
    respond(h.pending[0], '# Toolbox\n\nRead **this guide** and [sessions](mapmaker-sessions.md).\n\n<script>unsafe()</script>\n\n```sh\nnode start.js\n```');
    await settle();
    expect(h.content.textContent).toContain('<script>unsafe()</script>');
    const all = element => [element, ...element.children.flatMap(all)];
    const elements = all(h.content);
    expect(elements.some(element => element.tagName === 'SCRIPT')).toBe(false);
    expect(elements.find(element => element.tagName === 'A').href).toBe('#documentation/mapmaker-sessions');
    expect(elements.find(element => element.tagName === 'PRE').textContent).toBe('node start.js');
    expect(h.links[0].attributes['aria-current']).toBe('page');
});

test('returning to a displayed guide cancels a pending guide from replacing it', async () => {
    const h = harness(); respond(h.pending[0], '# Overview'); await settle();
    const sessions = h.navigate('mapmaker-sessions');
    const overview = h.navigate('mapmaker-toolbox');
    respond(h.pending[2], '# Overview again'); await overview;
    respond(h.pending[1], '# Wrong late sessions'); await sessions;
    expect(h.content.textContent).toBe('Overview again');
    expect(h.links[0].attributes['aria-current']).toBe('page');
    expect(h.links[1].attributes['aria-current']).toBeUndefined();
});

test('a failed guide does not prevent returning to a previously loaded guide', async () => {
    const h = harness(); respond(h.pending[0], '# Overview'); await settle();
    const sessions = h.navigate('mapmaker-sessions'); h.pending[1]({ok: false}); await sessions;
    expect(h.content.textContent).toContain('could not load');
    const overview = h.navigate('mapmaker-toolbox');
    expect(h.fetch).toHaveBeenCalledTimes(3);
    respond(h.pending[2], '# Recovered overview'); await overview;
    expect(h.content.textContent).toBe('Recovered overview');
});
