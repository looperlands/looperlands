const axios = require('axios');
const { MinigameController } = require('./minigamecontroller.js');
jest.mock('axios');

// Mock process events to avoid actual exit
jest.spyOn(process, 'on').mockImplementation(() => { });

describe('MinigameController', () => {
  let controller;
  const apiKey = 'fake-api-key';
  const baseUrl = 'http://fake-url.com';

  beforeEach(() => {
    axios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} }),
      put: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    controller = new MinigameController(apiKey, baseUrl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize axios client with headers', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
    });

    it('should handle undefined platform', () => {
      controller = new MinigameController(undefined, undefined);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
    });
  });

  describe('startMinigame', () => {
    it('should send a POST request to start a minigame', async () => {
      const minigameId = 'minigame123';
      const responseData = { success: true };

      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: responseData })
      });

      const result = await controller.startMinigame(minigameId);

      expect(controller.client.post).toHaveBeenCalledWith(`/api/minigame/start`, { minigameId });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const minigameId = 'minigame123';
      const error = new Error('Network Error');

      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(error)
      });

      await expect(controller.startMinigame(minigameId)).rejects.toThrow(error);
    });
  });

  describe('endMinigame', () => {
    it('should send a POST request to end a minigame', async () => {
      const minigameId = 'minigame123';
      const responseData = { success: true };

      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: responseData })
      });

      const result = await controller.endMinigame(minigameId);

      expect(controller.client.post).toHaveBeenCalledWith(`/api/minigame/end`, { minigameId });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const minigameId = 'minigame123';
      const error = new Error('Network Error');

      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(error)
      });

      await expect(controller.endMinigame(minigameId)).rejects.toThrow(error);
    });
  });

  describe('getMinigameStatus', () => {
    it('should send a GET request to retrieve minigame status and return response data', async () => {
      const minigameId = 'minigame123';
      const responseData = { status: 'running' };

      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: responseData })
      });

      const result = await controller.getMinigameStatus(minigameId);

      expect(controller.client.get).toHaveBeenCalledWith(`/api/minigame/status/${minigameId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const minigameId = 'minigame123';
      const error = new Error('Network Error');

      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(error)
      });

      await expect(controller.getMinigameStatus(minigameId)).rejects.toThrow(error);
    });
  });

  describe('handleError', () => {
    it('should throw an error with a custom message', () => {
      const error = { response: { status: 404 } };

      expect(() => controller.handleError(error)).toThrow('HTTP error! status: 404');
    });

    it('should throw an error for no response received', () => {
      const error = { request: {} };

      expect(() => controller.handleError(error)).toThrow('No response received');
    });

    it('should throw an error for general errors', () => {
      const error = new Error('General error');

      expect(() => controller.handleError(error)).toThrow('General error');
    });
  });
});
