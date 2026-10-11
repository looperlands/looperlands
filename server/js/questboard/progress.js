const fs=require('fs');
const path=require('path');
const {randomUUID,createHash}=require('crypto');
// Append+fsync is awaited before acknowledging a successful gameplay action.
// The same event ID survives upload retries and server restart.
class QuestBoardProgress {
    constructor(platform,options={}) {
        this.platform=platform; this.now=options.now || Date.now; this.file=options.file || process.env.QUEST_BOARD_PROGRESS_FILE || path.resolve('data/quest-board-events.jsonl');
        this.enabled=options.enabled ?? true; this.pending=[]; this.writing=Promise.resolve(); this.flushing=null;
        if(!this.enabled)return;
        fs.mkdirSync(path.dirname(this.file),{recursive:true});
        if(fs.existsSync(this.file)) for(const line of fs.readFileSync(this.file,'utf8').split('\n').filter(Boolean)) this.pending.push(JSON.parse(line));
        this.ids=new Set(this.pending.map(row=>row.event.id));
        if(options.timer!==false){this.timer=setInterval(()=>this.flush().catch(error=>console.error('[quest-board] progress upload deferred:',error.message)),5000);this.timer.unref?.();}
    }
    queue(operation) {const result=this.writing.then(operation);this.writing=result.catch(()=>{});return result;}
    async record(player,type,data={}) {
        if(!this.enabled || !player.nftId || !player.walletId || player.isBot?.() || data.replayed || (data.quantity!==undefined&&data.quantity<=0))return;
        const event={id:data.id || createHash('sha256').update(randomUUID()).digest('hex'),occurredAt:data.occurredAt ?? this.now(),mapId:data.mapId ?? player.mapId,type,
            x:data.x ?? player.x,y:data.y ?? player.y,quantity:data.quantity ?? 1};
        for(const key of ['action','stage','target'])if(data[key]!==undefined)event[key]=String(data[key]);
        const row={wallet:player.walletId,nftId:player.nftId,event};
        await this.queue(async()=>{
            if(this.ids.has(event.id))return;
            const handle=await fs.promises.open(this.file,'a');
            try{await handle.writeFile(JSON.stringify(row)+'\n');await handle.sync();}finally{await handle.close();}
            this.pending.push(row);this.ids.add(event.id);
        });
    }
    async broker(player,type,data) {
        const event={};
        if(type==='KILL_MOB')Object.assign(event,{target:data.mob.kind,quantity:1,x:data.mob.x,y:data.mob.y});
        else if(type==='LOOT_ITEM')Object.assign(event,{target:data.kind ?? data.item?.kind,quantity:data.amount ?? 1});
        else if(type==='NPC_TALKED')Object.assign(event,{target:data.npc});
        else if(type==='AREA_ENTERED')Object.assign(event,{target:data.area?.name || data.area?.id});
        else return;
        await this.record(player,type,event);
    }
    async flush() {
        if(!this.enabled)return;
        if(this.flushing)return this.flushing;
        this.flushing=(async()=>{
            await this.writing;
            const batch=this.pending.slice(0,100);
            for(const row of batch) {
                let rejection;
                try {await this.platform.questBoard('progress',row);}
                catch (error) {
                    // Invalid/terminal actor events must not block unrelated players.
                    // Keep an fsynced audit record; authentication and outages retry.
                    if (![400,409].includes(error.response?.status)) throw error;
                    rejection={row,status:error.response.status,error:error.response.data,rejectedAt:this.now()};
                }
                await this.queue(async()=>{
                    if (rejection) {
                        const rejected=await fs.promises.open(this.file+'.rejected.jsonl','a');
                        try {await rejected.writeFile(JSON.stringify(rejection)+'\n');await rejected.sync();}finally{await rejected.close();}
                        console.warn('[quest-board] quarantined gameplay event:',row.event.id,rejection.error?.code || rejection.status);
                    }
                    const remaining=this.pending.filter(p=>p.event.id!==row.event.id),temp=this.file+'.tmp';
                    const handle=await fs.promises.open(temp,'w');
                    try{await handle.writeFile(remaining.map(r=>JSON.stringify(r)+'\n').join(''));await handle.sync();}finally{await handle.close();}
                    await fs.promises.rename(temp,this.file);this.pending=remaining;this.ids.delete(row.event.id);
                });
            }
        })();
        try{await this.flushing;}finally{this.flushing=null;}
    }
    async close(){clearInterval(this.timer);await this.writing;}
}
module.exports={QuestBoardProgress};
