// this is for testing how spinDeliver performs when multiple requests are made at the same time.

const axios = require('axios');

async function makeRequests() {
  const numRequests = 5; // Adjust the number of requests as needed
  const requests = [];

  for (let i = 0; i < numRequests; i++) {
    //console.log(`Request ${i + 1} sent at: ${new Date(requestTime).toISOString()}`);
    
    requests.push({
      promise: axios.get('http://localhost:3000/getSpin')
    });
  }

  try {
    const responses = await Promise.all(requests.map(req => req.promise));
    const requestTime = Date.now();
    console.log(`Requests sent at: ${new Date(requestTime).toISOString()}`);
    responses.forEach((res, i) => {
      const responseTime = Date.now();
      console.log(`Response ${i + 1} received at: ${new Date(responseTime).toISOString()}`);
      console.log(`Duration: ${responseTime - requestTime} ms`);
      console.log('Response:', res.data);
    });
  } catch (error) {
    console.error('Error making requests:', error.message);
  }
}

makeRequests();
