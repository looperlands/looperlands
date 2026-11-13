const fs = require('fs'), vm = require('vm');
function setup({reduced = false, effects = true, systemReduced = false, cards = true} = {}) {
    const element = () => ({children: [], style: {setProperty: jest.fn()}, classList: {add: jest.fn()},
        attributes: {}, setAttribute(name, value) {this.attributes[name] = value;},
        append(...children) {this.children.push(...children);}, replaceChildren() {this.children = [];}, remove: jest.fn()});
    const artwork = {render: jest.fn(), cancel: jest.fn()};
    const window = {innerWidth:900,innerHeight:600,matchMedia: () => ({matches: systemReduced}), addEventListener: jest.fn(), removeEventListener: jest.fn()};
    let Catch;
    vm.runInNewContext(fs.readFileSync(require.resolve('./fishingcatch'), 'utf8'), {
        define: (_, factory) => {Catch = factory(artwork);}, document: {createElement: element, body: element()},
        window, setTimeout, clearTimeout
    });
    const app = {settings: {getReducedMotion: () => reduced, getCombatEffectsEnabled: () => effects, getFishCatchCardsEnabled: () => cards}, game: {fish:{},showNotification:jest.fn()}};
    return {ui: new Catch(app), artwork, window, app};
}
const receipt = {fish:'m88njellyfish',name:'A jellyfish',rarity:'epic',quantity:2,experience:150,perfect:true,mapId:'m88n2',requiredLevel:10};
const text = element => [element.textContent, ...element.children.flatMap(text)].filter(Boolean);
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('confirmed catches show exact rewards with real artwork and an accessible announcement', () => {
    const {ui, artwork} = setup();
    expect(ui.show(receipt)).toBe(true);
    expect(text(ui.root)).toEqual(expect.arrayContaining(['Perfect!','A jellyfish','epic','\u00d72 fish','+150 XP','M88n2 \u00b7 Fishing level 10+','Added to inventory']));
    expect(ui.root.attributes).toMatchObject({role:'status','aria-live':'polite','aria-atomic':'true'});
    expect(ui.root.className).toBe('fishing-catch fc-epic fc-perfect');
    expect(artwork.render).toHaveBeenCalledWith(ui.sprite, [expect.objectContaining({url:'img/1/m88njellyfish.png'})], expect.any(Object), {slot:true});
    jest.advanceTimersByTime(3399); expect(ui.root.hidden).toBe(false);
    jest.advanceTimersByTime(1); expect(ui.root.classList.add).toHaveBeenCalledWith('fc-leaving');
    jest.advanceTimersByTime(220); expect(ui.root.hidden).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
});

test('another catch replaces the reveal and cancels stale artwork and dismissal', () => {
    const {ui, artwork} = setup();
    ui.show(receipt); const previous = ui.sprite;
    jest.advanceTimersByTime(2800);
    ui.show({...receipt, name:'A guppy', fish:'cobguppy', rarity:'common', perfect:false, quantity:1, experience:10});
    expect(artwork.cancel).toHaveBeenCalledWith(previous);
    expect(text(ui.root)).toContain('A guppy');
    expect(text(ui.root)).toContain('Caught!');
    jest.advanceTimersByTime(500); expect(ui.root.hidden).toBe(false);
    jest.runAllTimers(); expect(ui.root.hidden).toBe(true);
});

test.each([{reduced:true},{effects:false},{systemReduced:true}])('motion preferences preserve every reward without moving effects (%j)', preferences => {
    const {ui} = setup(preferences); ui.show(receipt);
    expect(ui.root.className).toContain('fc-quiet');
    expect(ui.root.children[0].children).toHaveLength(0);
    expect(text(ui.root)).toContain('+150 XP');
    jest.runAllTimers(); expect(ui.root.hidden).toBe(true);
});

test.each([{fish:'../../secret'}, {rarity:'mythical'}, {quantity:0}, {experience:NaN}, {name:null}])('malformed receipts never create a reward (%j)', changes => {
    const {ui, artwork} = setup();
    expect(ui.show({...receipt, ...changes})).toBe(false);
    expect(ui.root.hidden).toBe(true);
    expect(artwork.render).not.toHaveBeenCalled();
});

test('clearing for a cast, map change or death cancels effects and pagehide releases the component', () => {
    const {ui, artwork, window} = setup();
    ui.show(receipt); const sprite = ui.sprite; ui.clear(); ui.close();
    expect(artwork.cancel).toHaveBeenCalledWith(sprite);
    expect(ui.root.hidden).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    ui.show({...receipt, mapId:undefined, requiredLevel:undefined});
    window.addEventListener.mock.calls[0][1]();
    expect(window.removeEventListener).toHaveBeenCalledWith('pagehide', ui.onPageHide);
    expect(ui.root.remove).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});

test('the app suppresses stale-map, death and disconnect receipts before constructing the reveal', () => {
    let app;
    const show = jest.fn(() => true), create = jest.fn();
    function Catch() {create(); this.show = show;}
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        define: (dependencies, factory) => {app = factory(...dependencies.map(name => name === 'fishingcatch' ? Catch : undefined));},
        Class: {extend: methods => methods}
    });
    app.game = {started:true,mapId:'cobsfarm',player:{}};
    expect(app.showFishingCatch(receipt)).toBe(false);
    app.game.mapId = 'm88n2'; app.game.player.isDead = true;
    expect(app.showFishingCatch(receipt)).toBe(false);
    app.game.player.isDead = false; app.game.disconnected = true;
    expect(app.showFishingCatch(receipt)).toBe(false);
    app.game.disconnected = false; app.game.mapTransition = {active:true};
    expect(app.showFishingCatch(receipt)).toBe(false);
    expect(create).not.toHaveBeenCalled();
    app.game.mapTransition.active = false;
    const sound = jest.fn();
    expect(app.showFishingCatch(receipt, sound)).toBe(true);
    expect(show).toHaveBeenCalledWith(receipt, sound);
});

test('the game refreshes statistics and plays the existing sound only for a displayed confirmed catch', () => {
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('                    self.client.onFishingCatch(function');
    const end = source.indexOf('                    self.client.onPlayerKillMob', start);
    let handler;
    const game = {client:{onFishingCatch:fn => {handler = fn;}},renderStatistics:jest.fn(),
        app:{showFishingCatch:jest.fn((_receipt, onReveal) => {onReveal(); return true;})},audioManager:{playSound:jest.fn()}};
    vm.runInNewContext(source.slice(start, end), {self:game});
    handler(receipt);
    expect(game.renderStatistics).toHaveBeenCalledTimes(1);
    expect(game.app.showFishingCatch).toHaveBeenCalledWith(receipt, expect.any(Function));
    expect(game.audioManager.playSound).toHaveBeenCalledWith('fishingsuccess');
    game.app.showFishingCatch.mockReturnValue(false); game.audioManager.playSound.mockClear();
    handler(receipt); expect(game.audioManager.playSound).not.toHaveBeenCalled();
});

test('rarity adds anticipation, impact and colour hooks, and sound lands on the reveal beat', () => {
    const {ui} = setup(); const sound = jest.fn();
    ui.show({...receipt, rarity:'common', perfect:false}, sound);
    const commonSparks = ui.root.children[0].children.find(el => el.className === 'fc-sparks').children.length;
    jest.advanceTimersByTime(369); expect(sound).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1); expect(sound).toHaveBeenCalledTimes(1);
    ui.show({...receipt, rarity:'legendary', perfect:false}, sound);
    const effects = ui.root.children[0].children;
    expect(effects.map(el => el.className)).toEqual(['fc-wash','fc-ring','fc-rays','fc-sparks']);
    expect(effects[3].children.length).toBeGreaterThan(commonSparks * 5);
    expect(ui.root.style.setProperty).toHaveBeenCalledWith('--fc-reveal', '1280ms');
    jest.advanceTimersByTime(849); expect(sound).toHaveBeenCalledTimes(1);
    ui.clear(); jest.runAllTimers(); expect(sound).toHaveBeenCalledTimes(1);
});

test('turning cards off keeps confirmed catch text and sound without a card or effect timers', () => {
    const {ui, artwork, app} = setup({cards:false}); const sound = jest.fn();
    expect(ui.show(receipt,sound)).toBe(false);
    expect(ui.root.hidden).toBe(true);
    expect(artwork.render).not.toHaveBeenCalled();
    expect(app.game.showNotification).toHaveBeenCalledWith('Caught A jellyfish \u00d72 \u00b7 +150 XP');
    expect(sound).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
});

test.each([['right',442,292,900,600],['left',842,292,900,600],['above',162,442,340,700]])('places the reveal %s of the character without covering their tile', (side,x,y,width,height) => {
    const {ui,app,window} = setup(); window.innerWidth=width; window.innerHeight=height;
    app.game.player={x,y};
    app.game.renderer={getScreenPosition:(x,y)=>({x,y}),canvas:{getBoundingClientRect:()=>({left:0,top:0,right:width,bottom:height})}};
    ui.root.offsetWidth=176;ui.root.offsetHeight=240;
    ui.show({...receipt,rarity:'common'});
    const cx=parseFloat(ui.root.style.left),cy=parseFloat(ui.root.style.top),px=x+8,py=y+8;
    if(side==='right')expect(cx-88).toBeGreaterThan(px+12);
    if(side==='left')expect(cx+88).toBeLessThan(px-12);
    if(side==='above')expect(cy+120).toBeLessThan(py-12);
    expect(cx-88).toBeGreaterThanOrEqual(0);expect(cx+88).toBeLessThanOrEqual(width);
    expect(cy-120).toBeGreaterThanOrEqual(0);expect(cy+120).toBeLessThanOrEqual(height);
});
