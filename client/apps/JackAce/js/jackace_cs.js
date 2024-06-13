export async function init() {
    $('#uiWindow').empty();
    $('#uiWindow').append(`
    <div id="bet-window">
      <div id="bet_increase"></div>
      <div id="bet_amount"></div>
      <div id="bet_decrease"></div>
      <div id="deal"></div>
    </div>
    <div id="hit-stand-window" class="hidden">
      <div id="hit"></div>
      <div id="stand"></div>
      <div id="splitDouble" class="hidden">
        <div id="split"></div>
        <div id="double"></div>
      </div>
    </div>
    <div id="insurance" class="hidden">
      <div id="ins-yes"></div>
      <div id="ins-no"></div>
    </div>
  `);

    await setGameWindow('bet');
    setUpButtonEvents();

}
function setUpButtonEvents() {
    const buttons = [
        { id: '#bet_increase', hoverState: 'betIncreaseHover', defaultState: 'betIncrease', clickFunction: () => betAdjustClick('increase') },
        { id: '#bet_decrease', hoverState: 'betDecreaseHover', defaultState: 'betDecrease', clickFunction: () => betAdjustClick('decrease') },
        { id: '#deal', hoverState: 'dealHover', defaultState: 'deal', clickFunction: dealClick },
        { id: '#hit', hoverState: 'hitHover', defaultState: 'hit', clickFunction: hitClick },
        { id: '#stand', hoverState: 'standHover', defaultState: 'stand', clickFunction: standClick },
        { id: '#double', hoverState: 'doubleHover', defaultState: 'double', clickFunction: doubleClick },
        { id: '#split', hoverState: 'splitHover', defaultState: 'split', clickFunction: splitClick },
        { id: '#ins-yes', hoverState: 'yesHover', defaultState: 'yes', clickFunction: () => insuranceClick('yes') },
        { id: '#ins-no', hoverState: 'noHover', defaultState: 'no', clickFunction: () => insuranceClick('no') }
    ];

    buttons.forEach(async ({ id, hoverState, defaultState, clickFunction }) => {
        $(id).on('click', clickFunction);
        $(id).hover(
            async function () {
                if (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive')) {
                    const position = await getButtonBackgroundPosition(hoverState);
                    $(this).css('background-position', position);
                }
            },
            async function () {
                if (!$("#uiWindow").hasClass('processing') && !$(this).hasClass('inactive')) {
                    const position = await getButtonBackgroundPosition(defaultState);
                    $(this).css('background-position', position);
                }
            }
        );
    });
}

async function handleAction(action) {
    if (!$("#uiWindow").hasClass('processing')) {
        $("#uiWindow").addClass('processing');
        await action();
        $("#uiWindow").removeClass('processing');
    }
}

function dealClick() {
    handleAction(async () => {
        $("#handResult").empty();
        if (playerBet > 0) {
            const response = await fetch('/deal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player: playerId,
                    betAmount: playerBet,
                })
            });
            const data = await response.json();
        } else {
            $("#handResult").append("Place a bet to start the game.");
        }
    });
}

function hitClick() {
    handleAction(async () => {
        $('#splitDouble').addClass('hidden');

    });
}

function standClick() {
    handleAction(async () => {
        $('#splitDouble').addClass('hidden');

    });
}

function doubleClick() {
    handleAction(async () => {
        if (playerMoney >= BET_AMOUNTS[playerBet]) {
            $('#double').addClass('inactive');

        } else {
            $("#handResult").append("Not enough money to double down.");
        }
    });
}

function splitClick() {
    handleAction(async () => {
        if (player.hands[currentHandIndex].hand.length === 2 && player.hands[currentHandIndex].hand[0].charAt(0) === player.hands[currentHandIndex].hand[1].charAt(0) && playerMoney >= BET_AMOUNTS[playerBet]) {
            //let doubleAce = player.hands[currentHandIndex].hand[0].charAt(0) === "A";
            $('#double').addClass('inactive');

        } else {
            $("#handResult").append("Cannot split this hand.");
        }
    });
}

function insuranceClick(choice) {
    handleAction(async () => {
        if (choice === 'yes') {

        } else if (choice === 'no') {

        }
    });
}

async function betAdjustClick(direction) {
    if (!$("#uiWindow").hasClass('processing')) {
        if (direction === 'increase') {
            if (playerMoney >= BET_AMOUNTS[playerBet + 1] && playerBet < 7) {
                await setPlayerBet(playerBet + 1);
            } else {
                await setPlayerBet(1);
            }
        } else if (direction === 'decrease') {
            if (playerBet > 1) {
                await setPlayerBet(playerBet - 1);
            } else {
                await setPlayerBet(7);
            }
        }
    };
}

