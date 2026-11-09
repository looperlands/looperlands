const fs=require('fs'),vm=require('vm'),Config=require('../../shared/js/placedfxconfig');
let PixelFx,localNow=1000;
beforeEach(()=>{localNow=1000;});
vm.runInNewContext(fs.readFileSync(require.resolve('./pixelfx'),'utf8'),{define:(_deps,factory)=>{PixelFx=factory(Config);},performance:{now:()=>localNow},Set,console});
const row={id:'camp',name:'Camp',effect:'fire/campfire',x:2,y:3,width:2,height:2,scale:.5,hazard:{warningMs:1500,activeMs:500,cooldownMs:2500,damage:10,tickMs:500,impactMs:0}};
const setup=reduced=>{const renderer={registerExtension:jest.fn(),setExtensionData:jest.fn()},game={mapId:'main',started:true,renderer,app:{settings:{getReducedMotion:()=>reduced}}};return{fx:new PixelFx(game),game,renderer};};
test('late packets from other maps are discarded, authoritative hit events deduplicate',()=>{const{fx}=setup(false);fx.receive({type:'hit',mapId:'world_oa',id:1,effect:'impacts/crit-hit'});expect(fx.hits).toHaveLength(0);for(let i=0;i<2;i++)fx.receive({type:'hit',mapId:'world_main',id:1,effect:'impacts/crit-hit',x:2,y:3});expect(fx.hits).toHaveLength(1);});
test('reduced motion keeps warnings and countdowns while suppressing cosmetic hit bursts',()=>{const{fx,renderer}=setup(true);fx.receive({type:'map',mapId:'world_main',rows:[row],epoch:0,now:500});fx.receive({type:'hit',mapId:'world_main',id:1,effect:'impacts/crit-hit',x:2,y:3});fx.render(renderer);expect(renderer.setExtensionData).toHaveBeenCalledWith('pixel-fx',[]);expect(renderer.setExtensionData.mock.calls.findLast(c=>c[0]==='pixel-fx-tiles')[1][0].phase).toMatchObject({kind:'warning',remaining:1000});});
test('map transitions clear placements, pause retains the synchronized cycle',()=>{const{fx,game,renderer}=setup(false);fx.receive({type:'map',mapId:'world_main',rows:[{...row,hazard:null}],epoch:0,now:500});fx.pause();fx.render(renderer);expect(fx.rows).toHaveLength(1);game.mapId='oa';fx.render(renderer);expect(fx.rows).toHaveLength(0);});
test('disabling combat effects suppresses cosmetic hits while preserving map warnings',()=>{const{fx,game,renderer}=setup(false);game.app.settings.getCombatEffectsEnabled=()=>false;fx.receive({type:'map',mapId:'world_main',rows:[row],epoch:0,now:500});fx.receive({type:'hit',mapId:'world_main',id:1,effect:'impacts/crit-hit',x:2,y:3});fx.render(renderer);expect(renderer.setExtensionData).toHaveBeenCalledWith('pixel-fx',[]);expect(renderer.setExtensionData.mock.calls.findLast(c=>c[0]==='pixel-fx-tiles')[1]).toHaveLength(1);});
test('saved palettes reach the game worker without changing hazard geometry or timing',()=>{const{fx,renderer}=setup(false);fx.receive({type:'map',mapId:'world_main',rows:[{...row,palette:'leaf'}],epoch:0,now:1600});fx.render(renderer);expect(renderer.setExtensionData.mock.calls.findLast(c=>c[0]==='pixel-fx')[1][0]).toMatchObject({palette:'leaf',time:100,x:48,y:64});expect(renderer.setExtensionData.mock.calls.findLast(c=>c[0]==='pixel-fx-tiles')[1][0]).toMatchObject({x:2,y:3,width:2,height:2,phase:{kind:'active'}});});

const rendered=(observer,key)=>observer.renderer.setExtensionData.mock.calls.findLast(call=>call[0]===key)[1];
test.each([false,true])('inactive boss effects hide artwork and warnings with reduced motion %s',reduced=>{
    const observer=setup(reduced),packet={type:'map',mapId:'world_main',rows:[{...row,attackingMob:13}],epoch:0,now:5000};
    for(const activations of [undefined,{camp:null}]){observer.fx.receive({...packet,activations});observer.fx.render(observer.renderer);expect(rendered(observer,'pixel-fx')).toEqual([]);expect(rendered(observer,'pixel-fx-tiles')).toEqual([]);}
    observer.fx.receive({...packet,activations:{camp:4500}});observer.fx.render(observer.renderer);
    expect(rendered(observer,'pixel-fx-tiles')[0].phase).toMatchObject({kind:'warning',remaining:1000});
    observer.fx.receive({...packet,now:7000,activations:{camp:null}});observer.fx.render(observer.renderer);
    expect(rendered(observer,'pixel-fx')).toEqual([]);expect(rendered(observer,'pixel-fx-tiles')).toEqual([]);
});
test('late observers share the active boss timeline and random footprint without restarting automatic effects',()=>{
    const first=setup(false),late=setup(false),boss={...row,id:'boss',attackingMob:13,width:8,height:8,hazard:{...row.hazard,placement:'random',areaWidth:2,areaHeight:1}};
    const packet={type:'map',mapId:'world_main',rows:[row,boss],epoch:0,seed:123,now:9000,activations:{boss:9000}};
    first.fx.receive(packet);localNow=2500;late.fx.receive({...packet,now:10500});
    first.fx.render(first.renderer);late.fx.render(late.renderer);
    expect(rendered(first,'pixel-fx')).toEqual(rendered(late,'pixel-fx'));
    expect(rendered(first,'pixel-fx-tiles')).toEqual(rendered(late,'pixel-fx-tiles'));
    expect(rendered(first,'pixel-fx-tiles').find(r=>r.id==='boss').phase).toMatchObject({kind:'active',effectMs:0});
    const automatic=rendered(first,'pixel-fx')[0];first.fx.receive({...packet,now:10500,activations:{boss:null}});first.fx.render(first.renderer);
    expect(rendered(first,'pixel-fx')[0]).toEqual(automatic);
    expect(rendered(first,'pixel-fx-tiles').some(r=>r.id==='boss')).toBe(false);
});

test('options and changing seeds reach the worker, remain stable within playback, and agree for late joins',()=>{
    const first=setup(false),late=setup(false),placed={...row,hazard:null,options:{height:30}},packet={type:'map',mapId:'world_main',rows:[placed,{...placed,id:'other'}],epoch:100,seed:374,now:200};
    first.fx.receive(packet);first.fx.render(first.renderer);
    const initial=rendered(first,'pixel-fx');expect(initial[0].options).toEqual({height:30});expect(initial[0].seed).not.toBe(initial[1].seed);
    localNow+=100;first.fx.render(first.renderer);expect(rendered(first,'pixel-fx')[0].seed).toBe(initial[0].seed);
    localNow+=Config.catalog[row.effect].duration;first.fx.render(first.renderer);
    const next=rendered(first,'pixel-fx');expect(next[0].seed).not.toBe(initial[0].seed);
    late.fx.receive({...packet,now:packet.now+localNow-1000});late.fx.render(late.renderer);expect(rendered(late,'pixel-fx')).toEqual(next);
    first.fx.receive({type:'hit',mapId:'world_main',id:1,effect:'impacts/crit-hit',seed:198,x:2,y:3});first.fx.render(first.renderer);
    expect(rendered(first,'pixel-fx').at(-1).seed).toBe(198);
});

test('late clients retain custom sheet frames, warning timing and random footprints across cycles',()=>{
    const first=setup(false),late=setup(false),sprite={image:'/img/map-fx/custom-'+ 'a'.repeat(32)+'.png',frameWidth:32,frameHeight:32,columns:4,frames:8,fps:8};
    const custom={...row,effect:undefined,sprite,width:8,height:8,hazard:{...row.hazard,placement:'random',areaWidth:2,areaHeight:1}};
    first.fx.receive({type:'map',mapId:'world_main',rows:[custom],epoch:100,seed:123,now:1600});
    for(const elapsed of [0,300,5000,10000]) {
        localNow=1000+elapsed;late.fx.receive({type:'map',mapId:'world_main',rows:[custom],epoch:100,seed:123,now:1600+elapsed});
        first.fx.render(first.renderer);late.fx.render(late.renderer);expect(rendered(first,'pixel-fx')).toEqual(rendered(late,'pixel-fx'));expect(rendered(first,'pixel-fx-tiles')).toEqual(rendered(late,'pixel-fx-tiles'));
    }
});

test.each([false,true])('invincibility follows active players and freezes with reduced motion %s',reduced=>{
    const observer=setup(reduced),player={x:32,y:48,invincible:true};
    observer.game.player=player;observer.game.entities={self:player,dead:{...player,isDead:true}};
    observer.fx.render(observer.renderer);
    expect(rendered(observer,'invincibility-aura')).toEqual([{x:40,y:64,time:reduced?600:1000}]);
    player.invincible=false;observer.fx.render(observer.renderer);
    expect(rendered(observer,'invincibility-aura')).toEqual([]);
    observer.fx.pause();
    expect(rendered(observer,'invincibility-aura')).toBeNull();
});
