const fs = require('fs'), vm = require('vm');
let Feedback;
vm.runInNewContext(fs.readFileSync(require.resolve('./healthbarfeedback'), 'utf8'), {
    setTimeout: (...args) => setTimeout(...args), clearTimeout: timer => clearTimeout(timer),
    define: factory => { Feedback = factory(); },
});
function setup() {
    const fill = {style: {}};
    const trail = {style: {}, classList: {add: jest.fn(), remove: jest.fn()}};
    return {fill, trail, feedback: new Feedback(fill, trail)};
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('damage updates the actual health immediately and then settles the delayed trail', () => {
    const {feedback, fill, trail} = setup();
    feedback.update(100, 100, false);
    feedback.update(70, 100, false);
    expect(fill.style.width).toBe('70px');
    expect(trail.style.width).toBe('100px');
    jest.advanceTimersByTime(180);
    expect(trail.style.width).toBe('70px');
    expect(trail.classList.add).toHaveBeenCalledWith('settling');
});
test('rapid damage preserves the lost-health range and unchanged readbacks keep the timer', () => {
    const {feedback, trail} = setup();
    feedback.update(100, 100, false);
    feedback.update(70, 100, false);
    jest.advanceTimersByTime(100);
    feedback.update(50, 100, false);
    feedback.update(50, 100, false);
    expect(trail.style.width).toBe('100px');
    jest.advanceTimersByTime(180);
    expect(trail.style.width).toBe('50px');
});
test.each(['heal', 'max health', 'reduced motion', 'resize'])('%s cancels stale damage trails', reason => {
    const {feedback, trail} = setup();
    feedback.update(100, 100, false);
    feedback.update(70, 100, false);
    const width = reason === 'heal' ? 90 : 70;
    if (reason === 'resize') {
        feedback.dispose();
        new Feedback({style: {}}, trail).update(width, 100, false);
    } else feedback.update(width, reason === 'max health' ? 200 : 100, reason === 'reduced motion');
    jest.advanceTimersByTime(1000);
    expect(trail.style.width).toBe(width + 'px');
});
