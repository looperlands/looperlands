// DEFAULT MINIGAME LOADER FUNCTION
// >> Place Individual game functions at bottom

function loadMinigame(game) {
    $("#minigameprompt").removeClass("active");
    $("#minigame").addClass("active");

    // Create minigame menu
    var minigameMenu = $('<div class="minigameMenu">' +
        '<button class="menubtn">≡</button>' +
        '<div class="minigameMenu-content">' +
        '<a href="#" id="mgSettings">⚙ Settings</a>' +
        '<a href="#" id="mgClose">❌ Close Minigame</a>' +
        '</div></div>');

    // Append minigame menu and add a content container
    $("#minigame").append(minigameMenu).append('<div id="minigameContent"></div>');

    // Fetch and append minigame menu styles
    fetch('css/minigame.css')
        .then(response => response.text())
        .then(cssContent => $('head').append($('<style></style>').html(cssContent).attr('id', 'mgMenuStyle')))
        .catch(error => console.error('Error fetching CSS:', error));

    // Event listener to close minigame
    $('#mgClose').on('click', function () {
        var minigameElement = $('#minigame');

        // Apply 'pauseClose' to temporarily prevent the ability to close the app
        // EXAMPLE: For LuckyFunkz, the close function is paused during the spin process to ensure users see the spin result before closing
        // Even though the spin and result is processed server side, it enhances the user experience by visually presenting the spin outcome
        if (minigameElement.length && !minigameElement.hasClass('pauseClose')) {
            minigameElement.empty().removeClass('active');
            $('#mgMenuStyle').remove();
        }
    });
    console.log('loading: ', game);
    window[game]();
}

function loadGame(htmlFile){
    $('#minigameContent').empty().load(`${htmlFile}`);
};

/********************************************************************
 INDIVIDUAL MINIGAME FUNCTIONS TO BE SHORT, SIMPLE, AND PLACED BELOW
*********************************************************************/

function luckyfunkz(){loadGame("apps/luckyfunkz/slots.html");}