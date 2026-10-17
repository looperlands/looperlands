const fs = require('fs'), vm = require('vm');
test('nearby upgrades share a compact notification and earlier timers cannot dismiss it', () => {
    jest.useFakeTimers();
    let app;
    const notification = {lines: [], active: false,
        empty() { this.lines = []; },
        addClass() { this.active = true; }, removeClass() { this.active = false; }
    };
    const $ = selector => selector === '#levelup-notification' ? notification : {
        text(value) { this.value = value; return this; },
        appendTo(target) { target.lines.push(this.value); }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        define: (_, factory) => {app = factory($);}, Class: {extend: methods => methods},
        setTimeout, clearTimeout,
    });
    app.showLevelUpNotification([{label: 'Avatar', level: 5}]);
    jest.advanceTimersByTime(2000);
    app.showLevelUpNotification([{label: 'Tool', level: 3}]);
    expect(notification.lines).toEqual(['LEVEL UP', 'Avatar · 5', 'Tool · 3']);
    jest.advanceTimersByTime(1200); expect(notification.active).toBe(true);
    jest.advanceTimersByTime(2000); expect(notification.active).toBe(false);
    app.showLevelUpNotification([{label: 'Companion', level: 2}]);
    expect(notification.lines).toEqual(['LEVEL UP', 'Companion · 2']);
    jest.useRealTimers();
});
