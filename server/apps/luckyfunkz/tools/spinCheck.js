const { spinSet } = require('../data/spinSet');

const WILD_NUMBERS = [0, 1];
const matches = {};

// Initialize matches object with zeros for each number
for (let i = 2; i < 12; i++) {
    matches[i] = 0;
}
matches['wild']=0;

// Iterate over each spin data
for (const spinData of spinSet) {
    // Iterate over each row in the spin data
    for (const row of spinData) {
        // Count occurrences of each number (excluding wild symbols) in the row
        const nonWildNumbers = row.filter(num => !WILD_NUMBERS.includes(num)); // Excludes wild symbols
        const uniqueNumbers = Array.from(new Set(nonWildNumbers));  // Get unique numbers after excluding wilds

        if(uniqueNumbers.length === 1){
                matches[uniqueNumbers[0]]++;
        }else if (row.filter(num => WILD_NUMBERS.includes(num)).length === 3) {
            // Check if the row contains three wild numbers
            matches['wild']++; // Increment the count for rows with three wild numbers
        }
    }
}

// Print the results
for (const num in matches) {
    console.log(`Number ${num}: ${matches[num]} matches`);
}