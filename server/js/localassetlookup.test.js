const http = require('http');
const {configuration,metadata,searchAssets,validate}=require('./localassetlookup');
let server,env,requests,response;
const row=(i=1)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),nftId:'0x'+String(i).padStart(64,'0'),name:'Test avatar '+i,assetType:'looper',collection:'Exact Collection',holders:[{wallet:'private'}],gameData:{private:true}});
beforeEach(async()=>{requests=[];response={status:200,body:[row()]};server=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;requests.push({method:req.method,url:req.url,key:req.headers['x-api-key'],body:raw?JSON.parse(raw):null});if(response.hang)return;res.writeHead(response.status,{'Content-Type':'application/json'});res.end(typeof response.body==='string'?response.body:JSON.stringify(response.body));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));env={LOOPERLANDS_ASSET_API_BASE_URL:'http://127.0.0.1:'+server.address().port,LOOPERLANDS_ASSET_API_KEY:'fixture-key'};});
afterEach(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test('accepts API or origin URLs, rejects insecure remote credentials, and never mixes configuration pairs',()=>{
    expect(configuration({...env,LOOPERLANDS_ASSET_API_BASE_URL:'https://api.looperlands.io/api/'}).base).toBe('https://api.looperlands.io/api');
    expect(configuration({...env,LOOPERLANDS_ASSET_API_BASE_URL:'http://other.example'})).toBeNull();
    expect(configuration({LOOPERLANDS_ASSET_API_BASE_URL:'https://api.looperlands.io',LOOPERLANDS_OWNERSHIP_API_KEY:'other-service'}).key).toBeNull();
    expect(metadata(env)).not.toHaveProperty('key');expect(metadata({}).configured).toBe(false);
});
test('real HTTP search uses the Platform filter, strips sensitive fields and paginates without a total count',async()=>{
    response.body=Array.from({length:26},(_,i)=>row(i+1));const found=await searchAssets({keyword:'Test',assetType:'looper',offset:25,ignored:'not forwarded'},{env});
    expect(requests).toEqual([{method:'POST',url:'/api/asset/search',key:'fixture-key',body:{keyword:'Test',assetType:['looper'],offset:25,limit:26}}]);
    expect(found).toMatchObject({offset:25,hasMore:true});expect(found.assets).toHaveLength(25);expect(found.assets[0]).toEqual({id:row().id,nftId:row().nftId,name:'Test avatar 1',assetType:'looper',collection:'Exact Collection'});
});
test.each([['00000000-0000-4000-8000-000000000001','/api/asset/'],['0x'+'1'.repeat(64),'/api/asset/nft/']])('exact ID uses the supported GET route: %s',async(keyword,prefix)=>{response.body=row();await searchAssets({keyword},{env});expect(requests[0]).toMatchObject({method:'GET',url:prefix+keyword,body:null});});
test('empty search browses all types; unknown direct NFT returns an empty result',async()=>{await searchAssets({}, {env});expect(requests[0].body).toEqual({offset:0,limit:26});response.status=404;expect((await searchAssets({keyword:row().nftId},{env})).assets).toEqual([]);});
test.each([[401,'denied'],[403,'denied'],[429,'rate limiting'],[503,'could not complete']])('safe upstream error at %s',async(status,message)=>{response={status,body:{error:'secret internal trace'}};await expect(searchAssets({}, {env})).rejects.toThrow(message);});
test('rejects malformed replies and returns a bounded timeout instead of a hanging request',async()=>{response.body='<html>proxy failure</html>';await expect(searchAssets({}, {env})).rejects.toThrow('unavailable');response.body={assets:[]};await expect(searchAssets({}, {env})).rejects.toThrow('unexpected');response.hang=true;await expect(searchAssets({}, {env,timeout:30})).rejects.toThrow('timed out');});
test('missing keys and invalid filters never contact the Platform',async()=>{await expect(searchAssets({}, {env:{}})).rejects.toThrow('Configure');for(const input of [{offset:-1},{offset:1},{assetType:'npc'},{keyword:'a'.repeat(256)}])expect(()=>validate(input)).toThrow();expect(requests).toEqual([]);});
