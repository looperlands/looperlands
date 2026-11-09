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

test('evolution has a separate accessible notification and keeps weapon mechanics explicit', () => {
    jest.useFakeTimers();
    let app;
    const notification = {lines: [], classes: new Set(),
        empty() {this.lines = []; return this;},
        toggleClass(name, enabled) {if (enabled) this.classes.add(name); else this.classes.delete(name); return this;},
        addClass(name) {this.classes.add(name); return this;}, removeClass(name) {this.classes.delete(name); return this;}
    };
    const notice = {hidden: true};
    const $ = selector => selector === '#evolution-notification' ? notification : {
        text(value) {this.value = value; return this;}, appendTo(target) {target.lines.push(this.value);}
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        define: (_, factory) => {app = factory($);}, Class: {extend: methods => methods},
        document: {getElementById: () => notice}, setTimeout, clearTimeout,
    });
    app.settings = {getReducedMotion: () => true}; app.game = {player: {canHoldWeapon: false}};
    app.showEvolutionNotification({evolutionLevel: 10, canHoldWeapon: false}); app.updateWeaponAppearanceNotice();
    expect(notification.lines).toContain('EVOLVED!');
    expect(notification.lines.at(-1)).toContain('damage, traits and XP');
    expect(notification.classes.has('reduced-motion')).toBe(true);
    expect(notice.hidden).toBe(false);
    jest.advanceTimersByTime(3000); app.showEvolutionNotification({evolutionLevel: 20, canHoldWeapon: true});
    jest.advanceTimersByTime(3000); expect(notification.classes.has('active')).toBe(true);
    jest.advanceTimersByTime(5000); expect(notification.classes.has('active')).toBe(false);
    app.showEvolutionNotification({evolutionLevel: 30}, true);
    expect(notification.lines).toContain('EVOLVING...');
    jest.advanceTimersByTime(1800);
    app.showEvolutionNotification({evolutionLevel: 30});
    expect(notification.lines).toContain('EVOLVED!');
    jest.advanceTimersByTime(7999); expect(notification.classes.has('active')).toBe(true);
    jest.advanceTimersByTime(1); expect(notification.classes.has('active')).toBe(false);
    app.showEvolutionNotification({evolutionLevel: 40}, true);
    app.hideEvolutionNotification();
    expect(notification.classes.has('active')).toBe(false);
    app.game.player.canHoldWeapon = true; app.updateWeaponAppearanceNotice(); expect(notice.hidden).toBe(true);
    jest.useRealTimers();
});
