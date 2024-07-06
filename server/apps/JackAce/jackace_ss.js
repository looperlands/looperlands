const discord = require("../../js/discord");
const axios = require('axios');
const dao = require('../../js/dao');

const DEBUG = true;

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
        this.log(`[HANDLE ACTION] Start - Action: ${action}`);
        const sessionId = req.params.sessionId;
        this.log(`[HANDLE ACTION] Session ID: ${sessionId}`);

        if (!this.sessionId || this.sessionId !== sessionId) {
            this.sessionId = sessionId;
        }

        const validationError = await this.validateAction(req, action);

        if (validationError) {
            this.errorEncountered(`[JACKACE VALIDATION ERROR]: ${validationError}`);
            return res.status(validationError.status).json({ message: validationError.message });
        }

        const playerState = this.playerGameStates[this.playerId];
        playerState.lastActionTime = new Date();
        playerState.processPriorHand = false;
        this.log(`[HANDLE ACTION] Player State: ${this.logPlayerState(playerState)}`);

        try {
            switch (action) {
                case 'DEAL':
                    this.log(`[HANDLE ACTION] Dealing cards`);
                    playerState.playerBet = this.getValidBetAmount(req.body.playerBet);
                    if (playerState.playerMoney === 0) {
                        const paid = await dao.updateResourceBalance(playerState.player, this.currency, 147);
                        if (!paid) {
                            this.errorEncountered(`[JACKACE DEAL DAO ERROR] PAYMENT NOT PROCESSED: 147 to ${playerState.playerId}`);
                        }
                    } else if (playerState.playerMoney >= playerState.playerBet && await this.payToCORNHOLE(playerState)) {
                        await this.deal(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Not Enough Gold." });
                    }
                    break;
                case 'HIT':
                    this.log(`[HANDLE ACTION] Hit`);
                    if (playerState.playerHands[playerState.currentHandIndex].canHit) {
                        await this.hit(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot hit." });
                    }
                    break;
                case 'STAND':
                    this.log(`[HANDLE ACTION] Stand`);
                    await this.stand(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'SPLIT':
                    this.log(`[HANDLE ACTION] Split`);
                    if (playerState.playerMoney >= playerState.playerBet && playerState.playerHands[playerState.currentHandIndex].canSplit) {
                        await this.split(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot split." });
                    }
                    break;
                case 'DOUBLE':
                    this.log(`[HANDLE ACTION] Double`);
                    if (playerState.playerMoney >= playerState.playerBet && playerState.canDouble) {
                        await this.double(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot double." });
                    }
                    break;
                case 'INSURANCE':
                    this.log(`[HANDLE ACTION] Insurance`);
                    if (playerState.playerMoney >= Math.round(playerState.playerBet / 2 && playerState.eligibleForInsurance)) {
                        await this.insurance(playerState, req.body.boughtInsurance);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot buy insurance." });
                    }
                    break;
                case 'REWARD':
                    this.log(`[HANDLE ACTION] Reward`);
                    await this.evaluateWinner(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'RESET':
                    this.log(`[HANDLE ACTION] Reset`);
                    this.resetHand(playerState);
                    playerState.inProgress = false;
                    playerState.gameWindow = 'bet';
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                default:
                    this.log(`[HANDLE ACTION] Invalid action: ${action}`);
                    return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error) {
            this.errorEncountered(`[JACKACE] Error handling action ${action}: ${error}`);
            playerState.gameMessage = error;
            res.status(500).json(this.sanitizePlayerState(playerState));
        }
        this.log(`[HANDLE ACTION] End - Action: ${action}`);
    }

    // Function to deal for a player
    async deal(playerState) {
        this.log(`//////////`);
        this.log(` NEW HAND `);
        this.log(`//////////`);
        this.log(`[DEAL] Start - Player State: ${this.logPlayerState(playerState)}`);
        // Reset player's hands to the initial state
        this.resetHand(playerState);

        // Shuffle the deck if there are fewer than 60 cards left
        if (playerState.cardsLeft < 60) {
            playerState.deck = this.initializeDeck(this.DECK_COUNT);
            playerState.cardsLeft = playerState.deck.length;
        }

        try {
            // Draw 4 cards (2 for the player, 2 for the dealer)
            //const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=4`);
            const cards = playerState.deck.splice(0, 4);
            playerState.cardsLeft = playerState.deck.length;
            const [playerCard1, dealerCard1, playerCard2, dealerCard2] = cards;

            this.log(`[DEAL] Drawn Cards: ${JSON.stringify(cards)}`);

            // Update hands with drawn cards
            playerState.playerHands[playerState.currentHandIndex].hand.push(playerCard1, playerCard2);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard1);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard2);

            playerState.dealerHand.hand.push(dealerCard1, dealerCard2);
            this.updateHandWithCard(playerState.dealerHand, dealerCard1);
            this.updateHandWithCard(playerState.dealerHand, dealerCard2);



            // Set initial game state
            playerState.gameWindow = 'hit';

            // Check for split condition
            playerState.playerHands[playerState.currentHandIndex].canSplit = playerCard1.charAt(0) === playerCard2.charAt(0);

            // Check for conditions when player does not have 21)
            if (playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                playerState.canDouble = this.canDouble([playerCard1, playerCard2]);

                // Check for insurance condition
                if (dealerCard2.charAt(0) === "A" && playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                    playerState.eligibleForInsurance = true;
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
            this.errorEncountered(`[JACKACE] Error drawing cards: ${error}`);
            throw new Error("[SERVER ERROR] Internal server error while processing deal");
        }
        this.log(`[DEAL] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    async hit(playerState) {
        this.log(`[HIT] Start - Player State: ${this.logPlayerState(playerState)}`);
        try {
            await this.drawCard(playerState);
            await this.checkHand(playerState);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            this.errorEncountered(`[JACKACE] Error hitting: ${error}`);
            throw new Error("[SERVER ERROR] Internal server error while processing hit");
        }
        this.log(`[HIT] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    async stand(playerState) {
        this.log(`[STAND] Start - Player State: ${this.logPlayerState(playerState)}`);
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
            this.errorEncountered(`[JACKACE] Error standing: ${error}`);
            throw new Error("[SERVER ERROR] Internal server error while processing stand");
        }
        this.log(`[STAND] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    async split(playerState) {
        this.log(`[SPLIT] Start - Player State: ${this.logPlayerState(playerState)}`);
        if (playerState.playerMoney >= playerState.playerBet && await this.payToCORNHOLE(playerState)) {
            const card = playerState.playerHands[playerState.currentHandIndex].hand.pop();
            const newTotal = card.charAt(0) === "A" ? 11 : playerState.playerHands[playerState.currentHandIndex].total / 2;
            const newAceIs11 = card.charAt(0) === "A" ? 1 : 0;

            playerState.playerHands[playerState.currentHandIndex].total = newTotal;
            playerState.playerHands[playerState.currentHandIndex].aceIs11 = newAceIs11;
            playerState.playerHands[playerState.currentHandIndex].canSplit = false; // default updated hand to false, validate in check hand

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
            await this.drawCard(playerState);

            // Check for split condition for original hand
            await this.checkHand(playerState);

            // Draw card for the new split hand
            const splitHandIndex = playerState.playerHands.length - 1;
            await this.drawCard(playerState, splitHandIndex);

            // Check for split condition for the new split hand
            await this.checkHand(playerState, splitHandIndex, false);

        } else {
            // Player cannot afford split
            playerState.playerHands[playerState.currentHandIndex].canSplit = false;
        }
        this.log(`[SPLIT] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    async double(playerState) {
        this.log(`[DOUBLE] Start - Player State: ${this.logPlayerState(playerState)}`);
        if (playerState.playerMoney >= playerState.playerBet && await this.payToCORNHOLE(playerState)) {
            const doubledBet = playerState.playerHands[playerState.currentHandIndex].bet * 2;
            playerState.playerHands[playerState.currentHandIndex].bet = doubledBet; //set bet for hand to 2*initial 
            await this.drawCard(playerState);
            playerState.playerHands[playerState.currentHandIndex].canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.currentHandIndex++;
            }
        } else {
            // Player cannot afford double
            playerState.playerHands[playerState.currentHandIndex].canDouble = false;

        }
        this.log(`[DOUBLE] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    async insurance(playerState, boughtInsurance) {
        this.log(`[INSURANCE] Start - Player State: ${this.logPlayerState(playerState)}`);
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
                    // Player cannot afford insurance
                    await this.insurance(playerState, false);
                }
            } else {
                playerState.gameMessage = "Player cannot afford insurance or hand doesn't qualify for it";
                await this.insurance(playerState, false);
            }
        } else {
            if (playerState.dealerHand.total === 21 && playerState.playerHands[0].total !== 21) {
                playerState.reward = 0;
                playerState.dealerHand.hasPlayed = true;
                await this.evaluateWinner(playerState);
            } else {
                await this.checkHand(playerState);
            }
        }
        this.log(`[INSURANCE] End - Player State: ${this.logPlayerState(playerState)}`);
    }

    //////////////////////
    // HELPER FUNCTIONS //
    //////////////////////

    // Initialize a player's game state
    async initializePlayerState(req) {
        let playerBet = req.body.playerBet;

        if (!playerBet) {
            playerBet = this.BET_AMOUNTS[0];
            //Invalid bet: setting to lowest valid bet
        }

        try {
            const deck = this.initializeDeck(this.DECK_COUNT);
            return await this.createPlayerState(playerBet, deck);
        } catch (error) {
            this.errorEncountered(`[JACKACE] Error initializing deck: ${error}`);
            throw error;
        }
    }

    initializeDeck(deckCount) {
        const suits = ['C', 'S', 'H', 'D'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'];
        let deck = [];
        for (let i = 0; i < deckCount; i++) {
            for (const suit of suits) {
                for (const value of values) {
                    deck.push(`${value}${suit[0]}`);
                }
            }
        }
        this.shuffleDeck(deck);
        return deck;
    }

    /*     async getNewDeckId() {
            try {
                const response = await axios.get(`http://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${this.DECK_COUNT}`);
                return response.data.deck_id;
            } catch (error) {
                this.errorEncountered(`[JACKACE] Error fetching new deck ID: ${error}`);
                throw error;
            }
        } */

    async createPlayerState(playerBet, deck) {
        const validBetAmount = this.getValidBetAmount(playerBet);
        const playerMoney = await dao.getResourceBalance(this.playerId, this.currency);
        return {
            player: this.playerId,
            playerMoney: playerMoney,
            deck: deck,
            cardsLeft: deck.length,
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
            eligibleForInsurance: false,
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
        player.eligibleForInsurance = false;
        player.processPriorHand = false;
        player.inProgress = true;
        player.lastActionTime = new Date();
    }

    async checkHand(playerState, handToCheck = playerState.currentHandIndex, setGameWindow = true) {
        this.log(`[CHECK HAND] (Index to check: ${handToCheck}) Start - ${this.logPlayerState(playerState)}`);
        const hand = playerState.playerHands[handToCheck];

        if (playerState.canDouble) {
            playerState.canDouble = playerState.playerHands.length > 1 ? false : this.canDouble(hand.hand);
        }

        if (hand.hand.length === 2 && hand.hand[0].charAt(0) === hand.hand[1].charAt(0) && playerState.playerHands.length < 4) {
            hand.canSplit = true;
        } else {
            hand.canSplit = false;
        }

        if (setGameWindow) {
            playerState.gameWindow = (hand.canSplit || hand.canDouble) ? 'splitDouble' : 'hit';
        }

        if (hand.total >= 21) {
            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                this.log(`[CHECK HAND] >= 21, evaluatingWinner`);
                await this.evaluateWinner(playerState);
            } else {
                this.log(`[CHECK HAND] >= 21, advance to next hand (split hands)`);
                playerState.processPriorHand = true;
                await this.stand(playerState);
            }
        }
    }

    async playDealerTurn(playerState) {
        this.log(`[playDealerTurn] Start - ${this.logPlayerState(playerState)}`);
        const allHandsBust = playerState.playerHands.every(hand => hand.total > 21);

        if (allHandsBust) { return; }

        const dealerHand = playerState.dealerHand;

        // Function to determine if the hand is a soft 17
        const isSoft17 = hand => hand.total === 17 && hand.aceIs11 > 0;

        // Dealer draws cards while the total is less than 17 or it is a soft 17
        while (dealerHand.total < 17 || isSoft17(dealerHand)) {
            await this.drawCard(playerState, null, true);
        }
        dealerHand.hasPlayed = true;
        this.log(`[playDealerTurn] End - ${this.logPlayerState(playerState)}`);
    }

    async evaluateWinner(playerState) {
        this.log(`[EVALUATE WINNER] Start - ${this.logPlayerState(playerState)}`);
        if (!playerState.dealerHand.hasPlayed && !(playerState.playerHands.length === 1 && playerState.playerHands[0].hand.length === 2 && playerState.playerHands[0].total === 21)) {
            this.log(`[EVALUATE WINNER] playDealerTurn`);
            await this.playDealerTurn(playerState);
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
                this.errorEncountered(`[JACKACE PAYMENT ERROR] player ${this.playerId} should have been rewarded ${totalReward}`);
            }
        }
        playerState.inProgress = false;
        playerState.gameWindow = 'bet';
    }

    // Transfer gold from CORNHOLE to Player
    async payToPlayer(playerState) {
        if (playerState.reward > 0 && this.isValidAmount(playerState, playerState.reward, 'payout')) {
            this.log(`[JACKACE PAYOUT] ${playerState.reward} TO ${playerState.player}`)
            await this.updateSessionData(playerState, playerState.reward);
            return await dao.transferResourceFromTo(this.CORNHOLE, playerState.player, playerState.reward, this.currency);
        } else {
            this.errorEncountered(`[JACKACE PAYOUT ERROR] payToPlayer initiated when playerState.reward = ${playerState.reward}`)
        }
    }

    // Transfer gold from Player to CORNHOLE
    async payToCORNHOLE(playerState, amount = playerState.playerBet) {  // default to playerBet, but allow override for insurance bet
        if (amount > 0 && this.isValidAmount(playerState, amount, 'payment')) {
            this.log(`[JACKACE PAYMENT] ${amount} TO CORNHOLE`)
            await this.updateSessionData(playerState, -amount);
            return await dao.transferResourceFromTo(playerState.player, this.CORNHOLE, amount, this.currency);
        } else {
            this.errorEncountered(`[JACKACE PAYMENT ERROR] payToCORNHOLE initiated when amount = ${amount}`);
        }
    }

    async updateSessionData(playerState, amount) {
        let sessionData = this.cache.get(this.sessionId);
        this.log(`[updateSessionData] adjust amount: ${amount} & balance before: ${sessionData.gameData.items[this.currency]}`);
        let gameData = sessionData.gameData;

        // Check DAO and Session prior to adding change
        const playerDAO = await dao.getResourceBalance(this.playerId, this.currency);
        if (parseInt(playerDAO) !== parseInt(gameData.items[this.currency])) {
            this.errorEncountered(`[JACKACE: DAO/SESSIONDATA DISCREPENCY] DAO ${playerDAO}, SESSIONDATA ${gameData.items[this.currency]}`);
            gameData.items[this.currency] = Math.min(parseInt(playerDAO), parseInt(gameData.items[this.currency]));
            this.errorEncountered(`[JACKACE: updateSessionData] sessionData set to: ${gameData.items[this.currency]}`);
        } else {
            gameData.items[this.currency] = parseInt(playerDAO);
        }

        if (gameData.items === undefined) { gameData.items = {}; }

        if (gameData.items[this.currency]) {
            gameData.items[this.currency] = Math.max(0, parseInt(gameData.items[this.currency]) + parseInt(amount));
        } else {
            gameData.items[this.currency] = Math.max(0, parseInt(amount));
        }

        playerState.playerMoney = gameData.items[this.currency];

        sessionData.gameData = gameData;
        this.cache.set(this.sessionId, sessionData);
        this.log(`[updateSessionData] balance after: ${sessionData.gameData.items[this.currency]}`);
    }

    // Need to initially hide values in the dealers hand to prevent cheating
    sanitizePlayerState(playerState) {
        this.log(`[sanitizePlayerState] START: ${this.logPlayerState(playerState)}`);

        const { deck, ...rest } = playerState; // exclude the deck from the data sent back
        const sanitizedState = {
            ...rest,
        };

        const allPlayerHandsDone = playerState.playerHands.every(hand => hand.canHit == false);

        if (!allPlayerHandsDone && !playerState.dealerHand.hasPlayed) {
            // exclude the dealers hand from data returned if hand is still in progress
            sanitizedState.dealerHand = {
                hand: ["hidden", playerState.dealerHand.hand[1]],
                total: "hidden",
                aceIs11: "hidden"
            };
        }
        this.log(`[sanitizePlayerState] END: allPlayerHandsDone? ${allPlayerHandsDone} dealerPlayed? ${playerState.dealerHand.hasPlayed} ==> ${JSON.stringify(sanitizedState.dealerHand)}`);
        return sanitizedState;
    }

    async drawCard(playerState, handIndex = playerState.currentHandIndex, isDealer = false) {
        this.log(`[DRAW CARD] Start - Player State: ${this.logPlayerState(playerState)}, handIndex: ${handIndex}, isDealer: ${isDealer}`);
        try {
            //const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=1`);
            const card = playerState.deck.shift();
            if (!isDealer) {
                playerState.playerHands[handIndex].hand.push(card);
                this.updateHandWithCard(playerState.playerHands[handIndex], card);
            } else {
                playerState.dealerHand.hand.push(card);
                this.updateHandWithCard(playerState.dealerHand, card);
            }

            playerState.cardsLeft = playerState.deck.length;
            this.log(`[DRAW CARD] End - Player State: ${this.logPlayerState(playerState)}`);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            playerState.gameMessage = "Error drawing card.";
            this.log(`[DRAW CARD ERROR] Player State: ${this.logPlayerState(playerState)}`);
            this.errorEncountered(`[JACKACE ERROR] Error drawing card: ${error}`);
        }
    }

    updateHandWithCard(hand, card) {
        this.log(`[UPDATE HAND] Start - Hand: ${JSON.stringify(hand)}, Card: ${card}`);
        const value = card.charAt(0);
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
        this.log(`[UPDATE HAND] End --- Hand: ${JSON.stringify(hand)}`);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /*     async shuffle(playerState) {
            this.log(`[SHUFFLE] Start - Player State: ${this.logPlayerState(playerState)}`);
            try {
                const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/shuffle/`);
                if (!data.shuffled) {
                    await this.shuffle(playerState);
                } else {
                    playerState.cardsLeft = data.remaining;
                }
            } catch (error) {
                playerState.gameMessage = "Error shuffling deck.";
                this.errorEncountered(`[JACKACE ERROR] Error shuffling deck: ${error}`);
            }
            this.log(`[SHUFFLE] End - Player State: ${this.logPlayerState(playerState)}`);
        } */

    canDouble(cardValues) {
        this.log(`[canDouble] Start - cardValues: ${JSON.stringify(cardValues)}`);
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

        this.log(`[canDouble] End - canDouble: ${possibleSums.includes(9) || possibleSums.includes(10) || possibleSums.includes(11)} ===> possibleSums includes: 9? ${possibleSums.includes(9)}, 10? ${possibleSums.includes(10)}, 11? ${possibleSums.includes(11)} `);
        return possibleSums.includes(9) || possibleSums.includes(10) || possibleSums.includes(11);
    }

    //////////////////////////
    // VALIDATION FUNCTIONS //
    //////////////////////////

    async validateAction(req, action) {
        this.log(`[validateAction] Start - action: ${action}, player: ${this.playerId}, session: ${this.sessionId}`);

        this.log(`[validateAction] Validate player`);
        try {
            await this.ensurePlayerId(req);
        } catch (error) {
            this.errorEncountered(`[JACKACE ERROR] Error validating player: ${error}`);
            return { status: 500, message: error };
        }

        this.log(`[validateAction] Validate action`);
        if (!action) {
            this.errorEncountered(`[JACKACE ERROR] Error: action not recognized ==> ${action}`);
            return { status: 400, message: "Action not recognized" };
        }

        this.log(`[validateAction] Initialize player state if it doesn't exist`);
        if (!this.playerGameStates[this.playerId]) {
            try {
                this.log(`[validateAction] Player not found, initializing: ${this.playerGameStates[this.playerId]}`);
                this.playerGameStates[this.playerId] = await this.initializePlayerState(req);
                this.log(`[validateAction] Player state initialized: ${JSON.stringify(this.playerGameStates[this.playerId])}`);

            } catch (error) {
                this.errorEncountered(`[JACKACE ERROR] Error initializing player state: ${error}`);
                return { status: 500, message: "[SERVER ERROR] Error initializing player state" };
            }
        }

        if (action === 'RESET') { return null; }

        const sessionData = this.cache.get(this.sessionId);
        this.log(`[validateAction] sessionData: ${JSON.stringify(sessionData)}`);
        const allowAccess = await this.platformClient.checkOwnershipOfCollection("bits x bit", sessionData.walletId);

        if (!allowAccess) {
            this.errorEncountered(`[JackAce Early Access Denied]`);
            return { status: 400, message: "Early Access Limited to bits x bit holders." };
        }

        // Validate action based on game statel
        if (action === 'DEAL' && this.playerGameStates[this.playerId].inProgress) {
            this.log(`[validateAction] ${action} requested when player has game in progress, forcing reset.`);
            action = `RESET`;
            return null;
        } else if (!this.playerGameStates[this.playerId].inProgress && action !== 'DEAL') {
            this.log(`[DEAL] Invalid action >> no hand in progress.`);
            return { status: 400, message: `[${action}] Invalid action >> no hand in progress.` };
        }

        return null;
    }

    async ensurePlayerId(req) {
        if (!this.playerId || !this.sessionId) {
            await this.setPlayerId(req);
            if (!this.playerId) {
                this.errorEncountered(`[JACKACE ERROR] Player ID not found: ${JSON.stringify(req)}`);
                throw new Error("Player ID not found");
            }
        }
    }

    async setPlayerId(req) {
        const sessionId = req.params.sessionId;
        this.sessionId = sessionId;
        const sessionData = this.cache.get(sessionId);
        if (!sessionData) {
            this.errorEncountered(`[JACKACE ERROR] No session with id ${sessionId} found`);
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

    // check if the payout/payment value provided is actually valid
    isValidAmount(playerState, amountToCheck, type) {
        if (!['payout', 'payment'].includes(type)) {
            this.errorEncountered(`[JACKACE ERROR] Invalid type '${type}' provided to isValidAmount.`);
            return false;
        }

        const validAmounts = new Set();
        const factor1 = type === 'payout' ? 2 : 1; // use for 1:1 payouts when type is 'payout'
        const factor2 = type === 'payout' ? 2.5 : 1; // use for 3:2 payouts when type is `payout`

        // Identify all valid amounts
        this.BET_AMOUNTS.forEach(amount => {

            validAmounts.add(amount); // PUSH returns bet (make sure unfactored amount is always included)

            if (playerState.eligibleForInsurance) {
                validAmounts.add((Math.round(amount / 2)) * factor1); // Insurance bet payout is 2 * Math.round(1/2 bet)
            }

            validAmounts.add(amount * factor1); // Regular win pays 1:1
            validAmounts.add(Math.round(amount * factor2)); // Blackjack pays 3:2

            // Add payouts for split hands (up to a reasonable number of splits)
            if (type === 'payout' && playerState.playerHands.length > 1) {
                for (let i = 2; i <= playerState.playerHands.length; i++) {
                    validAmounts.add((amount * factor1) * i); // Used to compute Regular win payouts when player wins 2, 3, and 4 hands
                }
            }
        });

        return validAmounts.has(amountToCheck);
    }

    logPlayerState(playerState) {
        const shortenedPlayerState = { ...playerState };
        shortenedPlayerState.player = shortenedPlayerState.player.substring(0, 10)
        shortenedPlayerState.deck = ['deck content excluded from logs'];
        return JSON.stringify(shortenedPlayerState);
    }

    log(message) {
        if (DEBUG && this.playerId === "0x7e0e930b5bfdb8214d40cdcdc9d83d6beab056dbfc551430b6be4f13facfadb3") {
            discord.sendToDebugChannel(message);
            console.log(message);
        }
    }

    errorEncountered(message) {
        if (DEBUG) {
            if(this.playerId === "0x7e0e930b5bfdb8214d40cdcdc9d83d6beab056dbfc551430b6be4f13facfadb3"){
                discord.sendToDebugChannel(message);
            }
        } else {
            discord.sendToDevChannel(message);
        }
        console.log(message);
    }
}

module.exports = JackAce;