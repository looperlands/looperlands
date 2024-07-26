/*
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                                                ║
║                                 __     ______     ______     __  __     ______     ______     ______                                           ║
║                                /\ \   /\  __ \   /\  ___\   /\ \/ /    /\  __ \   /\  ___\   /\  ___\                                          ║
║                               _\_\ \  \ \  __ \  \ \ \____  \ \  _"-.  \ \  __ \  \ \ \____  \ \  __\                                          ║
║                              /\_____\  \ \_\ \_\  \ \_____\  \ \_\ \_\  \ \_\ \_\  \ \_____\  \ \_____\                                        ║
║                              \/_____/   \/_/\/_/   \/_____/   \/_/\/_/   \/_/\/_/   \/_____/   \/_____/                                        ║
║                                                                                                   by bitcorn                                   ║
║                                                                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
THE ORIGINAL CODE LINKED BELOW WAS PUT INTO BLENDER ON HIGH WHICH WAS THEN PUT INTO AN INCINERATOR. AFTER THE DUST SETTLED AND NEARLY ALL THE CODE
WAS REPLACED, WE FIND OURSELVES STARING AT A CAT EATING PIZZA FLYING IN A WHIRLWIND ON A FRIDAY NIGHT. IT TOOK MORE TURNS THAN A FERRET IN A
FUNHOUSE AND A HEAVY DOSE OF BONKIN', YANKIN' AND CRANKIN', BUT... IZ READY.

[ORIGINAL CODE]
https://github.com/nhedeker/blackjack/tree/master

Copyright (c) 2014-2016 Materialize [MIT License]
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    - The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

CASINO AMBIENCE [License: Attribution NonCommercial 4.0]
nona.aaa -- https://freesound.org/s/654362 
YeshniGounden -- https://freesound.org/s/654199

ART >> by bitcorn (2024)
*/

const isLIVE = true;

const sounds = {
    soundSprite: new Howl({
        src: ['./apps/JackAce/audio/JackAce.mp3'],
        sprite: {
            shuffle: [0, 2500],             // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            dealCard1: [3000, 500],         // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            dealCard2: [3500, 500],         // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            dealCard3: [4000, 700],         // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            dealCard4: [4700, 550],         // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            singleCard: [6000, 500],        // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0    
            flipCard: [7000, 500],          // Cards Sounds by uEffects -- https://freesound.org/s/208790 -- License: Creative Commons 0
            noMonies: [8000, 250],
            win: [8500, 2000],              // Jingle_Win_Synth_05.wav by LittleRobotSoundFactory -- https://freesound.org/s/274182 -- License: Attribution 4.0
            cardSlide: [11000, 500],        // by bitcorn (2024)
            jackace1: [11500, 1750],        // by bitcorn (2024)
            jackace2: [13250, 2500],        // by bitcorn (2024)
            jackace3: [15750, 1750],        // by bitcorn (2024)
            dealerIsJackAce: [17500, 2250], // by bitcorn (2024)
            doubleDown: [19750, 1500],      // by bitcorn (2024)
            split: [21250, 1500],           // by bitcorn (2024)
            winner: [22750, 1750],          // by bitcorn (2024)
            youWin: [24500, 1750],          // by bitcorn (2024)
            youLose: [26250, 2000],         // by bitcorn (2024)
            busted: [28250, 1500],          // by bitcorn (2024)
            push: [29750, 2000],            // by bitcorn (2024)
            click: [32000, 100]
        }
    }),
    casinoAmbiance: new Howl({
        src: ['./apps/JackAce/audio/casino_ambiance.mp3'],
        loop: true
    })
};

const cardSounds = ['dealCard1', 'dealCard2', 'dealCard3', 'dealCard4', 'singleCard', 'cardSlide'];
const jackaceSounds = ['jackace1', 'jackace2', 'jackace3'];
const winSounds = ['winner', 'youWin'];

function getSpriteDuration(key) {
    if (sounds.soundSprite._sprite[key]) {
        return sounds.soundSprite._sprite[key][1] / 1000;
    }
    return 0;
}

// Function to play a sound sprite with specified volume
function playSound(sprite, volume = 1) {
    const soundId = sounds.soundSprite.play(sprite);
    sounds.soundSprite.volume(volume, soundId);
}

function startUpJackAce() {
    setPlayerMoney();
    gsap.to(`#jackaceGame`, { opacity: 1, duration: 0.5 });
    if (!sounds.casinoAmbiance.playing()) {
        sounds.casinoAmbiance.volume(0.5); // Set volume to 50%
        sounds.casinoAmbiance.play();
    }
    launchJackAce();
};

async function stopJackAce() {
    sounds.casinoAmbiance.stop();
    await resetGame(true);
    $('#bet-window').addClass('hidden');

};

async function setPlayerMoney(setup = true) {
    playerMoney = await getGoldAmount();
    if (setup) {
        $('#resources-minigame').removeClass('hidden');
        gsap.to('#resources-minigame', { opacity: 1, duration: 0.5 });
        $('#resources-minigame').addClass('JackAce');
    }
    $('#resources-minigame #resource-text').text(playerMoney);
}

//////////////////////
// Global Variables //
//////////////////////

let gameWindow = ""; // Current UI window shown
let playerBet = 1;
let playerMoney = 0;
let playerId = "";
let processingBypass = false; // used to forceResetHoverState
let hideArrowsNoDim = false;
let isUpdatingPlayerMoney = false; // Flag to track if the function is running
let generateParticles = false;
let particleAnimationPromises = [];

const GOLD = "21300041";
const BET_AMOUNTS = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 25, 6: 50, 7: 100 };
const OVERALL_SCALE = 5;

////////////////////////
// SPRITE SHEET SETUP //
////////////////////////
// RESULT SPRITE SHEET
const RESULT_WIDTH = 48; // Width of each card in the sprite sheet
const RESULT_HEIGHT = 13; // Height of each card in the sprite sheet
const RESULT_GAP = 1; // Gap between cards in the sprite sheet
const RESULT_SCALE = OVERALL_SCALE; // Scale of the cards
const RESULT_POSITIONS = {
    'busted': 0,
    'youlose': 1,
    'push': 2,
    'winner': 3,
    'jackace': 4
};

// CARD SPRITE SHEET
const CARD_WIDTH = 11; // Width of each card in the sprite sheet
const CARD_HEIGHT = 9; // Height of each card in the sprite sheet
const CARD_GAP = 1; // Gap between cards in the sprite sheet
const CARD_SCALE = OVERALL_SCALE; // Scale of the cards
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
const UI_CARD_SCALE = OVERALL_SCALE; // Scale for UI elements
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
const SCORE_CARD_SCALE = OVERALL_SCALE; // Scale for score elements
const SCORE_SPRITE_POSITIONS = {
    'dealerborder': 0, 'arrow': 1, 'questionMark': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9,
    '11': 10, '12': 11, '13': 12, '14': 13, '15': 14, '16': 15, '17': 16, '18': 17, '19': 18, '20': 19, '21': 20,
    '22': 21, '23': 22, '24': 23, '25': 24, '26': 25, '27': 26, '28': 27, '29': 28, '30': 29
};

// BUTTON SPRITE SHEET
const BUTTON_SPRITE_WIDTH = 30; // Width of each button sprite
const BUTTON_SPRITE_HEIGHT = 13; // Height of each button sprite
const BUTTON_SPRITE_GAP = 1; // Gap between button sprites
const BUTTON_SPRITE_COLUMNS = 3; // Number of columns in the button sprite sheet
const BUTTON_CARD_SCALE = OVERALL_SCALE; // Scale for button elements
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
    try {

        // Ensure initial opacity is 0 for these elements
        $('#jackaceGame, #dealerHand, #playerHand, #uiWindow').css('opacity', '0');

        setupJackAceMenu();
        setupHelpPanel();

        $('#uiWindow').empty();
        $('#uiWindow').append(`
        <div id="bet-window" class="hidden">
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

        $('#dealerHand').append(
            '<div class="arrow"></div>' +
            '<div class="dealerScore dealerScoreOverlay" style="background-position: -180px 0px;"></div>' +
            '<div class="card-back"></div>' +
            '<div class="card-back"></div>');

        $('#playerHand').append(
            '<div id="hand1" class="playerHands">' +
            '<div class="arrow"></div>' +
            '<div class="hand-total" style="background-position: -180px 0px;"></div>' +
            '<div class="card-back"></div>' +
            '<div class="card-back"></div>' +
            '</div>');
        await setUpButtonEvents();
        window.addEventListener('resize', adjustJackaceGameScale);
        launchJackAce();
    } catch (error) {
        console.error('Error starting JackAce:', error);
    }
}

async function launchJackAce() {
    await adjustJackaceGameScale();
    await showGameWindow(null, 'splashScreen');
    if (!isLIVE) {
        alert('JackAce is currently being worked on. Please try again.');
        $('#mgClose')[0].click();
    }
}

// Function to get the scale value from the transform property
function getScale(element) {
    const transform = window.getComputedStyle(element).transform;
    if (transform === 'none') return 1;

    const matrix = transform.match(/^matrix\((.+)\)$/);
    if (matrix) {
        const values = matrix[1].split(', ');
        return parseFloat(values[0]); // Extract the scale value
    }

    return 1;
}

// Function to set the scale of #jackaceGame based on #container's scale
async function adjustJackaceGameScale() {
    const container = document.querySelector('#container');
    const jackaceGame = document.querySelector('#jackaceGame');
    const containerScale = getScale(container);

    // Apply the new scale to #jackaceGame
    jackaceGame.style.transform = `scale(${containerScale})`;
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

    // Initialize betAmount background position
    $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet1`));

    for (const { id, hoverState, defaultState, clickFunction } of buttons) {
        $(id).on('click', () => {
            playSound('click');
            clickFunction();
        });
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

    // Register additional events
    //$(document).on('fadeIn_JackAce', () => fadeInSetupJackAce());
    $(`#minigameMenu`).on('click', '#mgJackAceHelp', () => showHelpPanel());
    $(`#minigameMenu`).on('click', '#mgClose', () => stopJackAce());
}

// Add help to minigame menu if it doesn't exist
function setupJackAceMenu() {
    if ($('#minigameMenu-content').find('#mgJackAceHelp.JackAce').length === 0) {
        $('#minigameMenu-content').prepend('<a href="#" id="mgJackAceHelp" class="JackAce">🃏 How To Play</a>');
    } else {
        $('#minigameMenu-content').find('.JackAce').show();
    }
}

function setupHelpPanel() {
    if (!$('#jackaceHelp').length) {
        $('#JackAce').append(`
            <div id="jackaceHelp">
                <div id="jackaceHelpClose" class="material-icons" >close</div>
                <div id="jackaceHelpContent">
                    <h2>How to Play JackAce</h2>
                    <p>JackAce is a blackjack card game where players aim to get as close to 21 as possible without exceeding it. This game uses six decks of cards, reshuffled when fewer than 60 cards remain. Each card has a point value: number cards are worth their face value, face cards (King, Queen, Jack) are worth 10, and Aces can be worth either 1 or 11. The goal is to beat the dealer by having a hand value closer to 21 without going over.</p>
                    <h3>BASIC RULES</h3>
                    <ul>
                        <li>Each player receives two cards face up.</li>
                        <li>The dealer gets two cards: one face up and one face down.</li>
                        <li>Players can "hit" (take another card) or "stand" (keep their current hand).</li>
                        <li>If a player's hand exceeds 21, they "bust" and lose the game.</li>
                        <li>After the player has finished their turn, the dealer reveals their face-down card and must hit until reaching 17 or higher.</li>
                        <li>The dealer must hit on a soft 17 (a hand containing an Ace valued as 11).</li>
                        <li>If the dealer busts, the player wins.</li>
                        <li>If the dealer does not bust, the closest hand to 21 wins.</li>
                        <li>JackAce (an Ace and a 10-point card) pays 3:2 unless it's a split hand which pays 1:1.</li>
                        <li>A winning hand that is not a blackjack pays 1:1.</li>
                    </ul>
                    <h3>DOUBLE</h3>
                    <p>After being dealt the initial two cards, players have the option to "double down". This means doubling the bet and receiving only one additional card. Doubling is offered when the player's initial hand value is 9, 10, or 11. However, if the hand is an Ace and a 10 (which can be counted as 11), doubling is not allowed since it is already a blackjack.</p>
                    <h3>SPLIT</h3>
                    <p>If a player is dealt two cards of the same rank, they can choose to "split" them into two separate hands. Each hand gets an additional card, and the player plays each hand independently. A player can split up to a total of four hands if the cards allow. The cost to split is equal to the player's initial bet for each new hand created.</p>
                    <h3>INSURANCE</h3>
                    <p>If the dealer's face-up card is an Ace, players are offered "insurance" before the dealer checks the face-down card. Insurance is a side bet that the dealer has a blackjack and costs half of the player's initial bet. If the dealer has blackjack, the insurance bet pays 2:1 and the hand is over. If the dealer does not have blackjack, the player loses the insurance bet and the hand continues.</p>
                </div>
            </div>
        `);

        $('#jackaceHelpClose').on('click', function () {
            gsap.to('#jackaceHelp', { opacity: 0, duration: 0.5, onComplete: () => $('#jackaceHelp').hide() });
        });
    }
}

// Function to show the help panel
function showHelpPanel() {
    setupHelpPanel(); // run setup just to make sure it's there (if it is, it'll skip the run.)
    $('#jackaceHelp').show();
    gsap.to('#jackaceHelp', { opacity: 1, duration: 0.5 });
}

/////////////////////////////
// MAIN GAMEPLAY FUNCTIONS //
/////////////////////////////

async function makeRequest(action, additionalData = {}) {
    return new Promise((resolve, reject) => {
        const sessionId = new URLSearchParams(window.location.search).get('sessionId');
        const minigameQuery = `/session/${sessionId}/minigame`;

        axios.post(minigameQuery, {
            minigame: 'jackace',
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
                            console.log(`Invalid action: ${errorResponse.message}`);
                            $("#uiWindow").removeClass('processing');
                            await animateText(errorResponse.message);
                            await resetGame();  // need to make sure we don't kill a game in progress without returning $$
                            break;
                        case 'Not Enough Gold.':
                            console.log('You do not have enough gold to place this bet.');
                            await setPlayerMoney(false);
                            await flashCredits();
                            $("#uiWindow").removeClass('processing');
                            break;
                        case `Early Access Limited to bits x bit holders.`:
                            $("#uiWindow").removeClass('processing');
                            console.log('access limited to holders: ', errorResponse.message);
                            await animateText(errorResponse.message);
                            $('#mgClose')[0].click();
                            break;
                        default:
                            console.log('somethings borked: ', errorResponse.message);
                            alert(`${errorResponse.message}`);
                            $('#mgClose')[0].click();
                            break;
                    }
                } else {
                    alert('An unexpected error occurred. Please try again later.');
                    console.log(error);
                    $('#mgClose')[0].click();
                }
                reject(error);
            });
    });
}

async function resetGame(hideUIWindow = false) {

    // send RESET command to server to reset game state
    const sessionId = new URLSearchParams(window.location.search).get('sessionId');
    const minigameQuery = `/session/${sessionId}/minigame`;
    try {
        const response = await axios.post(minigameQuery, {
            minigame: 'jackace',
            action: 'RESET'
        });
        console.log('[GAME RESET]');
    } catch (error) {
        console.error('Error resetting the game:', error);
        alert('An error occurred while resetting the game. Please try again.');
    }


    if (hideUIWindow) {
        // if reset on close, handle close of UI window
        await gsap.to(`#jackaceGame`, { opacity: 0, duration: 0.5 });
        $('#jackaceGame, #dealerHand, #playerHand, #uiWindow').css('opacity', '0');
        hideArrowsNoDim = false;
        $('#bet-window').addClass('hidden');
        $('#hit-stand-window').addClass('hidden');
        $('#insurance').addClass('hidden');

        $('#resources-minigame').addClass('hidden');
    } else {
        // if standard reset, load bet window
        await showGameWindow(null, 'bet');
    }

    $("#uiWindow").removeClass('processing');

}


async function handleDeal() {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        if (playerBet > 0 && playerMoney >= BET_AMOUNTS[playerBet]) {
            $("#uiWindow").addClass('processing');
            const data = await makeRequest('DEAL', { playerBet: BET_AMOUNTS[playerBet] });
            isUpdatingPlayerMoney ? await updatePlayerMoney(data, -data.playerBet) : updatePlayerMoney(data, -data.playerBet);
            await animateDeal(data);
            if (data.dealerHand.total !== 'hidden') {
                await new Promise(resolve => setTimeout(resolve, 200));
                await animateDealersTurn(data);
                await showRewards(data);
            } else {
                await showGameWindow(data);
            }
            $("#uiWindow").removeClass('processing');
        } else {
            await flashCredits();
        }
    }
}

async function handleHit() {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('HIT');
        await animateCard(data);
        $("#uiWindow").removeClass('processing');
    }
}

async function handleStand() {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('STAND');
        if (data.dealerHand.total !== 'hidden') {
            await animateDealersTurn(data);
            await showRewards(data);
        } else {
            await showGameWindow(data);
        }
        $("#uiWindow").removeClass('processing');
    }
}

async function handleSplit() {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        if (playerBet > 0 && playerMoney >= BET_AMOUNTS[playerBet]) {
            $("#uiWindow").addClass('processing');
            const data = await makeRequest('SPLIT');
            playSound('split');
            await animateSplit(data);
            $("#uiWindow").removeClass('processing');
        } else {
            await flashCredits();
        }
    }
}

async function handleInsurance(boughtInsurance) {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        $("#uiWindow").addClass('processing');
        const data = await makeRequest('INSURANCE', { boughtInsurance: boughtInsurance });

        if (boughtInsurance) {
            if (playerBet > 0 && playerMoney >= parseInt(BET_AMOUNTS[playerBet] / 2)) {
                isUpdatingPlayerMoney ? await updatePlayerMoney(data, parseInt(-data.playerBet / 2)) : updatePlayerMoney(data, parseInt(-data.playerBet / 2));
            } else {
                await flashCredits();
                await handleInsurance(false);
            }
        }

        if (data.dealerHand.total === 21) {
            await animateDealersTurn(data);
            await showRewards(data);
        } else {
            await showGameWindow(data);
        }

        $("#uiWindow").removeClass('processing');
    }
}

async function handleDouble() {
    if (!$("#uiWindow").hasClass('processing') && isLIVE) {
        if (playerBet > 0 && playerMoney >= BET_AMOUNTS[playerBet]) {
            $("#uiWindow").addClass('processing');
            $('#double').addClass('inactive');
            const data = await makeRequest('DOUBLE');
            isUpdatingPlayerMoney ? await updatePlayerMoney(data, -data.playerBet) : updatePlayerMoney(data, -data.playerBet);
            playSound('doubleDown');
            await animateCard(data);
            $("#uiWindow").removeClass('processing');
        } else {
            await flashCredits();
        }

    }
}

async function betAdjustClick(direction) {
    if (!$("#uiWindow").hasClass('processing')) {
        let betAmount;
        if (direction === 'increase') {
            betAmount = playerMoney >= BET_AMOUNTS[playerBet + 1] && playerBet < 7 ? playerBet + 1 : 1;
        } else {
            if (playerBet > 1) {
                betAmount = playerBet - 1;
            } else {
                // Find the highest bet amount that satisfies playerMoney >= BET_AMOUNTS[adjusted playerBet]
                betAmount = 7; // Start from the highest possible bet
                while (betAmount > 1 && playerMoney < BET_AMOUNTS[betAmount]) {
                    betAmount--;
                }
            }
        }

        playerBet = betAmount;
        $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet${playerBet}`));
    }
}

/////////////////////////
// ANIMATION FUNCTIONS //
/////////////////////////

async function animateDeal(data) {
    let firstDeal = true;

    // Collect all cards present
    let playerHandCards = $('#playerHand .card-back, #playerHand .playingCard');
    let dealerHandCards = $('#dealerHand .card-back, #dealerHand .playingCard');

    // check if all are card-back
    const allPlayerCardsAreBack = playerHandCards.length > 0 && playerHandCards.toArray().every(card => $(card).hasClass('card-back'));
    const allDealerCardsAreBack = dealerHandCards.length > 0 && dealerHandCards.toArray().every(card => $(card).hasClass('card-back'));

    if (!allPlayerCardsAreBack && !allDealerCardsAreBack) {
        // If all are not card-back, clear and setup new hand
        firstDeal = false;

        await displayStartingHands(data);

        // Reset collection of all cards present
        playerHandCards = $('#playerHand .card-back, #playerHand .playingCard');
        dealerHandCards = $('#dealerHand .card-back, #dealerHand .playingCard');
    }

    // Ensure that the cards are in the DOM
    await new Promise(resolve => setTimeout(resolve, 0));

    if (playerHandCards.length < 2 || dealerHandCards.length < 2) {
        console.error('One or more elements are not found in the DOM');
        return;
    }

    const dealerScore = $('#dealerHand .dealerScore');
    const playerScore = $('#hand1 .hand-total');

    // Check opacity before animating
    if (dealerScore.css('opacity') != 1 || playerScore.css('opacity') != 1) {
        gsap.to([dealerScore, playerScore], {
            opacity: 1,
            duration: 0.2,
        });
    }

    // Determine elements based on their state
    let dealerFirstCard, dealerSecondCard, playerFirstCard, playerSecondCard;
    if (allPlayerCardsAreBack && allDealerCardsAreBack) {
        dealerFirstCard = $('#dealerHand .card-back').eq(0);
        dealerSecondCard = $('#dealerHand .card-back').eq(1);
        playerFirstCard = $(`#hand1 .card-back`).eq(0);
        playerSecondCard = $(`#hand1 .card-back`).eq(1);
    } else {
        dealerFirstCard = $('#dealerHand .card-back').eq(0);
        dealerSecondCard = $('#dealerHand .playingCard').eq(0);
        playerFirstCard = $(`#hand1 .playingCard`).eq(0);
        playerSecondCard = $(`#hand1 .playingCard`).eq(1);
    }

    const tl = gsap.timeline();
    let delay = 0;

    // Animate the cards in the correct order
    const playerFirstCardPosition = await getCardBackgroundPosition(data.playerHands[0].hand[0]);
    const playerSecondCardPosition = await getCardBackgroundPosition(data.playerHands[0].hand[1]);
    const dealerSecondCardPosition = await getCardBackgroundPosition(data.dealerHand.hand[1]);


    // Animate player's first card
    delay = await cardAnimation(playerFirstCard, playerFirstCardPosition, tl, delay, 'dealCard1');

    // Animate dealer's first card (face down)
    if (!firstDeal) {
        delay = await cardAnimation(dealerFirstCard, null, tl, delay, 'dealCard2', true);
    }

    // Animate player's second card
    delay = await cardAnimation(playerSecondCard, playerSecondCardPosition, tl, delay, 'dealCard3');

    // Animate dealer's second card
    delay = await cardAnimation(dealerSecondCard, dealerSecondCardPosition, tl, delay, 'dealCard4');

    await tl.play();

    // Update hand totals
    await updateScores(data);
}

async function cardAnimation(card, cardPosition, timeline = gsap.timeline(), delay = 0, soundKey = null, dealCardBack = false) {
    if ($(card).hasClass('card-back') && dealCardBack === false) {
        //animate flip
        timeline.to(card, {
            duration: 0.2,
            rotationY: -90,
            delay: delay,
            onStart: () => {
                if (soundKey) { playSound(soundKey); }
            },
            onComplete: () => {
                $(card).removeClass('card-back').addClass('playingCard');
                $(card).css('background-position', cardPosition);
            }
        }).set(card, {
            rotationY: 90
        }).to(card, {
            duration: 0.2,
            rotationY: 0
        });
    } else {
        //animate slide
        timeline.fromTo(card, {
            opacity: 0,
            y: -50
        }, {
            opacity: 1,
            y: 0,
            duration: 0.2,
            delay: delay,
            onStart: () => {
                if (soundKey) { playSound(soundKey); }
            }
        });
    }

    let soundDuration = 0;
    if (soundKey) { soundDuration = getSpriteDuration(soundKey); }
    delay = Math.max(0.2, soundDuration);

    return delay;
}


async function animateCard(data) {
    await displayNewPlayerCard(data);
    await new Promise(resolve => setTimeout(resolve, 0));
    const handToProcess = data.processPriorHand ? data.currentHandIndex : data.currentHandIndex + 1;
    const randomCardSound = cardSounds[Math.floor(Math.random() * cardSounds.length)];
    const gsapDuration = Math.max(getSpriteDuration(randomCardSound), 0.2);

    await gsap.fromTo(`#hand${handToProcess} .playingCard:last-child`, { opacity: 0, y: -50 }, {
        opacity: 1,
        y: 0,
        duration: gsapDuration,
        onStart: () => {
            playSound(randomCardSound);
        }
    });

    await updateScores(data);
    if (data.dealerHand.total !== 'hidden') {
        await new Promise(resolve => setTimeout(resolve, 200));
        await animateDealersTurn(data);
        await showRewards(data);
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
    if (data.playerHands.length > 1) {
        hideArrowsNoDim = true;
        await updateCurrentHand(null);
    }

    // Get the background position for the hidden card and animate flip
    const dealerFirstCard = $('#dealerHand .card-back').first();
    if (dealerFirstCard.length) {
        const dealerFirstCardPosition = await getCardBackgroundPosition(data.dealerHand.hand[0]);
        await cardAnimation(dealerFirstCard, dealerFirstCardPosition, gsap.timeline(), 0, "flipCard");
    } else {
        console.error('Dealer first card not found.');
        return;
    }

    const dealerTotal = data.dealerHand.total;
    const currentDealerCardIndex = 1;

    // Calculate initial partialDealerHand
    let partialDealerHand = 0;
    let aceCount = 0; // Keep track of Aces
    for (let i = 0; i <= currentDealerCardIndex; i++) {
        const card = data.dealerHand.hand[i];
        ({ currentTotal: partialDealerHand, aceCount } = calculateCardValue(partialDealerHand, aceCount, card));
    }

    // Update scores with the initial partialDealerHand
    data.dealerHand.total = partialDealerHand;
    await updateScores(data, false);

    for (let i = 2; i < data.dealerHand.hand.length; i++) {
        let randomCardSound = cardSounds[Math.floor(Math.random() * cardSounds.length)];
        let gsapDuration = Math.max(getSpriteDuration(randomCardSound), 0.2);

        const card = data.dealerHand.hand[i];
        ({ currentTotal: partialDealerHand, aceCount } = calculateCardValue(partialDealerHand, aceCount, card));

        const dealerBackgroundPosition = await getCardBackgroundPosition(card);
        $("#dealerHand").append(`<div class="playingCard" style="background-position: ${dealerBackgroundPosition};"></div>`);

        await gsap.fromTo(`#dealerHand .playingCard:last-child`, { opacity: 0, y: -50 }, {
            opacity: 1,
            y: 0,
            duration: gsapDuration,
            onStart: () => {
                playSound(randomCardSound);
            }
        });

        // Update scores with the updated partialDealerHand
        data.dealerHand.total = partialDealerHand;
        await updateScores(data, false);

        // Delay between card animations
        await new Promise(resolve => setTimeout(resolve, 200)); // Adjust the delay as needed
    }

    if (data.dealerHand.total !== dealerTotal) {
        data.dealerHand.total = dealerTotal;
        await updateScores(data, false);
    }

}

async function animateSplit(data) {

    if (isUpdatingPlayerMoney) {
        await updatePlayerMoney(data, -data.playerBet)
    } else {
        updatePlayerMoney(data, -data.playerBet);
    }

    const originalHandIndex = data.processPriorHand ? data.currentHandIndex - 1 : data.currentHandIndex;
    const newHandIndex = data.playerHands.length - 1; // Index for new hand (if we start with one hand, the next hand added will be playerHands[1])

    const firstCard = $(`#hand${originalHandIndex + 1} .playingCard:first`);

    // Check if firstCard exists
    if (firstCard.length === 0) {
        console.error(`Element firstCard not found: #hand${originalHandIndex + 1} .playingCard:first`);
        return;
    }

    const divToMove = $(`#hand${originalHandIndex + 1} .playingCard:last-child`);

    // Check if divToMove exists
    if (divToMove.length === 0) {
        console.error(`Element divToMove not found: #hand${originalHandIndex + 1} .playingCard:last-child`);
        return;
    }

    const newHandDiv = await createNewHandDiv(newHandIndex);
    if (!newHandDiv) return;

    const arrowElement = $(`#hand${originalHandIndex + 1} .arrow`);
    arrowElement.css('opacity', 0);
    await fadeInNewHandAndArrow(newHandDiv, arrowElement);
    await moveCardToNewHand(divToMove, firstCard, newHandDiv, data, originalHandIndex);
    await drawNewCards(data, originalHandIndex, newHandIndex);
    await dimNewHand(newHandIndex);
    await updateScores(data);
    await showGameWindow(data);
}

async function createNewHandDiv(newHandIndex) {
    const newHandDivHtml = `<div id="hand${newHandIndex + 1}" class="playerHands" style="opacity: 0;"><div class="arrow"></div><div class="hand-total"></div></div>`;
    $('#playerHand').append(newHandDivHtml);
    const newHandDiv = $(`#hand${newHandIndex + 1}`);
    if (newHandDiv.length === 0) {
        console.error(`New hand div not created: #hand${newHandIndex + 1}`);
        return null;
    }
    return newHandDiv;
}

async function fadeInNewHandAndArrow(newHandDiv, arrowElement) {
    const tl = gsap.timeline();
    tl.to(newHandDiv, { duration: 0.2, opacity: 1 }, 0)
        .to(arrowElement, { duration: 0.2, opacity: 1 }, 0);
    await tl.play();
}

async function moveCardToNewHand(divToMove, firstCard, newHandDiv, data, originalHandIndex) {
    let gsapDuration = Math.max(getSpriteDuration('dealCard4'), 0.2);
    const newCardPosition = await getCardBackgroundPosition(data.playerHands[originalHandIndex].hand[0]);
    const newHandOffsetTop = newHandDiv.offset().top;
    const divToMoveOffsetTop = divToMove.offset().top;
    const leftOfFirstCard = firstCard.offset().left;
    const divToMoveOffsetLeft = divToMove.offset().left;

    await gsap.to(divToMove, {
        duration: gsapDuration,
        x: leftOfFirstCard - divToMoveOffsetLeft,
        y: newHandOffsetTop - divToMoveOffsetTop,
        onStart: () => {
            playSound('dealCard4');
        },
        onComplete: () => {
            divToMove.css('transform', '');
            divToMove.css('background-position', newCardPosition);
            newHandDiv.append(divToMove);
        }
    });
}

async function drawNewCards(data, originalHandIndex, newHandIndex) {
    await drawNewCardForHand(originalHandIndex, data.playerHands[originalHandIndex].hand.slice(-1)[0]);
    await drawNewCardForHand(newHandIndex, data.playerHands[newHandIndex].hand.slice(-1)[0]);
}

async function drawNewCardForHand(handIndex, card) {
    const randomCardSound = cardSounds[Math.floor(Math.random() * cardSounds.length)];
    let gsapDuration = Math.max(getSpriteDuration(randomCardSound), 0.2);
    const cardPosition = await getCardBackgroundPosition(card);
    const $newCardElement = $('<div class="playingCard"></div>').css('background-position', cardPosition);
    $(`#hand${handIndex + 1}`).append($newCardElement);
    await gsap.fromTo($newCardElement, { opacity: 0, y: -50 }, {
        opacity: 1,
        y: 0,
        duration: gsapDuration,
        onStart: () => {
            playSound(randomCardSound);
        }
    });
}

async function dimNewHand(newHandIndex) {
    await gsap.to(`#hand${newHandIndex + 1}`, {
        duration: 0.5,
        filter: 'brightness(0.5)',
        onComplete: () => $(`#hand${newHandIndex + 1}`).addClass('notCurrentHand')
    });
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
    $('#playerHand').append('<div id="hand1" class="playerHands"><div class="arrow"></div></div>');
    $('#dealerHand').append('<div class="arrow"></div>');

    ///////////////////////////////////
    // SET UP AREA FOR DEALER'S HAND //
    ///////////////////////////////////

    // Area for dealer's total hand value
    let questionScorePosition = await getScoreBackgroundPosition(`questionMark`);
    let $dealerScore = $('<div class="dealerScore dealerScoreOverlay"></div>').css('opacity', 0).css('background-position', questionScorePosition);
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
    const handIndex = data.processPriorHand ? data.currentHandIndex - 1 : data.currentHandIndex;
    const card = data.playerHands[Math.max(0, handIndex)].hand.slice(-1)[0]; // Get the last card
    $(`#hand${handIndex + 1}`).append(`<div class="playingCard" style="background-position: ${await getCardBackgroundPosition(card)};"></div>`);
}

async function displaySplitHands(data) {
    const timeline = gsap.timeline();

    player.hands.forEach((hand, index) => {
        const handId = `hand${index + 1}`;
        const handDiv = $(`#${handId}`);
        const arrowElement = handDiv.find('.arrow');

        if (arrowElement.length > 0) {
            const currentOpacity = parseFloat(arrowElement.css('opacity'));

            if (index === currentHandIndex && currentOpacity !== 1) {
                // Fade in the arrow element if it's not already visible
                timeline.to(arrowElement, { opacity: 1, duration: 0.2 }, 0);
            } else if (index !== currentHandIndex && currentOpacity !== 0) {
                // Fade out the arrow element if it's not already hidden
                timeline.to(arrowElement, { opacity: 0, duration: 0.2 }, 0);
            }
        }
    });

    await timeline.play();
    await updateScores(data);
}

async function updateScores(data, updatePlayer = true) {

    //update players hands
    if (updatePlayer) {
        let results = [];
        for (const [index, hand] of data.playerHands.entries()) {
            let backgroundPosition = await getScoreBackgroundPosition(hand.total);

            $(`#hand${index + 1}`).find(`.hand-total`).css('background-position', backgroundPosition);
            if (hand.total >= 21) {
                hand.canHit = false;
                if (hand.total > 21) {
                    results[index] = 'busted';
                } else {
                    results[index] = '';
                }
            } else {
                results[index] = '';
            }
        }
        // Check if there are any non-empty results before calling animateResult
        if (results.some(result => result !== '')) {
            await animateResult(results);
        }
    }

    // Update dealer's hand
    if (!updatePlayer) {
        const dealerScoreElement = $('.dealerScore');
        const backgroundPosition = await getScoreBackgroundPosition(data.dealerHand.total === 'hidden' ? 'questionMark' : data.dealerHand.total);

        if (data.dealerHand.total >= 21) {
            dealerScoreElement.css('background-position', backgroundPosition).removeClass('dealerScoreOverlay');
        } else {
            dealerScoreElement.css('background-position', backgroundPosition).addClass('dealerScoreOverlay');
        }
    }
}

async function showRewards(data) {
    await determineResults(data);
    await updatePlayerMoney(data, null, true); //use await here to make sure everything catches up at end of hand
    await showGameWindow(data);
}

async function showGameWindow(data = {}, callWindow = null) {
    if ($('#resources-minigame').hasClass('hidden')) {
        playerMoney = await getGoldAmount();
        $('#resources-minigame').removeClass('hidden');
        $('#resources-minigame #resource-text').text(playerMoney);
    }

    let loadWindow = callWindow ?? data?.gameWindow ?? 'bet';
    const currentHandIndex = data?.currentHandIndex ?? 0;

    if (currentHandIndex > 0) {
        await updateCurrentHand(currentHandIndex); // update hand arrows if more than one hand
    }

    if (data?.gameWindow) await updateButtonStates(data);

    if (loadWindow === 'splitDouble') {
        if (playerMoney < BET_AMOUNTS[playerBet]) {
            loadWindow = 'hit';
        }
    }

    switch (loadWindow) {
        case 'bet':
        case 'splashScreen':
            if (loadWindow == 'splashScreen') {
                $('#splashScreen').css('display', 'block');
                await gsap.to(['#splashScreen'], { opacity: 1, duration: 0.5 });
            }
            if (gameWindow !== 'splitDouble') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '190px');
                $('#uiWindow').css('align-content', 'center');
            }
            hideArrowsNoDim = false;
            $('#bet-window').removeClass('hidden');
            $('#hit-stand-window').addClass('hidden');
            $('#insurance').addClass('hidden');
            break;
        case 'hit':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('twoButton'));
            $('#uiWindow').css('height', '115px');
            $('#uiWindow').css('align-content', 'center');
            $('#hit-stand-window').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#splitDouble').addClass('hidden');
            $('#insurance').addClass('hidden');

            break;
        case 'splitDouble':
            if (gameWindow !== 'bet') {
                $('#uiWindow').css('background-position', await getUiBackgroundPosition('fourButton'));
                $('#uiWindow').css('height', '190px');
                $('#uiWindow').css('align-content', 'center');
            }
            $('#hit-stand-window').removeClass('hidden');
            $('#splitDouble').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#insurance').addClass('hidden');
            break;
        case 'insurance':
            $('#uiWindow').css('background-position', await getUiBackgroundPosition('insurance'));
            $('#uiWindow').css('height', '185px');
            $('#uiWindow').css('align-content', 'end');
            $('#insurance').removeClass('hidden');
            $('#bet-window').addClass('hidden');
            $('#hit-stand-window').addClass('hidden');
            break;
    }

    if (loadWindow == 'splashScreen') {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const tl = gsap.timeline();
        tl.to('#splashScreen', {
            opacity: 0,
            duration: 1,
            onComplete: () => $('#splashScreen').css('display', 'none')
        })
            .to('#jackaceGame, #dealerHand, #playerHand, #uiWindow', {
                opacity: 1,
                duration: 1
            }, "-=1");

        await new Promise(resolve => tl.eventCallback("onComplete", resolve));

        gameWindow = 'bet';
    } else {
        gameWindow = loadWindow;
    }
}

//////////////////////////////
// HELPER UTILITY FUNCTIONS //
//////////////////////////////

async function updateCurrentHand(currentHandIndex = null) {
    const allArrows = $('.playerHands .arrow');
    const allHands = $('.playerHands');

    // Create a GSAP timeline
    const tl = gsap.timeline();

    if (hideArrowsNoDim) {
        // Fade out all arrows
        if (allArrows.length > 0) {
            tl.to(allArrows, { opacity: 0, duration: 0.2 }, 0);
        }

        // Return all hands to normal brightness
        allHands.each(function () {
            if ($(this).hasClass('notCurrentHand')) {
                tl.to(this, { filter: 'brightness(1)', duration: 0.5 }, 0)
                    .call(() => $(this).removeClass('notCurrentHand'));
            }
        });
    } else if (currentHandIndex !== null) {
        const newArrow = $(`#hand${currentHandIndex + 1} .arrow`);

        // Fade out all arrows except the new one
        allArrows.each(function () {
            if (this !== newArrow[0]) {
                tl.to(this, { opacity: 0, duration: 0.2 }, 0);
            }
        });

        // Fade in the new arrow
        if (newArrow.length > 0) {
            tl.to(newArrow, { opacity: 1, duration: 0.2 }, 0);
        }

        // Dim non-current hands and remove dim from the current hand
        allHands.each(function (index) {
            if (index === currentHandIndex) {
                // Remove dim from the current hand if it's not already bright
                if ($(this).hasClass('notCurrentHand')) {
                    tl.to(this, { filter: 'brightness(1)', duration: 0.5 }, 0)
                        .call(() => $(this).removeClass('notCurrentHand'));
                }
            } else {
                // Dim the non-current hands if they are not already dimmed
                if (!$(this).hasClass('notCurrentHand')) {
                    tl.to(this, { filter: 'brightness(0.5)', duration: 0.5 }, 0)
                        .call(() => $(this).addClass('notCurrentHand'));
                }
            }
        });
    } else {
        // No specific hand to highlight and not dealer's turn
        console.error('currentHandIndex is not provided and dealersTurn is false.');
        return;
    }

    // Play the timeline and wait for it to complete
    await tl.play();
}




async function updateButtonStates(playerState) {
    await forceHoverStateCheck();

    const { canDouble, playerHands } = playerState;
    const currentHand = playerHands[playerState.currentHandIndex];
    const canSplit = currentHand.canSplit;

    // Ensure the player can afford the current bet or disable the Deal button
    if (playerMoney < BET_AMOUNTS[1]) {
        $('#deal').addClass('inactive');
    } else {
        $('#deal').removeClass('inactive');
        while (playerMoney < BET_AMOUNTS[playerBet]) {
            await betAdjustClick('decrease');
        }
    }

    const doubleButtonPosition = await getButtonBackgroundPosition(canDouble ? 'double' : 'doubleInactive');
    const splitButtonPosition = await getButtonBackgroundPosition(canSplit ? 'split' : 'splitInactive');

    $('#double').css('background-position', doubleButtonPosition).toggleClass('inactive', !canDouble);
    $('#split').css('background-position', splitButtonPosition).toggleClass('inactive', !canSplit);

    // Check if player can afford any bet amount
    let canAffordBet = false;
    for (let i = 1; i <= Object.keys(BET_AMOUNTS).length; i++) {
        if (playerState.playerMoney >= BET_AMOUNTS[i]) {
            canAffordBet = true;
            break;
        }
    }
    if (!canAffordBet) { playerBet = 1; }

    // Adjust the bet amount if necessary
    if (playerState.playerMoney < BET_AMOUNTS[playerBet]) {
        while (playerBet > 1 && playerState.playerMoney < BET_AMOUNTS[playerBet]) {
            playerBet--;
        }
    }

    // Disable or enable the deal button based on the player's ability to afford a bet
    $('#deal').toggleClass('inactive', !canAffordBet);

    // Update bet amount background position
    $('#bet_amount').css('background-position', await getButtonBackgroundPosition(`bet${playerBet}`));
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

async function flashCredits() {
    const resourceText = $('#resources-minigame #resource-text');
    resourceText.addClass('flash-red');

    // Play sound
    playSound('noMonies');

    await new Promise(resolve => setTimeout(resolve, 500));
    resourceText.removeClass('flash-red');
}

async function updatePlayerMoney(data, adjustBy = null, showRewards = false) {

    // Wait for the current update to finish if it's already running
    while (isUpdatingPlayerMoney) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms before checking again
    }

    isUpdatingPlayerMoney = true; // Set the flag to true at the start

    try {
        const targetMoney = adjustBy ? playerMoney + adjustBy : parseInt(data.playerMoney);
        let currentMoney = parseInt(playerMoney);
        let rewardCountdown = data?.reward ?? 0;
        let processingReward = false;
        let minDisplayTime = 1000; // Minimum display time for reward in milliseconds

        if (rewardCountdown > 0 && showRewards) {
            const timeline = gsap.timeline();

            processingReward = true;
            const { rewardContainerId, targetTop } = await createRewardTextElement(rewardCountdown);

            timeline.to(`#${rewardContainerId}`, {
                top: `${targetTop}px`,
                duration: 0.25,
                onStart: () => {
                    playSound('win', 0.7);
                }
            }, 0);

            if (data.boughtInsurance && data.dealerHandTotal === 21 && data.dealerHand.length === 2) {
                const insuranceTextElementId = await createInsuranceTextElement();
                minDisplayTime = Math.max(minDisplayTime, getSpriteDuration('dealerIsJackAce'));

                // Initial properties before the animation
                gsap.set(`#${insuranceTextElementId}`, {
                    opacity: 0,
                    y: -20, // Start 20px above the original position
                    scale: 0.8 // Start smaller
                });

                timeline.fromTo(`#${insuranceTextElementId}`,
                    {
                        opacity: 0,
                        y: -20,
                        scale: 0.8
                    },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.25,
                        onStart: () => playSound('dealerIsJackAce')
                    });
            }

            await timeline.then(() => new Promise(resolve => setTimeout(resolve, minDisplayTime)));

            // Start generating particles
            generateParticles = true;
            createParticlesContinuously(`#${rewardContainerId}`);
        }

        // Calculate total steps and delay time per step
        const totalSteps = Math.abs(targetMoney - currentMoney);
        const defaultStepDelay = 20; // Default step delay in milliseconds
        const maxDuration = 800; // Maximum duration in milliseconds
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
                // animate reward if applicable
                rewardCountdown--;
                const rewardTextElement = $(`#reward-text text`);
                if (rewardTextElement.length > 0) {
                    rewardTextElement.text(`+${rewardCountdown}`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }

        if (processingReward) {

            const tl = gsap.timeline();

            tl.to(`#reward-container`, {
                opacity: 0,
                duration: 0.5,
                onComplete: async () => {
                    generateParticles = false;
                    await Promise.all(particleAnimationPromises);
                    $(`#reward-container`).remove();
                }
            });

            if (data.boughtInsurance && data.dealerHandTotal === 21 && data.dealerHand.length === 2) {
                const insuranceTextElementId = 'insurance-text';

                tl.to(`#${insuranceTextElementId}`, {
                    opacity: 0,
                    y: 20,
                    scale: 1.2,
                    duration: 0.5,
                    onComplete: () => {
                        $(`#${insuranceTextElementId}`).remove();
                    }
                }, "-=0.5");
            }
            await tl;
        }
    } finally {
        isUpdatingPlayerMoney = false; // Reset the flag
        particleAnimationPromises = []; // Reset the promises array
    }
}

// Helper function to create the reward text element
async function createRewardTextElement(rewardCountdown) {
    const rewardContainerId = 'reward-container';
    const rewardTextElementId = 'reward-text';

    // Create the container div
    const rewardContainer = $('<div></div>').attr('id', rewardContainerId).css({
        position: 'absolute',
        width: '17%',
        top: '0%',
        right: '2%',
        overflow: 'visible',
        zIndex: '1',
        'font-size': '3vh',
        'font-family': '"Orbitron", "Helvetica Neue", "Futura", "Trebuchet MS", Arial'
    });

    // Create the SVG text element
    const rewardTextElement = createSvgText(`+${rewardCountdown}`, rewardTextElementId);

    // Create the particle container
    const particleContainer = $('<div class="particle-container"></div>');

    // Append SVG and particle container to the reward container div
    rewardContainer.append(rewardTextElement, particleContainer);
    $('#resources-minigame').after(rewardContainer);

    // Get the height of #resources-minigame
    const resourcesMinigame = $('#resources-minigame');
    const resourcesMinigameHeight = resourcesMinigame.outerHeight();
    const resourcesMinigameBottom = resourcesMinigame.offset().top + resourcesMinigameHeight;

    // Get the scale applied to the #container
    const container = $('#container');
    const containerTransform = container.css('transform');
    let scale = 1;
    if (containerTransform && containerTransform !== 'none') {
        const matrix = containerTransform.match(/^matrix\((.+)\)$/);
        if (matrix) {
            scale = parseFloat(matrix[1].split(', ')[0]);
        }
    }

    // Calculate the target top position
    const targetTop = resourcesMinigameBottom / scale;

    return { rewardContainerId, targetTop };
}

// Function to create particles continuously
async function createParticlesContinuously(target) {
    while (generateParticles) {
        createParticles(target);
        await new Promise(resolve => setTimeout(resolve, 10)); // Adjust the interval as needed
    }
}

// Function to create particle animation
function createParticles(target) {
    const particleContainer = $(`${target} .particle-container`);
    const svgTextElement = $(`${target} svg text`);
    const svgTextWidth = svgTextElement[0].getBoundingClientRect().width;
    const svgTextHeight = svgTextElement[0].getBoundingClientRect().height;

    const particle = $('<div class="particle"></div>');
    particleContainer.append(particle);

    const inner25PercentWidth = svgTextWidth * 0.25;
    const initialX = (Math.random() - 0.5) * inner25PercentWidth; // Random initial X position within the inner 25%
    const initialY = 0;
    const targetX = initialX + (Math.random() - 0.5) * svgTextWidth; // Ensure target X does not exceed SVG width
    const targetY = -(0.5 + (Math.random() * 0.75)) * svgTextHeight; // Target Y position with a random height

    const maxScale = Math.random() * 0.4 + 0.6; // Max scale at the top of the arch
    const endOpacity = Math.random() * 0.75 + 0.25; // End opacity

    // Ensure targetX is within bounds
    const finalTargetX = Math.max(-svgTextWidth / 2, Math.min(svgTextWidth / 2, targetX));

    // Animate particles
    const particlePromise = new Promise((resolve) => {
        gsap.fromTo(particle, {
            x: initialX,
            y: initialY,
            opacity: 1.0,
            scale: 0.1,
            backgroundColor: "white",
            boxShadow: "0 0 5px white"
        }, {
            x: finalTargetX,
            y: 0,
            opacity: endOpacity,
            duration: 0.8,
            ease: "power1.out",
            onUpdate: function () {
                const progress = this.progress();

                // Cubic bezier formula for X and Y coordinates
                const currentX = Math.pow(1 - progress, 2) * initialX + 2 * (1 - progress) * progress * ((initialX + finalTargetX) / 2) + Math.pow(progress, 2) * finalTargetX;
                const currentY = Math.pow(1 - progress, 2) * initialY + 2 * (1 - progress) * progress * targetY + Math.pow(progress, 2) * 0;
                const scaleValue = 0.1 + ((maxScale - 0.1) * Math.sin(Math.PI * progress));
                gsap.set(particle, { x: currentX, y: currentY, scale: scaleValue });
            },
            onComplete: () => {
                particle.remove();
                resolve(); // Resolve the promise when the animation is complete
            }
        });
    });

    // Add the promise to the array
    particleAnimationPromises.push(particlePromise);
}

// Helper function to create the insurance text element
async function createInsuranceTextElement() {
    const insuranceTextElementId = 'insurance-text';
    const insuranceTextElement = createSvgText('INSURANCE BETS PAY 2:1', insuranceTextElementId);

    $('#playerHand').after(insuranceTextElement);

    return insuranceTextElementId;
}

// New function to animate custom text
async function animateText(customText) {
    const customTextElementId = 'custom-text';
    const customTextElement = createSvgText(customText, customTextElementId);

    $('#playerHand').after(customTextElement);

    $(`#${customTextElementId}`).css({
        filter: "drop-shadow(0.5vh 0.5vh 0.5vh black) drop-shadow(0.5vh 0.5vh 0.5vh black)",
        position: 'absolute',
        width: `fit-content`,
        overflow: 'visible',
        top: `100%`,
        left: '50%',
        transform: 'translate(-50%, 10%)',
        zIndex: '2',
        'font-size': '9vh',
        'font-family': '"256BYTES", "Helvetica Neue", "Futura", "Trebuchet MS", Arial'
    });

    const timeline = gsap.timeline();

    timeline.to(`#${customTextElementId}`, {
        opacity: 1,
        duration: 0.5
    }, 0).to(`#${customTextElementId}`, {
        opacity: 0,
        duration: 0.5,
        delay: 2, // Adjust this delay as needed
        onComplete: () => $(`#${customTextElementId}`).remove()
    });

    await timeline;
}

// Function to create SVG text element with gradient
function createSvgText(textContent, id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('id', id); // Assign id to the svg element
    svg.setAttribute('viewBox', '0 0 100 30');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = createLinearGradient();
    defs.appendChild(linearGradient);
    svg.appendChild(defs);

    const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svgText.setAttribute('class', 'rewardText');
    svgText.setAttribute('x', '50%');
    svgText.setAttribute('y', '50%');
    svgText.setAttribute('text-anchor', 'middle');
    svgText.setAttribute('dominant-baseline', 'middle');
    svgText.textContent = textContent;

    // Apply additional styles directly to the <text> element
    svgText.style.fill = 'url(#fill-gradient)';
    svgText.style.stroke = 'rgba(255, 255, 255, 0.5)';
    svgText.style.strokeWidth = '0.5px';
    svgText.style.filter = 'drop-shadow(0 0 0.1vh #FFF) drop-shadow(0 0 0.3vh #F0F)';

    svg.appendChild(svgText);

    return svg;
}

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
    return await getBackgroundPosition(cardCode, CARD_POSITIONS, CARD_WIDTH, CARD_HEIGHT, CARD_GAP, SPRITE_COLUMNS, CARD_SCALE);
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

async function getResultPosition(resultCode) {
    let position = RESULT_POSITIONS[resultCode];
    let y = 0;
    for (let i = 0; i < position; i++) {
        y += (RESULT_HEIGHT + RESULT_GAP) * RESULT_SCALE;
    }
    let x = 0; // Since it's a single column, x will always be 0
    return `-${x}px -${y}px`;
}

function calculateSkewAdjustment(height, skewX) {
    const skewAngle = parseFloat(skewX) * (Math.PI / 180); // Convert skewX to radians
    const displacement = Math.tan(skewAngle) * height;
    return displacement;
}

async function animateResult(results) {
    const validResults = ['busted', 'youlose', 'push', 'winner', 'jackace'];
    const animationTimeline = gsap.timeline();
    const uniqueResults = new Set();

    // Define base animation durations
    const baseDurations = {
        busted: 0.8,
        youlose: 0.8,
        push: 0.5,
        winner1: 0.3,
        winner2: 0.4,
        jackace: 1
    };

    // Collect sprite durations
    const randomJackAce = jackaceSounds[Math.floor(Math.random() * jackaceSounds.length)];
    const randomWin = winSounds[Math.floor(Math.random() * winSounds.length)];
    const resultSounds = {
        busted: 'busted',
        youlose: 'youLose',
        push: 'push',
        winner: randomWin,
        jackace: randomJackAce
    };

    // Calculate maximum durations considering both animation and sprite durations
    const resultDurations = {
        busted: Math.max(baseDurations.busted, getSpriteDuration(resultSounds.busted)),
        youlose: Math.max(baseDurations.youlose, getSpriteDuration(resultSounds.youlose)),
        push: Math.max(baseDurations.push, getSpriteDuration(resultSounds.push)),
        winner: Math.max(baseDurations.winner1 + baseDurations.winner2, getSpriteDuration(resultSounds.winner)),
        jackace: Math.max(baseDurations.jackace, getSpriteDuration(resultSounds.jackace))
    };

    // First pass: Determine unique results and exclude hands with existing result images
    for (let handIndex = 0; handIndex < results.length; handIndex++) {
        const result = results[handIndex];
        const currentHandDiv = $(`#hand${handIndex + 1}`);

        // Skip hands without a result or with existing result images
        if (result === '' || currentHandDiv.find('.result-image').length > 0) { continue; }

        // Check if the result is one of the expected cases
        if (!validResults.includes(result)) {
            console.error(`Invalid result: ${result}`);
            return;
        }

        uniqueResults.add(result);
    }

    const isSingleResult = uniqueResults.size === 1;
    let delay = 0;

    // Second pass: Animate results and play sounds
    for (let handIndex = 0; handIndex < results.length; handIndex++) {
        const result = results[handIndex];
        const currentHandDiv = $(`#hand${handIndex + 1}`);

        // Skip hands without a result or with existing result images
        if (result === '' || currentHandDiv.find('.result-image').length > 0) {
            continue;
        }

        const firstCard = currentHandDiv.find('.playingCard').first();
        const resultImgPosition = await getResultPosition(result); // Get the sprite position for the result

        const resultImage = $('<div class="result-image"></div>').css({
            background: `url('./apps/JackAce/img/result.png') ${resultImgPosition}`,
            position: 'absolute',
            margin: "5px",
            width: `${RESULT_WIDTH * RESULT_SCALE}px`,
            height: `${RESULT_HEIGHT * RESULT_SCALE}px`,
            "background-size": `${RESULT_WIDTH * RESULT_SCALE}px ${69 * RESULT_SCALE}px`,
            zIndex: 2
        });

        // Ensure currentHandDiv is positioned relative or absolute
        if (currentHandDiv.css('position') === 'static') {
            currentHandDiv.css('position', 'relative');
        }

        currentHandDiv.append(resultImage);
        const finalPosition = { left: 200 };
        resultImage.css({ left: `${finalPosition.left}px` });

        // Set up the animations and sounds based on the result
        switch (result) {
            case 'busted':
            case 'youlose':
                animationTimeline.fromTo(resultImage,
                    { top: -400, left: finalPosition.left, scale: 1.5, opacity: 0 },
                    { top: 0, scale: 1, opacity: 1, duration: resultDurations[result], ease: "bounce.out", onStart: () => playSound(resultSounds[result]) },
                    isSingleResult ? 0 : delay
                );
                break;

            case 'push':
                animationTimeline.fromTo(resultImage,
                    { left: finalPosition.left - 200, scaleX: 0, opacity: 0 },
                    { left: finalPosition.left, scaleX: 1, opacity: 1, duration: resultDurations.push, ease: "elastic.out(1, 0.3)", onStart: () => playSound(resultSounds[result]) },
                    isSingleResult ? 0 : delay
                );
                break;

            case 'winner':
                const resultImageHeight = resultImage.height();

                // Animate left with power4.out and handle skewX for braking effect
                animationTimeline.fromTo(resultImage,
                    { left: finalPosition.left + 800, opacity: 0 },
                    {
                        left: finalPosition.left + 200 - calculateSkewAdjustment(resultImageHeight, "-15deg"),
                        opacity: 1,
                        duration: baseDurations.winner1, ease: "linear"
                    },
                    isSingleResult ? 0 : delay
                );

                // Slow down exponentially for the last bit
                animationTimeline.to(resultImage,
                    {
                        left: finalPosition.left,
                        duration: baseDurations.winner2, ease: "back.out(2)", onStart: () => playSound(resultSounds[result])
                    },
                    isSingleResult ? baseDurations.winner1 : delay + baseDurations.winner1
                );

                // Maintain skewX at -25deg during the initial deceleration phase
                animationTimeline.to(resultImage,
                    { skewX: "-15deg", duration: baseDurations.winner1 },
                    isSingleResult ? 0 : delay
                );

                // Adjust skewX to create the braking effect
                animationTimeline.to(resultImage,
                    {
                        skewX: "0deg", duration: baseDurations.winner2, ease: "back.out(2)",
                        onUpdate: function () {
                            resultImage.css('left', `${finalPosition.left + calculateSkewAdjustment(resultImageHeight, resultImage.skewX)}px`);
                        }
                    },
                    isSingleResult ? baseDurations.winner1 : delay + baseDurations.winner1
                );
                break;

            case 'jackace':
                animationTimeline.fromTo(resultImage,
                    { scale: 0, rotation: 720, opacity: 0 },
                    { scale: 1, rotation: 0, opacity: 1, duration: resultDurations.jackace, ease: "back.out(1.7)", onStart: () => playSound(randomJackAce) },
                    0 // can't have multiple hands when you get jackace
                );
                break;

            default:
                // If the result type is not recognized, hide the image
                resultImage.hide();
                return;
        }

        // Increase delay for the next hand result if there are different results
        if (!isSingleResult) {
            delay += resultDurations[result];
        }
    }

    // Check if there are any result images to fade out
    if ($('.result-image').length > 0) {
        await animationTimeline.to(`.result-image`, { opacity: 0, duration: 1, delay: 0.5 });
    }
}


async function determineResults(data) {
    const dealerHandTotal = data.dealerHand.total;
    let results = [];

    if (data.boughtInsurance && dealerHandTotal === 21 && data.dealerHand.hand.length === 2) {
        return;
    }

    for (let i = 0; i < data.playerHands.length; i++) {
        const playerHand = data.playerHands[i];
        const playerHandTotal = data.playerHands[i].total;

        if (data.playerHands.length === 1 && playerHandTotal === 21 && playerHand.hand.length === 2 && dealerHandTotal !== 21) {
            results[i] = 'jackace';
        } else if (playerHandTotal > 21) {
            results[i] = 'busted';
        } else if (dealerHandTotal > 21 || playerHandTotal > dealerHandTotal) {
            results[i] = 'winner';
        } else if (playerHandTotal < dealerHandTotal) {
            results[i] = 'youlose';
        } else {
            results[i] = 'push';
        }
    }
    await animateResult(results);
}