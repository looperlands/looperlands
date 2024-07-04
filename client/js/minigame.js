const MINIGAME_FILES = {
    "luckyfunkz": "LuckyFUNKZ.html",
    "JackAce": "jackace.html",
    //  "YOUR_MINIGAME_NAME": "INITIAL_FILE_TO_LOAD",
};

// if module javascript, add js file with init() function
const MODULE_INIT = {
    //"JackAce": "js/jackace.js"
    //  "YOUR_MINIGAME_NAME": "module js file",
};

/*  
^ v ^ v ^ ^ ^ ^ ^
MINIGAME PLATFORM
^ v ^ v ^ ^ ^ ^ ^
by = youLikeIt ? "bitcorn" : "anonymous";

[TO ADD A MINIGAME]
    1. In Tiled: Add custom property name = "minigame" with value = "YOUR_MINIGAME_NAME" to an area trigger (layer = triggers)
    2. Place game files under client/apps inside a folder named "YOUR_MINIGAME_NAME"
    3. Add "YOUR_MINIGAME_NAME" with the "INITIAL_FILE_TO_LOAD" to MINIGAME_FILES above.
    4. If your game is module js (uses import), add the name of your main js file with an init() function in MODULE_INIT.
    5. Voila 

[MORE INFO]
    EACH GAME IS DYNAMICALLY LOADED INTO ITS OWN DIV ==> <div id="YOUR_MINIGAME_NAME">
      EXAMPLE >     luckyfunkz gets put into <div id="luckyfunkz"></div> 

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
    You can dynamically customize the content in the menu from your application, give your custom items a class equal to your minigame name.
*/

// CONSTANTS
const FADE_DURATION = 0.5; // in seconds for GSAP
const KEYDOWN_REGISTER_DELAY = 1000;
const LOOPERLANDS_MUSIC_FADE_STEP = 0.05;
const MINIGAME_MENU =
    '<div id="menubtn" class="original-menu">MENU</div>' +
    '<div id="minigameMenu-content" class="original-menu">' +
    '<a href="#" id="mgMAIZfm" class="original-menu">🌽 MAIZ.fm</a>' +
    '<a href="#" id="mgClose" class="original-menu">❌ Close Minigame</a>' +
    '</div>';


/****************
 MINIGAME LOADER
****************/
async function loadMinigame(minigame, app) {
    if (app.audioManager) { app.audioManager.fadeOutCurrentMusic(LOOPERLANDS_MUSIC_FADE_STEP); }
    $("#minigameprompt").removeClass("active").css('transform', 'none').off();
    await setupMinigamePlatform();
    await loadSpecificMinigame(minigame);
    $(`.${minigame}`).removeClass('hidden'); //show specific minigame menu elements

    setTimeout(() => {
        $(document).on('keydown', minigameKeyDown);
    }, KEYDOWN_REGISTER_DELAY); // Adding delay to ensure the event is registered
}


/******************
 MINIGAME PLATFORM 
*******************/
async function setupMinigamePlatform() {
    if ($('#minigame').length === 0) {
        // ADD MAIN MINIGAME CONTAINER
        var minigameDiv = $('<div id="minigame" class="clickable active hidden"></div>');
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
        $(`#minigameMenu`).on('click', '#mgMAIZfm', () => loadMAIZFM());
    } else {
        $('#minigameMenu').find('*').not('.original-menu').addClass('hidden');
        $("#minigame").addClass("clickable active");
    }

    // MINIGAME MENU EVENT LISTENERS
    $('#resources').fadeOut(FADE_DURATION * 1000 * 0.6);   // HIDE IN GAME RESOURCES BY DEFAULT >> ALLOWS FOR A CLEANER TRANSITION
    $("#minigame").css('opacity', 0).removeClass('hidden');
    gsap.to("#minigame", { opacity: 1, duration: FADE_DURATION });
}


/***********************
 LOAD SPECIFIC MINIGAME
***********************/
async function loadSpecificMinigame(minigame) {
    console.log(`[LOADING MINIGAME: ${minigame}]`);
    if ($(`#${minigame}`).length === 0) {
        $("#minigame").append(`<div id="${minigame}" style="height:100%; width:100%; opacity:0;"></div>`);  // GAME SPECIFIC DIV CONTAINER
        await injectMinigameContent(minigame);
        gsap.to(`#${minigame}`, { opacity: 1, duration: FADE_DURATION });
    } else {
        $(`#${minigame}`).css('opacity', 0).removeClass('hidden');
        gsap.to([`#${minigame}`, `.${minigame}`], { opacity: 1, duration: FADE_DURATION });
        $(document).trigger(`fadeIn_${minigame}`);
    }

    $('#minigame').off('click', '#mgClose').on('click', '#mgClose', function () {
        closeSpecificMinigame(minigame);
    });
}


/***************************************
 INJECT MINIGAME INTO GAME SPECIFIC DIV 
***************************************/
async function injectMinigameContent(minigame) {
    const contentUrl = `apps/${minigame}/${MINIGAME_FILES[minigame]}`;
    try {
        await new Promise((resolve, reject) => {
            $(`#${minigame}`).load(contentUrl, function (response, status, xhr) {
                if (status === "error") { reject(xhr.statusText); }
                else { resolve(); }
            });
        });

        // Check if the minigame has a module JavaScript file to load
        if (MODULE_INIT[minigame]) {
            try {
                const minigameModule = await import(`../apps/${minigame}/${MODULE_INIT[minigame]}`);
                if (typeof minigameModule.init === 'function') {
                    minigameModule.init();
                }
            } catch (error) {
                console.error(`Error loading minigame module for ${minigame}: ${error}`);
            }
        }
    } catch (error) {
        console.error(`Error loading minigame content for ${minigame}: ${error}`);
        // ADD MESSAGE HERE TO NOTIFY PLAYER
    }
}


/************************
 CLOSE MINIGAME PLATFORM
************************/
function closeSpecificMinigame(minigame) {
    var minigameElement = $('#minigame');
    var specificMinigameElement = $(`#${minigame}`);
    if (minigameElement.length && !minigameElement.hasClass('pauseClose')) {
        minigameElement.removeClass("clickable active");

        // Create a GSAP timeline for simultaneous animations
        const tl = gsap.timeline();

        // Fade out minigameElement, #resources-minigame, and specific minigame simultaneously
        tl.to([minigameElement, '#resources-minigame', specificMinigameElement], { opacity: 0, duration: FADE_DURATION }).then(() => {
            minigameElement.addClass('hidden');
            $('#resources-minigame').addClass('hidden');
            specificMinigameElement.addClass('hidden');
        });

        if ($('#resources').children().length > 0) {
            // REFRESH GOLD AMOUNT
            const GOLD = "21300041";
            getGoldAmount(GOLD).then(goldAmount => {
                gsap.to('#resources', { opacity: 1, duration: FADE_DURATION * 0.6 }).then(() => {
                    $('#resources').fadeIn();
                    $(`#resource-${GOLD} .amount`).text(goldAmount);
                });
            });
        }

        // Hide the specific minigame menu elements
        $(`.${minigame}`).addClass('hidden');
    }
}



// HANDLE ESC PRESS
function minigameKeyDown(event) {
    if (event.which === 27 && $("#minigame").css("display") !== "none") {
        $('#mgClose')[0].click();   //note: trigger('click') doesn't always work, had to use this version
    }
}

// GET PLAYER GOLD BALANCE FROM SERVER
function getGoldAmount(GOLD) {
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


/*************
 LOAD MAIZ.FM
*************/
function loadMAIZFM() {
    var MAIZfmDiv = $('<div id="MAIZfm-container"></div>');
    if ($('#MAIZfm-container').length === 0) {
        $(`#minigame`).prepend(MAIZfmDiv);
        gsap.to('#MAIZfm-container', { opacity: 0 }).then(() => {
            $('#MAIZfm-container').load(`apps/MAIZfm/MAIZfm.html`);
            gsap.to('#MAIZfm-container', { opacity: 1, duration: FADE_DURATION });
        });
    } else {
        gsap.to('#MAIZfm-container', { opacity: 1, duration: FADE_DURATION });
    }
}
