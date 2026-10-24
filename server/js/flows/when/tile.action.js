const cls=require('../../lib/class');
const {PlayerEventBroker}=require('../../quests/playereventbroker');
module.exports=cls.Class.extend({
    eventType:PlayerEventBroker.Events.TILE_ACTION,
    init(options){this.action=options.action;this.stage=options.stage;},
    handle(event){const a=event.data.activity;return !!a&&!a.failed&&a.action===this.action&&(!this.stage||a.stage===this.stage);},
    destroy(){}
});
