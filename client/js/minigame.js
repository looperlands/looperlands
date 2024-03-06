const gameLookup = {
  "luckyfunkz": "slots.html",
//"Minigame Name": "Initial File to Load"
};

//////////////////////////////
// MINIGAME LOADER FUNCTION //
//////////////////////////////

function loadMinigame(game) {
    $("#minigameprompt").removeClass("active");

    var minigameDiv = $('<div id="minigame" class="clickable active"></div>');
    if ($('#minigame').length === 0){
        $('body').prepend(minigameDiv);
    }

    // Create minigame menu
    var minigameMenu = $('<div id="minigameMenu">' +
        '<div id="menubtn">≡</div>' +
        '<div id="minigameMenu-content">' +
        '<a href="#" id="mgSettings">⚙ Settings</a>' +
        '<a href="#" id="mgClose">❌ Close Minigame</a>' +
        '</div></div>');

    // Append minigame menu and add a content container
    $("#minigame").empty().append(minigameMenu).append('<div id="minigameContent"></div>');

    // Fetch and append minigame menu styles
    fetch('css/minigame.css')
        .then(response => response.text())
        .then(cssContent => {
                if ($('#mgMenuStyle').length === 0){
                    $('head').append($('<style></style>').html(cssContent).attr('id', 'mgMenuStyle'));
                }
            })
        .catch(error => console.error('Error fetching CSS:', error));

    // Event listener to close minigame
    $('#mgClose').on('click', function () {
        var minigameElement = $('#minigame');
        // Apply 'pauseClose' to temporarily prevent the ability to close the app
        // EXAMPLE: For LuckyFunkz, the close function is paused during the spin process to ensure users see the spin result before closing
        // Even though the spin and result is processed server side, it enhances the user experience by visually presenting the spin outcome
        if (minigameElement.length && !minigameElement.hasClass('pauseClose')) {
            minigameElement.remove();
            $('#mgMenuStyle').remove();
        }
    });

    $('#minigameContent').empty().load(`apps/${game}/${gameLookup[game]}`);
}