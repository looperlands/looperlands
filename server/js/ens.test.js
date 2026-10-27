jest.mock('axios', () => ({get: jest.fn()}));
jest.mock('alchemy-sdk', () => ({Network: {ETH_MAINNET: 'mainnet'}, Alchemy: jest.fn()}));
jest.mock('node-cache', () => class {
    constructor() {this.values = new Map();}
    get(key) {return this.values.get(key);}
    set(key, value) {this.values.set(key, value);}
});
let ens;
beforeEach(() => {
    jest.resetModules();
    ens = require('./ens');
    require('axios').get.mockReset();
});
test('full ENS survives resolution while the legacy gameplay name stays compact', async () => {
    const get = require('axios').get;
    get.mockResolvedValue({data: {data: 'andre.loopring.eth'}});
    expect(await ens.getEnsName('0xabc')).toBe('andre.loopring.eth');
    expect(await ens.getEns('0xABC')).toBe('andre');
    expect(get).toHaveBeenCalledTimes(1);
});
test('no resolved name returns null separately from the wallet fallback', async () => {
    require('axios').get.mockResolvedValue({data: {data: ''}});
    expect(await ens.getEnsName('0xabcdef1234')).toBeNull();
    expect(await ens.getEns('0xabcdef1234')).toBe('abcdef');
});
test('secondary resolver is used even when the first provider fails', async () => {
    require('axios').get.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({data: {data: 'andre.taiko'}});
    expect(await ens.getEnsName('0xabc')).toBe('andre.taiko');
});

test('both resolvers have a short timeout and failed resolution still allows a wallet name', async () => {
    const get = require('axios').get;
    const cached = jest.spyOn(require('node-cache').prototype, 'set');
    get.mockRejectedValue(Object.assign(new Error('timeout'), {code: 'ECONNABORTED'}));
    expect(await ens.getEns('0xabcdef1234')).toBe('abcdef');
    expect(get).toHaveBeenCalledTimes(2);
    for (const [, config] of get.mock.calls) expect(config.timeout).toBe(1500);
    expect(cached).toHaveBeenCalledWith('0xabcdef1234', null, 60);
});
