const fs=require('fs'),vm=require('vm');
let HitFeel;
vm.runInNewContext(fs.readFileSync(require.resolve('./hitfeel'),'utf8'),{define:factory=>{HitFeel=factory();}});
function setup(){
    const options={flash:true,squash:true,slash:true,recoil:true,freeze:true,particles:true,shake:true,audio:true,shatter:true,intense:false};
    const settings={getCombatEffectsEnabled:()=>true,getReducedMotion:()=>false,getCameraShakeEnabled:()=>true,getHitFeelOptions:()=>options};
    const animation={name:'atk_right',currentFrame:{x:32,y:0,index:1}};
    const player={id:1,x:16,y:32,currentAnimation:animation};
    const mob={id:2,x:32,y:32,hitPoints:20,maxHitPoints:100,sprite:{name:'ogre',width:48,height:48,offsetX:-16,offsetY:-24},currentAnimation:animation};
    const game={started:true,mapId:'main',sessionId:'local',app:{settings},player,entities:{1:player,2:mob},audioManager:{playConfirmedImpact:jest.fn()}};
    const feedback=new HitFeel(game);feedback.enabled=true;return{feedback,game,mob,player,settings,animation};
}
test('balanced feedback defaults on without preview configuration and ignores invalid or stopped hits',()=>{
    const {feedback,game,mob}=setup();
    expect(new HitFeel(game).enabled).toBe(true);
    expect(feedback.preset).toBe('balanced');expect(feedback.options.intense).toBe(false);
    for(const value of [NaN,Infinity,-Infinity])feedback.addImpact(mob,value,1000,false);
    feedback.addImpact(mob,0,1000,false);feedback.addImpact(mob,-1,1000,false);
    delete game.entities[2];feedback.addImpact(mob,20,1000,false);
    game.entities[2]=mob;game.isStopped=true;feedback.addImpact(mob,20,1000,false);
    expect(feedback.impacts).toHaveLength(0);expect(game.audioManager.playConfirmedImpact).not.toHaveBeenCalled();
});
test('saved settings control each effect and Arcade intensity independently at runtime',()=>{
    const {feedback,mob,settings}=setup();feedback.addImpact(mob,10,1000,false);
    expect(feedback.getOffset(mob,1000)).toEqual({x:5,y:0});
    settings.getHitFeelOptions().intense=true;
    expect(feedback.preset).toBe('arcade');expect(feedback.getOffset(mob,1000)).toEqual({x:8,y:0});
    settings.getHitFeelOptions().recoil=false;expect(feedback.getOffset(mob,1000)).toEqual({x:0,y:0});
    settings.getHitFeelOptions().particles=false;settings.getHitFeelOptions().slash=false;
    expect(feedback.frame(1000).hitFeel[0]).toMatchObject({sparks:0,slash:false});
    settings.getHitFeelOptions().flash=false;settings.getHitFeelOptions().squash=false;
    const data={drawData:[]};feedback.decorate(mob,data,2,1010);
    expect(data.hitFeel).toMatchObject({flash:false,squashX:1,squashY:1});
});
test('render-only contact pose holds body/equipment without stopping the animation or moving entities',()=>{
    const {feedback,mob,player,animation}=setup();
    feedback.addImpact(mob,10,1000,true);
    animation.currentFrame={x:64,y:0,index:2};
    expect(feedback.pose(player,animation,1040)).toEqual({x:32,y:0,index:1});
    expect(feedback.pose(player,animation,1060)).toBeNull();
    expect(animation.currentFrame.index).toBe(2);expect(mob.x).toBe(32);expect(player.x).toBe(16);
    expect(feedback.getOffset(mob,1000)).toEqual({x:7,y:0});
    expect(feedback.pose(player,{...animation},1010)).toBeNull();
});
test('effects and reduced-motion settings take effect during a hit; audio has its own switch',()=>{
    const {feedback,mob,settings,game,animation,player}=setup();feedback.addImpact(mob,10,1000,true);
    settings.getReducedMotion=()=>true;
    expect(feedback.getOffset(mob,1010)).toEqual({x:0,y:0});expect(feedback.pose(player,animation,1010)).toBeNull();
    const data={drawData:[]};feedback.decorate(mob,data,2,1010);expect(data.hitFeel).toMatchObject({flash:true,squashX:1,squashY:1,shatter:null});
    expect(feedback.frame(1010)).toMatchObject({shake:{x:0,y:0},hitFeel:[]});
    settings.getCombatEffectsEnabled=()=>false;const disabled={drawData:[]};feedback.decorate(mob,disabled,2,1010);expect(disabled.hitFeel).toBeUndefined();
    feedback.options.audio=false;feedback.addImpact(mob,10,1200,true);expect(game.audioManager.playConfirmedImpact).toHaveBeenCalledTimes(1);
});
test('finisher requires lethal confirmed HP and uses the saved mob frame after death replaces its sprite',()=>{
    const {feedback,mob}=setup();feedback.addImpact(mob,10,1000,true);feedback.finish(mob,1010);
    expect(feedback.impacts[0].finishedAt).toBeUndefined();
    mob.hitPoints=0;feedback.addImpact(mob,20,1200,true);mob.isDead=true;mob.sprite={name:'death'};feedback.finish(mob,1210);
    const data={drawData:[{spriteName:'shadow16'},{spriteName:'death'}]};feedback.decorate(mob,data,2,1300);
    expect(data.hitFeel.shatter).toBeCloseTo(.18);expect(data.drawData.map(d=>d.spriteName)).toEqual(['shadow16','ogre']);
    expect(data.drawData[1]).toMatchObject({sx:32,sW:48,dx:-32,dW:96});
});
test('AoE sound and particles are bounded, expire, and clear across map/session transitions',()=>{
    const {feedback,mob,game}=setup();for(let i=0;i<100;i++)feedback.addImpact(mob,1,1000+i,false);
    expect(feedback.impacts).toHaveLength(24);expect(game.audioManager.playConfirmedImpact).toHaveBeenCalledTimes(2);
    expect(feedback.frame(1700).hitFeel).toEqual([]);expect(feedback.impacts).toHaveLength(0);
    feedback.addImpact(mob,1,2000,false);game.mapId='other';expect(feedback.frame(2010).hitFeel).toEqual([]);
    feedback.addImpact(mob,1,2100,false);game.sessionId='new';expect(feedback.frame(2110).hitFeel).toEqual([]);
});
test('camera shake setting is independent, while reset/death removes old frames',()=>{
    const {feedback,mob,game,settings}=setup();feedback.addImpact(mob,10,1000,true);
    settings.getCameraShakeEnabled=()=>false;expect(feedback.frame(1010).shake).toEqual({x:0,y:0});
    game.player.isDead=true;expect(feedback.frame(1010).hitFeel).toEqual([]);expect(feedback.impacts).toHaveLength(0);
});
test('camera shake remains independent of impact effects and reduced motion always wins',()=>{
    const {feedback,mob,settings}=setup();settings.getCombatEffectsEnabled=()=>false;
    feedback.addImpact(mob,10,1000,true);
    expect(feedback.frame(1000)).toMatchObject({hitFeel:[],shake:{x:1,y:0}});
    settings.getReducedMotion=()=>true;expect(feedback.frame(1010).shake).toEqual({x:0,y:0});
});
test('audio gesture listeners are registered once and released on disposal',()=>{
    const listeners=new Map();let Feedback;
    const document={addEventListener:jest.fn((type,listener)=>listeners.set(type,listener)),removeEventListener:jest.fn()};
    vm.runInNewContext(fs.readFileSync(require.resolve('./hitfeel'),'utf8'),{document,define:factory=>{Feedback=factory();}});
    const {game}=setup();game.audioManager.prepareImpactAudio=jest.fn();
    const feedback=new Feedback(game);feedback.bindAudioGestures();expect(document.addEventListener).toHaveBeenCalledTimes(2);
    listeners.get('pointerdown')();expect(game.audioManager.prepareImpactAudio).toHaveBeenCalledTimes(1);
    feedback.dispose();expect(document.removeEventListener).toHaveBeenCalledTimes(2);
    feedback.bindAudioGestures();expect(document.addEventListener).toHaveBeenCalledTimes(4);
});
test('normal hits keep the camera steady; critical hits and confirmed kills shake',()=>{
    const {feedback,mob,game}=setup();
    feedback.addImpact(mob,10,1000,false);expect(feedback.frame(1000).shake).toEqual({x:0,y:0});
    feedback.addImpact(mob,10,1200,true);expect(feedback.frame(1200).shake.x).toBeGreaterThan(0);
    expect(feedback.frame(1350).shake).toEqual({x:0,y:0});
    mob.hitPoints=0;feedback.options.shatter=false;feedback.addImpact(mob,10,1400,false);
    delete game.entities[mob.id];expect(feedback.frame(1400).shake.x).toBeGreaterThan(0);
    expect(feedback.frame(1550).shake).toEqual({x:0,y:0});
});
test('counter pulses remain bounded across AoE and normal hits cannot restart or extend shake',()=>{
    const {feedback,mob}=setup();
    feedback.addShake(1000,true);
    for(let time=1010;time<1150;time+=10){feedback.addImpact(mob,10,time,true);feedback.addShake(time,true);}
    feedback.addImpact(mob,10,1140,false);expect(feedback.frame(1150).shake).toEqual({x:0,y:0});
    feedback.addImpact(mob,10,1200,false);expect(feedback.frame(1200).shake).toEqual({x:0,y:0});
    feedback.addShake(1250,true);expect(feedback.frame(1250).shake.x).toBeGreaterThan(0);
});
