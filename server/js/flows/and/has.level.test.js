const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('map flow level gates use event levels and retain the legacy XP fallback', () => {
    // Load the legacy inheritance helper without Babel strict mode (arguments.callee).
    const inheritance = {exports: {}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../lib/class.js'), 'utf8'), inheritance);
    const formulas = {level: jest.fn(xp => xp === 123 ? 75 : 1)};
    const context = {module: {exports: {}}, require: name => name === '../../lib/class' ? inheritance.exports : formulas};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'has.level.js'), 'utf8'), context);
    const gate = new context.module.exports({level: 30});
    expect(gate.handle({data: {player: {getLevel: () => 20}, playerData: {xp: 123}}})).toBe(false);
    expect(gate.handle({data: {player: {getLevel: () => 40}, playerData: {xp: 0}}})).toBe(true);
    expect(formulas.level).not.toHaveBeenCalled();
    expect(gate.handle({data: {playerData: {xp: 123}}})).toBe(true);
    expect(formulas.level).toHaveBeenCalledWith(123);
});
