const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Exercise movement -> camera -> main-thread commands -> native worker pixels.
// A fixed animation pose isolates transform jitter from deliberate sprite bobbing.
function setup({dx = 1, dy = 0, speed = 87, scale = 2, manual = false} = {}) {
    const modules = {};
    const sandbox = {
        console: {debug() {}, log() {}}, self: {},
        Types: {Orientations: {LEFT: 1, RIGHT: 2, UP: 3, DOWN: 4}, alwaysOnTop: () => false},
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    for (const name of ['entity', 'transition', 'character', 'player', 'camera', 'updater', 'renderer']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, `${name}.js`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const player = Object.assign(Object.create(modules.player.prototype), {
        id: 1, name: 'Looper', title: 'Explorer', nameOffsetY: -20, visible: true,
        x: 640, y: 640, gridX: 40, gridY: 40, moveSpeed: speed,
        movement: new modules.transition(), newDestination: null,
        sprite: {id: 'avatar', name: 'avatar', width: 32, height: 32, offsetX: -8, offsetY: -12, hasShadow: true},
        weaponName: 'weapon', shadowOffsetX: 0, shadowOffsetY: 0,
        currentAnimation: {name: 'walk_right', currentFrame: {x: 0, y: 32, index: 0}},
        checkAggro() {}, idle() {},
        walk(orientation) { this.orientation = orientation; this.flipSpriteX = dx < 0; },
    });
    player.followPath(Array.from({length: 80}, (_, i) => [40 + dx * i, 40 + dy * i]));
    const game = {player, playerId: 1, keyboardMovement: manual, currentTime: 0,
        forEachEntity: callback => callback(player),
        app: {settings: {getRenderText: () => true, getRenderMyText: () => true}},
        shadows: {small: {id: 'shadow', width: 16, height: 16}},
        sprites: {weapon: {id: 'weapon', width: 48, height: 48, offsetX: -16, offsetY: -20,
            animationData: {walk_right: {row: 1, length: 4}}}},
    };
    const renderer = Object.assign(Object.create(modules.renderer.prototype), {
        game, scale, tilesize: 16, upscaledRendering: true,
    });
    const camera = renderer.camera = new modules.camera(renderer);
    const updater = Object.assign(Object.create(modules.updater.prototype), {game});

    const draws = [];
    function context() {
        let transform = {x: 0, y: 0, sx: 1, sy: 1};
        const stack = [];
        return {
            clearRect() {},
            save() { stack.push({...transform}); },
            restore() { transform = stack.pop(); },
            translate(x, y) { transform.x += x * transform.sx; transform.y += y * transform.sy; },
            scale(x, y) { transform.sx *= x; transform.sy *= y; },
            drawImage(image, ...args) {
                if (args.length !== 8) return;
                draws.push({sprite: image, x: transform.x + args[4] * transform.sx,
                    y: transform.y + args[5] * transform.sy,
                    width: args[6] * transform.sx, height: args[7] * transform.sy});
            },
        };
    }
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8'), sandbox);
    const worker = vm.runInContext(`({drawEntities, install(ctx, highCtx) {
        composingWorld = true;
        for (const id of ['entities', 'highEntities', 'background', 'high']) canvases[id] = {width: 480, height: 224};
        contexes.entities = ctx; contexes.highEntities = highCtx;
        sprites.avatar = {image: 'avatar'}; sprites.weapon = {image: 'weapon'}; sprites.shadow16 = {image: 'shadow'};
    }})`, sandbox);
    worker.install(context(), context());
    function frame(time) {
        game.currentTime = time;
        updater.updateCharacter(player);
        updater.updateTransitions();
        camera.follow(player, time);
        draws.length = 0;
        const [names, entity] = renderer.drawEntity(player);
        worker.drawEntities({id: 'entities', cameraX: camera.x, cameraY: camera.y,
            scale, entityData: [entity]});
        return {names, draws: draws.slice(), x: Math.round(player.x - camera.x), y: Math.round(player.y - camera.y)};
    }
    return {player, camera, frame};
}

test.each([2, 3])('steady walking keeps a fixed screen pose and aligned equipment at scale %i', scale => {
    for (const speed of [87, 120]) for (const hz of [30, 60, 120, 144]) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            for (const manual of [false, true]) {
                const {frame} = setup({dx, dy, speed, scale, manual});
                const poses = [];
                for (let index = 0; index < hz * 2; index++) {
                    const time = index * 1000 / hz;
                    const result = frame(time);
                    const avatar = result.draws.find(draw => draw.sprite === 'avatar');
                    const weapon = result.draws.find(draw => draw.sprite === 'weapon');
                    const shadow = result.draws.find(draw => draw.sprite === 'shadow');
                    expect(avatar.width).toBe(dx < 0 ? -32 : 32);
                    expect(avatar.height).toBe(32);
                    expect(weapon.x - avatar.x).toBe(dx < 0 ? 8 : -8);
                    expect(weapon.y - avatar.y).toBe(-8);
                    expect(shadow.y - avatar.y).toBe(12);
                    for (const draw of result.draws) {
                        expect(draw.x).toBeCloseTo(Math.round(draw.x), 8);
                        expect(draw.y).toBeCloseTo(Math.round(draw.y), 8);
                    }
                    if (time > 1000) poses.push([Math.round(avatar.x), Math.round(avatar.y)]);
                }
                expect(new Set(poses.map(pose => pose.join(','))).size).toBe(1);
            }
        }
    }
});

test('stopping lets the camera settle without reversing the avatar screen motion', () => {
    const {player, frame} = setup({manual: true});
    for (let time = 0; time <= 1000; time += 1000 / 60) frame(time);
    player.stop();
    let previous;
    for (let time = 1200; time < 2000; time += 1000 / 60) {
        const {x} = frame(time);
        if (previous !== undefined) expect(x).toBeLessThanOrEqual(previous);
        previous = x;
    }
    expect(previous).toBe(240);
});

test('camera bounds keep the avatar moving forward while the camera is clamped', () => {
    const {camera, frame} = setup();
    camera.setBoundingBox(0, 0, 60, 60);
    let previous;
    for (let time = 0; time < 2000; time += 1000 / 60) {
        const {x} = frame(time);
        if (previous !== undefined) expect(x).toBeGreaterThanOrEqual(previous);
        previous = x;
    }
    expect(camera.x).toBe(480);
    expect(previous).toBeGreaterThan(240);
});
