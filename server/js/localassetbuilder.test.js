global.Types = {};
const fs=require('fs'),os=require('os'),path=require('path'),zlib=require('zlib'),vm=require('vm');
const {catalog,readAsset,saveAsset,validatePng,baseTypes}=require('./localassetbuilder');
let root;
const source=path.resolve(__dirname,'../..');
function write(relative,data){const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
function crc(buffer){let value=0xffffffff;for(const byte of buffer){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^(0xedb88320&-(value&1));}return(value^0xffffffff)>>>0;}
function png(width,height){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const chunk=(type,data)=>{const body=Buffer.concat([Buffer.from(type),data]),result=Buffer.alloc(body.length+8);result.writeUInt32BE(data.length);body.copy(result,4);result.writeUInt32BE(crc(body),result.length-4);return result;};return'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]).toString('base64');}
function fixture(type='item',id='moon_shard'){
    const names=type==='item'?['idle']:type==='npc'?['idle_down']:['idle_down','idle_up','idle_right','walk_down','walk_up','walk_right','atk_down','atk_up','atk_right','death'];
    return {id,type,name:'Moon shard',revision:catalog(root).revision,sprite:{width:16,height:16,offset_x:0,offset_y:0,animations:Object.fromEntries(names.map(name=>[name,{row:0,length:1}]))},gameplay:{collectAmount:2,inventoryDescription:'A shard.',transferable:false,level:3,hpMod:1,armorMod:1,weaponMod:1,respawnDelay:10000,drops:{wood:20}},client:{moveSpeed:350,idleSpeed:700,atkSpeed:100,aggroRange:2,isAggressive:true},dialogue:['Hello there.'],images:{1:png(16,16),2:png(32,32),3:png(48,48)}};
}
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'looperlands-assets-'));for(const file of ['shared/js/gametypes.js','shared/js/mapmakerentities.json','client/sprites/rat.json','client/sprites/guard.json','client/sprites/item-wood.json'])write(file,fs.readFileSync(path.join(source,file)));write('shared/js/mapmakerentities.json','[]');for(const scale of [1,2,3])for(const id of ['rat','guard','item-wood'])write('client/img/'+scale+'/'+id+'.png',fs.readFileSync(path.join(source,'client/img/'+scale+'/'+id+'.png')));});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('new items receive stable unique kinds, sprite files and matching prepared scales',()=>{
    const first=saveAsset(root,fixture());expect(first).toMatchObject({id:'moon_shard',kind:1800000000,type:'item',builtin:false,requiresBuild:true,sprite:{id:'item-moon_shard'},gameplay:{collectable:true,collectAmount:2,transferable:false}});
    const next=saveAsset(root,fixture('mob','beetle'));expect(next.kind).not.toBe(first.kind);expect(next.gameplay.drops).toEqual({wood:20});
    for(const scale of [1,2,3])expect(fs.readFileSync(path.join(root,'client/img/'+scale+'/item-moon_shard.png')).readUInt32BE(16)).toBe(16*scale);
    expect(JSON.parse(fs.readFileSync(path.join(root,'client/sprites/item-moon_shard.json'))).animations.idle).toEqual({row:0,length:1});
    expect(()=>saveAsset(root,{...fixture(),revision:catalog(root).revision})).toThrow('already exists');
});
test('metadata edits preserve all existing images, sparse gameplay and extra sprite metadata',()=>{
    const original=readAsset(root,'rat'),sprite={...original.sprite,bubbleOffsetX:3};const images=[1,2,3].map(scale=>fs.readFileSync(path.join(root,'client/img/'+scale+'/rat.png')));
    const saved=saveAsset(root,{...fixture('mob','rat'),originalId:'rat',revision:original.revision,sprite,images:undefined});expect(saved).toMatchObject({kind:2,builtin:true,sprite:{bubbleOffsetX:3}});
    for(const [i,image]of images.entries())expect(fs.readFileSync(path.join(root,'client/img/'+(i+1)+'/rat.png'))).toEqual(image);
    expect(()=>saveAsset(root,{...fixture('mob','rat'),originalId:'rat',revision:original.revision,sprite,images:undefined})).toThrow('another tab');
});
test('saving a different asset preserves a creation draft and assigns a unique kind',()=>{const old=fixture('npc','traveler');const item=saveAsset(root,fixture());const npc=saveAsset(root,old);expect(npc.kind).not.toBe(item.kind);expect(readAsset(root,item.id).kind).toBe(item.kind);});
test.each(['../outside','constructor','prototype','getType','wood','NFT_bad'])('unsafe and colliding new IDs are rejected: %s',id=>{expect(()=>saveAsset(root,fixture('item',id))).toThrow();});
test('rejects animation overflow, scale mismatch, missing animations, malformed PNGs and excessive drop chances',()=>{
    const input=fixture();input.sprite.animations.idle.length=2;expect(()=>saveAsset(root,input)).toThrow('outside');
    const mismatch=fixture();mismatch.images[2]=png(64,32);expect(()=>saveAsset(root,mismatch)).toThrow('matching dimensions');
    const missing=fixture('mob','beetle');delete missing.sprite.animations.atk_up;expect(()=>saveAsset(root,missing)).toThrow('Required animations');
    expect(()=>validatePng('data:image/png;base64,AA==',input.sprite,1)).toThrow('not a PNG');
    const corrupt=Buffer.from(png(16,16).slice(22),'base64');corrupt[corrupt.length-1]^=1;expect(()=>validatePng('data:image/png;base64,'+corrupt.toString('base64'),input.sprite,1)).toThrow('checksum');
    const drops=fixture('mob','beetle');drops.gameplay.drops={wood:90,ore:20};expect(()=>saveAsset(root,drops)).toThrow('100%');
});
test('rejects symlink outputs before changing the manifest or another file',()=>{const before=fs.readFileSync(path.join(root,'shared/js/mapmakerentities.json'));fs.symlinkSync(os.tmpdir(),path.join(root,'client/img/1/item-moon_shard.png'));expect(()=>saveAsset(root,fixture())).toThrow('symbolic');expect(fs.readFileSync(path.join(root,'shared/js/mapmakerentities.json'))).toEqual(before);});
test('new types and dialogue register in both CommonJS and AMD runtimes with the same IDs',()=>{
    const saved=saveAsset(root,fixture('npc','traveler')),entries=JSON.parse(fs.readFileSync(path.join(root,'shared/js/mapmakerentities.json')));
    for(const amd of [false,true]){
        let Types;const context={console};if(amd)context.define=(deps,factory)=>{Types=factory(entries);};else Object.assign(context,{module:{exports:{}},exports:{},require:()=>entries});vm.runInNewContext(fs.readFileSync(path.join(source,'shared/js/gametypes.js'),'utf8'),context);Types=amd?Types:context.module.exports;
        expect(Types.getKindFromString('traveler')).toBe(saved.kind);expect(Types.isNpc(saved.kind)).toBe(true);expect(Types.Entities.TRAVELER).toBe(saved.kind);
        let talk;const dialogueContext=amd?{define:(deps,factory)=>{talk=factory(entries);}}:{module:{exports:{}},require:()=>entries};vm.runInNewContext(fs.readFileSync(path.join(source,'shared/js/npctalk.js'),'utf8'),dialogueContext);expect((amd?talk:dialogueContext.module.exports).traveler).toEqual(['Hello there.']);
    }
    expect(baseTypes(root).getKindFromString('traveler')).toBeUndefined();
});
test('the client factory builds all three new gameplay types and keeps built-in behavior',()=>{
    const types=['mob','npc','item'],entries=types.map((type,i)=>({id:'custom_'+type,kind:1800000000+i,type,name:'Custom '+type,sprite:{animations:{death:{row:0,length:1}}},client:{moveSpeed:300}}));
    const Base=class {constructor(id,kind,type){Object.assign(this,{id,kind,type});}},noop=new Proxy({}, {get:()=>Base});let factory;
    const Types={Entities:{},mapmakerEntities:entries};vm.runInNewContext(fs.readFileSync(path.join(source,'client/js/entityfactory.js'),'utf8'),{Types,console,_:{isFunction:value=>typeof value==='function'},define:(deps,callback)=>{factory=callback(noop,noop,noop,Base,Base,noop,Base,Base,Base);}});
    for(const entry of entries)expect(factory.createEntity(entry.kind,'entity')).toMatchObject({id:'entity',kind:entry.kind,name:entry.name});
});
test('reading built-in mob settings preserves the actual rat aggression and attack timing',()=>{expect(readAsset(source,'rat').client).toMatchObject({isAggressive:false,atkSpeed:50,moveSpeed:350,idleSpeed:700});});
test('a later write failure restores images and leaves the registration untouched',()=>{
    const before=fs.readFileSync(path.join(root,'shared/js/mapmakerentities.json')),rename=fs.renameSync;let writes=0;
    const mock=jest.spyOn(fs,'renameSync').mockImplementation((...args)=>{if(++writes===2)throw new Error('Disk full');return rename(...args);});
    try{expect(()=>saveAsset(root,fixture())).toThrow('Disk full');}finally{mock.mockRestore();}
    expect(fs.readFileSync(path.join(root,'shared/js/mapmakerentities.json'))).toEqual(before);expect(fs.existsSync(path.join(root,'client/img/1/item-moon_shard.png'))).toBe(false);
});
test('HTTP asset saves share the local origin guard and build lock',async()=>{
    const {createToolboxApp}=require('../../bin/local-mapmaker'),toolbox={root,closed:false,job:null};
    const server=createToolboxApp(toolbox).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Origin:base};
    try{
        const body=JSON.stringify(fixture());expect((await fetch(base+'/local/api/assets',{method:'POST',headers:{...headers,Origin:'https://other.example'},body})).status).toBe(403);
        toolbox.job={status:'running'};expect((await fetch(base+'/local/api/assets',{method:'POST',headers,body})).status).toBe(409);toolbox.job=null;
        const saved=await fetch(base+'/local/api/assets',{method:'POST',headers,body});expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({id:'moon_shard',requiresBuild:true});
        expect((await fetch(base+'/local/api/git')).status).toBe(404);
    }finally{await new Promise(resolve=>server.close(resolve));}
});
