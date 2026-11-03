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
