const crypto=require('crypto');
const Builder=require('./localtilebuilder');
const Types=require('../../shared/js/gametypes');
const quests=require('./quests/quests');
// Repository-authored sequences use the selected provider's atomic persistence.
class LocalTileSequences {
    constructor(cache,platform,options={}) {this.cache=cache;this.platform=platform;this.dao=options.dao||require('./dao');this.now=options.now||Date.now;this.random=options.random||Math.random;this.root=options.root||require('path').resolve(__dirname,'../..');this.definitions={};for(const id of Builder.maps(this.root)){const definitions=Builder.definitions(this.root,id);this.definitions[id]=Object.fromEntries(Object.entries(definitions).filter(([,a])=>a.type==='sequence'));}this.stageDefinitions=this.definitions;}
    resolve(map,tile) {if(!Number.isInteger(tile?.gridX)||!Number.isInteger(tile?.gridY))return null;const name=Builder.actionAt(this.root,map,tile.gridX,tile.gridY);const action=this.definitions[map]?.[name];return action?{name,action,x:tile.gridX,y:tile.gridY,signature:Builder.hash(action)}:null;}
    handles(map,tile) {return !!this.resolve(map,tile);}
    async state(map,r) {return this.platform.getTileSequenceState(map,r.x,r.y,r.signature);}
    player(world,nftId) {return Object.values(world.players||{}).find(p=>p.nftId===nftId);}
    stage(r,state) {return r.action.stages.find(s=>s.id===(state.stage===undefined?r.action.start:state.stage));}
    async findCurrentStage(nftId,map,tile,world) {
        const r=this.resolve(map,tile);if(!r)return null;const state=await this.state(map,r),s=this.stage(r,state),player=this.player(world,nftId);
        if(!s)return {key:'done',name:'Completed',waiting:true,message:'This interaction is complete.',revision:state.revision};
        const remaining=Math.max(0,(state.readyAt||0)-this.now());
        if(remaining)return {key:s.id,name:'Wait '+Math.ceil(remaining/1000)+' seconds',waiting:true,message:'This stage is not ready yet.',revision:state.revision};
        const session=this.cache.get(player?.sessionId),hasTool=!s.tool||(session?.gameData?.items?.[s.tool]||0)>0;
        return {key:s.id,name:s.name,duration:s.duration,playAnimation:s.duration>0,requirements:{level:s.level,...(s.tool?{tool:Types.getKindAsString(Number(s.tool)).toUpperCase()}:{})},hasTool,revision:state.revision};
    }
    async executeStage(nftId,map,tile,item,world,expectedStage,expectedRevision) {
        const fail=message=>({success:false,message}),r=this.resolve(map,tile);if(!r)return fail('No action is placed here.');
        const state=await this.state(map,r),s=this.stage(r,state),player=this.player(world,nftId),session=this.cache.get(player?.sessionId);
        if(!player?.hasEnteredGame||!session||session.mapId!==map||Math.max(Math.abs(player.x-r.x),Math.abs(player.y-r.y))>1)return fail('Move next to this tile.');
        if(!s||expectedStage!==s.id||expectedRevision!==state.revision)return fail('This stage changed. Try the action again.');
        if((state.readyAt||0)>this.now())return fail('This stage is not ready yet.');
        if(player.getLevel()<s.level)return fail('You need level '+s.level+'.');
        if(s.quest&&!quests.hasCompletedQuest(s.quest,session))return fail('Complete quest '+s.quest+' first.');
        const requiredItems=[...(s.tool?[{item:String(s.tool),quantity:1}]:[]),...s.costs.map(c=>({item:String(c.item),quantity:c.amount}))];
        if(requiredItems.some(r=>(session.gameData?.items?.[r.item]||0)<r.quantity))return fail('You do not have the required tool or items.');
        const success=this.random()<s.successChance,stage=success?s.next:(s.failureNext||s.id),next=r.action.stages.find(n=>n.id===stage);
        const items=[...s.costs.map(c=>({item:String(c.item),amount:-c.amount})),...(success?s.rewards.map(c=>({item:String(c.item),amount:c.amount})):[])];
        const requestId=crypto.createHash('sha256').update(JSON.stringify([nftId,map,r.x,r.y,r.signature,state.revision])).digest('hex');
        let receipt;try{receipt=await this.dao.commitTileSequence({requestId,nftId,mapId:map,x:r.x,y:r.y,signature:r.signature,expectedRevision:state.revision,stage:stage||null,readyAt:this.now()+(next?.waitSeconds||0)*1000,tile:success?s.tile:(state.tile||0),items,xp:success?s.xp:0,requiredItems,success});}catch(e){return fail(e.code==='tile_changed'?'This tile changed. Try again.':'The action could not commit. Check your items and retry.');}
        for(const key of this.cache.keys()){const data=this.cache.get(key);if(data?.nftId===nftId){data.gameData.items={...data.gameData.items,...receipt.quantities};this.cache.set(key,data);}}
        // A replay can be our first received reply after a lost response. Publish
        // that durable result once; concurrent attempts must not emit two events.
        this.published ||= new Set();
        if(this.published.has(requestId))return {success:true,message:'This action already completed. Refresh the tile.'};
        this.published.add(requestId);if(this.published.size>10000)this.published.delete(this.published.values().next().value);
        const committedSuccess=receipt.success ?? success;
        // Publication failures must not turn a committed receipt into a failed inventory action.
        try{await player.applyPersistedExperience?.(receipt.xp);this.publish(world,r,receipt.state);if(committedSuccess&&s.trigger&&!world.checkTriggerActive(s.trigger))world.activateTrigger(s.trigger);}catch(e){console.error('Committed tile sequence publication failed:',e.message);}
        const message=committedSuccess?(s.message||s.name+' complete.'):(s.failureMessage||'The attempt failed. Try again.');world.sendNotifications(player,message,false);
        return {success:true,message,activity:{action:r.name,stage:s.id,target:r.name,quantity:1,x:r.x,y:r.y,failed:!committedSuccess}};
    }
    publish(world,r,state) {if(state.tile)world.placeStagedTile(r.x,r.y,state.tile,0);else world.clearStagedTile(r.x,r.y);}
    async loadPersistedPlots(map,world) {const doc=Builder.document(this.root,map);for(const p of doc.placements)if(this.definitions[map]?.[p.action])for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++){const r=this.resolve(map,{gridX:x,gridY:y}),state=await this.state(map,r);if(state.tile)this.publish(world,r,state);}}
}
module.exports=LocalTileSequences;
