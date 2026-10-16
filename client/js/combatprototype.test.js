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
    const mob={id:100,gridX:4,gridY:4,x:64,y:64,hasMoved:jest.fn(),idle:jest.fn(),walk:jest.fn(),setOrientation(o){this.orientation=o;},getOrientationTo:()=>4,hit:jest.fn()};
    const renderer={registerExtension:jest.fn(),setExtensionData:jest.fn()};
    const game={player,renderer,getEntityById:()=>mob,unregisterEntityPosition:jest.fn(),registerEntityPosition:jest.fn(),
        audioManager:{playSound:jest.fn()},infoManager:{addDamageInfo:jest.fn()},showNotification:jest.fn()};
    const prototype=new Prototype(game);
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

test('technique input needs an adjacent, stationary player; an active finisher blocks movement',()=>{
    const {prototype,player,packet}=setup();prototype.socket.emit.mockClear();
    prototype.technique();expect(prototype.socket.emit).toHaveBeenCalledWith('combat-preview',{action:'technique'});
    prototype.socket.emit.mockClear();player.isMoving=()=>true;prototype.technique();
    expect(prototype.socket.emit).not.toHaveBeenCalled();
    player.isMoving=()=>false;prototype.receive({...packet,phase:'finisher',combo:null,lockUntil:Date.now()+380});
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


test('streak and combo XP use existing combat info once per reward, not every state packet',()=>{
    const {prototype,packet,game}=setup();game.infoManager.addDamageInfo.mockClear();
    const earned={...packet,streak:2,streakUntil:Date.now()+2500,streakBonusPercent:25,reward:{id:1,xp:25}};
    prototype.receive(earned);prototype.receive(earned);prototype.update();
    expect(game.infoManager.addDamageInfo.mock.calls.map(call=>call[0])).toEqual(['Combo! +25 XP','2X']);
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
