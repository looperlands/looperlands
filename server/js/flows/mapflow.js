const PlayerMapFlowEventConsumer = require('./playermapfloweventconsumer.js');
const main = require('./main.js');
const AltNames = require('../../../shared/js/altnames.js');
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
    'talk.npc': require('./then/talk.npc.js'),
    'talk.mob': require('./then/talk.mob.js'),
    'talk.player.private': require('./then/talk.player.private.js'),
    'talk.npc.private': require('./then/talk.npc.private.js'),
    'talk.mob.private': require('./then/talk.mob.private.js'),
    'walk.npc': require('./then/walk.npc.js'),
    'walk.mob': require('./then/walk.mob.js'),
    'walk.player': require('./then/walk.player.js'),
    'teleport.player': require('./then/teleport.player.js'),
    'trigger.activate': require('./then/trigger.activate.js'),
    'trigger.deactivate': require('./then/trigger.deactivate.js'),
    'trigger.toggle': require('./then/trigger.toggle.js'),
    'spawn.npc': require('./then/spawn.npc.js'),
    'spawn.mob': require('./then/spawn.mob.js'),
    'spawn.item': require('./then/spawn.item.js'),
    'camera.player': require('./then/camera.player.js'),
    'camera.npc': require('./then/camera.npc.js'),
    'sound.play': require('./then/sound.play.js'),
    'music.play': require('./then/music.play.js'),
}

const PlayerEventBroker = require('../quests/playereventbroker.js');
const eventConsumer = new PlayerMapFlowEventConsumer.PlayerMapFlowEventConsumer();

PlayerEventBroker.PlayerEventBroker.playerEventConsumers.push(eventConsumer);

function loadFlow(mapId, eventBroker, worldserver) {
    if(loadedFlow != null) {
        unloadFlow(eventBroker)
    }

    console.log('load flow: ' + mapId);
    if(flows[mapId] === undefined) {
        return;
    }

    assignEventHandlers(flows[mapId], eventBroker, worldserver);
    loadedFlow = mapId;
}

function unloadFlow(eventBroker) {
    console.log('unload flow: ' + loadedFlow);
    eventConsumer.clearListeners();
    loadedBlocks = {};
}

function assignEventHandlers(flow, eventBroker, worldserver) {
    console.log('assigning event handlers');
    for (const handler of flow.handlers) {
        if(!loadedBlocks[handler.idx]) {
            loadedBlocks[handler.idx] = new events[handler.type](handler.options, worldserver);
        }
        let eventClass = loadedBlocks[handler.idx];
        eventConsumer.addListener(eventClass.eventType, (event) => {
            loadedBlocks = {};
            console.log(eventClass.eventType);
            if(eventClass.handle(event)) {
                _.forEach(handler.then, (then) => {
                    handleBlock(then, event, worldserver);
                })
            }
        })
    }
}

function handleBlock(block, event, worldserver) {
    if(!loadedBlocks[block.idx]) {
        let blockClassName = blocks[block.type];
        console.log(block.type);
        if(!blockClassName) {
            return;
        }
        loadedBlocks[block.idx] = new blockClassName(replaceTags(block.options, event.data), worldserver);
    }

    let blockClass = loadedBlocks[block.idx];
    if(!blockClass) {
        return;
    }

    if (block.type === 'delay') {
       blockClass.handle(event, (event) => {
           _.forEach(block.then, (then) => {
               handleBlock(then, event, worldserver);
           })
       })
        return;
    }

    let output = blockClass.handle(event);
    if(block[output] !== undefined) {
        _.forEach(block[output], (then) => {
            handleBlock(then, event, worldserver);
        })
    }
}

function replaceTags(options, eventData) {
    let result = {};
    _.forEach(options, (value, key) => {
        if(typeof value === 'string') {
            let matches = value.match(/tag:[^\s]*/g);

            if(matches) {
                _.forEach(matches, (fullTag) => {
                    let tag = fullTag.substring(4);
                    let tagParts = tag.split('.');
                    let data = eventData;

                    _.forEach(tagParts, (tagPart) => {
                        if(data[tagPart]) {
                            data = data[tagPart];
                        }

                        if(tagPart === 'kind') {
                            data = Types.getKindAsString(data)
                            let altName = AltNames.getAltNameFromKind(data);
                            data = (altName !== undefined) ? altName : data;
                        }
                    })

                    result[key] = value.replace(fullTag, data);
                });
            } else {
                result[key] = value;
            }
        } else {
            result[key] = value;
        }
    });

    return result;
}

exports.loadFlow = loadFlow;
exports.unloadFlow = unloadFlow;