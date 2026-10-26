const fs = require('fs');
const vm = require('vm');
const http = require('http');
const axios = require('axios');
const _ = require('underscore');
const {LooperLandsPlatformClient} = require('./looperlandsplatformclient');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');

test.each(['disconnect', 'timeout', 'http error'])('inventory returns 503 on platform %s and recovers on the next request', async failure => {
    let failing = true;
    const upstream = http.createServer((req, res) => {
        if (failing) {
            if (failure === 'disconnect') req.socket.destroy();
            else if (failure === 'http error') {res.writeHead(503); res.end('unavailable');}
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
    });
    await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
    try {
        const client = Object.create(LooperLandsPlatformClient.prototype);
        client.client = axios.create({baseURL: `http://127.0.0.1:${upstream.address().port}`, proxy: false});
        const timeouts = [];
        client.client.interceptors.request.use(config => {
            timeouts.push(config.timeout);
            // Exercise the real Axios timeout path without waiting ten seconds.
            if (failure === 'timeout') config.timeout = 30;
            return config;
        });
        let route;
        const warn = jest.fn();
        const start = source.indexOf('        app.get("/session/:sessionId/inventory"');
        const end = source.indexOf('        app.get("/session/:sessionId/quests"', start);
        vm.runInNewContext(source.slice(start, end), {
            app: {get: (_, handler) => {route = handler;}},
            cache: {get: () => ({walletId: 'wallet', nftId: 'avatar', mapId: 'map', gameData: {items: {}}})},
            dao: {getInventory: (wallet, nft) => client.getInventory(wallet, nft)},
            self: {worldsMap: {map: {getPlayerById: () => undefined}}},
            getConsumableEffects: () => ({}), _, console: {warn},
        });
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const req = {params: {sessionId: 'session'}};
        await route(req, res);
        expect(res.status).toHaveBeenLastCalledWith(503);
        expect(res.json).toHaveBeenLastCalledWith({error: 'inventory_unavailable'});
        expect(warn).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(warn.mock.calls)).not.toMatch(/wallet|avatar|session/);

        failing = false;
        await route(req, res);
        expect(res.status).toHaveBeenLastCalledWith(200);
        expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({inventory: [], special: [], bots: []}));
        expect(timeouts).toEqual([10000, 10000]);
    } finally {
        upstream.closeAllConnections();
        await new Promise(resolve => upstream.close(resolve));
    }
});
