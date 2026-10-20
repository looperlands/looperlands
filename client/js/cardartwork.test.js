const fs = require('fs'), vm = require('vm');
const metadata = {
    clotharmor: require('../sprites/clotharmor.json'),
    redsword: require('../sprites/redsword.json'),
    NFT_ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273: require('../sprites/NFT_ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273.json')
};
function setup(images = {}) {
    let artwork, clock = 0;
    const requests = [], pending = new Map();
    class Image {
        set src(url) {
            this.url = url; requests.push(url); const spec = images[url];
            const complete = () => {
                if (!spec || spec.error) {this.onerror(); return;}
                Object.assign(this, {naturalWidth: spec.width, naturalHeight: spec.height, spec}); this.onload();
            };
            if (spec?.manual) pending.set(url, complete); else queueMicrotask(complete);
        }
    }
    const document = {baseURI: 'http://localhost/game/', createElement: () => {
        let image, x, y, width, height;
        return {getContext: () => ({clearRect() {}, drawImage(img, sx, sy, sw, sh) {image = img; x = sx; y = sy; width = sw; height = sh;},
            getImageData() {
                if (image.spec.tainted) throw new Error('SecurityError');
                const data = new Uint8ClampedArray(width * height * 4);
                for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
                    if (image.spec.visible?.(x + col, y + row)) data[(row * width + col) * 4 + 3] = 255;
                }
                return {data};
            }
        })};
    }};
    vm.runInNewContext(fs.readFileSync(require.resolve('./cardartwork'), 'utf8'), {
        define: (_, factory) => {artwork = factory(metadata);}, Image, document, URL, Date: {now: () => clock}
    });
    return {artwork, requests, pending, advance: () => {clock += 5001;}};
}
const element = () => ({style: {}, hidden: false});
const sheet = {width: 48, height: 48, animations: {idle_down: {row: 8, length: 2}}};
const player = name => ({getSpriteName: () => name, getWeaponName: () => name});

test('Townie24 uses its actual dynamic filepath instead of the NaN static URL', () => {
    const {artwork} = setup();
    const townie = 'NFT_3553bF84E7Bf81B2c75EC609a28DA773ff3B2fC2_23';
    const filepath = 'https://looperlands.sfo3.digitaloceanspaces.com/assets/looper/1/0x3553bF84E7Bf81B2c75EC609a28DA773ff3B2fC2_23.png';
    const normalSprite = {...metadata.clotharmor, filepath, dynamicNFT: true, getUrlByScale: () => 'NaN/' + townie + '.png'};
    const candidates = artwork.sources({player: {...player(townie), normalSprite}, sprites: {}}, {}, 'avatar');
    expect(candidates[0].url).toBe(filepath);
    expect(candidates.some(source => source.url.includes('NaN'))).toBe(false);
});

test('dynamic ranged and tool sprites use full-sheet geometry, not a 16px icon', () => {
    const {artwork} = setup();
    for (const type of ['ranged_weapon', 'fishingrod']) {
        const game = {player: player('NFT_dynamic'), sprites: {NFT_dynamic: {...sheet, filepath: '/assets/' + type + '.png', dynamicNFT: true}}};
        const candidates = artwork.sources(game, {dynamicNFTIconURL: {NFT_dynamic: '/assets/ranged_weapon/3/full.png'}}, 'weapon');
        expect(candidates[0].width).toBe(48);
        expect(candidates[0].url).toBe('/assets/' + type + '.png');
        expect(candidates.some(source => source.url === '/assets/ranged_weapon/3/full.png')).toBe(false);
    }
});

test('small ranged artwork is enlarged from its visible bounds inside a padded frame', async () => {
    const {artwork} = setup({'/bow.png': {width: 240, height: 432, visible: (x, y) => x >= 20 && x < 30 && y >= 400 && y < 416}});
    const el = element(), status = {};
    expect(await artwork.render(el, [{...sheet, url: '/bow.png'}], status)).toBe(true);
    expect(el.style.width).toBe('60px'); expect(el.style.height).toBe('96px');
    expect(el.style.backgroundPosition).toBe('-120px -2400px');
    expect(el.hidden).toBe(false); expect(status.hidden).toBe(true);
});

test('an empty first idle frame selects a later visible frame', async () => {
    const {artwork} = setup({'/tool.png': {width: 96, height: 432, visible: (x, y) => x >= 60 && x < 70 && y >= 390 && y < 410}});
    const el = element(); await artwork.render(el, [{...sheet, url: '/tool.png'}]);
    expect(el.style.height).toBe('100px'); expect(el.style.backgroundPosition).toBe('-300px -1950px');
});

test('static high-resolution sheets keep their real frame scale', async () => {
    const {artwork} = setup({'/avatar.png': {width: 320, height: 576, visible: (x, y) => x >= 16 && x < 48 && y >= 520 && y < 568}});
    const el = element(); await artwork.render(el, [{url: '/avatar.png', width: 32, height: 32, scale: 2, animations: {idle_down: {row: 8, length: 1}}}]);
    expect(el.style.width).toBe('64px'); expect(el.style.height).toBe('96px');
});

test('failed and blank sources fall back, and settled artwork does not reload on statistics refresh', async () => {
    const {artwork, requests} = setup({'/blank.png': {width: 16, height: 16}, '/icon.png': {width: 96, height: 16, visible: () => true}});
    const el = element(), candidates = [{url: '/missing.png'}, {url: '/blank.png'}, {url: '/icon.png'}];
    expect(await artwork.render(el, candidates)).toBe(true);
    expect(await artwork.render(el, candidates)).toBe(true);
    expect(requests).toEqual(['/missing.png', '/blank.png', '/icon.png']);
    expect(el.style.backgroundImage).toContain('/icon.png');
});

test('late artwork from the previous equipment cannot overwrite the current item', async () => {
    const {artwork, pending} = setup({'/old.png': {manual: true, width: 16, height: 16, visible: () => true}, '/new.png': {width: 16, height: 16, visible: () => true}});
    const el = element(), old = artwork.render(el, [{url: '/old.png'}]);
    await artwork.render(el, [{url: '/new.png'}]); pending.get('/old.png')(); await old;
    expect(el.style.backgroundImage).toContain('/new.png');
});

test('a temporary load failure retries after the cooldown and restores the image', async () => {
    const spec = {error: true, width: 16, height: 16, visible: () => true};
    const {artwork, advance, requests} = setup({'/retry.png': spec}); const el = element(), status = {};
    expect(await artwork.render(el, [{url: '/retry.png'}], status)).toBe(false);
    expect(status.textContent).toBe('Artwork unavailable');
    spec.error = false; advance();
    expect(await artwork.render(el, [{url: '/retry.png'}], status)).toBe(true);
    expect(requests.length).toBe(2); expect(status.hidden).toBe(true);
});

test('unreadable pixel data retains a visible frame rather than a blank card', async () => {
    const {artwork} = setup({'/restricted.png': {width: 240, height: 432, tainted: true}});
    const el = element(); expect(await artwork.render(el, [{...sheet, url: '/restricted.png'}])).toBe(true);
    expect(el.hidden).toBe(false); expect(el.style.height).toBe('96px');
});


test.each([16, 32, 48])('ranged HUD artwork fills its %ipx slot without changing the hit area', async size => {
    const {artwork} = setup({'/bow.png': {width: 240, height: 432, visible: (x, y) => x >= 20 && x < 30 && y >= 400 && y < 416}});
    const el = element(); el.style.width = size + 'px'; el.style.height = size + 'px';
    await artwork.render(el, [{...sheet, url: '/bow.png'}], null, {slot: true});
    expect(el.style.width).toBe(size + 'px'); expect(el.style.height).toBe(size + 'px');
    expect(el.style.backgroundSize).toBe('1500% 2700%');
    const position = el.style.backgroundPosition.split(' ').map(parseFloat);
    expect(position[0]).toBeCloseTo(17 / 224 * 100);
    expect(position[1]).toBeCloseTo(400 / 416 * 100);
});


test('switching to an ordinary HUD icon cancels a pending ranged image', async () => {
    const {artwork, pending} = setup({'/old.png': {manual: true, width: 16, height: 16, visible: () => true}});
    const el = element(), old = artwork.render(el, [{url: '/old.png'}], null, {slot: true});
    artwork.cancel(el); el.style.backgroundImage = 'url("/current.png")';
    pending.get('/old.png')(); await old;
    expect(el.style.backgroundImage).toBe('url("/current.png")');
});


test('a recovered primary source replaces temporary fallback artwork after the cooldown', async () => {
    const primary = {error: true, width: 16, height: 16, visible: () => true};
    const {artwork, advance} = setup({'/primary.png': primary, '/fallback.png': {...primary, error: false}});
    const el = element(), candidates = [{url: '/primary.png'}, {url: '/fallback.png'}];
    await artwork.render(el, candidates); expect(el.style.backgroundImage).toContain('/fallback.png');
    primary.error = false; advance();
    await artwork.render(el, candidates); expect(el.style.backgroundImage).toContain('/primary.png');
});
