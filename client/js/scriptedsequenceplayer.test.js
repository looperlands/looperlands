const fs=require('fs'),vm=require('vm');
function setup(){
    function node(){return {style:{},children:[],classList:{add(){},remove(){}},append(...children){this.children.push(...children);},setAttribute(){},replaceChildren(){this.children=[];},remove(){this.removed=true;}};}
    const document={createElement:node,body:node(),addEventListener:jest.fn(),removeEventListener:jest.fn()},handlers=new Map(),socket={on:(type,fn)=>handlers.set(type,fn),off:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);},emit:jest.fn()};
    const game={player:{stop:jest.fn(),disengage:jest.fn()},getEntityById:jest.fn(),makeCharacterGoTo:jest.fn(),client:{receiveSequenceActor:jest.fn(),releaseSequenceActors:jest.fn()},renderer:{tilesize:16,camera:{x:0,y:0,gridW:30,gridH:14,setPosition:jest.fn(),lookAt:jest.fn()}},map:{width:100,height:100},audioManager:{playSound:jest.fn(),playMusicByName:jest.fn(),updateMusic:jest.fn()}};
    let Player;vm.runInNewContext(fs.readFileSync(require.resolve('./scriptedsequenceplayer'),'utf8'),{document,window:{matchMedia:()=>({matches:false})},Date,define:(deps,factory)=>{Player=factory(class{cancel(){}},{append:(element,text)=>{element.textContent=text;}});}});
    const player=new Player(game);game.scriptedSequence=player;player.connect(socket);return {player,game,socket,handlers,document};
}
test('start and end acquire controls and restore camera, audio, overlay and key listener',()=>{
    const h=setup();h.player.packet({type:'start',runId:'one',name:'Arrival',cinematic:true,skippable:true});expect(h.player.locked).toBe(true);expect(h.game.player.stop).toHaveBeenCalled();
    h.player.packet({type:'step',runId:'one',step:{type:'music',value:'forest'}});expect(h.game.audioManager.playMusicByName).toHaveBeenCalledWith('forest');
    const panel=h.player.panel;h.player.packet({type:'end',runId:'one'});expect(h.player.locked).toBe(false);expect(h.player.cameraActive).toBe(false);expect(panel.removed).toBe(true);expect(h.game.audioManager.updateMusic).toHaveBeenCalled();
});
test('camera pans interpolate and stale packets cannot control a later sequence',()=>{
    const h=setup();h.player.packet({type:'start',runId:'one',name:'Arrival',cinematic:true,skippable:true});h.player.packet({type:'step',runId:'one',step:{type:'camera',x:40,y:30,seconds:2}});const start=h.player.pan.start;h.player.tick(start+1000);expect(h.game.renderer.camera.setPosition).toHaveBeenCalledWith(350,322);
    h.player.packet({type:'end',runId:'old'});expect(h.player.locked).toBe(true);h.player.skip();expect(h.socket.emit).toHaveBeenCalledWith('sequence-skip',{runId:'one'});
});
test('lost heartbeat and disconnect recover controls, with listeners removed on map disposal',()=>{
    const h=setup();h.player.packet({type:'start',runId:'one',name:'Arrival',cinematic:true,skippable:true});h.player.tick(Date.now()+16000);expect(h.player.locked).toBe(false);
    h.player.packet({type:'start',runId:'two',name:'Arrival',cinematic:true,skippable:false});h.handlers.get('disconnect')();expect(h.player.locked).toBe(false);h.player.destroy();expect(h.handlers.size).toBe(0);
});
test('a remote actor is spawned, follows authoritative movement and remains pinned until playback ends',()=>{
    const h=setup(),actor=[9,40,80,70,false,{key:'host',orientation:2,moveSpeed:400}];
    h.player.packet({type:'start',runId:'one',name:'Arrival',cinematic:true,skippable:true,actors:[actor]});
    expect(h.game.client.receiveSequenceActor).toHaveBeenCalledWith(actor);expect(h.player.actorIds()).toEqual([9]);
    const entity={applyBehaviorState:jest.fn()};h.game.getEntityById.mockReturnValue(entity);
    const moved=[9,40,81,70,false,actor[5]];
    h.player.packet({type:'actor_move',runId:'one',actorId:9,x:81,y:70,durationMs:400,actor:moved});
    expect(h.game.makeCharacterGoTo).toHaveBeenCalledWith(entity,81,70);
    expect(entity.applyBehaviorState).toHaveBeenCalledWith(actor[5]);
    h.player.packet({type:'heartbeat',runId:'one',actors:[moved]});
    expect(h.game.makeCharacterGoTo).toHaveBeenCalledTimes(1);
    h.player.packet({type:'end',runId:'one'});
    expect(h.player.ownsActor(9)).toBe(false);expect(h.game.client.releaseSequenceActors).toHaveBeenCalledWith([9]);
});
test('disconnect and heartbeat loss both release cutscene actor subscriptions',()=>{
    for(const reason of ['disconnect','timeout']){
        const h=setup();h.player.packet({type:'start',runId:'one',name:'Arrival',actors:[[9,40,80,70,false,{key:'host'}]]});
        if(reason==='disconnect')h.handlers.get('disconnect')();else h.player.tick(Date.now()+16000);
        expect(h.player.actorIds()).toEqual([]);expect(h.game.client.releaseSequenceActors).toHaveBeenCalledWith([9]);
    }
});
test('an actor going through a door refreshes its position without pathfinding through unrelated scenes',()=>{
    const h=setup(),state=[9,40,80,70,false,{key:'host'}];
    h.player.packet({type:'start',runId:'one',name:'Arrival',actors:[state]});
    h.game.client.receiveSequenceActor.mockClear();h.game.getEntityById.mockReturnValue({applyBehaviorState:jest.fn()});
    const moved=[9,40,37,200,false,state[5]];
    h.player.packet({type:'actor_move',runId:'one',actorId:9,x:37,y:200,actor:moved,teleport:true,durationMs:0});
    expect(h.game.client.receiveSequenceActor).toHaveBeenCalledWith(moved);
    expect(h.game.makeCharacterGoTo).not.toHaveBeenCalled();
});
