const fs = require('fs');
const path = require('path');
const vm = require('vm');

const marker = 'looperlands:map-transition';
const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function createApp(sessionId, sessionStorage) {
    let definition;
    const body = {removeClass: jest.fn(), addClass: jest.fn()};
    const window = {location: {search: '?sessionId=' + sessionId}, sessionStorage};
    const $ = selector => selector === 'body' ? body : {};
    vm.runInNewContext(source, {
        Class: {extend: value => value},
        define: (names, factory) => {definition = factory($, function Storage() {});},
        window, URLSearchParams, setInterval, clearInterval, setTimeout,
        GameSettings: function GameSettings() {},
    });
    const app = Object.assign(Object.create(definition), {
        hideWindows: jest.fn(), calculateTime: jest.fn(),
    });
    app.init();
    return {app, body};
}

function storage(transitionSession) {
    const values = new Map(transitionSession ? [[marker, transitionSession]] : []);
    return {
        getItem: key => values.get(key) ?? null,
        removeItem: key => values.delete(key),
    };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a successful map handoff skips the intro delay exactly once', () => {
    const sessionStorage = storage('next');
    const {app, body} = createApp('next', sessionStorage);
    const start = jest.fn();
    app.hideIntro(start);
    expect(start).not.toHaveBeenCalled();
    jest.advanceTimersByTime(0);
    expect(start).toHaveBeenCalledTimes(1);
    expect(body.addClass).toHaveBeenCalledWith('game');
    expect(sessionStorage.getItem(marker)).toBeNull();

    // A reload of the same session retains the ordinary intro behavior.
    const reloaded = createApp('next', sessionStorage);
    const reloadStart = jest.fn();
    reloaded.app.hideIntro(reloadStart);
    jest.advanceTimersByTime(999);
    expect(reloadStart).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(reloadStart).toHaveBeenCalledTimes(1);
});

test.each([undefined, 'other-session'])('normal startup keeps its intro delay with marker %s', transitionSession => {
    const sessionStorage = storage(transitionSession);
    const {app} = createApp('next', sessionStorage);
    const start = jest.fn();
    app.hideIntro(start);
    jest.advanceTimersByTime(999);
    expect(start).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(marker)).toBeNull();
});

test('disabled browser storage falls back to normal startup', () => {
    const {app} = createApp('next', {getItem: () => {throw new Error('Storage disabled');}});
    const start = jest.fn();
    app.hideIntro(start);
    jest.advanceTimersByTime(999);
    expect(start).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(start).toHaveBeenCalledTimes(1);
});
