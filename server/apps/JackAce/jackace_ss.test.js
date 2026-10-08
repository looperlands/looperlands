const fs = require('fs');
const vm = require('vm');
const path = require('path');

function setup(cards = ['5C', '9D', '6S', '8H'], money = 100) {
    const sessions = new Map(['one', 'two'].map(id => [id, {nftId: 'player', walletId: 'wallet', gameData: {items: {'21300041': 999}}}]));
    const balances = new Map([['player', money], ['house', 10000]]);
    const receipts = new Map();
    const discord = {sendMessage: jest.fn().mockResolvedValue(), sendToDevChannel: jest.fn(), sendToDebugChannel: jest.fn()};
    const dao = {
        getResourceBalance: jest.fn(async player => balances.get(player)),
        transferItems: jest.fn(async request => {
            const from = request.fromNftId === 'player' ? 'player' : 'house';
            const to = request.toNftId === 'player' ? 'player' : 'house';
            if (!receipts.has(request.requestId)) {
                if (balances.get(from) < request.quantity) throw new Error('insufficient_balance');
                balances.set(from, balances.get(from) - request.quantity);
                balances.set(to, balances.get(to) + request.quantity);
                receipts.set(request.requestId, true);
            }
            return {transferId: request.requestId, item: request.item, quantity: request.quantity, fromQuantity: balances.get(from), toQuantity: balances.get(to)};
        })
    };
    const sandbox = {module: {exports: {}}, structuredClone, require: id => {
        if (id === '../../js/dao') return dao;
        if (id === '../../js/discord') return discord;
        if (id === '../../js/ens') return {getEns: async () => 'Local player'};
        return require(id);
    }};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'jackace_ss.js'), 'utf8'), sandbox);
    const game = new sandbox.module.exports({get: id => sessions.get(id), set: (id, data) => sessions.set(id, data)}, {});
    game.initializeDeck = () => [...cards, ...Array(80).fill('2C')];
    const request = async (action, body = {}, session = 'one') => {
        const res = {statusCode: 200, status(code) {this.statusCode = code; return this;}, json(data) {this.data = structuredClone(data); return this;}};
        await game.handleAction({params: {sessionId: session}, body}, res, action);
        return res;
    };
    return {game, dao, balances, receipts, sessions, discord, request};
}

test('public access works, cached GOLD uses the receipt, and Discord announces once', async () => {
    const {request, game, sessions, balances, discord} = setup();
    const dealt = await request('DEAL', {playerBet: 10});
    expect(dealt.statusCode).toBe(200);
    expect(dealt.data.canDouble).toBe(true);
    expect(dealt.data.dealerHand.total).toBe('hidden');
    expect(dealt.data.deck).toBeUndefined();
    expect(dealt.data.actionRecovery).toBeUndefined();
    expect(sessions.get('one').gameData.items['21300041']).toBe(balances.get('player'));
    await request('RESET');
    await request('DEAL', {playerBet: 10});
    expect(discord.sendMessage).toHaveBeenCalledTimes(1);
    expect(game.playerActionQueues).toEqual({});
});

test('RESET before initialization and per-session isolation do not touch another hand', async () => {
    const {request, game} = setup();
    expect((await request('RESET')).statusCode).toBe(200);
    expect(game.playerGameStates.one).toBeUndefined();
    await request('DEAL', {playerBet: 10});
    const cards = [...game.playerGameStates.one.playerHands[0].hand];
    await request('DEAL', {playerBet: 10}, 'two');
    await request('RESET', {}, 'two');
    expect(game.playerGameStates.one.playerHands[0].hand).toEqual(cards);
    expect(game.playerGameStates.one.inProgress).toBe(true);
});

test('overlapping DEAL requests charge a single wager', async () => {
    const {request, dao} = setup();
    const results = await Promise.all([request('DEAL', {playerBet: 10}), request('DEAL', {playerBet: 10})]);
    expect(results.map(result => result.statusCode)).toEqual([200, 400]);
    expect(dao.transferItems).toHaveBeenCalledTimes(1);
});

test('game windows reject action injection and public REWARD', async () => {
    const {request, dao} = setup(['5C', 'KS', '6S', 'AH']);
    await request('DEAL', {playerBet: 10});
    expect((await request('HIT')).statusCode).toBe(400);
    expect((await request('REWARD')).statusCode).toBe(400);
    expect((await request('INSURANCE', {boughtInsurance: 'false'})).statusCode).toBe(400);
    expect(dao.transferItems).toHaveBeenCalledTimes(1);
});

test.each([['4C', '5D', true], ['4C', '6D', true], ['5C', '6D', true], ['AC', '0D', false], ['AC', '8D', false], ['4C', '8D', false]])('DOUBLE eligibility %s %s', (a, b, expected) => {
    expect(setup().game.canDouble([a, b], 'player')).toBe(expected);
});

test('DOUBLE takes one card, settles once, and blocks a repeated request', async () => {
    const {request, balances, dao} = setup(['5C', '9D', '6S', '8H', '0C']);
    await request('DEAL', {playerBet: 10});
    const result = await request('DOUBLE');
    expect(result.data.playerHands[0].hand).toHaveLength(3);
    expect(result.data.gameWindow).toBe('bet');
    expect(balances.get('player')).toBe(120);
    expect(dao.transferItems).toHaveBeenCalledTimes(3);
    expect((await request('DOUBLE')).statusCode).toBe(400);
});

test('insurance may be declined without spare GOLD', async () => {
    const {request, game, balances, dao} = setup(['5C', '9D', '6S', 'AH'], 10);
    await request('DEAL', {playerBet: 5});
    balances.set('player', 0);
    const result = await request('INSURANCE', {boughtInsurance: false});
    expect(result.statusCode).toBe(200);
    expect(result.data.boughtInsurance).toBe(false);
    expect(result.data.gameWindow).toBe('splitDouble');
    expect(game.playerGameStates.one.eligibleForInsurance).toBe(false);
    expect(dao.transferItems).toHaveBeenCalledTimes(1);
});

test('odd insurance stake rounds identically and returns stake plus 2:1 winnings', async () => {
    const {request, balances, dao} = setup(['5C', 'KD', '6S', 'AH']);
    await request('DEAL', {playerBet: 5});
    const result = await request('INSURANCE', {boughtInsurance: true});
    expect(result.data.insuranceBet).toBe(3);
    expect(result.data.reward).toBe(9);
    expect(result.data.gameWindow).toBe('bet');
    expect(balances.get('player')).toBe(101);
    expect(dao.transferItems.mock.calls.map(args => args[0].quantity)).toEqual([5, 3, 9]);
});

test('an automatic split-hand advance exposes resplitting after both replacement cards', async () => {
    const {request} = setup(['AC', '9D', 'AS', '8H', 'KH', 'AD']);
    await request('DEAL', {playerBet: 10});
    const result = await request('SPLIT');
    expect(result.data.currentHandIndex).toBe(1);
    expect(result.data.playerHands[1].hand).toEqual(['AS', 'AD']);
    expect(result.data.playerHands[1].canSplit).toBe(true);
    expect(result.data.gameWindow).toBe('splitDouble');
});

test('two terminal split hands settle and reveal the dealer', async () => {
    const {request, balances} = setup(['AC', '9D', 'AS', '8H', 'KH', 'QD']);
    await request('DEAL', {playerBet: 10});
    const result = await request('SPLIT');
    expect(result.data.gameWindow).toBe('bet');
    expect(result.data.dealerHand.total).toBe(17);
    expect(result.data.reward).toBe(40);
    expect(balances.get('player')).toBe(120);
});

test('an uncertain committed debit reuses its ID and does not double-charge', async () => {
    const {request, game, dao, balances} = setup();
    const transfer = dao.transferItems.getMockImplementation();
    dao.transferItems.mockImplementationOnce(async req => {await transfer(req); throw Object.assign(new Error('receipt unavailable'), {transferUncertain: true});});
    const failed = await request('DEAL', {playerBet: 10});
    expect(failed.statusCode).toBe(503);
    expect(failed.data.recoverable).toBe(true);
    expect(failed.data.actionRecovery).toBeUndefined();
    expect(game.playerGameStates.one.inProgress).toBe(false);
    expect((await request('RESET')).statusCode).toBe(409);
    const result = await request('DEAL', {playerBet: 10});
    expect(result.statusCode).toBe(200);
    expect(balances.get('player')).toBe(90);
    expect(dao.transferItems.mock.calls[0][0].requestId).toBe(dao.transferItems.mock.calls[1][0].requestId);
});

test('a committed natural payout with a lost receipt can replay the entire DEAL at zero balance', async () => {
    const {request, dao, balances} = setup(['AC', '9D', 'KS', '8H'], 10);
    const transfer = dao.transferItems.getMockImplementation();
    let calls = 0;
    dao.transferItems.mockImplementation(async req => {const receipt = await transfer(req); if (++calls === 2) throw Object.assign(new Error('receipt unavailable'), {transferUncertain: true}); return receipt;});
    expect((await request('DEAL', {playerBet: 10})).statusCode).toBe(503);
    expect((await request('DEAL', {playerBet: 10})).statusCode).toBe(200);
    expect(balances.get('player')).toBe(25);
    expect(dao.transferItems.mock.calls[0][0].requestId).toBe(dao.transferItems.mock.calls[2][0].requestId);
    expect(dao.transferItems.mock.calls[1][0].requestId).toBe(dao.transferItems.mock.calls[3][0].requestId);
});

test('failed STAND payout preserves the hand and retries without an extra dealer draw', async () => {
    const {request, dao, balances} = setup(['0C', '9D', '9S', '8H']);
    await request('DEAL', {playerBet: 10});
    dao.transferItems.mockRejectedValueOnce(new Error('temporary failure'));
    const failed = await request('STAND');
    expect(failed.data.inProgress).toBe(true);
    expect(failed.data.dealerHand.total).toBe('hidden');
    const result = await request('STAND');
    expect(result.statusCode).toBe(200);
    expect(result.data.reward).toBe(20);
    expect(balances.get('player')).toBe(110);
});

test('expired sessions do not wager and an expiry during transfer does not recreate cache', async () => {
    const {request, dao, sessions, game} = setup();
    sessions.delete('two');
    expect((await request('DEAL', {playerBet: 10}, 'two')).statusCode).toBe(500);
    expect(dao.transferItems).not.toHaveBeenCalled();
    const transfer = dao.transferItems.getMockImplementation();
    dao.transferItems.mockImplementationOnce(async req => {const result = await transfer(req); sessions.delete('one'); return result;});
    expect((await request('DEAL', {playerBet: 10})).statusCode).toBe(200);
    expect(game.playerGameStates.one.playerMoney).toBe(90);
    expect(sessions.has('one')).toBe(false);
});


test('initialized RESET responds with bet state and no transfers', async () => {
    const {request, dao} = setup();
    await request('DEAL', {playerBet: 10});
    const result = await request('RESET');
    expect(result.data.gameWindow).toBe('bet');
    expect(result.data.inProgress).toBe(false);
    expect(dao.transferItems).toHaveBeenCalledTimes(1);
});

test('transfer IDs satisfy the existing backend contract', async () => {
    const {request, dao} = setup();
    await request('DEAL', {playerBet: 10});
    expect(dao.transferItems.mock.calls[0][0].requestId).toMatch(/^[a-f0-9]{64}$/);
});
