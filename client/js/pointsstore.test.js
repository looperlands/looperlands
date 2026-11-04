const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const catalog=require('../../server/fixtures/points-store.json');
function element(tag) {
    return {tag,style:{},children:[],dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(key,value){this[key]=value;},querySelector(){return null;},querySelectorAll(){return [];},focus(){},
        set textContent(value){this.valueText=String(value);},get textContent(){return (this.valueText||'')+' '+this.children.map(row=>row.textContent).join(' ');}};
}
function descendants(el){return [el,...el.children.flatMap(descendants)];}
function setup() {
    let Store;const saved=new Map(),emotes=['sing','confetti','lantern'].map(id=>({...element('button'),dataset:{emotion:id}}));
    const document={body:element('body'),activeElement:null,createElement:tag=>{const el=element(tag);el.focus=()=>{document.activeElement=el;};el.getAttribute=key=>el[key];el.contains=child=>descendants(el).includes(child);el.querySelectorAll=selector=>selector.includes('button')?descendants(el).filter(child=>child.tag==='button'):[];el.querySelector=selector=>el.querySelectorAll(selector)[0] || null;return el;},addEventListener(){},querySelectorAll:()=>emotes};
    const data={...catalog,assets:[],wallet:'0xabc',balance:{earned:500,spent:0,available:500},unlocks:[],selectedTitle:null,canPurchase:true,objectives:{daily:catalog.objectives.map(row=>({...row,progress:0})),dailyReward:1,weeklyReward:5,weeklyDays:0,weeklyTarget:4}};
    const axios={get:jest.fn(async()=>({data})),post:jest.fn(async()=>({data:{paid:100}})),put:jest.fn(async()=>({data:{}}))};
    vm.runInNewContext(fs.readFileSync(__dirname+'/pointsstore.js','utf8'),{define:(_,factory)=>{Store=factory({label:value=>value,ReforgeFX:class {settle(){return Promise.resolve();}stop(){}}},{render(){},sources(){return [];}},{});},document,axios,crypto,setInterval:()=>1,clearInterval(){},Types:{unlockableEmotions:{confetti:'store',lantern:'event'}},localStorage:{setItem:(key,value)=>saved.set(key,value),getItem:key=>saved.get(key)||null,removeItem:key=>saved.delete(key)}});
    const app={sessionId:'s',game:{started:true,client:{connection:{connected:true}},player:{},keyboardHandler:{handleBlur(){}}},hideWindows(){},hideChat(){},eventBoard:{close(){}}};
    const store=new Store(app);return {store,app,axios,data,saved,emotes,document};
}
test('store distinguishes purchasable unlocks and event-only rewards',async()=>{
    const f=setup();await f.store.open();expect(f.store.board.textContent).toContain('250 points');expect(f.store.board.textContent).toContain('Event-exclusive');
    f.store.tab='rewards';f.store.render();expect(f.store.board.textContent).toContain('Lantern Gathering');expect(f.store.board.textContent).toContain('Event exclusive · not for sale');
    f.store.applyRewards({unlocks:['emote:confetti']});expect(f.emotes[1].disabled).toBe(false);expect(f.emotes[2].disabled).toBe(true);expect(f.emotes[0].disabled).toBeUndefined();
});
test('only eligible assets allow confirmation and possible outcomes exclude the current trait',async()=>{
    const f=setup();await f.store.open();f.store.selection={product:catalog.products[0]};f.store.render();
    expect(descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Reforge trait').disabled).toBe(true);
    f.data.assets=[{nftId:'sword',name:'Sword',type:'weapon',trait:'speed',traits:['speed','aoe','crit']}];f.store.render();expect(f.store.board.textContent).toContain('aoe or crit · equal chance');
    const confirm=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Reforge trait');expect(confirm.disabled).toBe(false);
});
test('lost response persists the same purchase ID and blocks another purchase until checked',async()=>{
    const f=setup();await f.store.open();const pending={requestId:crypto.randomUUID(),productId:'emote-confetti',confirmed:true};f.store.pending=pending;f.store.remember();f.axios.post.mockRejectedValueOnce(new Error('lost response'));
    await f.store.buy();expect(f.store.pending).toEqual(pending);expect(f.saved.size).toBe(1);expect(f.store.board.textContent).toContain('Check your pending purchase');
    await f.store.buy();expect(f.axios.post.mock.calls[0][1].requestId).toBe(f.axios.post.mock.calls[1][1].requestId);expect(f.store.pending).toBeNull();expect(f.saved.size).toBe(0);
});
test('definitive rejection clears the pending request and keeps a readable error',async()=>{
    const f=setup();await f.store.open();f.store.pending={requestId:crypto.randomUUID(),productId:'emote-confetti'};f.store.remember();f.axios.post.mockRejectedValue({response:{status:400,data:{error:'Not enough points'}}});
    await f.store.buy();expect(f.store.pending).toBeNull();expect(f.store.board.textContent).toContain('Not enough points');
});
test('remote browsing shows progress and cannot purchase',async()=>{
    const f=setup();f.data.canPurchase=false;await f.store.open('objectives');expect(f.store.board.textContent).toContain('Earn 1 point per challenge. Complete all three for 3 points.');expect(f.store.board.textContent).toContain('Earn 5 extra points.');
    f.store.tab='shop';f.store.selection={product:catalog.products[0]};f.store.render();expect(descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Reforge trait').disabled).toBe(true);
});
test('confirmed purchase with failed live refresh is not retried or charged again',async()=>{
    const f=setup();await f.store.open();f.store.pending={requestId:crypto.randomUUID(),productId:'class-change'};f.axios.post.mockResolvedValue({data:{trait:'tank',refreshRequired:true}});await f.store.buy();expect(f.store.pending).toBeNull();expect(f.store.notice).toContain('Reconnect');
});

test('objective meters expose partial and completed progress and update on refresh',async()=>{
    const f=setup();f.data.objectives.daily[0].progress=12;await f.store.open('objectives');
    let meter=descendants(f.store.board).find(el=>el.role==='progressbar');
    expect(meter['aria-valuenow']).toBe('12');expect(meter.children[0].style.width).toBe('24%');
    f.data.objectives.daily[0].progress=50;await f.store.tick();
    meter=descendants(f.store.board).find(el=>el.role==='progressbar');expect(meter.children[0].style.width).toBe('100%');
});
test('a receipt from an old session never clears the new wallet pending purchase',async()=>{
    const f=setup();await f.store.open();f.store.pending={requestId:'old',productId:'emote-confetti'};f.store.remember();
    let resolve;f.axios.post.mockImplementation(()=>new Promise(done=>{resolve=done;}));const purchasing=f.store.buy();
    f.app.sessionId='other';f.store.purchaseStorageKey='points-purchase:other';f.store.pending={requestId:'new',productId:'emote-salute'};f.store.remember();
    resolve({data:{paid:100}});await purchasing;
    expect(f.saved.has('points-purchase:0xabc')).toBe(false);expect(f.saved.has('points-purchase:other')).toBe(true);expect(f.store.pending.requestId).toBe('new');
});

test('equipment, class and title choices use tiles instead of dropdowns',async()=>{
    const f=setup();f.data.assets=[{nftId:'one',name:'One',type:'looper',trait:'tank',traits:['tank','rogue','ranger','fighter']},{nftId:'two',name:'Two',type:'looper',trait:'rogue',traits:['tank','rogue','ranger','fighter']}];
    await f.store.open();f.store.selection={product:catalog.products.find(row=>row.type==='class')};f.store.render();
    expect(descendants(f.store.board).filter(el=>el.tag==='select')).toHaveLength(0);
    const ranger=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='ranger');ranger.listeners.click();expect(f.store.selection.choice).toBe('ranger');
    const two=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Two');two.listeners.click();expect(f.store.selection.nftId).toBe('two');
    f.store.tab='rewards';f.store.render();expect(descendants(f.store.board).filter(el=>el.tag==='select')).toHaveLength(0);
});

test('refreshes preserve keyboard focus and Tab recovers focus outside the panel',async()=>{
    const f=setup();await f.store.open('objectives');
    const tab=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Earn points');tab.focus();
    await f.store.tick();expect(f.document.activeElement).not.toBe(tab);expect(f.document.activeElement.textContent.trim()).toBe('Earn points');
    f.document.activeElement=f.document.body;const event={key:'Tab',preventDefault:jest.fn(),stopImmediatePropagation:jest.fn()};f.store.keyboard(event);
    expect(f.document.activeElement['aria-label']).toBe('Close Points Exchange');expect(event.preventDefault).toHaveBeenCalled();
});
test('owned trail tiles equip and clear through the rewards endpoint',async()=>{
    const f=setup();f.data.unlocks=['trail:golden-sparks'];await f.store.open('rewards');
    const tile=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim()==='Golden Spark Trail');
    await tile.listeners.click();expect(f.axios.put).toHaveBeenCalledWith('/session/s/rewards/trail',{trail:'trail:golden-sparks'});
    const clear=descendants(f.store.board).find(el=>el.tag==='button'&&el.textContent.trim().endsWith('No trail'));await clear.listeners.click();expect(f.axios.put).toHaveBeenLastCalledWith('/session/s/rewards/trail',{trail:null});
});

test('completed harvests show a checkmark immediately after confirmed refresh',async()=>{
    const f=setup();f.data.objectives.daily[2].progress=19;await f.store.open('objectives');expect(f.store.board.textContent).not.toContain('✓ Complete');
    f.data.objectives.daily[2].progress=20;await f.store.load();expect(f.store.board.textContent).toContain('✓ Complete');expect(f.store.board.textContent).toContain('Completed · +1 point');
});
test('closed stores poll lightweight progress and ignore responses belonging to a previous session',async()=>{
    const f=setup();await f.store.tick();expect(f.axios.get).toHaveBeenCalledWith('/session/s/points-store/progress');expect(f.store.progress).toBe(f.data);expect(f.store.progressSession).toBe('s');
    let resolve;f.axios.get.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const pending=f.store.loadProgress();f.app.sessionId='other';resolve({data:{balance:{available:99}}});await pending;expect(f.store.progress).toBe(f.data);
});
