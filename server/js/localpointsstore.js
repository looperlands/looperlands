// Offline implementation of the platform contract. Catalog fixture is copied from the platform resources/points-store.json.
const catalog = require('../fixtures/points-store.json');
const DailyPlay = require('./dailyplay');
const Types = require('../../shared/js/gametypes');
const crypto = require('crypto');
const key = wallet => wallet.toLowerCase().split(':')[0];
const error = message => {throw Object.assign(new Error(message), {response: {status: 400, data: {error: message}}});};
const monday = day => {const date = new Date(day); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return DailyPlay.dayOf(date);};
function account(client, state, wallet) {
    const row = client.wallet(state, key(wallet));
    row.pointsStore ||= {entries: {}, objectives: {}, unlocks: [], selectedTitle: null};
    return row.pointsStore;
}
const completedDays = data => [...new Set(Object.keys(data.entries).filter(id => id.startsWith('daily:')).map(id => id.slice(6,16)))];
const traits = type => type === 'looper' ? ['tank','rogue','ranger','fighter'] : type === 'fishingrod' ? ['lucky','double_catch','upper_hand'] : ['speed','aoe','crit'];
function assetType(nft) {
    const type = Types.getTypeFromString(nft.replace(/^0x/, 'NFT_'));
    return type === 'armor' ? 'looper' : type;
}
function goals(level) {
    const band = catalog.difficulty.filter(row => row.minLevel <= level).pop() || catalog.difficulty[0];
    return catalog.objectives.map(row => {
        const target = row.id === 'combat' ? band.combat : row.target;
        const range = row.id === 'combat' ? {minEnemyLevel:Math.max(1,Math.min(100,level)-2),maxEnemyLevel:Math.min(100,level+2)} : {};
        return {...row, target, ...range, label:row.label.replace('{target}',target)+(row.id==='combat'?' (levels '+range.minEnemyLevel+'–'+range.maxEnemyLevel+')':'')};
    });
}
function record(client, state, rows, now = Date.now()) {
    for (const row of rows) {
        const objective = row.type === 'kill' ? 'combat' : row.type === 'fishing' ? 'fishing' : row.type === 'tile' && row.data?.stage === 'harvest' ? 'harvest' : null;
        if (!objective || !row.actorWallet) continue;
        const day = [DailyPlay.dayOf(row.occurredAt),DailyPlay.dayOf(now)].sort()[0];
        const data = account(client,state,row.actorWallet);
        data.objectives[day] ||= {};
        data.dailyLevels ||= {};
        const level = data.dailyLevels[day] || Math.max(1, Math.floor(Number(row.data?.avatarLevel) || 1));
        const goal = goals(level).find(item => item.id === objective);
        if (objective==='combat' && (!Number.isInteger(row.data?.enemyLevel) || row.data.enemyLevel<goal.minEnemyLevel || row.data.enemyLevel>goal.maxEnemyLevel)) continue;
        data.dailyLevels[day] ||= level;
        const limit = goal.target;
        data.objectives[day][objective] = Math.min(limit,(data.objectives[day][objective] || 0)+1);
        if (data.objectives[day][objective] >= limit) data.entries['daily:'+day+':'+objective] ||= {amount:catalog.dailyReward};
        const week = monday(day);
        const days = completedDays(data).filter(day => monday(day) === week).length;
        if (days >= catalog.weeklyTarget) data.entries['weekly:'+week] ||= {amount:catalog.weeklyReward};
    }
}
function balance(client, state, wallet, now = Date.now()) {
    const data = account(client,state,wallet), entries = Object.values(data.entries);
    const earned = DailyPlay.present(client.wallet(state,key(wallet)).dailyPlay,now).points + entries.reduce((sum,row) => sum+Math.max(0,row.amount),0);
    const spent = entries.reduce((sum,row) => sum-Math.min(0,row.amount),0);
    return {earned,spent,available:earned-spent};
}
function rewards(client,state,wallet) {
    const data = account(client,state,wallet);
    return {unlocks:[...data.unlocks],selectedTitle:data.selectedTitle,selectedHit:data.selectedHit || null,selectedTrail:data.selectedTrail || null,rewards:catalog.rewards};
}
function progress(client,state,wallet,now = Date.now(),level = 1) {
    const data = account(client,state,wallet), day = DailyPlay.dayOf(now), week = monday(day);
    const next = new Date(week); next.setUTCDate(next.getUTCDate()+7);
    return {balance:balance(client,state,wallet,now),
        objectives:{level:data.dailyLevels?.[day] || level,locked:!!data.dailyLevels?.[day],daily:goals(data.dailyLevels?.[day] || level).map(row => ({...row,progress:data.objectives[day]?.[row.id] || 0})),dailyReward:catalog.dailyReward,dailyCompleted:completedDays(data).includes(day),
            weeklyDays:completedDays(data).filter(day => monday(day) === week).length,weeklyTarget:catalog.weeklyTarget,weeklyReward:catalog.weeklyReward,
            resetsAt:new Date(Date.parse(day)+86400000).toISOString(),weekResetsAt:next.toISOString()}};
}
function overview(client,state,wallet,now = Date.now(),level = 1) {
    return {...catalog,...rewards(client,state,wallet),...progress(client,state,wallet,now,level),assets:Object.entries(state.assets).filter(([nft,row]) => row.wallet === key(wallet) && ['looper','weapon','ranged_weapon','fishingrod'].includes(assetType(nft))).map(([nftId,row]) => ({nftId,name:'Local '+assetType(nftId),type:assetType(nftId),trait:row.trait,traits:traits(assetType(nftId))}))};
}
function purchase(client,state,wallet,body) {
    const {requestId,productId,nftId = null,choice = null} = body;
    if (typeof requestId !== 'string' || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(requestId)) error('Invalid purchase ID.');
    const data = account(client,state,wallet), id = 'purchase:'+requestId.toLowerCase(), request = {productId,nftId,choice};
    if (data.entries[id]) {
        if (JSON.stringify(data.entries[id].request) !== JSON.stringify(request)) error('This purchase ID belongs to a different purchase.');
        return data.entries[id].result;
    }
    const product = catalog.products.find(row => row.id === productId);
    if (!product) error('This product is not sold here.');
    if (balance(client,state,wallet).available < product.price) error('You do not have enough points.');
    const result = {requestId,productId,paid:product.price};
    if (product.type === 'unlock') {
        if (nftId !== null || choice !== null) error('This unlock does not target an asset.');
        if (data.unlocks.includes(product.reward)) error('You already own this unlock.');
        if (catalog.rewards.find(row => row.id === product.reward)?.source !== 'store') error('This reward is reserved for an event.');
        data.unlocks.push(product.reward); result.reward = product.reward;
    } else {
        const asset = state.assets[nftId], type = nftId && assetType(nftId);
        if (!asset || asset.wallet !== key(wallet) || !product.assetTypes.includes(type)) error('Choose an eligible asset you own.');
        const values = traits(type);
        if (!values.includes(asset.trait)) error('Initialize this asset’s first trait before buying a change.');
        const choices = values.filter(value => value !== asset.trait);
        if (product.type === 'class' && !choices.includes(choice)) error('Choose a different valid class.');
        if (product.type === 'reroll' && choice !== null) error('A random reroll does not accept a chosen trait.');
        result.nftId = nftId; result.previousTrait = asset.trait;
        asset.trait = product.type === 'class' ? choice : choices[crypto.randomInt(choices.length)]; result.trait = asset.trait;
    }
    data.entries[id] = {amount:-product.price,request,result};
    return result;
}
function selectTitle(client,state,wallet,title) {
    const data = account(client,state,wallet);
    if (title !== null && (!data.unlocks.includes(title) || catalog.rewards.find(row => row.id === title)?.type !== 'title')) error('Unlock this title before equipping it.');
    data.selectedTitle = title;
    return rewards(client,state,wallet);
}
function selectTrail(client,state,wallet,trail) {
    const data = account(client,state,wallet);
    if (trail !== null && (!data.unlocks.includes(trail) || catalog.rewards.find(row => row.id === trail)?.type !== 'trail')) error('Unlock this trail before equipping it.');
    data.selectedTrail = trail;
    return rewards(client,state,wallet);
}
function selectHit(client,state,wallet,hit) {
    const data = account(client,state,wallet);
    if (hit !== null && (!data.unlocks.includes(hit) || catalog.rewards.find(row => row.id === hit)?.type !== 'hit')) error('Unlock this hit before equipping it.');
    data.selectedHit = hit;
    return rewards(client,state,wallet);
}
module.exports = {progress,record,overview,rewards,purchase,selectTitle,selectTrail,selectHit};
