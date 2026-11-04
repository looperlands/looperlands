const fs = require('fs');
const vm = require('vm');

function setup({host = 'eu.looperlands.io', protocol = 'https:', search = '?sessionId=private&ll_source=discord', blocked = false} = {}) {
    let growth;
    const scripts = [];
    const window = {location: {hostname: host, protocol, search}, dataLayer: blocked ? {push() {throw Error('blocked');}} : []};
    const document = {querySelector: () => ({content: 'GTM-MPCDTCVZ'}), createElement: () => ({}), head: {append: el => scripts.push(el)}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./growthanalytics'), 'utf8'), {
        window, document, URLSearchParams, Date, define: factory => {growth = factory();},
    });
    return {growth, window, scripts};
}

test('confirmed play emits one world and one first quest event through map changes and duplicate notices', () => {
    const {growth, window, scripts} = setup();
    growth.firstQuestCompleted();
    expect(window.dataLayer).toHaveLength(0);
    growth.worldLoaded(true);
    growth.worldLoaded(true);
    growth.firstQuestCompleted();
    growth.firstQuestCompleted();
    expect(window.dataLayer.map(event => event.event)).toEqual(['ll_world_loaded', 'gtm.js', 'll_first_quest_completed']);
    expect(window.dataLayer[0]).toMatchObject({source: 'discord', page: 'game', character_type: 'free', page_location: 'https://looperlands.io/', page_referrer: ''});
    expect(JSON.stringify(window.dataLayer)).not.toMatch(/sessionId|private|questName/);
    expect(scripts).toHaveLength(1);
});

test('local play stays inspectable without sending preview data to Google', () => {
    for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']) {
        const {growth, window, scripts} = setup({host});
        growth.worldLoaded(false);
        expect(window.dataLayer[0].character_type).toBe('premium');
        expect(scripts).toHaveLength(0);
    }
});

test('untrusted source values are categorized and analytics failures never block play', () => {
    const {growth, window} = setup({search: '?ll_source=private@example.com&sessionId=secret'});
    growth.worldLoaded(undefined);
    expect(window.dataLayer[0]).toMatchObject({source: 'other', character_type: 'unknown'});
    const blocked = setup({blocked: true});
    expect(() => {blocked.growth.worldLoaded(true); blocked.growth.firstQuestCompleted();}).not.toThrow();
});
