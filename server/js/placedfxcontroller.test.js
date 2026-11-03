global.Types={};
const Controller=require('./placedfxcontroller');
const row={id:'fire',name:'Flames',effect:'fire/campfire',x:2,y:3,width:2,height:2,scale:.5,hazard:{warningMs:1000,activeMs:500,cooldownMs:2000,damage:10,tickMs:250,impactMs:0}};
let now,world,player,fx;
beforeEach(()=>{now=0;player={id:1,x:2,y:3,hasEnteredGame:true,hitPoints:100,isBot:()=>false,handleHurt:jest.fn()};world={id:'world_main',players:{1:player},map:{width:20,height:20,placedFx:[row]},pushToPlayer:jest.fn(),pushToAdjacentGroups:jest.fn()};fx=new Controller(world,()=>now);});
const tick=t=>{now=t;fx.tick();};
test('warning and cooldown are safe, active ticks damage once without catch-up bursts',()=>{
    tick(0);expect(world.pushToPlayer.mock.calls[0][1].serialize()[1]).toMatchObject({type:'map',epoch:0,rows:[row]});
    tick(999);expect(player.handleHurt).not.toHaveBeenCalled();tick(1000);tick(1100);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    tick(1250);tick(1499);expect(player.handleHurt).toHaveBeenCalledTimes(2);tick(1500);tick(6900);expect(player.handleHurt).toHaveBeenCalledTimes(2);
    tick(7300);expect(player.handleHurt).toHaveBeenCalledTimes(3);
});
test('new arrivals and revivals receive a full future warning cycle',()=>{tick(1200);expect(player.handleHurt).not.toHaveBeenCalled();tick(7000);expect(player.handleHurt).toHaveBeenCalledTimes(1);player.isDead=true;tick(7100);player.isDead=false;tick(7200);expect(player.handleHurt).toHaveBeenCalledTimes(1);expect(world.pushToPlayer).toHaveBeenCalledTimes(2);});
test('leaving the hit region avoids damage, decoration never damages, disconnected players are forgotten',()=>{fx.configure([{...row,hazard:null}]);tick(0);tick(1000);expect(player.handleHurt).not.toHaveBeenCalled();fx.configure([row]);tick(1000);player.x=4;tick(2000);expect(player.handleHurt).not.toHaveBeenCalled();world.players={};tick(2001);expect(fx.players.size).toBe(0);});
test('reloading identical map data preserves the cycle; edits send fresh configuration',()=>{tick(0);const epoch=fx.epoch;now=700;fx.configure([row]);expect(fx.epoch).toBe(epoch);fx.configure([{...row,x:4}]);tick(700);expect(world.pushToPlayer).toHaveBeenCalledTimes(2);expect(fx.epoch).toBe(700);});
test('confirmed hits broadcast selected cosmetics; crit wins, misses and unknown styles emit nothing',()=>{const target={group:'1-1',x:5,y:6};fx.hit(target,{type:'player',selectedHit:'hit:frost'},12,false);fx.hit(target,{type:'player',selectedHit:'hit:frost'},12,true);expect(world.pushToAdjacentGroups.mock.calls.map(c=>c[1].serialize()[1].effect)).toEqual(['ice/snowflake-burst','impacts/crit-hit']);fx.hit(target,{type:'player',selectedHit:'hit:frost'},0,true);fx.hit(target,{type:'mob'},10,true);fx.hit(target,{type:'player',selectedHit:'unowned'},10,false);expect(world.pushToAdjacentGroups).toHaveBeenCalledTimes(2);});


test('random hazard damage uses exactly the advertised seeded footprint, with no damage during its visual tail',()=>{
    const Config=require('../../shared/js/placedfxconfig');
    const r={...row,width:8,height:8,hazard:{...row.hazard,placement:'random',areaWidth:1,areaHeight:1}};
    fx.configure([r]);tick(0);const packet=world.pushToPlayer.mock.calls[0][1].serialize()[1];
    const footprint=Config.hitRegion(r,0,packet.seed);Object.assign(player,{x:footprint.x,y:footprint.y});
    tick(1000);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    player.x=footprint.x===r.x?r.x+1:r.x;tick(1250);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    Object.assign(player,{x:footprint.x,y:footprint.y});tick(1600);expect(player.handleHurt).toHaveBeenCalledTimes(1);
});

function bossHazard() {
    const boss={kind:13,hitPoints:100,isDead:false,target:null};
    world.mobs={boss};fx.configure([{...row,attackingMob:13}]);return boss;
}
const latest=()=>world.pushToPlayer.mock.calls.at(-1)[1].serialize()[1];

test('boss hazards wait for combat, start with a full warning and restart cleanly after disengaging',()=>{
    const boss=bossHazard();tick(0);tick(80000);
    expect(latest().activations).toEqual({fire:null});expect(player.handleHurt).not.toHaveBeenCalled();
    boss.target=1;tick(81000);expect(latest().activations).toEqual({fire:81000});
    tick(81999);expect(player.handleHurt).not.toHaveBeenCalled();tick(82000);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    boss.target=null;tick(82100);tick(82250);expect(player.handleHurt).toHaveBeenCalledTimes(1);expect(latest().activations.fire).toBeNull();
    boss.target=1;tick(83000);tick(83999);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    tick(84000);expect(player.handleHurt).toHaveBeenCalledTimes(2);expect(latest().activations.fire).toBe(83000);
});

test.each(['dead mob','zero hp mob','removed mob','dead target','zero hp target','departed target','bot target','not entered target','wrong mob type'])('%s disables boss damage immediately',reason=>{
    const boss=bossHazard();boss.target=1;tick(0);tick(1000);expect(player.handleHurt).toHaveBeenCalledTimes(1);
    if(reason==='dead mob')boss.isDead=true;
    if(reason==='zero hp mob')boss.hitPoints=0;
    if(reason==='removed mob')world.mobs={};
    if(reason==='dead target')player.isDead=true;
    if(reason==='zero hp target')player.hitPoints=0;
    if(reason==='departed target')delete world.players[1];
    if(reason==='bot target')player.isBot=()=>true;
    if(reason==='not entered target')player.hasEnteredGame=false;
    if(reason==='wrong mob type')boss.kind=2;
    tick(1250);expect(fx.activations.get('fire')).toBeNull();expect(player.handleHurt).toHaveBeenCalledTimes(1);
});

test('another attacking mob of the chosen type and target changes keep the same warning clock',()=>{
    const boss=bossHazard(),other={...player,id:2};world.players[2]=other;boss.target=1;tick(0);
    boss.target=2;tick(400);expect(fx.activations.get('fire')).toBe(0);
    world.mobs.second={...boss,target:1};boss.isDead=true;tick(500);expect(fx.activations.get('fire')).toBe(0);
    expect(world.pushToPlayer).toHaveBeenCalledTimes(2);
    world.mobs.second.target=null;tick(600);expect(fx.activations.get('fire')).toBeNull();
});

test('activation updates preserve other hazard clocks and late-arrival protection',()=>{
    const boss=bossHazard();fx.configure([{...row,id:'automatic'},{...row,attackingMob:13}]);tick(0);
    boss.target=1;tick(500);expect(fx.players.get(player).joined).toBe(0);expect(latest().epoch).toBe(0);
    tick(1000);expect(player.handleHurt.mock.calls.map(call=>call[0].id)).toEqual(['automatic']);
    const late={...player,id:2,handleHurt:jest.fn()};world.players[2]=late;tick(1100);
    const packet=latest();expect(packet.activations.fire).toBe(500);expect(packet.seed).toBe(fx.seed);
    tick(1500);expect(player.handleHurt.mock.calls.at(-1)[0].id).toBe('fire');expect(late.handleHurt).not.toHaveBeenCalled();
    tick(500+require('../../shared/js/placedfxconfig').cycleDuration(row)+1000);
    expect(late.handleHurt.mock.calls.some(call=>call[0].id==='fire')).toBe(true);
});

test('decorative attack conditions synchronize without causing damage and identical configuration preserves activation',()=>{
    const boss=bossHazard(),decoration={...row,attackingMob:13,hazard:null};fx.configure([decoration]);boss.target=1;tick(100);
    now=500;fx.configure([decoration]);expect(fx.activations.get('fire')).toBe(100);
    tick(5000);expect(player.handleHurt).not.toHaveBeenCalled();
    boss.isDead=true;tick(5001);expect(latest().activations.fire).toBeNull();
});
