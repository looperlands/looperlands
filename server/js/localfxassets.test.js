const fs=require('fs'),os=require('os'),path=require('path');
const Assets=require('./localfxassets');
let root;
const source=fs.readFileSync(path.join(__dirname,'../../client/img/1/item-wood.png')),image='data:image/png;base64,'+source.toString('base64');
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'fx-sheets-'));});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('uploaded sheets survive readback without replacing other artwork, and validate the full frame grid',()=>{
    const saved=Assets.save(root,{image});expect(Assets.save(root,{image})).toEqual(saved);expect(fs.readFileSync(path.join(root,'client'+saved.image))).toEqual(source);
    const sprite={image:saved.image,frameWidth:saved.width/2,frameHeight:saved.height,columns:2,frames:2,fps:12};
    expect(()=>Assets.validateSprites(root,[{sprite}])).not.toThrow();
    expect(()=>Assets.validateSprites(root,[{sprite:{...sprite,frames:3}}])).toThrow('grid');
    fs.unlinkSync(path.join(root,'client'+saved.image));expect(()=>Assets.validateSprites(root,[{sprite}])).toThrow('Missing');
});
test('invalid PNGs, external paths and symlink destinations are rejected',()=>{
    expect(()=>Assets.save(root,{image:'data:image/png;base64,AAAA'})).toThrow('not a PNG');
    expect(()=>Assets.save(root,{image,path:'secret'})).toThrow('Upload');
    fs.mkdirSync(path.join(root,'client/img'),{recursive:true});fs.symlinkSync(os.tmpdir(),path.join(root,'client/img/map-fx'));
    expect(()=>Assets.save(root,{image})).toThrow('symbolic');
});
test('upload API respects shutdown and build locks and serves the saved image',async()=>{
    const express=require('express'),app=express(),toolbox={root,job:{status:'running'}};app.use(express.json({limit:'6mb'}));Assets.install(app,toolbox);
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    try {
        const origin='http://127.0.0.1:'+server.address().port;
        const send=()=>fetch(origin+'/local/api/fx-sheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});
        expect((await send()).status).toBe(409);toolbox.job=null;
        const saved=await(await send()).json();expect(Buffer.from(await(await fetch(origin+saved.image)).arrayBuffer())).toEqual(source);
        toolbox.closed=true;expect((await send()).status).toBe(503);
    }finally{await new Promise(r=>server.close(r));}
});
