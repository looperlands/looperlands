const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DEFAULTS = Object.freeze({participation: 'personal', completionScope: 'wallet', completionsPerOccurrence: 1,
    maxActiveRecurring: 3, reconciliationGraceHours: 24, eligibleLoopers: ['owned'], progressStart: 'acceptance', actionClaimMode: 'journal',
    withdrawal: {allowed: true, retainProgress: true, allowReaccept: true}});
const EVENTS = ['TILE_ACTION', 'KILL_MOB', 'LOOT_ITEM', 'NPC_TALKED', 'AREA_ENTERED', 'FISHING', 'DELIVER_ITEMS'];
function fail(message) {throw new Error('Quest board config: ' + message);}
function keys(value, allowed, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be an object');
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(label + ': unsupported field ' + key);
}
function id(value, label) {if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(value)) fail(label + ' has an invalid ID'); return value;}
function number(value, min, max, label) {if (!Number.isSafeInteger(value) || value < min || value > max) fail(label + ' must be an integer between ' + min + ' and ' + max); return value;}
function text(value, label, max = 2000) {if (typeof value !== 'string' || !value.trim() || value.length > max) fail(label + ' must be nonempty text'); return value;}
function boolean(value, label) {if (typeof value !== 'boolean') fail(label + ' must be boolean'); return value;}
function bounds(value, label) {keys(value, ['x','y','width','height'], label); for (const key of ['x','y','width','height']) number(value[key], key === 'x' || key === 'y' ? 0 : 1, 100000, label + '.' + key); return {...value};}
function unique(list, label) {if (!Array.isArray(list)) fail(label + ' must be an array'); const seen = new Set(); for (const entry of list) {id(entry?.id,label); if (seen.has(entry.id)) fail('duplicate ' + label + ' ' + entry.id); seen.add(entry.id);} return list;}
function policy(input = {}) {
    keys(input, Object.keys(DEFAULTS), 'policy');
    const result = {...DEFAULTS, ...input, withdrawal: {...DEFAULTS.withdrawal, ...input.withdrawal}};
    for (const key of ['participation','progressStart','actionClaimMode']) if (result[key] !== DEFAULTS[key]) fail('unsupported policy ' + key);
    if (!['wallet','looper'].includes(result.completionScope)) fail('unsupported completionScope');
    if (JSON.stringify(result.eligibleLoopers) !== '["owned"]') fail('eligibleLoopers currently supports owned only');
    number(result.reconciliationGraceHours,1,168,'reconciliationGraceHours');
    number(result.completionsPerOccurrence,1,1,'completionsPerOccurrence'); number(result.maxActiveRecurring,1,10,'maxActiveRecurring');
    keys(result.withdrawal, ['allowed','retainProgress','allowReaccept'], 'withdrawal');
    for (const key of Object.keys(result.withdrawal)) boolean(result.withdrawal[key], 'withdrawal.' + key);
    return result;
}
function resolveEntity(value, catalog, type) {
    const resolved = catalog.resolveEntity ? catalog.resolveEntity(value, type) : value;
    if (resolved === undefined || resolved === null || resolved === false) fail('unknown ' + type + ' ' + value);
    return String(resolved);
}
function items(list, catalog, reward = false) {
    if (!Array.isArray(list) || !list.length || list.length > 20) fail('item basket must have 1-20 items');
    const seen = new Set();
    return list.map(entry => {keys(entry, reward ? ['item','amount','fundingRef'] : ['item','amount'], 'item');
        const item = resolveEntity(entry.item,catalog,'item'); if (seen.has(item)) fail('duplicate basket item ' + item); seen.add(item);
        const result = {item,amount:number(entry.amount,1,1000000,'item amount')};
        if (reward) result.fundingRef = id(entry.fundingRef, 'reward fundingRef'); return result;});
}
function schedule(raw) {
    keys(raw, ['id','timezone','repeat','opensAtLocalTime','acceptanceWindowHours','completionWindowHours','completeAt','previewHours','dates','rotation'], 'schedule');
    const s = {...raw, timezone:raw.timezone || 'UTC', previewHours:raw.previewHours ?? 72};
    try {new Intl.DateTimeFormat('en', {timeZone:s.timezone}).format();} catch {fail('unknown timezone ' + s.timezone);}
    number(s.previewHours,0,24*31,'previewHours');
    if (raw.dates) {
        if (raw.repeat || raw.opensAtLocalTime || raw.acceptanceWindowHours || raw.completionWindowHours || raw.completeAt || !Array.isArray(raw.dates) || !raw.dates.length) fail('fixed dates cannot have repeat or local opening time');
        s.dates = raw.dates.map(date => {keys(date,['opensAt','acceptUntil','endsAt'],'fixed date');
            const value = Object.fromEntries(Object.entries(date).map(([key,v]) => [key, typeof v === 'number' ? v : Date.parse(v)]));
            if (!Number.isSafeInteger(value.opensAt) || !(value.opensAt < value.acceptUntil && value.acceptUntil <= value.endsAt)) fail('invalid fixed date window'); return value;});
    } else {
        s.repeat = raw.repeat || {frequency:'permanent'};
        keys(s.repeat,['frequency','interval','dayOfWeek','anchorDate'],'repeat');
        if (!['permanent','daily','weekly'].includes(s.repeat.frequency)) fail('unsupported recurrence');
        if (s.repeat.frequency !== 'permanent') {
            s.repeat = {...s.repeat,interval:s.repeat.interval ?? 1,anchorDate:s.repeat.anchorDate || '1970-01-01'};
            number(s.repeat.interval,1,365,'repeat interval');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s.repeat.anchorDate) || !Number.isFinite(Date.parse(s.repeat.anchorDate))) fail('invalid anchorDate');
            if (s.repeat.frequency === 'weekly') number(s.repeat.dayOfWeek ?? 1,0,6,'dayOfWeek');
            s.opensAtLocalTime = s.opensAtLocalTime || '00:00';
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.opensAtLocalTime)) fail('invalid opensAtLocalTime');
            s.acceptanceWindowHours = number(s.acceptanceWindowHours ?? (s.repeat.frequency === 'weekly' ? 168 : 24),1,24*31,'acceptanceWindowHours');
            if (s.completeAt !== undefined && (s.completeAt !== 'nextOpening' || s.completionWindowHours !== undefined)) fail('completeAt must be nextOpening and excludes completionWindowHours');
            if (!s.completeAt) s.completionWindowHours = number(s.completionWindowHours ?? s.acceptanceWindowHours,1,24*31,'completionWindowHours');
            if (s.completionWindowHours && s.acceptanceWindowHours > s.completionWindowHours) fail('acceptance cannot end after completion');
        } else if (s.repeat.interval || s.repeat.dayOfWeek !== undefined || s.repeat.anchorDate || raw.acceptanceWindowHours || raw.completionWindowHours || raw.completeAt || raw.opensAtLocalTime || raw.rotation) fail('permanent schedule cannot define windows or rotation');
    }
    if (raw.rotation) {
        keys(raw.rotation,['pool','count','avoidLast','fallback'],'rotation');
        if (!Array.isArray(raw.rotation.pool) || !raw.rotation.pool.length || raw.rotation.pool.length > 100) fail('rotation pool must have 1-100 entries');
        unique(raw.rotation.pool,'rotation quest');
        s.rotation = {...raw.rotation,count:raw.rotation.count ?? 1,avoidLast:raw.rotation.avoidLast ?? 0,fallback:raw.rotation.fallback || 'allow-repeats',
            pool:raw.rotation.pool.map(q => {keys(q,['id','weight'],'rotation entry'); return {id:q.id,weight:number(q.weight ?? 1,1,1000,'weight')};})};
        number(s.rotation.count,1,s.rotation.pool.length,'rotation count'); number(s.rotation.avoidLast,0,30,'avoidLast');
        if (!['allow-repeats','fewer'].includes(s.rotation.fallback)) fail('unsupported rotation fallback');
    }
    return s;
}
function validateConfig(raw, mapId, catalog = {}) {
    keys(raw,['schemaVersion','mapId','defaults','boards','handInLocations','schedules','quests'],'root');
    if (raw.schemaVersion !== 1 || raw.mapId !== mapId) fail('schemaVersion must be 1 and mapId must match filename');
    id(mapId,'map'); const defaults = policy(raw.defaults);
    const boards = unique(raw.boards || [],'board').map(b => {
        keys(b,['id','enabled','label','description','bounds','placements','questIds','showSchedule','labels','categories','allowStoryAcceptance'],'board');
        if (!Array.isArray(b.questIds) || new Set(b.questIds).size !== b.questIds.length) fail('board questIds must be unique');
        b.questIds.forEach(value=>id(value,'board quest'));
        const result = {...b,enabled:b.enabled ?? true,showSchedule:b.showSchedule ?? true,allowStoryAcceptance:b.allowStoryAcceptance ?? false,bounds:bounds(b.bounds,'board bounds')};
        text(b.label,'board label',120); for (const key of ['enabled','showSchedule','allowStoryAcceptance']) boolean(result[key],key);
        if (b.description !== undefined) text(b.description,'description');
        if (b.placements) {if (!Array.isArray(b.placements) || b.placements.length > 20) fail('invalid board placements'); result.placements=b.placements.map(v=>bounds(v,'placement'));}
        if (b.labels) {keys(b.labels,['adventures','challenges','requests'],'board labels'); Object.values(b.labels).forEach(v=>text(v,'category label',60));}
        if (b.categories && (!Array.isArray(b.categories) || b.categories.some(c=>!['adventures','challenges','requests'].includes(c)))) fail('unsupported board category');
        return result;
    });
    const locations = unique(raw.handInLocations || [],'hand-in location').map(v => {
        keys(v,['id','kind','label','bounds','boardId'],'hand-in location'); text(v.label,'hand-in label',120);
        if (!['object','board'].includes(v.kind)) fail('hand-in location kind must be object or board');
        const board = boards.find(b=>b.id===v.boardId);
        if (v.kind === 'board' && (!board || v.bounds)) fail('board receiver must reference boardId without bounds');
        if (v.kind === 'object' && v.boardId) fail('object receiver cannot reference boardId');
        return {...v,bounds:v.kind === 'board' ? board.bounds : bounds(v.bounds,'hand-in bounds')};
    });
    const schedules = unique(raw.schedules || [],'schedule').map(schedule);
    const quests = unique(raw.quests || [],'quest'), stories = [], assignments = [];
    for (const q of quests) {
        if (!q.scheduleId) {
            if (q.category || q.rewards || q.policy || q.objectives?.some(o=>['TILE_ACTION','DELIVER_ITEMS','FISHING'].includes(o.eventType))) fail('board assignment requires scheduleId: ' + q.id);
            stories.push(q); continue;
        }
        keys(q,['id','enabled','name','description','category','scheduleId','requiredLevel','requiredQuest','secret','ordered','objectives','rewards','policy','estimatedMinutes'],'quest');
        text(q.name,'quest name',150); if (q.description !== undefined) text(q.description,'quest description');
        if (!schedules.some(s=>s.id===q.scheduleId)) fail('unknown schedule ' + q.scheduleId);
        if (!['adventures','challenges','requests'].includes(q.category)) fail('unknown quest category');
        const objectives = unique(q.objectives,'objective').map((o,index) => {
            keys(o,['id','label','eventType','action','stage','target','measurement','amount','area','tiles','recipientId','items'],'objective');
            if (!EVENTS.includes(o.eventType)) fail('unsupported objective event ' + o.eventType);
            if (o.label !== undefined) text(o.label,'objective label',200);
            const result = {...o};
            if (o.eventType === 'DELIVER_ITEMS') {
                if (index !== q.objectives.length - 1 || q.objectives.filter(v=>v.eventType==='DELIVER_ITEMS').length!==1) fail('hand-in must be the final objective');
                if (!locations.some(r=>r.id===o.recipientId)) fail('unknown recipient ' + o.recipientId);
                if (['action','stage','target','measurement','area','tiles'].some(k=>o[k]!==undefined)) fail('hand-in must not restrict acquisition source');
                result.items=items(o.items,catalog); result.amount=1;
            } else {
                if (o.items || o.recipientId) fail('only hand-in objectives define items/recipient');
                result.amount=number(o.amount ?? 1,1,1000000,'objective amount'); result.measurement=o.measurement || 'count';
                if (!['count','quantity'].includes(result.measurement)) fail('unknown measurement');
                if (o.area) result.area=bounds(o.area,'objective area');
                if (o.tiles) {if (!Array.isArray(o.tiles) || !o.tiles.length || o.tiles.length>200) fail('invalid objective tiles'); result.tiles=o.tiles.map(t=>{keys(t,['x','y'],'tile'); number(t.x,0,100000,'tile x'); number(t.y,0,100000,'tile y'); return t;});}
                if (o.eventType === 'TILE_ACTION') {
                    text(o.action,'tile action',100); text(o.stage,'tile stage',100);
                    const action = catalog.tileActions?.find(a=>a.map===mapId && a.action===o.action);
                    if (catalog.tileActions && (!action || !action.stages.includes(o.stage))) fail('unregistered successful tile action/stage ' + o.action + '/' + o.stage);
                    if (o.target !== undefined && o.target !== '*' && action && !action.targets.some(t=>t.value===o.target)) fail('unknown tile-action target ' + o.target);
                    if (result.measurement==='quantity' && (!o.target || o.target==='*' || (action && !(action.quantityStages || []).includes(o.stage)))) fail('quantity needs a specific output target and a producing stage');
                } else {
                    if (o.action || o.stage) fail('action/stage only apply to tile actions');
                    if (o.eventType==='AREA_ENTERED') {
                        text(o.target,'area target',100);
                        if (catalog.resolveArea && !catalog.resolveArea(o.target,mapId)) fail('unknown named map scene ' + o.target);
                    }
                    else result.target=resolveEntity(o.target,catalog,o.eventType==='KILL_MOB'?'mob':o.eventType==='NPC_TALKED'?'npc':o.eventType==='FISHING'?'fish':'loot');
                }
            }
            return result;
        });
        if (!objectives.length || objectives.length > 12) fail('quests need 1-12 objectives');
        keys(q.rewards || {},['xp','items'],'rewards');
        const rewards = {xp:number(q.rewards?.xp ?? 0,0,1000,'reward XP')};
        if (q.rewards?.items) rewards.items=items(q.rewards.items,catalog,true);
        const resolved = {...q,enabled:q.enabled ?? true,secret:q.secret ?? false,ordered:q.ordered ?? false,requiredLevel:number(q.requiredLevel ?? 1,1,100000,'requiredLevel'),objectives,rewards,policy:policy({...defaults,...q.policy,withdrawal:{...defaults.withdrawal,...q.policy?.withdrawal}})};
        for (const key of ['enabled','secret','ordered']) boolean(resolved[key],key);
        if (q.requiredQuest) id(q.requiredQuest,'requiredQuest'); if (q.estimatedMinutes!==undefined) number(q.estimatedMinutes,1,100000,'estimatedMinutes');
        assignments.push(resolved);
    }
    for (const s of schedules) for (const entry of s.rotation?.pool || []) if (!assignments.some(q=>q.id===entry.id && q.scheduleId===s.id)) fail('rotation references a quest outside its schedule: ' + entry.id);
    const known = new Set([...quests.map(q=>q.id),...(catalog.storyIds || [])]);
    const storyIds = new Set([...stories.map(q=>q.id),...(catalog.storyIds || [])]);
    for (const b of boards) for (const q of b.questIds) if (!known.has(q)) fail('board references unknown quest ' + q);
    for (const q of assignments) if (q.requiredQuest && !storyIds.has(q.requiredQuest)) fail('unknown story prerequisite ' + q.requiredQuest);
    const config={schemaVersion:1,mapId,defaults,boards,handInLocations:locations,schedules,quests:assignments,stories};
    config.version=crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'); return config;
}
function loadMapQuests(mapId, directory = process.env.QUEST_BOARD_CONFIG_DIR || path.resolve(__dirname,'../quests'), catalog = {}) {
    const filename=path.join(directory,mapId+'.json');
    if (fs.existsSync(filename)) return {config:validateConfig(JSON.parse(fs.readFileSync(filename,'utf8')),mapId,catalog),json:true};
    const legacy=path.join(__dirname,'../quests',mapId+'.js'); return {quests:fs.existsSync(legacy)?require(legacy).quests:[],json:false};
}
module.exports={DEFAULTS,EVENTS,validateConfig,loadMapQuests};
