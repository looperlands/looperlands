const PlayerEventConsumer = require('../quests/playereventconsumer.js').PlayerEventConsumer;

class WorldMapFlowEventConsumer {

    constructor() {

    }

    listeners = {}

    consume(mapId, event) {
        if(!this.listeners[mapId]) {
            return;
        }
        if(this.listeners[mapId][event.eventType] !== undefined) {
            this.listeners[mapId][event.eventType].forEach(callback => {
                callback(event);
            });
        }

        return {};
    }

    addListener(mapId, eventType, callback) {
        if(!this.listeners[mapId]) {
            this.listeners[mapId] = {};
        }
        if(this.listeners[mapId][eventType] === undefined) {
            this.listeners[mapId][eventType] = [];
        }
        this.listeners[mapId][eventType].push(callback);
    }

    clearListeners(mapId) {
        this.listeners[mapId] = {};
    }
}

exports.WorldMapFlowEventConsumer = WorldMapFlowEventConsumer;