const MinigameController = require('./minigamecontroller.js');
const mockCache = {};
const mockPlatformClient = {};

describe('MinigameController', () => {
    let minigameController;

    beforeEach(() => {
        jest.resetModules();
        minigameController = new MinigameController(mockCache, mockPlatformClient);
    });

    test('should initialize with empty minigames', () => {
        expect(minigameController.minigames).toEqual({});
    });

    test('should register minigames', async () => {
        jest.mock('../apps/JackAce/jackace_ss', () => {
            return jest.fn().mockImplementation(() => {
                return { handleAction: jest.fn() };
            });
        });

        await minigameController.registerMinigames();

        expect(minigameController.minigames['jackace']).toBeDefined();
    });

    test('should handle request for existing minigame', async () => {
        const req = {
            body: {
                minigame: 'jackace',
                action: 'testAction'
            }
        };
        const res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };

        jest.mock('../apps/JackAce/jackace_ss', () => {
            return jest.fn().mockImplementation(() => {
                return {
                    handleAction: jest.fn((req, res, action) => {
                        res.status(200).json({ success: true });
                    })
                };
            });
        });

        await minigameController.registerMinigames();
        await minigameController.handleRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test('should return error for non-existing minigame', async () => {
        const req = {
            body: {
                minigame: 'nonexistent',
                action: 'testAction'
            }
        };
        const res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };

        await minigameController.handleRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Minigame not found" });
    });

    test('should handle errors gracefully', async () => {
        const req = {
            body: {
                minigame: 'jackace',
                action: 'testAction'
            }
        };
        const res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };

        jest.mock('../apps/JackAce/jackace_ss', () => {
            return jest.fn().mockImplementation(() => {
                return {
                    handleAction: jest.fn(() => {
                        throw new Error('Test error');
                    })
                };
            });
        });

        await minigameController.registerMinigames();
        await minigameController.handleRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
});
