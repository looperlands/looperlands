const GameModesAccess = require('./gamemodesaccess');
const wallet = '0x' + 'a'.repeat(40);

function fixture() {
    let now = 1000;
    const platform = {isServerAdminWallet: jest.fn().mockResolvedValue(true)};
    return {platform, gate: new GameModesAccess(platform, {now: () => now}), advance: ms => {now += ms;}};
}

test.each([[], ['ROLE_USER'], ['ROLE_ADMIN'], 1, ['admin'], 'true', undefined])('only literal platform approval grants access: %j', async roles => {
    const {gate, platform} = fixture(); platform.isServerAdminWallet.mockResolvedValue(roles);
    expect(await gate.verify(wallet)).toBe(false); expect(gate.allowed(wallet)).toBe(false);
});

test('valid admin leases are case-insensitive, bounded and refreshed', async () => {
    const {gate, platform, advance} = fixture(); expect(gate.allowed(wallet)).toBe(false);
    expect(await gate.verify(wallet)).toBe(true); expect(gate.allowed(wallet.toUpperCase())).toBe(true);
    advance(14999); expect(await gate.verify(wallet)).toBe(true); expect(platform.isServerAdminWallet).toHaveBeenCalledTimes(1);
    advance(2); await gate.verify(wallet); expect(platform.isServerAdminWallet).toHaveBeenCalledTimes(2);
    advance(30000); expect(gate.allowed(wallet)).toBe(false);
});

test('mutations force a fresh check even while a positive lease is valid', async () => {
    const {gate, platform} = fixture(); await gate.verify(wallet); platform.isServerAdminWallet.mockResolvedValue(false);
    expect(await gate.verify(wallet, true)).toBe(false); expect(gate.allowed(wallet)).toBe(false);
    expect(platform.isServerAdminWallet).toHaveBeenCalledTimes(2);
});

test('a timeout or platform failure revokes the existing lease immediately', async () => {
    const {gate, platform} = fixture(); await gate.verify(wallet); platform.isServerAdminWallet.mockRejectedValue(new Error('offline'));
    expect(await gate.verify(wallet, true)).toBe(false); expect(gate.allowed(wallet)).toBe(false);
});

test('concurrent requests share one platform check', async () => {
    const {gate, platform} = fixture(); await Promise.all([gate.verify(wallet), gate.verify(wallet), gate.verify(wallet)]);
    expect(platform.isServerAdminWallet).toHaveBeenCalledTimes(1);
});

test.each(['demo:moss', '', 'not-a-wallet', null])('invalid wallet identities never reach the platform: %j', async identity => {
    const {gate, platform} = fixture(); expect(await gate.verify(identity, true)).toBe(false); expect(platform.isServerAdminWallet).not.toHaveBeenCalled();
});
