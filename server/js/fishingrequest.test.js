global.Types = {};
const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');
const {requestFish} = require('./fishingrequest');
const {restoreFishingWeapon} = require('./fishingequipment');
const rods = Object.values(Types.Entities).filter(kind => typeof kind === 'number' && Types.isFishingRod(kind));
const rod = rods[0];
let player, world, session, params, equipment;
const model = (level = 10) => ({getLevel: () => level, loadItemData: jest.fn().mockResolvedValue(), syncExperience: jest.fn()});
beforeEach(() => {
    player = {hasEnteredGame: true, hitPoints: 10, isDead: false, x: 4, y: 3, weapon: rod, nftWeapon: model(),
        getNFTWeapon: () => player.nftWeapon, getNFTSpecialItemActiveTrait: () => null,
        playerClassModifiers: {isModiferActive: () => false}, broadcast: jest.fn(), equip: kind => ({kind})};
    world = {id: 'world_one', map: {width: 20, height: 20, getLakeName: (x, y) => x === 4 && y === 4 ? 'cobFarmLake' : null},
        getPlayerById: () => player, announceSpawnFloat: jest.fn()};
    session = {mapId: 'world_one', entityId: 1};
    params = {lakeName: 'cobFarmLake', x: '4', y: '4'};
    equipment = {getInventory: jest.fn().mockResolvedValue({tools: []}), createRod: jest.fn(() => model())};
});
const cast = (s = session, p = params) => requestFish(s, {world_one: world}, p, 1000, equipment);
const ownRods = (...kinds) => equipment.getInventory.mockResolvedValue({tools: kinds.map(kind => ({nftId: Types.getKindAsString(kind).replace(/^NFT_/, '0x')}))});
function holdSword() {
    player.weapon = Types.Entities.SWORD1;
    player.nftWeapon = model();
    player.weaponLevel = 7;
    player.walletId = 'wallet';
    player.nftId = 'avatar';
}

test('server accepts a nearby cast from a rod and records the exact saved table', async () => {
    expect((await cast()).body).toMatchObject({allowed: true, speed: expect.any(Number), fish: expect.any(String), rod: Types.getKindAsString(rod)});
    expect(player.pendingFish).toMatchObject({lakeName: 'cobFarmLake', mapId: 'world_one', expiresAt: 61000});
    expect(Lakes.cobFarmLake.fish[player.pendingFish.name]).toBeDefined();
    expect(world.announceSpawnFloat).toHaveBeenCalledWith(player, 4, 4);
    expect(equipment.getInventory).not.toHaveBeenCalled();
});
test.each([
    ['dead', p => p.isDead = true], ['not entered', p => p.hasEnteredGame = false],
    ['sword without a rod', p => p.weapon = Types.Entities.SWORD1], ['diagonal', p => p.x = 3],
    ['distant', p => p.y = 1], ['standing on water', p => p.y = 4], ['rod too low', p => p.nftWeapon = model(0)]
])('rejects %s without starting a cast', async (name, change) => {
    change(player);
    expect((await cast()).body.allowed).toBe(false);
    expect(player.pendingFish).toBeUndefined();
    expect(world.announceSpawnFloat).not.toHaveBeenCalled();
});
test.each([{x: '4.5'}, {x: '99'}, {lakeName: 'cobFarmRiver'}, {lakeName: 'missing'}, {y: 'NaN'}])('rejects forged water %j', async extra => {
    expect((await cast(session, {...params, ...extra})).body.allowed).toBe(false);
    expect(player.pendingFish).toBeUndefined();
    expect(equipment.getInventory).not.toHaveBeenCalled();
});
test('expired sessions and departed players return an actionable rejection', async () => {
    expect((await cast(null)).status).toBe(404);
    world.getPlayerById = () => null;
    expect((await cast()).body.allowed).toBe(false);
});
test('a sword holder automatically uses an owned rod and restores the loaded weapon intact', async () => {
    holdSword(); ownRods(rod);
    const sword = player.nftWeapon;
    expect((await cast()).body.allowed).toBe(true);
    expect(equipment.getInventory).toHaveBeenCalledWith('wallet', 'avatar');
    expect(player.weapon).toBe(rod);
    expect(player.broadcast).toHaveBeenCalledWith({kind: rod}, false);
    restoreFishingWeapon(player);
    expect(player).toMatchObject({weapon: Types.Entities.SWORD1, weaponLevel: 7});
    expect(player.nftWeapon).toBe(sword);
    expect(player.broadcast).toHaveBeenLastCalledWith({kind: Types.Entities.SWORD1}, false);
});
test('the last-used rod is preferred, and a no-longer-owned rod is replaced by an owned one', async () => {
    holdSword(); ownRods(rod, rods[1]); player.lastFishingRod = rods[1];
    await cast(); expect(player.weapon).toBe(rods[1]);
    restoreFishingWeapon(player); player.pendingFish = null; ownRods(rod);
    await cast(); expect(player.weapon).toBe(rod);
});
test.each(['missing', 'low-level', 'inventory-error', 'load-error'])('%s rods leave the weapon equipped', async state => {
    holdSword(); ownRods(rod);
    const sword = player.nftWeapon;
    if (state === 'missing') ownRods();
    if (state === 'low-level') equipment.createRod.mockReturnValue(model(0));
    if (state === 'inventory-error') equipment.getInventory.mockRejectedValue(new Error('offline'));
    if (state === 'load-error') equipment.createRod.mockReturnValue({...model(), loadItemData: jest.fn().mockRejectedValue(new Error('offline'))});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await cast()).body.allowed).toBe(false);
    expect(player.weapon).toBe(Types.Entities.SWORD1); expect(player.nftWeapon).toBe(sword);
    expect(player.broadcast).not.toHaveBeenCalled(); expect(player.fishingRequest).toBeNull();
    error.mockRestore();
});
test.each(['move', 'death', 'disconnect', 'cancel', 'equipment', 'map'])('a pending rod lookup cannot cast after %s', async state => {
    holdSword();
    let finish;
    equipment.getInventory.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const pending = cast();
    if (state === 'move') player.x = 9;
    if (state === 'death') player.isDead = true;
    if (state === 'disconnect') player.disconnected = true;
    if (state === 'cancel') player.fishingRequest = null;
    if (state === 'equipment') player.weapon = Types.Entities.SWORD2;
    if (state === 'map') world.getPlayerById = () => null;
    finish({tools: [{nftId: Types.getKindAsString(rod)}]});
    expect((await pending).body.allowed).toBe(false);
    expect(player.broadcast).not.toHaveBeenCalled(); expect(player.pendingFish).toBeUndefined();
});
test('rod level data finishes loading before a cast is approved', async () => {
    let finish;
    player.fishingRodReady = new Promise(resolve => { finish = resolve; });
    player.nftWeapon = model(0);
    const pending = cast();
    expect(world.announceSpawnFloat).not.toHaveBeenCalled();
    player.nftWeapon.getLevel = () => 10; finish();
    expect((await pending).body.allowed).toBe(true);
});
test('parallel or repeated cast requests cannot replace an active catch', async () => {
    const first = cast();
    expect((await cast()).body.allowed).toBe(false);
    await first;
    const fish = player.pendingFish;
    expect((await cast()).body.allowed).toBe(false);
    expect(player.pendingFish).toBe(fish);
});
