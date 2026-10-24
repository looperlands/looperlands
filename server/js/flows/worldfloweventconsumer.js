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
                (typeof callback === 'function' ? callback : callback.callback)(event);
            });
        }

        return {};
    }

    addListener(mapId, eventType, callback, owner) {
        if(!this.listeners[mapId]) {
            this.listeners[mapId] = {};
        }
        if(this.listeners[mapId][eventType] === undefined) {
            this.listeners[mapId][eventType] = [];
        }
        this.listeners[mapId][eventType].push(owner === undefined ? callback : {owner,callback});
    }

    clearListeners(mapId, owner) {
        if (owner === undefined) this.listeners[mapId] = {};
        else for (const type of Object.keys(this.listeners[mapId] || {})) this.listeners[mapId][type] = this.listeners[mapId][type].filter(entry => entry.owner !== owner);
    }
}

exports.WorldMapFlowEventConsumer = WorldMapFlowEventConsumer;