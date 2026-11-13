#!/usr/bin/env node
// Replays the production catch component without awarding inventory or XP.
const express = require('express');
const path = require('path');
const app = express();
const root = path.resolve(__dirname, '..');
const port = Number(process.env.FISHING_REVEAL_PREVIEW_PORT || 8061);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'fishing-reveal-preview/index.html')));
app.use('/preview', express.static(path.join(__dirname, 'fishing-reveal-preview')));
app.use('/shared', express.static(path.join(root, 'shared')));
app.use(express.static(path.join(root, 'client')));
app.listen(port, '127.0.0.1', () => console.log('Fishing reveal preview: http://127.0.0.1:' + port));
