import {
  player, dealer, gameState, currentHandIndex,
  STATE_DEALERTURN, STATE_REWARD, setDealerHasPlayed,
  dealerHasPlayed
} from './globals.js';

import { getCardBackgroundPosition, getScoreBackgroundPosition } from './utils.js';
import { logic } from './jackace.js';

// Display the starting hands of the player and dealer
export async function displayStartingHands() {
  $('#dealerHand').empty();
  $('#playerHand').empty();
  $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div></div>');
  $('#dealerHand').append('<div class="no-arrow"></div>');

  ///////////////////////////////////
  // SET UP AREA FOR DEALER'S HAND //
  ///////////////////////////////////

  // area for dealer's total hand value
  let dealerScorePosition = await getScoreBackgroundPosition(`questionMark`);
  let $dealerScore = $('<div class="dealerScore"></div>').css('background-position', dealerScorePosition);
  $('#dealerHand').append($dealerScore);

  // area for dealer's hand
  $('#dealerHand').append('<div class="card-back"></div>');
  //await new Promise(resolve => setTimeout(resolve, 1000))
  let dealerBackgroundPosition = await getCardBackgroundPosition(dealer.hand[1]);
  $('#dealerHand').append(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);
  //await new Promise(resolve => setTimeout(resolve, 1000))


  ///////////////////////////////////
  // SET UP AREA FOR PLAYER'S HAND //
  ///////////////////////////////////

  // area for player's hand value
  let playerScorePosition = await getScoreBackgroundPosition(`questionMark`); // start with ? then update
  let $playerScore = $('<div class="hand-total"></div>').css('background-position', playerScorePosition);
  $(`#hand${currentHandIndex + 1}`).append($playerScore);

  // area for player's hand
  for (const card of player.hands[currentHandIndex].hand) {
    let backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${currentHandIndex + 1}`).append($card);
    //await new Promise(resolve => setTimeout(resolve, 1000))
  };
  $("#uiWindow").removeClass('processing');
  await updateScores();
}

// Display all dealer's cards
export async function displayDealerCards() {
  setDealerHasPlayed(true);
  let backgroundPosition = await getCardBackgroundPosition(dealer.hand[0]);
  $('.card-back').first().replaceWith(`<div class="playingCard" style="background-position: ${backgroundPosition};"></div>`);
  await updateScores();
  await new Promise(resolve => setTimeout(resolve, 250));
}

export async function displayNewDealerCard() {
  let card = dealer.hand[dealer.hand.length - 1];
  let backgroundPosition = await getCardBackgroundPosition(card);
  let $card = $(`<div class="playingCard" style="background-position: ${backgroundPosition};"></div>`);
  $('#dealerHand').append($card);
  await updateScores();
}

export async function displayNewPlayerCard() {
  let card = player.hands[currentHandIndex].hand[player.hands[currentHandIndex].hand.length - 1];
  let backgroundPosition = await getCardBackgroundPosition(card);
  let $card = $(`<div class="playingCard" style="background-position: ${backgroundPosition};"></div>`);
  $(`#hand${currentHandIndex + 1}`).append($card);
  await updateScores();
}

export async function displaySplitHands() {
  player.hands.forEach((hand, index) => {
    const handId = `hand${index + 1}`;
    const handDiv = $(`#${handId}`);

    // Update the arrow or no-arrow class
    if (index === currentHandIndex) {
      handDiv.find('.no-arrow').removeClass('no-arrow').addClass('arrow');
    } else {
      handDiv.find('.arrow').removeClass('arrow').addClass('no-arrow');
    }

  });
  await updateScores();
  logic();
}

export async function updateScores(dealerOnly = false) {
  if (!dealerOnly) {
    for (const [index, hand] of player.hands.entries()) {
      let backgroundPosition = await getScoreBackgroundPosition(hand.total);
      $(`#hand${index + 1}`).find(`.hand-total`).css('background-position', backgroundPosition);
    }
    let playerScores = player.hands.map((hand, index) => `HAND ${index + 1}: ${hand.total}`).join("<br>");
    $('#playerTotal').html(playerScores);
  }
  if (dealerHasPlayed) {
    $('.dealerScore').css('background-position', await getScoreBackgroundPosition(`${gameState === STATE_DEALERTURN || gameState === STATE_REWARD || dealer.total === 21 ? dealer.total : 'questionMark'}`));
    $('#dealerTotal').text(`Dealer Total: ${gameState === STATE_DEALERTURN || gameState === STATE_REWARD ? dealer.total : '?'}`);
  }
}

export function newHand() {
  $('#dealerHand').empty();
  $('#dealerHand').append('<div class="no-arrow"></div><div class="dealerScore" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div>');
  $('#playerHand').empty();
  $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div></div>');
}

export async function splitHand() {
  // Clear and set up the current hand div
  $(`#hand${currentHandIndex + 1}`).empty();
  $(`#hand${currentHandIndex + 1}`).append(`<div class="arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div></div>`);
  $(`#hand${currentHandIndex + 1}`).css({ 'width': 'fit-content', 'padding-top': '4px' });

  // Add a new hand div
  $('#playerHand').append(`<div id="hand${player.hands.length + 1}" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div>`);
  $(`#hand${player.hands.length + 1}`).css({ 'width': 'fit-content', 'padding-top': '4px' });

  // Update the current hand display
  for (const card of player.hands[currentHandIndex].hand) {
    let backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${currentHandIndex + 1}`).append($card);
  }

  // Add new hand to player.hands and set currentHandIndex to that hand (will be added to end, so use length)
  currentHandIndex = player.hands.length - 1;
  
  // Update the new hand display
  for (const card of player.hands[currentHandIndex].hand) {
    let backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${currentHandIndex + 1}`).append($card);
  }

  currentHandIndex = splitHandIndex; // Reset the hand index
}