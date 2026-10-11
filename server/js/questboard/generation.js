const {createHash} = require('crypto');
const CATEGORIES = ['adventures','challenges','requests'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Keyed draws keep replicas, restart order and unrelated rule edits from rerolling work.
const random = key => (parseInt(hash(key).slice(0,12),16)+1)/(0xffffffffffff+2);
function draw(range,key) {return range.min+Math.floor(random(key)*(Math.floor((range.max-range.min)/range.step)+1))*range.step;}
function rank(pool,key,identity=entry=>entry.id) {
    return pool.map(entry=>({entry,id:String(identity(entry)),score:-Math.log(random([...key,identity(entry)]))/(entry.weight || 1)}))
        .sort((a,b)=>a.score-b.score || (a.id<b.id?-1:a.id>b.id?1:0)).map(value=>value.entry);
}
function range(raw,label,helpers,max=1000000) {
    const {keys,number,fail}=helpers;
    if (Number.isSafeInteger(raw)) return {min:number(raw,1,max,label),max:raw,step:1};
    keys(raw,['min','max','step'],label);
    const result={min:number(raw.min,1,max,label+'.min'),max:number(raw.max,1,max,label+'.max'),step:number(raw.step ?? 1,1,max,label+'.step')};
    if (result.min>result.max || (result.max-result.min)%result.step) fail(label+' must have min <= max with a reachable max');
    return result;
}
function distinct(pool,label,identity,helpers,max=100) {
    if (!Array.isArray(pool) || !pool.length || pool.length>max) helpers.fail(label+' must have 1-'+max+' entries');
    const seen=new Set();
    for (const entry of pool) {const key=String(identity(entry)); if(seen.has(key)) helpers.fail('duplicate '+label+' '+key); seen.add(key);}
    return pool;
}
function validateRefill(raw,h) {
    h.keys(raw,['counts','pool','limitPerCategory','avoidLast','fallback','seed'],'refill');
    h.keys(raw.counts,CATEGORIES,'refill counts');
    const counts=Object.fromEntries(CATEGORIES.map(category=>[category,h.number(raw.counts[category] ?? 0,0,10,'refill count')]));
    if (!Object.values(counts).some(Boolean)) h.fail('refill needs at least one slot');
    const limitPerCategory=h.number(raw.limitPerCategory ?? 10,Math.max(...Object.values(counts)),50,'refill limitPerCategory');
    const pool=distinct(raw.pool,'refill pool',entry=>entry.id,h).map(entry=>{
        h.keys(entry,['id','weight'],'refill pool entry'); return {id:h.id(entry.id,'refill quest'),weight:h.number(entry.weight ?? 1,1,1000,'refill weight')};
    });
    const result={counts,pool,limitPerCategory,avoidLast:h.number(raw.avoidLast ?? 1,0,30,'refill avoidLast'),fallback:raw.fallback || 'allow-repeats',seed:raw.seed ?? 'default'};
    h.id(result.seed,'refill seed');
    if (!['allow-repeats','fewer'].includes(result.fallback)) h.fail('unsupported refill fallback');
    return result;
}
function validateGeneration(raw,quest,h) {
    h.keys(raw,['seed','objectives','rewards'],'generation');
    const result={seed:raw.seed ?? 'default',objectives:[]}; h.id(result.seed,'generation seed');
    if (raw.objectives !== undefined) {
        if (!Array.isArray(raw.objectives) || raw.objectives.length>12) h.fail('generation objectives must be an array of up to 12 rules');
        const seen=new Set();
        result.objectives=raw.objectives.map(rule=>{
            h.keys(rule,['id','amount','targets','items'],'generation objective');
            const objective=quest.objectives.find(o=>o.id===rule.id);
            if (!objective || seen.has(rule.id)) h.fail('unknown or duplicate generation objective '+rule.id); seen.add(rule.id);
            const resolved={id:rule.id};
            if (objective.eventType==='DELIVER_ITEMS') {
                if (rule.amount!==undefined || rule.targets!==undefined || !rule.items) h.fail('generated hand-in needs an item pool, without amount/targets');
                h.keys(rule.items,['count','pool'],'generated basket');
                const pool=distinct(rule.items.pool,'generated item pool',entry=>h.resolveItem(entry.item),h).map(entry=>{
                    h.keys(entry,['item','amount','weight'],'generated item');
                    return {item:h.resolveItem(entry.item),amount:range(entry.amount,'generated item amount',h),weight:h.number(entry.weight ?? 1,1,1000,'item weight')};
                });
                const count=range(rule.items.count ?? 1,'generated basket count',h,Math.min(20,pool.length));
                resolved.items={count,pool};
            } else {
                if (rule.items!==undefined || (rule.amount===undefined && rule.targets===undefined)) h.fail('generated activity needs amount or targets, without items');
                if (rule.amount!==undefined) resolved.amount=range(rule.amount,'generated amount',h);
                if (rule.targets!==undefined) resolved.targets=distinct(rule.targets,'generated target pool',entry=>h.resolveTarget(objective,entry.target),h).map(entry=>{
                    h.keys(entry,['target','label','weight'],'generated target');
                    const target=h.resolveTarget(objective,entry.target);
                    return {target,label:h.text(entry.label ?? String(entry.target),'target label',100),weight:h.number(entry.weight ?? 1,1,1000,'target weight')};
                });
            }
            return resolved;
        });
    }
    if (raw.rewards!==undefined) {
        h.keys(raw.rewards,['xp','items'],'generated rewards'); result.rewards={};
        if (raw.rewards.xp!==undefined) {
            const xp=raw.rewards.xp; h.keys(xp,['base','perUnit','max'],'generated XP');
            const perUnit=xp.perUnit ?? [];
            if (!Array.isArray(perUnit) || perUnit.length>100) h.fail('XP perUnit must be an array of up to 100 rates');
            const seen=new Set();
            result.rewards.xp={base:h.number(xp.base ?? 0,0,1000,'XP base'),max:h.number(xp.max ?? 1000,0,1000,'XP cap'),perUnit:perUnit.map(rate=>{
                h.keys(rate,['objectiveId','item','target','xp'],'XP rate');
                const objective=quest.objectives.find(o=>o.id===rate.objectiveId),rule=result.objectives.find(r=>r.id===rate.objectiveId);
                if (!objective) h.fail('XP rate references unknown objective');
                const normalized={objectiveId:rate.objectiveId,xp:h.number(rate.xp,0,1000,'XP per unit')};
                if (objective.eventType==='DELIVER_ITEMS') {
                    if (rate.target!==undefined) h.fail('hand-in XP rates use item, not target');
                    if (rate.item!==undefined) {
                        normalized.item=h.resolveItem(rate.item);
                        if (!(rule?.items?.pool || objective.items).some(i=>i.item===normalized.item)) h.fail('XP rate references item outside basket pool');
                    }
                } else {
                    if (rate.item!==undefined) h.fail('activity XP rates use target, not item');
                    if (rate.target!==undefined) {
                        normalized.target=h.resolveTarget(objective,rate.target);
                        if (!(rule?.targets || [{target:objective.target}]).some(t=>t.target===normalized.target)) h.fail('XP rate references target outside target pool');
                    }
                }
                const key=JSON.stringify([normalized.objectiveId,normalized.item ?? null,normalized.target ?? null]);
                if(seen.has(key)) h.fail('duplicate XP rate'); seen.add(key); return normalized;
            })};
        }
        if (raw.rewards.items!==undefined) result.rewards.items=distinct(raw.rewards.items,'generated reward items',entry=>h.resolveItem(entry.item),h,20).map(entry=>{
            h.keys(entry,['item','amount'],'generated reward item'); const item=h.resolveItem(entry.item);
            if (!quest.rewards.items?.some(reward=>reward.item===item)) h.fail('generated reward item needs a funded base reward');
            return {item,amount:range(entry.amount,'generated reward amount',h)};
        });
    }
    const tokens=placeholders(quest,result);
    for (const objective of quest.objectives) {
        const rule=result.objectives.find(rule=>rule.id===objective.id);
        if (rule?.amount) tokens.set(objective.id+'.amount',String(rule.amount.max));
        if (rule?.targets) tokens.set(objective.id+'.target',rule.targets.reduce((longest,t)=>t.label.length>longest.length?t.label:longest,''));
    }
    if(result.rewards?.xp) tokens.set('reward.xp',String(result.rewards.xp.max));
    for (const value of [quest.name,quest.description,...quest.objectives.map(o=>o.label)].filter(Boolean)) {
        for (const match of value.matchAll(/\{([^{}]+)\}/g)) if (!tokens.has(match[1])) h.fail('unknown generation placeholder '+match[1]);
    }
    for (const [value,limit] of [[quest.name,150],[quest.description,2000],...quest.objectives.map(o=>[o.label,200])]) if(value) {
        if(value.replace(/\{([^{}]+)\}/g,(_,token)=>tokens.get(token)).length>limit) h.fail('generated text exceeds '+limit+' characters');
    }
    return result;
}
function placeholders(quest,generation) {
    const tokens=new Map([['reward.xp',String(quest.rewards.xp)]]);
    for (const objective of quest.objectives) if (objective.eventType!=='DELIVER_ITEMS') {
        tokens.set(objective.id+'.amount',String(objective.amount));
        const targets=generation.objectives.find(rule=>rule.id===objective.id)?.targets;
        tokens.set(objective.id+'.target',targets?.find(t=>t.target===objective.target)?.label || String(objective.target ?? ''));
    }
    return tokens;
}
function generate(quest,key) {
    if (!quest.generation) return quest;
    const generation=quest.generation,seed=[...key,quest.id,generation.seed];
    const result={...quest,objectives:quest.objectives.map(o=>({...o})),rewards:{...quest.rewards}}; delete result.generation;
    const labels=new Map();
    for (const rule of generation.objectives) {
        const objective=result.objectives.find(o=>o.id===rule.id),drawKey=[...seed,rule.id];
        if (rule.amount) objective.amount=draw(rule.amount,[...drawKey,'amount']);
        if (rule.targets) {const target=rank(rule.targets,[...drawKey,'target'],entry=>entry.target)[0]; objective.target=target.target; labels.set(rule.id,target.label);}
        if (rule.items) objective.items=rank(rule.items.pool,[...drawKey,'items'],entry=>entry.item).slice(0,draw(rule.items.count,[...drawKey,'count']))
            .map(entry=>({item:entry.item,amount:draw(entry.amount,[...drawKey,'amount',entry.item])}));
    }
    if (generation.rewards?.xp) {
        const xp=generation.rewards.xp;
        const total=xp.perUnit.reduce((sum,rate)=>{
            const objective=result.objectives.find(o=>o.id===rate.objectiveId);
            const units=objective.eventType==='DELIVER_ITEMS'?objective.items.filter(i=>rate.item===undefined || i.item===rate.item).reduce((n,i)=>n+i.amount,0)
                :rate.target===undefined || rate.target===objective.target?objective.amount:0;
            return sum+units*rate.xp;
        },xp.base);
        result.rewards.xp=Math.min(xp.max,total);
    }
    if (generation.rewards?.items) result.rewards.items=quest.rewards.items.map(item=>{
        const rule=generation.rewards.items.find(rule=>rule.item===item.item);
        return {...item,...(rule?{amount:draw(rule.amount,[...seed,'reward',item.item])}:{})};
    });
    const tokens=placeholders(result,generation);
    for (const [id,label] of labels) tokens.set(id+'.target',label);
    const render=value=>value?.replace(/\{([^{}]+)\}/g,(_,token)=>tokens.get(token));
    result.name=render(result.name); if(result.description) result.description=render(result.description);
    result.objectives=result.objectives.map(o=>({...o,...(o.label?{label:render(o.label)}:{})}));
    return result;
}
function refillTemplates(config,schedule,window) {
    const rules=schedule.refill,result=[];
    for (const [category,count] of Object.entries(rules.counts)) {
        if (!count) continue;
        const pool=rules.pool.filter(entry=>config.quests.some(q=>q.id===entry.id && q.enabled && q.category===category)),history=[];
        for (let index=0;index<rules.limitPerCategory;index++) {
            const ranked=rank(pool,[config.mapId,schedule.id,window.opensAt,category,index,rules.seed]);
            const choice=ranked.find(entry=>!history.includes(entry.id)) || (rules.fallback==='allow-repeats'?ranked[0]:null);
            if (!choice) break;
            result.push({quest:config.quests.find(q=>q.id===choice.id),refill:{scheduleId:schedule.id,category,index,count,limit:rules.limitPerCategory}});
            history.push(choice.id); if(history.length>rules.avoidLast) history.shift();
        }
    }
    return result;
}
// The stream is shared; each completion scope reveals its next slots independently.
function visibleRefill(data,identity,configs) {
    const groups=new Map(),kept=[];
    for (const occurrence of data.occurrences || []) {
        const refill=occurrence.snapshot.refill;
        if (!refill) {kept.push(occurrence);continue;}
        const key=JSON.stringify([occurrence.mapId,refill.scheduleId,occurrence.opensAt,refill.category]);
        if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(occurrence);
    }
    for (const offers of groups.values()) {
        const ordered=offers.sort((a,b)=>a.snapshot.refill.index-b.snapshot.refill.index);
        let slots=ordered[0].snapshot.refill.count;
        for (const offer of ordered) {
            const attempts=(data.attempts || []).filter(a=>a.occurrenceId===offer.id && ((offer.snapshot.policy?.completionScope || 'wallet')==='wallet' || a.nftId===identity.nftId));
            const completed=attempts.some(a=>a.status==='completed') || (data.refillCompletions || []).some(a=>a.occurrenceId===offer.id && ((offer.snapshot.policy?.completionScope || 'wallet')==='wallet' || a.nftId===identity.nftId));
            const template=configs?.get(offer.mapId)?.quests.find(q=>q.id===offer.snapshot.templateId);
            const bound=attempts.some(a=>['accepted','ready','withdrawn'].includes(a.status));
            if (completed || (!bound && (offer.enabled===false || (configs && !template?.enabled)))) continue;
            if (slots>0) {kept.push(offer);slots--;}
        }
    }
    return {...data,occurrences:kept};
}
module.exports={validateGeneration,validateRefill,generate,refillTemplates,visibleRefill,rank};
