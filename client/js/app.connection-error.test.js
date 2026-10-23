const fs = require('fs'), vm = require('vm');

test.each(['127.0.0.1', 'localhost', '[::1]', 'play.looperlands.io'])('connection errors offer recovery on the same environment (%s)', hostname => {
    const elements = new Map();
    const $ = selector => {
        if (!elements.has(selector)) {
            const node = {};
            for (const method of ['text', 'prop', 'attr', 'removeClass', 'addClass']) {
                node[method] = jest.fn(() => node);
            }
            elements.set(selector, node);
        }
        return elements.get(selector);
    };
    const link = {focus: jest.fn()};
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        window: {location: {hostname}}, document: {querySelector: () => link},
        Class: {extend: value => value}, define: (_dependencies, factory) => {methods = factory($);}
    });
    const app = Object.assign(Object.create(methods), {
        hideWindows: jest.fn(), hideChat: jest.fn(), closeChoicesPopup: jest.fn()
    });
    app.showDeath('Sprite artwork could not be loaded: img/1/custom.png');
    const local = hostname !== 'play.looperlands.io';
    expect($('#death a').attr).toHaveBeenCalledWith('href', local ? '/' : 'https://looperlands.io');
    expect($('#death a').text).toHaveBeenCalledWith(local ? 'Local setup' : 'Character selection');
    expect($('#death-description').text).toHaveBeenCalledWith(expect.stringContaining('custom.png'));
    expect($('#respawn').prop).toHaveBeenCalledWith('hidden', true);
    expect(link.focus).toHaveBeenCalled();
});
