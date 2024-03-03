function StartMinigame(game){
    $("#minigameprompt").removeClass("active");
    $("#minigame").addClass("active");
    window[game]();   
}

function slots(){
    $('#minigame').load("apps/luckyfunkz/slots.html");
}