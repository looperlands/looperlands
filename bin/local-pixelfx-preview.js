#!/usr/bin/env node
// Visual/game-feel prototype only. Loopback, no sessions or platform writes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PIXELFX_PREVIEW_PORT || 8059);
const allowed = /^(bin\/pixelfx-preview\/|client\/(img\/1\/|sprites\/)|opendesign\/design-systems\/looperlands\/(fonts\/|tokens\/)|opendesign\/mockups\/social-chat\/assets\/town\.json$)/;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff':'font/woff'};
http.createServer((req,res) => {
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
    let route;
    try {route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);}
    catch {res.writeHead(400).end();return;}
    if (!route) {res.writeHead(302,{Location:'/bin/pixelfx-preview/'}).end();return;}
    if (route.endsWith('/')) route+='index.html';
    const file=path.resolve(root,route);
    if (!file.startsWith(root+path.sep)||route.includes('..')||!allowed.test(route)) {res.writeHead(404).end();return;}
    fs.readFile(file,(error,data) => {
        if(error){res.writeHead(404).end();return;}
        res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        res.end(req.method==='HEAD'?undefined:data);
    });
}).listen(port,'127.0.0.1',()=>console.log('PixelFX playground: http://127.0.0.1:'+port));
