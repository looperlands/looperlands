const {resolveAvatarAppearance} = require('./avatarappearance');

const avatar = {
    nftId: '0xavatar', tokenHash: 'original', assetType: 'looper',
    options: {canHoldWeapon: false, evolutions: [
        {level: 20, sprite: 'final_a12', canHoldWeapon: true},
        {level: 5, sprite: 'first_b34', canHoldWeapon: false}
    ]}
};

test.each([[0, 1, 'original', false], [4, 1, 'original', false], [5, 5, 'first_b34', false],
    [19, 5, 'first_b34', false], [20, 20, 'final_a12', true], [9999, 20, 'final_a12', true]])(
    'earned level %s selects the highest unlocked form regardless of order', (level, evolutionLevel, tokenHash, canHoldWeapon) => {
        expect(resolveAvatarAppearance(avatar, level)).toEqual({nftId: avatar.nftId, assetType: 'looper',
            tokenHash, canHoldWeapon, evolutionLevel});
    });

test('legacy settings default to visible weapons and retain the original NFT', () => {
    expect(resolveAvatarAppearance({...avatar, options: undefined}, 50)).toEqual({nftId: avatar.nftId,
        tokenHash: 'original', assetType: 'looper', canHoldWeapon: true, evolutionLevel: 1});
    expect(resolveAvatarAppearance(undefined, 50)).toBeNull();
    expect(resolveAvatarAppearance({...avatar, assetType: 'weapon'}, 50)).toBeNull();
});

test.each(['https://other.example/skin', '../private', 'x?redirect=true', '', 'x'.repeat(241)])(
    'appearance rejects unsafe sprite key %s', sprite => {
        expect(resolveAvatarAppearance({...avatar, tokenHash: sprite}, 50)).toBeNull();
        expect(resolveAvatarAppearance({...avatar, options: {evolutions: [{level: 5, sprite}]}}, 50).evolutionLevel).toBe(1);
    });

test('malformed stages are ignored without changing configuration or disabling the base sprite', () => {
    const options = {evolutions: [null, {level: 2.5, sprite: 'fraction'}, {level: 10000, sprite: 'unreachable'},
        {level: '5', sprite: 'string'}, {level: 1, sprite: 'base'}, {level: 5, sprite: 'valid'}]};
    expect(resolveAvatarAppearance({...avatar, options}, 50)).toMatchObject({evolutionLevel: 5, tokenHash: 'valid', canHoldWeapon: true});
    expect(resolveAvatarAppearance({...avatar, options}, NaN).evolutionLevel).toBe(1);
    expect(options.evolutions).toHaveLength(6);
    expect(resolveAvatarAppearance({...avatar, options: {evolutions: {}}}, 50).evolutionLevel).toBe(1);
});
