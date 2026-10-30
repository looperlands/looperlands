const fs=require('fs'),os=require('os'),path=require('path');
const Assets=require('./localparallaxassets'), E=require('../../client/js/sceneenvironment');
let root;
const source=fs.readFileSync(path.join(__dirname,'../../client/img/1/item-wood.png'));
const image='data:image/png;base64,'+source.toString('base64');
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'parallax-images-'));});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('custom PNGs are reusable across every layer plane and never replace existing artwork',()=>{
    expect(Assets.catalog(root)).toEqual([]);
    const saved=Assets.save(root,{name:'Custom oak.png',image}),again=Assets.save(root,{name:'Custom oak.png',image});
    expect(again).toEqual(saved);expect(Assets.catalog(root)).toHaveLength(1);
    expect(fs.readFileSync(path.join(root,'client'+saved.image))).toEqual(source);
    for(const plane of E.planes){
        const parallax={layers:[{image:saved.image,plane,width:128,height:128,placed:true,swayX:2,swayY:.5,swayPeriod:6,nightOpacity:.7,nightBrightness:.3}]};
        expect(()=>E.parallax(parallax)).not.toThrow();expect(()=>Assets.validateLayers(root,[{parallax}])).not.toThrow();
    }
});
test('missing, unsafe, corrupted and symlinked images are rejected',()=>{
    expect(()=>Assets.save(root,{name:'bad',image:'data:image/png;base64,AAAA'})).toThrow('not a PNG');
    expect(()=>Assets.validateLayers(root,[{parallax:{layers:[{image:'/img/parallax/missing.png'}]}}])).toThrow('Missing');
    for(const image of ['/img/parallax/../../secret.png','https://example.org/tree.png','/img/parallax/file.svg'])expect(()=>Assets.validateLayers(root,[{parallax:{layers:[{image}]}}])).toThrow('local');
    fs.mkdirSync(path.join(root,'client/img'),{recursive:true});fs.symlinkSync(os.tmpdir(),path.join(root,'client/img/parallax'));
    expect(()=>Assets.save(root,{name:'oak',image})).toThrow('symbolic');
});
test('uploads respect build locks and return the shared catalog through the local API',async()=>{
    const express=require('express'),app=express(),toolbox={root,job:{status:'running'}};app.use(express.json({limit:'6mb'}));Assets.install(app,toolbox);
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    try{
        const url='http://127.0.0.1:'+server.address().port+'/local/api/parallax-images';
        const send=()=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'oak',image})});
        expect((await send()).status).toBe(409);toolbox.job=null;
        const saved=await(await send()).json();expect((await(await fetch(url)).json()).images[0].image).toBe(saved.image);
        expect(Buffer.from(await(await fetch('http://127.0.0.1:'+server.address().port+saved.image)).arrayBuffer())).toEqual(source);
        toolbox.closed=true;expect((await send()).status).toBe(503);
    }finally{await new Promise(r=>server.close(r));}
});
