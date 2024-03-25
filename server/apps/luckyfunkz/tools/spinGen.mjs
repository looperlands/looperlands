import fs from 'fs';

const TOTAL_SPINS = 69420;
const SYMBOL_COUNT = 12;
const LINE_COUNT = 3;
const LINES_PLAYED = 3;
const WILD_NUMBERS = [0, 1];
const WILD_COUNTS_AS = 10;
const WINNING_COMBO_LIMITS = [0, 0, 20000, 10000, 5000, 1000, 500, 100, 10, 5, 2, 1];
const WILD_WIN_COMBO_LIMITS = [0, 0, 12000, 6000, 3000, 500, 250, 50, 5, 1, 0, 0];
const MAX_TRIPLE_WILD = 0;
const WINNING_COMBO_COUNT = WINNING_COMBO_LIMITS.reduce((sum, val) => sum + val, 0);
const PAYOUTS_BASE = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];
const BET = 1;

const LINE_TWO = 0;
const LINE_ONE = 1;
const LINE_THREE = 2;
const MAX_CALC_TIME = 100000;

let abortCurrentCalc = false;
let winningComboTracker = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let wildwinComboTracker = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let winningSpins = 0;
let doublewinners = 0;
let triplewinners = 0;
let nonwinTracker = 0;
let lineWin = [0, 0, 0];
let lineWild = [0, 0, 0];
let wildWins = [0, 0, 0];
let totalPayin = [0, 0, 0, 0, 0];
let totalPayout = [0, 0, 0, 0, 0];
let totalProfit = [0, 0, 0, 0, 0];
let dots = 0;
let removeDots = false;

let allInRange = false;
let RTPstring = '';

let options = 0;
while (options < 100) {
    allInRange = false;
    while (!allInRange) {
        winningComboTracker = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        wildwinComboTracker = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        winningSpins = 0;
        doublewinners = 0;
        triplewinners = 0;
        nonwinTracker = 0;
        lineWin = [0, 0, 0];
        lineWild = [0, 0, 0];
        wildWins = [0, 0, 0];
        totalPayin = [0, 0, 0, 0, 0];
        totalPayout = [0, 0, 0, 0, 0];
        totalProfit = [0, 0, 0, 0, 0];

        const spinData = await generateAllSpins();
        if (!abortCurrentCalc) {
            checkInRange();

            if (allInRange) {
                let summaryString = Summary(spinData);
                writeToFile(spinData, summaryString);
                options++;
            }
        }
    }
}



async function generateAllSpins() {
    abortCurrentCalc = false;
    const spins = [];
    let spinDataGenerated = false;
    process.stdout.write('Processing');

    while (!spinDataGenerated && !abortCurrentCalc) {
        const spin = await generateSpin();

        if (spin) {
            spins.push(spin);
            await updateTrackers();

            const currentComboCount = winningComboTracker.reduce((sum, val) => sum + val, 0);
            if (currentComboCount >= WINNING_COMBO_COUNT && spins.length >= TOTAL_SPINS) {
                spinDataGenerated = true;
            }
        }
    }

    return spins;
}

async function generateSpin() {
    const spin = [];
    for (let j = 0; j < 3; j++) {
        const row = [];
        for (let k = 0; k < 3; k++) {
            row.push(Math.floor(Math.random() * SYMBOL_COUNT));
        }
        spin.push(row);
    }
    if (!await processSpin(spin)) {
        return spin;
    } else {
        return undefined;
    };
}

async function processSpin(spin) {
    lineWild = [0, 0, 0];
    lineWin = [0, 0, 0];

    for (let i = 0; i < LINES_PLAYED; i++) {
        const lineData = spin[i];
        const firstNumber = lineData[0];
        const secondNumber = lineData[1];
        const thirdNumber = lineData[2];

        const wildCount = [firstNumber, secondNumber, thirdNumber].filter(num => WILD_NUMBERS.includes(num)).length;
        if (wildCount === 3 && MAX_TRIPLE_WILD === 0) return true;

        if (firstNumber === secondNumber && secondNumber === thirdNumber) {
            lineWin[i] = wildCount === 3 ? WILD_COUNTS_AS : firstNumber;
            lineWild[i] = wildCount;
        } else {
            // Check for winning combinations involving wild symbols
            const nonWildNumbers = [firstNumber, secondNumber, thirdNumber].filter(num => !WILD_NUMBERS.includes(num)); // Exclude wild symbols
            const uniqueNumbers = Array.from(new Set(nonWildNumbers));  // Get unique numbers after excluding wilds

            // Check if there's only one unique number (excluding wild symbols)
            if (uniqueNumbers.length === 1 && wildCount > 0) {
                lineWin[i] = uniqueNumbers[0]; // Set the winning symbol
                lineWild[i] = wildCount;
            }
        }
    }

    return await isLimitMet();
}


async function isLimitMet() {
    let isLimitMet = false;

    const hasWinningCombo = lineWin.some(line => line > 0);

    if (hasWinningCombo) {
        for (let i = 0; i < LINE_COUNT; i++) {
            const line = lineWin[i];
            const wildCount = lineWild[i];

            if (line > 0) {
                // Check if winning combos using a wild are met for this symbol
                if (wildCount > 0 && wildwinComboTracker[line] >= WILD_WIN_COMBO_LIMITS[line]) {
                    isLimitMet = true;
                }

                // If this is a triple wild, check if that limit is met
                if (wildCount > 2 && wildWins[2] >= MAX_TRIPLE_WILD) {
                    isLimitMet = true;
                }

                // Check if symbol limit is met
                if (winningComboTracker[line] >= WINNING_COMBO_LIMITS[line]) {
                    isLimitMet = true;
                }
            }
        }

        return isLimitMet;

    } else {
        //check if all combos have been filled:
        let currentComboCount = winningComboTracker.reduce((sum, val) => sum + val, 0);

        //NONWINNER 
        if (currentComboCount >= WINNING_COMBO_COUNT) {
            nonwinTracker++;
            //console.log('adding non winner #: ', nonwinTracker);
            return false;
        }

        //WAIT UNTIL ALL COMBOS FILLED
        return true;
    }
}

async function updateTrackers() {

    for (let i = 0; i < LINE_COUNT; i++) {
        if (lineWin[i] > 0) {
            winningComboTracker[lineWin[i]]++;
            if (lineWild[i] > 0) {
                wildwinComboTracker[lineWin[i]]++;
            }
        };
    }



    if (removeDots) {
        process.stdout.write('\b');
        dots--;
    } else {
        process.stdout.write('.');
        dots++;
    }

    if (dots === 3 || dots === 0) {
        removeDots = !removeDots;
    }

    let lineOne = PAYOUTS_BASE[lineWin[LINE_ONE]];
    let lineTwo = PAYOUTS_BASE[lineWin[LINE_TWO]];
    let lineThree = PAYOUTS_BASE[lineWin[LINE_THREE]];
    let lineCheck = [lineOne, lineTwo, lineThree];

    if (lineCheck.filter(line => line > 0).length > 1) {
        if (lineCheck.filter(line => line > 0).length > 2) {
            triplewinners++;
        } else {
            doublewinners++;
        }
    };



    if (lineCheck.reduce((sum, val) => sum + val, 0) > 0) { winningSpins++; }


    // Calculate revenue for different scenarios
    let scenarioPayin = [];
    let scenarioPayout = [];
    let scenarioProfit = [];

    //BET 1 LINE
    scenarioPayin[0] = BET;
    scenarioPayout[0] = lineOne;
    scenarioProfit[0] = scenarioPayin[0] - scenarioPayout[0];

    //BET 2 LINES
    scenarioPayin[1] = BET * 2;
    scenarioPayout[1] = lineOne + lineTwo;
    scenarioProfit[1] = scenarioPayin[1] - scenarioPayout[1];

    //BET 3 LINES
    scenarioPayin[2] = BET * 3;
    scenarioPayout[2] = lineOne + lineTwo + lineThree;
    scenarioProfit[2] = scenarioPayin[2] - scenarioPayout[2];

    // Find indexes for max and min profit
    const maxProfitIndex = scenarioProfit.indexOf(Math.min(...scenarioProfit));
    const minProfitIndex = scenarioProfit.indexOf(Math.max(...scenarioProfit));

    //MOST EFFICIENT
    scenarioPayin[3] = scenarioPayin[maxProfitIndex];
    scenarioPayout[3] = scenarioPayout[maxProfitIndex];
    scenarioProfit[3] = scenarioProfit[maxProfitIndex];

    //LEAST EFFICIENT
    scenarioPayin[4] = scenarioPayin[minProfitIndex];
    scenarioPayout[4] = scenarioPayout[minProfitIndex];
    scenarioProfit[4] = scenarioProfit[minProfitIndex];

    // Add to total record
    totalPayout = addArrays(totalPayout, scenarioPayout);
    totalPayin = addArrays(totalPayin, scenarioPayin);
    totalProfit = addArrays(totalProfit, scenarioProfit);

    // Record lineWild
    wildWins = addArrays(wildWins, lineWild);

}

function addArrays(array1, array2) {
    return array1.map((num, idx) => num + array2[idx]);
}

function checkInRange() {
    let outOfRange = false;
    let RTParray = [];
    for (let i = 0; i < 3; i++) {
        let RTP = (totalPayout[i] / totalPayin[i] * 100).toFixed(1);
        RTParray.push(RTP);
        if (!(RTP >= 83 && RTP <= 99.9)) {
            outOfRange = true;
        }
    }
    if (!outOfRange) {
        allInRange = true;
    }
    RTPstring = RTParray.join("_");
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`${RTParray.join(" : ")}: ${!outOfRange ? "[OK]" : "[NG]"}`);
}



function Summary(spinData) {
    let summaryString = "\n=================\n";
    summaryString += "SPIN DATA SUMMARY\n";
    summaryString += "=================\n";

    summaryString += `\nNUMBER OF SPINS GENERATED: ${spinData.length}\n`;
    summaryString += `NUMBER OF WINNING SPINS: ${winningSpins}\n`;
    summaryString += `NUMBER OF NONWINNING SPINS: ${nonwinTracker}\n`;
    summaryString += `WINNING COMBOS ACROSS SPINS: ${winningComboTracker.reduce((sum, val) => sum + val, 0)}\n`;
    summaryString += `\nNUMBER OF MULTIWINNERS: ${doublewinners + triplewinners}\n`;
    summaryString += `MULTIWINS WITH TWO WINNERS: ${doublewinners}\n`;
    summaryString += `MULTIWINS WITH THREE WINNERS: ${triplewinners}\n`;
    summaryString += `NUMBER OF TRIPLE WILD WINS: ${wildWins[2]}\n`;
    summaryString += `NUMBER OF DOUBLE WILD WINS: ${wildWins[1]}\n`;
    summaryString += `NUMBER OF SINGLE WILD WINS: ${wildWins[0]}\n`;

    summaryString += '\n[PAYOUT TABLE]\n';
    for (let i = (winningComboTracker.length - 1); i >= 0; i--) {
        if (!WILD_NUMBERS.includes(i)) {
            summaryString += `[${i}] WINNING COMBOS: ${winningComboTracker[i]}, BASE PAYOUT: ${PAYOUTS_BASE[i]}\n`;
        } else {
            summaryString += `[${i}] IS SET TO WILD\n`;
        }
    }

    let scenarioStrings = ['BET 1 LINE', 'BET 2 LINES', 'BET 3 LINES', 'MOST EFFICIENT', 'LEAST EFFICIENT'];

    summaryString += '\n[PLAY SCENARIOS]\n';

    for (let i = 0; i < scenarioStrings.length; i++) {
        summaryString += `${scenarioStrings[i]} >> IN = ${totalPayin[i]} : OUT = ${totalPayout[i]} : HOUSE PROFIT = ${totalProfit[i]} (${(totalPayout[i] / totalPayin[i] * 100).toFixed(1)}%)\n`;
    }

    summaryString += `SUM OF SCENARIO PROFITS: ${totalProfit.reduce((sum, val) => sum + val, 0)}\n`;
    console.log(summaryString);

    return summaryString;
}

function printSummary(spinData) {

    console.log("\n=================");
    console.log("SPIN DATA SUMMARY");
    console.log("=================");

    console.log(`\nNUMBER OF SPINS GENERATED: ${spinData.length}`);
    console.log(`NUMBER OF WINNING SPINS: ${winningSpins}`);
    console.log(`NUMBER OF NONWINNING SPINS: ${nonwinTracker}`);
    console.log(`WINNING COMBOS ACROSS SPINS: ${winningComboTracker.reduce((sum, val) => sum + val, 0)}`);
    console.log(`\nNUMBER OF MULTIWINNERS: ${doublewinners + triplewinners}`);
    console.log(`MULTIWINS WITH TWO WINNERS: ${doublewinners}`);
    console.log(`MULTIWINS WITH THREE WINNERS: ${triplewinners}`);
    console.log(`NUMBER OF TRIPLE WILD WINS: ${wildWins[2]}`);
    console.log(`NUMBER OF DOUBLE WILD WINS: ${wildWins[1]}`);
    console.log(`NUMBER OF SINGLE WILD WINS: ${wildWins[0]}`);

    console.log('\n[PAYOUT TABLE]');
    for (let i = (winningComboTracker.length - 1); i >= 0; i--) {
        if (!WILD_NUMBERS.includes(i)) {
            console.log(`[${i}] WINNING COMBOS: ${winningComboTracker[i]}, BASE PAYOUT: ${PAYOUTS_BASE[i]}`);
        } else {
            console.log(`[${i}] IS SET TO WILD`);
        }
    }

    let scenarioStrings = ['BET 1 LINE', 'BET 2 LINES', 'BET 3 LINES', 'MOST EFFICIENT', 'LEAST EFFICIENT'];

    console.log(`\n[PLAY SCENARIOS]`);

    for (let i = 0; i < scenarioStrings.length; i++) {
        console.log(`${scenarioStrings[i]} >> IN = ${totalPayin[i]} : OUT = ${totalPayout[i]} : HOUSE PROFIT = ${totalProfit[i]} (${(totalPayout[i] / totalPayin[i] * 100).toFixed(1)}%)`);
    }

    console.log(`SUM OF SCENARIO PROFITS: ${totalProfit.reduce((sum, val) => sum + val, 0)}`);
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

function writeToFile(spinData, summaryString) {
    const formattedSpin = formatArray(shuffleArray(spinData));
    const filePath = `./${RTPstring}.txt`;
    const fileContent = `const spins =\n[\n        [\n${formattedSpin}\n        ],\n    ];\n\nmodule.exports = spins; \n /*\n${summaryString}\n*/`;
    fs.writeFileSync(filePath, fileContent);
    console.log(`File written to ${filePath}\n`);
}