const express = require('express');
const axios = require('axios');
const dao = require('../../js/dao');
const { currentHandIndex, player } = require('../../../client/apps/JackAce/js/globals');

// GLOBALS
const GOLD = "21300041";
const CORNHOLE = '0xc00631db8eba1ab88589a599b67df7727ae39348f961c62c11dcd7992f62a2ad';
const MAX_RETRY_COUNT = 5;
const deck_count = 6;
const STATE_NEWHAND = 0;
const STATE_PLAYERTURN = 1;
const STATE_DEALERTURN = 2;
const STATE_REWARD = 3;
const STATE_BETTING = 4;
const STATE_SPLIT = 5;
const STATE_INSURANCE = 6;
const BET_AMOUNTS = [1, 2, 5, 10, 25, 50, 100];
const cardValueMap = {
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

class JackAce {
    constructor(platformClient, cache) {
        this.platformClient = platformClient;
        this.cache = cache;
        this.playerGameStates = {};
    }

    // Handle various requested actions
    async handleAction(req, res) {
        const { player, action, betAmount } = req.body;

        // Make sure we have values for player and action
        if (!player || !action) {
            return res.status(400).json({ message: "Player or action not recognized." });
        }


        // Check if this player is in playerGameState, if not >> initialize their game
        let playerState = this.playerGameStates[player];
        if (!playerState) {
            if (!betAmount) {
                return res.status(400).json({ message: "Invalid bet." });
            }
            try {
                const response = await axios.get(`http://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6`);
                const deckId = response.data.deck_id;
                playerState = await this.initializeGame(player, betAmount, deckId);
                this.playerGameStates[player] = playerState;
            } catch (error) {
                console.error("Error initializing deck:", error);
                res.status(500).json({ message: "Internal server error" });
                return;
            }

        }

        // Check if player has a hand in progress
        if (action === 'DEAL' && playerState.inProgress) {
            // DEAL only available when a hand is not currently in progress
            return res.status(400).json({ message: `[DEAL] Invalid action >> hand in progress.` });
        } else if (!playerState.inProgress && action !== 'DEAL') {
            // Other actions only available when a hand is in progress
            return res.status(400).json({ message: `[${action}] Invalid action >> no hand in progress.` });
        }

        try {
            switch (action) {
                case 'DEAL':
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
                    await this.insurance(playerState, req.body.insuranceBet);
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
    async deal(player) {

        // Reset player's hands to the initial state
        await this.resetHand(player);

        // Shuffle the deck if there are fewer than 60 cards left
        if (player.cardsLeft < 60) { await this.shuffle(player); }

        // Draw 4 cards (2 for the player, 2 for the dealer)
        const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${player.deckId}/draw/?count=4`);
        const [playerCard1, dealerCard1, playerCard2, dealerCard2] = data.cards;

        // Update hands with drawn cards
        player.playerHands[player.currentHandIndex].hand.push(playerCard1.code, playerCard2.code);
        player.dealerHand.hand.push(dealerCard1.code, dealerCard2.code);
        player.cardsLeft = data.remaining;

        // Set initial game state
        player.gameState = STATE_PLAYERTURN;
        player.gameWindow = 'hit';

        // Check for insurance condition
        if (dealerCard2.cardValue === "ACE") {
            player.gameState = STATE_INSURANCE;
            player.gameWindow = 'insurance';
        }

        // Check for split condition
        if (playerCard1.cardValue === playerCard2.cardValue) {
            player.playerHands[player.currentHandIndex].canSplit = true;
            player.gameWindow = 'splitDouble';
        }

        // Check for double condition
        const playerCards = [playerCard1.cardValue, playerCard2.cardValue];
        player.canDouble = this.canDouble(playerCards);
    }

    async hit(playerState) {
        const hand = playerState.playerHands[playerState.currentHandIndex];
        await this.drawCard(playerState, hand);
        this.checkHand(playerState);
    }

    async stand(playerState) {
        if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
            playerState.gameState = STATE_DEALERTURN;
            await this.playDealerTurn(playerState);
            await this.evaluateWinner(playerState);
        } else {
            playerState.currentHandIndex++;
            // advance to next hand
        }

    }

    async split(playerState) { //need to review 
        if (this.payToCORNHOLE(playerState)) {
            const handCount = playerState.playerHands.length;
            const hand = playerState.playerHands[playerState.currentHandIndex];
            const card = hand.hand.pop();
            const handTotal = card.charAt(0) === "A" ? 11 : hand.total / 2;
            const aceIs11 = card.charAt(0) === "A" ? 1 : 0;

            // Create new split hand
            playerState.playerHands.push({
                hand: [card],
                total: handTotal,
                aceIs11: aceIs11,
                canHit: true,
                canSplit: false,
                bet: validBetAmount
            });

            // Draw card for original hand
            await this.drawCard(playerState, hand);

            // Check for split condition for original hand
            if (hand.hand[0].charAt(0) === hand.hand[1].charAt(0) && handCount < 4) {
                hand.canSplit = true;
                player.gameWindow = 'splitDouble';
            }

            // Draw card for the new split hand
            const splitHand = playerState.playerHands[playerState.playerHands.length - 1];
            await this.drawCard(playerState, splitHand);

            // Check for split condition for the new split hand
            if (splitHand.hand[0].charAt(0) === splitHand.hand[1].charAt(0) && handCount < 4) {
                splitHand.canSplit = true;
                player.gameWindow = 'splitDouble';
            }
        } else {
            // add logic for when player can't afford split
        }
    }

    async double(playerState) {
        if (this.payToCORNHOLE(playerState)) {
            const hand = playerState.playerHands[playerState.currentHandIndex];
            await this.drawCard(playerState, hand);

            hand.canHit = false;
            if (playerState.currentHandIndex === playerState.playerHands.length - 1) {
                playerState.gameState = STATE_DEALERTURN;
                await this.playDealerTurn(playerState);
                await this.evaluateWinner(playerState);
            } else {
                playerState.currentHandIndex++;
            }
        } else {
            // add logic for when player can't afford double
        }
    }

    async insurance(playerState) {
        if (this.payToCORNHOLE(playerState, playerState.playerBet / 2)) {
            if (playerState.playerMoney >= insuranceBet && playerState.dealerHand.hand[1] === "ACE") {
                playerState.playerMoney -= insuranceBet;
                playerState.insuranceBet = insuranceBet;
                playerState.boughtInsurance = true;
                await this.playDealerTurn(playerState);
                if (playerState.dealerHand.total === 21) {
                    playerState.playerMoney += insuranceBet * 2;
                    playerState.reward = 0;
                }
                playerState.gameState = STATE_PLAYERTURN;
            } else {
                throw new Error("Cannot buy insurance");
            }
        } else {
            // add logic for when player can't afford insurance
        }
    }

    //////////////////////
    // HELPER FUNCTIONS //
    //////////////////////

    // Initialize a player's game state
    async initializeGame(player, betAmount, deckId) {
        const validBetAmount = this.getValidBetAmount(betAmount);
        const playerMoney = await this.getGoldAmount();
        return {
            player: player,
            playerMoney: playerMoney,
            deckId: deckId,
            cardsLeft: deck_count * 52,
            gameState: STATE_BETTING,
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
            inProgress: true,
            lastActionTime: new Date()
        };
    }

    // Reset player's hands to the initial state
    async resetHand(player) {
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

    async checkHand(playerState) {
        const hand = playerState.playerHands[playerState.currentHandIndex];
        if (hand.total >= 21) {
            hand.canHit = false;
        }
        if (hand.hand[0].value === hand.hand[1].value) {
            hand.canSplit = true;
        }
    }

    async playDealerTurn(playerState) {
        const dealerHand = playerState.dealerHand;
        while (dealerHand.total < 17) {
            await this.drawCard(playerState, dealerHand);
        }
        dealerHand.hasPlayed = true;
    }

    async evaluateWinner(playerState) {
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
            playerState.reward = totalReward;
            await this.payToPlayer(playerState);
        }
        playerState.inProgress = false;
    }


    // Look up player's gold balance
    async getGoldAmount() {
        return new Promise((resolve, reject) => {
            const sessionId = new URLSearchParams(window.location.search).get('sessionId');
            const inventoryQuery = `/session/${sessionId}/inventory`;
            axios.get(inventoryQuery).then(response => {
                resolve(response.data.resources[GOLD] || 0);
            }).catch(error => {
                reject(error);
            });
        });
    }

    // Transfer gold from CORNHOLE to Player
    async payToPlayer(playerState) {
        return await dao.transferResourceFromTo(CORNHOLE, playerState.player, playerState.reward);
    }

    // Transfer gold from Player to CORNHOLE
    async payToCORNHOLE(playerState, amount = playerState.playerBet) {  // default to playerBet, but allow override for insurance bet
        return await dao.transferResourceFromTo(playerState.player, CORNHOLE, amount);
    }

    // Check betAmount against valid bets
    // if invalid, set bet amount to the nearest valid amount less than the provided amount
    getValidBetAmount(betAmount) {
        const validBet = BET_AMOUNTS.reduce((prev, curr) => {
            return curr <= betAmount ? curr : prev;
        }, BET_AMOUNTS[0]);
        return validBet;
    }

    // Need to initially hide values in the dealers hand to prevent cheating
    sanitizePlayerState(playerState) {
        const sanitizedState = { ...playerState };
        if (!playerState.dealerHand.hasPlayed) {
            sanitizedState.dealerHand = {
                hand: [playerState.dealerHand.hand[0], "hidden"],
                total: "hidden",
                aceIs11: "hidden"
            };
        }
        return sanitizedState;
    }

    async drawCard(playerState, currentHand) {
        const { data } = await axios.get(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/draw/?count=1`);
        const card = data.cards[0];
        currentHand.hand.push(card.code);
        playerState.cardsLeft = data.remaining;

        let cardValue = card.cardValue;
        if (['KING', 'QUEEN', 'JACK'].includes(cardValue)) {
            currentHand.total += 10;
        } else if (cardValue === 'ACE') {
            currentHand.total += 11;
            currentHand.aceIs11 += 1;
        } else {
            currentHand.total += parseInt(cardValue);
        }
        if (currentHand.total > 21 && currentHand.aceIs11 > 0) {
            currentHand.total -= 10;
            currentHand.aceIs11 -= 1;
        }
    }

    async shuffle(playerState) {
        try {
            const { data } = await $.getJSON(`http://deckofcardsapi.com/api/deck/${playerState.deckId}/shuffle/`);
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
            let numericValues = cardValueMap[cardValue] || [0];
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
}

module.exports = JackAce;