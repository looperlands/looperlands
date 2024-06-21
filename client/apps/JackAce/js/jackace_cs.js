// Global Variables
let gameWindow = ""; // Current UI window shown
let playerBet = 1;
let playerMoney = 1000; // Example player money, update accordingly
let playerId = 'player1'; // Example player ID, update accordingly
const BET_AMOUNTS = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 25, 6: 50, 7: 100 };
const cardScale = 10; // Scale of the cards

////////////////////////
// SPRITE SHEET SETUP //
////////////////////////

// CARD SPRITE SHEET
const CARD_WIDTH = 11; // Width of each card in the sprite sheet
const CARD_HEIGHT = 9; // Height of each card in the sprite sheet
const CARD_GAP = 1; // Gap between cards in the sprite sheet
const SPRITE_COLUMNS = 13; // Number of columns in the sprite sheet
const CARD_POSITIONS = {
    'AC': 0, '2C': 1, '3C': 2, '4C': 3, '5C': 4, '6C': 5, '7C': 6, '8C': 7, '9C': 8, '0C': 9, 'JC': 10, 'QC': 11, 'KC': 12,
    'AS': 13, '2S': 14, '3S': 15, '4S': 16, '5S': 17, '6S': 18, '7S': 19, '8S': 20, '9S': 21, '0S': 22, 'JS': 23, 'QS': 24, 'KS': 25,
    'AH': 26, '2H': 27, '3H': 28, '4H': 29, '5H': 30, '6H': 31, '7H': 32, '8H': 33, '9H': 34, '0H': 35, 'JH': 36, 'QH': 37, 'KH': 38,
    'AD': 39, '2D': 40, '3D': 41, '4D': 42, '5D': 43, '6D': 44, '7D': 45, '8D': 46, '9D': 47, '0D': 48, 'JD': 49, 'QD': 50, 'KD': 51,
    'BACK': 52
};

// UI SPRITE SHEET
const UI_SPRITE_HEIGHTS = [23, 38, 37]; // Heights for each row
const UI_SPRITE_GAP = 1; // Gap between rows
const UI_CARD_SCALE = 10; // Scale for UI elements
const UI_SPRITE_POSITIONS = {
    'twoButton': 0,
    'fourButton': 1,
    'insurance': 2
};

// SCORE SPRITE SHEET
const SCORE_SPRITE_WIDTH = 17; // Width of each score sprite
const SCORE_SPRITE_HEIGHT = 13; // Height of each score sprite
const SCORE_SPRITE_GAP = 1; // Gap between score sprites
const SCORE_SPRITE_COLUMNS = 10; // Number of columns in the score sprite sheet
const SCORE_CARD_SCALE = 10; // Scale for score elements
const SCORE_SPRITE_POSITIONS = {
    'blank': 0, 'arrow': 1, 'questionMark': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9,
    '11': 10, '12': 11, '13': 12, '14': 13, '15': 14, '16': 15, '17': 16, '18': 17, '19': 18, '20': 19, '21': 20,
    '22': 21, '23': 22, '24': 23, '25': 24, '26': 25, '27': 26, '28': 27, '29': 28, '30': 29
};

// BUTTON SPRITE SHEET
const BUTTON_SPRITE_WIDTH = 30; // Width of each button sprite
const BUTTON_SPRITE_HEIGHT = 13; // Height of each button sprite
const BUTTON_SPRITE_GAP = 1; // Gap between button sprites
const BUTTON_SPRITE_COLUMNS = 3; // Number of columns in the button sprite sheet
const BUTTON_CARD_SCALE = 10; // Scale for button elements
const BUTTON_SPRITE_POSITIONS = {
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

/////////////////////////
// INITIALIZATION CODE //
/////////////////////////

$(document).ready(function () {
    init();
});

async function init() {
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

    await showGameWindow();
    $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet1`));
    setUpButtonEvents();
}

function setUpButtonEvents() {
    const buttons = [
        { id: '#bet_increase', hoverState: 'betIncreaseHover', defaultState: 'betIncrease', clickFunction: () => betAdjustClick('increase') },
        { id: '#bet_decrease', hoverState: 'betDecreaseHover', defaultState: 'betDecrease', clickFunction: () => betAdjustClick('decrease') },
        { id: '#deal', hoverState: 'dealHover', defaultState: 'deal', clickFunction: () => handleAction(() => actionHandlers['DEAL']()) },
        { id: '#hit', hoverState: 'hitHover', defaultState: 'hit', clickFunction: () => handleAction(() => actionHandlers['HIT']()) },
        { id: '#stand', hoverState: 'standHover', defaultState: 'stand', clickFunction: () => handleAction(() => actionHandlers['STAND']()) },
        { id: '#double', hoverState: 'doubleHover', defaultState: 'double', clickFunction: () => handleAction(() => actionHandlers['DOUBLE']()) },
        { id: '#split', hoverState: 'splitHover', defaultState: 'split', clickFunction: () => handleAction(() => actionHandlers['SPLIT']()) },
        { id: '#ins-yes', hoverState: 'yesHover', defaultState: 'yes', clickFunction: () => handleAction(() => actionHandlers['INSURANCE']('yes')) },
        { id: '#ins-no', hoverState: 'noHover', defaultState: 'no', clickFunction: () => handleAction(() => actionHandlers['INSURANCE']('no')) }
    ];

    buttons.forEach(({ id, hoverState, defaultState, clickFunction }) => {
        $(id).on('click', clickFunction);
        $(id).hover(
            async function () {
                if (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive')) {
                    const position = await getButtonBackgroundPosition(hoverState);
                    $(this).css('background-position', position);
                }
            },
            async function () {
                if (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive')) {
                    const position = await getButtonBackgroundPosition(defaultState);
                    $(this).css('background-position', position);
                }
            }
        );
    });
}

/////////////////////////////
// MAIN GAMEPLAY FUNCTIONS //
/////////////////////////////

const actionHandlers = {
    'DEAL': handleDeal,
    'HIT': async () => processAction('HIT', {}, animateCard),
    'STAND': async () => processAction('STAND', {}, animateDealersTurn),
    'DOUBLE': handleDouble,
    'SPLIT': async () => processAction('SPLIT', {}, async (data) => { await animateSplit(data); }),
    'INSURANCE': async (choice) => processAction('INSURANCE', { boughtInsurance: choice === 'yes' }, async (data) => {
        await processInsurance(data, choice);
    })
};

async function handleAction(action) {
    console.log(`processing action: ${action}`);
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        await action();
        $("#uiWindow").removeClass('processing');
    }
}

async function makeRequest(action, additionalData = {}) {
    console.log(`making request: ${action}`);
    const response = await fetch('/minigame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minigame: 'jackace', player: playerId, action, ...additionalData })
    });
    return response.json();
}

async function processAction(action, additionalData = {}, animationFunction) {
    handleAction(async () => {
        const data = await makeRequest(action, additionalData);
        await animationFunction(data);
    });
}

function handleDeal() {
    handleAction(async () => {
        $("#handResult").empty();
        if (playerBet > 0) {
            const data = await makeRequest('DEAL', { betAmount: playerBet });
            await animateDeal(data);
        } else {
            $("#handResult").append("Place a bet to start the game.");
        }
    });
}

async function handleDouble() {
    if (playerMoney >= playerBet * 2) {
        $('#double').addClass('inactive');
        const data = await makeRequest('DOUBLE');
        await animateCard(data);
        await animateDealersTurn(data);
    } else {
        $("#handResult").append("Not enough money to double down.");
    }
}

async function betAdjustClick(direction) {
    if (!$("#uiWindow").hasClass('processing')) {
        const betAmount = direction === 'increase'
            ? (playerMoney >= BET_AMOUNTS[playerBet + 1] && playerBet < 7 ? playerBet + 1 : 1)
            : (playerBet > 1 ? playerBet - 1 : 7);

        playerBet = betAmount;
        $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet${playerBet}`));
    }
}

/////////////////////////
// ANIMATION FUNCTIONS //
/////////////////////////

async function animateDeal(data) {
    // Adjust player money
    await displayStartingHands(data);
    gsap.fromTo('#playerHand .playingCard', { opacity: 0, y: -50 }, { opacity: 1, y: 0, stagger: 0.2 });
    gsap.fromTo('#dealerHand .playingCard', { opacity: 0, y: -50 }, { opacity: 1, y: 0, stagger: 0.2 });

    setTimeout(() => {
        showGameWindow(data);
    }, 1000);
}

async function animateCard(data) {
    displayNewPlayerCard(data);
    gsap.fromTo(`#hand${data.currentHandIndex + 1} .playingCard:last-child`, { opacity: 0, y: -50 }, { opacity: 1, y: 0 });

    setTimeout(() => {
        showGameWindow(data);
    }, 500);
}

async function animateDealersTurn(data) {
    displayDealerCards(data);
    gsap.fromTo('#dealerHand .playingCard', { opacity: 0, y: -50 }, { opacity: 1, y: 0, stagger: 0.2 });

    for (let i = 2; i < data.dealerHand.length; i++) {
        await new Promise((resolve) => {
            setTimeout(async () => {
                const card = data.dealerHand[i];
                const dealerBackgroundPosition = await getCardBackgroundPosition(card);
                $("#dealerHand").append(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);
                gsap.fromTo(`#dealerHand .playingCard:last-child`, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.5 });
                updateScores(data);
                resolve();
            }, 500); // Adjust the delay as needed
        });
    }

    setTimeout(() => {
        showRewards(data.reward);
    }, 1000);
}

async function animateSplit(data) {
    const splitHandIndex = data.currentHandIndex;
    const originalHand = data.playerHands[splitHandIndex];
    const newHandIndex = data.playerHands.length - 1; // Reference the new hand

    // Create a new hand div for the split hand
    $('#playerHand').append(`<div id="hand${newHandIndex + 1}" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div>`);
    $(`#hand${newHandIndex + 1}`).css({ 'width': 'fit-content', 'padding-top': '4px' });

    // Animate the second card moving to the new hand
    const secondCard = originalHand.hand[1];
    const secondCardPosition = await getCardBackgroundPosition(secondCard);
    let $secondCardElement = $(`#hand${splitHandIndex + 1} .playingCard:last-child`);

    gsap.to($secondCardElement, {
        y: 150,
        duration: 0.5,
        onComplete: async () => {
            $secondCardElement.css('transform', '').css('y', '0'); // Reset transformations
            $(`#hand${newHandIndex + 1}`).append($secondCardElement);
            await drawNewCard(data, splitHandIndex);
            await drawNewCard(data, newHandIndex);
        }
    });

    showGameWindow(data);
}

async function drawNewCard(data, handIndex) {
    const card = data.playerHands[handIndex].hand.slice(-1)[0]; // Get the last card
    const backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${handIndex + 1}`).append($card);
    gsap.fromTo($card, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.5 });
    updateScores(data);
}

/////////////////////////////////
// DISPLAY & UTILITY FUNCTIONS //
/////////////////////////////////

async function displayStartingHands(data) {
    $("#playerHand").empty();
    $("#dealerHand").empty();
    $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div></div>');
    $('#dealerHand').append('<div class="no-arrow"></div>');

    ///////////////////////////////////
    // SET UP AREA FOR DEALER'S HAND //
    ///////////////////////////////////

    // Area for dealer's total hand value
    let dealerScorePosition = await getScoreBackgroundPosition(`questionMark`);
    let $dealerScore = $('<div class="dealerScore"></div>').css('background-position', dealerScorePosition);
    $('#dealerHand').append($dealerScore);

    // Area for dealer's hand
    $('#dealerHand').append('<div class="card-back"></div>');

    let dealerBackgroundPosition = await getCardBackgroundPosition(data.dealerHand.hand[1]);
    $('#dealerHand').append(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);

    ///////////////////////////////////
    // SET UP AREA FOR PLAYER'S HAND //
    ///////////////////////////////////

    // Area for player's hand value
    let playerScorePosition = await getScoreBackgroundPosition(`questionMark`); // Start with ? then update
    let $playerScore = $('<div class="hand-total"></div>').css('background-position', playerScorePosition);
    $(`#hand1`).append($playerScore);

    // Area for player's hand
    for (const card of data.playerHands[0].hand) {
        let backgroundPosition = await getCardBackgroundPosition(card);
        let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
        $(`#hand1`).append($card);
    }
    $("#uiWindow").removeClass('processing');
    await updateScores();
}

async function displayNewPlayerCard(data) {
    const handIndex = data.currentHandIndex;
    const card = data.playerHands[handIndex].hand.slice(-1)[0]; // Get the last card
    $(`#hand${handIndex + 1}`).append(`<div class="playingCard" style="background-position: ${await getCardBackgroundPosition(card)};"></div>`);
}

async function displayDealerCards(data) {
    // Get the background position for the hidden card
    let dealerBackgroundPosition = await getCardBackgroundPosition(data.dealerHand.hand[0]);

    // Replace the first card (face-down) with the actual card
    $('#dealerHand .card-back').first().replaceWith(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);
}

async function displaySplitHands() {
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
}

async function updateScores(dealerOnly = false) {
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

async function showRewards(data) {
    if (data.rewards > 0) {
        // Adjust player money
        $("#handResult").append(`You won ${data.rewards} gold!`);
        gsap.fromTo('#handResult', { scale: 0 }, { scale: 1, duration: 1 });
    }
    setTimeout(() => {
        showGameWindow(data);
    }, 2000);
}

async function showGameWindow(data = {}) {
    const loadWindow = data.gameWindow || 'bet';

    if (gameWindow === loadWindow) {
        $("#uiWindow").removeClass('processing');
        return;
    }

    switch (loadWindow) {
        case 'bet':
            $('#dealerHand').empty();
            $('#dealerHand').append('<div class="no-arrow"></div><div class="dealerScore" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div>');
            $('#playerHand').empty();
            $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div></div>');
            if (gameWindow !== 'splitDouble') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '380px');
                $('#uiWindow').css('align-content', 'center');
            }
            $('#bet-window').removeClass('hidden');
            $('#hit-stand-window').addClass('hidden');
            $('#insurance').addClass('hidden');
            break;
        case 'hit':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('twoButton'));
            $('#uiWindow').css('height', '230px');
            $('#uiWindow').css('align-content', 'center');
            $('#hit-stand-window').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#splitDouble').addClass('hidden');
            $('#insurance').addClass('hidden');
            break;
        case 'splitDouble':
            if (gameWindow !== 'bet') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '380px');
                $('#uiWindow').css('align-content', 'center');
            }
            $('#hit-stand-window').removeClass('hidden');
            $('#splitDouble').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#insurance').addClass('hidden');
            break;
        case 'insurance':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('insurance'));
            $('#uiWindow').css('height', '370px');
            $('#uiWindow').css('align-content', 'end');
            $('#insurance').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#hit-stand-window').addClass('hidden');
            break;
    }
    gameWindow = loadWindow;
    $("#uiWindow").removeClass('processing');
}

//////////////////////////////
// HELPER UTILITY FUNCTIONS //
//////////////////////////////

async function getBackgroundPosition(code, positions, width, height, gap, columns, scale) {
    let position = positions[code];
    let row = Math.floor(position / columns);
    let col = position % columns;
    let x = col * (width + gap) * scale;
    let y = row * (height + gap) * scale;
    return `-${x}px -${y}px`;
}

// Specific functions for each sprite sheet
async function getCardBackgroundPosition(cardCode) {
    return await getBackgroundPosition(cardCode, CARD_POSITIONS, CARD_WIDTH, CARD_HEIGHT, CARD_GAP, SPRITE_COLUMNS, cardScale);
}

async function getUiBackgroundPosition(uiCode) {
    let position = UI_SPRITE_POSITIONS[uiCode];
    let y = 0;
    for (let i = 0; i < position; i++) {
        y += (UI_SPRITE_HEIGHTS[i] + UI_SPRITE_GAP) * UI_CARD_SCALE;
    }
    let x = 0; // Since it's a single column, x will always be 0
    return `-${x}px -${y}px`;
}

async function getScoreBackgroundPosition(scoreCode) {
    return await getBackgroundPosition(scoreCode.toString(), SCORE_SPRITE_POSITIONS, SCORE_SPRITE_WIDTH, SCORE_SPRITE_HEIGHT, SCORE_SPRITE_GAP, SCORE_SPRITE_COLUMNS, SCORE_CARD_SCALE);
}

async function getButtonBackgroundPosition(buttonCode) {
    return await getBackgroundPosition(buttonCode, BUTTON_SPRITE_POSITIONS, BUTTON_SPRITE_WIDTH, BUTTON_SPRITE_HEIGHT, BUTTON_SPRITE_GAP, BUTTON_SPRITE_COLUMNS, BUTTON_CARD_SCALE);
}