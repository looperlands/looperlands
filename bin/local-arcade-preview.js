#!/usr/bin/env node
// Static, loopback-only preview. No LL session, wallet or inventory backend.
const express = require('express');
const path = require('path');
const app = express();
const port = Number(process.env.ARCADE_PREVIEW_PORT || 8026);
app.get('/', (req, res) => res.redirect('/arcade-preview/'));
app.use('/arcade-preview', express.static(path.join(__dirname, 'arcade-preview')));
app.use(express.static(path.join(__dirname, '../client')));
app.listen(port, '127.0.0.1', () => console.log(`Arcade preview: http://127.0.0.1:${port}/arcade-preview/`));
