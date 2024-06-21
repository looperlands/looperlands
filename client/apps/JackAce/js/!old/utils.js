import { CARD_POSITIONS, CARD_WIDTH, CARD_HEIGHT, CARD_GAP, SPRITE_COLUMNS, cardScale,
  UI_SPRITE_POSITIONS, UI_SPRITE_HEIGHTS, UI_SPRITE_GAP, UI_CARD_SCALE,
  SCORE_SPRITE_POSITIONS, SCORE_SPRITE_WIDTH, SCORE_SPRITE_HEIGHT, SCORE_SPRITE_GAP, SCORE_SPRITE_COLUMNS, SCORE_CARD_SCALE,
  BUTTON_SPRITE_POSITIONS, BUTTON_SPRITE_WIDTH, BUTTON_SPRITE_HEIGHT, BUTTON_SPRITE_GAP, BUTTON_SPRITE_COLUMNS, BUTTON_CARD_SCALE,
  player, currentHandIndex,
  dealerHasPlayed
} from './!old/globals.js';

export async function updateTotal(person, cardValue) {
  if (person == player) {
    if (['KING', 'QUEEN', 'JACK'].includes(cardValue)) {
      person.hands[currentHandIndex].total += 10;
    } else if (cardValue === 'ACE') {
      person.hands[currentHandIndex].total += 11;
      person.hands[currentHandIndex].aceIs11 += 1;
    } else {
      person.hands[currentHandIndex].total += parseInt(cardValue);
    }
    if (person.hands[currentHandIndex].total > 21 && person.hands[currentHandIndex].aceIs11 > 0) {
      person.hands[currentHandIndex].total -= 10;
      person.hands[currentHandIndex].aceIs11 -= 1;
    }
  } else {
    if (['KING', 'QUEEN', 'JACK'].includes(cardValue)) {
      person.total += 10;
    } else if (cardValue === 'ACE') {
      person.total += 11;
      person.aceIs11 += 1;
    } else {
      person.total += parseInt(cardValue);
    }
    if (person.total > 21 && person.aceIs11 > 0) {
      person.total -= 10;
      person.aceIs11 -= 1;
    }
  }
}

// Generic function to calculate background position
async function getBackgroundPosition(code, positions, width, height, gap, columns, scale) {
  let position = positions[code];
  let row = Math.floor(position / columns);
  let col = position % columns;
  let x = col * (width + gap) * scale;
  let y = row * (height + gap) * scale;
  return `-${x}px -${y}px`;
}

// Specific functions for each sprite sheet
export async function getCardBackgroundPosition(cardCode) {
  return await getBackgroundPosition(cardCode, CARD_POSITIONS, CARD_WIDTH, CARD_HEIGHT, CARD_GAP, SPRITE_COLUMNS, cardScale);
}

export async function getUiBackgroundPosition(uiCode) {
  let position = UI_SPRITE_POSITIONS[uiCode];
  let y = 0;
  for (let i = 0; i < position; i++) {
    y += (UI_SPRITE_HEIGHTS[i] + UI_SPRITE_GAP) * UI_CARD_SCALE;
  }
  let x = 0; // Since it's a single column, x will always be 0
  return `-${x}px -${y}px`;
}

export async function getScoreBackgroundPosition(scoreCode) {
  return await getBackgroundPosition(scoreCode.toString(), SCORE_SPRITE_POSITIONS, SCORE_SPRITE_WIDTH, SCORE_SPRITE_HEIGHT, SCORE_SPRITE_GAP, SCORE_SPRITE_COLUMNS, SCORE_CARD_SCALE);
}

export async function getButtonBackgroundPosition(buttonCode) {
  return await getBackgroundPosition(buttonCode, BUTTON_SPRITE_POSITIONS, BUTTON_SPRITE_WIDTH, BUTTON_SPRITE_HEIGHT, BUTTON_SPRITE_GAP, BUTTON_SPRITE_COLUMNS, BUTTON_CARD_SCALE);
}