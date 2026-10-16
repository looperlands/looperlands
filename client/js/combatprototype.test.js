const fs=require('fs');
const vm=require('vm');

function setup() {
    let Prototype;
    const button=()=>({hidden:true,setAttribute:jest.fn(),textContent:''});
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatprototype'),'utf8'),{
        define:factory=>{Prototype=factory();},Date,
        Types:{Orientations:{UP:1,DOWN:2,LEFT:3,RIGHT:4}},
    });
    const player={gridX:4,gridY:5,x:64,y:80,movement:{inProgress:false},cancelPath:jest.fn(),isMoving:()=>false,
        disengage:jest.fn(),stop:jest.fn(),idle:jest.fn(),follow:jest.fn(),isAdjacentNonDiagonal:()=>true,setAttackRate:jest.fn(),setGridPosition(x,y){this.gridX=x;this.gridY=y;},
        setOrientation:jest.fn(),getOrientationTo:()=>1,hit:jest.fn()};
    const mob={id:100,gridX:4,gridY:4,x:64,y:64,setGridPosition(x,y){this.gridX=x;this.gridY=y;this.x=x*16;this.y=y*16;},hasMoved:jest.fn(),idle:jest.fn(),walk:jest.fn(),setOrientation(o){this.orientation=o;},getOrientationTo:()=>4,hit:jest.fn()};
    const renderer={registerExtension:jest.fn(),setExtensionData:jest.fn()};
    const game={player,renderer,getEntityById:()=>mob,unregisterEntityPosition:jest.fn(),registerEntityPosition:jest.fn(),
        audioManager:{playSound:jest.fn()},infoManager:{addDamageInfo:jest.fn()},showNotification:jest.fn()};
    const prototype=new Prototype(game);
    prototype.autoTechniques=false; // Existing cases exercise the optional manual/buffer path.
    prototype.toggle=button();prototype.reset=button();prototype.action=button();
    prototype.socket={emit:jest.fn()};
    const packet={enabled:true,serverNow:Date.now(),phase:'recovery',until:Date.now()+1250,
        combo:'counter',comboUntil:Date.now()+1250,lockUntil:0,correction:1,player:{x:4,y:5},
        mob:{id:100,x:4,y:4,hp:160,maxHp:160},event:{id:1,kind:'evade',label:'Counter ready'},lane:[]};
    prototype.receive(packet);
    return {prototype,player,mob,game,renderer,packet};
}

test('tile-boundary reports include each completed step and the correction generation',()=>{
    const {prototype,player}=setup();prototype.socket.emit.mockClear();
    player.x=69;player.destination={gridX:20,gridY:30};prototype.update();
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.gridX=5;prototype.reportPosition();
    player.gridX=6;prototype.reportPosition();prototype.reportPosition();
    expect(prototype.socket.emit.mock.calls).toEqual([
        ['combat-preview',{action:'move',x:5,y:5,next:null,correction:1}],
        ['combat-preview',{action:'move',x:6,y:5,next:null,correction:1}]
    ]);
});

test('technique input needs an adjacent, stationary player; an active lock blocks movement',()=>{
    const {prototype,player,packet}=setup();prototype.socket.emit.mockClear();
    prototype.technique();expect(prototype.socket.emit).toHaveBeenCalledWith('combat-preview',{action:'technique'});
    prototype.socket.emit.mockClear();player.isMoving=()=>true;prototype.technique();
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.isMoving=()=>false;prototype.receive({...packet,phase:'recovery',combo:null,lockUntil:Date.now()+380});
    expect(prototype.locked()).toBe(true);prototype.technique();expect(prototype.socket.emit).not.toHaveBeenCalled();
});

test('repeated state packets do not replay effects or reset a moving player',()=>{
    const {prototype,packet,player}=setup();
    const hit={...packet,event:{id:2,kind:'attack',label:'Counter'}};
    prototype.receive(hit);
    expect(player.hit).toHaveBeenCalledTimes(1);
    player.path=[[4,5],[5,5]];
    prototype.receive(hit);prototype.receive(hit);
    expect(player.path).not.toBeNull();expect(player.hit).toHaveBeenCalledTimes(1);
});

test('disable clears overlays, selection interception, lock and technique controls',()=>{
    const {prototype,renderer,player}=setup();
    prototype.receive({enabled:false,player:{x:9,y:9}});
    expect([player.gridX,player.gridY]).toEqual([9,9]);
    expect(prototype.owns(player)).toBe(false);expect(prototype.select({id:100})).toBe(false);
    expect(prototype.locked()).toBe(false);expect(prototype.action.hidden).toBe(true);
    expect(renderer.setExtensionData).toHaveBeenCalledWith('combat-prototype',null);
});

test('required telegraphs remain present independently of optional combat effect preferences',()=>{
    const {prototype,packet,renderer}=setup();
    prototype.receive({...packet,phase:'windup',lane:[{x:4,y:5},{x:4,y:6}]});
    expect(renderer.setExtensionData).toHaveBeenLastCalledWith('combat-prototype',expect.objectContaining({lane:[{x:4,y:5},{x:4,y:6}]}));
});

test('prototype-controlled actors retain the update timestamp required to stay visible',()=>{
    let Game;
    const sandbox={define:(deps,factory)=>{Game=factory(...deps.map(()=>function(){}));}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'),'utf8'),sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./game'),'utf8'),sandbox);
    const game=Object.create(Game.prototype);
    const player={lastUpdate:1}, mob={lastUpdate:1};
    Object.assign(game,{player,currentTime:6000,combatPrototype:{update:jest.fn(),owns:()=>true}});
    game.onCharacterUpdate(player);game.onCharacterUpdate(mob);
    expect(player.lastUpdate).toBe(6000);expect(mob.lastUpdate).toBe(6000);
});


test('ordinary mob selection releases the player attack loop; selecting the trainer reclaims it',()=>{
    const {prototype,player,mob}=setup();
    expect(prototype.select({id:200})).toBe(false);
    expect(prototype.owns(player)).toBe(false);
    expect(prototype.owns(mob)).toBe(true);
    expect(prototype.socket.emit).toHaveBeenCalledWith('combat-preview',{action:'select',mobId:200});
    expect(prototype.select(mob)).toBe(true);
    expect(prototype.owns(player)).toBe(true);
});

test('unavailable or expired techniques do not consume ordinary attack input',()=>{
    const {prototype,player}=setup();
    player.gridX=10;
    expect(prototype.canTechnique()).toBe(false);
    expect(prototype.technique()).toBe(false);
    player.gridX=4;prototype.state.comboUntil=prototype.now()-1;
    expect(prototype.canTechnique()).toBe(false);
});

test('trainer tracks the player between attacks but holds the telegraphed direction during a charge',()=>{
    const {prototype,packet,mob}=setup();
    expect(mob.orientation).toBe(4);
    prototype.receive({...packet,phase:'windup',direction:{x:0,y:-1}});
    expect(mob.orientation).toBe(1);
    prototype.receive({...packet,phase:'lunge',direction:{x:0,y:-1}});
    expect(mob.orientation).toBe(1);
    prototype.receive({...packet,phase:'chase'});
    expect(mob.orientation).toBe(4);
});

test('normal swings animate once and the server attack interval remains unchanged',()=>{
    const {prototype,packet,mob,player}=setup();
    const strike={...packet,phase:'chase',attackRate:600,event:{id:2,kind:'mob-attack',label:'Strike'}};
    prototype.receive(strike);prototype.receive(strike);
    expect(mob.hit).toHaveBeenCalledTimes(1);
    expect(player.setAttackRate).toHaveBeenLastCalledWith(600);
    prototype.receive({enabled:false,attackRate:800});
    expect(player.setAttackRate).toHaveBeenLastCalledWith(800);
});


test('streak uses existing combat info once without a separate counter XP reward',()=>{
    const {prototype,packet,game}=setup();game.infoManager.addDamageInfo.mockClear();
    const earned={...packet,streak:2,streakUntil:Date.now()+1500,streakBonusPercent:25,reward:{id:1,xp:25}};
    prototype.receive(earned);prototype.receive(earned);prototype.update();
    expect(game.infoManager.addDamageInfo.mock.calls.map(call=>call[0])).toEqual(['2x combo']);
    for (const call of game.infoManager.addDamageInfo.mock.calls) expect(call[3]).toBe('combo');
});

test('a correction cancels the old path before placing the player',()=>{
    const {prototype,player,game}=setup();
    prototype.correct({x:8,y:9});
    expect(player.cancelPath).toHaveBeenCalled();
    expect(game.unregisterEntityPosition.mock.invocationCallOrder.at(-1)).toBeLessThan(player.cancelPath.mock.invocationCallOrder.at(-1));
});


test('counter input during the final sidestep is buffered until the tile completes',()=>{
    const {prototype,player}=setup();prototype.socket.emit.mockClear();
    player.gridX=5;player.gridY=5;player.nextGridX=4;player.nextGridY=5;player.isMoving=()=>true;
    expect(prototype.technique()).toBe(true);
    expect(player.stop).toHaveBeenCalled();
    expect(prototype.locked()).toBe(true);
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.gridX=4;player.isMoving=()=>false;prototype.update();prototype.update();
    expect(prototype.socket.emit.mock.calls).toEqual([['combat-preview',{action:'technique'}]]);
});

test('a late evade press fires when the lunge misses, but never after a hit or buffer expiry',()=>{
    const {prototype,player,packet}=setup();prototype.socket.emit.mockClear();
    const lunging={...packet,phase:'lunge',combo:null,lane:[{x:5,y:5}],event:{id:2,kind:'lunge'}};
    prototype.receive(lunging);
    expect(prototype.technique()).toBe(true);
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    prototype.receive({...packet,event:{id:3,kind:'evade'}});
    expect(prototype.socket.emit).toHaveBeenCalledTimes(1);
    prototype.socket.emit.mockClear();prototype.receive(lunging);prototype.technique();
    prototype.receive({...packet,combo:null,event:{id:4,kind:'hurt'}});
    expect(prototype.pendingTechnique).toBeNull();
    prototype.receive(lunging);prototype.technique();prototype.pendingTechnique.until=prototype.now()-1;
    prototype.receive(packet);
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    prototype.receive({...lunging,lane:[{x:player.gridX,y:player.gridY}]});
    expect(prototype.technique()).toBe(false);
});

test('counter restarts a locked attack animation and uses a fast swing',()=>{
    const {prototype,player,mob}=setup();
    player.animationLock=true;player.currentAnimation={name:'atk_down'};
    const animation={speed:[100,100,100,100],setSpeed:jest.fn()};
    player.hit=jest.fn(()=>{
        expect(player.animationLock).toBe(false);
        expect(player.currentAnimation).toBeNull();
        player.currentAnimation=animation;
    });
    prototype.playStrike(player,mob,'Counter');
    expect(animation.setSpeed).toHaveBeenCalledWith([45,45,45,45]);
    animation.endcount_callback();
    expect(animation.setSpeed).toHaveBeenLastCalledWith([100,100,100,100]);
});


test('combo count labels grow with the streak and cap their visual size',()=>{
    const {prototype,packet,game}=setup();game.infoManager.addDamageInfo.mockClear();
    for (const streak of [2,3,4,7,20]) {
        prototype.receive({...packet,streak,streakUntil:Date.now()+1500});
    }
    expect(game.infoManager.addDamageInfo.mock.calls.map(call=>[call[0],call[6].scale])).toEqual([
        ['2x combo',1],['3x combo',1.2],['4x combo',1.4],['7x combo',2],['20x combo',2]
    ]);
});


test('combo praise and colors advance with the kill count',()=>{
    const {prototype,packet,game}=setup();game.infoManager.addDamageInfo.mockClear();
    for (const streak of [2,3,4,5,7]) prototype.receive({...packet,streak,streakUntil:Date.now()+1500});
    expect(game.infoManager.addDamageInfo.mock.calls.map(call=>[call[6].praise,call[6].color])).toEqual([
        ['Nice!','#fce045'],['Great!','#ffd16a'],['Awesome!','#ffad49'],['Amazing!','#ff875f'],['Unstoppable!','#ff85be']
    ]);
});


test('ordinary-mob openings target that mob and return it to normal AI afterward',()=>{
    const {prototype,packet,player,mob,game}=setup();
    const ordinary={...mob,id:200,target:player,attackingMode:true,followingMode:true,cancelPath:jest.fn(),
        setGridPosition(x,y){this.gridX=x;this.gridY=y;this.x=x*16;this.y=y*16;}};
    game.getEntityById=id=>id===200?ordinary:mob;
    const state={...packet,combo:null,fieldAttacks:[{id:1,phase:'recovery',until:Date.now()+1000,direction:{x:0,y:1},lane:[],mob:{id:200,x:4,y:4,hp:80,maxHp:100}}],
        fieldCombo:{kind:'counter',until:Date.now()+1000,mob:{id:200,x:4,y:4}}};
    prototype.receive(state);expect(prototype.owns(ordinary)).toBe(true);
    expect(ordinary.attackingMode).toBe(false);expect(ordinary.cancelPath).toHaveBeenCalledTimes(1);
    prototype.socket.emit.mockClear();expect(prototype.technique()).toBe(true);
    expect(prototype.socket.emit).toHaveBeenCalledWith('combat-preview',{action:'technique',mobId:200});
    const newTarget={id:999};ordinary.target=newTarget;
    prototype.receive({...packet,combo:null,fieldAttacks:[],fieldCombo:null});
    expect(prototype.owns(ordinary)).toBe(false);expect(ordinary.attackingMode).toBe(true);expect(ordinary.target).toBe(newTarget);
});


test('health target follows normal selection and an ordinary-mob technique instead of the trainer',()=>{
    const {prototype,player,packet}=setup();
    expect(prototype.getHealthTargetId()).toBe(100);
    prototype.select({id:200});player.target={id:200};
    expect(prototype.getHealthTargetId()).toBe(200);
    player.target=null;expect(prototype.getHealthTargetId()).toBeNull();
    prototype.state={...packet,fieldCombo:{kind:'counter',until:Date.now()+1000,mob:{id:200,x:4,y:4}},fieldAttacks:[]};
    prototype.technique();expect(prototype.getHealthTargetId()).toBe(200);
    prototype.select({id:100});expect(prototype.getHealthTargetId()).toBe(100);
});


test('sidestep opening automatically counters once without a follow-up attack',()=>{
    const {prototype,packet,player}=setup();
    let now=packet.serverNow;prototype.now=()=>now;prototype.autoTechniques=true;
    prototype.socket.emit.mockClear();player.isMoving=()=>true;
    prototype.update();expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.isMoving=()=>false;prototype.update();prototype.update();
    expect(prototype.socket.emit.mock.calls).toEqual([['combat-preview',{action:'technique'}]]);
    expect(prototype.action.hidden).toBe(true);
    prototype.receive({...packet,combo:null,comboUntil:0,event:{id:2,kind:'attack',label:'Counter'}});
    expect(prototype.socket.emit).toHaveBeenCalledTimes(1);
    now+=180;prototype.update();prototype.update();
    expect(prototype.socket.emit).toHaveBeenCalledTimes(1);
    expect(player.stop).not.toHaveBeenCalled();
});

test('automatic techniques respect distance and expiry, including ordinary-mob openings',()=>{
    const {prototype,packet,player}=setup();
    let now=packet.serverNow;prototype.now=()=>now;prototype.autoTechniques=true;
    prototype.socket.emit.mockClear();
    prototype.state={...packet,fieldCombo:{kind:'counter',until:now+1000,mob:{id:200,x:4,y:4}},fieldAttacks:[]};
    player.gridX=8;prototype.update();expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.gridX=4;prototype.update();
    expect(prototype.socket.emit.mock.calls).toEqual([['combat-preview',{action:'technique',mobId:200}]]);
    prototype.state.fieldCombo={kind:'counter',until:now+100,mob:{id:200,x:4,y:4}};
    now+=200;prototype.update();expect(prototype.socket.emit).toHaveBeenCalledTimes(1);
});

test('successful charge signals shake once while ordinary state updates do not',()=>{
    const {prototype,packet,game}=setup();
    game.currentTime=1000;game.combatFeedback={addShake:jest.fn()};
    prototype.receive({...packet,chargeHit:0});expect(game.combatFeedback.addShake).not.toHaveBeenCalled();
    prototype.receive({...packet,chargeHit:1});prototype.receive({...packet,chargeHit:1});
    expect(game.combatFeedback.addShake).toHaveBeenCalledTimes(1);
    expect(game.combatFeedback.addShake).toHaveBeenCalledWith(1000);
    prototype.receive({...packet,chargeHit:2});expect(game.combatFeedback.addShake).toHaveBeenCalledTimes(2);
});

test('counter label anchors to the struck mob with its own flight direction',()=>{
    const {prototype,packet,mob,game}=setup();
    prototype.receive({...packet,event:{id:2,kind:'attack',label:'Counter'}});
    expect(game.infoManager.addDamageInfo).toHaveBeenLastCalledWith('Counter!',mob.x,mob.y-15,'combo',mob.id,false,{motion:'counter'});
});


test('normal gameplay starts without trainer controls and keeps combat on across ambience updates',()=>{
    const {prototype,packet,game,mob}=setup();
    prototype.clear();prototype.toggle=null;prototype.reset=null;prototype.action=null;
    game.getEntityById=id=>id===100?mob:undefined;
    const socket={on:jest.fn(),off:jest.fn(),emit:jest.fn()};prototype.connect(socket);
    expect(socket.emit).toHaveBeenCalledWith('combat',{action:'ready',patterns:['lunge','slam']});
    prototype.receive({...packet,live:true,mob:null,combo:null,event:null,phase:'field',fieldAttacks:[]});
    prototype.configure({});expect(prototype.enabled).toBe(true);
    expect(prototype.owns(game.player)).toBe(false);
    prototype.reportPosition();expect(socket.emit).toHaveBeenLastCalledWith('combat',expect.objectContaining({action:'move'}));
});
test('another player charge is visible but cannot create a local automatic counter',()=>{
    const {prototype,packet,game,mob,player}=setup();
    game.getEntityById=id=>id===100?mob:undefined;prototype.autoTechniques=true;
    prototype.liveSocket={emit:jest.fn()};
    mob.cancelPath=jest.fn();
    prototype.receive({...packet,live:true,mob:null,combo:null,event:null,phase:'field',fieldAttacks:[{
        id:1,targetId:999,phase:'windup',until:Date.now()+1000,direction:{x:0,y:1},lane:[],mob:packet.mob}]});
    expect(prototype.owns(mob)).toBe(true);expect(prototype.owns(player)).toBe(false);
    expect(prototype.canTechnique()).toBe(false);expect(prototype.liveSocket.emit).not.toHaveBeenCalled();
});

test('live automatic counters preserve the normal target and attack loop',()=>{
    const {prototype,packet,game,mob,player}=setup();
    prototype.liveSocket={emit:jest.fn()};prototype.autoTechniques=true;
    game.getEntityById=id=>id===100?mob:undefined;player.target=mob;player.disengage.mockClear();
    prototype.receive({...packet,live:true,mob:null,combo:null,event:null,phase:'field',fieldAttacks:[],
        fieldCombo:{kind:'counter',until:Date.now()+1000,mob:packet.mob}});
    expect(prototype.liveSocket.emit).toHaveBeenCalledWith('combat',{action:'technique',mobId:100});
    expect(player.disengage).not.toHaveBeenCalled();expect(player.target).toBe(mob);
    expect(prototype.owns(player)).toBe(false);
});


test('Slam plants a held attack pose, plays impact once and restores animation timing on cleanup',()=>{
    const {prototype,packet,player,mob,game}=setup();
    player.id=1;game.getEntityById=id=>id===100?mob:undefined;mob.cancelPath=jest.fn();
    const animation={speed:[80,100,120],setSpeed:jest.fn()};mob.hit=jest.fn(()=>{mob.currentAnimation=animation;});
    const slam={id:5,pattern:'slam',phase:'windup',windup:1000,until:Date.now()+1000,direction:{x:0,y:1},lane:[],mob:packet.mob,targetId:1};
    const state={...packet,live:true,mob:null,phase:'field',event:null,combo:null,fieldAttacks:[slam]};
    prototype.receive(state);expect(animation.setSpeed).toHaveBeenCalledWith([1250,1250,1250]);
    expect(mob.hit).toHaveBeenCalledTimes(1);prototype.receive(state);expect(mob.hit).toHaveBeenCalledTimes(1);
    prototype.receive({...state,fieldAttacks:[{...slam,phase:'impact'}]});
    expect(animation.setSpeed).toHaveBeenLastCalledWith([80,100,120]);expect(mob.hit).toHaveBeenCalledTimes(2);
    prototype.clear();expect(mob.animationLock).toBe(false);
});
test('escaping Slam then returning in range uses the existing automatic counter without changing targets',()=>{
    const {prototype,packet,player,mob,game}=setup();
    game.getEntityById=id=>id===100?mob:undefined;prototype.autoTechniques=true;prototype.liveSocket={emit:jest.fn()};
    player.target={id:999};player.gridY=6;
    prototype.receive({...packet,live:true,mob:null,phase:'field',event:null,combo:null,fieldAttacks:[],
        fieldCombo:{kind:'counter',until:Date.now()+1250,mob:packet.mob}});
    expect(prototype.liveSocket.emit).not.toHaveBeenCalled();player.gridY=5;prototype.update();prototype.update();
    expect(prototype.liveSocket.emit.mock.calls).toEqual([['combat',{action:'technique',mobId:100}]]);
    expect(player.target.id).toBe(999);
});


test('local pattern control uses fixture API, stays compact and does not add trainer controls',async()=>{
    let Prototype;
    const select={style:{},options:[],setAttribute:jest.fn(),appendChild(o){this.options.push(o);},
        addEventListener(e,fn){this[e]=fn;},remove:jest.fn(),blur:jest.fn()};
    const document={createElement:tag=>tag==='select'?select:{style:{},setAttribute:jest.fn(),remove:jest.fn()}};
    const fetch=jest.fn(async()=>({ok:true,json:async()=>({mode:'slam'})}));
    vm.runInNewContext(fs.readFileSync(require.resolve('./combatprototype'),'utf8'),{define:f=>{Prototype=f();},document,fetch,Date});
    const parent={style:{},appendChild:jest.fn(),insertBefore:jest.fn(),querySelector:()=>null,querySelectorAll:()=>[]};
    const game={worldAmbience:{controls:parent},showNotification:jest.fn()};
    const prototype=new Prototype(game);prototype.state={live:true};
    prototype.configure({previewControls:true,previewSlam:true,previewAttackMode:'mixed'});
    expect(select.options.map(o=>o.value)).toEqual(['mixed','lunge','slam']);expect(select.value).toBe('mixed');
    expect(parent.style.flexWrap).toBe('nowrap');expect(prototype.toggle).toBeUndefined();
    select.value='slam';await select.change();
    expect(fetch).toHaveBeenCalledWith('/__combat_preview/patterns',expect.objectContaining({body:JSON.stringify({mode:'slam'})}));
    expect(select.disabled).toBe(false);expect(select.blur).toHaveBeenCalled();
    prototype.configure({previewControls:true,previewSlam:true,previewAttackMode:'slam'});
    expect(parent.insertBefore).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue({ok:false});select.value='lunge';await select.change();
    expect(select.value).toBe('slam');expect(game.showNotification).toHaveBeenCalled();
    prototype.configure({});expect(select.remove).toHaveBeenCalled();
});


test('local practice announces Slam escape and returning-counter cues without another HUD row',()=>{
    const {prototype,packet,game,mob,player}=setup();player.id=1;
    game.getEntityById=id=>id===100?mob:undefined;mob.cancelPath=jest.fn();prototype.patternStatus={textContent:''};
    const attack={id:5,pattern:'slam',phase:'windup',windup:1000,until:Date.now()+1000,direction:{x:0,y:1},lane:[],mob:packet.mob,targetId:1};
    const state={...packet,live:true,mob:null,phase:'field',event:null,combo:null,fieldAttacks:[attack]};
    prototype.receive(state);expect(prototype.patternStatus.textContent).toBe('Slam: back away');
    prototype.receive({...state,fieldAttacks:[],fieldCombo:{kind:'counter',until:Date.now()+1000,mob:packet.mob}});
    expect(prototype.patternStatus.textContent).toBe('Counter ready');prototype.clear();
    expect(prototype.patternStatus.textContent).toBe('');
});


test('a cancelled walk cannot leave the planted Slam sprite offset from its warned tile',()=>{
    const {prototype,packet,game,mob,player}=setup();player.id=1;mob.cancelPath=jest.fn();
    game.getEntityById=id=>id===100?mob:undefined;
    mob.x=80;mob.y=48; // Grid already points at 4,4, while the old tween is elsewhere.
    prototype.receive({...packet,live:true,mob:null,phase:'field',event:null,combo:null,fieldAttacks:[{
        id:8,pattern:'slam',phase:'windup',windup:1000,until:Date.now()+1000,direction:{x:0,y:1},lane:[{x:4,y:4}],mob:packet.mob,targetId:1}]});
    expect([mob.x,mob.y]).toEqual([64,64]);
    expect(prototype.fieldMotions.get(100).from).toBeNull();
});
