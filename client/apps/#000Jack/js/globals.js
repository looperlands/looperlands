import { getUiBackgroundPosition, getButtonBackgroundPosition, getCardBackgroundPosition } from './utils.js';
import { logic } from './game.js';
import { drawCard } from './api.js';
import { updateScores } from './ui.js';

/////////////////
// GAME STATES //
/////////////////
export const STATE_NEWHAND = 0;
export const STATE_PLAYERTURN = 1;
export const STATE_DEALERTURN = 2;
export const STATE_REWARD = 3;
export const STATE_BETTING = 4;
export const STATE_SPLIT = 5;
export const STATE_INSURANCE = 6;

///////////////////
// GAME SETTINGS //
///////////////////
export const BET_AMOUNTS = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 25, 6: 50, 7: 100 };
export const cardScale = 10; // Scale of the cards
export let gameState = STATE_BETTING; // Current state of the game
export let gameWindow = ""; // Current UI window shown
export let deckId = ""; // ID of the current deck
export const deck_count = 6; // Number of decks used
export let dealerHasPlayed = false; // Flag to check if dealer has played
export let cardsLeft = deck_count * 52; // Number of cards left in the deck
export let playerBet = 1; // Player's current bet
export let totalHandBet = 0; // Total bet across all hands
export let playerMoney = 1000; // Player's total money
export let insuranceBet = 0; // Insurance bet
export let currentHandIndex = 0; // Index of the current hand being played
export let player = { hands: [{ hand: [], total: 0, aceIs11: 0 }] }; // Player object to hold hands and totals
export let dealer = { hand: [], total: 0, aceIs11: 0 }; // Dealer object to hold hands and totals

////////////////////////
// SPRITE SHEET SETUP //
////////////////////////

// CARD SPRITE SHEET
export const CARD_WIDTH = 11; // Width of each card in the sprite sheet
export const CARD_HEIGHT = 9; // Height of each card in the sprite sheet
export const CARD_GAP = 1; // Gap between cards in the sprite sheet
export const SPRITE_COLUMNS = 13; // Number of columns in the sprite sheet
export const CARD_POSITIONS = {
  'AC': 0, '2C': 1, '3C': 2, '4C': 3, '5C': 4, '6C': 5, '7C': 6, '8C': 7, '9C': 8, '0C': 9, 'JC': 10, 'QC': 11, 'KC': 12,
  'AS': 13, '2S': 14, '3S': 15, '4S': 16, '5S': 17, '6S': 18, '7S': 19, '8S': 20, '9S': 21, '0S': 22, 'JS': 23, 'QS': 24, 'KS': 25,
  'AH': 26, '2H': 27, '3H': 28, '4H': 29, '5H': 30, '6H': 31, '7H': 32, '8H': 33, '9H': 34, '0H': 35, 'JH': 36, 'QH': 37, 'KH': 38,
  'AD': 39, '2D': 40, '3D': 41, '4D': 42, '5D': 43, '6D': 44, '7D': 45, '8D': 46, '9D': 47, '0D': 48, 'JD': 49, 'QD': 50, 'KD': 51,
  'BACK': 52
};

// UI SPRITE SHEET
//export const UI_SPRITE_WIDTH = 72; ==> not needed since we use the full width
export const UI_SPRITE_HEIGHTS = [23, 38, 37]; // Heights for each row
export const UI_SPRITE_GAP = 1; // Gap between rows
//export const UI_SPRITE_COLUMNS = 1; ==> not needed since only 1 column
export const UI_CARD_SCALE = 10; // Scale for UI elements
export const UI_SPRITE_POSITIONS = {
  'twoButton': 0,
  'fourButton': 1,
  'insurance': 2
};

// SCORE SPRITE SHEET
export const SCORE_SPRITE_WIDTH = 17; // Width of each score sprite
export const SCORE_SPRITE_HEIGHT = 13; // Height of each score sprite
export const SCORE_SPRITE_GAP = 1; // Gap between score sprites
export const SCORE_SPRITE_COLUMNS = 10; // Number of columns in the score sprite sheet
export const SCORE_CARD_SCALE = 10; // Scale for score elements
export const SCORE_SPRITE_POSITIONS = {
  'blank': 0, 'arrow': 1, 'questionMark': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9,
  '11': 10, '12': 11, '13': 12, '14': 13, '15': 14, '16': 15, '17': 16, '18': 17, '19': 18, '20': 19, '21': 20,
  '22': 21, '23': 22, '24': 23, '25': 24, '26': 25, '27': 26, '28': 27, '29': 28, '30': 29
};

// BUTTON SPRITE SHEET
export const BUTTON_SPRITE_WIDTH = 30; // Width of each button sprite
export const BUTTON_SPRITE_HEIGHT = 13; // Height of each button sprite
export const BUTTON_SPRITE_GAP = 1; // Gap between button sprites
export const BUTTON_SPRITE_COLUMNS = 3; // Number of columns in the button sprite sheet
export const BUTTON_CARD_SCALE = 10; // Scale for button elements
export const BUTTON_SPRITE_POSITIONS = {
  'dealHover': 0, 'deal': 1, 'bet1': 2,
  'betIncreaseHover': 3, 'betIncrease': 4, 'bet2': 5,
  'betDecreaseHover': 6, 'betDecrease': 7, 'bet3': 8,
  'hitHover': 9, 'hit': 10, 'bet4': 11,
  'standHover': 12, 'stand': 13, 'bet5': 14,
  'yesHover': 15, 'yes': 16, 'bet6': 17,
  'noHover': 18, 'no': 19, 'bet7': 20,
  'splitHover': 21, 'split': 22, 'splitInactive': 23,
  'doubleHover': 24, 'double': 25, 'doubleInactive': 26
};

/////////////////////////////////////////////
// SETTER FUNCTIONS FOR REASSIGNING VALUES //
/////////////////////////////////////////////

export function setGameState(value) {
  gameState = value;
  logic();
}

export async function setGameWindow(value) {
  if (gameWindow === value) return; // If the same window is requested, do nothing

  switch (value) {
    case 'bet':
      if (gameWindow != 'splitDouble') {
        $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
        $('#uiWindow').css('height', '380px');
        $('#uiWindow').css('align-content', 'center');
      }
      $('#bet-window').removeClass('hidden');     //show bet buttons
      $('#hit-stand-window').addClass('hidden');  //hide hit buttons
      $('#insurance').addClass('hidden');         //hide insurance buttons
      break;

    case 'hit':
      $('#uiWindow').css('background-position', await getUiBackgroundPosition('twoButton'));
      $('#uiWindow').css('height', '230px');
      $('#uiWindow').css('align-content', 'center');
      $('#hit-stand-window').removeClass('hidden'); //show hit buttons
      $('#bet-window').addClass('hidden');          //hide bet buttons
      $('#splitDouble').addClass('hidden');         //hide split & double buttons
      $('#insurance').addClass('hidden');           //hide insurance buttons
      break;

    case 'splitDouble':
      if (gameWindow != 'bet') {
        $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
        $('#uiWindow').css('height', '380px');
        $('#uiWindow').css('align-content', 'center');
      }
      $('#hit-stand-window').removeClass('hidden'); //show hit buttons
      $('#splitDouble').removeClass('hidden');     //show split & double buttons
      $('#bet-window').addClass('hidden');          //hide bet buttons
      $('#insurance').addClass('hidden');           //hide insurance buttons
      break;

    case 'insurance':
      $('#uiWindow').css('background-position', await getUiBackgroundPosition('insurance'));
      $('#uiWindow').css('height', '370px');
      $('#uiWindow').css('align-content', 'end');
      $('#insurance').removeClass('hidden');        //show insurance buttons
      $('#bet-window').addClass('hidden');          //hide bet buttons
      $('#hit-stand-window').addClass('hidden');    //hide hit buttons
      break;
  }
  gameWindow = value;
  $("#uiWindow").removeClass('processing');
}

export async function setDeckId(value) { deckId = value; }
export function setDealerHasPlayed(value) { dealerHasPlayed = value; }
export function setCardsLeft(value) { cardsLeft = value; }

export async function setPlayerBet(value) {
  if (gameState == STATE_BETTING) {
    playerBet = value;
    $('#currentBet').text(`Current Bet: $${BET_AMOUNTS[playerBet]}`);
    $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet${playerBet}`));
  }
}

export function setTotalHandBet(value) {
  totalHandBet = value;
  if (totalHandBet > 0) {
    $('#totalHandBet').text(`Total Hand Bet: $${totalHandBet}`);
  } else {
    $('#totalHandBet').text('');
  }
}

export function setPlayerMoney(value) {
  playerMoney = value;
  $('#playerMoney').text(`Player Money: $${playerMoney}`);
}

export function setInsuranceBet(value) { insuranceBet = value; }
export function setCurrentHandIndex(value) { currentHandIndex = value; }

export function newHand() {
  $('#dealerHand').empty();
  $('#dealerHand').append('<div class="no-arrow"></div><div class="dealerScore" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div>');
  $('#playerHand').empty();
  $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div></div>');
  player = { hands: [{ hand: [], total: 0, aceIs11: 0 }] }; // Player object
  dealer = { hand: [], total: 0, aceIs11: 0 }; // Dealer object
  currentHandIndex = 0;
}

export async function splitHand(doubleAce) {
  // Clear and set up the current hand div
  $(`#hand${currentHandIndex + 1}`).empty();
  $(`#hand${currentHandIndex + 1}`).append(`<div class="arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div></div>`);
  $(`#hand${currentHandIndex + 1}`).css({ 'width': 'fit-content', 'padding-top': '4px' });

  // Add a new hand div
  $('#playerHand').append(`<div id="hand${player.hands.length + 1}" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div>`);
  $(`#hand${player.hands.length + 1}`).css({ 'width': 'fit-content', 'padding-top': '4px' });

  // Split the current hand
  let splitHandIndex = currentHandIndex; //store the current hand index
  let tempHand = player.hands[currentHandIndex];
  let halfTotal = doubleAce ? 11 : tempHand.total / 2;

  player.hands[currentHandIndex] = { hand: [tempHand.hand[0]], total: halfTotal, aceIs11: tempHand.aceIs11 / 2 };
  await drawCard(player);

  // Update the current hand display
  for (const card of player.hands[currentHandIndex].hand) {
    let backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${currentHandIndex + 1}`).append($card);
  }

  // Add new hand to player.hands and set currentHandIndex to that hand (will be added to end, so use length)
  player.hands.push({ hand: [tempHand.hand[1]], total: halfTotal, aceIs11: tempHand.aceIs11 / 2 });
  currentHandIndex = player.hands.length - 1;
  await drawCard(player);

  // Update the new hand display
  for (const card of player.hands[currentHandIndex].hand) {
    let backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${currentHandIndex + 1}`).append($card);
  }

  await updateScores();
  currentHandIndex = splitHandIndex; // Reset the hand index
  tempHand = []; //clear temp variable
}