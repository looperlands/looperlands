const fs = require('fs');
const vm = require('vm');

let methods;
vm.runInNewContext(fs.readFileSync(require.resolve('./character'), 'utf8'), {
    define: (_, factory) => { methods = factory({extend: definition => definition}); },
});

test('duplicate death does not restart callbacks while the death animation remains visible', () => {
    const character = {
        isDead: false,
        removeTarget: jest.fn(),
        death_callback: jest.fn(),
        leave_callback: jest.fn(),
        leave_callback_area: {},
    };
    const leave = character.leave_callback;
    methods.die.call(character);
    methods.die.call(character);
    expect(character.isDead).toBe(true);
    expect(character.removeTarget).toHaveBeenCalledTimes(1);
    expect(character.death_callback).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(character.leave_callback).toBeNull();
    expect(character.leave_callback_area).toBeNull();
});
