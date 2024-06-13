const express = require('express');
const axios = require('axios');
const dao = require('../../js/dao');
const { currentHandIndex } = require('../../../client/apps/JackAce/js/globals');

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
                playerState = this.initializeGame(player, betAmount, deckId);
                this.playerGameStates[player] = playerState;
            } catch (error) {
                console.error("Error initializing deck:", error);
                res.status(500).json({ message: "Internal server error" });
            }

        }

        // Check if player has a hand in progress
        if (action === 'DEAL' && playerState.inProgress) {
            // DEAL only available when a hand is not currently in progress
            return res.status(400).json({ message: `[DEAL] Invalid action >> hand in progress.` });
        } else if (!playerState.inProgress) {
            // Other actions only available when a hand is in progress
            return res.status(400).json({ message: `[${action}] Invalid action >> no hand in progress.` });
        }

        try {
            switch (action) {
                case 'DEAL':
                    if (await payToCORNHOLE(playerState)) {
                        await this.deal(playerState);
                        res.json(this.sanitizePlayerState(playerState));
                    } else {
                        return res.status(400).json({ message: "Not Enough Gold." });
                    }
                    break;
                case 'HIT':
                    if (playerState.playerHands[playerState.currentHandIndex].canHit) {
                        this.hit(playerState);
                    }
                    break;
                case 'STAND':
                    // Handle stand
                    break;
                case 'SPLIT':
                    // Handle split
                    break;
                case 'DOUBLE':
                    // Handle double
                    break;
                case 'INSURANCE':
                    // Handle insurance
                    break;
                case 'REWARD':
                    // Handle reward
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
        player.gameWindow = 'hit'

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
            totalHandBet: validBetAmount,
            reward: 0,
            currentHandIndex: 0,
            playerHands: [{
                hand: [],
                total: 0,
                aceIs11: 0,
                canHit: true,
                canSplit: false
            }],
            dealerHand: {
                hand: [],
                total: 0,
                aceIs11: 0,
                hasPlayed: false
            },
            canDouble: false,
            inProgress: true,
            lastActionTime: new Date()
        };
    }

    // Reset player's hands to the initial state
    async resetHand(player) {
        const validBetAmount = this.getValidBetAmount(player.playerBet);
        player.playerBet = validBetAmount;
        player.totalHandBet = validBetAmount;
        player.reward = 0;
        player.currentHandIndex = 0;
        player.playerHands = [{
            hand: [],
            total: 0,
            aceIs11: 0,
            canHit: true,
            canSplit: false
        }];
        player.dealerHand = {
            hand: [],
            total: 0,
            aceIs11: 0,
            hasPlayed: false
        };
        player.canDouble = false;
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
        //fix this function to go through all hands under playerhands and compute the total reward
        const playerTotal = playerState.playerHands[0].total;
        const dealerTotal = playerState.dealerHand.total;

        if (playerTotal > 21) {
            playerState.reward = 0;
        } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
            playerState.reward = playerState.totalHandBet * 2;
        } else if (playerTotal === dealerTotal) {
            playerState.reward = playerState.totalHandBet;
        } else {
            playerState.reward = 0;
        }

        // once full reward is determined, if it's greater than zero payToPlayer
        this.payToPlayer(playerState);
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
        const data = await axios.get(`http://deckofcardsapi.com/api/deck/${player.deckId}/draw/?count=1`);
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

    async shuffle(player) {
        try {
            const data = await $.getJSON(`http://deckofcardsapi.com/api/deck/${player.deckId}/shuffle/`);
            if (!data.shuffled) {
                this.shuffle();
            } else {
                player.cardsLeft = data.remaining;
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