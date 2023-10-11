class WorldEventBroker {
    static Events = {
        TRIGGER_ACTIVATED: 'TRIGGER_ACTIVATED'
    }

    static playerEventConsumers = [];

    constructor() {
    }

    static dispatchEvent(eventType, eventData) {
        if(eventData === undefined) {
            eventData = {};
        }

        WorldEventBroker.playerEventConsumers.forEach(consumer => {
            consumer.consume({eventType: eventType, playerCache: eventData.playerData, data: eventData});
        })
    }

    async triggerActivated(triggerId) {
        WorldEventBroker.dispatchEvent(WorldEventBroker.Events.TRIGGER_ACTIVATED, { trigger: triggerId});
    }
} {
}

exports.WorldEventBroker = WorldEventBroker;
