const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup({fallback, immediateError = false} = {}) {
    let app;
    const timers = [];
    const requests = [];
    const error = jest.fn();
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
        define: (deps, factory) => { app = factory({}); },
        Class: {extend: methods => methods},
        window: {location: {href: 'https://looperlands.io/game/'}}, URL,
        setTimeout: (callback, delay) => timers.push({callback, delay}), console: {error}
    });
    const image = {dataset: {src: 'img/3/item.png', fallbackSrc: fallback},
        style: {objectPosition: '0 4px'}, isConnected: true,
        removeAttribute: jest.fn()};
    Object.defineProperty(image, 'src', {set(url) {
        requests.push(url);
        if (immediateError && requests.length === 1) image.onerror();
    }});
    app.loadInventoryImages({querySelectorAll: () => [image]});
    return {image, timers, requests, error};
}

test('handles immediate failures and retries without changing the icon crop', () => {
    const {image, timers, requests} = setup({immediateError: true});
    expect(timers[0].delay).toBe(500);
    timers.shift().callback();
    expect(requests[1]).toBe('https://looperlands.io/game/img/3/item.png?imageRetry=1');
    expect(image.style.objectPosition).toBe('0 4px');
    image.onload();
    expect(image.onerror).toBeNull();
});

test('uses the weapon fallback only after retries and retries that fallback too', () => {
    const {image, timers, requests, error} = setup({fallback: 'img/1/weapon.png'});
    for (let i = 0; i < 3; i++) {
        image.onerror();
        if (timers.length) timers.shift().callback();
    }
    expect(requests).toHaveLength(4);
    expect(requests[3]).toBe('img/1/weapon.png');
    expect(image.style.objectPosition).toBe('0 -400px');
    image.onerror();
    timers.shift().callback();
    expect(requests[4]).toContain('img/1/weapon.png?imageRetry=1');
    image.onload();
    expect(error).not.toHaveBeenCalled();
});

test('bounds retries when an inventory icon is unavailable', () => {
    const {image, timers, requests, error} = setup();
    for (let i = 0; i < 3; i++) {
        image.onerror();
        if (timers.length) timers.shift().callback();
    }
    expect(requests).toHaveLength(3);
    expect(image.onerror).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
});

test('does not retry icons removed by rebuilding the inventory', () => {
    const {image, timers, requests} = setup();
    image.onerror();
    image.isConnected = false;
    timers.shift().callback();
    expect(requests).toHaveLength(1);
});
