class WorldEventBroker {
    static Events = {
        TRIGGER_ACTIVATED: 'TRIGGER_ACTIVATED',
        TRIGGER_DEACTIVATED: 'TRIGGER_DEACTIVATED'
    }

    static worldEventConsumers = [];

    constructor() {
    }

    static dispatchEvent(mapId, eventType, eventData) {
        if(eventData === undefined) {
            eventData = {};
        }

        WorldEventBroker.worldEventConsumers.forEach(consumer => {
            consumer.consume(mapId, {eventType: eventType, playerCache: eventData.playerData, data: eventData});
        })
    }

    async triggerActivated(mapId, triggerId) {
        WorldEventBroker.dispatchEvent(mapId, WorldEventBroker.Events.TRIGGER_ACTIVATED, { trigger: triggerId });
    }

    async triggerDeactivated(mapId, triggerId) {
        WorldEventBroker.dispatchEvent(mapId, WorldEventBroker.Events.TRIGGER_DEACTIVATED, { trigger: triggerId });
    }
} {
}

exports.WorldEventBroker = WorldEventBroker;
