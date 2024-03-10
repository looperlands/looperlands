const fs = require("fs");

const SYMBOL_COUNT = 12; //runs from 00.png to 11.png
const TOTAL_COMBOS = 1000;
//const WINNING_NUMBERS =    [0, 1,   2,  3,  4,  5,  6,  7,  8, 9, 10, 11];
const WINNING_COMBO_LIMITS = [0, 0, 128, 64, 64, 32, 16, 8, 4, 2, 1, 1];
const MULTI_WINNERS_LIMIT_PERCENTAGE = 0.05;
const LINE_ONE_WINS_LIMIT_PERCENTAGE = 0.20;
const LINE_TWO_WINS_LIMIT_PERCENTAGE = 0.30;
const WILD_NUMBERS = [0, 1];
const WILD_COUNTS_AS = 8;
const SINGLE_WILD_LIMIT_PERCENTAGE = 0.50;
const DOUBLE_WILD_LIMIT_PERCENTAGE = 0.25;
const TRIPLE_WILD_LIMIT_PERCENTAGE = 0.50; //% of WILD_COUNTS_AS
const BET = 1;
const MAX_BET = 5;
const PAYOUTS = [0, 0, 1, 2, 3, 4, 8, 12, 25, 50, 100, 420];

//COUNTERS
const winningComboCount = WINNING_COMBO_LIMITS.reduce((sum, val) => sum + val, 0);
let remainingNonWinning = TOTAL_COMBOS - winningComboCount;
let winningSpins = 0;

// [Min Bet 1 Line, Min Bet 2 Lines, Min Bet 3 Lines, Max Bet 1 Line, Max Bet 2 Lines, Max Bet 3 Lines, Most Efficient, Least Efficient]
let totalPayout = [0, 0, 0, 0, 0, 0, 0, 0];
let totalPayin = [0, 0, 0, 0, 0, 0, 0, 0];
let totalProfit = [0, 0, 0, 0, 0, 0, 0, 0];

let linewins = [0, 0, 0];
let doublewinners = 0;
let triplewinners = 0;
let wildwins = [0, 0, 0];
const symbolWinningCombos = Array(WINNING_COMBO_LIMITS.length).fill(0);

//LIMITS
let multiwinnersLimit = Math.floor(winningComboCount * MULTI_WINNERS_LIMIT_PERCENTAGE); //limit multiwins to % of winning combos
let lineonewinsLimit = Math.floor(winningComboCount * LINE_ONE_WINS_LIMIT_PERCENTAGE); //limit wins on line one to % of the winning combos
let linetwowinsLimit = Math.floor(winningComboCount * LINE_TWO_WINS_LIMIT_PERCENTAGE); //limit wins on line two to % of the winning combos
let linethreewinsLimit = winningComboCount - (lineonewinsLimit + linetwowinsLimit); //this will place remaining % of the wins on line three
let lineWinLimits = [lineonewinsLimit, linetwowinsLimit, linethreewinsLimit];
let singleWildLimit = Math.floor(winningComboCount * SINGLE_WILD_LIMIT_PERCENTAGE); //limit single wild wins to % of winning combos
let doubleWildLimit = Math.floor(winningComboCount * DOUBLE_WILD_LIMIT_PERCENTAGE); //limit double wild wins to % of winning combos
let tripleWildLimit = Math.floor(WINNING_COMBO_LIMITS[WILD_COUNTS_AS] * TRIPLE_WILD_LIMIT_PERCENTAGE); //limit triple wild wins to % of the WILD_COUNTS_AS symbol's wins
let wildWinLimits = [singleWildLimit, doubleWildLimit, tripleWildLimit];


let generatedArrays = { spin: [] };
while (generatedArrays.spin.length < TOTAL_COMBOS) {
    const spinData = generateAllSpins(); // Implement this function
    checkWinningStatus(
        generatedArrays,
        spinData,
        symbolWinningCombos,
        remainingNonWinning
    );
}


// DISPLAY SUMMARY:
console.log("\n=================");
console.log("SPIN DATA SUMMARY");
console.log("=================");

console.log(`\nNUMBER OF SPINS GENERATED: ${generatedArrays.spin.length}`);
console.log(`NUMBER OF WINNING SPINS: ${winningSpins}`);
console.log(`WINNING COMBOS ACROSS SPINS: ${symbolWinningCombos.reduce((sum, val) => sum + val, 0)}`);
console.log(`NUMBER OF WINNERS ON LINE ONE: ${linewins[0]}`);
console.log(`NUMBER OF WINNERS ON LINE TWO: ${linewins[1]}`);
console.log(`NUMBER OF WINNERS ON LINE THREE: ${linewins[2]}`);

console.log(`\nNUMBER OF MULTIWINNERS: ${doublewinners + triplewinners}`);
console.log(`MULTIWINS WITH TWO WINNERS: ${doublewinners}`);
console.log(`MULTIWINS WITH THREE WINNERS: ${triplewinners}`);
console.log(`NUMBER OF TRIPLE WILD WINS: ${wildwins[2]}`);
console.log(`NUMBER OF DOUBLE WILD WINS: ${wildwins[1]}`);
console.log(`NUMBER OF SINGLE WILD WINS: ${wildwins[0]}`);

console.log('\n[WINNING COMBOS PER SYMBOL]');
for (i = 0; i < symbolWinningCombos.length; i++) {
    if (!WILD_NUMBERS.includes(i)) {
        console.log(`SYMBOL ${i}: ${symbolWinningCombos[i]}`);
    } else {
        console.log(`SYMBOL ${i} IS SET TO WILD`);
    }
}

let scenarioStrings = ['MIN BET 1 LINE', 'MIN BET 2 LINES', 'MIN BET 3 LINES', 'MAX BET 1 LINE', 'MAX BET 2 LINES', 'MAX BET 3 LINES', 'MOST EFFICIENT', 'LEAST EFFICIENT'];
console.log('[PLAY SCENARIOS]');

for (let i = 0; i < scenarioStrings.length; i++) {
    console.log(`${scenarioStrings[i]} >> PAY = ${totalPayin[i]} : WIN = ${totalPayout[i]} : PROFIT = ${totalProfit[i]} (${(totalPayout[i] / totalPayin[i] * 100).toFixed(1)}%)`);
}



//WRITE FINALIZED ARRAY TO FILE
writeToFile(generatedArrays);


function generateAllSpins() {
    const spins = [];

    for (let i = 0; i < TOTAL_COMBOS; i++) {
        const spin = [];
        for (let j = 0; j < 3; j++) {
            const row = [];
            for (let k = 0; k < 3; k++) {
                row.push(Math.floor(Math.random() * SYMBOL_COUNT));
            }
            spin.push(row);
        }
        spins.push(spin);
    }

    return spins;
}

function isWinningCombination(symbolArray) {
    const winningCombos = [
        [
            [1, 0],
            [1, 1],
            [1, 2],
        ], // DEF (line one)
        [
            [0, 0],
            [0, 1],
            [0, 2],
        ], // ABC (line two)
        [
            [2, 0],
            [2, 1],
            [2, 2],
        ], // HIJ (line three)
        /*[             >>>>> EXCLUDE DIAGONALS FOR NOW
            [0, 0],
            [1, 1],
            [2, 2],
        ], // AEJ (line four)
        [
            [2, 0],
            [1, 1],
            [0, 2],
        ], // HEC (line five)*/
    ];

    const winners = [];
    let i = 0;
    let hasWinner = false;
    let isDoubleWin = false;
    let isTripleWin = false;
    let currentLineWins = [0, 0, 0];  // [line one, line two, line three]
    let localWildWins = [0, 0, 0];    // [single wild, double wild, triple wild]

    for (const combination of winningCombos) {
        const firstNumber = symbolArray[combination[0][0]][combination[0][1]];
        const secondNumber = symbolArray[combination[1][0]][combination[1][1]];
        const thirdNumber = symbolArray[combination[2][0]][combination[2][1]];

        const wildCount = [firstNumber, secondNumber, thirdNumber].filter(num => WILD_NUMBERS.includes(num)).length;

        // Check if all three numbers are equal
        if (firstNumber === secondNumber && secondNumber === thirdNumber) {
            if (linewins[i] < lineWinLimits[i] || wildCount === 3) { // make sure limits aren't exceeded
                hasWinner = true;
                winners.push(wildCount === 3 ? WILD_COUNTS_AS : firstNumber);
                currentLineWins[i]++;           //place increase in a temp holder variable in case a later combo results in abort                
                localWildWins[wildCount - 1]++;   //record wilds in temp holder variable
            } else { return { winners: [], currentLineWins: [0, 0, 0], isTripleWin: false, isDoubleWin: false, localWildWins: [0, 0, 0] }; } // abort spin
        } else {


            if (wildCount === 1 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
                // one wild and other two numbers match
                if (linewins[i] < lineWinLimits[i]) {
                    hasWinner = true;
                    currentLineWins[i]++; //increase this holder in case a later combo results in abort
                    localWildWins[wildCount - 1]++; //record wilds in this win combo
                    winners.push(!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber));
                } else { return { winners: [], currentLineWins: [0, 0, 0], isTripleWin: false, isDoubleWin: false, localWildWins: [0, 0, 0] }; }
            }
            if (wildCount === 2 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
                // two wilds and another number
                if (linewins[i] < lineWinLimits[i]) {
                    hasWinner = true;
                    currentLineWins[i]++; //increase this holder in case a later combo results in abort
                    localWildWins[wildCount - 1]++; //record wilds in this win combo
                    winners.push(!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber));
                } else { return { winners: [], currentLineWins: [0, 0, 0], isTripleWin: false, isDoubleWin: false, localWildWins: [0, 0, 0] }; }
            }
        }
        i++; //increase line tracker
    }


    if (winners.length > 0) {
        if (winners.length > 1) {
            // MULTI WINNER
            if ((doublewinners + triplewinners) < multiwinnersLimit) {
                winners.length > 2 ? isTripleWin = true : isDoubleWin = true;
                return { winners, currentLineWins, isTripleWin, isDoubleWin, localWildWins };
            }
            return { winners: [], currentLineWins: [0, 0, 0], isTripleWin: false, isDoubleWin: false, localWildWins: [0, 0, 0] };
        }

        // SINGLE WINNER
        return { winners, currentLineWins, isTripleWin, isDoubleWin, localWildWins };

    } else {
        return { winners: [], currentLineWins: [0, 0, 0], isTripleWin: false, isDoubleWin: false, localWildWins: [0, 0, 0] };
    }
}

function checkWinningStatus(generatedArrays, spinData, symbolWinningCombos) {

    for (let i = 0; i < spinData.length; i++) {
        let addedToArray = false;

        if (generatedArrays.spin.length >= TOTAL_COMBOS) {
            break;
        }

        const symbolArray = spinData[i];
        const { winners, currentLineWins, isTripleWin, isDoubleWin, localWildWins } = isWinningCombination(symbolArray);

        if (winners && winners.length > 0) {
            let addToArray = true;

            //check to make sure wild limits aren't exceeded
            if (localWildWins.some((localWin, index) => localWin + wildwins[index] > wildWinLimits[index])) {
                addToArray = false;
            }

            //check to make sure symbol limit aren't exceeded
            for (const symbol of winners) {
                if (symbolWinningCombos[symbol] == WINNING_COMBO_LIMITS[symbol]) {
                    addToArray = false;
                }
            }

            if (addToArray) {
                generatedArrays.spin.push(symbolArray);
                calcRevenuePerformance(symbolArray, winners, currentLineWins);

                winningSpins++;
                addedToArray = true;
                linewins = addArrays(linewins, currentLineWins);
                wildwins = addArrays(wildwins, localWildWins);
                if (isTripleWin) { triplewinners++; }
                if (isDoubleWin) { doublewinners++; }

                for (const symbol of winners) {
                    symbolWinningCombos[symbol]++;
                    console.log(`Winning combination for symbol ${symbol} (${symbolWinningCombos[symbol]}/${WINNING_COMBO_LIMITS[symbol]})`);
                }

            }
        }

        if (!addedToArray && remainingNonWinning > 0) {
            // non-winning combination
            console.log(`Non-winning combination. Remaining: ${remainingNonWinning - 1}`);
            generatedArrays.spin.push(symbolArray);
            calcRevenuePerformance(symbolArray, winners, currentLineWins);
            remainingNonWinning--;
        } else if (!addedToArray) {
            let allSymbolsFilled = true;

            for (j = 0; j <= WINNING_COMBO_LIMITS.length; j++) {
                if (symbolWinningCombos[j] !== WINNING_COMBO_LIMITS[j]) {
                    allSymbolsFilled = false;
                }
            }
            if (allSymbolsFilled) {
                console.log(`All winning combinations accounted for, adding non-winning combo. Extra Non-winning: ${Math.abs(remainingNonWinning - 1)}`);
                remainingNonWinning--;
                generatedArrays.spin.push(symbolArray);
                calcRevenuePerformance(symbolArray, winners, currentLineWins);
            }
        }
    }
}

function addArrays(array1, array2) {
    return array1.map((num, idx) => num + array2[idx]);
}

function formatArray(array) {
    return array.map((row) => `            [${row.join("], \n            [")}],`).join("\n        ],\n        [\n");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function writeToFile(config) {
    const formattedSpin = formatArray(shuffleArray(config.spin));
    const filePath = "./spins.txt";
    const fileContent = `const spins =\n[\n        [\n${formattedSpin}\n        ],\n    ];\n\nmodule.exports = spins;`;
    fs.writeFileSync(filePath, fileContent);
    console.log(`File written to ${filePath}\n`);
}


function calcRevenuePerformance(symbolArray, winners, currentLineWins) {
    // Calculate line payouts
    let linePayouts = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        if (currentLineWins[i] > 0) {
            const lineData = symbolArray[i];
            const firstNumber = lineData[0];
            const secondNumber = lineData[1];
            const thirdNumber = lineData[2];
            const wildCount = [firstNumber, secondNumber, thirdNumber].filter(num => WILD_NUMBERS.includes(num)).length;

            if (firstNumber === secondNumber && secondNumber === thirdNumber) {
                // All three numbers are equal
                linePayouts[i] = PAYOUTS[wildCount === 3 ? WILD_COUNTS_AS : firstNumber];
            } else if (wildCount === 1 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
                // One wild and other two numbers match
                linePayouts[i] = PAYOUTS[!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber)];
            } else if (wildCount === 2 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
                // Two wilds and another number
                linePayouts[i] = PAYOUTS[!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber)];
            }
        }
    }

    // Calculate revenue for different scenarios
    let scenarioPayout = [];
    let scenarioPayin = [];
    let scenarioProfit = [];

    // Min Bet 1 Line
    let minOneLineWin = linePayouts[0] * BET;                           // PAYOUT
    let minOneLinePay = BET;                                            // BET
    let minOneLineProfit = minOneLineWin - minOneLinePay;               // PROFIT
    scenarioPayout.push(minOneLineWin);
    scenarioPayin.push(minOneLinePay);
    scenarioProfit.push(minOneLineProfit);

    // Min Bet 2 Lines
    let minTwoLineWin = (linePayouts[0] + linePayouts[1]) * BET;        // PAYOUT
    let minTwoLinePay = 2 * BET;                                        // BET
    let minTwoLineProfit = minTwoLineWin - minTwoLinePay;               // PROFIT
    scenarioPayout.push(minTwoLineWin);
    scenarioPayin.push(minTwoLinePay);
    scenarioProfit.push(minTwoLineProfit);

    // Min Bet 3 Lines
    let minThreeLineWin = linePayouts.reduce((sum, payout) => sum + payout, 0) * BET;       // PAYOUT
    let minThreeLinePay = 3 * BET;                                                          // BET
    let minThreeLineProfit = minThreeLineWin - minThreeLinePay;                             // PROFIT
    scenarioPayout.push(minThreeLineWin);
    scenarioPayin.push(minThreeLinePay);
    scenarioProfit.push(minThreeLineProfit);

    // Max Bet 1 Line
    let maxOneLineWin = linePayouts[0] * MAX_BET;                       // PAYOUT
    let maxOneLinePay = MAX_BET;                                        // BET
    let maxOneLineProfit = maxOneLineWin - maxOneLinePay;               // PROFIT
    scenarioPayout.push(maxOneLineWin);
    scenarioPayin.push(maxOneLinePay);
    scenarioProfit.push(maxOneLineProfit);

    // Max Bet 2 Lines
    let maxTwoLineWin = (linePayouts[0] + linePayouts[1]) * MAX_BET;    // PAYOUT
    let maxTwoLinePay = 2 * MAX_BET;                                    // BET
    let maxTwoLineProfit = maxTwoLineWin - maxTwoLinePay;               // PROFIT
    scenarioPayout.push(maxTwoLineWin);
    scenarioPayin.push(maxTwoLinePay);
    scenarioProfit.push(maxTwoLineProfit);

    // Max Bet 3 Lines
    let maxThreeLineWin = linePayouts.reduce((sum, payout) => sum + payout, 0) * MAX_BET;   // PAYOUT
    let maxThreeLinePay = 3 * MAX_BET;                                                      // BET
    let maxThreeLineProfit = maxThreeLineWin - maxThreeLinePay;                             // PROFIT
    scenarioPayout.push(maxThreeLineWin);
    scenarioPayin.push(maxThreeLinePay);
    scenarioProfit.push(maxThreeLineProfit);

    // Find indexes for max and min profit
    const maxProfitIndex = scenarioProfit.indexOf(Math.max(...scenarioProfit));
    const minProfitIndex = scenarioProfit.indexOf(Math.min(...scenarioProfit));

    // Most Efficient Play
    let mostEfficientWin = scenarioPayout[maxProfitIndex];
    let mostEfficientPay = scenarioPayin[maxProfitIndex];
    let mostEfficientProfit = scenarioProfit[maxProfitIndex];
    scenarioPayout.push(mostEfficientWin);
    scenarioPayin.push(mostEfficientPay);
    scenarioProfit.push(mostEfficientProfit);

    // Least Efficient Play
    let leastEfficientWin = scenarioPayout[minProfitIndex];
    let leastEfficientPay = scenarioPayin[minProfitIndex];
    let leastEfficientProfit = scenarioProfit[minProfitIndex];
    scenarioPayout.push(leastEfficientWin);
    scenarioPayin.push(leastEfficientPay);
    scenarioProfit.push(leastEfficientProfit);

    // Add to total record
    console.log(totalPayout); 
    totalPayout = addArrays(totalPayout, scenarioPayout);
    console.log(totalPayout); 
    totalPayin = addArrays(totalPayin, scenarioPayin);
    totalProfit = addArrays(totalProfit, scenarioProfit);
    
}