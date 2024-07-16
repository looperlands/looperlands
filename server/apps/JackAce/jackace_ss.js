const discord = require("../../js/discord");
const dao = require('../../js/dao');
const ens = require('../../js/ens')

const DEBUG = true;
const BETA = true;

class JackAce {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.playerGameStates = {};

        this.GOLD = "21300041";
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

        const [player, validationError] = await this.validateAction(req, action);

        if (validationError) {
            this.errorEncountered(`JACKACE ERROR`, `handleAction`, `validateAction returned an error`, `${JSON.stringify(validationError)}`, player);
            return res.status(validationError.status).json({ message: validationError.message });
        }

        const playerState = this.playerGameStates[player];
        playerState.processPriorHand = false;
        playerState.playerMoney = await dao.getResourceBalance(playerState.player, playerState.currency);
        this.log(`[HANDLE ACTION] Player State: ${this.logPlayerState(playerState)}`, player);

        try {
            switch (action) {
                case 'DEAL':
                    playerState.playerBet = this.getValidBetAmount(req.body.playerBet);
                    this.log(`[HANDLE ACTION] Dealing cards: playerBet = ${playerState.playerBet}, playerMoney = ${playerState.playerMoney}`, player);

                    if (playerState.playerMoney >= playerState.playerBet) {
                        await this.deal(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Not Enough Gold." });
                    }
                    break;
                case 'HIT':
                    this.log(`[HANDLE ACTION] Hit`, player);
                    if (playerState.playerHands[playerState.currentHandIndex].canHit) {
                        await this.hit(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot hit." });
                    }
                    break;
                case 'STAND':
                    this.log(`[HANDLE ACTION] Stand`, player);
                    await this.stand(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'SPLIT':
                    if (playerState.playerMoney >= playerState.playerBet && playerState.playerHands[playerState.currentHandIndex].canSplit) {
                        this.log(`[HANDLE ACTION] Split: playerBet = ${playerState.playerBet}, playerMoney = ${playerState.playerMoney}`, player);
                        await this.split(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot split." });
                    }
                    break;
                case 'DOUBLE':
                    if (playerState.playerMoney >= playerState.playerBet && playerState.canDouble) {
                        this.log(`[HANDLE ACTION] Double: playerBet = ${playerState.playerBet}, playerMoney = ${playerState.playerMoney}`, player);
                        await this.double(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot double." });
                    }
                    break;
                case 'INSURANCE':
                    this.log(`[HANDLE ACTION] Insurance`, player);
                    const insuranceBet = Math.round(playerState.playerBet / 2);
                    if (playerState.eligibleForInsurance && playerState.playerMoney >= insuranceBet) {
                        this.log(`[HANDLE ACTION] Insurance: insuranceBet = ${insuranceBet}, playerMoney = ${playerState.playerMoney}`, player);
                        await this.insurance(playerState, req.body.boughtInsurance);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Cannot buy insurance." });
                    }
                    break;
                case 'REWARD':
                    this.log(`[HANDLE ACTION] Reward`, player);
                    await this.evaluateWinner(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'RESET':
                    this.log(`[HANDLE ACTION] Reset`, player);
                    this.resetHand(playerState);
                    playerState.inProgress = false;
                    playerState.gameWindow = 'bet';
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                default:
                    this.log(`[HANDLE ACTION] Invalid action: ${action}`, player);
                    return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error) {
            this.errorEncountered(`JACKACE ERROR`, `handleAction`, `Error handling action ${action}`, `${error}`, player);
            playerState.gameMessage = error;
            res.status(500).json(this.sanitizePlayerState(playerState));
        }
        this.log(`[HANDLE ACTION] End - Action: ${action}`, player);
    }

    // Function to deal for a player
    async deal(playerState) {
        this.payToCORNHOLE(playerState);
        this.log(`[DEAL] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        
        // Reset player's hands to the initial state
        this.resetHand(playerState);

        // Shuffle the deck if there are fewer than 60 cards left
        if (playerState.cardsLeft < 60) {
            playerState.deck = this.initializeDeck(this.DECK_COUNT);
            playerState.cardsLeft = playerState.deck.length;
        }

        try {
            // Draw 4 cards (2 for the player, 2 for the dealer)
            const cards = playerState.deck.splice(0, 4);
            playerState.cardsLeft = playerState.deck.length;
            const [playerCard1, dealerCard1, playerCard2, dealerCard2] = cards;

            // this.log(`[DEAL] Drawn Cards: ${JSON.stringify(cards)}`, playerState.player);

            // Update hands with drawn cards
            playerState.playerHands[playerState.currentHandIndex].hand.push(playerCard1, playerCard2);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard1, playerState.player);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard2, playerState.player);

            playerState.dealerHand.hand.push(dealerCard1, dealerCard2);
            this.updateHandWithCard(playerState.dealerHand, dealerCard1, playerState.player);
            this.updateHandWithCard(playerState.dealerHand, dealerCard2, playerState.player);

            // Set initial game state
            playerState.gameWindow = 'hit';

            // Check for split condition
            playerState.playerHands[playerState.currentHandIndex].canSplit = playerCard1.charAt(0) === playerCard2.charAt(0);

            // Check for conditions when player does not have 21)
            if (playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                playerState.canDouble = this.canDouble([playerCard1, playerCard2], playerState.player);

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
            this.errorEncountered(`JACKACE ERROR`, `deal`, `Error processing deal`, `${error}`, playerState.player);
            throw new Error("[SERVER ERROR] Internal server error while processing deal");
        }
        this.log(`[DEAL] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
    }

    async hit(playerState) {
        this.log(`[HIT] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        try {
            await this.drawCard(playerState);
            await this.checkHand(playerState);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            this.errorEncountered(`JACKACE ERROR`, `hit`, `Error hitting`, `${error}`, playerState.player);
            throw new Error("[SERVER ERROR] Internal server error while processing hit");
        }
        this.log(`[HIT] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
    }

    async stand(playerState) {
        this.log(`[STAND] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
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
            this.errorEncountered(`JACKACE ERROR`, `stand`, `Error standing`, `${error}`, playerState.player);
            throw new Error("[SERVER ERROR] Internal server error while processing stand");
        }
        this.log(`[STAND] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
    }

    async split(playerState) {
        if (playerState.playerMoney >= playerState.playerBet) {
            this.log(`[SPLIT] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
            this.payToCORNHOLE(playerState);
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

            // Draw card for original hand and check 
            await this.drawCard(playerState);
            await this.checkHand(playerState);

            // Draw card for the new split hand and check
            const splitHandIndex = playerState.playerHands.length - 1;
            await this.drawCard(playerState, splitHandIndex);
            await this.checkHand(playerState, splitHandIndex, false);

            this.log(`[SPLIT] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        } else {
            // Player cannot afford split
            playerState.playerHands[playerState.currentHandIndex].canSplit = false;
        }

    }

    async double(playerState) {
        if (playerState.playerMoney >= playerState.playerBet) {
            this.log(`[DOUBLE] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
            this.payToCORNHOLE(playerState);
            const doubledBet = playerState.playerHands[playerState.currentHandIndex].bet * 2;
            playerState.playerHands[playerState.currentHandIndex].bet = doubledBet; //set bet for hand to 2*initial 
            await this.drawCard(playerState);
            playerState.playerHands[playerState.currentHandIndex].canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.currentHandIndex++;
            }
            this.log(`[DOUBLE] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        } else {
            // Player cannot afford double
            playerState.playerHands[playerState.currentHandIndex].canDouble = false;
        }
    }

    async insurance(playerState, boughtInsurance) {
        this.log(`[INSURANCE] Start - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        if (boughtInsurance) {
            const insuranceBet = Math.round(playerState.playerBet / 2);
            if (playerState.playerMoney >= insuranceBet && playerState.dealerHand.hand[1].charAt(0) === "A") {
                this.payToCORNHOLE(playerState, insuranceBet);
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
        this.log(`[INSURANCE] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
    }

    //////////////////////
    // HELPER FUNCTIONS //
    //////////////////////

    // Initialize a player's game state
    async initializePlayerState(player, sessionId, walletId, req) {
        let playerBet = req.body.playerBet;

        if (!playerBet) {
            playerBet = this.BET_AMOUNTS[0];
            //Invalid bet: setting to lowest valid bet
        }

        try {
            const playerName = await ens.getEns(walletId);
            const deck = this.initializeDeck(this.DECK_COUNT);
            return await this.createPlayerState(player, sessionId, walletId, playerName, playerBet, deck);
        } catch (error) {
            this.errorEncountered(`JACKACE ERROR`, `initializePlayerState`, `Error initializing deck and creating playerState`, `${error}`, player);
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

    async createPlayerState(player, sessionId, walletId, playerName, playerBet, deck) {
        const validBetAmount = this.getValidBetAmount(playerBet);
        const playerMoney = await dao.getResourceBalance(player, this.GOLD);
        const bitsXbitHODLr = await this.platformClient.checkOwnershipOfCollection("bits x bit", walletId);
        return {
            player: player,
            playerName: playerName,
            sessionId: sessionId,
            walletId: walletId,
            bitsxbit: bitsXbitHODLr,
            currency: this.GOLD,
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
            lastStatusCheck: new Date()
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
    }

    async checkHand(playerState, handToCheck = playerState.currentHandIndex, setGameWindow = true) {
        //this.log(`[CHECK HAND] (Index to check: ${handToCheck}) Start - ${this.logPlayerState(playerState)}`, playerState.player);
        const hand = playerState.playerHands[handToCheck];

        if (playerState.canDouble) {
            playerState.canDouble = playerState.playerHands.length > 1 ? false : this.canDouble(hand.hand, playerState.player);
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
                //this.log(`[CHECK HAND] >= 21, evaluatingWinner`, playerState.player);
                await this.evaluateWinner(playerState);
            } else {
                //this.log(`[CHECK HAND] >= 21, advance to next hand (split hands)`, playerState.player);
                playerState.processPriorHand = true;
                await this.stand(playerState);
            }
        }
    }

    async playDealerTurn(playerState) {
        //this.log(`[playDealerTurn] Start - ${this.logPlayerState(playerState)}`, playerState.player);
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
        //this.log(`[playDealerTurn] End - ${this.logPlayerState(playerState)}`, playerState.player);
    }

    async evaluateWinner(playerState) {
        this.log(`[EVALUATE WINNER] ${this.logPlayerState(playerState)}`, playerState.player);
        if (!playerState.dealerHand.hasPlayed && !(playerState.playerHands.length === 1 && playerState.playerHands[0].hand.length === 2 && playerState.playerHands[0].total === 21)) {
            //this.log(`[EVALUATE WINNER] playDealerTurn`, playerState.player);
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

        if (BETA && playerState.playerMoney === 0 && totalReward === 0) {
            totalReward = 147;
        }

        if (totalReward > 0) {
            playerState.reward = totalReward;
            this.payToPlayer(playerState);
        }
        playerState.inProgress = false;
        playerState.gameWindow = 'bet';
    }

    transferItem(from, to, amount, playerState) {
        try {
            dao.transferResourceFromTo(from, to, amount, playerState.currency);

            let cache = this.cache.get(playerState.sessionId);
            if (!cache) { throw new Error('Session cache not found'); }

            let gameData = cache.gameData;
            if (!gameData.items) { gameData.items = {}; }
            if (!gameData.items[playerState.currency]) { gameData.items[playerState.currency] = 0; }

            // Adjust item count based on the direction of the transfer
            if (from === playerState.player) {
                gameData.items[playerState.currency] -= amount;
            } else {
                gameData.items[playerState.currency] += amount;
            }

            cache.gameData = gameData;
            this.cache.set(playerState.sessionId);

            if(gameData.items[playerState.currency] !== playerState.playerMoney){
                this.errorEncountered(`JACKACE ERROR`, `transferItem`, `DISCREPENCY`, `gameData.items[playerState.currency] = ${gameData.items[playerState.currency]} while playerState.playerMoney = ${playerState.playerMoney}`, playerState.player);
            }
            
        } catch (error) {
            this.errorEncountered(`JACKACE ERROR`, `transferItem`, `Unexpected Error`, `${error}`, playerState.player);
            throw error;
        }
    }

    // Transfer gold from CORNHOLE to Player
    async payToPlayer(playerState) {
        try {
            playerState.playerMoney += playerState.reward;
            this.transferItem(this.CORNHOLE, playerState.player, playerState.reward, playerState);
            
        } catch (error) {
            this.errorEncountered(`JACKACE ERROR`, `payToPlayer`, `Unexpected Error`, `${error}`, playerState.player);
        }
    }

    // Transfer gold from Player to CORNHOLE
    async payToCORNHOLE(playerState, amount = playerState.playerBet) {
        try {
            playerState.playerMoney -= amount;
            this.transferItem(playerState.player, this.CORNHOLE, amount, playerState);
        } catch (error) {
            this.errorEncountered(`JACKACE ERROR`, `payToCORNHOLE`, `Unexpected Error`, `${error}`, playerState.player);
        }
    }

    // Need to initially hide values in the dealers hand to prevent cheating
    sanitizePlayerState(playerState) {
        //this.log(`[sanitizePlayerState] START: ${this.logPlayerState(playerState)}`, playerState.player);

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
        //this.log(`[sanitizePlayerState] END: allPlayerHandsDone? ${allPlayerHandsDone} dealerPlayed? ${playerState.dealerHand.hasPlayed} ==> ${JSON.stringify(sanitizedState.dealerHand)}`, playerState.player);
        return sanitizedState;
    }

    async drawCard(playerState, handIndex = playerState.currentHandIndex, isDealer = false) {
        //this.log(`[DRAW CARD] Start - Player State: ${this.logPlayerState(playerState)}, handIndex: ${handIndex}, isDealer: ${isDealer}`, playerState.player);
        try {
            const card = playerState.deck.shift();
            if (!isDealer) {
                playerState.playerHands[handIndex].hand.push(card);
                this.updateHandWithCard(playerState.playerHands[handIndex], card, playerState.player);
            } else {
                playerState.dealerHand.hand.push(card);
                this.updateHandWithCard(playerState.dealerHand, card, playerState.player);
            }

            playerState.cardsLeft = playerState.deck.length;
            //this.log(`[DRAW CARD] End - Player State: ${this.logPlayerState(playerState)}`, playerState.player);
        } catch (error) {
            playerState.inProgress = false;
            playerState.gameWindow = 'bet';
            playerState.gameMessage = "Error drawing card.";
            this.errorEncountered(`JACKACE ERROR`, `drawCard`, `Error drawing card`, `${error}`, playerState.player);
        }
    }

    updateHandWithCard(hand, card, player) {
        //this.log(`[UPDATE HAND] Start - Hand: ${JSON.stringify(hand)}, `, player);
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
        //this.log(`[UPDATE HAND] End --- Hand: ${JSON.stringify(hand)}`, player);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    canDouble(cardValues, player) {
        //this.log(`[canDouble] Start - cardValues: ${JSON.stringify(cardValues)}`, player);
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

        //this.log(`[canDouble] End - canDouble: ${possibleSums.includes(9) || possibleSums.includes(10) || possibleSums.includes(11)} ===> possibleSums includes: 9? ${possibleSums.includes(9)}, 10? ${possibleSums.includes(10)}, 11? ${possibleSums.includes(11)} `, player);
        return possibleSums.includes(9) || possibleSums.includes(10) || possibleSums.includes(11);
    }

    //////////////////////////
    // VALIDATION FUNCTIONS //
    //////////////////////////

    async validateAction(req, action) {

        // Get player requesting action
        const [player, sessionId, walletId, getPlayerError] = await this.getPlayer(req);
        //this.log(`[HANDLE ACTION] Start - Action: ${action}`, player);
        //this.log(`[HANDLE ACTION] Player: ${player}, Session ID: ${sessionId}, Wallet ID: ${walletId}`, player);

        if (getPlayerError) {
            return [player, { status: 500, message: `getPlayer error: ${getPlayerError}` }];
        }

        // Verify a valid action was requested
        const validActions = ['DEAL', 'HIT', 'STAND', 'SPLIT', 'DOUBLE', 'INSURANCE', 'REWARD', 'RESET'];
        if (!validActions.includes(action)) {
            return [player, { status: 400, message: `[JACKACE ERROR] Error: action not recognized ==> ${action}` }];
        }

        // Make sure player has a gamestate initiated
        if (!this.playerGameStates[player]) {
            //this.log(`[validateAction] Initializing player state for: ${player}`, player);
            try {
                this.playerGameStates[player] = await this.initializePlayerState(player, sessionId, walletId, req);
                //this.log(`[validateAction] Player state initialized: ${this.logPlayerState(this.playerGameStates[player])}`, player);

            } catch (error) {
                return [player, { status: 500, message: `[JACKACE ERROR] Error initializing player state: ${error}` }];
            }
        } else {
            // Set sessionId and walletId to make sure they are up to date 
            this.playerGameStates[player].sessionId = sessionId;
            this.playerGameStates[player].walletId = walletId;

            // If prior HODLr status was true, check again in 15 minutes. If false, check in 5.
            const TIME_BETWEEN_CHECKS = this.playerGameStates[player].bitsxbit ? 15 : 5;

            if (Date.now() - this.playerGameStates[player].lastStatusCheck > TIME_BETWEEN_CHECKS * 60 * 1000) {
                this.playerGameStates[player].bitsxbit = await this.platformClient.checkOwnershipOfCollection("bits x bit", walletId);
                this.playerGameStates[player].lastStatusCheck = Date.now();
            }
        }

        // If action is 'RESET', return and allow processing
        if (action === 'RESET') { return [player, null]; }

        // Make sure player has access
        try {
            if (!this.playerGameStates[player].bitsxbit) {
                return [player, { status: 400, message: "[JackAce Early Access Denied] Early Access Limited to bits x bit holders." }];
            }
            //this.log(`[validateAction] access granted: ${allowAccess}`, player);
        } catch (error) {
            return [player, { status: 500, message: `[JACKACE ERROR] Error validating access: ${error}` }];
        }

        discord.sendMessage(`🃏 **${this.playerGameStates[player].playerName}** is at the cornHOLE playing JackAce.`);

        // Validate action based on player's current gamestate
        if (action === 'DEAL' && this.playerGameStates[player].inProgress) {
            //this.log(`[validateAction] ${action} requested when player has game in progress, forcing reset.`, player);
            action = `RESET`;
            return [player, null];
        } else if (!this.playerGameStates[player].inProgress && action !== 'DEAL') {
            //this.log(`[DEAL] Invalid action >> no hand in progress.`, player);
            return [player, { status: 400, message: `[${action}] Invalid action >> no hand in progress.` }];
        }

        return [player, null];
    }

    async getPlayer(req) {
        try {
            const sessionId = req.params.sessionId;

            const sessionData = this.cache.get(sessionId);
            if (!sessionData) {
                throw new Error(`No session with id ${sessionId} found`);
            }

            const player = sessionData.nftId;
            if (!player) {
                throw new Error("Player ID not found");
            }

            const walletId = sessionData.walletId;
            if (!walletId) {
                throw new Error("Wallet ID not found");
            }

            return [player, sessionId, walletId, null];
        } catch (error) {
            return [null, null, null, JSON.stringify(error)];
        }
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
            this.errorEncountered(`JACKACE ERROR`, `isValidAmount`, `Invalid type`, `type '${type}' was provided to isValidAmount.`, playerState.player);
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

    log(message, player) {
        if (DEBUG && player === "0x7e0e930b5bfdb8214d40cdcdc9d83d6beab056dbfc551430b6be4f13facfadb3") {
            discord.sendToDebugChannel(message);
            console.log(message);
        }
    }

    errorEncountered(errorTitle, currentFunction, errorSummary, rawError, player) {
        const file = `jackace_ss.js`;
        const message = JSON.stringify({
            title: errorTitle,
            location: currentFunction,
            file: file,
            summary: errorSummary,
            error: rawError
        });

        if (DEBUG) {
            if (player === "0x7e0e930b5bfdb8214d40cdcdc9d83d6beab056dbfc551430b6be4f13facfadb3") {
                discord.sendToDebugChannel(message, true);
            }
        } else {
            discord.sendToDevChannel(message, true);
        }
        console.log(message);
    }

}

module.exports = JackAce;
