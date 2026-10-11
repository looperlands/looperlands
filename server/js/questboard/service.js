const {occurrences} = require('./schedule');
class QuestBoardService {
    constructor(configs, platform, options={}) {this.configs=configs; this.platform=platform; this.now=options.now || Date.now; this.publishing=new Map(); this.published=new Map();}
    config(mapId) {return this.configs.get(mapId);}
    async publish(mapId) {
        const config=this.config(mapId); if (!config) return;
        const key=config.version+':'+Math.floor(this.now()/60000);
        if (this.published.get(mapId)===key) return;
        if (this.publishing.has(mapId)) {await this.publishing.get(mapId); if (this.published.get(mapId)===key) return;}
        const task=this.platform.questBoard('publish',{mapId,occurrences:occurrences(config,this.now()),enabledQuestIds:config.quests.filter(q=>q.enabled && config.boards.some(b=>b.enabled&&b.questIds.includes(q.id))).map(q=>q.id)});
        this.publishing.set(mapId,task);
        try {await task; this.published.set(mapId,key);} finally {if (this.publishing.get(mapId)===task) this.publishing.delete(mapId);}
    }
    async state(identity,mapId) {
        if (mapId) await this.publish(mapId);
        else await Promise.all([...this.configs.keys()].map(map=>this.publish(map)));
        return this.platform.questBoard('state',{...identity,...(mapId?{mapId}:{})});
    }
    start() {
        const publish=()=>Promise.all([...this.configs.keys()].map(map=>this.publish(map))).catch(error=>console.error('[quest-board] publishing failed:',error.message));
        publish(); this.timer=setInterval(publish,60000); this.timer.unref?.();
    }
    close() {clearInterval(this.timer);}
}
module.exports={QuestBoardService};
