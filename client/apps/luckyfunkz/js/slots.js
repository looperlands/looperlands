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
Art by Clint Bellanger (CC-BY 3.0)
*/

var FPS = 120;
setInterval(function () {
    logic();
    render();
}, 1000 / FPS);

// html elements
var scale = 5;
var can; // canvas
var ctx; // context
var credit_div; // credits paragraph
var lines_div; // lines paragraph
var bet_div; // bet paragraph

var font_loaded = false;
var symbols_loaded = false;
var reels_bg_loaded = false;

// art
var symbols = [];
var symbol_count = 12;
var loadedSymbolCount = 0;

for (var i = 0; i < symbol_count; i++) {
    var symbol = new Image();
    symbol.onload = function () {
        loadedSymbolCount++;
        if (loadedSymbolCount == symbol_count) {
            symbols_loaded = true;
                        if (font_loaded && symbols_loaded && reels_bg_loaded) render_reel();
        }
    };
    symbol.src = `./apps/luckyfunkz/assets/images/symbols/${i.toString().padStart(2, "0")}.png`;
    symbols.push(symbol);
}

var reels_bg = new Image();
reels_bg.src = "./apps/luckyfunkz/assets/images/ui/background/LuckyFUNKZ.png";

var credit_panel = new Image();
credit_panel.src = "./apps/luckyfunkz/assets/images/ui/panels/credit_panel.png";

var snd_win;
snd_win = new Audio("apps/luckyfunkz/assets/audio/win.wav");

var snd_reel_stop = new Array();
snd_reel_stop[0] = new Audio("apps/luckyfunkz/assets/audio/reel_stop.wav");
snd_reel_stop[1] = new Audio("apps/luckyfunkz/assets/audio/reel_stop.wav");
snd_reel_stop[2] = new Audio("apps/luckyfunkz/assets/audio/reel_stop.wav");

// enums
var STATE_REST = 0;
var STATE_SPINUP = 1;
var STATE_SPINDOWN = 2;
var STATE_REWARD = 3;

// config
var symbol_size = 32 * scale;
var reel_count = 3;
var reel_padding = 8;

var row_count = 3;
var stopping_distance = 528 * scale;
var max_reel_speed = symbol_size;
var spinup_acceleration = 2;
var spindown_acceleration = 1;
var reward_delay = 3; // how many frames between each credit tick
var reward_delay_grand = 1; // delay for grand-prize winning
var reward_grand_threshhold = 25; // count faster if the reward is over this size
var bet = 1;
var maxBet = 3;
var maxLines = 3;
var linesToHighlight = [];

var match_payout = new Array(symbol_count);
//payouts for symbol 1 through 11 (index 0 through 10)
/*
0 King	//wild
1 Queen	//wild
2 Standard
3 Fish
4 Clown
5 General
6 Choco
7 tacOS
8 Punk
9 Zombie
10 DocGuac
11 Bassmint

combinations
11	1337 1
10	741	 2
9	420	 2
8	69	 24 (trip wild included here)
7	42	 36
6	21	 36
5	10	 48
4	5	 64
3	2	 64
2	1	 128
*/

match_payout = [0, 0, 1, 4, 7, 13, 42, 69, 350, 1337, 9001, 42069];
var wildCards = [0, 1];

var reel_area_width = symbol_size * reel_count + reel_padding * (reel_count - 1);
var reel_area_height = symbol_size * row_count;
var reel_area_left = 78 + symbol_size / 2;
var reel_area_top = 0;

// set up reels
var reels = new Array(reel_count);
reels[0] = new Array(2, 1, 7, 1, 2, 7, 6, 7, 3, 10, 1, 6, 1, 7, 3, 4, 11, 3, 2, 4, 5, 0, 6, 10, 5, 6, 5, 8, 3, 0, 9, 5, 4);
reels[1] = new Array(6, 0, 10, 3, 6, 11, 7, 9, 2, 5, 2, 3, 1, 5, 2, 1, 10, 4, 5, 8, 4, 7, 6, 0, 1, 7, 6, 3, 1, 5, 9, 7, 4);
reels[2] = new Array(1, 4, 2, 7, 5, 6, 4, 10, 7, 5, 2, 0, 6, 4, 10, 1, 7, 6, 3, 0, 5, 7, 2, 3, 11, 9, 3, 5, 6, 1, 8, 1, 3);
var reel_positions = Math.min(reels[0].length, reels[1].length, reels[2].length);
var reel_pixel_length = reel_positions * symbol_size;

var reel_position = new Array(reel_count);
for (var i = 0; i < reel_count; i++) {
    reel_position[i] = Math.floor(Math.random() * reel_positions) * symbol_size;
}

var stopping_position = new Array(reel_count);
var start_slowing = new Array(reel_count);

// reel spin speed in pixels per frame
var reel_speed = new Array(reel_count);
for (var i = 0; i < reel_count; i++) {
    reel_speed[i] = 0;
}

var result = new Array(reel_count);
for (var i = 0; i < reel_count; i++) {
    result[i] = new Array(row_count);
}

var game_state = STATE_REST;
var credits = -1;
var payout = 0;
var reward_delay_counter = 0;
var playing_lines = 1;

//---- Render Functions ---------------------------------------------
function draw_symbol(symbol_index, x, y, reel) {
    ctx.fillStyle = reel === 0 ? "fuchsia" : reel === 1 ? "lime" : "cyan";
    const fillX = x + reel * reel_padding;
    const fillY = y;

    ctx.fillRect(fillX, fillY, symbol_size, symbol_size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(symbols[symbol_index], fillX, fillY, symbol_size, symbol_size);
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.trunc(scale / 2 + 1);
    ctx.strokeRect(fillX, fillY, symbol_size, symbol_size);

}

function render_reel() {

    ctx.clearRect(0, 0, can.width, can.height);

    ctx.fillStyle = "black";
    ctx.fillRect(580, 280, 760, 510);

    const aspectRatio = reels_bg.width / reels_bg.height;
    ctx.imageSmoothingEnabled = false;

    const centerX = (can.width - reel_area_width) / 2;
    const centerY = 304;

    for (var i = 0; i < reel_count; i++) {
        for (var j = 0; j < row_count + 1; j++) {
            var reel_index = (Math.floor(reel_position[i] / symbol_size) + j) % reel_positions;
            var symbol_offset = reel_position[i] % symbol_size;
            var symbol_index = reels[i][reel_index];
            var x = centerX + i * symbol_size;
            var y = centerY + j * symbol_size - symbol_offset;
            draw_symbol(symbol_index, x, y, i);
        }
    }
    ctx.drawImage(reels_bg, 0, 0, aspectRatio * can.height, can.height);
    ctx.drawImage(credit_panel, can.width * 0.80, can.height * 0.05, credit_panel.width, credit_panel.height)
    renderTextOnCanvas();
}

function highlight_line(line_num) {
    const centerX = (can.width - reel_area_width) / 2;
    const centerY = 304;

    ctx.strokeStyle = "orange";
    var ss = symbol_size;

    function drawRect(x, y, width, height) {
        const padding = Math.trunc(x / ss) * reel_padding;
        const adjustedX = centerX + x;
        const adjustedY = centerY + y;

        ctx.strokeRect(adjustedX, adjustedY, width - 1, height - 1);
    }

    // top row
    if (line_num == 2 || line_num == 4) {
        drawRect(0, 0, ss, ss); // top left
    }
    if (line_num == 2) {
        drawRect(ss + reel_padding, 0, ss, ss); // top middle
    }
    if (line_num == 2 || line_num == 5) {
        drawRect(2 * (ss + reel_padding), 0, ss, ss); // top right
    }

    // middle row
    if (line_num == 1) {
        drawRect(0, ss, ss, ss); // top left
    }
    if (line_num == 1 || line_num == 4 || line_num == 5) {
        drawRect(ss + reel_padding, ss, ss, ss); // top middle
    }
    if (line_num == 1) {
        drawRect(2 * (ss + reel_padding), ss, ss, ss); // top right
    }

    // bottom row
    if (line_num == 3 || line_num == 5) {
        drawRect(0, 2 * ss, ss, ss); // top left
    }
    if (line_num == 3) {
        drawRect(ss + reel_padding, 2 * ss, ss, ss); // top middle
    }
    if (line_num == 3 || line_num == 4) {
        drawRect(2 * (ss + reel_padding), 2 * ss, ss, ss); // top right
    }
}

// render all art needed in the current frame
function render() {
    if (game_state == STATE_SPINUP || game_state == STATE_SPINDOWN) {
        if (font_loaded && symbols_loaded && reels_bg_loaded) render_reel();
    }
}

//---- Logic Functions ---------------------------------------------

function set_stops() {
    for (var i = 0; i < reel_count; i++) {
        start_slowing[i] = false;

        const { spin, payouts } = getSpin();  //get a spin and set the stops with that spin.

        stop_index = Math.floor(Math.random() * reel_positions);
        stopping_position[i] = stop_index * symbol_size;

        stopping_position[i] += stopping_distance;
        if (stopping_position[i] >= reel_pixel_length) stopping_position[i] -= reel_pixel_length;

        // convenient here to remember the winning positions
        for (var j = 0; j < row_count; j++) {
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
    for (var i = 0; i < reel_count; i++) {
        // move reel at current speed
        move_reel(i);

        // accelerate speed
        reel_speed[i] += spinup_acceleration;
    }

    // if reels at max speed, begin spindown
    if (reel_speed[0] == max_reel_speed) {
        // calculate the final results now, so that spindown is ready
        set_stops();

        game_state = STATE_SPINDOWN;
    }
}

// handle reel movement as the reels are coming to rest
function logic_spindown() {
    // if reels finished moving, begin rewards
    if (reel_speed[reel_count - 1] == 0) {
        console.log("[SPIN]");
        for(line in linesToHighlight){
            highlight_line(line);
        }
        game_state = STATE_REWARD;
    }

    for (var i = 0; i < reel_count; i++) {
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
                reel_speed[i] -= spindown_acceleration;

                if (reel_speed[i] == 0) {
                    try {
                        snd_reel_stop[i].currentTime = 0;
                        snd_reel_stop[i].play();
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

    if (payout < reward_grand_threshhold) {
        reward_delay_counter = reward_delay;
    } else {
        // speed up big rewards
        reward_delay_counter += reward_delay_grand;
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
    } else if (game_state == STATE_REST && $("#autoSpinButton").hasClass("on")) {
        spin();
    }
}

function calc_line(s1, s2, s3) {
    console.log(`${s1}:${s2}:${s3}`);
    const isWild = (symbol) => wildCards.includes(symbol);

    // Perfect match
    if (s1 === s2 && s2 === s3) return match_payout[s1] * bet;

    // Wildcard with two of a kind
    if (isWild(s1) && s2 === s3) return match_payout[s2] * bet;
    if (isWild(s2) && s1 === s3) return match_payout[s1] * bet;
    if (isWild(s3) && s1 === s2) return match_payout[s1] * bet;

    // Double Wildcard
    if (isWild(s2) && isWild(s3)) return match_payout[s1] * bet;
    if (isWild(s1) && isWild(s3)) return match_payout[s2] * bet;
    if (isWild(s1) && isWild(s2)) return match_payout[s3] * bet;

    // No reward
    return 0;
}

// calculate the reward
function calc_reward() {
    payout = 0;

    // Define the lines to check
    const linesToCheck = [
        { row: 1, cells: [result[0][1], result[1][1], result[2][1]] }, //middle row
        { row: 2, cells: [result[0][0], result[1][0], result[2][0]] }, //top row
        { row: 3, cells: [result[0][2], result[1][2], result[2][2]] }, //bottom row
        { row: 4, cells: [result[0][0], result[1][1], result[2][2]] }, //TL-BR diagonal
        { row: 5, cells: [result[0][2], result[1][1], result[2][0]] }, //BL-TR diagonal
    ];

    // Loop through lines and check for payouts
    for (const line of linesToCheck.slice(0, playing_lines)) {
        const partial_payout = calc_line(...line.cells);
        if (partial_payout > 0) {
            payout += partial_payout;
            highlight_line(line.row);
        }
    }

    // Play win sound if there's a payout
    if (payout > 0) {
        console.log(">>>>> PAYOUT: ", payout);
        try {
            snd_win.currentTime = 0;
            snd_win.play();
        } catch (err) { }
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
        let text = ctx.measureText(credits);
        drawText(ctx, "white", "center", credits, can.width * 0.80 + credit_panel.width * 0.55, can.height * 0.05 + credit_panel.height * 0.67);
    }
    drawText(ctx, "aqua", "left", "LINES: " + playing_lines, can.width * 0.38, can.height * 0.78);
    drawText(ctx, "aqua", "left", "BET: " + bet, can.width * 0.55, can.height * 0.78);
}

async function spin() {

    //ask server for spin
    let {spinData, valueToPayout, winningLines} = await getSpin(playing_lines, bet);
    payout = valueToPayout;
    linesToHighlight = winningLines;

    //This should only occur
    if(spinData == "Low Funds"){
        //Send message to player that they are broke !$$$
        return;
    }



    //Code below works but does not interact with server
    // if (game_state != STATE_REST) return;
    // if (credits < playing_lines * bet) return;

    // $('#minigame').addClass("pauseClose");

    // credits -= playing_lines * bet;

    render_reel();
    game_state = STATE_SPINUP;
}

function increaseLines() {
    if (playing_lines == maxLines) playing_lines = 1;
    else playing_lines++;

    render_reel();
}

function increaseBet() {
    if (bet == maxBet) bet = 1;
    else bet++;

    render_reel();
}

function setBetMax() {
    bet = maxBet;
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
    $(document).on('click', '#mgPayouts', () => getPayoutTable(true));

    can = document.getElementById("slotsArea");
    ctx = can.getContext("2d");
    ctx.imageSmoothingEnabled = false;


    
    getGoldAmount().then(goldAmount => { credits = goldAmount; render_reel(); });

// Define font faces
const fonts = [
    new FontFace('GraphicPixel', `url(./apps/luckyfunkz/assets/fonts/GraphicPixel-Regular.ttf)`),
    new FontFace('256BYTES', `url(./apps/luckyfunkz/assets/fonts/256BYTES.ttf)`)
];

// Load each font
fonts.forEach(font => {
    font.load().then(function (loadedFont) {
        document.fonts.add(loadedFont);
        checkFontsLoaded();
    }).catch(function (error) {
        console.error('Font loading failed:', error);
    });
});

    reels_bg.onload = function () {
        can.width = reels_bg.naturalWidth;
        can.height = reels_bg.naturalHeight;
        var buttonPanel = document.getElementById("buttonPanel");
        updateButtonPanelWidth(window.height, buttonPanel);

        reels_bg_loaded = true;
        if (font_loaded && symbols_loaded && reels_bg_loaded) render_reel();
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
        let inventoryQuery = "/session/" + sessionId + "/inventory";
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
        font_loaded = true;
        if (font_loaded && symbols_loaded && reels_bg_loaded) {
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
        { offset: '15%', color: '#F0F' },
        { offset: '40%', color: '#0FF' },
        { offset: '60%', color: '#0FF' },
        { offset: '74%', color: '#FFF' },
        { offset: '78%', color: '#777' },
        { offset: '85%', color: '#F0F' },
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
    svgText.setAttribute('y', '50%');
    svgText.setAttribute('text-anchor', 'middle');
    svgText.textContent = textContent;

    // Apply additional styles directly to the <text> element
    svgText.style.fill = 'url(#fill-gradient)';
    svgText.style.stroke = 'rgba(255, 255, 255, 0.8)';
    svgText.style.strokeWidth = '0.5px';

    // Append text to svg
    svg.appendChild(svgText);

    return svg;
}



// Generate the payout table container
let containerGenerated = false;
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
        const bodyRow = tableBody.insertRow();

        for (let i = symbol_count - 1; i >= 0; i--) {
            if (!wildCards.includes(i)) {
                const symbolCell = bodyRow.insertCell();
                symbolCell.classList.add('symbolCell');

                // Repeat symbol images 3 times horizontally
                for (let j = 0; j < 3; j++) {
                    const symbolImage = document.createElement('img');
                    symbolImage.src = symbols[i].src;
                    symbolCell.appendChild(symbolImage);
                }

                const payoutCell = bodyRow.insertCell();
                payoutCell.textContent = match_payout[i];

                // Insert a new row for the next set of symbols
                if(j<3){bodyRow = tableBody.insertRow();}
            }
        }

        // Add button to hide the table
        const closeButton = document.createElement('div');
        closeButton.classList.add('closeButton');
        closeButton.innerHTML = '<span class="material-symbols-outlined">arrow_back_ios</span>';
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