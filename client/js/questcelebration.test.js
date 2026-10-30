const fs = require('fs'), vm = require('vm');
function setup() {
    const node = () => ({children: [], style: {setProperty() {}}, classList: {toggle: jest.fn()},
        setAttribute() {}, addEventListener() {}, append(...children) {this.children.push(...children);},
        replaceChildren() {this.children = [];}, remove: jest.fn(), matches: () => false});
    let Celebration;
    const format = {append: jest.fn((el, source) => {el.textContent = source;})};
    const window = {addEventListener: jest.fn(), removeEventListener: jest.fn(), matchMedia: () => ({matches: false})};
    vm.runInNewContext(fs.readFileSync(require.resolve('./questcelebration'), 'utf8'), {
        define: (_, factory) => {Celebration = factory({render: jest.fn()}, format);}, document: {createElement: node, body: node()},
        window, Types: {getKindAsString: () => 'flask'}, setTimeout, clearTimeout
    });
    const app = {game: {sessionId: 'one'}, settings: {getReducedMotion: () => false, getCombatEffectsEnabled: () => true}};
    return {app, format, ui: new Celebration(app)};
}
const notice = {questName: 'Help the village', endText: ['Thank you!'], xpReward: 25, reward: {item: 1, name: 'Flask', amount: 3}};
const text = node => [node.textContent, ...node.children.flatMap(text)].filter(Boolean);
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('received rewards render their quantity and name with XP and story', () => {
    const {ui} = setup(); ui.show(notice);
    expect(text(ui.root)).toEqual(expect.arrayContaining(['Quest complete!', 'Help the village', 'Thank you!', '+25 XP earned', '×3', 'Flask', 'Added to inventory']));
    jest.runAllTimers(); expect(ui.root.hidden).toBe(true);
});
test('consecutive quests queue rather than replacing unread rewards', () => {
    const {ui} = setup(); ui.show(notice); ui.show({...notice, questName: 'Second quest', reward: undefined});
    expect(text(ui.root)).toContain('Help the village');
    jest.advanceTimersByTime(7000);
    expect(text(ui.root)).toContain('Second quest');
    expect(text(ui.root)).not.toContain('Added to inventory');
    jest.runAllTimers(); expect(ui.root.hidden).toBe(true);
});
test('a new session discards queued celebrations and reduced motion preserves rewards', () => {
    const {ui, app} = setup(); ui.show(notice); ui.show(notice);
    app.game.sessionId = 'two'; app.settings.getReducedMotion = () => true;
    ui.show({...notice, questName: '<b>New session</b>'});
    expect(ui.queue).toHaveLength(0);
    expect(text(ui.root)).toContain('<b>New session</b>');
    expect(ui.root.classList.toggle).toHaveBeenLastCalledWith('quest-quiet', true);
    ui.destroy(); expect(jest.getTimerCount()).toBe(0);
});

test('quest completion text uses the shared safe dialogue renderer', () => {
    const {ui, format} = setup();
    const line = 'You helped Adam and Bstrat agree on <span class="dialogue-item">the basket</span>.';
    ui.show({...notice, endText: [line]});
    expect(format.append).toHaveBeenCalledWith(expect.objectContaining({className: 'quest-story'}), line);
});

test('automatically dismisses after five seconds even while hovered, then advances the queue', () => {
    const {ui} = setup(); ui.root.matches = () => true;
    ui.show(notice); ui.show({...notice, questName: 'Next quest'});
    jest.advanceTimersByTime(4999); expect(ui.leaving).toBe(false);
    jest.advanceTimersByTime(1); expect(ui.leaving).toBe(true);
    expect(text(ui.root)).toContain('Help the village');
    ui.close(); // Repeated dismissal must not delay the next notification.
    jest.advanceTimersByTime(220); expect(text(ui.root)).toContain('Next quest');
    jest.runAllTimers(); expect(ui.root.hidden).toBe(true);
});
