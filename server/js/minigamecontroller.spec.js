const MinigameController = require('./minigamecontroller.js');
const discord = require("../js/discord");

jest.mock('../apps/JackAce/jackace_ss', () => {
  return jest.fn().mockImplementation(() => {
    return {
      handleAction: jest.fn(),
    };
  });
}, { virtual: true });

jest.mock("../js/discord", () => ({
  sendToDebugChannel: jest.fn(),
  sendToDevChannel: jest.fn()
}));

describe('MinigameController', () => {
  let cacheMock, platformClientMock, reqMock, resMock;
  let controller;

  beforeEach(async () => {
    cacheMock = {};
    platformClientMock = {};
    reqMock = {
      body: {}
    };
    resMock = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    controller = new MinigameController(cacheMock, platformClientMock);
    await controller.registerMinigames();
  });

  describe('constructor', () => {
    it('should initialize with cache and platformClient', () => {
      expect(controller.cache).toBe(cacheMock);
      expect(controller.platformClient).toBe(platformClientMock);
      expect(controller.minigames).toHaveProperty('jackace');
    });
  });

  describe('registerMinigame', () => {
    it('should register a minigame', () => {
      const minigameMock = {};
      controller.registerMinigame('testGame', minigameMock);
      expect(controller.minigames['testGame']).toBe(minigameMock);
    });
  });

  describe('registerMinigames', () => {
    it('should register all minigames from the config', async () => {
      await controller.registerMinigames();
      expect(controller.minigames['jackace']).toBeDefined();
    });
  });

  describe('handleRequest', () => {
    it('should return 400 if minigame not found', async () => {
      reqMock.body = { minigame: 'unknownGame', action: 'someAction' };

      await controller.handleRequest(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(400);
      expect(resMock.json).toHaveBeenCalledWith({ error: "Minigame not found" });
    });

    it('should handle action for registered minigame', async () => {
      const handleActionMock = jest.fn();
      controller.registerMinigame('testGame', { handleAction: handleActionMock });
      reqMock.body = { minigame: 'testGame', action: 'someAction' };

      await controller.handleRequest(reqMock, resMock);

      expect(handleActionMock).toHaveBeenCalledWith(reqMock, resMock, 'someAction');
    });

    it('should return 500 if an error occurs', async () => {
      reqMock.body = { minigame: 'testGame', action: 'someAction' };
      const handleActionMock = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      controller.registerMinigame('testGame', { handleAction: handleActionMock });

      await controller.handleRequest(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(500);
      expect(resMock.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
  });

  describe('errorEncountered', () => {
    it('should send error message to dev channel', () => {
      const message = 'Test error message';
      controller.errorEncountered(message);
      expect(discord.sendToDevChannel).toHaveBeenCalledWith(message);
    });
  });
});
