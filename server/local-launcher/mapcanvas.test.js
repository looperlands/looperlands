const fs=require('fs'),vm=require('vm');

async function setup(interaction) {
    let canvas;
    const ctx=new Proxy({drawImage:jest.fn()}, {get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
    function element(tag){const node={append(){},classList:{add(){}},isConnected:true,clientWidth:300,clientHeight:360,clientLeft:1,clientTop:1,style:{},focus(){},setPointerCapture(){},hasPointerCapture:()=>false,getBoundingClientRect:()=>({left:100,top:200}),getContext:()=>ctx};if(tag==='canvas')canvas=node;return node;}
    const window={MapLocation:{mark(){}}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./mapcanvas'),'utf8'),{
        window,document:{createElement:element},Image:class {constructor(){this.width=256;}set src(value){this.onload();}},
        ResizeObserver:class {constructor(callback){this.callback=callback;}observe(){this.callback();}disconnect(){}},
        fetch:async()=>({ok:true,json:async()=>({width:20,height:20,tilesize:16,tiles:[],collisions:[],tileset:'/tiles.png'})})
    });
    const picked=jest.fn(),controller=window.MapmakerCanvas.attach(element('div'),'one',{onPick:picked,interaction});
    await controller.ready;
    const event=(x=90,y=145)=>({button:0,pointerId:1,clientX:101+x,clientY:201+y,offsetX:x,offsetY:y,preventDefault(){}});
    return {canvas,picked,event,controller,ctx};
}

test('mobile backing dimensions and tile picking match the rendered canvas',async()=>{
    const {canvas,picked,event}=await setup();
    expect([canvas.width,canvas.height]).toEqual([300,360]);
    canvas.onpointerdown(event());canvas.onpointerup(event());
    expect(picked).toHaveBeenCalledWith({x:5,y:7});
});

test('editing and wheel zoom use the same normalized coordinate space',async()=>{
    const interaction={start:jest.fn(()=>true),end:jest.fn()}, {canvas,event}=await setup(interaction);
    canvas.onpointerdown(event());canvas.onpointerup(event());
    const before=interaction.start.mock.calls[0][0];
    expect(before.tile.x).toBeCloseTo(5.2);expect(before.tile.y).toBeCloseTo(7.2);
    canvas.onwheel({...event(),deltaY:-1});canvas.onpointerdown(event());canvas.onpointerup(event());
    const after=interaction.start.mock.calls[1][0];
    expect(after.tile.x).toBeCloseTo(before.tile.x);expect(after.tile.y).toBeCloseTo(before.tile.y);
});

test('panning uses normalized deltas and a drag cannot accidentally pick a tile',async()=>{
    const {canvas,picked,event}=await setup();
    canvas.onpointerdown(event());canvas.onpointermove(event(120,160));canvas.onpointerup(event(120,160));
    expect(picked).not.toHaveBeenCalled();
    canvas.onpointerdown(event());canvas.onpointerup(event());
    expect(picked).toHaveBeenCalledWith({x:2,y:6});
});

test('artwork overlays render every placement using Tiled IDs and original artwork clears them',async()=>{
    const {controller,ctx}=await setup();ctx.drawImage.mockClear();
    controller.set({tiles:[{x:3,y:4,id:1},{x:6,y:4,id:17},{x:100,y:100,id:2}]});
    expect(ctx.drawImage.mock.calls.map(call=>call.slice(1))).toEqual([
        [0,0,16,16,3,4,1,1],[0,16,16,16,6,4,1,1]
    ]);
    ctx.drawImage.mockClear();controller.set({tiles:[]});
    expect(ctx.drawImage).not.toHaveBeenCalled();
});
