const {applyScenes, sceneBaseline} = require('./localworldscenes');
const scene = (id, name = 'Original') => ({id, name, x: 0, y: 0, w: 10, h: 10});
const map = scenes => ({width: 30, height: 30, scenes});

test('Tiled edits refresh inherited fields while Toolbox edits and scene properties survive', () => {
    const original = scene(1), saved = {...original, x: 2, weatherExposure: 'indoor'};
    const rebuilt = {...original, name: 'Winner', x: 4, w: 15, message: 'Welcome', music: 'forest'};
    const result = applyScenes(map([rebuilt]), [saved], sceneBaseline([original]));
    expect(result.scenes).toEqual([{...rebuilt, x: 2, weatherExposure: 'indoor'}]);
    expect(saved.name).toBe('Original');
    expect(rebuilt.x).toBe(4);
    expect(applyScenes(result, [saved], [original])).toEqual(result);
});

test('Tiled additions and deletions reconcile while Toolbox deletions and custom scenes persist', () => {
    const baseline = [scene(1), scene(2), scene(3)];
    const saved = [scene('custom', 'Custom'), scene(1), scene(2)];
    const result = applyScenes(map([scene(1, 'Renamed'), scene(3), scene(4, 'New')]), saved, baseline);
    expect(result.scenes.map(s => s.id)).toEqual(['custom', 1, 4]);
    expect(result.scenes[1].name).toBe('Renamed');
});

test('legacy layouts keep their explicit replacement behavior until saved with a baseline', () => {
    expect(applyScenes(map([scene(1), scene(2)]), [scene(1, 'Override')]).scenes).toEqual([scene(1, 'Override')]);
    expect(applyScenes(map([scene(1)]), null).scenes).toEqual([scene(1)]);
});

test('unnamed Tiled scenes inherit names on rebuild and synthetic atmosphere regions are not imported', () => {
    const original = {id: 1, x: 0, y: 0, w: 10, h: 10};
    const built = map([scene(1, 'Named later'), scene('mapmaker-default', 'Map atmosphere default')]);
    const saved = [{...original, name: ''}];
    expect(applyScenes(built, saved, sceneBaseline([original])).scenes).toEqual([scene(1, 'Named later')]);
});
