/*
^ v ^ v ^ ^ ^ ^ ^
MINIGAME PLATFORM
^ v ^ v ^ ^ ^ ^ ^
by = youLikeIt ? "bitcorn" : "anonymous";

[THE BASICS]
    TO ADD A MINIGAME:
        1. Add a Custom Property with name = "minigame" and value = "MINIGAME_NAME" to the tile in tiled you want to be the trigger
        2. Add that "MINIGAME_NAME" and the "INITIAL_FILE_TO_LOAD" to MINIGAME_FILES below.
        3. Voila
*/

const MINIGAME_FILES = {
    "luckyfunkz": "slots.html",
//  "MINIGAME_NAME": "INITIAL_FILE_TO_LOAD",
};

/*
[MORE INFO]
    EACH GAME IS DYNAMICALLY LOADED INTO IT'S OWN DIV ==> <div id="Minigame Name">
        EXAMPLE >   luckyfunkz gets put into <div id="luckyfunkz"></div> 

    TO KEEP THINGS CLEAN, TRY TO ASSIGN YOUR MINIGAME EVENTS TO YOUR SPECIFIC GAME DIV
        USAGE >     $('#luckyfunkz').on('click', '#ElementToAssignEventTo', function () { code to run on event });

    YOU CAN TEMPORARILY PAUSE THE ABILITY TO CLOSE IF NEEDED
        PAUSE >     $('#minigame').addClass("pauseClose");
      UNPAUSE >     $('#minigame').removeClass("pauseClose");

    Why would I want to prevent a user from being able to close it?
     USE CASE >     LuckyFUNKZ >> added during spin process to ensure users see the spin result before closing
                    Though the spin and result is processed server side, this enhances the user experience by
                    making sure the outcome of a spin is visually presented

[MINIGAME MENU]
    You can dynamically customize the content in this menu from your application, but note that it gets reset on each load.
    To ensure your customized menu is setup if someone loads/closes/loads your app, add an event listener in your code like this:

      EXAMPLE >     $(`#luckyfunkz`).on('fadeIn', () => setupLuckyFUNKZmenu());

                    function setupLuckyFUNKZmenu(){
                        const addToMinigameMenu = $('<a href="#" id="mgPayouts">🎰 Payouts</a>');
                        $('#minigameMenu-content').prepend(addToMinigameMenu);
                    }

*/

// CONSTANTS
const FADE_DURATION = 500;
const LOOPERLANDS_MUSIC_FADE_STEP = 0.05;
const MINIGAME_MENU = 
    '<div id="menubtn">≡</div>' +
    '<div id="minigameMenu-content">' +
    `<a href="#" id="mgMAIZfm">🌽 MAIZ.fm</a>` +
    '<a href="#" id="mgClose">❌ Close Minigame</a>' +
    '</div>';


/****************
 MINIGAME LOADER
****************/
async function loadMinigame(minigame, app) {
    console.log(`[LOADING MINIGAME: ${minigame}]`);
    
    app.audioManager.fadeOutCurrentMusic(LOOPERLANDS_MUSIC_FADE_STEP);
    $("#minigameprompt").removeClass("active");

    // MINIGAME PLATFORM INITIAL SETUP
    if ($('#minigame').length === 0) { await loadMinigamePlatform() }

    // RESETS MENU TO DEFAULT AND FADES IN MINIGAME DIV
    else { await showMinigamePlatform() }

    // LOADING INDIVIDUAL MINIGAMES 
    if ($(`#${minigame}`).length === 0) { await loadNewGame(minigame) }

    // RETRIEVING PREVIOUSLY LOADED MINIGAMES
    else { $(`#${minigame}`).fadeIn(FADE_DURATION, function () { $(`#${minigame}`).trigger('fadeIn'); }) }
}


/*******************************
MINIGAME PLATFORM INITIAL SETUP 
*******************************/
async function loadMinigamePlatform() {

    // ADD MAIN MINIGAME CONTAINER
    var minigameDiv = $('<div id="minigame" class="clickable active" style="display:none"></div>');
    if ($('#minigame').length === 0) {
        $('body').prepend(minigameDiv);
    }

    // ADD MINIGAME MENU
    $("#minigame").append(`<div id="minigameMenu"></div>`);
    $("#minigameMenu").append(MINIGAME_MENU);

    // LOAD MINIGAME.CSS
    fetch('css/minigame.css')
        .then(response => response.text())
        .then(cssContent => {
            if ($('#mgMenuStyle').length === 0) {
                $('head').append($('<style></style>').html(cssContent).attr('id', 'mgMenuStyle'));
            }
        })
        .catch(error => console.error('Error fetching CSS:', error));

    // MINIGAME MENU EVENT LISTENERS
    $(`#minigameMenu`).on('click', '#mgMAIZfm', () => loadMAIZFM());
    $('#minigameMenu').on('click', '#mgClose', () => closeMinigame());

    $('#resources').fadeOut(FADE_DURATION * 0.6); // HIDE IN GAME RESOURCES BY DEFAULT >> ALLOWS FOR A CLEANER TRANSITION
    $("#minigame").fadeIn(FADE_DURATION);
}


/******************
 LOAD NEW MINIGAME
******************/
async function loadNewGame(minigame) {
    $("#minigame").append(`<div id="${minigame}" style="display:none"></div>`);             // GAME SPECIFIC DIV CONTAINER
    await loadMinigameContent(minigame);
    $(`#${minigame}`).fadeIn(FADE_DURATION);
    setUpCloseEventListener(minigame);
}


/*************************************
 LOAD MINIGAME INTO GAME SPECIFIC DIV 
*************************************/
async function loadMinigameContent(minigame) {
    const contentUrl = `apps/${minigame}/${MINIGAME_FILES[minigame]}`;
    try {
        await new Promise((resolve, reject) => {
            $(`#${minigame}`).load(contentUrl, function (response, status, xhr) {
                if (status === "error") { reject(xhr.statusText); }
                else { resolve(); }
            });
        });
    } catch (error) {
        console.error(`Error loading minigame content for ${minigame}: ${error}`);
        // ADD MESSAGE HERE TO NOTIFY PLAYER
    }
}


/*********************************************
 EVENT LISTENER FOR CLOSING SPECIFIC MINIGAME
*********************************************/
function setUpCloseEventListener(minigame) {
    $('#minigame').on('click', '#mgClose', function () {
        const minigameElement = $('#minigame');
        const specificMinigame = $(`#${minigame}`);
        if (specificMinigame.length && specificMinigame.css('display') !== 'none' && minigameElement.length && !minigameElement.hasClass('pauseClose')) {
            // On unload, content is hidden instead of removed, if needed again, it's faded back in.
            // This helps avoid issues with embedded js files that is caused when loading/unloading the same content multiple times
            specificMinigame.fadeOut(FADE_DURATION);
        }
    });
}


/*********************************************
 RESET MINIGAME PLATFORM TO DEFAULTS AND SHOW
*********************************************/
async function showMinigamePlatform() {
    $('#minigameMenu').empty().append(MINIGAME_MENU);   // CLEAR AND RESET MENU
    $('#resources').fadeOut(FADE_DURATION * 0.6);       // HIDE IN GAME RESOURCES BY DEFAULT >> ALLOWS FOR A CLEANER TRANSITION
    $("#minigame").addClass("clickable active");
    $("#minigame").fadeIn(FADE_DURATION);
}


/************************
 CLOSE MINIGAME PLATFORM
************************/
function closeMinigame(){
    var minigameElement = $('#minigame');
        if (minigameElement.length && !minigameElement.hasClass('pauseClose')) {

            minigameElement.removeClass("clickable active");
            minigameElement.fadeOut(FADE_DURATION);

            if ($('#resources').children().length === 0) {
                //IN GAME RESOURCE DISPLAY HIDDEN
                $('#resources').fadeIn(FADE_DURATION * 0.6).addClass('hidden');
            } else {
                // NEED TO TRIGGER A RESOURCE REFRESH HERE
                $('#resources').fadeIn(FADE_DURATION * 0.6);
            }
        }
}


/*************
 LOAD MAIZ.FM
*************/
function loadMAIZFM(){
    var MAIZfmDiv = $('<div id="MAIZfm-container"></div>');
    if ($('#MAIZfm-container').length === 0) {
        $(`#minigame`).prepend(MAIZfmDiv);
        $('#MAIZfm-container').load(`apps/MAIZfm/MAIZfm.html`).fadeIn(FADE_DURATION);
    } else {
        $('#MAIZfm-container').fadeIn(FADE_DURATION);
    }
}