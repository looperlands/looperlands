function slotsButtonClick(){
    console.log("Slots button pressed!");
    $("#minigameprompt").removeClass("active");
    $("#minigame").addClass("active");
    $('#minigame').load("apps/luckyfunkz/slots.html");
}