const PlayerEventConsumer = require('../quests/playereventconsumer.js').PlayerEventConsumer;

class PlayerMapFlowEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    listeners = {}

    consume(event) {
        if(this.listeners[event.data.player.nftId][event.eventType] !== undefined) {
            this.listeners[event.data.player.nftId][event.eventType].forEach(callback => {
                callback(event);
            });
        }

        return {};
    }

    addListener(nftId, eventType, callback) {
        if(!this.listeners[nftId]) {
            this.listeners[nftId] = {};
        }
        if(this.listeners[nftId][eventType] === undefined) {
            this.listeners[nftId][eventType] = [];
        }
        this.listeners[nftId][eventType].push(callback);
    }

    clearListeners(nftId) {
        this.listeners[nftId] = {};
    }
}

exports.PlayerMapFlowEventConsumer = PlayerMapFlowEventConsumer;