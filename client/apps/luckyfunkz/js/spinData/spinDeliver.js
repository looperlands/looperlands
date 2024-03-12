const express = require('express');
const fs = require('fs/promises');
const app = express();
const port = 3000;

const { spins } = require('./data/spinSet');

let spinsAvailableForDelivery;

const requestQueue = [];
let isProcessingQueue = false;

async function saveState() {
  try {
    await fs.writeFile('./data/spinState.json', JSON.stringify(spinsAvailableForDelivery));
  } catch (error) {
    console.error('Error saving spin state:', error.message);
  }
}

async function loadState() {
  try {
    const fileContent = await fs.readFile('./data/spinState.json', 'utf-8');
    spinsAvailableForDelivery = JSON.parse(fileContent);
    console.log('Spin State Loaded.');
  } catch (error) {
    console.error('Error loading spin state:', error.message);
    spinsAvailableForDelivery = [...spins]; // If there's an error loading, default to using the entire set of spins
    saveState();
  }
}

function getSpin() {
  if (spinsAvailableForDelivery.length === 0) {
    spinsAvailableForDelivery = [...spins];
    shuffle(spinsAvailableForDelivery);
  }
    
  shuffle(spinsAvailableForDelivery); //shuffle array prior to pulling a spin.
  const randomSpin = spinsAvailableForDelivery.pop();
  saveState();
  return randomSpin;
}

function shuffle(array) {
  // Fisher-Yates shuffle algorithm
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function processNextRequest() {
  if (requestQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  const { promise, res } = requestQueue.shift();
  promise().then((spin) => {
    res.json(spin);       // Send the spin to the client
    processNextRequest(); // Process the next request in the queue
  });
}

loadState();

app.get('/getSpin', (req, res) => {
  const spinPromise = () => {
    return new Promise((resolve) => {
      resolve(getSpin());
    });
  };
  requestQueue.push({ promise: spinPromise, res });

  if (!isProcessingQueue) {
    isProcessingQueue = true;
    processNextRequest();
  }
});

app.listen(port, () => {
  console.log(`Server is listening for /getSpin at http://localhost:${port}`);
});
