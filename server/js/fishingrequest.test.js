global.Types={};const Types=require('../../shared/js/gametypes'),Lakes=require('./lakes'),{requestFish}=require('./fishingrequest');
const rod=Object.values(Types.Entities).find(kind=>typeof kind==='number'&&Types.isFishingRod(kind));
let player,world,session,params;
beforeEach(()=>{player={hasEnteredGame:true,hitPoints:10,isDead:false,x:4,y:3,weapon:rod,getNFTWeapon:()=>({getLevel:()=>10}),getNFTSpecialItemActiveTrait:()=>null,playerClassModifiers:{isModiferActive:()=>false}};world={id:'world_one',map:{width:20,height:20,getLakeName:(x,y)=>x===4&&y===4?'cobFarmLake':null},getPlayerById:()=>player,announceSpawnFloat:jest.fn()};session={mapId:'world_one',entityId:1};params={lakeName:'cobFarmLake',x:'4',y:'4'};});
const cast=(s=session,p=params)=>requestFish(s,{world_one:world},p,1000);
test('server accepts a nearby cast from a rod and records the exact saved table',()=>{expect(cast().body).toMatchObject({allowed:true,speed:expect.any(Number),fish:expect.any(String)});expect(player.pendingFish).toMatchObject({lakeName:'cobFarmLake',mapId:'world_one',expiresAt:61000});expect(Lakes.cobFarmLake.fish[player.pendingFish.name]).toBeDefined();expect(world.announceSpawnFloat).toHaveBeenCalledWith(player,4,4);});
test.each([
    ['dead',p=>p.isDead=true],['not entered',p=>p.hasEnteredGame=false],['sword',p=>p.weapon=Types.Entities.SWORD1],['diagonal',p=>p.x=3],['distant',p=>p.y=1],['standing on water',p=>p.y=4],['rod too low',p=>p.getNFTWeapon=()=>({getLevel:()=>0})]
])('rejects %s without starting a cast',(name,change)=>{change(player);expect(cast().body.allowed).toBe(false);expect(player.pendingFish).toBeUndefined();expect(world.announceSpawnFloat).not.toHaveBeenCalled();});
test.each([{x:'4.5'},{x:'99'},{lakeName:'cobFarmRiver'},{lakeName:'missing'},{y:'NaN'}])('rejects forged water %j',extra=>{expect(cast(session,{...params,...extra}).body.allowed).toBe(false);expect(player.pendingFish).toBeUndefined();});
test('expired sessions and departed players return an actionable rejection',()=>{expect(cast(null).status).toBe(404);world.getPlayerById=()=>null;expect(cast().body.allowed).toBe(false);});
