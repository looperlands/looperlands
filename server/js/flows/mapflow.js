const PlayerMapFlowEventConsumer = require('./playermapfloweventconsumer.js');
const main = require('./main.js');

const flows = {main: main.flow}

let loadedFlow = null;
let loadedBlocks = {};

const events = {
    'player.killed_mob': require('./when/player.killed_mob.js'),
    'player.looted_item': require('./when/player.looted_item.js'),
}

const blocks = {
    'tag.equals': require('./and/tag.equals.js'),
    'any': require('./special/any.js'),
    'delay': require('./special/delay.js'),
    'send_notification': require('./then/send_notification.js'),
    'talk.player': require('./then/talk.player.js'),
    'trigger.activate': require('./then/trigger.activate.js'),
}

const PlayerEventBroker = require('../quests/playereventbroker.js');
const eventConsumer = new PlayerMapFlowEventConsumer.PlayerMapFlowEventConsumer();

PlayerEventBroker.PlayerEventBroker.playerEventConsumers.push(eventConsumer);

function loadFlow(mapId, eventBroker) {
    if(loadedFlow != null) {
        unloadFlow(eventBroker)
    }

    console.log('load flow: ' + mapId);
    if(flows[mapId] === undefined) {
        return;
    }

    assignEventHandlers(flows[mapId], eventBroker);
    loadedFlow = mapId;
}

function unloadFlow(eventBroker) {
    console.log('unload flow: ' + loadedFlow);
    eventConsumer.clearListeners();
    loadedBlocks = {};
}

function assignEventHandlers(flow, eventBroker) {
    console.log('assigning event handlers');
    for (const handler of flow.handlers) {
        if(!loadedBlocks[handler.idx]) {
            loadedBlocks[handler.idx] = new events[handler.type](handler.options);
        }
        let eventClass = loadedBlocks[handler.idx];
        eventConsumer.addListener(eventClass.eventType, (event) => {
            loadedBlocks = {};
            if(eventClass.handle(event)) {
                _.forEach(handler.then, (then) => {
                    handleBlock(then, event);
                })
            }
        })
    }
}

function handleBlock(block, event) {
    if(!loadedBlocks[block.idx]) {
        let blockClassName = blocks[block.type];
        if(!blockClassName) {
            return;
        }
        loadedBlocks[block.idx] = new blockClassName(block.options);
    }

    let blockClass = loadedBlocks[block.idx];
    if(!blockClass) {
        return;
    }

    if (block.type === 'delay') {
       blockClass.handle(event, (event) => {
           _.forEach(block.then, (then) => {
               handleBlock(then, event);
           })
       })
        return;
    }

    let output = blockClass.handle(event);
    if(block[output] !== undefined) {
        _.forEach(block[output], (then) => {
            handleBlock(then, event);
        })
    }
}

exports.loadFlow = loadFlow;
exports.unloadFlow = unloadFlow;