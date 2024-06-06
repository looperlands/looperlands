import { getDeck, drawCardDealer, drawCard, shuffle } from './api.js';
import {
  gameState, STATE_NEWHAND, STATE_PLAYERTURN, STATE_DEALERTURN, STATE_REWARD, STATE_BETTING, STATE_INSURANCE,
  cardsLeft, player, dealer, dealerHasPlayed, BET_AMOUNTS, playerBet, insuranceBet, totalHandBet, playerMoney, currentHandIndex,
  setGameState, setPlayerBet, setCurrentHandIndex, setPlayerMoney, setTotalHandBet, setDealerHasPlayed, setInsuranceBet, newHand,
  setGameWindow, splitHand,
  gameWindow
} from './globals.js';
import { displayStartingHands, displayDealerCards, displayNewDealerCard, displaySplitHands, updateScores } from './ui.js';
import { getButtonBackgroundPosition } from './utils.js';

// Setup div structure and sprites
export async function startGame() {
  getDeck(); // INITIALIZE DECK

  // SETUP UIWINDOW CONTENTS
  $('#uiWindow').empty();
  $('#uiWindow').append(`
    <div id="bet-window">
      <div id="bet_increase"></div>
      <div id="bet_amount"></div>
      <div id="bet_decrease"></div>
      <div id="deal"></div>
    </div>
    <div id="hit-stand-window" class="hidden">
      <div id="hit"></div>
      <div id="stand"></div>
      <div id="splitDouble" class="hidden">
        <div id="split"></div>
        <div id="double"></div>
      </div>
    </div>
    <div id="insurance" class="hidden">
      <div id="ins-yes"></div>
      <div id="ins-no"></div>
    </div>
  `);

  // SET UIWINDOW
  setGameWindow('bet');

  // POPULATE INITIAL HAND CONTENT
  $('#dealerHand').empty();
  $('#dealerHand').append('<div class="no-arrow"></div><div class="dealerScore" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div>');
  $('#playerHand').empty();
  $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div></div>');

  // SET UP BUTTON SPRITE POSITIONS
  $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet${playerBet}`));
  $('#hit').css('background-position', await getButtonBackgroundPosition(`hit`));
  $('#stand').css('background-position', await getButtonBackgroundPosition(`stand`));
  $('#split').css('background-position', await getButtonBackgroundPosition(`splitInactive`));
  $('#double').css('background-position', await getButtonBackgroundPosition(`doubleInactive`));
  $('#ins-yes').css('background-position', await getButtonBackgroundPosition(`yes`));
  $('#ins-no').css('background-position', await getButtonBackgroundPosition(`no`));

  /////////////////////////
  // SETUP BUTTON EVENTS //
  /////////////////////////

  // BET INCREASE BUTTON
  $('#bet_increase').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      if (playerMoney >= BET_AMOUNTS[playerBet + 1] && playerBet < 7) { await setPlayerBet(playerBet + 1); }
      else { await setPlayerBet(1); }
    }
  });
  $('#bet_increase').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#bet_increase').css('background-position', await getButtonBackgroundPosition(`betIncreaseHover`));
      }
    },
    async function () { $('#bet_increase').css('background-position', await getButtonBackgroundPosition(`betIncrease`)); }
  )

  // BET DECREASE BUTTON
  $('#bet_decrease').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      if (playerBet > 1) { await setPlayerBet(playerBet - 1); }
      else { await setPlayerBet(7); }
    }
  });
  $('#bet_decrease').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) { $('#bet_decrease').css('background-position', await getButtonBackgroundPosition(`betDecreaseHover`)); }
    },
    async function () { $('#bet_decrease').css('background-position', await getButtonBackgroundPosition(`betDecrease`)); }
  )

  // DEAL BUTTON
  $('#deal').on('click', function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      $("#handResult").empty();
      if (playerBet > 0) {
        setTotalHandBet(BET_AMOUNTS[playerBet]);
        setPlayerMoney(playerMoney - BET_AMOUNTS[playerBet]);
        setGameState(STATE_NEWHAND);
      } else { $("#handResult").append("Place a bet to start the game."); }
    }
  });
  $('#deal').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#deal').css('background-position', await getButtonBackgroundPosition(`dealHover`));
      }
    },
    async function () { $('#deal').css('background-position', await getButtonBackgroundPosition(`deal`)); }
  )

  // HIT BUTTON
  $('#hit').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      $('#splitDouble').addClass('hidden');
      setGameWindow('hit');
      await drawCard(player, true);
      if (player.hands[currentHandIndex].total > 21) {
        if (player.hands.length > 1 && currentHandIndex < player.hands.length - 1) {
          setCurrentHandIndex(currentHandIndex + 1);
          displaySplitHands();
        } else { setGameState(STATE_REWARD); }
      }
    }
  });
  $('#hit').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#hit').css('background-position', await getButtonBackgroundPosition(`hitHover`));
      }
    },
    async function () { $('#hit').css('background-position', await getButtonBackgroundPosition(`hit`)); }
  )

  // STAND BUTTON
  $('#stand').on('click', function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $('#splitDouble').addClass('hidden');
      setGameWindow('hit');
      $("#uiWindow").addClass('processing');
      if (player.hands.length > 1 && currentHandIndex < player.hands.length - 1) {
        setCurrentHandIndex(currentHandIndex + 1);
        displaySplitHands();
      } else { setGameState(STATE_DEALERTURN); }
    }
  });
  $('#stand').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#stand').css('background-position', await getButtonBackgroundPosition(`standHover`));
      }
    },
    async function () { $('#stand').css('background-position', await getButtonBackgroundPosition(`stand`)); }
  )

  // DOUBLE BUTTON
  $('#double').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      if (playerMoney >= BET_AMOUNTS[playerBet]) {
        setPlayerMoney(playerMoney - BET_AMOUNTS[playerBet]);
        setTotalHandBet(totalHandBet + BET_AMOUNTS[playerBet]);
        await drawCard(player, true);
        if (player.hands[currentHandIndex].total > 21) {
          if (player.hands.length > 1 && currentHandIndex < player.hands.length - 1) {
            setCurrentHandIndex(currentHandIndex + 1);
            displaySplitHands();
          } else { setGameState(STATE_REWARD); }
        } else { setGameState(STATE_DEALERTURN); }
      } else { $("#handResult").append("Not enough money to double down."); }
    }
  });
  $('#double').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        if ($('#double').hasClass('active')) { $('#double').css('background-position', await getButtonBackgroundPosition(`doubleHover`)); }
      }
    },
    async function () {
      if ($('#double').hasClass('active')) { $('#double').css('background-position', await getButtonBackgroundPosition(`double`)); }
    }
  )

  // SPLIT BUTTON
  $('#split').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      if (player.hands[currentHandIndex].hand.length === 2 && player.hands[currentHandIndex].hand[0].charAt(0) === player.hands[currentHandIndex].hand[1].charAt(0) && playerMoney >= BET_AMOUNTS[playerBet]) {
        let doubleAce = player.hands[currentHandIndex].hand[0].charAt(0) === "A" ? true : false;
        $('#double').removeClass('active');
        setTotalHandBet(totalHandBet + BET_AMOUNTS[playerBet]); // Increase total hand bet
        setPlayerMoney(playerMoney - BET_AMOUNTS[playerBet]);
        splitHand(doubleAce);
        updateScores();
        displaySplitHands();
      } else { $("#handResult").append("Cannot split this hand."); }
    }
  });
  $('#split').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        if ($('#split').hasClass('active')) {
          $('#split').css('background-position', await getButtonBackgroundPosition(`splitHover`));
        }
      }
    },
    async function () {
      if ($('#split').hasClass('active')) { $('#split').css('background-position', await getButtonBackgroundPosition(`split`)); }
    }
  )

  // INSURANCE YES BUTTON
  $('#ins-yes').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      if (playerMoney >= BET_AMOUNTS[playerBet] / 2) {
        setPlayerMoney(playerMoney - BET_AMOUNTS[playerBet] / 2);
        setInsuranceBet(BET_AMOUNTS[playerBet] / 2);
        setTotalHandBet(totalHandBet + insuranceBet);
        if (dealer.total === 21) {
          await displayDealerCards();
          $("#handResult").html("DEALER HAD BLACKJACK!");
          setPlayerMoney(playerMoney + insuranceBet * 2);
          setGameState(STATE_BETTING); // Hand over, return to betting state
        } else {
          $("#handResult").html("DEALER DOES NOT HAVE BLACKJACK.");
          setGameState(STATE_PLAYERTURN); // Continue hand >> player's turn
        }
      } else { $("#handResult").html("Not enough money for insurance."); }
    }
  });
  $('#ins-yes').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#ins-yes').css('background-position', await getButtonBackgroundPosition(`yesHover`));
      }
    },
    async function () { $('#ins-yes').css('background-position', await getButtonBackgroundPosition(`yes`)); }
  )

  // INSURANCE NO BUTTON
  $('#ins-no').on('click', async function () {
    if (!$("#uiWindow").hasClass('processing')) {
      $("#uiWindow").addClass('processing');
      if (dealer.total === 21) {
        await displayDealerCards();
        $("#handResult").append("DEALER HAD BLACKJACK!");
        setGameState(STATE_BETTING);
      } else { setGameState(STATE_PLAYERTURN); }
    }
  });
  $('#ins-no').hover(
    async function () {
      if (!$("#uiWindow").hasClass('processing')) {
        $('#ins-no').css('background-position', await getButtonBackgroundPosition(`noHover`));
      }
    },
    async function () { $('#ins-no').css('background-position', await getButtonBackgroundPosition(`no`)); }
  )

  setGameState(STATE_BETTING);
}

// Main game logic controller
export function logic() {
  switch (gameState) {
    case STATE_BETTING:
      logicBetting();
      break;
    case STATE_NEWHAND:
      logicNewHand();
      break;
    case STATE_PLAYERTURN:
      logicPlayerTurn();
      break;
    case STATE_DEALERTURN:
      logicDealerTurn();
      break;
    case STATE_REWARD:
      logicReward();
      break;
    case STATE_INSURANCE:
      logicInsurance();
      break;
  }
}

// Betting logic
function logicBetting() {
  setGameWindow('bet');
}

// Start a new hand
async function logicNewHand() {
  if (cardsLeft <= 60) { await shuffle(); }
  newHand(); //clear hands to reset game

  await drawCard(player);
  await drawCardDealer(dealer);
  await drawCard(player);
  await drawCardDealer(dealer);

  await displayStartingHands();

  if (player.hands[currentHandIndex].total === 21 || (dealerHasPlayed && dealer.total === 21)) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (!dealerHasPlayed) {
      setGameState(STATE_DEALERTURN);
    } else {
      setGameState(STATE_REWARD);
    }
  } else if (dealer.hand[1].charAt(0) === 'A') {
    setGameState(STATE_INSURANCE);
  } else {
    setGameState(STATE_PLAYERTURN);
  }
}

// Handle player's turn
async function logicPlayerTurn() {
  let splitActive = false;
  let doubleActive = false;
  $('#double').removeClass('active');
  $('#split').removeClass('active');

  // Show Double Down button if applicable
  if (
    player.hands.length === 1 // if the hand hasn't been split
    && player.hands[0].hand.length === 2 // and the player only has two cards
    && (player.hands[currentHandIndex].total === 9 || player.hands[currentHandIndex].total === 10 || player.hands[currentHandIndex].total === 11) // and the hand equals 9, 10, or 11
    && playerMoney >= BET_AMOUNTS[playerBet]) { // and the player can afford it 
    doubleActive = true; // then double down is applicable
    $('#double').addClass('active');
  }

  // Show Split button if applicable
  if (
    player.hands[currentHandIndex].hand.length === 2  // if the current hand has two cards
    && player.hands[currentHandIndex].hand[0].charAt(0) === player.hands[currentHandIndex].hand[1].charAt(0) // and both cards match value
    && playerMoney >= BET_AMOUNTS[playerBet]) { // and the player can afford it
    splitActive = true; // then split is applicable
    $('#split').addClass('active');
  }

  if (splitActive || doubleActive) {
    setGameWindow('splitDouble');
    splitActive ? $('#split').css('background-position', await getButtonBackgroundPosition(`split`)) : $('#split').css('background-position', await getButtonBackgroundPosition(`splitInactive`));
    doubleActive ? $('#double').css('background-position', await getButtonBackgroundPosition(`double`)) : $('#double').css('background-position', await getButtonBackgroundPosition(`doubleInactive`));
  } else {
    setGameWindow('hit');
  }
}

// Handle dealer's turn
async function logicDealerTurn() {
  await displayDealerCards();
  while (dealer.total < 17) {
    await drawCardDealer(dealer, true);
    if (dealer.total < 17) { await new Promise(resolve => setTimeout(resolve, 420)) }
  }
  setGameState(STATE_REWARD);
}

export async function logicInsurance() {
  setGameWindow('insurance');
}

export async function logicReward() {
  updateScores();
  let playerResults = [];
  if (!dealerHasPlayed) {
    await displayDealerCards();
  }

  player.hands.forEach((hand, index) => {
    let handLabel = player.hands.length > 1 ? `HAND ${index + 1}: ` : "";

    if (hand.total > 21) {
      playerResults.push(`${handLabel}BUST`);
    } else if (dealer.total > 21 || hand.total > dealer.total) {
      playerResults.push(`${handLabel}WIN!`);
      setPlayerMoney(playerMoney + BET_AMOUNTS[playerBet] * 2);
    } else if (dealer.total > hand.total) {
      playerResults.push(`${handLabel}DEALER WINS`);
    } else {
      playerResults.push(`${handLabel}PUSH`);
      setPlayerMoney(playerMoney + BET_AMOUNTS[playerBet]);
    }
  });

  $("#handResult").html(playerResults.join("<br>"));
  setDealerHasPlayed(false);
  if (playerMoney < BET_AMOUNTS[playerBet]) { await setPlayerBet(playerMoney); }
  setTotalHandBet(0);
  setGameState(STATE_BETTING);
}