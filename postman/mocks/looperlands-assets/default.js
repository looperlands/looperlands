// Synthetic records shaped from Asset::jsonSerialize and AssetFilter in looperlands-platform.
const http = require('http');
const rows = Array.from({length: 30}, (_, i) => ({id: '00000000-0000-4000-8000-' + String(i+1).padStart(12,'0'),
    nftId: '0x'+String(i+1).padStart(64,'0'), name: 'Test avatar '+(i+1), assetType: 'looper', collection: 'test-collection',
    token: {tokenId: String(i+1), tokenHash: 'test-token-'+(i+1)}, creator: {walletAddress: '0x'+'1'.repeat(40), ens: 'test.eth'},
    holders: [{wallet: {address: '0x'+'2'.repeat(40)}}], gameData: {privateFixture: true}}));
http.createServer(async (req,res) => {
    const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    if(req.headers['x-api-key']!=='fixture-key')return reply(401,{error:'unauthorized'});
    if(req.method==='POST'&&req.url==='/api/asset/search') {
        let body=req.body;
        if(body===undefined){let raw=''; for await(const part of req)raw+=part;try{body=JSON.parse(raw);}catch{return reply(400,{error:'invalid JSON'});}}
        if(typeof body==='string'){try{body=JSON.parse(body);}catch{return reply(400,{error:'invalid JSON'});}}
        if(!Number.isInteger(body.offset)||body.offset<0||!Number.isInteger(body.limit)||body.limit<1||body.limit>250)return reply(400,{error:'invalid filter'});
        if(body.keyword==='upstream_error')return reply(503,{error:'fixture failure'});
        const selected=rows.filter(row=>(!body.keyword||[row.name,row.collection,row.token.tokenHash].join(' ').toLowerCase().includes(body.keyword.toLowerCase()))&&(!body.assetType?.length||body.assetType.includes(row.assetType)));
        return reply(200,selected.slice(body.offset,body.offset+body.limit));
    }
    if(req.method==='GET'&&/^\/api\/asset\/(nft\/)?[^/]+$/.test(req.url)) {const id=decodeURIComponent(req.url.split('/').pop());const row=rows.find(row=>row.id===id||row.nftId===id);return reply(row?200:404,row||{error:'not found'});}
    reply(501,{error:'Endpoint not modeled by this contract fixture'});
}).listen(process.env.PORT||4901,'127.0.0.1');
