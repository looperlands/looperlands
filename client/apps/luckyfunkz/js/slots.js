/*
Copyright (c) 2012 Clint Bellanger [MIT License]
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    - The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

Sounds by Brandon Morris (CC-BY 3.0)
*/
{
var FPS = 120;
setInterval(function () {
    logic();
    render();
}, 1000 / FPS);

// Flags for resource loading
var FONTS_loaded = false;
var SYMBOLS_loaded = false;
var REELS_BG_loaded = false;

// Art
var SYMBOLS = [];
var SYMBOL_COUNT = 12;
var loadedSymbolCount = 0;

for (var i = 0; i < SYMBOL_COUNT; i++) {
    var symbol = new Image();
    symbol.onload = function () {
        loadedSymbolCount++;
        if (loadedSymbolCount == SYMBOL_COUNT) {
            SYMBOLS_loaded = true;
            if (FONTS_loaded && SYMBOLS_loaded && REELS_BG_loaded) render_reel();
        }
    };
    symbol.src = `./apps/luckyfunkz/assets/images/symbols/${i.toString().padStart(2, "0")}.png`;
    SYMBOLS.push(symbol);
}

var REELS_BG = new Image();
REELS_BG.src = "./apps/luckyfunkz/assets/images/ui/background/LuckyFUNKZ.png";

var CREDIT_PANEL = new Image();
CREDIT_PANEL.src = "./apps/luckyfunkz/assets/images/ui/panels/credit_panel.png";

var SND_WIN = new Audio("apps/luckyfunkz/assets/audio/win.wav");
var SND_REEL_STOP = Array.from({ length: 3 }, () => new Audio("apps/luckyfunkz/assets/audio/reel_stop.wav"));

// Enums
var STATE_REST = 0;
var STATE_SPINUP = 1;
var STATE_SPINDOWN = 2;
var STATE_REWARD = 3;
var STATE_SPININPROGRESS;

// Config
var SCALE = 5;
var SYMBOL_SIZE = 32 * SCALE;
var REEL_COUNT = 3;
var REEL_PADDING = 8;
var ROW_COUNT = 3;
var STOPPING_DISTANCE = 528 * SCALE;
var MAX_REEL_SPEED = SYMBOL_SIZE;
var SPINUP_ACCELERATION = 2;
var SPINDOWN_ACCELERATION = 1;
var REWARD_DELAY = 3;
var REWARD_DELAY_GRAND = 1;
var REWARD_GRAND_THRESHHOLD = 25;
var MAXBET = 3;
var MAXLINES = 3;

var MATCH_PAYOUT = [
    1, // Wild
    1, // Wild
    1, // Standard
    4, // Fish
    7, // Clown
    13, // General
    42, // Choco
    69, // tacOS
    350, // Punk
    1337, // Zombie
    9001, // DocGuac
    42069 // Bassmint
];

var REEL_AREA_WIDTH = SYMBOL_SIZE * REEL_COUNT + REEL_PADDING * (REEL_COUNT - 1);
var REEL_AREA_HEIGHT = SYMBOL_SIZE * ROW_COUNT;

// Set up reels
var reels = [
    [2, 1, 7, 1, 2, 7, 6, 7, 3, 10, 1, 6, 1, 7, 3, 4, 11, 3, 2, 4, 5, 0, 6, 10, 5, 6, 5, 8, 3, 0, 9, 5, 4],
    [6, 0, 10, 3, 6, 11, 7, 9, 2, 5, 2, 3, 1, 5, 2, 1, 10, 4, 5, 8, 4, 7, 6, 0, 1, 7, 6, 3, 1, 5, 9, 7, 4],
    [1, 4, 2, 7, 5, 6, 4, 10, 7, 5, 2, 0, 6, 4, 10, 1, 7, 6, 3, 0, 5, 7, 2, 3, 11, 9, 3, 5, 6, 1, 8, 1, 3]
];

var reel_positions = Math.min(reels[0].length, reels[1].length, reels[2].length);
var reel_pixel_length = reel_positions * SYMBOL_SIZE;

var reel_position = new Array(REEL_COUNT);
for (var i = 0; i < REEL_COUNT; i++) {
    reel_position[i] = Math.floor(Math.random() * reel_positions) * SYMBOL_SIZE;
}

var stopping_position = new Array(REEL_COUNT);
var start_slowing = new Array(REEL_COUNT);

// reel spin speed in pixels per frame
var reel_speed = new Array(REEL_COUNT);
for (var i = 0; i < REEL_COUNT; i++) {
    reel_speed[i] = 0;
}

var result = new Array(REEL_COUNT);
for (var i = 0; i < REEL_COUNT; i++) {
    result[i] = new Array(ROW_COUNT);
}

var game_state = STATE_REST;
var credits = -1;
var payout = 0;
var reward_delay_counter = 0;
var playing_lines = 1;
var bet = 1;
var linesToHighlight = [];

//---- Render Functions ---------------------------------------------
function draw_symbol(symbol_index, x, y, reel) {
    ctx.fillStyle = reel === 0 ? "fuchsia" : reel === 1 ? "lime" : "cyan";
    const fillX = x + reel * REEL_PADDING;
    const fillY = y;

    ctx.fillRect(fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SYMBOLS[symbol_index], fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.trunc(SCALE / 2 + 1);
    ctx.strokeRect(fillX, fillY, SYMBOL_SIZE, SYMBOL_SIZE);

}

function render_reel() {

    ctx.clearRect(0, 0, can.width, can.height);

    ctx.fillStyle = "black";
    ctx.fillRect(580, 280, 760, 510);

    const aspectRatio = REELS_BG.width / REELS_BG.height;
    ctx.imageSmoothingEnabled = false;

    const centerX = (can.width - REEL_AREA_WIDTH) / 2;
    const centerY = 304;

    for (var i = 0; i < REEL_COUNT; i++) {
        for (var j = 0; j < ROW_COUNT + 1; j++) {
            const reel_index = (Math.floor(reel_position[i] / SYMBOL_SIZE) + j) % reel_positions;
            const symbol_offset = reel_position[i] % SYMBOL_SIZE;
            const symbol_index = reels[i][reel_index];
            const x = centerX + i * SYMBOL_SIZE;
            const y = centerY + j * SYMBOL_SIZE - symbol_offset;
            draw_symbol(symbol_index, x, y, i);
        }
    }
    ctx.drawImage(REELS_BG, 0, 0, aspectRatio * can.height, can.height);
    ctx.drawImage(CREDIT_PANEL, can.width * 0.80, can.height * 0.05, CREDIT_PANEL.width, CREDIT_PANEL.height)
    renderTextOnCanvas();
}

function highlight_line(line_num) {
    try {
        SND_WIN.currentTime = 0;
        SND_WIN.play();
    } catch (err) { }

    const centerX = (can.width - REEL_AREA_WIDTH) / 2;
    const centerY = 304;

    ctx.strokeStyle = "orange";
    const ss = SYMBOL_SIZE;

    function drawRect(x, y, width, height) {
        //const padding = Math.trunc(x / ss) * REEL_PADDING;
        const adjustedX = centerX + x;
        const adjustedY = centerY + y;

        ctx.strokeRect(adjustedX, adjustedY, width - 1, height - 1);
    }

    // top row
    if (line_num == 2 || line_num == 4) {
        drawRect(0, 0, ss, ss); // top left
    }
    if (line_num == 2) {
        drawRect(ss + REEL_PADDING, 0, ss, ss); // top middle
    }
    if (line_num == 2 || line_num == 5) {
        drawRect(2 * (ss + REEL_PADDING), 0, ss, ss); // top right
    }

    // middle row
    if (line_num == 1) {
        drawRect(0, ss, ss, ss); // top left
    }
    if (line_num == 1 || line_num == 4 || line_num == 5) {
        drawRect(ss + REEL_PADDING, ss, ss, ss); // top middle
    }
    if (line_num == 1) {
        drawRect(2 * (ss + REEL_PADDING), ss, ss, ss); // top right
    }

    // bottom row
    if (line_num == 3 || line_num == 5) {
        drawRect(0, 2 * ss, ss, ss); // top left
    }
    if (line_num == 3) {
        drawRect(ss + REEL_PADDING, 2 * ss, ss, ss); // top middle
    }
    if (line_num == 3 || line_num == 4) {
        drawRect(2 * (ss + REEL_PADDING), 2 * ss, ss, ss); // top right
    }
}

// render all art needed in the current frame
function render() {
    if (game_state == STATE_SPINUP || game_state == STATE_SPINDOWN) {
        if (FONTS_loaded && SYMBOLS_loaded && REELS_BG_loaded) render_reel();
    }
}

//---- Logic Functions ---------------------------------------------

function set_stops() {
    for (var i = 0; i < REEL_COUNT; i++) {
        start_slowing[i] = false;

        //var { spin, payouts } = getSpin();  //get a spin and set the stops with that spin.

        stop_index = Math.floor(Math.random() * reel_positions);
        stopping_position[i] = stop_index * SYMBOL_SIZE;

        stopping_position[i] += STOPPING_DISTANCE;
        if (stopping_position[i] >= reel_pixel_length) stopping_position[i] -= reel_pixel_length;

        // convenient here to remember the winning positions
        for (var j = 0; j < ROW_COUNT; j++) {
            result[i][j] = stop_index + j;
            if (result[i][j] >= reel_positions) result[i][j] -= reel_positions;

            // translate reel positions into symbol
            result[i][j] = reels[i][result[i][j]];
        }
    }
}

function move_reel(i) {
    reel_position[i] -= reel_speed[i];

    // wrap
    if (reel_position[i] < 0) {
        reel_position[i] += reel_pixel_length;
    }
}

// handle reels accelerating to full speed
function logic_spinup() {
    for (var i = 0; i < REEL_COUNT; i++) {
        // move reel at current speed
        move_reel(i);

        // accelerate speed
        reel_speed[i] += SPINUP_ACCELERATION;
    }

    // if reels at max speed, begin spindown
    if (reel_speed[0] == MAX_REEL_SPEED) {
        // calculate the final results now, so that spindown is ready
        set_stops();

        game_state = STATE_SPINDOWN;
    }
}

// handle reel movement as the reels are coming to rest
function logic_spindown() {
    // if reels finished moving, begin rewards
    if (reel_speed[REEL_COUNT - 1] == 0) {
        console.log("[SPIN]");
        for (line in linesToHighlight) {
            highlight_line(line);
        }
        game_state = STATE_REWARD;
    }

    for (var i = 0; i < REEL_COUNT; i++) {
        // move reel at current speed
        move_reel(i);

        // start slowing this reel?
        if (start_slowing[i] == false) {
            // if the first reel, or the previous reel is already slowing
            var check_position = false;
            if (i == 0) check_position = true;
            else if (start_slowing[i - 1]) check_position = true;

            if (check_position) {
                if (reel_position[i] == stopping_position[i]) {
                    start_slowing[i] = true;
                }
            }
        } else {
            if (reel_speed[i] > 0) {
                reel_speed[i] -= SPINDOWN_ACCELERATION;

                if (reel_speed[i] == 0) {
                    try {
                        SND_REEL_STOP[i].currentTime = 0;
                        SND_REEL_STOP[i].play();
                    } catch (err) { }
                }
            }
        }
    }
}

// count up the reward credits, play sound effects, etc.
function logic_reward() {
    if (payout == 0) {
        game_state = STATE_REST;
        return;
    }

    // don't tick up rewards each frame, too fast
    if (reward_delay_counter > 0) {
        reward_delay_counter--;
        return;
    }

    payout--;
    var metrics = ctx.measureText(`CREDITS: ${credits}`);
    credits++;
    ctx.clearRect(can.width * 0.74, ((can.height * 0.05) - (can.width * .025)), metrics.width, can.width * .025);
    drawText(ctx, "CREDITS: " + credits, can.width * 0.74, can.height * 0.05);

    if (payout < REWARD_GRAND_THRESHHOLD) {
        reward_delay_counter = REWARD_DELAY;
    } else {
        // speed up big rewards
        reward_delay_counter += REWARD_DELAY_GRAND;
    }
}

// update all logic in the current frame
function logic() {
    // REST to SPINUP happens on an input event

    if (game_state == STATE_SPINUP) {
        logic_spinup();
    } else if (game_state == STATE_SPINDOWN) {
        logic_spindown();
    } else if (game_state == STATE_REWARD) {
        logic_reward();
        $('#minigame').removeClass("pauseClose");
        STATE_SPININPROGRESS = false
    } else if (game_state == STATE_REST && $("#autoSpinButton").hasClass("on")) {
        spin();
    }
}


//---- Input Functions ---------------------------------------------

// function handleKey(evt) {
//   if (evt.keyCode == 32) { // spacebar
//     if (game_state != STATE_REST) return;

//     if (credits >= 5) spin(5);
//     else if (credits >= 3) spin(3);
//     else if (credits >= 1) spin(1);

//   }
// }

function drawText(context, color, textalign, text, x, y) {
    context.fillStyle = color;
    context.font = can.width * 0.025 + "px GraphicPixel";
    context.textAlign = textalign;
    context.fillText(text, x, y);
}

function renderTextOnCanvas() {
    if (credits != -1) {
        ctx.fillStyle = "white";
        ctx.font = can.width * 0.025 + "px GraphicPixel";
        ctx.textAlign = "left";
        var text = ctx.measureText(credits);
        drawText(ctx, "white", "center", credits, can.width * 0.80 + CREDIT_PANEL.width * 0.55, can.height * 0.05 + CREDIT_PANEL.height * 0.67);
    }
    drawText(ctx, "aqua", "left", "LINES: " + playing_lines, can.width * 0.38, can.height * 0.78);
    drawText(ctx, "aqua", "left", "BET: " + bet, can.width * 0.55, can.height * 0.78);
}

async function spin() {
    if(STATE_SPININPROGRESS) return;
    STATE_SPININPROGRESS = true;
    try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        const urlPrefix = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

        //ask server for spin
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        const spinRequest = `${urlPrefix}/session/${sessionId}/getSpin/${playing_lines}/${bet}`;
        const response = await axios.get(spinRequest);

        if (response.status === 400 && response.data.error === "Not Enough Gold") {
            // Handle "Not Enough Gold" logic here
            console.log("Not Enough Gold. You are broke!");
        }

        const { spinData, valueToPayout, winningLines } = response.data;
        payout = valueToPayout || 0;
        console.log(`spinData: ${spinData}  PAYOUT: ${payout}  winningLines: ${winningLines}`);

        linesToHighlight = winningLines;

        if (game_state != STATE_REST) return;
        if (credits < playing_lines * bet) return;

        $('#minigame').addClass("pauseClose");

        credits -= playing_lines * bet;

        render_reel();
        game_state = STATE_SPINUP;
    } catch (error) {
        console.error("Error with LuckyFUNKZ spin() function:", error.message);
    }
}

function increaseLines() {
    if (playing_lines == MAXLINES) playing_lines = 1;
    else playing_lines++;

    render_reel();
}

function increaseBet() {
    if (bet == MAXBET) bet = 1;
    else bet++;

    render_reel();
}

function setBetMax() {
    bet = MAXBET;
    render_reel();
}

//---- Init Functions -----------------------------------------------

function init() {
    $('#resources').fadeOut(300);
    // hide the in game display for gold so we can provide our own 
    // this will make sure updates applied to balance server side aren't shown prior to spin animation

    // Update minigame menu

    var addToMinigameMenu = $('<a href="#" id="mgPayouts">🎰 Payouts</a>');

    $('#minigameMenu-content').prepend(addToMinigameMenu);
    $(`#minigame`).on('click', '#mgPayouts', () => getPayoutTable(true));
    $(`#minigame`).on('click', '#autoSpinButton', () => AutoSpin_Toggle());
    $(`#minigame`).on('click', '#lineButton', () => increaseLines());
    $(`#minigame`).on('click', '#betButton', () => increaseBet());
    $(`#minigame`).on('click', '#maxBetButton', () => setBetMax());
    $(`#minigame`).on('click', '#spinButton', () => spin());

    // HTML elements
    can = document.getElementById("slotsArea"); // canvas
    ctx = can.getContext("2d"); // context
    ctx.imageSmoothingEnabled = false;

    getGoldAmount().then(goldAmount => { credits = goldAmount; render_reel(); });

    // Define font faces
    var FONTS = [
        new FontFace('GraphicPixel', `url(./apps/luckyfunkz/assets/fonts/GraphicPixel-Regular.ttf)`),
        new FontFace('256BYTES', `url(./apps/luckyfunkz/assets/fonts/256BYTES.ttf)`)
    ];

    // Load each font
    FONTS.forEach(font => {
        font.load().then(function (loadedFont) {
            document.fonts.add(loadedFont);
            checkFontsLoaded();
        }).catch(function (error) {
            console.error('Font loading failed:', error);
        });
    });

    REELS_BG.onload = function () {
        can.width = REELS_BG.naturalWidth;
        can.height = REELS_BG.naturalHeight;
        var buttonPanel = document.getElementById("buttonPanel");
        updateButtonPanelWidth(window.height, buttonPanel);

        REELS_BG_loaded = true;
        if (FONTS_loaded && SYMBOLS_loaded && REELS_BG_loaded) render_reel();
    };

    var devicePixelRatio = window.devicePixelRatio || 1;
    can.width = can.clientWidth * devicePixelRatio;
    can.height = can.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
}

function updateButtonPanelWidth(windowHeight, buttonPanel) {
    if (!buttonPanel) return;
    buttonPanel.style.height = "10%";
    //set the width as a function of height using the aspect ratio since we use height as control
    buttonPanel.style.width = windowHeight * (2 / 3) + "px";
}

function getGoldAmount() {
    return new Promise((resolve, reject) => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        var inventoryQuery = "/session/" + sessionId + "/inventory";
        axios.get(inventoryQuery).then(function (response) {
            if (response.data.resources["21300041"]) {
                //console.log(response.data.resources["21300041"]);
                resolve(response.data.resources["21300041"]);
            }
            else {
                resolve(0);
            }
        });
    });
}

// Function to check if all fonts are loaded
function checkFontsLoaded() {
    const loadedFonts = Array.from(document.fonts.values()).map(font => font.family);
    if (loadedFonts.includes('GraphicPixel') && loadedFonts.includes('256BYTES')) {
        FONTS_loaded = true;
        if (FONTS_loaded && SYMBOLS_loaded && REELS_BG_loaded) {
            render_reel();
        }
    }
}
// Function to create linear gradient
function createLinearGradient() {
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', 'fill-gradient');
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '0%');
    linearGradient.setAttribute('y2', '100%');
    linearGradient.setAttribute('spreadMethod', 'pad');

    // Define gradient stops
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

    // Add stops to gradient
    stops.forEach(stop => {
        const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stopElement.setAttribute('offset', stop.offset);
        stopElement.setAttribute('stop-color', stop.color);
        stopElement.setAttribute('stop-opacity', '1');
        linearGradient.appendChild(stopElement);
    });

    return linearGradient;
}

// Function to create SVG text element with gradient
function createSvgText(textContent) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('height', '7vh');

    // Create <defs> element
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Create linear gradient and append to defs
    const linearGradient = createLinearGradient();
    defs.appendChild(linearGradient);

    // Append defs to svg
    svg.appendChild(defs);

    // Create <text> element
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
    svgText.style.filter = 'drop-shadow(4px 4px 4px black)';

    // Append text to svg
    svg.appendChild(svgText);

    return svg;
}



// Generate the payout table container
var containerGenerated = false;
function getPayoutTable(slideout = false) {
    if (!containerGenerated) {
        const container = document.createElement('div');
        container.id = 'payoutContainer';
        container.style.transform = 'translateX(-100%)';
        $('#minigameContent').append(container);

        const payoutTable = document.createElement('table');
        container.appendChild(payoutTable);

        const headerRow = payoutTable.createTHead().insertRow();
        ['COMBINATION', 'PAYOUT/BET'].forEach(headerText => {
            const headerCell = document.createElement('th');
            const svgText = createSvgText(headerText);
            headerCell.appendChild(svgText);
            headerRow.appendChild(headerCell);
        });

        const tableBody = payoutTable.createTBody();
        var bodyRow = tableBody.insertRow();

        const wildCards = [0, 1];
        for (var i = SYMBOL_COUNT - 1; i >= 0; i--) {
            if (!wildCards.includes(i)) {
                const symbolCell = bodyRow.insertCell();
                symbolCell.classList.add('symbolCell');

                // Repeat symbol images 3 times horizontally
                for (var j = 0; j < 3; j++) {
                    const symbolImage = document.createElement('img');
                    symbolImage.src = SYMBOLS[i].src;
                    symbolCell.appendChild(symbolImage);
                }

                const payoutCell = bodyRow.insertCell();
                payoutCell.textContent = MATCH_PAYOUT[i];

                // Insert a new row for the next set of symbols
                if (i > 0) { bodyRow = tableBody.insertRow(); }
            }
        }

        // Add button to hide the table
        const closeButton = document.createElement('div');
        closeButton.classList.add('closeButton');
        closeButton.innerHTML = '<span class="material-symbols-outlined" style="font-size: 5vh; filter: drop-shadow(4px 4px 8px black); transform: translateX(30%);">arrow_back_ios</span>';
        closeButton.addEventListener('click', () => {
            gsap.to('#payoutContainer', { x: '-100%', duration: 1, ease: 'power2.inOut' });
        });
        container.appendChild(closeButton);

        // Set the flag to indicate that the container has been generated
        containerGenerated = true;
    }

    if (slideout) {
        gsap.to('#payoutContainer', {
            x: '0%', duration: 1,
            ease: 'power2.inOut',
            onStart: () => {
                // Force a redraw of the container to make its content visible during animation
                container.style.opacity = '0'; // Set opacity to 0 to hide the content initially
                requestAnimationFrame(() => {
                    container.style.opacity = '1'; // Set opacity back to 1 to show the content during animation
                });
            }
        });
    }
}



//----- Autospin Functions -----------------------------------------------
// Autospin functions
function AutoSpin_On() {
    $("#autoSpinButton").removeClass("off");
    $("#autoSpinButton").addClass("on");
}

function AutoSpin_Off() {
    $("#autoSpinButton").removeClass("on");
    $("#autoSpinButton").addClass("off");
}

function AutoSpin_Toggle() {
    if ($("#autoSpinButton").hasClass("off"))
        AutoSpin_On();
    else
        AutoSpin_Off();
}
}