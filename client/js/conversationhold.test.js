const fs = require('fs');
const vm = require('vm');
let Hold;
vm.runInNewContext(fs.readFileSync(require.resolve('./conversationhold'), 'utf8'), {define: factory => {Hold = factory();}, setInterval: (...args) => setInterval(...args), clearInterval: id => clearInterval(id)});
test('listening hold renews during reading and releases on close, switching NPC or walking away', () => {
    jest.useFakeTimers();
    const view = {nearby: jest.fn(() => true), listen: jest.fn(), leave: jest.fn()};
    const hold = new Hold(view);
    hold.start(7); jest.advanceTimersByTime(64000);
    expect(view.listen.mock.calls.filter(call => call[1])).toHaveLength(17);
    hold.start(8); expect(view.listen).toHaveBeenCalledWith(7, false);
    view.nearby.mockReturnValue(false); jest.advanceTimersByTime(4000);
    expect(view.listen).toHaveBeenLastCalledWith(8, false); expect(view.leave).toHaveBeenCalledWith(8);
    const calls = view.listen.mock.calls.length; jest.advanceTimersByTime(20000);
    expect(view.listen).toHaveBeenCalledTimes(calls);
    hold.stop(); hold.start(9); hold.stop(); expect(view.listen).toHaveBeenLastCalledWith(9, false);
    jest.useRealTimers();
});
