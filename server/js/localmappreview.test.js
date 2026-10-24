const fs = require('fs'), os = require('os'), path = require('path');
const {crop, readPreview, install} = require('./localmappreview');
let root;
function write(file, value) {const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value));}
function map() {return {width:20,height:20,tilesize:16,data:Array.from({length:400},(_,i)=>i+1)};}
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'map-preview-'));write('server/config.json',{maps:['one','oadungeon','missing']});write('client/maps/world_client_one.json',map());write('client/maps/world_client_oadungeon.json',map());});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('returns exactly 13×13 tiles with the requested tile at row 6, column 6, including layered tiles',()=>{
    const data=map();data.data[210]=[8,9];const tiles=crop(data,10,10);
    expect(tiles).toHaveLength(169);expect(tiles[84]).toEqual([8,9]);expect(tiles[0]).toBe(data.data[84]);expect(tiles[168]).toBe(data.data[336]);
});
test('pads edges instead of shifting the coordinate away from the center',()=>{
    const tiles=crop(map(),0,0);expect(tiles).toHaveLength(169);expect(tiles[84]).toBe(1);expect(tiles[83]).toBeNull();expect(tiles[71]).toBeNull();expect(tiles[168]).toBe(127);
    const outside=crop(map(),20,20);expect(outside[84]).toBeNull();expect(outside[0]).not.toBeNull();
});
test('reads built artwork metadata and uses the shared OA tilesheet',()=>{
    expect(readPreview(root,'oadungeon',10,10)).toMatchObject({mapId:'oadungeon',x:10,y:10,size:13,tileset:'/img/1/tilesheet_oa.png',tilesize:16});
});
test('cached map data refreshes after a rebuild without rewriting any source',()=>{
    const first=readPreview(root,'one',10,10), file=path.join(root,'client/maps/world_client_one.json');
    const changed=map();changed.data[210]=99;write('client/maps/world_client_one.json',changed);fs.utimesSync(file,new Date(),new Date(Date.now()+5000));
    const before=fs.readFileSync(file), next=readPreview(root,'one',10,10);
    expect(next.tiles[84]).toBe(99);expect(next.revision).not.toBe(first.revision);expect(fs.readFileSync(file)).toEqual(before);
});
test.each(['../one','one.json','unknown',null])('rejects unsafe or unconfigured map %j',id=>expect(()=>readPreview(root,id,1,1)).toThrow('configured'));
test.each([[NaN,1],[1.5,2],[1,Infinity],[1000001,0]])('rejects invalid coordinate pair %j',(x,y)=>expect(()=>readPreview(root,'one',x,y)).toThrow('whole tile'));
test('reports missing and invalid map exports and refuses symlinks',()=>{
    expect(()=>readPreview(root,'missing',1,1)).toThrow('Build missing');
    write('client/maps/world_client_one.json',{width:0,height:20,data:[]});expect(()=>readPreview(root,'one',1,1)).toThrow('invalid tile');
    const file=path.join(root,'client/maps/world_client_one.json');fs.unlinkSync(file);fs.symlinkSync(path.join(root,'server/config.json'),file);expect(()=>readPreview(root,'one',1,1)).toThrow('symbolic');
});
test('API rejects missing coordinates, blocks in-progress builds, and returns only the crop',()=>{
    let handler,body,status;const toolbox={root};install({get:(url,fn)=>{expect(url).toBe('/local/api/map-preview');handler=fn;}},toolbox);
    const res={json:value=>{body=value;return res;},status:value=>{status=value;return res;}};
    handler({query:{mapId:'one',x:'10',y:'10'}},res);expect(body.tiles).toHaveLength(169);expect(body).not.toHaveProperty('objects');
    handler({query:{mapId:'one',x:'',y:'10'}},res);expect(status).toBe(400);
    toolbox.job={status:'running'};handler({query:{mapId:'one',x:'10',y:'10'}},res);expect(status).toBe(409);
});
