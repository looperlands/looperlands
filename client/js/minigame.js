function openMinigame(game){
    $("#minigameprompt").removeClass("active");
    $("#minigame").addClass("active");
    window[game]();   
}

function closeMinigame(game){
    $("#minigame").removeClass("active");  
}

//PLACE ALL GAME STARTING FUNCTIONS BELOW HERE

function luckyfunkz(){
    $('#minigame').load("apps/luckyfunkz/slots.html");
}