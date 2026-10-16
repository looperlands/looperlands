#!/usr/bin/env node
// Local-only all-mob Slam playtest using isolated, loopback fixture storage.
process.env.COMBAT_SLAM_PREVIEW = '1';
process.env.COMBAT_LIVE_PREVIEW = '1';
process.env.NPC_PREVIEW_PORT = process.env.NPC_PREVIEW_PORT || '8043';
process.env.NPC_PREVIEW_FIXTURE_PORT = process.env.NPC_PREVIEW_FIXTURE_PORT || '3043';
process.env.NPC_PREVIEW_DATA_DIR = process.env.NPC_PREVIEW_DATA_DIR || require('path').join(require('os').tmpdir(), 'looperlands-slam-preview');
require('./local-combat-preview');
