const fs = require('fs'), vm = require('vm');
let profile, character;
vm.runInNewContext(fs.readFileSync(require.resolve('./attacktiming'), 'utf8'), {
    define: factory => { profile = factory(); },
});
vm.runInNewContext(fs.readFileSync(require.resolve('./character'), 'utf8'), {
    define: (_, factory) => { character = factory({extend: methods => methods}, null, null, profile); },
});
test.each([3, 5, 8, 12])('shapes %s frames without changing the swing duration', length => {
    const frames = profile(50, length);
    expect(frames.reduce((sum, value) => sum + value, 0)).toBeCloseTo(50 * length);
    expect(frames[Math.floor(length / 2)]).toBeLessThan(frames[0]);
    expect(frames[length - 1]).toBeGreaterThan(frames[Math.floor(length / 2)]);
});
test('short animations and varied speed arrays keep their timing; uniform arrays receive a snap', () => {
    const authored = [100, 20, 80];
    expect(profile(authored, 3)).toBe(authored);
    expect(profile(50, 2)).toBe(50);
    expect(profile([50, 50, 50], 3)).toEqual(profile(50, 3));
    expect(profile(50, 5)[2]).toBeLessThan(profile(50, 5)[0] / 5);
});
function actor(authoredSpeed) {
    return {orientation: 2, sprite: {animationData: {atk_down: {speed: authoredSpeed}}},
        animations: {atk_down: {length: 5}}, hasAnimation: () => true, setAnimation: jest.fn()};
}
const Types = {Orientations: {LEFT: 1, DOWN: 2}, getOrientationAsString: () => 'down'};
test('only a requested combat swing receives the profile; authored speeds win', () => {
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./character'), 'utf8'), {
        Types, _: {indexOf: (list, value) => list.indexOf(value)},
        define: (_, factory) => { methods = factory({extend: value => value}, null, null, profile); },
    });
    const ordinary = actor();
    methods.animate.call(ordinary, 'atk', 50, 1, undefined, true);
    expect(ordinary.setAnimation.mock.calls[0][1]).toEqual(profile(50, 5));
    const authored = actor([100, 10, 20, 40, 80]);
    methods.animate.call(authored, 'atk', 50, 1, undefined, true);
    expect(authored.setAnimation.mock.calls[0][1]).toBe(50);
    const uniform = actor(100);
    methods.animate.call(uniform, 'atk', 50, 1, undefined, true);
    expect(uniform.setAnimation.mock.calls[0][1]).toEqual(profile(100, 5));
    methods.animate.call(ordinary, 'atk', 75, 1);
    expect(ordinary.setAnimation.mock.calls[1][1]).toBe(75);
    const cached = actor();
    cached.currentAnimation = {name: 'idle_down'};
    const animation = {name: 'atk_down', setSpeed: jest.fn()};
    cached.setAnimation = () => { cached.currentAnimation = animation; };
    methods.animate.call(cached, 'atk', 50, 1, undefined, true);
    expect(animation.setSpeed).toHaveBeenCalledWith(profile(50, 5));
});
