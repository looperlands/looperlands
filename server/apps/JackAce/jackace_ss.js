const axios = require('axios');
const dao = require('../../js/dao');

class JackAce {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.playerGameStates = {};
        this.playerId = null;
        this.sessionId = null;

        this.GOLD = "21300041";
        this.currency = this.GOLD;
        this.CORNHOLE = '0xc00631db8eba1ab88589a599b67df7727ae39348f961c62c11dcd7992f62a2ad';
        this.DECK_COUNT = 6;
        this.BET_AMOUNTS = [1, 2, 5, 10, 25, 50, 100];
        this.CARD_VALUE_MAP = {
            'A': [1, 11],
            '2': 2,
            '3': 3,
            '4': 4,
            '5': 5,
            '6': 6,
            '7': 7,
            '8': 8,
            '9': 9,
            '0': 10,
            'J': 10,
            'Q': 10,
            'K': 10
        };
    }

    // Handle various requested actions
    async handleAction(req, res, action) {
        const sessionId = req.params.sessionId;
        if (!this.sessionId || this.sessionId !== sessionId) {
            this.sessionId = sessionId;
        }

        const validationError = await this.validateAction(req, action);

        if (validationError) {
            console.log(`[JACKACE VALIDATION ERROR]: `, validationError);
            return res.status(validationError.status).json({ message: validationError.message });
        }

        const playerState = this.playerGameStates[this.playerId];
        playerState.lastActionTime = new Date();
        playerState.processPriorHand = false;

        try {
            switch (action) {
                case 'DEAL':
                    playerState.playerBet = this.getValidBetAmount(req.body.playerBet);
                    if (await this.payToCORNHOLE(playerState)) {
                        await this.deal(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Not Enough Gold." });
                    }
                    break;
                case 'HIT':
                    if (playerState.playerHands[playerState.currentHandIndex].canHit) {
                        await this.hit(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot hit." });
                    }
                    break;
                case 'STAND':
                    await this.stand(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'SPLIT':
                    if (playerState.playerHands[playerState.currentHandIndex].canSplit) {
                        await this.split(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot split." });
                    }
                    break;
                case 'DOUBLE':
                    if (playerState.canDouble) {
                        await this.double(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot double." });
                    }
                    break;
                case 'INSURANCE':
                    await this.insurance(playerState, req.body.boughtInsurance);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'REWARD':
                    await this.evaluateWinner(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'RESET':
                    playerState.inProgress = false;
                    playerState.gameWindow = 'bet';
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                default:
                    return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error) {
            console.error(`Error handling action ${action}:`, error);
            playerState.gameMessage = error;
            res.status(500).json(this.sanitizePlayerState(playerState));
        }
    }

    // Function to deal for a player
    async deal(playerState) {
        // Reset player's hands to the initial state
        this.resetHand(playerState);

        // Shuffle the deck if there are fewer than 60 cards left
        if (playerState.cardsLeft < 60) { await this.shuffle(playerState); }

        try {
            // Draw 4 cards (2 for the player, 2 for the dealer)
            const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=4`);
            const [playerCard1, dealerCard1, playerCard2, dealerCard2] = data.cards;

            // Update hands with drawn cards
            playerState.playerHands[playerState.currentHandIndex].hand.push(playerCard1.code, playerCard2.code);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard1.code);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard2.code);

            playerState.dealerHand.hand.push(dealerCard1.code, dealerCard2.code);
            this.updateHandWithCard(playerState.dealerHand, dealerCard1.code);
            this.updateHandWithCard(playerState.dealerHand, dealerCard2.code);

            playerState.cardsLeft = data.remaining;

            // Set initial game state
            playerState.gameWindow = 'hit';

            // Check for split condition
            playerState.playerHands[playerState.currentHandIndex].canSplit = playerCard1.code.charAt(0) === playerCard2.code.charAt(0);

            // Check for conditions when player does not have 21)
            if (playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                playerState.canDouble = this.canDouble([playerCard1.code, playerCard2.code]);

                // Check for insurance condition
                if (dealerCard2.code.charAt(0) === "A" && playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                    playerState.gameWindow = 'insurance';
                } else {
                    if (playerState.playerHands[playerState.currentHandIndex].canSplit || playerState.canDouble) {
                        playerState.gameWindow = 'splitDouble';
                    }
                }
            } else {
                await this.evaluateWinner(playerState);
            }


        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            console.error("Error drawing cards:", error);
            throw new Error("[SERVER ERROR] Internal server error while processing deal");
        }
    }

    async hit(playerState) {
        try {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            await this.drawCard(playerState, hand);
            await this.checkHand(playerState);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            console.error("Error hitting:", error);
            throw new Error("[SERVER ERROR] Internal server error while processing hit");
        }
    }

    async stand(playerState) {
        try {
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.playerHands[playerState.currentHandIndex].canHit = false;
                
                playerState.currentHandIndex++;
                await this.checkHand(playerState);
            }
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            console.error("Error standing:", error);
            throw new Error("[SERVER ERROR] Internal server error while processing stand");
        }
    }

    async split(playerState) {
        if (await this.payToCORNHOLE(playerState)) {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            const card = hand.hand.pop();
            const newTotal = card.charAt(0) === "A" ? 11 : hand.total / 2;
            const newAceIs11 = card.charAt(0) === "A" ? 1 : 0;
            hand.total = newTotal;
            hand.aceIs11 = newAceIs11;
            hand.canSplit = false; // default updated hand to false, validate in check hand

            // Create new split hand
            playerState.playerHands.push({
                hand: [card],
                total: newTotal,
                aceIs11: newAceIs11,
                canHit: true,
                canSplit: false,
                bet: playerState.playerBet
            });

            // Draw card for original hand
            await this.drawCard(playerState, hand);

            // Check for split condition for original hand
            await this.checkHand(playerState);

            // Draw card for the new split hand
            const splitHand = playerState.playerHands[playerState.playerHands.length - 1];
            await this.drawCard(playerState, splitHand);

            // Check for split condition for the new split hand
            await this.checkHand(playerState, playerState.playerHands.length - 1, false);

        } else {
            playerState.playerHands[playerState.currentHandIndex].canSplit = false;
            // console.log('Player cannot afford split');
        }
    }

    async double(playerState) {
        if (await this.payToCORNHOLE(playerState)) {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            hand.bet = hand.bet * 2;
            await this.drawCard(playerState, hand);

            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.currentHandIndex++;
            }
        } else {
            playerState.playerHands[playerState.currentHandIndex].canDouble = false;
            // console.log("Player cannot afford double");
        }
    }

    async insurance(playerState, boughtInsurance) {
        if (boughtInsurance) {
            const insuranceBet = Math.round(playerState.playerBet / 2);
            if (playerState.playerMoney >= insuranceBet && playerState.dealerHand.hand[1].charAt(0) === "A") {
                if (await this.payToCORNHOLE(playerState, insuranceBet)) {
                    playerState.playerMoney -= insuranceBet;
                    playerState.insuranceBet = insuranceBet;
                    playerState.boughtInsurance = true;
                    if (playerState.dealerHand.total === 21 && playerState.dealerHand.hand.length === 2) {
                        playerState.reward = insuranceBet * 2;
                        playerState.dealerHand.hasPlayed = true;
                        await this.evaluateWinner(playerState);
                    } else {
                        await this.checkHand(playerState);
                    }
                } else {
                    // console.log("Player cannot afford insurance");
                    await this.insurance(playerState, false);
                }
            } else {
                playerState.gameMessage = "Player cannot afford insurance or hand doesn't qualify for it";
                await this.insurance(playerState, false);
            }
        } else {
            if (playerState.dealerHand.total === 21) {
                playerState.reward = 0;
                playerState.dealerHand.hasPlayed = true;
                await this.evaluateWinner(playerState);
            } else {
                await this.checkHand(playerState);
            }
        }
    }

    //////////////////////
    // HELPER FUNCTIONS //
    //////////////////////

    // Initialize a player's game state
    async initializePlayerState(req) {
        let playerBet = req.body.playerBet;

        if (!playerBet) {
            playerBet = this.BET_AMOUNTS[0];
            //console.log(`Invalid bet: ${playerBet}, setting to lowest valid bet.`);
        }

        try {
            const deckId = await this.getNewDeckId();
            return await this.createPlayerState(playerBet, deckId);
        } catch (error) {
            console.error("Error initializing deck:", error);
            throw error;
        }
    }

    async getNewDeckId() {
        try {
            const response = await axios.get(`http://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${this.DECK_COUNT}`);
            return response.data.deck_id;
        } catch (error) {
            console.error("Error fetching new deck ID:", error);
            throw error;
        }
    }

    async createPlayerState(playerBet, deckId) {
        const validBetAmount = this.getValidBetAmount(playerBet);
        const playerMoney = await dao.getResourceBalance(this.playerId, this.currency);
        return {
            player: this.playerId,
            playerMoney: playerMoney,
            deckId: deckId,
            cardsLeft: this.DECK_COUNT * 52,
            gameWindow: "bet",
            gameMessage: "",
            playerBet: validBetAmount,
            reward: 0,
            rewardPaid: true,
            currentHandIndex: 0,
            playerHands: [{
                hand: [],
                total: 0,
                aceIs11: 0,
                canHit: true,
                canSplit: false,
                bet: validBetAmount
            }],
            dealerHand: {
                hand: [],
                total: 0,
                aceIs11: 0,
                hasPlayed: false
            },
            canDouble: false,
            boughtInsurance: false,
            processPriorHand: false,
            inProgress: false,
            lastActionTime: new Date()
        };
    }

    // Reset player's hands to the initial state
    resetHand(player) {
        const validBetAmount = this.getValidBetAmount(player.playerBet);
        player.gameMessage = "";
        player.playerBet = validBetAmount;
        player.reward = 0;
        player.rewardPaid = true;
        player.currentHandIndex = 0;
        player.playerHands = [{
            hand: [],
            total: 0,
            aceIs11: 0,
            canHit: true,
            canSplit: false,
            bet: validBetAmount
        }];
        player.dealerHand = {
            hand: [],
            total: 0,
            aceIs11: 0,
            hasPlayed: false
        };
        player.canDouble = false;
        player.boughtInsurance = false;
        player.processPriorHand = false;
        player.inProgress = true;
        player.lastActionTime = new Date();
    }

    async checkHand(playerState, handToCheck = playerState.currentHandIndex, setGameWindow = true) {
        const hand = playerState.playerHands[handToCheck];

        if (playerState.canDouble) {
            playerState.canDouble = playerState.playerHands.length > 1 ? false : this.canDouble(hand.hand);
        }

        if (hand.hand.length === 2 && hand.hand[0].charAt(0) === hand.hand[1].charAt(0) && playerState.playerHands.length < 4) {
            hand.canSplit = true;
        }else{
            hand.canSplit = false;
        }

        if (setGameWindow) {
            playerState.gameWindow = (hand.canSplit || hand.canDouble) ? 'splitDouble' : 'hit';
        }

        if (hand.total >= 21) {
            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.processPriorHand = true;
                await this.stand(playerState);
            }
        }
    }

    async playDealerTurn(playerState) {
        const allHandsBust = playerState.playerHands.every(hand => hand.total > 21);
    
        if (allHandsBust) { return; }
    
        const dealerHand = playerState.dealerHand;
    
        // Function to determine if the hand is a soft 17
        const isSoft17 = hand => hand.total === 17 && hand.aceIs11 > 0;
    
        // Dealer draws cards while the total is less than 17 or it is a soft 17
        while (dealerHand.total < 17 || isSoft17(dealerHand)) {
            await this.drawCard(playerState, dealerHand);
        }
        dealerHand.hasPlayed = true;
    }

    async evaluateWinner(playerState) {

        if (!playerState.dealerHand.hasPlayed && !(playerState.playerHands.length === 1 && playerState.playerHands[0].hand.length === 2 &&  playerState.playerHands[0].total === 21)) {
            await this.playDealerTurn(playerState)
        }

        playerState.dealerHand.hasPlayed = true;

        // Evaluate all player hands against the dealer's hand
        let totalReward = 0;
        const dealerTotal = playerState.dealerHand.total;

        playerState.playerHands.forEach(hand => {
            const playerTotal = hand.total;

            if (playerTotal > 21) {
                // Player busts, no reward
                totalReward += 0;
            } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                // Dealer busts or player wins
                if (playerState.playerHands.length === 1 && hand.hand.length === 2 && playerTotal === 21) {
                    totalReward += Math.round(hand.bet * 2.5); // Blackjack pays 3:2 (1 + 1.5 = 2.5)
                } else {
                    totalReward += hand.bet * 2; // Regular win pays 1:1 (1 + 1 = 2) includes jackacs on a split hand
                }
            } else if (playerTotal === dealerTotal) {
                // Push
                totalReward += hand.bet; // Return the bet
            } else {
                // Dealer wins, no reward
                totalReward += 0;
            }
        });

        if (totalReward > 0) {
            playerState.reward = totalReward;
            playerState.rewardPaid = await this.payToPlayer(playerState);
            if (!playerState.rewardPaid) {
                playerState.gameMessage = `[ERROR] ${totalReward} REWARD COULD NOT BE AWARDED`;
                console.error(`[PAYMENT ERROR] player ${this.playerId} should have been rewarded ${totalReward}`);
            }
        }
        playerState.inProgress = false;
        playerState.gameWindow = 'bet';
    }

    // Transfer gold from CORNHOLE to Player
    async payToPlayer(playerState) {
        await this.updateSessionData(playerState, playerState.reward);
        return await dao.transferResourceFromTo(this.CORNHOLE, playerState.player, playerState.reward, this.currency);
    }

    // Transfer gold from Player to CORNHOLE
    async payToCORNHOLE(playerState, amount = playerState.playerBet) {  // default to playerBet, but allow override for insurance bet
        await this.updateSessionData(playerState, -amount);
        return await dao.transferResourceFromTo(playerState.player, this.CORNHOLE, amount, this.currency);
    }

    async updateSessionData(playerState, amount) {
        let sessionData = this.cache.get(this.sessionId);
        let gameData = sessionData.gameData;

        // Check DAO and Session prior to adding change
        const playerDAO = await dao.getResourceBalance(this.playerId, this.currency);
        if (parseInt(playerDAO) !== parseInt(gameData.items[this.currency])) {
            console.log(`[JACKACE: DAO/SESSIONDATA DISCREPENCY] DAO ${playerDAO}, SESSIONDATA ${gameData.items[this.currency]}`)
            gameData.items[this.currency] = Math.min(parseInt(playerDAO), parseInt(gameData.items[this.currency]));
            console.log(`[JACKACE: updateSessionData] sessionData set to: ${gameData.items[this.currency]}`);
        } else {
            gameData.items[this.currency] = parseInt(playerDAO);
        }

        if (gameData.items === undefined) { gameData.items = {}; }

        if (gameData.items[this.currency]) {
            // console.log(`[updateSessionData] ${gameData.items[this.currency]} (${amount})`)
            gameData.items[this.currency] = Math.max(0, parseInt(gameData.items[this.currency]) + parseInt(amount));
        } else {
            gameData.items[this.currency] = Math.max(0, parseInt(amount));
        }

        playerState.playerMoney = gameData.items[this.currency];
        // Update the cache with the new game data
        sessionData.gameData = gameData;
        this.cache.set(this.sessionId, sessionData);
        // console.log(`[updateSessionData] playerMoney updated to: ${playerState.playerMoney}`);
    }

    // Need to initially hide values in the dealers hand to prevent cheating
    sanitizePlayerState(playerState) {
        const sanitizedState = { ...playerState };

        const allPlayerHandsDone = playerState.playerHands.every(hand => hand.canHit == false);

        if (!allPlayerHandsDone && !playerState.dealerHand.hasPlayed) {
            sanitizedState.dealerHand = {
                hand: ["hidden", playerState.dealerHand.hand[1]],
                total: "hidden",
                aceIs11: "hidden"
            };
        }
        //console.log(JSON.stringify(sanitizedState));
        return sanitizedState;
    }

    async drawCard(playerState, currentHand) {
        try {
            const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=1`);
            const card = data.cards[0];
            currentHand.hand.push(card.code);
            playerState.cardsLeft = data.remaining;

            this.updateHandWithCard(currentHand, card.code);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            console.error("Error drawing card:", error);
            playerState.gameMessage = "Error drawing card.";
        }
    }

    updateHandWithCard(hand, code) {
        const value = code.charAt(0);
        if (['K', 'Q', 'J', '0'].includes(value)) {
            hand.total += 10;
        } else if (value === 'A') {
            hand.total += 11;
            hand.aceIs11 += 1;
        } else {
            hand.total += parseInt(value);
        }
        if (hand.total > 21 && hand.aceIs11 > 0) {
            hand.total -= 10;
            hand.aceIs11 -= 1;
        }
    }

    async shuffle(playerState) {
        try {
            const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/shuffle/`);
            if (!data.shuffled) {
                await this.shuffle(playerState);
            } else {
                playerState.cardsLeft = data.remaining;
            }
        } catch (error) {
            console.error("Error shuffling deck:", error);
            playerState.gameMessage = "Error shuffling deck.";
        }
    }

    canDouble(cardValues) {
        let possibleSums = [0];

        cardValues.forEach(cardValue => {
            let numericValues = Array.isArray(this.CARD_VALUE_MAP[cardValue.charAt(0)]) ? this.CARD_VALUE_MAP[cardValue.charAt(0)] : [this.CARD_VALUE_MAP[cardValue.charAt(0)]];
            let newPossibleSums = [];

            numericValues.forEach(value => {
                possibleSums.forEach(sum => {
                    newPossibleSums.push(sum + value);
                });
            });

            possibleSums = newPossibleSums;
        });

        return possibleSums.includes(9) || possibleSums.includes(10) || possibleSums.includes(11);
    }

    //////////////////////////
    // VALIDATION FUNCTIONS //
    //////////////////////////

    async validateAction(req, action) {

        // Validate player
        try {
            await this.ensurePlayerId(req);
        } catch (error) {
            console.error("Error validating player:", error);
            return { status: 500, message: error };
        }
        // Validate action
        if (!action) {
            return { status: 400, message: "Action not recognized" };
        }

        // Initialize player state if it doesn't exist
        if (!this.playerGameStates[this.playerId]) {
            try {
                this.playerGameStates[this.playerId] = await this.initializePlayerState(req);

            } catch (error) {
                console.error("Error initializing player state:", error);
                return { status: 500, message: "[SERVER ERROR] Error initializing player state" };
            }
        }

        if (action === 'RESET') { return null; }

        const sessionData = this.cache.get(this.sessionId);
        const allowAccess = await this.platformClient.checkOwnershipOfCollection("bits x bit",sessionData.walletId);

        if(!allowAccess){
            // console.log('[JackAce Early Access Denied]');
            return { status: 400, message: "Early Access Limited to bits x bit holders." };
        }

        // Validate action based on game state
        if (action === 'DEAL' && this.playerGameStates[this.playerId].inProgress) {
            const lastActionTime = new Date(this.playerGameStates[this.playerId].lastActionTime);
            const currentTime = new Date();
            const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds

            if ((currentTime - lastActionTime) > twoMinutes) {
                // If the last action was more than 2 minutes ago, reset the hand to not in progress
                this.playerGameStates[this.playerId].inProgress = false;
                this.playerGameStates[this.playerId].gameWindow = 'bet';
            } else {
                return { status: 400, message: `[DEAL] Invalid action >> hand in progress.` };
            }
        } else if (!this.playerGameStates[this.playerId].inProgress && action !== 'DEAL') {
            return { status: 400, message: `[${action}] Invalid action >> no hand in progress.` };
        }

        return null;
    }

    async ensurePlayerId(req) {
        if (!this.playerId || !this.sessionId) {
            await this.setPlayerId(req);
            if (!this.playerId) {
                throw new Error("Player ID not found");
            }
        }
    }

    async setPlayerId(req) {
        const sessionId = req.params.sessionId;
        this.sessionId = sessionId;
        const sessionData = this.cache.get(sessionId);
        if (!sessionData) {
            throw new Error(`No session with id ${sessionId} found`);
        }
        this.playerId = sessionData.nftId;
    }

    // Check betAmount against valid bets
    // if invalid, set bet amount to the nearest valid amount less than the provided amount
    getValidBetAmount(betAmount) {
        return this.BET_AMOUNTS.reduce((prev, curr) => {
            return curr <= betAmount ? curr : prev;
        }, this.BET_AMOUNTS[0]);
    }
}

module.exports = JackAce;