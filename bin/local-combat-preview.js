#!/usr/bin/env node
// Dedicated opt-in combat sandbox; every backend write uses the local fixture API.
process.env.COMBAT_PREVIEW = '1';
process.env.LOOPERLANDS_BIND_ADDRESS = '127.0.0.1';
process.env.NPC_PREVIEW_PORT = process.env.NPC_PREVIEW_PORT || '8021';
process.env.NPC_PREVIEW_FIXTURE_PORT = process.env.NPC_PREVIEW_FIXTURE_PORT || '3021';
process.env.NPC_PREVIEW_DATA_DIR = process.env.NPC_PREVIEW_DATA_DIR || require('path').join(require('os').tmpdir(), 'looperlands-combat-preview');
require('./local-npc-preview');
