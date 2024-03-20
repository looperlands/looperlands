const axios = require('axios');
const spinSet = require('./data/spinSet');
const dao = require('../../js/dao');
const platform = require('../../js/looperlandsplatformclient');
const CORNHOLE = 'CORNHOLE';
const API_KEY = process.env.LOOPWORMS_API_KEY;
const MAX_RETRY_COUNT = 5;

async function getSpin(sessionData, linesPlayed, betPerLine) {
    let retryCount = 0;

    //Get the players nftId
    const nftId = sessionData.nftId;

    //Transfer resources to pay the bet
    const spinCost = linesPlayed * betPerLine;
    const paid = await transferResourceFromTo(nftId, CORNHOLE, spinCost);

    //if the bet cannot be paid, exit immediately and do not get a spin
    if (!paid) { return "Not Enough Gold"; }

    while (retryCount < MAX_RETRY_COUNT) {
        try {
            const { randomSpin, payout, winningLines } = await getSpinFromServer(linesPlayed, betPerLine);
            console.log(randomSpin, " paid out ", payout, " from line(s) ", winningLines);
            if (payout > 0) {
                // PROCESS PAYOUT
                const amountToPayout = payout * betPerLine;
                await transferResourceFromTo(CORNHOLE, nftId, amountToPayout);
            }
            return { randomSpin, payout, winningLines };
            break;
        } catch (error) {
            if (error.code === 'EADDRINUSE') {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
            } else {
                console.error('Failed to get spin:', error.message);
                break;
            }
        }
    }
    if (retryCount === MAX_RETRY_COUNT) {
        console.error('Exceeded maximum retry attempts. Exiting.');
    }
}

function getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId');
}

async function getSpinFromServer(linesPlayed, betPerLine) {
    try {
        const spinIndex = await platform.getSpinIndex();
        const chosenSpin = spinSet[spinIndex];

        //Calculate the rewards associated with that spin
        const { payout, winningLines } = calc_reward(chosenSpin, linesPlayed);

        return { chosenSpin, payout, winningLines };

    } catch (error) {
        console.error('Error getting spin:', error.message);
        throw error;
    }
}

// calculate the reward
function calc_reward(result, played_lines) {
    payout = 0;
    let winningLines = [];

    // Define the lines to check
    const linesToCheck = [
        { row: 1, cells: [result[0][1], result[1][1], result[2][1]] }, //middle row
        { row: 2, cells: [result[0][0], result[1][0], result[2][0]] }, //top row
        { row: 3, cells: [result[0][2], result[1][2], result[2][2]] }, //bottom row
        //{ row: 4, cells: [result[0][0], result[1][1], result[2][2]] }, //TL-BR diagonal
        //{ row: 5, cells: [result[0][2], result[1][1], result[2][0]] }, //BL-TR diagonal
    ];

    // Loop through lines and check for payouts
    for (const line of linesToCheck.slice(0, played_lines)) {
        const partial_payout = calc_line(...line.cells);
        if (partial_payout > 0) {
            payout += partial_payout;
            winningLines.push(line.row);
        }
    }

    return { payout, winningLines };
}


function calc_line(s1, s2, s3) {
    //list of payouts and wild card symbols
    const match_payout = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];
    const wildCards = [0, 1];

    console.log(`${s1}:${s2}:${s3}`);
    const isWild = (symbol) => wildCards.includes(symbol);

    // Perfect match
    if (s1 === s2 && s2 === s3) return match_payout[s1];

    // Wildcard with two of a kind
    if (isWild(s1) && s2 === s3) return match_payout[s2];
    if (isWild(s2) && s1 === s3) return match_payout[s1];
    if (isWild(s3) && s1 === s2) return match_payout[s1];

    // Double Wildcard
    if (isWild(s2) && isWild(s3)) return match_payout[s1];
    if (isWild(s1) && isWild(s3)) return match_payout[s2];
    if (isWild(s1) && isWild(s2)) return match_payout[s3];

    // No reward
    return 0;
}

module.exports = { getSpin };