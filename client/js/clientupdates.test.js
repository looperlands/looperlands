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
    const elements = new Map(['client-recovery', 'client-recovery-message', 'client-recovery-reconnect'].map(id => [id, {hidden:true, textContent:''}]));
    const document = {baseURI:'https://game.test/_client/' + OLD + '/', querySelector: selector => selector === 'base' ? base : meta,
        getElementById: id => elements.get(id), querySelectorAll: () => links.filter(link => !link.removed)};
    const app = {sessionId: 'old-session', storage: {loadData:jest.fn().mockResolvedValue()},
        game: {started: true, client: {isReloading: false}, showNotification: jest.fn()}};
    const location = {href: 'https://game.test/?sessionId=old-session&map=main#hud', replace: jest.fn()};
    const apiFetch = jest.fn(async () => ({ok: true, json: async () => ({revision: OLD, serverRevision: OLD, mode: 'none', ready: true})}));
    const assets = jest.fn(async () => ({ok:true, arrayBuffer:async () => new ArrayBuffer(0)}));
    const fetch = jest.fn((url, options) => String(url).includes('/_client/') ? assets(url, options) : apiFetch(url, options));
    const handlers = {}, socket = {on: jest.fn((event, fn) => {handlers[event] = fn;}), disconnect: jest.fn()};
    const updater = new ClientUpdates(app, {document, location, fetch, now:() => Date.now()});
    updater.started = true; updater.socket = socket;
    const reply = (data, ok = true) => apiFetch.mockResolvedValueOnce({ok, json: async () => data});
    return {updater, app, location, fetch, apiFetch, assets, elements, socket, handlers, meta, base, links, link, reply};
}

test('server-only releases keep the client and socket alive while advancing the asset base', async () => {
    const f = fixture(); f.reply({revision: NEW, mode: 'none', ready: true});
    await f.updater.check();
    expect(f.updater.revision).toBe(NEW); expect(f.base.href).toBe('/_client/' + NEW + '/');
    expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.socket.disconnect).not.toHaveBeenCalled();
    expect(f.location.replace).not.toHaveBeenCalled();
});

test('map switches move update listeners to the new socket without duplicating the polling loop', async () => {
    const f = fixture();
    f.socket.off = jest.fn();
    f.updater.started = false;
    f.updater.start(f.socket);
    await turn();
    const originalHandlers = {...f.handlers};
    expect(jest.getTimerCount()).toBe(1);
    const nextHandlers = {}, nextSocket = {on: jest.fn((event, fn) => {nextHandlers[event] = fn;})};
    const requests = f.apiFetch.mock.calls.length;

    f.updater.start(nextSocket);
    f.updater.start(nextSocket);
    expect(f.socket.off).toHaveBeenCalledTimes(3);
    for (const [event, handler] of Object.entries(originalHandlers)) {
        expect(f.socket.off).toHaveBeenCalledWith(event, handler);
    }
    expect(nextSocket.on).toHaveBeenCalledTimes(3);
    expect(f.updater.socket).toBe(nextSocket);
    expect(jest.getTimerCount()).toBe(1);
    expect(f.apiFetch).toHaveBeenCalledTimes(requests);
    nextHandlers['client-update']();
    await turn();
    expect(f.apiFetch).toHaveBeenCalledTimes(requests + 1);
    expect(jest.getTimerCount()).toBe(1);
});

test('release checks pause during map travel and retain the retry loop', async () => {
    const f = fixture();
    f.app.game.mapTransition = {active: true};
    await f.updater.check();
    expect(f.apiFetch).not.toHaveBeenCalled();
    expect(f.location.replace).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    f.app.game.mapTransition.active = false;
    jest.advanceTimersByTime(5000);
    await turn();
    expect(f.apiFetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
});

test.each([false, true])('a warmed release cannot reload a map switch in progress (reboot=%s)', async reboot => {
    const f = fixture();
    f.reply({revision: NEW, mode: 'reload', ready: true, serverRevision: NEW});
    if (reboot) f.updater.waiting = {sessionId: TICKET, revision: NEW};
    let completeWarm;
    f.updater.warmAssets = jest.fn(() => new Promise(resolve => {completeWarm = resolve;}));
    const check = f.updater.check();
    await turn();
    expect(f.updater.warmAssets).toHaveBeenCalledTimes(1);
    f.app.game.mapTransition = {active: true};
    f.app.game.started = false;
    completeWarm();
    await check;
    expect(f.apiFetch).toHaveBeenCalledTimes(1);
    expect(f.location.replace).not.toHaveBeenCalled();
    expect(f.socket.disconnect).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
});

test('a reload ticket issued for the previous map session cannot navigate after travel', async () => {
    const f = fixture();
    f.updater.warmAssets = jest.fn().mockResolvedValue();
    let completeTicket;
    f.apiFetch.mockImplementationOnce(async () => ({ok: true, json: async () => ({revision: NEW, mode: 'reload', ready: true})}));
    f.apiFetch.mockImplementationOnce(() => new Promise(resolve => {completeTicket = resolve;}));
    const check = f.updater.check();
    await turn();
    expect(f.apiFetch).toHaveBeenCalledTimes(2);
    f.app.sessionId = 'next-map-session';
    completeTicket({ok: true, json: async () => ({sessionId: TICKET, revision: NEW})});
    await check;
    expect(f.location.replace).not.toHaveBeenCalled();
    expect(f.socket.disconnect).not.toHaveBeenCalled();
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
    expect(f.apiFetch.mock.calls[1][0]).toBe('/session/old-session/client-reload');
    expect(JSON.parse(f.apiFetch.mock.calls[1][1].body)).toEqual({revision: NEW});
    expect(f.apiFetch.mock.calls[1][1]).toMatchObject({method: 'POST', credentials: 'same-origin', cache: 'no-store'});
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
    if (failure === 'network') f.apiFetch.mockRejectedValueOnce(new Error('offline'));
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
    f.apiFetch.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const first = f.updater.check(); await f.updater.check();
    expect(f.fetch).toHaveBeenCalledTimes(1);
    finish({ok: true, json: async () => ({revision: OLD, mode: 'none', ready: true})}); await first;
    expect(jest.getTimerCount()).toBe(1);
});

test('assets including worker sprite images warm fully before requesting a ticket or disconnecting', async () => {
    const f = fixture();
    f.app.game.mapId = 'main';
    f.app.game.spritesets = [{rat:{filepath:'https://game.test/_client/' + OLD + '/img/1/rat.png'},
        background:{id:'NFT_background',filepath:'https://game.test/_client/' + OLD + '/img/1/background.png'},
        external:{filepath:'https://assets.test/avatar.png'}}];
    f.app.game.entities = {player:{sprite:{filepath:'https://game.test/_client/' + OLD + '/img/1/visible.png'}}};
    f.updater.performance = {getEntriesByType:() => [{name:'https://game.test/_client/' + OLD + '/js/mapworker.js'}]};
    let finish;
    f.assets.mockReturnValue(new Promise(resolve => {finish=resolve;}));
    f.reply({revision:NEW, mode:'reload', ready:true, files:['js/home.js']});
    f.reply({revision:NEW, sessionId:TICKET});
    const update = f.updater.check(); await turn();
    expect(f.assets.mock.calls.length).toBe(4);
    expect(f.apiFetch).toHaveBeenCalledTimes(1);
    expect(f.socket.disconnect).not.toHaveBeenCalled();
    expect(f.app.game.client.isReloading).toBe(false);
    finish({ok:true, arrayBuffer:async () => new ArrayBuffer(0)});
    await update;
    const urls=f.assets.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://game.test/_client/' + NEW + '/img/1/rat.png');
    expect(urls).toContain('https://game.test/_client/' + NEW + '/img/1/visible.png');
    expect(urls).not.toContain('https://game.test/_client/' + NEW + '/img/1/background.png');
    expect(urls).toContain('https://game.test/_client/' + NEW + '/maps/world_client_main.js');
    expect(urls).not.toContain('https://assets.test/avatar.png');
    expect(f.assets.mock.calls.every(([, options]) => options.cache === 'force-cache')).toBe(true);
    expect(f.socket.disconnect).toHaveBeenCalledTimes(1);
});

test('an unavailable asset leaves the current game playable and retries before freezing the player', async () => {
    const f=fixture();
    f.reply({revision:NEW,mode:'reload',ready:true});
    f.assets.mockResolvedValueOnce({ok:false});
    await f.updater.check();
    expect(f.apiFetch).toHaveBeenCalledTimes(1);
    expect(f.socket.disconnect).not.toHaveBeenCalled();
    expect(f.app.game.client.isReloading).toBe(false);
    expect(f.updater.warmedRevision).toBeUndefined();
    expect(jest.getTimerCount()).toBe(1);
});

test('removed assets do not block a valid new release and a changed map is warmed before handoff', async () => {
    const f=fixture(); f.app.game.mapId='main';
    f.assets.mockResolvedValue({ok:false,status:404});
    await f.updater.warmAssets(NEW,['js/removed.js']);
    expect(f.updater.warmedRevision).toBe(NEW);
    f.app.game.mapId='duckville';
    await f.updater.warmAssets(NEW);
    expect(f.assets.mock.calls.map(([url]) => url)).toContain('https://game.test/_client/' + NEW + '/maps/world_client_duckville.js');
});

test('a reloaded client waits for readiness and retries transient session failures under the recovery cover', async () => {
    const f=fixture(); f.updater.recovering=true;
    f.reply({revision:OLD,serverRevision:OLD,ready:false});
    f.app.storage.loadData.mockRejectedValueOnce({response:{status:503}}).mockResolvedValueOnce();
    const load=f.updater.loadSession(); await turn();
    expect(f.app.storage.loadData).not.toHaveBeenCalled();
    expect(f.elements.get('client-recovery').hidden).toBe(false);
    await jest.advanceTimersByTimeAsync(1000);
    expect(f.app.storage.loadData).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1000); await load;
    expect(f.app.storage.loadData).toHaveBeenCalledTimes(2);
    expect(f.app.storage.loadData).toHaveBeenCalledWith({timeout:10000});
    expect(f.elements.get('client-recovery').hidden).toBe(false);
    f.updater.completeRecovery();
    expect(f.elements.get('client-recovery').hidden).toBe(false);
    await jest.advanceTimersByTimeAsync(100);
    expect(f.elements.get('client-recovery').hidden).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
});

test('a stalled reconnect stops after two minutes with an explicit character-selection recovery', async () => {
    const f=fixture(); f.updater.recovering=true;
    f.apiFetch.mockResolvedValue({ok:true,json:async () => ({revision:OLD,serverRevision:OLD,ready:false})});
    const failure=expect(f.updater.loadSession()).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(121000); await failure;
    expect(f.elements.get('client-recovery-reconnect').hidden).toBe(false);
    expect(f.elements.get('client-recovery').hidden).toBe(false);
    expect(f.app.storage.loadData).not.toHaveBeenCalled();
});

test('an expired ticket fails clearly without an infinite session retry or automatic redirect', async () => {
    const f=fixture(); f.updater.recovering=true;
    f.app.storage.loadData.mockRejectedValue({response:{status:404}});
    await expect(f.updater.loadSession()).rejects.toMatchObject({response:{status:404}});
    expect(f.app.storage.loadData).toHaveBeenCalledTimes(1);
    expect(f.elements.get('client-recovery-reconnect').hidden).toBe(false);
    expect(f.location.replace).not.toHaveBeenCalled();
});

test('a late session response cannot start the game after the recovery deadline', async () => {
    const f=fixture(); f.updater.recovering=true;
    let finish;
    f.app.storage.loadData.mockReturnValue(new Promise(resolve => {finish=resolve;}));
    const failure=expect(f.updater.loadSession()).rejects.toThrow('timed out');
    await turn();
    await jest.advanceTimersByTimeAsync(120000);
    finish({}); await failure;
    expect(f.elements.get('client-recovery-reconnect').hidden).toBe(false);
    expect(f.updater.recoveryFailed).toBe(true);
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
