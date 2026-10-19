#!/usr/bin/env node
// Isolated, read-only asset server. No sessions, backend, or game state writes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.HIT_FEEL_PREVIEW_PORT || 8051);
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.woff':'font/woff', '.mp3':'audio/mpeg'};
const allowed = /^(bin\/hit-feel-preview\/|client\/(img\/1\/|sprites\/|audio\/sounds\/)|opendesign\/design-systems\/looperlands\/(fonts\/|tokens\/)|opendesign\/mockups\/social-chat\/assets\/town\.json$)/;
http.createServer((req, res) => {
    let route;
    try { route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1); }
    catch { res.writeHead(400).end(); return; }
    if (!route) { res.writeHead(302, {Location:'/bin/hit-feel-preview/'}).end(); return; }
    if (route.endsWith('/')) route += 'index.html';
    const file = path.resolve(root, route);
    if (!file.startsWith(root + path.sep) || route.includes('..') || !allowed.test(route)) { res.writeHead(404).end(); return; }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404).end(); return; }
        res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(data);
    });
}).listen(port, '127.0.0.1', () => console.log('Hit feel preview: http://127.0.0.1:' + port));
