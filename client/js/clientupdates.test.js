const fs = require('fs'), vm = require('vm');
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40), TICKET = 'c'.repeat(40);
const turn = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function fixture() {
    let ClientUpdates;
    vm.runInNewContext(fs.readFileSync(require.resolve('./clientupdates'), 'utf8'), {
        define: factory => {ClientUpdates = factory();}, URL, AbortSignal,
        setTimeout: function(...args) {if (this?.app) throw new Error('Illegal timer receiver'); return setTimeout(...args);},
        clearTimeout: function(...args) {if (this?.app) throw new Error('Illegal timer receiver'); return clearTimeout(...args);},
    });
    const links = [], meta = {content: OLD}, base = {href: '/_client/' + OLD + '/'};
    const parentNode = {insertBefore(next, sibling) {links.splice(sibling ? links.indexOf(sibling) : links.length, 0, next);}};
    function link(href, media = '') {
        const value = {href, media, parentNode, removed: false,
            get nextSibling() {return links[links.indexOf(value) + 1];},
            remove() {value.removed = true;}, cloneNode: () => link(value.href, value.media)};
        return value;
    }
    links.push(link('https://game.test/_client/' + OLD + '/css/main.css', 'screen'));
    const document = {querySelector: selector => selector === 'base' ? base : meta,
        querySelectorAll: () => links.filter(link => !link.removed)};
    const app = {sessionId: 'old-session', game: {started: true, client: {isReloading: false}, showNotification: jest.fn()}};
    const location = {href: 'https://game.test/?sessionId=old-session&map=main#hud', replace: jest.fn()};
    const fetch = jest.fn(async () => ({ok: true, json: async () => ({revision: OLD, serverRevision: OLD, mode: 'none', ready: true})}));
    const handlers = {}, socket = {on: jest.fn((event, fn) => {handlers[event] = fn;}), disconnect: jest.fn()};
    const updater = new ClientUpdates(app, {document, location, fetch});
    updater.started = true; updater.socket = socket;
    const reply = (data, ok = true) => fetch.mockResolvedValueOnce({ok, json: async () => data});
    return {updater, app, location, fetch, socket, handlers, meta, base, links, link, reply};
}

test('server-only releases keep the client and socket alive while advancing the asset base', async () => {
    const f = fixture(); f.reply({revision: NEW, mode: 'none', ready: true});
    await f.updater.check();
    expect(f.updater.revision).toBe(NEW); expect(f.base.href).toBe('/_client/' + NEW + '/');
    expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.socket.disconnect).not.toHaveBeenCalled();
    expect(f.location.replace).not.toHaveBeenCalled();
});

test('CSS replacements preserve order and become visible together only after every sheet loads', async () => {
    const f = fixture(); f.links.push(f.link('https://game.test/_client/' + OLD + '/css/hud.css'));
    const originals = f.links.slice();
    f.reply({revision: NEW, mode: 'css', ready: true});
    const check = f.updater.check(); await turn();
    const replacements = f.links.filter(link => !originals.includes(link));
    expect(replacements).toHaveLength(2);
    expect(f.links).toEqual([originals[0], replacements[0], originals[1], replacements[1]]);
    replacements[0].onload(); await turn();
    expect(originals.every(link => !link.removed)).toBe(true);
    expect(replacements.every(link => link.media === 'not all')).toBe(true);
    replacements[1].onload(); await check;
    expect(originals.every(link => link.removed)).toBe(true);
    expect(replacements.map(link => link.media)).toEqual(['screen', '']);
    expect(f.meta.content).toBe(NEW);
    expect(f.location.replace).not.toHaveBeenCalled(); expect(f.socket.disconnect).not.toHaveBeenCalled();
});

test('failed styles retain the old sheets and retry without adopting a partial release', async () => {
    const f = fixture(); f.reply({revision: NEW, mode: 'css', ready: true});
    const check = f.updater.check(); await turn();
    const [old, next] = f.links;
    next.onerror(); await check;
    expect(old.removed).toBe(false); expect(next.removed).toBe(true);
    expect(f.updater.revision).toBe(OLD); expect(f.location.replace).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
});

test('a stalled stylesheet times out and leaves the current game usable', async () => {
    const f = fixture(), styles = f.updater.styles(NEW);
    jest.advanceTimersByTime(10001);
    await expect(styles).rejects.toThrow('timed out');
    expect(f.links[0].removed).toBe(false); expect(f.links[1].removed).toBe(true);
});

test('a JavaScript change obtains a server ticket, disconnects cleanly and reloads the same game URL', async () => {
    const f = fixture();
    f.reply({revision: NEW, mode: 'reload', ready: true}); f.reply({revision: NEW, sessionId: TICKET});
    await f.updater.check();
    expect(f.fetch.mock.calls[1][0]).toBe('/session/old-session/client-reload');
    expect(JSON.parse(f.fetch.mock.calls[1][1].body)).toEqual({revision: NEW});
    expect(f.fetch.mock.calls[1][1]).toMatchObject({method: 'POST', credentials: 'same-origin', cache: 'no-store'});
    expect(f.app.game.client.isReloading).toBe(true); expect(f.socket.disconnect).toHaveBeenCalledTimes(1);
    const url = new URL(f.location.replace.mock.calls[0][0]);
    expect(url.origin).toBe('https://game.test'); expect(url.searchParams.get('map')).toBe('main');
    expect(url.hash).toBe('#hud'); expect(url.searchParams.get('sessionId')).toBe(TICKET);
    expect(url.searchParams.get('clientRevision')).toBe(NEW); expect(jest.getTimerCount()).toBe(0);
});

test.each(['combat', 'invalid ticket', 'stale ticket', 'network'])('a %s response keeps the old client and schedules a retry', async failure => {
    const f = fixture(); f.reply({revision: NEW, mode: 'reload', ready: true});
    if (failure === 'combat') f.reply({}, false);
    if (failure === 'invalid ticket') f.reply({revision: NEW, sessionId: 'bad'});
    if (failure === 'stale ticket') f.reply({revision: OLD, sessionId: TICKET});
    if (failure === 'network') f.fetch.mockRejectedValueOnce(new Error('offline'));
    await f.updater.check();
    expect(f.socket.disconnect).not.toHaveBeenCalled(); expect(f.location.replace).not.toHaveBeenCalled();
    expect(f.updater.revision).toBe(OLD); expect(jest.getTimerCount()).toBe(1);
});

test('a reboot handoff waits for the target server revision and completed map loading', async () => {
    const f = fixture();
    f.reply({revision: OLD, serverRevision: OLD, mode: 'none', ready: false});
    f.updater.waitForReboot({revision: NEW, sessionId: TICKET}); await turn();
    expect(f.app.game.client.isReloading).toBe(true); expect(f.location.replace).not.toHaveBeenCalled();
    f.reply({revision: NEW, serverRevision: NEW, ready: false}); await f.updater.check();
    expect(f.location.replace).not.toHaveBeenCalled();
    f.reply({revision: NEW, serverRevision: NEW, ready: true}); await f.updater.check();
    expect(f.location.replace).toHaveBeenCalledTimes(1);
    expect(new URL(f.location.replace.mock.calls[0][0]).searchParams.get('sessionId')).toBe(TICKET);
});

test('invalid reboot packets are ignored and a cancelled reboot restores normal client behavior', async () => {
    const f = fixture(); f.updater.started = false; f.updater.start(f.socket); await turn();
    f.updater.start(f.socket); expect(f.socket.on).toHaveBeenCalledTimes(3);
    f.handlers['server-reboot']({revision: 'bad', sessionId: TICKET});
    expect(f.updater.waiting).toBeUndefined();
    f.handlers['server-reboot']({revision: NEW, sessionId: TICKET}); await turn();
    expect(f.updater.waiting).toMatchObject({revision: NEW});
    f.handlers['server-reboot-cancelled']();
    expect(f.updater.waiting).toBeNull(); expect(f.app.game.client.isReloading).toBe(false);
    expect(f.socket.disconnect).not.toHaveBeenCalled();
});

test('polls and socket notifications cannot create overlapping reloads', async () => {
    const f = fixture(); let finish;
    f.fetch.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const first = f.updater.check(); await f.updater.check();
    expect(f.fetch).toHaveBeenCalledTimes(1);
    finish({ok: true, json: async () => ({revision: OLD, mode: 'none', ready: true})}); await first;
    expect(jest.getTimerCount()).toBe(1);
});

test('inactive games, disabled updates and malformed public releases never navigate', async () => {
    const f = fixture(); f.app.game.started = false;
    f.reply({revision: NEW, mode: 'reload', ready: true}); await f.updater.check();
    expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.location.replace).not.toHaveBeenCalled();
    f.reply({revision: '../invalid', mode: 'css', ready: true}); await f.updater.check();
    expect(f.updater.revision).toBe(OLD);
    f.updater.started = false; f.updater.revision = null;
    f.updater.start(f.socket); expect(f.socket.on).not.toHaveBeenCalled();
});
