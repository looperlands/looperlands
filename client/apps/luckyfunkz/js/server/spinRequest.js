const axios = require('axios');

async function getSpinFromServer(linesPlayed, betPerLine) {
  try {
    console.log(`linesPlayed: ${linesPlayed} + betPerLine: ${betPerLine}`);
    const response = await axios.get(`http://localhost:3000/getSpin/${linesPlayed}/${betPerLine}`);
    console.log(response.data);
    const {randomSpin, linePayouts} = response.data;
    return {randomSpin, linePayouts};
  } catch (error) {
    console.error('Error getting spin:', error.message);
    throw error;
  }
}

async function getSpin(linesPlayed, betPerLine) {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const {randomSpin, linePayouts} = await getSpinFromServer(linesPlayed, betPerLine);
      console.log(randomSpin, " : ", linePayouts);
      return {randomSpin, linePayouts};
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

const {randomSpin, linePayouts} = getSpin(3,1);