const fs = require('fs');
const vm = require('vm');

function setup() {
    const modules = {};
    const axios = {get: jest.fn()};
    const sandbox = {
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name]));
        },
        axios, console: {error: jest.fn()}, setTimeout, clearTimeout, setInterval, clearInterval,
        Date, Math, AltNames: {getName: fish => fish},
    };
    vm.createContext(sandbox);
    for (const name of ['lib/class', 'float', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve(`./${name}`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const game = Object.assign(Object.create(modules.game.prototype), {
        sessionId: 'session', player: {id: 1, isFishing: false, orientation: 'right',
            getWeaponName: () => 'rod', getOrientationTo: () => 'right', idle: jest.fn(),
            animate: (name, speed, count, onEnd) => onEnd()},
        map: {getLakeName: () => 'm88nDreamPond1'}, floats: {}, fish: {},
        fishingData: {fishName: null, fishPos: 0}, renderer: {scale: 1}, camera: {isVisible: () => true},
        app: {setFish: jest.fn(), setFishPos: jest.fn(), setFishingTarget: jest.fn(),
            showFishing: jest.fn(), hideFishing: jest.fn(), holdFishing: jest.fn()},
        client: {sendFishingResult: jest.fn()}, showNotification: jest.fn(),
        audioManager: {playSound: jest.fn()}, renderStatistics: jest.fn(),
    });
    game.getEntityById = () => game.player;
    return {game, axios};
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const catchResponse = {data: {allowed: true, fish: 'm88ndreamduckyy', difficulty: 5, speed: 20, bullseyeSize: 1}};

test('a denied cast releases the fishing state so another pond can be tried', async () => {
    const {game, axios} = setup();
    axios.get.mockResolvedValueOnce({data: {allowed: false, reqLevel: 7}}).mockResolvedValue(catchResponse);
    game.startFishing(2, 3);
    await settle();
    expect(game.player.isFishing).toBe(false);
    game.startFishing(4, 5);
    await settle();
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(game.floats[1]).toBeDefined();
    expect(game.app.showFishing).not.toHaveBeenCalled();
    expect(game.client.sendFishingResult).not.toHaveBeenCalled();
});

test('a failed request explains why the cast stopped and allows retry', async () => {
    const {game, axios} = setup();
    axios.get.mockRejectedValueOnce(new Error('Could not get fish')).mockResolvedValue(catchResponse);
    game.startFishing(2, 3);
    await settle();
    expect(game.player.isFishing).toBe(false);
    expect(game.showNotification).toHaveBeenCalledWith('Could not cast. Please try again.');
    expect(jest.getTimerCount()).toBe(0);
    game.startFishing(2, 3);
    await settle();
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(game.player.isFishing).toBe(true);
    expect(game.floats[1]).toBeDefined();
});

test.each([[0, 6000], [0.5, 9000]])('a cast stays active until the bite (random=%s, wait=%s)', async (random, wait) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    const {game, axios} = setup();
    axios.get.mockResolvedValue(catchResponse);
    game.startFishing(2, 3);
    await settle();
    jest.advanceTimersByTime(wait - 1);
    expect(game.player.isFishing).toBe(true);
    expect(game.floats[1]).toEqual(expect.objectContaining({gridX: 2, gridY: 3}));
    expect(game.app.showFishing).not.toHaveBeenCalled();
    expect(game.client.sendFishingResult).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(game.app.showFishing).toHaveBeenCalledTimes(1);
    expect(game.player.isFishing).toBe(true);
    expect(game.showNotification).not.toHaveBeenCalled();
});

test('a successful catch clears its escape timer and allows another cast immediately', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const {game, axios} = setup();
    axios.get.mockResolvedValue(catchResponse);
    game.startFishing(2, 3);
    await settle();
    jest.advanceTimersByTime(6000);
    game.fishingData.fishPos = game.fishingData.targetPos + game.fishingData.bullseyeRelPos - 12;
    game.clickFishingBar();
    expect(game.player.isFishing).toBe(false);
    expect(game.client.sendFishingResult).toHaveBeenCalledWith(true, true);
    expect(game.floats[1]).toBeUndefined();

    game.startFishing(2, 3);
    await settle();
    jest.advanceTimersByTime(7000); // Includes the first cast's former escape deadline.
    expect(game.player.isFishing).toBe(true);
    expect(game.floats[1]).toBeDefined();
    expect(game.app.showFishing).toHaveBeenCalledTimes(2);
    expect(game.client.sendFishingResult).toHaveBeenCalledTimes(1);
    expect(game.showNotification).toHaveBeenCalledTimes(1);
});

test('the escape timer starts at the bite and reports the fish escaping after seven seconds', () => {
    const {game} = setup();
    game.player.isFishing = true;
    game.floats[1] = {};
    game.playCatchFish('m88ndreamduckyy', 5, 20, 1);
    expect(game.app.showFishing).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(6999);
    expect(game.player.isFishing).toBe(true);
    expect(game.client.sendFishingResult).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(game.player.isFishing).toBe(false);
    expect(game.showNotification).toHaveBeenCalledWith('m88ndreamduckyy escaped!');
    expect(game.client.sendFishingResult).toHaveBeenCalledWith(false, false);
    expect(game.floats[1]).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
});

test('saved-water cast rejections show the server explanation',async()=>{
    const {game,axios}=setup();axios.get.mockResolvedValue({data:{allowed:false,error:'Equip a fishing rod before casting.'}});game.startFishing(2,3);await settle();expect(game.showNotification).toHaveBeenCalledWith('Equip a fishing rod before casting.');expect(game.player.isFishing).toBe(false);
});

test('fishing XP refreshes stats without treating a fish as a mob kill',()=>{
    let handler;const source=fs.readFileSync(require.resolve('./game'),'utf8');const start=source.indexOf('                    self.client.onPlayerKillMob(function');const end=source.indexOf('                    self.client.onPlayerChangeHealth',start);
    const game={renderStatistics:jest.fn(),showNotification:jest.fn(),storage:{incrementTotalKills:jest.fn(),incrementRatCount:jest.fn(),incrementSkeletonCount:jest.fn()},client:{onPlayerKillMob(fn){handler=fn;}}};
    vm.runInNewContext(source.slice(start,end),{self:game,Types:{isMob:kind=>typeof kind==='number',getKindAsString:()=> 'rat',Entities:{RAT:2}},AltNames:{getName:()=> 'rat'},_:{include:(items,value)=>items.includes(value)}});
    expect(()=>handler('cobguppy',13)).not.toThrow();expect(game.renderStatistics).toHaveBeenCalledTimes(1);expect(game.storage.incrementTotalKills).not.toHaveBeenCalled();handler(2,10);expect(game.storage.incrementTotalKills).toHaveBeenCalledTimes(1);
});
