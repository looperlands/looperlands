const axios = require('axios');

async function getSpinFromServer(linesPlayed, betPerLine) {
  try {
    console.log(`linesPlayed: ${linesPlayed} + betPerLine: ${betPerLine}`);

    //Get a spin number from with an api call
    const options = { headers: { 'X-Api-Key': API_KEY } };
    const url = "/api/maps/cornsino/spin";
    const response = await axios.get(url, options);
    console.log(response.data);

    //Lookup spin data associated with chosen spin number
    const chosenSpin = spins[response.data["spin"]];

    //Calculate the rewards associated with that spin
    const {payout, winningLines} = calc_reward(chosenSpin, linesPlayed);
    return {chosenSpin, payout, winningLines};

  } catch (error) {
    console.error('Error getting spin:', error.message);
    throw error;
  }
}
 
async function getSpin(linesPlayed, betPerLine) {
  const maxRetries = 3;
  let retryCount = 0;

  //Get the players nftId
  const sessionId = req.params.sessionId;
  const sessionData = cache.get(sessionId);
  const nftId = sessionData.nftId;

  //Transfer resources to pay the bet
  const paid = await transferResource(nftId, CORNHOLE, "21300041", linesPlayed * betPerLine);

  //if the bet cannot be paid, exit immediately and do not get a spin
  if(!paid){
    return "Low Funds";
  }

  while (retryCount < maxRetries) {
    try {
      const {randomSpin, payout, winningLines} = await getSpinFromServer(linesPlayed, betPerLine);
      console.log(randomSpin, " paid out ", payout, " from line(s) ", winningLines);
      return {randomSpin, payout, winningLines};
      break; // Exit the loop if successful
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        //console.log('Port in use, retrying...');
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
      } else {
        console.error('Failed to get spin:', error.message);
        break; // Exit the loop if an unexpected error occurs
      }
    }
  }

  if (retryCount === maxRetries) {
    console.error('Exceeded maximum retry attempts. Exiting.');
  }
}

function calc_line(s1, s2, s3) {
  console.log(`${s1}:${s2}:${s3}`);
  const isWild = (symbol) => wildCards.includes(symbol);

  // Perfect match
  if (s1 === s2 && s2 === s3) return match_payout[s1] * bet;

  // Wildcard with two of a kind
  if (isWild(s1) && s2 === s3) return match_payout[s2] * bet;
  if (isWild(s2) && s1 === s3) return match_payout[s1] * bet;
  if (isWild(s3) && s1 === s2) return match_payout[s1] * bet;

  // Double Wildcard
  if (isWild(s2) && isWild(s3)) return match_payout[s1] * bet;
  if (isWild(s1) && isWild(s3)) return match_payout[s2] * bet;
  if (isWild(s1) && isWild(s2)) return match_payout[s3] * bet;

  // No reward
  return 0;
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
      { row: 4, cells: [result[0][0], result[1][1], result[2][2]] }, //TL-BR diagonal
      { row: 5, cells: [result[0][2], result[1][1], result[2][0]] }, //BL-TR diagonal
  ];

  // Loop through lines and check for payouts
  for (const line of linesToCheck.slice(0, played_lines)) {
      const partial_payout = calc_line(...line.cells);
      if (partial_payout > 0) {
          payout += partial_payout;
          winningLines.push(line.row);
      }
  }

  return {payout, winningLines};
}

const {randomSpin, linePayouts} = getSpin(3,1);