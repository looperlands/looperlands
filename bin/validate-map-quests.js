#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const {validateConfig}=require('../server/js/questboard/config');
const {occurrences}=require('../server/js/questboard/schedule');
const {runtimeCatalog}=require('../server/js/questboard/catalog');
const args=process.argv.slice(2),filename=args.find(a=>!a.startsWith('--'));
if(!filename){console.error('Usage: node bin/validate-map-quests.js <map.json> [--resolved] [--now=2026-10-11T00:00:00Z]');process.exitCode=1;}
else try {
    const raw=JSON.parse(fs.readFileSync(filename,'utf8'));
    const definitions={};
    for(const file of fs.readdirSync(path.resolve(__dirname,'../client/tileActions')))if(file.endsWith('.json')) definitions[file.slice(0,-5)]=require(path.resolve(__dirname,'../client/tileActions',file));
    const {definitions:registry}=require('../server/js/worlddefinitions');require('../server/world-definitions').register();
    const config=validateConfig(raw,path.basename(filename,'.json'),runtimeCatalog(definitions,registry.quests.map(q=>q.id)));
    const nowArg=args.find(a=>a.startsWith('--now=')),now=nowArg?Date.parse(nowArg.slice(6)):Date.now();
    if(!Number.isFinite(now))throw new Error('Invalid --now timestamp');
    console.log(JSON.stringify({valid:true,mapId:config.mapId,version:config.version,...(args.includes('--resolved')?{config}:{}),
        preview:occurrences(config,now).slice(0,100).map(o=>({id:o.id,questId:o.questId,opensAt:new Date(o.opensAt).toISOString(),acceptUntil:new Date(o.acceptUntil).toISOString(),endsAt:new Date(o.endsAt).toISOString(),rewards:o.snapshot.rewards}))},null,2));
    for(const q of config.quests)if(q.estimatedMinutes)console.error('Playtest effort estimate for '+q.id+': '+q.estimatedMinutes+' minutes; source availability and contention need live validation.');
} catch(error){console.error(error.message);process.exitCode=1;}
