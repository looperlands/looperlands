const gameLookup = {
    "luckyfunkz": "slots.html",
    //"Minigame Name": "Initial File to Load"
};

//NOTE: FOR ANY ON-CLICK EVENTS (OR OTHER ON EVENTS) FOLLOW THIS EXAMPLE:
// $(`#minigame`).on('click', '#mgPayouts', () => getPayoutTable(true));
// You want to tie all your on events to minigame, so they will be properly removed when unloaded.

//////////////////////////////
// MINIGAME LOADER FUNCTION //
//////////////////////////////

function loadMinigame(minigame, app) {
    app.audioManager.fadeOutCurrentMusic();
    $("#minigameprompt").removeClass("active");

    var minigameDiv = $('<div id="minigame" class="clickable active"></div>');
    if ($('#minigame').length === 0) {
        $('body').prepend(minigameDiv);
    }

    // Create minigame menu
    var minigameMenu = $('<div id="minigameMenu" style="display:none">' +
        '<div id="menubtn">≡</div>' +
        '<div id="minigameMenu-content">' +
        `<a href="#" id="mgMAIZfm">🌽 MAIZ.fm</a>` +
        //'<a href="#" id="mgSettings">⚙ Settings</a>' + //hiding settings menu for now, we'll add this later.
        '<a href="#" id="mgClose">❌ Close Minigame</a>' +
        '</div></div>');

    // Append minigame menu and add a content container
    $("#minigame").empty().append(minigameMenu).append('<div id="minigameContent" style="display:none"></div>');

    // Fetch and append minigame menu styles
    fetch('css/minigame.css')
        .then(response => response.text())
        .then(cssContent => {
            if ($('#mgMenuStyle').length === 0) {
                $('head').append($('<style></style>').html(cssContent).attr('id', 'mgMenuStyle'));
            }
        })
        .catch(error => console.error('Error fetching CSS:', error));

    // Event listener to load MAIZfm
    $(`#minigame`).on('click', '#mgMAIZfm', function () {
        var MAIZfmDiv = $('<div id="MAIZfm-container"></div>');
        if ($('#MAIZfm-container').length === 0) {
            $('body').prepend(MAIZfmDiv);
            $('#MAIZfm-container').empty().load(`apps/MAIZfm/MAIZfm.html`).fadeIn(500);
        } else {
            $('#MAIZfm-container').fadeIn(500);
        }
    });

    // Event listener to close minigame
    $('#minigame').on('click', '#mgClose', function () {
        var minigameElement = $('#minigame');
        // Apply 'pauseClose' to temporarily prevent the ability to close the app
        // EXAMPLE: For LuckyFunkz, the close function is paused during the spin process to ensure users see the spin result before closing
        // Even though the spin and result is processed server side, it enhances the user experience by visually presenting the spin outcome
        if (minigameElement.length && !minigameElement.hasClass('pauseClose')) {
            minigameElement.fadeOut(500, function () {
                $(this).off();
                $(this).remove();
                $('#mgMenuStyle').remove();
            });

            if ($('#resources').children().length === 0) {  //update visuals for resources on exit
                $('#resources').fadeIn(300).addClass('hidden');
            } else {
                $('#resources').fadeIn(300);
            }
        }
    });

    $('#minigameContent').empty().load(`apps/${minigame}/${gameLookup[minigame]}`);
    $('#minigameContent').fadeIn(500)
    $("#minigameMenu").fadeIn(500);
}