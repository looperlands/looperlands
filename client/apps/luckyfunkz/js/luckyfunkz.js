{/*
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                                                ║
║                           __                      __               ____    __  __  __  __  __  __   ________                                   ║
║                          /\ \                    /\ \             /\  _`\ /\ \/\ \/\ \/\ \/\ \/\ \ /\_____  \                                  ║
║                          \ \ \      __  __    ___\ \ \/'\   __  __\ \ \L\_\ \ \ \ \ \ `\\ \ \ \/'/'\/____//'/'                                 ║
║                           \ \ \  __/\ \/\ \  /'___\ \ , <  /\ \/\ \\ \  _\/\ \ \ \ \ \ , ` \ \ , <      //'/'                                  ║
║                            \ \ \L\ \ \ \_\ \/\ \__/\ \ \\`\\ \ \_\ \\ \ \/  \ \ \_\ \ \ \`\ \ \ \\`\   //'/'___                                ║
║                             \ \____/\ \____/\ \____\\ \_\ \_\/`____ \\ \_\   \ \_____\ \_\ \_\ \_\ \_\ /\_______\                              ║
║                              \/___/  \/___/  \/____/ \/_/\/_/`/___/> \\/_/    \/_____/\/_/\/_/\/_/\/_/ \/_______/                              ║
║                                                                 /\___/                                                                         ║
║                                                                 \/__/           by bitcorn & grismore (2024)                                   ║
║                                                                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
WE DONE WENT AND FUNKED AROUND WITH THIS DINGDANG DILLYDAD TIL IT WAS ALL UPSIDE-DOWN LIKE A HOG IN A TORNADO! YA MIGHT EVEN SAY WE GOT FUNKY WITH
IT, ALL SWERVIN' AND CURVIN' LIKE A SQUIRREL IN A UNITARD SCATTERIN' ABOUT IN YA MAMA'S BASEMENT! IT TOOK SOME SLAPPIN' AND SLIDIN', GRIPPIN' AND
RIPPIN', TILL IT WAS JUST RIGHT! LIKE A TACO ON TUESDAY.


[ORIGINAL CODE]
(C) 2012 Clint Bellanger [MIT License]
https://github.com/clintbellanger/Karma-Slots/tree/master
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    - The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

Sounds by Brandon Morris (CC-BY 3.0)
A̶r̶t̶ ̶b̶y̶ ̶C̶l̶i̶n̶t̶ ̶B̶e̶l̶l̶a̶n̶g̶e̶r̶ ̶(̶C̶C̶-̶B̶Y̶ ̶3̶.̶0̶) [EDIT: ORIGINAL ART REPLACED. Art by bitcorn, (C-IZ 4 CORN)]
*/

// [CORNSTANTS]
const FPS = 30;
const GOLD = "21300041";
const MAX_BET = 3;
const MAX_LINES = 3;
const ROW_COUNT = 3;
const REEL_COUNT = 3;
const REEL_PADDING = 8;
const SYMBOL_COUNT = 12;
const MATCH_PAYOUT = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];
const SCALE = 5;
const SYMBOL_SIZE = 32 * SCALE;
const SYMBOLS = [];
const REEL_AREA_WIDTH = SYMBOL_SIZE * REEL_COUNT + REEL_PADDING * (REEL_COUNT - 1);
const REEL_AREA_HEIGHT = SYMBOL_SIZE * ROW_COUNT;
const REELS_BG = new Image();
const CREDIT_PANEL = new Image();
const SND_WIN = new Audio("apps/luckyfunkz/assets/audio/win.wav");
const SND_REEL_STOP = Array.from({ length: 3 }, () => new Audio("apps/luckyfunkz/assets/audio/reel_stop.wav"));
const SPINUP_ACCELERATION = 2;
const SPINDOWN_ACCELERATION = 1;
const MAX_REEL_SPEED = SYMBOL_SIZE;
const STOPPING_DISTANCE = 528 * SCALE;
const STATE_REST = 0;
const STATE_SPINUP = 1;
const STATE_SPINDOWN = 2;
const STATE_REWARD = 3;
const REWARD_GRAND_THRESHHOLD = 25;
const REWARD_DELAY = 3;
const REWARD_DELAY_GRAND = 1;

// [VEGITABLES]
let payoutTableGenerated = false;
let game_state = STATE_REST;
let spinInProgress = false;
let credits = -1;
let playing_lines = 1;
let bet = 1;
let payout = 0;
let linesToHighlight = [];
let reward_delay_counter = 0;
let reels = [];
let reel_positions = 0;
let reel_pixel_length = 0;
let reel_position = new Array(REEL_COUNT);
let result = new Array(REEL_COUNT);
let reel_speed = new Array(REEL_COUNT).fill(0);   // reel spin speed in pixels per frame
let stopping_position = new Array(REEL_COUNT);
let currentSpinData = [];
let start_slowing = new Array(REEL_COUNT);
let can;
let ctx;

reels = [
    [2, 1, 7, 1, 2, 7, 6, 7, 3, 10, 1, 6, 1, 7, 3, 4, 11, 3, 2, 4, 5, 0, 6, 10, 5, 6, 5, 8, 3, 0, 9, 5, 4],
    [6, 0, 10, 3, 6, 11, 7, 9, 2, 5, 2, 3, 1, 5, 2, 1, 10, 4, 5, 8, 4, 7, 6, 0, 1, 7, 6, 3, 1, 5, 9, 7, 4],
    [1, 4, 2, 7, 5, 6, 4, 10, 7, 5, 2, 0, 6, 4, 10, 1, 7, 6, 3, 0, 5, 7, 2, 3, 11, 9, 3, 5, 6, 1, 8, 1, 3]
];
reel_positions = Math.min(reels[0].length, reels[1].length, reels[2].length);
reel_pixel_length = reel_positions * SYMBOL_SIZE;
for (let i = 0; i < REEL_COUNT; i++) {
    reel_position[i] = Math.floor(Math.random() * reel_positions) * SYMBOL_SIZE;
    result[i] = new Array(ROW_COUNT);
}




// [INITIALIZATION]
function init() {
    setupLuckyFUNKZmenu(); 		// UPDATE MINIGAME MENU + EVENT LISTENER FOR "fadeIn"
    loadResources();
    setupEventListeners();
}


// Add payouts to minigame menu if it doesn't exist
function setupLuckyFUNKZmenu() {
    if ($('#minigameMenu-content').find('#mgPayouts').length === 0) {
        $('#minigameMenu-content').prepend('<a href="#" id="mgPayouts">🎰 Payouts</a>');
    }
}

function toggleMinigameCloseButton() {;
    $('#mgClose').text($('#minigame').hasClass("pauseClose") ? '⏳ Processing Spin' : '❌ Close Minigame');
}


// Load Resources
function loadResources() {
    // Define URLs for fonts, symbols, images, REELS_BG, and CREDIT_PANEL
    const fontUrls = [
        { url: './apps/luckyfunkz/assets/fonts/GraphicPixel-Regular.ttf', family: 'GraphicPixel' },
        { url: './apps/luckyfunkz/assets/fonts/256BYTES.ttf', family: '256BYTES' }
    ];

    const symbolUrls = Array.from({ length: SYMBOL_COUNT },
        (_, i) => `./apps/luckyfunkz/assets/images/symbols/${i.toString().padStart(2, "0")}.png`);

    REELS_BG.src = './apps/luckyfunkz/assets/images/ui/background/LuckyFUNKZ.png';
    CREDIT_PANEL.src = './apps/luckyfunkz/assets/images/ui/panels/credit_panel.png';

    // Define promises for loading fonts, symbols, images, REELS_BG, and CREDIT_PANEL
    const fontPromises = fontUrls.map(({ url, family }) => loadFont(url, family));

    const symbolPromises = new Promise((resolve, reject) => {
        const loadSymbols = symbolUrls.map(symbolUrl => loadImage(symbolUrl));
        Promise.all(loadSymbols)
            .then(symbolImages => {
                // Push loaded symbol images into SYMBOLS array
                SYMBOLS.push(...symbolImages);
                resolve();
            })
            .catch(reject);
    });

    const reelsBGPromise = new Promise((resolve, reject) => {
        REELS_BG.onload = function () { resolve(); };
        REELS_BG.onerror = reject;
    });

    const creditPanelPromise = new Promise((resolve, reject) => {
        CREDIT_PANEL.onload = function () { resolve(); };
        CREDIT_PANEL.onerror = reject;
    });

    const goldAmountPromise = getGoldAmount().then(goldAmount => { credits = goldAmount; });

    // Combine all promises
    const resources = [
        ...fontPromises,
        symbolPromises,
        reelsBGPromise,
        creditPanelPromise,
        goldAmountPromise
    ];

    // Once all resources are loaded, handle them
    Promise.all(resources)
        .then(() => {
            // Initialize Canvas
            initializeCanvas();

            // Update button panel width
            updateButtonPanelWidth();

            // Proceed with rendering
            render_reel();

        })
        .catch(error => console.error('Resource loading failed:', error));
}

// Load font function
function loadFont(fontUrl, fontFamily) {
    return new Promise((resolve, reject) => {
        const font = new FontFace(fontFamily, `url(${fontUrl})`);
        font.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            resolve();
        }).catch(reject);
    });
}

// Load image function
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });
}


// Set up Event Listeners
function setupEventListeners() {
    $(`#minigameMenu`).on('click', '#mgPayouts', () => getPayoutTable(true));
    $(`#luckyfunkz`).on('fadeIn', () => setupLuckyFUNKZmenu());
    $(`#luckyfunkz`).on('click', '#autoSpinButton', () => $("#autoSpinButton").toggleClass("on off"));
    $(`#luckyfunkz`).on('click', '#lineButton', () => increaseLines());
    $(`#luckyfunkz`).on('click', '#betButton', () => increaseBet());
    $(`#luckyfunkz`).on('click', '#maxBetButton', () => setBetMax());
    $(`#luckyfunkz`).on('click', '#spinButton', () => spin());
    $(window).on('resize', () => updateButtonPanelWidth());
}


// Initialize Canvas
function initializeCanvas() {
    can = document.getElementById("slotsArea"); // canvas
    ctx = can.getContext("2d"); // context
    const devicePixelRatio = window.devicePixelRatio || 1;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    can.width = REELS_BG.naturalWidth;
    can.height = REELS_BG.naturalHeight;
}



//---- Render Functions ---------------------------------------------

function render() {
    if (game_state == STATE_SPINUP || game_state == STATE_SPINDOWN) {
        render_reel();
    }
}

function render_reel() {
    ctx.clearRect(0, 0, can.width, can.height);
    
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "black";
    ctx.fillRect(580, 280, 760, 510);

    const aspectRatio = REELS_BG.width / REELS_BG.height;
    const centerX = (can.width - REEL_AREA_WIDTH) / 2;
    const centerY = 304;

    for (let i = 0; i < REEL_COUNT; i++) {
        for (let j = 0; j < ROW_COUNT + 1; j++) {
            const reel_index = (Math.floor(reel_position[i] / SYMBOL_SIZE) + j) % reel_positions;
            const symbol_offset = reel_position[i] % SYMBOL_SIZE;
            const symbol_index = reels[i][reel_index];
            const x = centerX + i * SYMBOL_SIZE;
            const y = centerY + j * SYMBOL_SIZE - symbol_offset;
            draw_symbol(symbol_index, x, y, i);
        }
    }

    ctx.drawImage(REELS_BG, 0, 0, aspectRatio * can.height, can.height);
    ctx.drawImage(CREDIT_PANEL, can.width * 0.80, can.height * 0.05, CREDIT_PANEL.width, CREDIT_PANEL.height);
    renderTextOnCanvas();
}

function draw_symbol(symbol_index, x, y, reel) {
    const fillX = x + reel * REEL_PADDING;
    const fillY = y;
    ctx.fillStyle = ["fuchsia", "lime", "cyan"][reel];
    ctx.fillRect(fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);
    ctx.drawImage(SYMBOLS[symbol_index], fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.trunc(SCALE / 2 + 1);
    ctx.strokeRect(fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);

}

function drawText(context, color, textalign, text, x, y) {
    context.fillStyle = color;
    context.font = can.width * 0.025 + "px GraphicPixel";
    context.textAlign = textalign;
    context.fillText(text, x, y);
}

function renderTextOnCanvas() {
    ctx.fillStyle = "white";
    ctx.font = `${can.width * 0.025}px GraphicPixel`;
    ctx.textAlign = "left";

    if (credits != -1) {
        drawText(ctx, "white", "center", credits, can.width * 0.80 + CREDIT_PANEL.width * 0.55, can.height * 0.05 + CREDIT_PANEL.height * 0.67);
    }
    drawText(ctx, "aqua", "left", "LINES: " + playing_lines, can.width * 0.38, can.height * 0.78);
    drawText(ctx, "aqua", "left", "BET: " + bet, can.width * 0.55, can.height * 0.78);
}

function highlight_line(line_num) {
    try {
        SND_WIN.currentTime = 0;
        SND_WIN.play();
    } catch (err) { }

    const centerX = (can.width - REEL_AREA_WIDTH) / 2;
    const centerY = 304;
    const ss = SYMBOL_SIZE;
    ctx.strokeStyle = "orange";

    function drawRect(x, y, width, height) {
        //const padding = Math.trunc(x / ss) * REEL_PADDING;
        const adjustedX = centerX + x;
        const adjustedY = centerY + y;
        ctx.strokeRect(adjustedX, adjustedY, width - 1, height - 1);
    }

    // Define positions for each row
    const rowPositions = [
        [{ x: 0, y: 0 }, { x: ss + REEL_PADDING, y: 0 }, { x: 2 * (ss + REEL_PADDING), y: 0 }],                 // Top row
        [{ x: 0, y: ss }, { x: ss + REEL_PADDING, y: ss }, { x: 2 * (ss + REEL_PADDING), y: ss }],              // Middle row
        [{ x: 0, y: 2 * ss }, { x: ss + REEL_PADDING, y: 2 * ss }, { x: 2 * (ss + REEL_PADDING), y: 2 * ss }]   // Bottom row
    ];

    // Draw rectangles based on line number
    const rowToDraw = [
        [2, 4],     // Top row
        [1, 4, 5],  // Middle row
        [3, 4, 5]   // Bottom row
    ];

    rowToDraw.forEach((row, rowIndex) => {
        if (row.includes(line_num)) {
            rowPositions[rowIndex].forEach(({ x, y }) => drawRect(x, y, ss, ss));
        }
    });
}

//---- Logic Functions ---------------------------------------------

function logic() {
    switch (game_state) {
        case STATE_SPINUP:
            logic_spinup();
            break;
        case STATE_SPINDOWN:
            logic_spindown();
            break;
        case STATE_REWARD:
            logic_reward();
            break;
        case STATE_REST:
            if ($("#autoSpinButton").hasClass("on") && !spinInProgress) {
                spin();
            }
            break;
    }
}

// Handle reels accelerating to full speed
function logic_spinup() {
    for (let i = 0; i < REEL_COUNT; i++) {
        move_reel(i);
        reel_speed[i] += SPINUP_ACCELERATION;
    }

    // If at max speed, begin spindown
    if (reel_speed[0] == MAX_REEL_SPEED) {
        set_stops();
        game_state = STATE_SPINDOWN;
    }
}

function move_reel(i) {
    reel_position[i] = (reel_position[i] - reel_speed[i] + reel_pixel_length) % reel_pixel_length;
}

function set_stops() {
    for (let i = 0; i < REEL_COUNT; i++) {
        start_slowing[i] = false;

        stop_index = Math.floor(Math.random() * reel_positions);

        if(stop_index * SYMBOL_SIZE - STOPPING_DISTANCE < 0)
            stopping_position[i] = (stop_index * SYMBOL_SIZE - STOPPING_DISTANCE + reel_pixel_length) % reel_pixel_length;
        else
            stopping_position[i] = (stop_index * SYMBOL_SIZE - STOPPING_DISTANCE) % reel_pixel_length;
        
        reels[i][(stop_index + 2) % reel_positions] = currentSpinData[0][i];
        reels[i][(stop_index + 3) % reel_positions] = currentSpinData[1][i];
        reels[i][(stop_index + 4) % reel_positions] = currentSpinData[2][i];
    }
}

// Handle movement as reels are coming to rest
function logic_spindown() {
    if (reel_speed.every(speed => speed === 0)) {
        for (line of linesToHighlight) {
            highlight_line(line);
        }
        game_state = STATE_REWARD;
    }

    for (let i = 0; i < REEL_COUNT; i++) {
        move_reel(i);

        if (!start_slowing[i] && (i === 0 || start_slowing[i - 1]) && reel_position[i] === stopping_position[i]) {
            start_slowing[i] = true;
        } else if (start_slowing[i]) {
            if (reel_speed[i] > 0) {
                reel_speed[i] -= SPINDOWN_ACCELERATION;
                if (reel_speed[i] === 0) {
                    try {
                        SND_REEL_STOP[i].currentTime = 0;
                        SND_REEL_STOP[i].play();
                    } catch (err) { }
                }
            }
        }
    }
}

// Process rewards, play sound effects, etc.
function logic_reward() {
    if (payout == 0) {
        game_state = STATE_REST;
        spinInProgress = false;
        $('#minigame').removeClass("pauseClose");
        toggleMinigameCloseButton();
        return;
    }

    // don't tick up rewards each frame, too fast
    if (reward_delay_counter > 0) {
        reward_delay_counter--;
        return;
    }

    payout--;
    const metrics = ctx.measureText(`CREDITS: ${credits}`);
    credits++;
    ctx.clearRect(can.width * 0.74, ((can.height * 0.05) - (can.width * .025)), metrics.width, can.width * .025);
    drawText(ctx, "CREDITS: " + credits, can.width * 0.74, can.height * 0.05);

    reward_delay_counter = payout < REWARD_GRAND_THRESHHOLD ? REWARD_DELAY : REWARD_DELAY_GRAND; //speed up big rewards
}

//---- Input Functions ---------------------------------------------

async function spin() {
    if(spinInProgress) return;
    spinInProgress = true;
    try {
        const urlPrefix = `${window.location.protocol}//${window.location.host}`;

        //Request spin from server
        const sessionId = new URLSearchParams(window.location.search).get('sessionId');
        const spinRequest = `${urlPrefix}/session/${sessionId}/getSpin/${playing_lines}/${bet}`;
        console.log("[REQUEST SPIN] ", spinRequest);
        const response = await axios.get(spinRequest);

        if (response.status === 400 && response.data.error === "Not Enough Gold") {
            // Handle "Not Enough Gold" logic here
            console.log("Not Enough Gold. You are broke!");
        }

        const { spinData, valueToPayout, winningLines } = response.data;
        payout = valueToPayout || 0;
        console.log(`spinData: ${spinData}  PAYOUT: ${payout}  winningLines: ${winningLines}`);
        currentSpinData = spinData;

        linesToHighlight = winningLines;

        if (credits < playing_lines * bet || game_state !== STATE_REST) return;

        $('#minigame').addClass("pauseClose");
        toggleMinigameCloseButton();
        credits -= playing_lines * bet;

        render_reel();

        game_state = STATE_SPINUP;

    } catch (error) {
        // Spin request failure
        console.error("Error with LuckyFUNKZ spin() function:", error.message);

        if (error.response) {
            // Server responded with an error status code
            console.error("Server Error:", error.response.data);
        } else if (error.request) {
            // Request was made but no response was received
            console.error("Network Error:", error.request);
        } else {
            // Something else went wrong
            console.error("Unexpected Error:", error.message);
        }
    }
}

function increaseLines() {
    playing_lines = playing_lines === MAX_LINES ? 1 : playing_lines + 1;
    render_reel();
}

function increaseBet() {
    bet = bet === MAX_BET ? 1 : bet + 1;
    render_reel();
}

function setBetMax() {
    bet = MAX_BET;
    render_reel();
}


//---- Helper Functions -----------------------------------------------

function updateButtonPanelWidth() {
    const buttonPanel = document.getElementById("buttonPanel");
    if (!buttonPanel) return;
    buttonPanel.style.height = "10%";
    if(window.innerWidth > window.innerHeight){
        //LANDSCAPE
        buttonPanel.style.width = window.innerHeight * (2 / 3) + "px"; //set the width as a function of height using the aspect ratio since we use height as control
    } else{
        //PORTRAIT
        buttonPanel.style.width = window.innerWidth * 0.36 + "px";
    }
}

// Get Player's current Gold balance from server
function getGoldAmount() {
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

// Create SVG text element with gradient for Payout Table Headers
function createSvgText(textContent, setWidth) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('height', '7vh');
    if(textContent == "x3") svg.setAttribute('width', '15vh');
    if(textContent == "PAYOUT/BET") svg.setAttribute('width', '35vh');
    if(textContent == " FEET ARE WILD ") svg.setAttribute('width', '30vh');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = createLinearGradient();
    defs.appendChild(linearGradient);
    svg.appendChild(defs);
    const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svgText.setAttribute('class', 'headerText');
    svgText.setAttribute('x', '50%');
    svgText.setAttribute('y', '75%');
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

// Generate the payout table container
function getPayoutTable(slideout = false) {
    if (!payoutTableGenerated) {
        const container = document.createElement('div');
        container.id = 'payoutContainer';
        container.style.transform = 'translateX(-100%)';
        $('#luckyfunkz').append(container);

        const payoutTable = document.createElement('table');
        container.appendChild(payoutTable);

        const headerRow = payoutTable.createTHead().insertRow();
        ['x3', 'PAYOUT/BET'].forEach(headerText => {
            const headerCell = document.createElement('th');
            const svgText = createSvgText(headerText);
            headerCell.appendChild(svgText);
            headerRow.appendChild(headerCell);
        });

        const tableBody = payoutTable.createTBody();
        let bodyRow = tableBody.insertRow();

        const wildCards = [0, 1];
        for (let i = SYMBOL_COUNT - 1; i >= 0; i--) {
            if (!wildCards.includes(i)) {
                const symbolCell = bodyRow.insertCell();
                symbolCell.classList.add('symbolCell');

                const symbolImage = document.createElement('img');
                symbolImage.src = SYMBOLS[i].src;
                symbolCell.appendChild(symbolImage);

                const payoutCell = bodyRow.insertCell();
                payoutCell.textContent = MATCH_PAYOUT[i];
                payoutCell.classList.add('payoutCell');

                // Insert a new row for the next set of symbols
                if (i > 0) { bodyRow = tableBody.insertRow(); }
            }else{
                if(i === 1){
                    bodyRow = tableBody.insertRow();
                    const wildCell = bodyRow.insertCell();
                    wildCell.colSpan = 2;
                    wildCell.classList.add('wildCell');

                    // First image
                    const symbolImage1 = document.createElement('img');
                    symbolImage1.src = SYMBOLS[0].src;
                    symbolImage1.style.cssFloat = 'left'; // Align to the left
                    wildCell.appendChild(symbolImage1);

                    // SVG element for the styled text
                    const svgText = createSvgText(" FEET ARE WILD ");
                    svgText.style.position = 'absolute';
                    svgText.style.left = '50%';
                    svgText.style.top = '50%';
                    svgText.style.transform = 'translate(-50%,-50%)';
                    wildCell.appendChild(svgText);

                    // Second image
                    const symbolImage2 = document.createElement('img');
                    symbolImage2.src = SYMBOLS[1].src;
                    symbolImage2.style.cssFloat = 'right'; // Align to the right
                    wildCell.appendChild(symbolImage2);
                }
            }
        }

        // Add button to hide table
        const closeButton = document.createElement('div');
        closeButton.id = 'closePayouts';
        closeButton.classList.add('closeButton');
        closeButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 5vh; filter: drop-shadow(4px 4px 8px black); transform: translateX(30%);">arrow_back_ios</span>';

        $('#luckyfunkz').on('click', '#closePayouts', () => { gsap.to('#payoutContainer', { x: '-100%', duration: 1, ease: 'power2.inOut' }); });
        $(`#minigameMenu`).on('click', '#mgClose', () => {
            if ($('#luckyfunkz').css('display') !== 'none') {
                gsap.to('#payoutContainer', { x: '-100%', duration: 1, ease: 'power2.inOut' });
            }
        });
        //$(`#luckyfunkz`).on('click', (event) => {
        //    const payoutContainer = $('#payoutContainer');
        //    if (!payoutContainer.is(event.target) && !$.contains(payoutContainer[0], event.target)) {
        //        gsap.to('#payoutContainer', { x: '-100%', duration: 1, ease: 'power2.inOut' });
        //    }
        //});

        container.appendChild(closeButton);
        payoutTableGenerated = true;
    }

    if (slideout) {
        gsap.to('#payoutContainer', {
            x: '0%', duration: 1,
            ease: 'power2.inOut',
            onStart: () => {
                container.style.opacity = '0';      // Set opacity to 0 to hide the content initially
                requestAnimationFrame(() => {
                    container.style.opacity = '1';  // Set opacity back to 1 to show the content during animation
                });
            }
        });
    }
}


// Game Loop
setInterval(function () {
    logic();
    render();
}, 1000 / FPS);
}