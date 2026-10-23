const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup() {
    const sandbox = {console: {debug: jest.fn()}, define: factory => {sandbox.Camera = factory();}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'camera.js'), 'utf8'), sandbox);
    sandbox.define = (dependencies, factory) => { sandbox.Renderer = factory(sandbox.Camera); };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'), sandbox);
    const renderer = Object.create(sandbox.Renderer.prototype);
    Object.assign(renderer, {mobile: false, tilesize: 16, scale: 2,
        canvas: {width: 960, height: 448}, backcanvas: {}, forecanvas: {},
        worker: {postMessage: jest.fn()},
    });
    renderer.createCamera();
    const camera = renderer.camera;
    camera.setBoundingBox(0, 193, 93, 61);
    camera.follow({x: 800, y: 3600}, 1000);
    camera.follow({x: 804, y: 3600}, 1016);
    renderer.worker.postMessage.mockClear();
    return {renderer, camera, sandbox};
}

test('same-size resize retains town bounds and camera easing without clearing canvas layers', () => {
    const {renderer, camera} = setup();
    const state = {x: camera.x, y: camera.y, followTime: camera.followTime, followX: camera.followX};
    const bounds = camera.bounds;
    renderer.createCamera();
    expect(renderer.camera).toBe(camera);
    expect(camera.bounds).toBe(bounds);
    expect(camera).toMatchObject(state);
    expect(renderer.worker.postMessage).not.toHaveBeenCalled();
});

test('scale and mobile viewport changes resize layers while retaining scene bounds', () => {
    const {renderer, camera} = setup();
    const bounds = camera.bounds;
    renderer.scale = 3;
    renderer.createCamera();
    expect(renderer.camera).toBe(camera);
    expect(camera.bounds).toBe(bounds);
    expect(renderer.worker.postMessage).toHaveBeenLastCalledWith({type:'setCanvasSize',width:1440,height:672});
    renderer.mobile = true;
    renderer.scale = 2;
    renderer.createCamera();
    expect(camera.gridW).toBe(15);
    expect(camera.bounds).toBe(bounds);
    expect(renderer.worker.postMessage).toHaveBeenLastCalledWith({type:'setCanvasSize',width:480,height:224});
    expect(renderer.forecanvas).toEqual({width:480,height:224});
});

test('app resize is safe before sprites load and selects them once initialized', () => {
    const {renderer, sandbox} = setup();
    sandbox.window = {innerWidth: 1280, innerHeight: 720};
    const container = {offsetWidth: 980, offsetHeight: 504, style: {}};
    sandbox.document = {getElementById: () => container};
    sandbox.define = (dependencies, factory) => {sandbox.Game = factory();};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), sandbox);
    sandbox.define = (dependencies, factory) => {sandbox.App = factory();};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), sandbox);

    const game = Object.assign(Object.create(sandbox.Game.prototype), {renderer, started: false});
    const app = Object.assign(Object.create(sandbox.App.prototype), {
        game, settings: {getFullscreen: () => true},
    });
    Object.assign(renderer, {
        game, upscaledRendering: true, context: {}, background: {}, foreground: {},
        initFont: jest.fn(), initFPS: jest.fn(),
    });

    expect(() => app.resizeUi()).not.toThrow();
    expect(game.spritesets).toBeUndefined();
    expect(container.style.left).toBe('640px');

    game.spritesets = [{player: {}}];
    Object.assign(sandbox.window, {innerWidth: 844, innerHeight: 390});
    app.resizeUi();
    expect(game.sprites).toBe(game.spritesets[0]);
    expect(renderer.mobile).toBe(true);
    expect(renderer.canvas).toEqual({width: 480, height: 224});
    expect(container.style.left).toBe('422px');
});
