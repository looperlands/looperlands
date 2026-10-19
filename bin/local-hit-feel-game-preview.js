#!/usr/bin/env node
// Actual game/client and local authoritative combat, backed by isolated fixture data.
process.env.HIT_FEEL_PREVIEW='1';
process.env.COMBAT_LIVE_PREVIEW='1';
process.env.NPC_PREVIEW_PORT=process.env.NPC_PREVIEW_PORT||'8052';
process.env.NPC_PREVIEW_FIXTURE_PORT=process.env.NPC_PREVIEW_FIXTURE_PORT||'3052';
process.env.NPC_PREVIEW_DATA_DIR=process.env.NPC_PREVIEW_DATA_DIR||require('path').join(require('os').tmpdir(),'looperlands-hit-feel-game-preview');
require('./local-combat-preview');
