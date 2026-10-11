const {createHash} = require('crypto');
const {generate,refillTemplates} = require('./generation');
const DAY = 86400000, HOUR = 3600000;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const formatters = new Map(), boundaryCache = new Map(), rotations = new Map();
function parts(time, zone) {
    if (!formatters.has(zone)) formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
    const p=Object.fromEntries(formatters.get(zone).formatToParts(time).filter(v=>v.type!=='literal').map(v=>[v.type,Number(v.value)]));
    return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
}
// Resolve an authored wall clock using IANA offsets. Ambiguous clocks use the
// earliest instant; a skipped clock advances to the first valid local minute.
function localInstant(wall, zone) {
    const key=zone+':'+wall; if (boundaryCache.has(key)) return boundaryCache.get(key);
    if (zone==='UTC') return wall;
    const offsets=new Set([-2,-1,0,1,2].map(d=>{const t=wall+d*DAY; return parts(t,zone)-t;}));
    const exact=[...offsets].map(offset=>wall-offset).filter(t=>parts(t,zone)===wall);
    let result=exact.length?Math.min(...exact):null;
    if (result===null) {
        const candidates=[...offsets].map(offset=>wall-offset), from=Math.min(...candidates)-HOUR, to=Math.max(...candidates)+HOUR;
        for (let t=from;t<=to;t+=60000) if (parts(t,zone)>=wall && (result===null || parts(t,zone)<parts(result,zone) || (parts(t,zone)===parts(result,zone)&&t<result))) result=t;
    }
    if (result===null) throw new Error('Cannot resolve local quest opening');
    boundaryCache.set(key,result); if (boundaryCache.size>20000) boundaryCache.delete(boundaryCache.keys().next().value); return result;
}
function anchor(schedule) {
    let day=Date.parse(schedule.repeat.anchorDate+'T00:00:00Z');
    if (schedule.repeat.frequency==='weekly') day+=((schedule.repeat.dayOfWeek??1)-new Date(day).getUTCDay()+7)%7*DAY;
    return day;
}
function opening(schedule,index) {
    const [h,m]=schedule.opensAtLocalTime.split(':').map(Number);
    const stride=schedule.repeat.interval*(schedule.repeat.frequency==='weekly'?7:1);
    return localInstant(anchor(schedule)+index*stride*DAY+h*HOUR+m*60000,schedule.timezone);
}
function windows(schedule,now) {
    if (schedule.dates) return schedule.dates.map((w,index)=>({...w,index})).filter(w=>w.endsAt>now&&w.opensAt<=now+schedule.previewHours*HOUR);
    if (schedule.repeat.frequency==='permanent') return [{index:0,opensAt:0,acceptUntil:253402300799000,endsAt:253402300799000}];
    const stride=schedule.repeat.interval*(schedule.repeat.frequency==='weekly'?7:1), center=Math.floor((parts(now,schedule.timezone)-anchor(schedule))/(stride*DAY));
    const result=[],back=Math.ceil((schedule.completionWindowHours || stride*24)/(stride*24))+2,forward=Math.ceil(schedule.previewHours/(stride*24))+2;
    for (let index=Math.max(0,center-back);index<=center+forward;index++) {
        const opensAt=opening(schedule,index), endsAt=schedule.completeAt==='nextOpening'?opening(schedule,index+1):opensAt+schedule.completionWindowHours*HOUR;
        // A next-opening window can be 23 hours across DST. Clamp the elapsed
        // acceptance duration to its actual calendar deadline.
        const acceptUntil=Math.min(opensAt+schedule.acceptanceWindowHours*HOUR,endsAt);
        if (endsAt>now && opensAt<=now+schedule.previewHours*HOUR) result.push({index,opensAt,acceptUntil,endsAt});
    }
    return result;
}
function selected(mapId,schedule,index) {
    if (!schedule.rotation) return null;
    const key=hash([mapId,schedule.id,schedule.repeat,schedule.rotation]), r=schedule.rotation;
    if (!rotations.has(key)) rotations.set(key,{next:0,history:[],selections:new Map()});
    const cache=rotations.get(key);
    for (;cache.next<=index;cache.next++) {
        const seen=new Set(cache.history.flat());
        const ranked=r.pool.map(q=>({id:q.id,score:-Math.log((parseInt(hash([mapId,schedule.id,cache.next,q.id,...(r.seed?[r.seed]:[])]).slice(0,12),16)+1)/(0xffffffffffff+2))/q.weight})).sort((a,b)=>a.score-b.score || a.id.localeCompare(b.id));
        const allowed=ranked.filter(q=>!seen.has(q.id));
        if (allowed.length<r.count && r.fallback==='allow-repeats') allowed.push(...ranked.filter(q=>seen.has(q.id)));
        const pick=allowed.slice(0,r.count).map(q=>q.id); cache.selections.set(cache.next,pick); cache.history.push(pick);
        if (cache.history.length>r.avoidLast) cache.history.shift();
    }
    return cache.selections.get(index);
}
function occurrences(config,now=Date.now()) {
    const result=[];
    for (const schedule of config.schedules) for (const window of windows(schedule,now)) {
        const selection=selected(config.mapId,schedule,window.index);
        const templates=schedule.refill?refillTemplates(config,schedule,window):config.quests
            .filter(q=>q.scheduleId===schedule.id && (!selection || selection.includes(q.id))).map(quest=>({quest}));
        for (const {quest:q,refill} of templates) {
            const {index,...timing}=window, boardIds=config.boards.filter(b=>b.questIds.includes(q.id)).map(b=>b.id);
            const resolved=generate(q,[config.mapId,schedule.id,timing.opensAt,...(refill?[refill.category,refill.index]:[])]);
            const recipientId=resolved.objectives.find(o=>o.eventType==='DELIVER_ITEMS')?.recipientId;
            const recipient=recipientId?config.handInLocations.find(r=>r.id===recipientId):null;
            // Slot identity stays fixed even if a later edit chooses another template.
            const questId=refill?hash([config.mapId,schedule.id,refill.category,refill.index]):q.id;
            result.push({id:hash([config.mapId,questId,timing.opensAt]),questId,mapId:config.mapId,...timing,
                snapshot:{...resolved,version:config.version,boardIds,recipient,timezone:schedule.timezone,...(refill?{templateId:q.id,refill}:{})}});
        }
    }
    return result.sort((a,b)=>a.opensAt-b.opensAt || a.questId.localeCompare(b.questId));
}
module.exports={occurrences,windows,localInstant,selected};
