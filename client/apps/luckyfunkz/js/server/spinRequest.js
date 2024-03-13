const axios = require('axios');

async function getSpinFromServer() {
  try {
    const response = await axios.get('http://localhost:3000/getSpin');
    const spin = response.data;
    return spin;
  } catch (error) {
    console.error('Error getting spin:', error.message);
    throw error;
  }
}

async function getSpin() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const spin = await getSpinFromServer();
      console.log(spin);
      return spin;
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

const spin = getSpin();