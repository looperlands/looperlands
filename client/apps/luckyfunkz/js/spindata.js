const fs = require("fs");

function generateAllSpins(symbolCount, totalCombos) {
    // Implement your logic to generate all spins here
    const spins = [];

    for (let i = 0; i < totalCombos; i++) {
        const spin = [];
        for (let j = 0; j < 3; j++) {
            const row = [];
            for (let k = 0; k < 3; k++) {
                row.push(Math.floor(Math.random() * symbolCount)); // Assuming 10 symbols
            }
            spin.push(row);
        }
        spins.push(spin);
    }

    return spins;
}

/* function generateSymbolArrays(spinData) {
    const symbolArrays = [];

    for (let i = 0; i < spinData.length; i++) {
        const symbolArray = [];
        for (let j = 0; j < 3; j++) {
            symbolArray.push(spinData[i].map(row => row[j]));
        }
        symbolArrays.push(symbolArray);
    }

    return symbolArrays;
} */

function isWinningCombination(symbolArray, winningNumbers) {
    // Define the winning combinations as arrays of indexes
    const winningCombos = [
        [
            [0, 0],
            [0, 1],
            [0, 2],
        ], // ABC
        [
            [1, 0],
            [1, 1],
            [1, 2],
        ], // DEF
        [
            [2, 0],
            [2, 1],
            [2, 2],
        ], // HIJ
        [
            [0, 0],
            [1, 1],
            [2, 2],
        ], // AEJ
        [
            [2, 0],
            [1, 1],
            [0, 2],
        ], // HEC
    ];

    let hasWinner = false;
    const winners = [];

    for (const combination of winningCombos) {
        const firstNumber = symbolArray[combination[0][0]][combination[0][1]];
        if(winningNumbers.includes(firstNumber)){
            const secondNumber = symbolArray[combination[1][0]][combination[1][1]];
            const thirdNumber = symbolArray[combination[2][0]][combination[2][1]];
            if (firstNumber == secondNumber && secondNumber == thirdNumber) {
                hasWinner = true;
                winners.push(firstNumber);
            }
        }
    }

    if(winners.length > 0){
        if(winners.length > 1){
            console.log('MULTIPLE WINNERS DETECTED!!!!!!!!!!!!!!!!!!!!!!');
        }
        return winners;
    }else{
        return;       
    }
}

function checkWinningStatus(generatedArrays, spinData, winningNumbers, symbolWinningCombos, winningComboLimits, totalCombos) {

    for (let i = 0; i < spinData.length; i++) {
        if(generatedArrays.spin.length >= totalCombos){
            break;
        }
        const symbolArray = spinData[i];
            const winningSymbol = isWinningCombination(symbolArray, winningNumbers);
            if (winningSymbol) {
                if(winningSymbol.length == 1){
                let addedToArray = false;
                for(const symbol of winningSymbol){
                    if (symbolWinningCombos[symbol] < winningComboLimits[symbol]) {
                        console.log(
                            `Winning combination ${
                                symbolWinningCombos[symbol]
                            } for symbol ${symbol}. Total combos for symbol: ${
                                symbolWinningCombos[symbol]
                            }`
                        );
                        if(!addedToArray){
                            generatedArrays.spin.push(symbolArray);
                            addedToArray = true;
                        }
                        symbolWinningCombos[symbol]++;
                    }

                }
            }

            } else if (remainingNonWinning > 0) {
                // Check non-winning combination
                console.log(`Non-winning combination. Remaining non-winning combos: ${remainingNonWinning - 1}`);
                generatedArrays.spin.push(symbolArray);
                remainingNonWinning--;
            } else {
                let allSymbolsFilled = true;

                for(j = 0; j <= winningComboLimits.length; j++) {
                    if(symbolWinningCombos[j] !== winningComboLimits[j]){
                        allSymbolsFilled = false;
                    }
                }
                if(allSymbolsFilled){
                    console.log(`All winning combinations accounted for, adding non-winning combo. Extra Non-winning: ${Math.abs(remainingNonWinning - 1)}`);
                    remainingNonWinning--;
                    generatedArrays.spin.push(symbolArray);
    
                }
            }
    }
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
    const fileContent = `const config = \{\n    spin: [\n        [\n${formattedSpin}\n        ],\n    ],\n    respin: [],\n    freespin: []\n\};\n\nmodule.exports = config;\n`;
    fs.writeFileSync(filePath, fileContent);
    console.log(`File written to ${filePath}`);
}

const symbolCount = 12; //runs from 00.png to 11.png
const totalCombos = 1000;
const winningNumbers = [0, 1, 2, 3, 4, 5, 6, 7]; //update to include logic for wilds 0 + 1
const winningComboLimits = [1, 2, 4, 8, 16, 32, 64, 128];
let remainingNonWinning = totalCombos - winningComboLimits.reduce((sum, val) => sum + val, 0);

let generatedArrays = { spin: [] };
const symbolWinningCombos = Array(winningComboLimits.length).fill(0);

while (generatedArrays.spin.length < totalCombos) {
    const spinData = generateAllSpins(symbolCount, totalCombos); // Implement this function
    checkWinningStatus(
        generatedArrays,
        spinData,
        winningNumbers,
        symbolWinningCombos,
        winningComboLimits,
        totalCombos,
        remainingNonWinning
    );
}

writeToFile(generatedArrays);
