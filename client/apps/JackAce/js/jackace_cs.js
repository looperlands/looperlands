

// Global Variables
let gameWindow = ""; // Current UI window shown
let playerBet = 1;
let playerMoney = 0;
let playerId = "";
let processingBypass = false; // used to forceResetHoverState

const GOLD = "21300041";
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

async function init() {
    console.log('Starting JackAce | Getting player balance');
    playerMoney = await getGoldAmount();
    $('#resources-minigame').removeClass('hidden');
    $('#resources-minigame #resource-text').text(playerMoney);
    console.log(`balance: ${playerMoney}`);
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
                <div id="split" class="inactive"></div>
                <div id="double" class="inactive"></div>
            </div>
        </div>
        <div id="insurance" class="hidden">
            <div id="ins-yes"></div>
            <div id="ins-no"></div>
        </div>
    `);

    $('#dealerHand').append('<div class="no-arrow"></div><div class="dealerScore" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div>');
    $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div><div class="hand-total" style="background-position: -360px 0px;"></div><div class="card-back"></div><div class="card-back"></div></div>');
    await showGameWindow();
    $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet1`));
    await setUpButtonEvents();
}

async function setUpButtonEvents() {
    const buttons = [
        { id: '#bet_increase', hoverState: 'betIncreaseHover', defaultState: 'betIncrease', clickFunction: () => betAdjustClick('increase') },
        { id: '#bet_decrease', hoverState: 'betDecreaseHover', defaultState: 'betDecrease', clickFunction: () => betAdjustClick('decrease') },
        { id: '#deal', hoverState: 'dealHover', defaultState: 'deal', clickFunction: () => handleDeal() },
        { id: '#hit', hoverState: 'hitHover', defaultState: 'hit', clickFunction: () => handleHit() },
        { id: '#stand', hoverState: 'standHover', defaultState: 'stand', clickFunction: () => handleStand() },
        { id: '#double', hoverState: 'doubleHover', defaultState: 'double', clickFunction: () => handleDouble() },
        { id: '#split', hoverState: 'splitHover', defaultState: 'split', clickFunction: () => handleSplit() },
        { id: '#ins-yes', hoverState: 'yesHover', defaultState: 'yes', clickFunction: () => handleInsurance(true) },
        { id: '#ins-no', hoverState: 'noHover', defaultState: 'no', clickFunction: () => handleInsurance(false) }
    ];

    for (const { id, hoverState, defaultState, clickFunction } of buttons) {
        $(id).on('click', clickFunction);
        $(id).hover(
            async function () {
                if (processingBypass || (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive'))) {
                    const position = await getButtonBackgroundPosition(hoverState);
                    $(this).css('background-position', position);
                }
            },
            async function () {
                if (processingBypass || (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive'))) {
                    const position = await getButtonBackgroundPosition(defaultState);
                    $(this).css('background-position', position);
                }
            }
        );

        // Initialize button background position
        const position = await getButtonBackgroundPosition(defaultState);
        $(id).css('background-position', position);
    }
}

/////////////////////////////
// MAIN GAMEPLAY FUNCTIONS //
/////////////////////////////

async function makeRequest(action, additionalData = {}) {
    return new Promise((resolve, reject) => {
        console.log('making request: ', action);
        const sessionId = new URLSearchParams(window.location.search).get('sessionId');
        const minigameQuery = `/session/${sessionId}/minigame`;

        axios.post(minigameQuery, {
            minigame: 'jackace',
            player: playerId,
            action,
            ...additionalData
        })
            .then(response => {
                resolve(response.data);
            })
            .catch(async error => {
                const errorResponse = error.response && error.response.data ? error.response.data : null;
                if (errorResponse && errorResponse.message) {
                    // Handling specific error messages from the server
                    switch (errorResponse.message) {
                        case '[DEAL] Invalid action >> hand in progress.':
                        case '[HIT] Invalid action >> no hand in progress.':
                        case '[SPLIT] Invalid action >> Cannot split.':
                        case '[DOUBLE] Invalid action >> Cannot double.':
                        case '[INSURANCE] Invalid action >> Cannot buy insurance.':
                            alert(`Invalid action: ${errorResponse.message}`);
                            await resetGame();
                            break;
                        case 'Not Enough Gold.':
                            alert('You do not have enough gold to place this bet.');
                            $("#uiWindow").removeClass('processing');
                            break;
                        default:
                            alert(`Error: ${errorResponse.message}`);
                            break;
                    }
                } else {
                    alert('An unexpected error occurred. Please try again later.');
                }
                reject(error);
            });
    });
}

async function resetGame() {
    const sessionId = new URLSearchParams(window.location.search).get('sessionId');
    const minigameQuery = `/session/${sessionId}/minigame`;

    try {
        const response = await axios.post(minigameQuery, {
            minigame: 'jackace',
            player: playerId,
            action: 'RESET'
        });
        console.log('Game reset');
        await showGameWindow(response.data);
    } catch (error) {
        console.error('Error resetting the game:', error);
        alert('An error occurred while resetting the game. Please try again.');
    }
}


async function handleDeal() {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        $("#handResult").empty();
        if (playerBet > 0) {
            const data = await makeRequest('DEAL', { playerBet: BET_AMOUNTS[playerBet] });
            await updatePlayerMoney(data);
            console.log('playerHand: ', data.playerHands[0].hand);
            console.log('dealerHand: ', data.dealerHand.hand);
            await animateDeal(data);
        } else {
            $("#handResult").append("Place a bet to start the game.");
        }
        $("#uiWindow").removeClass('processing');
    }
}

async function handleHit() {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('HIT');
        await animateCard(data);
        $("#uiWindow").removeClass('processing');
    }
}

async function handleStand() {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('STAND');
        if (data.dealerHand.total !== 'hidden') {
            await animateDealersTurn(data);
        } else {
            await showGameWindow(data);
        }
        $("#uiWindow").removeClass('processing');
    }
}

async function handleSplit() {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('SPLIT');
        await updatePlayerMoney(data);
        await animateSplit(data);
        $("#uiWindow").removeClass('processing');
    }
}

async function handleInsurance(boughtInsurance) {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('INSURANCE', { boughtInsurance: boughtInsurance });
        if (boughtInsurance) await updatePlayerMoney(data);
        console.log(data);
        if (data.dealerHand.total === 21) {
            console.log('Dealer had blackjack!');
            await animateDealersTurn(data);
        } else {
            await showGameWindow(data);
        }
        $("#uiWindow").removeClass('processing');
    }
}

async function handleDouble() {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        if (playerMoney >= BET_AMOUNTS[playerBet] * 2) {
            $('#double').addClass('inactive');
            const data = await makeRequest('DOUBLE');
            await updatePlayerMoney(data);
            await animateCard(data);
            await animateDealersTurn(data);
        } else {
            $("#handResult").append("Not enough money to double down.");
        }
        $("#uiWindow").removeClass('processing');
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
    await showGameWindow(data);

    // Ensure that the cards are in the DOM
    await new Promise(resolve => setTimeout(resolve, 0));

    // Check if elements are correctly added to the DOM
    const dealerFirstCard = $('#dealerHand .card-back');
    const dealerSecondCard = $('#dealerHand .playingCard');
    const playerCards = $(`#hand1`).find(`.playingCard`);
    const dealerScore = $('#dealerHand .dealerScore');
    const playerScore = $('#hand1 .hand-total');

    gsap.to([dealerScore, playerScore], {
        opacity: 1,
        duration: 0.2,
    });

    if (playerCards.length < 2 || dealerFirstCard.length === 0 || dealerSecondCard.length === 0) {
        console.error('One or more elements are not found in the DOM');
        return;
    }

    const tl = gsap.timeline();

    // Animate player's first card
    tl.fromTo(playerCards[0],
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.2 }
    );

    // Animate dealer's first card
    tl.fromTo(dealerFirstCard,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.2 }
    );

    // Animate player's second card
    tl.fromTo(playerCards[1],
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.2 }
    );

    // Animate dealer's second card (face down)
    tl.fromTo(dealerSecondCard,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.2 }
    );
    await updateScores(data);
}

async function animateCard(data) {
    await displayNewPlayerCard(data);
    await new Promise(resolve => setTimeout(resolve, 0));
    gsap.fromTo(`#hand${data.currentHandIndex + 1} .playingCard:last-child`, { opacity: 0, y: -50 }, { opacity: 1, y: 0 });
    await updateScores(data);
    if (data.dealerHand.total !== 'hidden') {
        await new Promise(resolve => setTimeout(resolve, 200));
        await animateDealersTurn(data)
    } else {
        await showGameWindow(data);
    }
}

function calculateCardValue(currentTotal, aceCount, newCard) {
    let cardValue = newCard.slice(0, -1);

    if (isNaN(cardValue)) {
        if (cardValue === 'A') {
            aceCount++;
            cardValue = 11;
        } else {
            cardValue = 10;
        }
    } else {
        cardValue = parseInt(cardValue, 10);
    }

    currentTotal += cardValue;

    // Adjust for Aces if necessary
    while (currentTotal > 21 && aceCount > 0) {
        currentTotal -= 10;
        aceCount--;
    }

    return { currentTotal, aceCount };
}

async function animateDealersTurn(data) {
    await displayDealerCards(data);
    await gsap.fromTo('#dealerHand .playingCard', { opacity: 0, y: -50 }, { opacity: 1, y: 0, stagger: 0.2 });

    const dealerTotal = data.dealerHand.total;
    const currentDealerCardIndex = 1;

    // Calculate initial partialDealerHand
    let partialDealerHand = 0;
    let aceCount = 0; // Keep track of Aces
    for (let i = 0; i <= currentDealerCardIndex; i++) {
        const card = data.dealerHand.hand[i];
        ({ currentTotal: partialDealerHand, aceCount } = calculateCardValue(partialDealerHand, aceCount, card));
    }

    console.log('Initial Partial Dealer Hand:', partialDealerHand);

    // Update scores with the initial partialDealerHand
    data.dealerHand.total = partialDealerHand;
    await updateScores(data);

    for (let i = 2; i < data.dealerHand.hand.length; i++) {
        await new Promise((resolve) => {
            setTimeout(async () => {
                const card = data.dealerHand.hand[i];
                ({ currentTotal: partialDealerHand, aceCount } = calculateCardValue(partialDealerHand, aceCount, card));

                const dealerBackgroundPosition = await getCardBackgroundPosition(card);
                $("#dealerHand").append(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);
                await gsap.fromTo(`#dealerHand .playingCard:last-child`, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.2 });

                // Update scores with the updated partialDealerHand
                data.dealerHand.total = partialDealerHand;
                await updateScores(data);
                resolve();
            }, 200); // Adjust the delay as needed
        });
    }

    if (data.dealerHand.total !== dealerTotal) {
        data.dealerHand.total = dealerTotal;
        await updateScores(data);
    }
    
    await new Promise(resolve => setTimeout(resolve, 0));
    await showRewards(data);
}

async function animateSplit(data) {
    const splitHandIndex = data.currentHandIndex;
    const originalHand = data.playerHands[splitHandIndex]; // Original hand with matching cards that will be split (Card1, Card2)
    const newHandIndex = data.playerHands.length - 1; // Index for new hand (if we start with one hand, the next hand added will be playerHands[1])

    // Grab the second card in the hand that's being split
    const divToMove = $(`#hand${splitHandIndex + 1} .playingCard:last-child`);
    $(`#hand${splitHandIndex + 1} .no-arrow`).removeClass('no-arrow').addClass('arrow');
    const cardToMove = originalHand.hand[0]; // Card value of card being moved to new hand

    // Create a new div for the new hand
    $('#playerHand').append(`<div id="hand${newHandIndex + 1}" class="playerHands"><div class="no-arrow"></div><div class="hand-total"></div>`);

    // Animate the second card moving to the new hand
    const originalFirstCardLeft = $(`#hand${splitHandIndex + 1}`).find(`.playingCard`).eq(0).offset().left;
    const newHandDiv = $(`#hand${newHandIndex + 1}`);
    const newHandLeft = newHandDiv.offset().left;
    const xOffset = newHandLeft - originalFirstCardLeft;
    const newCardPosition = await getCardBackgroundPosition(cardToMove);

    gsap.to(divToMove, {
        duration: 0.2,
        x: xOffset,
        y: newHandDiv.offset().top - divToMove.offset().top,
        onComplete: async () => {
            divToMove.css('transform', ''); // Reset transformations
            divToMove.css('background-position', newCardPosition);
            newHandDiv.append(divToMove); // Move the card to the new hand div

            // Draw a new card for the original hand
            const originalNewCard = data.playerHands[splitHandIndex].hand.slice(-1)[0];
            const originalNewCardPosition = await getCardBackgroundPosition(originalNewCard);
            const $originalNewCardElement = $('<div class="playingCard"></div>').css('background-position', originalNewCardPosition);
            $(`#hand${splitHandIndex + 1}`).append($originalNewCardElement);

            await gsap.fromTo($originalNewCardElement, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.2 });

            // Draw a new card for the new hand
            const newHandNewCard = data.playerHands[newHandIndex].hand.slice(-1)[0];
            const newHandNewCardPosition = await getCardBackgroundPosition(newHandNewCard);
            const $newHandNewCardElement = $('<div class="playingCard"></div>').css('background-position', newHandNewCardPosition);
            $(`#hand${newHandIndex + 1}`).append($newHandNewCardElement);

            await gsap.fromTo($newHandNewCardElement, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.2 });
            await updateScores(data); // Update the scores after the split animation is complete
        }
    });

    await showGameWindow(data);
}

async function drawNewCard(data, handIndex) {
    const card = data.playerHands[handIndex].hand.slice(-1)[0]; // Get the last card
    const backgroundPosition = await getCardBackgroundPosition(card);
    let $card = $('<div class="playingCard"></div>').css('background-position', backgroundPosition);
    $(`#hand${handIndex + 1}`).append($card);
    await gsap.fromTo($card, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.2 });
    await updateScores(data);
}

/////////////////////////////////
// DISPLAY & UTILITY FUNCTIONS //
/////////////////////////////////

async function clearHands() {
    // Animate fade out
    await new Promise(resolve => {
        gsap.to(['#playerHand', '#dealerHand'], {
            opacity: 0,
            duration: 0.2,
            onComplete: resolve
        });
    });

    // Empty the elements
    $("#playerHand").empty();
    $("#dealerHand").empty();

    // Reset opacity to 1 for future use
    gsap.set(['#playerHand', '#dealerHand'], { opacity: 1 });
}

async function displayStartingHands(data) {
    await clearHands();
    $('#playerHand').append('<div id="hand1" class="playerHands"><div class="no-arrow"></div></div>');
    $('#dealerHand').append('<div class="no-arrow"></div>');

    ///////////////////////////////////
    // SET UP AREA FOR DEALER'S HAND //
    ///////////////////////////////////

    // Area for dealer's total hand value
    let questionScorePosition = await getScoreBackgroundPosition(`questionMark`);
    let $dealerScore = $('<div class="dealerScore"></div>').css('opacity', 0).css('background-position', questionScorePosition);
    $('#dealerHand').append($dealerScore);

    // Area for dealer's hand
    $('#dealerHand').append('<div class="card-back"></div>');
    let dealerBackgroundPosition = await getCardBackgroundPosition(data.dealerHand.hand[1]);
    $('#dealerHand').append(`<div class="playingCard" style="opacity: 0; background-position: ${dealerBackgroundPosition};"></div>`);

    ///////////////////////////////////
    // SET UP AREA FOR PLAYER'S HAND //
    ///////////////////////////////////

    // Area for player's hand value
    let $playerScore = $('<div class="hand-total"></div>').css('opacity', 0).css('background-position', questionScorePosition);
    $(`#hand1`).append($playerScore);

    // Area for player's hand
    for (const card of data.playerHands[0].hand) {
        let backgroundPosition = await getCardBackgroundPosition(card);
        let $card = $('<div class="playingCard"></div>').css('opacity', 0).css('background-position', backgroundPosition);
        $(`#hand1`).append($card);
    }
}

async function displayNewPlayerCard(data) {
    const handIndex = data.currentHandIndex;
    const card = data.playerHands[handIndex].hand.slice(-1)[0]; // Get the last card
    $(`#hand${handIndex + 1}`).append(`<div class="playingCard" style="background-position: ${await getCardBackgroundPosition(card)};"></div>`);
}

async function displayDealerCards(data) {
    // Get the background position for the hidden card
    let dealerBackgroundPosition = await getCardBackgroundPosition(data.dealerHand.hand[0]);

    // Replace the face-down card (second card) with the actual card
    $('#dealerHand .card-back').first().replaceWith(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);
}

async function displaySplitHands(data) {
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
    await updateScores(data);
}

async function updateScores(data) {
    //update players hands
    for (const [index, hand] of data.playerHands.entries()) {
        let backgroundPosition = await getScoreBackgroundPosition(hand.total);
        $(`#hand${index + 1}`).find(`.hand-total`).css('background-position', backgroundPosition);
        if (hand.total >= 21) hand.canHit = false;
    }
    //update dealers hand
    $('.dealerScore').css('background-position', await getScoreBackgroundPosition(`${data.dealerHand.total === 'hidden' ? 'questionMark' : data.dealerHand.total}`));
}

async function showRewards(data) {
    await updatePlayerMoney(data);
    await showGameWindow(data);
}

async function showGameWindow(data = {}) {
    const loadWindow = data.gameWindow || 'bet';
    const currentHandIndex = data.currentHandIndex || 0;

    if (currentHandIndex > 0) {
        await updateArrows(currentHandIndex); // update hand arrows if more than one hand
    }

    console.log('loading window: ', loadWindow);

    const fadeOutElements = [];
    const fadeInElements = [];

    switch (loadWindow) {
        case 'bet':
            if (gameWindow !== 'splitDouble') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '380px');
                $('#uiWindow').css('align-content', 'center');
            }
            fadeOutElements.push('#hit-stand-window', '#insurance');
            fadeInElements.push('#bet-window');
            break;
        case 'hit':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('twoButton'));
            $('#uiWindow').css('height', '230px');
            $('#uiWindow').css('align-content', 'center');
            fadeOutElements.push('#bet-window', '#splitDouble', '#insurance');
            fadeInElements.push('#hit-stand-window');
            break;
        case 'splitDouble':
            if (gameWindow !== 'bet') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '380px');
                $('#uiWindow').css('align-content', 'center');
            }
            fadeOutElements.push('#bet-window', '#insurance');
            fadeInElements.push('#hit-stand-window', '#splitDouble');
            break;
        case 'insurance':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('insurance'));
            $('#uiWindow').css('height', '370px');
            $('#uiWindow').css('align-content', 'end');
            fadeOutElements.push('#bet-window', '#hit-stand-window');
            fadeInElements.push('#insurance');
            break;
    }

    // Create a GSAP timeline
    const tl = gsap.timeline();

    // Fade out the elements that should be hidden
    tl.to(fadeOutElements, { opacity: 0, duration: 0.5, onComplete: () => $(fadeOutElements.join(',')).addClass('hidden') }, 0);

    // Fade in the elements that should be visible
    $(fadeInElements.join(',')).removeClass('hidden');
    tl.fromTo(fadeInElements, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);

    // Wait for the timeline to complete
    await tl;

    if (data.gameWindow) await updateButtonStates(data);
    gameWindow = loadWindow;
}


//////////////////////////////
// HELPER UTILITY FUNCTIONS //
//////////////////////////////

async function updateArrows(currentHandIndex) {
    const previousArrow = $('.playerHands .arrow');
    const newArrow = $(`#hand${currentHandIndex + 1} .no-arrow`);

    // Fade out the previous arrow
    if (previousArrow.length > 0) {
        await new Promise((resolve) => {
            gsap.to(previousArrow, {
                opacity: 0,
                duration: 0.2,
                onComplete: function () {
                    previousArrow.removeClass('arrow').addClass('no-arrow');
                    resolve();
                }
            });
        });
    }

    // Fade in the new arrow
    if (newArrow.length > 0) {
        newArrow.removeClass('no-arrow').addClass('arrow').css('opacity', 0);
        gsap.to(newArrow, {
            opacity: 1,
            duration: 0.2
        });
    }
}

async function updateButtonStates(playerState) {
    await forceHoverStateCheck();

    const { canDouble, playerHands } = playerState;
    const currentHand = playerHands[playerState.currentHandIndex];
    const canSplit = currentHand.canSplit;

    const doubleButtonPosition = await getButtonBackgroundPosition(canDouble ? 'double' : 'doubleInactive');
    const splitButtonPosition = await getButtonBackgroundPosition(canSplit ? 'split' : 'splitInactive');

    $('#double').css('background-position', doubleButtonPosition).toggleClass('inactive', !canDouble);
    $('#split').css('background-position', splitButtonPosition).toggleClass('inactive', !canSplit);
}

async function forceHoverStateCheck() {
    const buttons = [
        '#bet_increase', '#bet_decrease', '#deal', '#hit', '#stand', '#double', '#split', '#ins-yes', '#ins-no'
    ];

    buttons.forEach(id => {
        processingBypass = true;
        $(id).trigger('mouseenter').trigger('mouseleave');
        processingBypass = false;
    });
}

async function updatePlayerMoney(data) {
    const targetMoney = parseInt(data.playerMoney);
    let currentMoney = parseInt(playerMoney);
    console.log(`[updatingPlayerMoney] current: ${currentMoney}, target: ${targetMoney}`);

    // if data.reward > 0, show reward
    let rewardCountdown = data.reward || 0;
    let processingReward = false;

    const rewardTextElementId = 'reward-text';
    if (rewardCountdown > 0) {
        processingReward = true;
        const rewardTextElement = createSvgText(`+${rewardCountdown}`, rewardTextElementId);

        $('#resources-minigame').after(rewardTextElement);

        $(`#${rewardTextElementId}`).css({
            position: 'absolute',
            width: `fit-content`,
            top: '0px',
            right: '10px',
            zIndex: '1',
            'font-size': '42px',
            'font-family': '"Orbitron", "Helvetica Neue", "Futura", "Trebuchet MS", Arial'
        });

        await gsap.to(`#${rewardTextElementId}`, {
            top: '60px',
            duration: 0.5
        }).then(() => new Promise(resolve => setTimeout(resolve, 500)));
    }

    // Calculate total steps and delay time per step
    const totalSteps = Math.abs(targetMoney - currentMoney);
    const defaultStepDelay = 30; // Default step delay in milliseconds
    const maxDuration = 1000; // Maximum duration in milliseconds
    let stepDelay = defaultStepDelay;

    // Adjust stepDelay if total duration exceeds maxDuration
    if (totalSteps * defaultStepDelay > maxDuration) {
        stepDelay = maxDuration / totalSteps;
    }

    while (currentMoney !== targetMoney) {
        if (currentMoney < targetMoney) {
            currentMoney++;
        } else if (currentMoney > targetMoney) {
            currentMoney--;
        }

        playerMoney = currentMoney;
        $('#resources-minigame #resource-text').text(playerMoney);

        if (rewardCountdown > 0) {
            rewardCountdown--;
            // animate reward if applicable
            $(`#${rewardTextElementId} text`).text(`+${rewardCountdown}`);
        }

        await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    if (processingReward) {
        gsap.to(`#${rewardTextElementId}`, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => $(`#${rewardTextElementId}`).remove()
        });
    }
}



// Function to create SVG text element with gradient
function createSvgText(textContent, id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('id', id); // Assign id to the svg element

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = createLinearGradient();
    defs.appendChild(linearGradient);
    svg.appendChild(defs);

    const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svgText.setAttribute('class', 'rewardText');
    svgText.setAttribute('x', '50%');
    svgText.setAttribute('y', '50%');
    svgText.setAttribute('text-anchor', 'middle');
    svgText.textContent = textContent;

    // Apply additional styles directly to the <text> element
    svgText.style.fill = 'url(#fill-gradient)';
    svgText.style.stroke = 'rgba(255, 255, 255, 0.5)';
    svgText.style.strokeWidth = '0.5px';
    svgText.style.filter = 'drop-shadow(0 0 0.1vh #FFF) drop-shadow(0 0 0.3vh #F0F)';

    svg.appendChild(svgText);

    return svg;
}

// Create linear gradient for Payout Table Headers
function createLinearGradient() {
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', 'fill-gradient');
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '0%');
    linearGradient.setAttribute('y2', '100%');
    linearGradient.setAttribute('spreadMethod', 'pad');

    const stops = [
        { offset: '0%', color: '#000' },
        { offset: '5%', color: '#707' },
        { offset: '20%', color: '#F0F' },
        { offset: '60%', color: '#0FF' },
        { offset: '64%', color: '#FFF' },
        { offset: '68%', color: '#0FF' },
        { offset: '78%', color: '#F0F' },
        { offset: '100%', color: '#F0F' }
    ];

    stops.forEach(stop => {
        const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stopElement.setAttribute('offset', stop.offset);
        stopElement.setAttribute('stop-color', stop.color);
        stopElement.setAttribute('stop-opacity', '1');
        linearGradient.appendChild(stopElement);
    });

    return linearGradient;
}

// Look up player's gold balance
async function getGoldAmount() {
    return new Promise((resolve, reject) => {
        const sessionId = new URLSearchParams(window.location.search).get('sessionId');
        const inventoryQuery = `/session/${sessionId}/inventory`;
        axios.get(inventoryQuery).then(response => {
            resolve(response.data.resources[GOLD] || 0);
        }).catch(error => {
            reject(error);
        });
    });
}

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