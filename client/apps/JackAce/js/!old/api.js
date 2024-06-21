import { deckId, setDeckId, deck_count, setCardsLeft, currentHandIndex} from './globals.js';
import { updateTotal } from './utils.js';
import { displayNewPlayerCard, displayNewDealerCard } from './ui.js';

export async function getDeck() {
  try {
    console.log('Setting up Deck...');
    const data = await $.getJSON(`http://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${deck_count}`);
      await setDeckId(data.deck_id);
  } catch (error) {
    console.error("Error initializing deck:", error);
  }
}

export async function shuffle() {
  try {
    const data = await $.getJSON(`http://deckofcardsapi.com/api/deck/${deckId}/shuffle/`);
    if (!data.shuffled) {
      shuffle();
    }
  } catch (error) {
    console.error("Error shuffling deck:", error);
  }
}

export async function drawCardDealer(dealer, displayCard = false) {
  try {
    const data = await $.getJSON(`http://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`);
    const card = data.cards[0];
    dealer.hand.push(card.code);
    updateTotal(dealer, card.value);
    setCardsLeft(data.remaining);
    if(displayCard){
      await displayNewDealerCard();
    }
  } catch (error) {
    console.error("Error drawing card:", error);
  }
}

export async function drawCard(player, displayCard = false) {
  try {
    const data = await $.getJSON(`http://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`);
    const card = data.cards[0];
    player.hands[currentHandIndex].hand.push(card.code);
    updateTotal(player, card.value);
    setCardsLeft(data.remaining);
    if(displayCard){
      await displayNewPlayerCard();
    }
  } catch (error) {
    console.error("Error drawing card:", error);
  }
}