const fs = require('fs');
const vm = require('vm');
let Reward, browserStorage, document, app;
function element(tag) {
    return {tag, children:[], style:{setProperty:jest.fn()}, setAttribute:jest.fn(), remove:jest.fn(),
        append(...children) {this.children.push(...children);}, replaceChildren(...children) {this.children=children;},
        set textContent(value) {this.value=value;}, get textContent() {return (this.value || '')+this.children.map(child=>child.textContent).join(' ');}};
}
function load() {
    vm.runInNewContext(fs.readFileSync(require.resolve('./dailyplaycelebration'), 'utf8'), {
        define:(_, factory)=>{Reward=factory();}, Date, setTimeout, clearTimeout, Map,
        document, localStorage:browserStorage, window:{matchMedia:()=>({matches:false})}
    });
}
const progress = {points:17, streak:7, checkedInToday:true, todayPoints:8, resetsAt:'2026-10-27T00:00:00Z'};
beforeEach(()=>{
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const saved = new Map();
    browserStorage={getItem:jest.fn(key=>saved.get(key)||null), setItem:jest.fn((key,value)=>saved.set(key,value))};
    document={hidden:false, body:{append:jest.fn(), classList:{contains:()=>false}}, createElement:element};
    app={storage:{walletId:'0xABC:ethereum'}, game:{started:true, player:{isDead:false}},
        settings:{getReducedMotion:()=>false,getCombatEffectsEnabled:()=>true},progressionCards:{busy:false}};
    load();
});
afterEach(()=>jest.useRealTimers());

test('confirmed daily rewards have a breakdown, brief celebration and no persistent UI', ()=>{
    const reward=new Reward(app);
    expect(reward.consider({...progress,checkedInToday:false})).toBe(false);
    expect(reward.consider(progress)).toBe(true);
    expect(reward.root.textContent).toContain('7-day streak!');
    expect(reward.root.textContent).toContain('+8 points');
    expect(reward.root.textContent).toContain('1 daily play point · +7 streak bonus');
    expect(reward.root.children[0].className).toContain('dr-motion');
    expect(reward.root.setAttribute).toHaveBeenCalledWith('role','status');
    jest.advanceTimersByTime(4200);
    expect(reward.root.hidden).toBe(true);
    expect(reward.consider(progress)).toBe(false);
});

test('reconnects, avatars and a full page reload share the wallet/day receipt', ()=>{
    const first=new Reward(app); first.consider(progress); first.destroy();
    app.storage.walletId='0xabc';
    load(); // A new module instance, as on a full reload; only browser storage survives.
    expect(new Reward(app).consider(progress)).toBe(false);
    app.storage.walletId='0xother';
    expect(new Reward(app).consider(progress)).toBe(true);
});

test('UTC rollover permits a new reward while stale responses cannot replay', ()=>{
    const reward=new Reward(app); reward.consider(progress); reward.hide();
    jest.setSystemTime(new Date('2026-10-27T00:01:00Z'));
    expect(reward.consider(progress)).toBe(false);
    expect(reward.consider({...progress,points:18,streak:8,todayPoints:1,resetsAt:'2026-10-28T00:00:00Z'})).toBe(true);
});

test('a delayed streak bonus celebrates only the additional points', ()=>{
    const reward=new Reward(app);
    reward.consider({...progress,todayPoints:1}); reward.hide();
    expect(reward.consider(progress)).toBe(true);
    expect(reward.root.textContent).toContain('+7 points');
    expect(reward.root.textContent).not.toContain('1 daily play point');
    reward.hide(); expect(reward.consider(progress)).toBe(false);
});

test('hidden tabs, death, open boards, other reward animations and menus defer without consuming the reward', ()=>{
    const reward=new Reward(app);
    document.hidden=true; expect(reward.consider(progress)).toBe(false); document.hidden=false;
    app.game.player.isDead=true; expect(reward.consider(progress)).toBe(false); app.game.player.isDead=false;
    expect(reward.consider(progress,true)).toBe(false);
    app.progressionCards.busy=true; expect(reward.consider(progress)).toBe(false); app.progressionCards.busy=false;
    document.body.classList.contains=name=>name==='settings'; expect(reward.consider(progress)).toBe(false);
    document.body.classList.contains=()=>false;
    expect(browserStorage.setItem).not.toHaveBeenCalled();
    expect(reward.consider(progress)).toBe(true);
});

test('reduced motion keeps the message readable without animation or particles', ()=>{
    app.settings.getReducedMotion=()=>true;
    const reward=new Reward(app); reward.consider(progress);
    expect(reward.root.children[0].className).not.toContain('dr-motion');
    expect(reward.root.children[0].children.some(child=>child.className==='dr-sparks')).toBe(false);
    jest.advanceTimersByTime(4199); expect(reward.root.hidden).toBe(false);
    jest.advanceTimersByTime(1); expect(reward.root.hidden).toBe(true);
});

test('blocked browser storage still deduplicates in memory and teardown cancels the toast', ()=>{
    browserStorage.getItem=()=>{throw new Error('blocked');}; browserStorage.setItem=()=>{throw new Error('blocked');};
    const reward=new Reward(app); expect(reward.consider(progress)).toBe(true); reward.destroy();
    expect(reward.root.hidden).toBe(true); expect(reward.root.remove).toHaveBeenCalled();
    expect(new Reward(app).consider(progress)).toBe(false);
});

const objectives = () => ({balance:{available:19},objectives:{dailyReward:1,resetsAt:progress.resetsAt,daily:[
    {id:'fishing',label:'Make 15 successful catches',target:15,progress:15},
    {id:'harvest',label:'Complete 20 harvests',target:20,progress:20}]}});
test('each completed challenge queues its own brown popup and deduplicates across reloads',()=>{
    const reward=new Reward(app), data=objectives();
    expect(reward.considerObjectives(data)).toBe(true);
    expect(reward.root.textContent).toContain('Daily challenge complete!');
    expect(reward.root.textContent).toContain('Make 15 successful catches');
    expect(reward.root.textContent).toContain('+1 point');
    expect(reward.root.textContent).not.toContain('streak bonus');
    expect(reward.considerObjectives(data)).toBe(false);
    jest.advanceTimersByTime(5000);
    expect(reward.considerObjectives(data)).toBe(true);
    expect(reward.root.textContent).toContain('Complete 20 harvests');
    reward.destroy();load();expect(new Reward(app).considerObjectives(data)).toBe(false);
});
test('partial, expired, deferred and stale daily progress cannot consume a completion receipt',()=>{
    const reward=new Reward(app), data=objectives();data.objectives.daily[0].progress=14;data.objectives.daily[1].progress=19;
    expect(reward.considerObjectives(data)).toBe(false);
    data.objectives.daily[1].progress=20;expect(reward.considerObjectives(data,true)).toBe(false);
    app.game.player.isDead=true;expect(reward.considerObjectives(data)).toBe(false);app.game.player.isDead=false;
    expect(reward.considerObjectives(data)).toBe(true);reward.hide();
    expect(reward.considerObjectives(data)).toBe(false);
    jest.setSystemTime(new Date('2026-10-27T00:01:00Z'));
    expect(reward.considerObjectives(data)).toBe(false);
    data.objectives.resetsAt='2026-10-28T00:00:00Z';expect(reward.considerObjectives(data)).toBe(true);
});
test('blocked storage still suppresses repeated challenge notifications',()=>{
    browserStorage.getItem=()=>{throw new Error('blocked');};browserStorage.setItem=()=>{throw new Error('blocked');};
    const data=objectives();data.objectives.daily.pop();const reward=new Reward(app);
    expect(reward.considerObjectives(data)).toBe(true);reward.destroy();expect(new Reward(app).considerObjectives(data)).toBe(false);
});

test('challenge celebrations stamp the quest seal, burst once and honor sound and motion preferences',()=>{
    app.game.audioManager={playSound:jest.fn()};const reward=new Reward(app);reward.considerObjectives(objectives());
    const content=reward.root.children[0];expect(content.className).toContain('dr-objective');expect(content.children[0].className).toBe('quest-seal dr-complete-seal');
    expect(content.children.find(child=>child.className==='dr-sparks').children).toHaveLength(16);expect(app.game.audioManager.playSound).toHaveBeenCalledWith('achievement');
    reward.destroy();app.storage.walletId='0xother';app.settings.getReducedMotion=()=>true;const quiet=new Reward(app);quiet.considerObjectives(objectives());
    expect(quiet.root.children[0].className).not.toContain('dr-motion');expect(quiet.root.children[0].children.some(child=>child.className==='dr-sparks')).toBe(false);
});
