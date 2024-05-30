const AnnouncementController = require('./announcementcontroller.js').AnnouncementController;

describe('AnnouncementController', () => {
    let controller;
    let worldsMap;
    let req;
    let res;

    beforeEach(() => {
        worldsMap = {
            map1: {
                players: {
                    player1: { sendAnnoucement: jest.fn() },
                    player2: { sendAnnoucement: jest.fn() }
                }
            },
            map2: {
                players: {
                    player3: { sendAnnoucement: jest.fn() }
                }
            }
        };
        controller = new AnnouncementController(worldsMap);

        req = {
            body: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    test('should return 401 if API key is invalid', () => {
        req.headers['x-api-key'] = 'invalid-api-key';
        process.env.LOOPWORMS_API_KEY = 'valid-api-key';

        controller.sendAnnouncement(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: false,
            "error": "invalid api key",
            user: null
        });
    });

    test('should return 400 if message is not provided', () => {
        req.headers['x-api-key'] = 'valid-api-key';
        process.env.LOOPWORMS_API_KEY = 'valid-api-key';

        controller.sendAnnouncement(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Announcement text is required.');
    });

    test('should send announcement to all maps if maps array is not provided', () => {
        req.headers['x-api-key'] = 'valid-api-key';
        req.body = {
            message: 'Test message',
            timeToShow: 1000
        };
        process.env.LOOPWORMS_API_KEY = 'valid-api-key';

        controller.sendAnnouncement(req, res);

        expect(worldsMap.map1.players.player1.sendAnnoucement).toHaveBeenCalledWith('Test message', 1000);
        expect(worldsMap.map1.players.player2.sendAnnoucement).toHaveBeenCalledWith('Test message', 1000);
        expect(worldsMap.map2.players.player3.sendAnnoucement).toHaveBeenCalledWith('Test message', 1000);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            "success": true
        });
    });

    test('should send announcement to specified maps', () => {
        req.headers['x-api-key'] = 'valid-api-key';
        req.body = {
            maps: ['map1'],
            message: 'Test message',
            timeToShow: 1000
        };
        process.env.LOOPWORMS_API_KEY = 'valid-api-key';

        controller.sendAnnouncement(req, res);

        expect(worldsMap.map1.players.player1.sendAnnoucement).toHaveBeenCalledWith('Test message', 1000);
        expect(worldsMap.map1.players.player2.sendAnnoucement).toHaveBeenCalledWith('Test message', 1000);
        expect(worldsMap.map2.players.player3.sendAnnoucement).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            "success": true
        });
    });
});
