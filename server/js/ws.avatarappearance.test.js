const fs = require('fs');
const vm = require('vm');

test.each([undefined, {nftId: '0xavatar', assetType: 'looper', tokenHash: 'original',
    options: {canHoldWeapon: false, evolutions: [{level: 5, sprite: 'evolved', canHoldWeapon: true}]}}])(
    'map travel preserves trusted appearance metadata and ignores browser-supplied forms', async avatar => {
        const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
        const start = source.indexOf("        app.post('/session/:sessionId/teleport'");
        const end = source.indexOf("        app.get('/session/:sessionId'", start);
        let handler;
        const session = {nftId: '0xavatar', walletId: 'wallet', xp: 450, avatar};
        const newSession = jest.fn().mockResolvedValue({sessionId: 'new'});
        vm.runInNewContext(source.slice(start, end), {
            app: {post: (path, fn) => {handler = fn;}}, cache: {get: () => session}, newSession
        });
        const body = {x: 10, y: 20, map: 'duckville', xp: 99999999,
            avatar: {nftId: '0xother', tokenHash: 'forged', options: {canHoldWeapon: true}}};
        const res = {status: jest.fn().mockReturnThis(), send: jest.fn()};
        await handler({params: {sessionId: 'old'}, body}, res);
        expect(newSession).toHaveBeenCalledWith(expect.objectContaining({nftId: '0xavatar', xp: 450, avatar}), true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(session.avatar).toBe(avatar);
    });
