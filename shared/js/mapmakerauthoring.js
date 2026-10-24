// Shared, data-only authoring vocabulary used by the toolbox and local flow loader.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MapmakerAuthoring=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    const ref=(key,label,source)=>({key,label,source}), text=(key,label)=>({key,label}), amount={key:'amount',label:'Amount',number:true,min:1,max:100000};
    const events={
        'tile.action':{label:'Player completes a tile stage',fields:[ref('action','Tile action','tileActions'),{key:'stage',label:'Stage ID'}]},
        'player.spawned':{label:'Player enters the map',fields:[]},
        'player.killed_mob':{label:'Player defeats a mob / boss',fields:[ref('mob','Mob','mobs')]},
        'player.looted_item':{label:'Player collects an item',fields:[ref('item','Item','items')]},
        'quest.completed':{label:'Quest completed',fields:[ref('quest','Quest','quests')]},
        'npc.talked':{label:'Player talks to an NPC',fields:[ref('npc','NPC','npcs')]},
        'area.entered':{label:'Player enters an area',fields:[ref('area','Area','areas')]},
        'area.left':{label:'Player leaves an area',fields:[ref('area','Area','areas')]},
        'trigger.activated':{label:'Trigger activated',fields:[{...ref('trigger','Trigger ID','triggers'),free:true}]},
        'trigger.deactivated':{label:'Trigger deactivated',fields:[{...ref('trigger','Trigger ID','triggers'),free:true}]}
    };
    const conditions={
        'has.killed.mob':{label:'Mob defeats at least',fields:[ref('mob','Mob','mobs'),amount]},
        'has.looted.item':{label:'Inventory contains',fields:[ref('item','Item','items'),amount]},
        'has.quest.received':{label:'Quest received',fields:[ref('quest','Quest','quests')]},
        'has.quest.completed':{label:'Quest completed',fields:[ref('quest','Quest','quests')]},
        'has.level':{label:'Player level at least',fields:[{key:'level',label:'Level',number:true,min:1,max:1000}]},
        'has.trigger.active':{label:'Trigger is active',fields:[{...ref('trigger','Trigger ID','triggers'),free:true}]}
    };
    const actions={
        'trigger.activate':{label:'Activate trigger / open linked gates',fields:[{...ref('trigger','Trigger ID','triggers'),free:true}]},
        'trigger.deactivate':{label:'Deactivate trigger / close linked gates',fields:[{...ref('trigger','Trigger ID','triggers'),free:true}]},
        'talk.npc.private':{label:'NPC dialogue to this player',fields:[ref('npc','NPC','npcs'),{key:'message',label:'Dialogue',multiline:true}]},
        'talk.player.private':{label:'Player dialogue',fields:[{key:'message',label:'Dialogue',multiline:true}]},
        'send_notification':{label:'Show notification',fields:[{key:'message',label:'Message',multiline:true}]},
        'quest.new':{label:'Start a quest',fields:[ref('quest','Quest','quests')]},
        'quest.complete':{label:'Complete a quest',fields:[ref('quest','Quest','quests')]},
        'sound.play':{label:'Play sound',fields:[ref('sound','Sound','sounds')]},
        'music.play':{label:'Play music',fields:[ref('music','Music','music')]}
    };
    const dialogueConditions={
        quest_open:{label:'Quest received',field:'quest',source:'quests'},quest_completed:{label:'Quest completed',field:'quest',source:'quests'},
        choice_made:{label:'Choice remembered',field:'choice'},has_item:{label:'Inventory contains',field:'item',source:'items',amount:true},
        killed_mob:{label:'Mob defeats at least',field:'mob',source:'mobs',amount:true},is_level:{label:'Player level at least',field:'level',number:true}
    };
    const dialogueActions={record_choice:{label:'Remember a choice',field:'choice'},handout_quest:{label:'Start a quest',field:'quest',source:'quests'},complete_quest:{label:'Complete a quest',field:'quest',source:'quests'}};
    function compile(rules){let idx=1000000;return {handlers:rules.filter(r=>r.enabled!==false).map(rule=>{
        let next=[];for(const action of [...rule.actions].reverse())next=[{idx:idx++,type:action.type,options:{...action.options},then:next}];
        for(const condition of [...rule.conditions].reverse())next=[{idx:idx++,type:condition.type,options:{...condition.options},[condition.not?'false':'true']:next}];
        return {idx:idx++,type:rule.when.type,options:{...rule.when.options},then:next};
    })};}
    function condition(c,state){const p=c.options||{},s=state||{};let result=false;
        if(c.type==='has.killed.mob')result=(s.kills?.[p.mob]||0)>=p.amount;
        if(c.type==='has.looted.item')result=(s.items?.[p.item]||0)>=p.amount;
        if(c.type==='has.quest.received')result=[...(s.openQuests||[]),...(s.completedQuests||[])].includes(p.quest);
        if(c.type==='has.quest.completed')result=(s.completedQuests||[]).includes(p.quest);
        if(c.type==='has.level')result=(s.level||1)>=p.level;
        if(c.type==='has.trigger.active')result=(s.triggers||[]).includes(p.trigger);
        return c.not?!result:result;
    }
    function dialogueCondition(c,s){const type=c.if_not||c.if;let result=false;
        if(type==='quest_open')result=[...(s.openQuests||[]),...(s.completedQuests||[])].includes(c.quest);
        if(type==='quest_completed')result=(s.completedQuests||[]).includes(c.quest);
        if(type==='choice_made')result=(s.choices||[]).includes(c.choice);
        if(type==='has_item')result=(s.items?.[c.item]||0)>=(c.amount||1);
        if(type==='killed_mob')result=(s.kills?.[c.mob]||0)>=(c.amount||1);
        if(type==='is_level')result=(s.level||1)>=c.level;
        return c.if_not?!result:result;
    }
    function previewNode(tree,key,state){const node=tree.nodes[key];if(!node)throw new Error('This conversation node does not exist.');const next=JSON.parse(JSON.stringify(state)),log=[];
        for(const action of node.actions||[]){
            if(action.type==='record_choice'){next.choices=[...new Set([...(next.choices||[]),action.choice])];log.push('Remember choice: '+action.choice);}
            if(action.type==='handout_quest'){if(![...(next.openQuests||[]),...(next.completedQuests||[])].includes(action.quest))next.openQuests=[...(next.openQuests||[]),action.quest];log.push('Simulate starting quest: '+action.quest);}
            if(action.type==='complete_quest'){next.openQuests=(next.openQuests||[]).filter(q=>q!==action.quest);next.completedQuests=[...new Set([...(next.completedQuests||[]),action.quest])];log.push('Simulate completing quest: '+action.quest);}
        }
        return {node:{...node,options:(node.options||[]).filter(o=>(o.conditions||[]).every(c=>dialogueCondition(c,next)))},state:next,log};
    }
    return {events,conditions,actions,dialogueConditions,dialogueActions,compile,condition,dialogueCondition,previewNode};
});
