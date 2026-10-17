const {avatarContext, isGuestMessage} = require('./arcade');
const base = 'http://127.0.0.1:8026/';
const animations = {idle_up: {length: 2, row: 5}, walk_right: {length: 4, row: 1}};
function game(sprite = {}) {
    return {sessionId: 'secret-session', walletId: 'private-wallet', inventory: [1], player: {
        name: 'My Looper', nftId: 'avatar-id', sprite: {filepath: 'img/1/clotharmor.png', width: 32, height: 32, scale: 1, animationData: animations, ...sprite}
    }};
}
test('hands off appearance without credentials or inventory', () => {
    const context = avatarContext(game(), base);
    expect(context.name).toBe('My Looper');
    expect(context.avatar.src).toBe(base + 'img/1/clotharmor.png');
    expect(context.avatar.config.animations).toEqual(animations);
    expect(JSON.stringify(context)).not.toMatch(/secret-session|private-wallet|inventory|nftId/);
    context.avatar.config.animations.idle_up.row = 99;
    expect(animations.idle_up.row).toBe(5);
});
test('scaled world sheets preserve their source frames and normalize display size', () => {
    const result = avatarContext(game({scale: 3, filepath: 'img/3/clotharmor.png'}), base);
    expect(result.avatar.config.width).toBe(96);
    expect(result.avatar.config.width * result.avatar.config.scale).toBe(56);
});
test('NFTs use their 1x source even when the world renderer is scaled', () => {
    const result = avatarContext(game({dynamicNFT: true, scale: 3, filepath: 'https://assets.example/avatar.png'}), base);
    expect(result.avatar.config.width).toBe(32);
    expect(result.avatar.src).toBe('https://assets.example/avatar.png');
});
test('uses the normal armor sprite when the player exposes its renderer accessor', () => {
    const fixture = game();
    fixture.player.getArmorSprite = () => ({...fixture.player.sprite, filepath: 'img/1/goldenarmor.png'});
    expect(avatarContext(fixture, base).avatar.src).toContain('goldenarmor');
});
test('inherits disabled sound', () => {
    expect(avatarContext({...game(), audioManager: {enabled: false}}, base).muted).toBe(true);
});
test.each([{filepath: ''}, {width: 0}, {height: Infinity}, {filepath: 'javascript:alert(1)'}])('rejects unusable avatar before opening (%j)', sprite => {
    expect(() => avatarContext(game(sprite), base)).toThrow();
});
test('accepts messages only from this frame and this origin', () => {
    const frame = {contentWindow: {}};
    const event = {source: frame.contentWindow, origin: 'http://localhost', data: {channel: 'looper-arcade-v1', type: 'result'}};
    expect(isGuestMessage(event, frame, event.origin)).toBe(true);
    expect(isGuestMessage({...event, source: {}}, frame, event.origin)).toBe(false);
    expect(isGuestMessage({...event, origin: 'https://other.example'}, frame, event.origin)).toBe(false);
    expect(isGuestMessage({...event, data: null}, frame, event.origin)).toBeFalsy();
    expect(isGuestMessage({...event, data: {channel: 'other'}}, frame, event.origin)).toBe(false);
});

test('dissolves out using world time and materializes the same avatar on return', () => {
    const {dissolveAvatar} = require('./arcade');
    const fixture = {...game(), currentTime: 100};
    const transition = dissolveAvatar(fixture);
    expect(fixture.player.pixelDissolve).toEqual({startedAt: 100, duration: 600, incoming: false});
    fixture.currentTime = 5000;
    transition.finish();
    expect(fixture.player.pixelDissolve).toEqual({startedAt: 5000, duration: 600, incoming: true});
});
test('respects reduced motion and does not overwrite death effects', () => {
    const {dissolveAvatar} = require('./arcade');
    const fixture = {...game(), currentTime: 100, app: {settings: {getReducedMotion: () => true}}};
    const transition = dissolveAvatar(fixture);
    expect(transition.duration).toBe(120);
    const death = {startedAt: 150, duration: 420, incoming: false};
    fixture.player.pixelDissolve = death;
    transition.finish();
    expect(fixture.player.pixelDissolve).toBe(death);
});
test('lifecycle cancellation clears the arcade dissolve instead of resurrecting the avatar', () => {
    const {dissolveAvatar} = require('./arcade');
    const fixture = {...game(), currentTime: 100};
    const transition = dissolveAvatar(fixture);
    transition.finish(false);
    expect(fixture.player.pixelDissolve).toBeNull();
});
