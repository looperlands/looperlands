const axios = require('axios');
const { spinSet } = require('./data/spinSet');
const dao = require('../../js/dao');
const CORNHOLE = 'CORNHOLE';
const MAX_RETRY_COUNT = 5;

async function getSpin(platformClient, sessionData, linesPlayed, betPerLine) {
    let retryCount = 0;
    const nftId = sessionData.nftId;

    //Transfer resources to pay the bet
    const spinCost = linesPlayed * betPerLine;
    const paid = await dao.transferResourceFromTo(nftId, CORNHOLE, spinCost);

    if (!paid) { return "Not Enough Gold"; }

    while (retryCount < MAX_RETRY_COUNT) {
        try {
            let { chosenSpin, payout, winningLines } = await getSpinFromServer(platformClient, linesPlayed);

            if (payout > 0) {
                payout = payout * betPerLine;
                await dao.transferResourceFromTo(CORNHOLE, nftId, payout);
            }

            return { chosenSpin, payout, winningLines };
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

async function getSpinFromServer(platformClient, linesPlayed) {
    try {
        const spinIndex = await platformClient.getSpinIndex();
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
        { row: 1, cells: [result[1][0], result[1][1], result[1][2]] }, //middle row
        { row: 2, cells: [result[0][0], result[0][1], result[0][2]] }, //top row
        { row: 3, cells: [result[2][0], result[2][1], result[2][2]] }, //bottom row
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

    return { payout: parseInt(payout), winningLines };
}


function calc_line(s1, s2, s3) {
    //list of payouts and wild card symbols
    const match_payout = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];
    const wildCards = [0, 1];

    //console.log(`${s1}:${s2}:${s3}`);
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