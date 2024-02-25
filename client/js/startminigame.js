function slotsButtonClick(){
    console.log("Slots button pressed!");
    $("#slotsprompt").removeClass("active");
    $("#minigame").addClass("active");
    $('#minigame').load("../slots.html");
}