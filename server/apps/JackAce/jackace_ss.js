const axios = require('axios');
const dao = require('../../js/dao');

class JackAce {
    constructor() {
        this.playerGameStates = {};
        this.playerId = null;

        // GLOBALS
        this.GOLD = "21300041";
        this.CORNHOLE = '0xc00631db8eba1ab88589a599b67df7727ae39348f961c62c11dcd7992f62a2ad';
        this.DECK_COUNT = 6;
        this.BET_AMOUNTS = [1, 2, 5, 10, 25, 50, 100];
        this.CARD_VALUE_MAP = {
            'ACE': [1, 11],
            '2': 2,
            '3': 3,
            '4': 4,
            '5': 5,
            '6': 6,
            '7': 7,
            '8': 8,
            '9': 9,
            '10': 10,
            'JACK': 10,
            'QUEEN': 10,
            'KING': 10
        };
    }

    // Handle various requested actions
    async handleAction(req, res, playerId, action) {
        if (!this.playerId) { this.playerId = playerId; }

        const validationError = await this.validateAction(req, action);

        if (validationError) {
            console.log(`validation error: `, validationError);
            return res.status(validationError.status).json({ message: validationError.message });
        }

        const playerState = this.playerGameStates[this.playerId];
        playerState.lastActionTime = new Date();

        try {
            switch (action) {
                case 'DEAL':
                    console.log('processing DEAL');
                    // const paid = await dao.updateResourceBalance(playerState.player, this.GOLD, 5000);
                    // console.log('sent 5000: ', paid);
                    playerState.betAmount = this.getValidBetAmount(req.body.betAmount);
                    if (await this.payToCORNHOLE(playerState)) {
                        await this.deal(playerState);
                        console.log('returning response');
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        console.log('not enough gold');
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
                        console.log('splitting hand...');
                        await this.split(playerState);
                        console.log('responding to split request');
                        console.log(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        console.log('cannot split');
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
                    console.log('processing insurance');
                    await this.insurance(playerState, req.body.boughtInsurance);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                case 'REWARD':
                    await this.evaluateWinner(playerState);
                    res.json(this.sanitizePlayerState(playerState));
                    break;
                default:
                    return res.status(400).json({ error: "Invalid action" });
            }
        } catch (error) {
            console.error(`Error handling action ${action}:`, error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Function to deal for a player
    async deal(playerState) {
        console.log('dealing...');
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
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard1.value);
            this.updateHandWithCard(playerState.playerHands[playerState.currentHandIndex], playerCard2.value);

            playerState.dealerHand.hand.push(dealerCard1.code, dealerCard2.code);
            this.updateHandWithCard(playerState.dealerHand, dealerCard1.value);
            this.updateHandWithCard(playerState.dealerHand, dealerCard2.value);

            playerState.cardsLeft = data.remaining;

            // Set initial game state
            playerState.gameWindow = 'hit';

            // Check for insurance condition
            if (dealerCard2.value === "ACE" && playerState.playerHands[playerState.currentHandIndex].total !== 21) {
                playerState.gameWindow = 'insurance';
            } else {
                // Check for split condition
                playerState.playerHands[playerState.currentHandIndex].canSplit = playerCard1.value === playerCard2.value;

                // Check for double condition
                playerState.canDouble = this.canDouble([playerCard1.value, playerCard2.value]);

                if (playerState.playerHands[playerState.currentHandIndex].canSplit || playerState.canDouble) {
                    playerState.gameWindow = 'splitDouble';
                }
            }
        } catch (error) {
            console.error("Error drawing cards:", error);
            throw new Error("Internal server error");
        }
    }

    async hit(playerState) {
        try {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            await this.drawCard(playerState, hand);
            await this.checkHand(playerState);
        } catch (error) {
            console.error("Error hitting:", error);
            throw new Error("Internal server error");
        }
    }

    async stand(playerState) {
        try {
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.playerHands[currentHandIndex].canHit = false;
                playerState.currentHandIndex++;
                await this.checkHand(playerState);
            }
        } catch (error) {
            console.error("Error standing:", error);
            throw new Error("Internal server error");
        }
    }

    async split(playerState) {
        if (await this.payToCORNHOLE(playerState)) {
            console.log('processing split.');
            const hand = playerState.playerHands[playerState.currentHandIndex];
            const card = hand.hand.pop();
            console.log('card popped ', card);
            hand.total = card.charAt(0) === "A" ? 11 : hand.total / 2;
            hand.aceIs11 = card.charAt(0) === "A" ? 1 : 0;
            hand.canSplit = false; // default updated hand to false, validate in check hand
            console.log('hand: ', hand);

            // Create new split hand
            playerState.playerHands.push({
                hand: [card],
                total: hand.total,
                aceIs11: hand.aceIs11,
                canHit: true,
                canSplit: false,
                bet: playerState.playerBet
            });

            console.log(playerState);

            // Draw card for original hand
            await this.drawCard(playerState, hand);
            console.log('hand: ', hand);

            // Check for split condition for original hand
            await this.checkHand(playerState);

            // Draw card for the new split hand
            const splitHand = playerState.playerHands[playerState.playerHands.length - 1];
            console.log('splitHand: ', splitHand);
            await this.drawCard(playerState, splitHand);

            console.log('checking splitHand')
            // Check for split condition for the new split hand
            await this.checkHand(playerState, playerState.playerHands.length - 1, false);

        } else {
            console.log('cannot afford split');
            throw new Error("Cannot afford split");
        }
    }

    async double(playerState) {
        if (await this.payToCORNHOLE(playerState)) {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            await this.drawCard(playerState, hand);

            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            } else {
                playerState.currentHandIndex++;
            }
        } else {
            throw new Error("Cannot afford double");
        }
    }

    async insurance(playerState, boughtInsurance) {
        if (boughtInsurance) {
            const insuranceBet = playerState.playerBet / 2;
            if (playerState.playerMoney >= insuranceBet && playerState.dealerHand.hand[1] === "ACE") {
                if (await this.payToCORNHOLE(playerState, insuranceBet)) {
                    playerState.playerMoney -= insuranceBet;
                    playerState.insuranceBet = insuranceBet;
                    playerState.boughtInsurance = true;
                    if (playerState.dealerHand.total === 21) {
                        playerState.reward = insuranceBet * 2;
                        playerState.dealerHand.hasPlayed = true;
                        await this.evaluateWinner(playerState);
                    } else {
                        await this.checkHand(playerState);
                    }
                } else {
                    throw new Error("Cannot afford insurance");
                }
            } else {
                throw new Error("Player cannot afford insurance or hand doesn't qualify for it");
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
        const betAmount = req.body.betAmount;

        if (!betAmount) {
            throw new Error("Invalid bet.");
        }

        try {
            const deckId = await this.getNewDeckId();
            console.log('deck id: ', deckId);
            return await this.createPlayerState(betAmount, deckId);
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

    async createPlayerState(betAmount, deckId) {
        const validBetAmount = this.getValidBetAmount(betAmount);
        console.log('valid bet: ', validBetAmount);
        const playerMoney = await dao.getResourceBalance(this.playerId, this.GOLD); // need to fix this to pull actual gold
        console.log('playerMoney: ', playerMoney);
        return {
            player: this.playerId,
            playerMoney: playerMoney,
            deckId: deckId,
            cardsLeft: this.DECK_COUNT * 52,
            gameWindow: "bet",
            playerBet: validBetAmount,
            reward: 0,
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
            inProgress: false,
            lastActionTime: new Date()
        };
    }

    // Reset player's hands to the initial state
    resetHand(player) {
        const validBetAmount = this.getValidBetAmount(player.playerBet);
        player.playerBet = validBetAmount;
        player.reward = 0;
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
        player.inProgress = true;
        player.lastActionTime = new Date();
    }

    async checkHand(playerState, handToCheck = playerState.currentHandIndex, setGameWindow = true) {
        const hand = playerState.playerHands[handToCheck];

        if (playerState.canDouble) {
            console.log('check if candouble');
            console.log(hand.hand);
            playerState.canDouble = playerState.playerHands.length > 1 ? false : this.canDouble(hand.hand);
        }

        if (setGameWindow) {
            playerState.gameWindow = (hand.canSplit || hand.canDouble) ? 'splitDouble' : 'hit';
        }

        if (hand.total >= 21) {
            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                await this.evaluateWinner(playerState);
            }
        }

        if (hand.hand.length === 2 && hand.hand[0].charAt(0) === hand.hand[1].charAt(0) && playerState.playerHands.length < 4) {
            hand.canSplit = true;
        }


    }

    async playDealerTurn(playerState) {
        const allHandsBust = playerState.playerHands.every(hand => hand.total > 21);

        if (allHandsBust) {return;}

        const dealerHand = playerState.dealerHand;
        while (dealerHand.total < 17) {
            await this.drawCard(playerState, dealerHand);
        }
        dealerHand.hasPlayed = true;
    }

    async evaluateWinner(playerState) {

        if (!playerState.dealerHand.hasPlayed) {
            await this.playDealerTurn(playerState)
        }

        // Evaluate all player hands against the dealer's hand
        let totalReward = 0;
        const dealerTotal = playerState.dealerHand.total;

        playerState.playerHands.forEach(hand => {
            const playerTotal = hand.total;

            if (playerTotal > 21) {
                // Player busts
                totalReward += 0;
            } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                // Dealer busts or player wins
                totalReward += hand.bet * 2;
            } else if (playerTotal === dealerTotal) {
                // Push
                totalReward += hand.bet;
            } else {
                // Dealer wins
                totalReward += 0;
            }
        });

        if (totalReward > 0) {
            if (await this.payToPlayer(playerState)) {
                playerState.reward = totalReward;
            }
        }
        playerState.inProgress = false;
        playerState.gameWindow = 'bet';
    }

    // Transfer gold from CORNHOLE to Player
    async payToPlayer(playerState) {
        console.log(`transfer from this.CORNHOLE to ${playerState.player}: ${playerState.reward}`);
        return true;
        //return await dao.transferResourceFromTo(this.CORNHOLE, playerState.player, playerState.reward);
    }

    // Transfer gold from Player to CORNHOLE
    async payToCORNHOLE(playerState, amount = playerState.playerBet) {  // default to playerBet, but allow override for insurance bet
        console.log(`transfer from ${playerState.player} to this.CORNHOLE: ${playerState.playerBet}`);
        const goldBalance = await dao.getResourceBalance(playerState.player, this.GOLD);
        const cornholeBALANCE = await dao.getResourceBalance(this.CORNHOLE, this.GOLD);
        console.log('player balance: ', goldBalance);
        console.log('cornhole balance: ', cornholeBALANCE);
        return true;
        //return await dao.transferResourceFromTo(playerState.player, this.CORNHOLE, amount);
    }

    // Need to initially hide values in the dealers hand to prevent cheating
    sanitizePlayerState(playerState) {
        console.log('Sanitizing playerState');
        const sanitizedState = { ...playerState };

        const allPlayerHandsDone = playerState.playerHands.every(hand => hand.canHit == false);

        if (!allPlayerHandsDone && !playerState.dealerHand.hasPlayed) {
            sanitizedState.dealerHand = {
                hand: ["hidden", playerState.dealerHand.hand[1]],
                total: "hidden",
                aceIs11: "hidden"
            };
        }
        console.log(sanitizedState);
        return sanitizedState;
    }

    async drawCard(playerState, currentHand) {
        try {
            const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=1`);
            const card = data.cards[0];
            currentHand.hand.push(card.code);
            playerState.cardsLeft = data.remaining;

            this.updateHandWithCard(currentHand, card.value);
        } catch (error) {
            console.error("Error drawing card:", error);
            throw new Error("Internal server error");
        }
    }

    updateHandWithCard(hand, value) {
        if (['KING', 'QUEEN', 'JACK'].includes(value)) {
            hand.total += 10;
        } else if (value === 'ACE') {
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
        }
    }

    canDouble(cardValues) {
        let possibleSums = [0];

        cardValues.forEach(cardValue => {
            let numericValues = Array.isArray(this.CARD_VALUE_MAP[cardValue]) ? this.CARD_VALUE_MAP[cardValue] : [this.CARD_VALUE_MAP[cardValue]];
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

        // Validate player and action
        if (!this.playerId || !action) {
            return { status: 400, message: "Player or action not recognized." };
        }

        // Initialize player state if it doesn't exist
        if (!this.playerGameStates[this.playerId]) {
            try {
                this.playerGameStates[this.playerId] = await this.initializePlayerState(req);

            } catch (error) {
                console.error("Error initializing player state:", error);
                return { status: 500, message: "Internal server error" };
            }
        }

        // Validate action based on game state
        if (action === 'DEAL' && this.playerGameStates[this.playerId].inProgress) {
            return { status: 400, message: `[DEAL] Invalid action >> hand in progress.` };
        } else if (!this.playerGameStates[this.playerId].inProgress && action !== 'DEAL') {
            return { status: 400, message: `[${action}] Invalid action >> no hand in progress.` };
        }

        return null;
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