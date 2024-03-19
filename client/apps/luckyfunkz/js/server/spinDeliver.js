const express = require('express');
const fs = require('fs/promises');
const app = express();
const port = 3000;
const axios = require('axios');

const { spins } = require('./data/spinSet');

const WILD_NUMBERS = [0, 1];
const PAYOUTS_BASE = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];


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

async function getSpin(linesPlayed, betPerLine) {
  if (spinsAvailableForDelivery.length === 0) {
    spinsAvailableForDelivery = [...spins];
    shuffle(spinsAvailableForDelivery);
  }
    
  shuffle(spinsAvailableForDelivery); //shuffle array prior to pulling a spin.
  const randomSpin = spinsAvailableForDelivery.pop();
  saveState();
  const linePayouts = await calcRewards(randomSpin, linesPlayed, betPerLine);
  console.log(randomSpin, `\n`, linePayouts);
  return {randomSpin, linePayouts};
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

app.get('/getSpin/:linesPlayed/:betPerLine', async (req, res) => {
 ///session/:sessionId/
  //const sessionId = req.params.sessionId;
  //const sessionData = cache.get(sessionId);
  //let player = self.worldsMap[sessionData.mapId].getPlayerById(sessionData.entityId);
  //let gameData = sessionData.gameData;
  /*if (sessionData === undefined) {
      res.status(404).json({
          status: false,
          error: "No session with id " + sessionId + " found",
          user: null
      });
      return;
  }*/

  const linesPlayed = req.params.linesPlayed;
  const betPerLine = req.params.betPerLine;
  console.log(`linesPlayed: ${linesPlayed} + betPerLine: ${betPerLine}`);
  const minGold = linesPlayed * betPerLine;
  const resourceToCheck = "21300041"

  if(isBalanceEnough(minGold,resourceToCheck)){
    const spinPromise = () => {
      return new Promise(async (resolve) => {
        resolve(await getSpin(linesPlayed,betPerLine));
      });
    };
    requestQueue.push({ promise: spinPromise, res });
  
    if (!isProcessingQueue) {
      isProcessingQueue = true;
      processNextRequest();
    }
  }else{
      res.status(400).json({
        status: false,
        error: "Not enough " + key,
        user: null
    });

  } 
});

app.listen(port, () => {
  console.log(`Server is listening for /getSpin at http://localhost:${port}`);
});


async function isBalanceEnough(cost, resourceId){
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');
  const sessionData = cache.get(sessionId);
  const nftId = sessionData.nftId;
  let resource = axios.get("https://loopworms.io/DEV/LooperLands/loadConsumableItem.php?nftId=" + nftId + "&itemId=21300008");
  //let resource = parseInt(gameData.consumables[resourceId]); //i think resource might be the 21300041 and resourceId might be the string "gold"
  //let resource = 3;  //this will allow a min bet across the 3 lines, but error for more than that

  if (isNaN(resource) || typeof resource !== 'number' || resource < cost) {
      return false;
  } 
  else{
    const remainingBalance = resource - cost;
    axios.post('https://loopworms.io/DEV/LooperLands/saveConsumable2.php', 
    {
      "avatarId": nftId,
      "itemId": "21300008",
      "quantity": remainingBalance.toString()
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.toString()
      }
    })
    //transfer that amount from player to CORNHOLE prior to selecting a spin
      return true;
  }
}

async function calcRewards(randomSpin, linesPlayed, betPerLine){
  //reorder randomSpin so line 1 = middle, line 2 = top, line 3 = bottom.
  const lines = [randomSpin[1], randomSpin[0], randomSpin[2]];

  let payout = [0,0,0];
  for(let i = 0; i < linesPlayed; i++){
    payout[i] = winCheck(lines[i]) * betPerLine;
    //compute the winnings for the lines played and add to payout... multiply winnings by betPerLine
  }
  return payout;
}

function winCheck(lineData) {
  const firstNumber = lineData[0];
  const secondNumber = lineData[1];
  const thirdNumber = lineData[2];

  const wildCount = [firstNumber, secondNumber, thirdNumber].filter(num => WILD_NUMBERS.includes(num)).length;
  // Check if all three numbers are equal
  if (firstNumber === secondNumber && secondNumber === thirdNumber) {
      return PAYOUTS_BASE[wildCount === 3 ? WILD_COUNTS_AS : firstNumber];
  } else {
      if (wildCount === 1 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
          // one wild and other two numbers match
          return PAYOUTS_BASE[!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber)];
      }
      if (wildCount === 2 && (firstNumber === thirdNumber || firstNumber === secondNumber || secondNumber === thirdNumber)) {
          // two wilds and another number
          return PAYOUTS_BASE[!WILD_NUMBERS.includes(firstNumber) ? firstNumber : (!WILD_NUMBERS.includes(secondNumber) ? secondNumber : thirdNumber)];
      }
  }

  return 0;
}