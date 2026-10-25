const S = require('../../shared/js/scriptedsequences');
const Dialogue = require('../../shared/js/dialogueformat');
const fail = message => {throw Object.assign(new Error(message),{status:400});};
const obj = value => value && typeof value==='object'&&!Array.isArray(value);
function fields(value,allowed,label) {if(!obj(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('Unsupported '+label+' settings.');}
function number(n,min,max,label,integer=false) {if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))fail(label+' must be '+(integer?'a whole number ':'')+'between '+min+' and '+max+'.');}
function text(s,label,max=120) {if(typeof s!=='string'||!s.trim()||s.length>max||/[<>\u0000-\u001f]/.test(s))fail('Enter '+label+' using up to '+max+' plain-text characters.');}
function reference(id,source,catalog,label) {text(String(id??''),label,100);if(catalog&&!(catalog[source]||[]).some(r=>String(r.id)===String(id)))fail('Choose an existing '+label+'.');}
function validate(entries,catalog) {
    if(!Array.isArray(entries)||entries.length>50)fail('Use at most 50 scripted sequences per map.');const ids=new Set();
    for(const row of entries) {
        fields(row,['id','name','enabled','cinematic','skippable','repeat','cooldownSeconds','when','conditions','steps'],'sequence');
        if(typeof row.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(row.id)||['constructor','prototype','__proto__'].includes(row.id)||ids.has(row.id))fail('Use unique sequence IDs, starting with a letter.');ids.add(row.id);text(row.name,'a sequence name');
        for(const key of ['enabled','cinematic','skippable'])if(typeof row[key]!=='boolean')fail('Choose whether '+key+' is enabled.');
        if(!['once','repeat'].includes(row.repeat))fail('Choose once per avatar or repeat.');number(row.cooldownSeconds,1,86400,'Cooldown');
        fields(row.when,['type','value','x','y','width','height'],'sequence trigger');const trigger=Object.hasOwn(S.triggers,row.when.type)&&S.triggers[row.when.type];if(!trigger)fail('Choose a supported sequence trigger.');
        if(trigger.source)reference(row.when.value,trigger.source,catalog,'trigger target');if(trigger.trigger)text(row.when.value,'a trigger ID',100);
        const point=(p,label)=>{number(p.x,0,(catalog?.width??100000)-1,label+' X',true);number(p.y,0,(catalog?.height??100000)-1,label+' Y',true);};
        if(trigger.area){point(row.when,'Area');number(row.when.width,1,(catalog?.width??100000)-row.when.x,'Area width',true);number(row.when.height,1,(catalog?.height??100000)-row.when.y,'Area height',true);}
        if(!Array.isArray(row.steps)||!row.steps.length||row.steps.length>100)fail('Each sequence needs 1–100 steps.');
        for(const step of row.steps){fields(step,['type','actor','x','y','text','seconds','value'],'sequence step');const spec=Object.hasOwn(S.steps,step.type)&&S.steps[step.type];if(!spec)fail('Choose a supported step.');number(step.seconds,0,60,'Step duration');
            if(spec.actor){reference(step.actor,'routines',catalog,'NPC routine');}
            if(spec.point){point(step,'Destination');if(step.type==='move'&&catalog?.collisions?.includes(step.y*catalog.width+step.x))fail('The NPC destination is blocked. Choose a walkable tile.');}
            if(spec.text){Dialogue.validate(step.text,'Step dialogue',2000);if(!step.text?.trim()||/\{\{|\}\}/.test(step.text))fail('Enter dialogue without quest-progress counters.');}
            if(spec.source)reference(step.value,spec.source,catalog,'audio track');if(spec.trigger)text(step.value,'a trigger ID',100);
            if(step.type==='move'&&step.seconds<1)fail('Give NPC movement at least one second to arrive.');
        }
        if(S.duration(row)>300)fail('Keep each sequence within five minutes.');
        if(row.when.type==='trigger.activated'&&row.steps.some(s=>s.type==='trigger_on'&&s.value===row.when.value))fail('A sequence must not activate its own starting trigger.');
        // Conditions use the same validated vocabulary as Triggers & events.
        require('./localworldauthoring').validateRules([{id:row.id,name:row.name,enabled:false,when:{type:'player.spawned',options:{}},conditions:row.conditions,actions:[{type:'send_notification',options:{message:'Sequence'}}]}],catalog);
    }
    const graph=new Map();
    for(const row of entries)if(row.enabled&&row.when.type==='trigger.activated'){
        const targets=graph.get(row.when.value)||new Set();for(const step of row.steps)if(step.type==='trigger_on')targets.add(step.value);graph.set(row.when.value,targets);
    }
    const visiting=new Set(),done=new Set();
    function visit(key){if(visiting.has(key))fail('Sequence triggers contain a feedback cycle. Remove the loop.');if(done.has(key))return;visiting.add(key);for(const next of graph.get(key)||[])visit(next);visiting.delete(key);done.add(key);}
    for(const key of graph.keys())visit(key);
    return entries;
}
module.exports = {validate};
