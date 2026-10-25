(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ScriptedSequences=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const steps = {
        move:{label:'Move NPC',actor:true,point:true,duration:15},
        face:{label:'Face a tile',actor:true,point:true,duration:0},
        speech:{label:'NPC dialogue',actor:true,text:true,duration:4},
        caption:{label:'Show caption',text:true,duration:4},
        wait:{label:'Wait',duration:1},
        camera:{label:'Pan camera',point:true,duration:2},
        camera_reset:{label:'Follow player again',duration:0},
        sound:{label:'Play sound',source:'sounds',duration:0},
        music:{label:'Play music',source:'music',duration:0},
        trigger_on:{label:'Activate trigger',trigger:true,duration:0},
        trigger_off:{label:'Deactivate trigger',trigger:true,duration:0}
    };
    const triggers = {
        'player.spawned':{label:'Player enters the map'},
        'area.entered':{label:'Player enters this rectangle',area:true},
        'quest.completed':{label:'Quest completed',source:'quests'},
        'npc.talked':{label:'Player talks to an NPC',source:'npcs'},
        'player.killed_mob':{label:'Player defeats a mob',source:'mobs'},
        'trigger.activated':{label:'Trigger activated',trigger:true}
    };
    function create(id='sequence_1') {return {id,name:'New sequence',enabled:true,cinematic:true,skippable:true,repeat:'once',cooldownSeconds:30,when:{type:'player.spawned',value:''},conditions:[],steps:[{type:'caption',text:'A new adventure begins.',seconds:4},{type:'wait',seconds:1}]};}
    function matches(when,type,data={}) {
        if(when.type!==type)return false;
        return !when.value || String(when.value)===String(data.value);
    }
    function inside(p,r) {return p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;}
    function duration(sequence) {return sequence.steps.reduce((sum,step)=>sum+step.seconds,0);}
    return {steps,triggers,create,matches,inside,duration};
});
