const PlayerEventConsumer = require('../quests/playereventconsumer.js').PlayerEventConsumer;

class PlayerMapFlowEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    listeners = {}

    consume(event) {
        if(this.listeners[event.eventType] !== undefined) {
            this.listeners[event.eventType].forEach(callback => {
                callback(event);
            });
        }

        return {};
    }

    addListener(eventType, callback) {
        if(this.listeners[eventType] === undefined) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    clearListeners() {
        this.listeners = {};
    }
}

exports.PlayerMapFlowEventConsumer = PlayerMapFlowEventConsumer;