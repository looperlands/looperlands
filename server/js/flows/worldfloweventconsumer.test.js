const {WorldMapFlowEventConsumer} = require('./worldfloweventconsumer');
test('unloading one player preserves other players and legacy world subscriptions', () => {
    const consumer = new WorldMapFlowEventConsumer();
    const first = jest.fn(), second = jest.fn(), legacy = jest.fn();
    consumer.addListener('world_main', 'trigger.activated', first, 'first');
    consumer.addListener('world_main', 'trigger.activated', second, 'second');
    consumer.addListener('world_main', 'trigger.activated', legacy);
    consumer.clearListeners('world_main', 'first');
    const event = {eventType: 'trigger.activated', trigger: 'boss-clear'};
    consumer.consume('world_main', event);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(event);
    expect(legacy).toHaveBeenCalledWith(event);
    consumer.clearListeners('world_main');
    consumer.consume('world_main', event);
    expect(second).toHaveBeenCalledTimes(1);
});
