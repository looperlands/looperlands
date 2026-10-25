const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Contract = require('../../shared/js/mapmakerauthoring');
const {validateDialogue} = require('./localquestdialogue');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const tools = {events: 'rules', dialogues: 'dialogues', atmosphere: 'atmosphere'};
const empty = () => ({version: 1, rules: [], dialogues: [], atmosphere: []});
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fields(value, allowed, label) {if (!object(value) || Object.keys(value).some(k => !allowed.includes(k))) fail(label + ' contains unsupported fields.');}
function list(value, max, label) {if (!Array.isArray(value) || value.length > max) fail(label + ' must contain at most ' + max + ' entries.');}
function text(value, label, max = 120) {if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\u0000-\u001f]/.test(value)) fail(label + ' must contain 1–' + max + ' plain-text characters.');}
function id(value, label) {if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value) || ['constructor','prototype','__proto__'].includes(value)) fail(label + ' must start with a letter and contain up to 64 letters, numbers, underscores or hyphens.');}
function number(value, min, max, label, integer = false) {if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(label + ' must be ' + (integer ? 'a whole number ' : '') + 'between ' + min + ' and ' + max + '.');}
function maps(root) {return JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;}
function safe(root, relative) {
    root = path.resolve(root); const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) fail('Invalid authoring source path.');
    for (let p = file; p !== root; p = path.dirname(p)) if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('Authoring sources must not contain symbolic links.');
    return file;
}
function source(root, mapId) {
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps(root).includes(mapId)) fail('Choose a configured map.');
    return safe(root, 'tools/worlds/' + mapId + '.json');
}
function readDocument(root, mapId) {
    const file = source(root, mapId);
    if (!fs.existsSync(file)) return empty();
    const raw = fs.readFileSync(file, 'utf8');if (Buffer.byteLength(raw) > 262144) fail('World authoring source exceeds 256 KB.');
    let value;try {value = JSON.parse(raw);} catch (_) {fail('Repair tools/worlds/' + mapId + '.json: invalid JSON.', 422);}
    fields(value, ['version','rules','dialogues','atmosphere'], 'World authoring source');
    if (value.version !== 1) fail('World authoring source requires version: 1.');
    for (const key of Object.values(tools)) list(value[key] === undefined ? [] : value[key], 100, key);
    return {...empty(), ...value};
}
function reference(value, spec, catalog) {
    if(spec.optional&&(value===undefined||value===''))return;
    if (spec.number) return number(value, spec.min, spec.max, spec.label, true);
    if (spec.multiline) {validateDialogue(value, spec.label);if (/\{\{|\}\}/.test(value)) fail('This dialogue has no quest-progress counters. Use plain text or styles.');return;}
    if (spec.source && !spec.free) {
        if (!['string','number'].includes(typeof value) || String(value).length > 100) fail('Choose ' + spec.label + '.');
        if (catalog && !(catalog[spec.source] || []).some(row => String(row.id) === String(value))) fail('Unknown ' + spec.label + ': ' + value);
        return;
    }
    text(value, spec.label);
}
function block(value, vocabulary, catalog, condition = false) {
    fields(value, condition ? ['type','options','not'] : ['type','options'], 'Rule block');
    const spec = Object.hasOwn(vocabulary,value.type) && vocabulary[value.type];if (!spec) fail('Choose a supported rule block.');
    fields(value.options, spec.fields.map(f => f.key), spec.label);
    if (value.not !== undefined && typeof value.not !== 'boolean') fail('Condition inversion must be true or false.');
    for (const field of spec.fields) reference(value.options[field.key], field, catalog);
}
function validateRules(rules, catalog) {
    list(rules, 100, 'Rules');const ids = new Set(), graph = new Map();
    for (const rule of rules) {
        fields(rule, ['id','name','enabled','when','conditions','actions'], 'Rule');id(rule.id, 'Rule ID');text(rule.name, 'Rule name');
        if (ids.has(rule.id)) fail('Rule IDs must be unique.');ids.add(rule.id);
        if (typeof rule.enabled !== 'boolean') fail('Rule enabled must be true or false.');
        block(rule.when, Contract.events, catalog);list(rule.conditions, 12, 'Rule conditions');list(rule.actions, 20, 'Rule actions');if (!rule.actions.length) fail('Each rule needs at least one action.');
        rule.conditions.forEach(c => block(c, Contract.conditions, catalog, true));rule.actions.forEach(a => block(a, Contract.actions, catalog));
        if (rule.enabled && rule.when.type.startsWith('trigger.')) {
            const from = rule.when.options.trigger;
            const next = graph.get(from) || new Set();for (const a of rule.actions) if (a.type.startsWith('trigger.')) next.add(a.options.trigger);graph.set(from, next);
        }
    }
    const visiting = new Set(), done = new Set();
    function visit(key) {if (visiting.has(key)) fail('Trigger rules contain a cycle at ' + key + '. Remove the feedback loop.');if (done.has(key)) return;visiting.add(key);for (const next of graph.get(key) || []) visit(next);visiting.delete(key);done.add(key);}
    for (const key of graph.keys()) visit(key);
    return rules;
}
function validateDialogues(trees, catalog) {
    list(trees, 100, 'Conversations');const ids = new Set(), scopes = new Set();
    for (const tree of trees) {
        fields(tree, ['id','name','npc','key','start','nodes'], 'Conversation');id(tree.id, 'Conversation ID');text(tree.name, 'Conversation name');
        if (ids.has(tree.id)) fail('Conversation IDs must be unique.');ids.add(tree.id);
        number(Number(tree.npc),1,Number.MAX_SAFE_INTEGER,'NPC kind',true);reference(tree.npc, {source:'npcs',label:'NPC'}, catalog);
        if (tree.key !== undefined && tree.key !== '') {
            text(tree.key, 'NPC routine key', 100);
            if (catalog && !catalog.routines.some(r => r.id === tree.key && Number(r.npc) === Number(tree.npc))) fail('The selected routine must belong to this NPC type.');
        }
        const scope = tree.npc + ':' + (tree.key || '');if (scopes.has(scope)) fail('Only one conversation may target the same NPC type and routine.');scopes.add(scope);
        if (!object(tree.nodes) || !Object.keys(tree.nodes).length || Object.keys(tree.nodes).length > 100) fail('Each conversation needs 1–100 nodes.');
        const keys = Object.keys(tree.nodes), target = key => {if (!keys.includes(key)) fail('Conversation ' + tree.id + ' links to missing node: ' + key);};target(tree.start);
        for (const [key, node] of Object.entries(tree.nodes)) {
            id(key, 'Node ID');fields(node, ['text','goto','options','actions'], 'Conversation node ' + key);validateDialogue(node.text, 'Node ' + key + ' dialogue');
            if (/\{\{|\}\}/.test(node.text)) fail('Conversation nodes have no quest-progress counters.');
            if (node.goto && node.options?.length) fail('Node ' + key + ' must use either Continue or choices.');
            if (node.goto) target(node.goto);list(node.options || [], 12, 'Node choices');list(node.actions || [], 12, 'Node actions');
            for (const option of node.options || []) {
                fields(option, ['text','goto','conditions'], 'Choice');text(option.text, 'Choice label', 240);target(option.goto);list(option.conditions || [], 12, 'Choice conditions');
                for (const c of option.conditions || []) {
                    const kind=c.if_not||c.if;const spec = Object.hasOwn(Contract.dialogueConditions,kind)&&Contract.dialogueConditions[kind];if (!spec || (!!c.if === !!c.if_not)) fail('Choose a supported dialogue condition.');
                    fields(c, ['if','if_not',spec.field,...(spec.amount ? ['amount'] : [])], 'Choice condition');
                    reference(c[spec.field], {...spec,label:spec.label,min:1,max:1000}, catalog);if (spec.amount) number(c.amount, 1, 100000, 'Condition amount', true);
                }
            }
            for (const a of node.actions || []) {const spec = Object.hasOwn(Contract.dialogueActions,a.type)&&Contract.dialogueActions[a.type];if (!spec) fail('Choose a supported dialogue action.');fields(a, ['type',spec.field], 'Dialogue action');reference(a[spec.field], {...spec,label:spec.label}, catalog);}
        }
        const reachable = new Set();function walk(key) {if (reachable.has(key)) return;reachable.add(key);const node=tree.nodes[key];if (node.goto) walk(node.goto);for(const o of node.options||[])walk(o.goto);}walk(tree.start);
        if (reachable.size !== keys.length) fail('Conversation contains unreachable nodes: ' + keys.filter(k => !reachable.has(k)).join(', '));
    }
    return trees;
}
function validateAtmosphere(entries, catalog) {
    list(entries, 100, 'Atmosphere overrides');const ids = new Set();
    for (const row of entries) {
        fields(row, ['sceneId','cycle','dayDarkness','nightDarkness','color','music','particles'], 'Atmosphere override');
        if (typeof row.sceneId !== 'string' || !/^(?:\*|[A-Za-z0-9_-]{1,100})$/.test(row.sceneId) || ids.has(row.sceneId)) fail('Choose a unique scene for each atmosphere override.');ids.add(row.sceneId);
        if (catalog && row.sceneId !== '*' && !catalog.scenes.some(s => String(s.id) === row.sceneId)) fail('This scene no longer exists. Reload or remove its override.');
        if (typeof row.cycle !== 'boolean') fail('Day/night cycle must be enabled or disabled.');
        number(row.dayDarkness, 0, 1, 'Day darkness');number(row.nightDarkness, 0, 1, 'Night darkness');
        if (!/^#[0-9a-f]{6}$/i.test(row.color)) fail('Lighting color must be a six-digit hex color.');
        if (row.music !== null && row.music !== '') reference(row.music, {source:'music',label:'Music'}, catalog);
        require('../../client/js/worldfxconfig').ambient(row.particles);
    }
    return entries;
}
const validate = {events:validateRules,dialogues:validateDialogues,atmosphere:validateAtmosphere};
let baseline;
function bundled() {return baseline ||= require('../world-definitions').register(new (require('./worlddefinitions').WorldDefinitions)(), {local:false});}
async function catalog(root, mapId) {
    source(root, mapId);const assets = require('./localquestbuilder').buildCatalog(root, mapId);
    const server = JSON.parse(fs.readFileSync(safe(root, 'server/maps/world_server_' + mapId + '.json'), 'utf8'));
    const client = JSON.parse(fs.readFileSync(safe(root, 'client/maps/world_client_' + mapId + '.json'), 'utf8'));
    const doors = await require('./localdoorbuilder').readDoors(root, mapId);
    const routines = require('./localnpcbuilder').readBehavior(root, mapId).config.npcs;
    const Types = require('../../shared/js/gametypes');
    const quests = bundled().quests.map(q => ({id:q.id,name:q.name||q.id}));
    for (const map of maps(root)) {const file=safe(root,'tools/quests/'+map+'.json');if(fs.existsSync(file)){try{for(const q of JSON.parse(fs.readFileSync(file,'utf8')).quests||[])quests.push({id:q.id,name:q.name||q.id});}catch(_){/* The Quest builder reports malformed quest sources. */}}}
    function audio(folder) {
        const files=fs.readdirSync(safe(root,'client/audio/'+folder));const groups=new Map();
        for(const file of files){if(!/\.(mp3|ogg)$/.test(file))continue;const id=file.replace(/\.(mp3|ogg)$/,'');if(!groups.has(id)||file.endsWith('.mp3'))groups.set(id,{id,name:id,url:'/audio/'+folder+'/'+encodeURIComponent(file)});}
        const sourceText=fs.readFileSync(safe(root,'client/js/audio.js'),'utf8'),match=sourceText.match(new RegExp('this\\.'+(folder==='music'?'musicNames':'soundNames')+' = \\[([\\s\\S]*?)\\];'));
        const names=new Set((match?.[1].replace(/\/\/[^\n]*/g,'').match(/["'][^"']+["']/g)||[]).map(s=>s.slice(1,-1)));
        return [...groups.values()].filter(row=>names.has(row.id)).sort((a,b)=>a.name.localeCompare(b.name));
    }
    return {...assets,quests:[...new Map(quests.map(q=>[q.id,q])).values()],routines:routines.map(r=>({id:r.key,name:r.label,npc:Types.getKindFromString(r.kind),x:r.origin.x,y:r.origin.y})),
        triggers:[...new Set([...(server.triggers||[]).map(t=>String(t.trigger)),...doors.doors.map(d=>String(d.properties.tid||'').replace(/^!/,''))].filter(Boolean))].map(id=>({id,name:id})),
        doors:doors.doors.map(d=>({id:d.id,name:(d.type==='portal'?'Portal #':'Door #')+d.id,trigger:String(d.properties.tid||'').replace(/^!/,''),inverted:String(d.properties.tid||'').startsWith('!'),x:d.tileX,y:d.tileY})),
        scenes:client.scenes||[],width:client.width,height:client.height,music:audio('music'),sounds:audio('sounds'),bundledDialogues:bundled().dialogues(mapId).map(d=>({npc:d.npc,name:d.name||String(d.npc),start:d.start,nodeCount:Object.keys(d.nodes).length}))};
}
async function readTool(root, mapId, tool) {
    if (!Object.hasOwn(tools,tool)) fail('Choose a world authoring tool.');const doc=readDocument(root,mapId),entries=doc[tools[tool]];
    return {mapId,tool,entries,revision:hash(entries),source:'tools/worlds/'+mapId+'.json',catalog:await catalog(root,mapId)};
}
async function saveTool(root, input, beforeWrite = () => {}) {
    fields(input,['mapId','tool','revision','entries'],'Authoring request');if(!Object.hasOwn(tools,input.tool))fail('Choose a world authoring tool.');
    const doc=readDocument(root,input.mapId),section=tools[input.tool];if(input.revision!==hash(doc[section]))fail('This section changed on disk. Keep your draft, reload, then apply your edits again.',409);
    validate[input.tool](input.entries,await catalog(root,input.mapId));doc[section]=input.entries;
    const json=JSON.stringify(doc,null,2)+'\n';if(Buffer.byteLength(json)>262144)fail('World authoring source exceeds 256 KB.');
    // Recheck after asynchronous catalog reads so concurrent saves cannot overwrite each other.
    const latest=readDocument(root,input.mapId);if(hash(latest[section])!==input.revision)fail('This section changed on disk. Reload before saving.',409);latest[section]=input.entries;
    const finalJson=JSON.stringify(latest,null,2)+'\n';if(Buffer.byteLength(finalJson)>262144)fail('World authoring source exceeds 256 KB.');beforeWrite();
    const file=source(root,input.mapId);fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';
    try{fs.writeFileSync(temp,finalJson,{flag:'wx'});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}
    return readTool(root,input.mapId,input.tool);
}
function loadFlows(root,mapId) {mapId=mapId.replace(/^world_/,'');const rows=readDocument(root,mapId).rules;validateRules(rows);return Contract.compile(rows);}
function registerDialogues(root,target) {
    if(!require('./localplaytest').isLocalPlaytest())return;
    for(const mapId of maps(root)){try{const entries=readDocument(root,mapId).dialogues;validateDialogues(entries);if(entries.length)target.register(mapId,{id:'local-dialogue-builder',dialogues:entries.map(d=>({...d,npc:Number(d.npc),localBuilder:true}))});}catch(error){console.error('Could not load local conversations for '+mapId+': '+error.message);}}
}
function applyAtmosphere(map,entries) {
    if(!entries.length)return map;validateAtmosphere(entries);
    const scenes=(map.scenes||[]).map(s=>({...s}));
    if(entries.some(row=>row.sceneId==='*')) {
        let id='mapmaker-default';while(scenes.some(s=>String(s.id)===id))id+='-fallback';
        scenes.push({id,name:'Map atmosphere default',x:0,y:0,w:map.width,h:map.height});
    }
    for(const scene of scenes){const row=entries.find(r=>r.sceneId===String(scene.id))||entries.find(r=>r.sceneId==='*');if(!row)continue;
        scene.authoringAtmosphere={cycle:row.cycle,dayDarkness:row.dayDarkness,nightDarkness:row.nightDarkness,color:row.color};scene.dn_cycle=row.cycle;scene.darkness=row.dayDarkness;scene.ambience=row.particles;scene.authoringMusic=row.music;
    }
    return {...map,scenes};
}

function installRuntime(app,root) {
    app.use('/maps',(req,res,next)=>{const match=req.path.match(/^\/world_client_([A-Za-z0-9_-]+)\.(json|js)$/);if(!match)return next();try{const entries=readDocument(root,match[1]).atmosphere,tiles=require('./localtilebuilder'),tileDoc=tiles.document(root,match[1]);if(!entries.length&&!tileDoc.placements.length)return next();const map=JSON.parse(fs.readFileSync(safe(root,'client/maps/world_client_'+match[1]+'.json'),'utf8')),value=tiles.applyMap(applyAtmosphere(map,entries),tileDoc);res.setHeader('Cache-Control','no-store');if(match[2]==='js')return res.type('application/javascript').send('var mapData = '+JSON.stringify(value)+';');res.json(value);}catch(error){res.status(error.status||500).json({error:error.message});}});
}
function install(app,toolbox) {
    app.get('/local/api/world-authoring',async(req,res)=>{try{res.json(req.query.mapId===undefined?{maps:maps(toolbox.root)}:await readTool(toolbox.root,req.query.mapId,req.query.tool));}catch(error){res.status(error.status||500).json({error:error.message});}});
    app.post('/local/api/world-authoring',async(req,res)=>{try{if(toolbox.closed)fail('The toolbox is shutting down.',503);if(toolbox.job?.status==='running')fail('Wait for the build to finish before saving.',409);res.json(await saveTool(toolbox.root,req.body,()=>{if(toolbox.closed)fail('The toolbox is shutting down.',503);if(toolbox.job?.status==='running')fail('Wait for the build to finish before saving.',409);}));}catch(error){res.status(error.status||500).json({error:error.message});}});
    app.use('/audio',require('express').static(path.join(toolbox.root,'client/audio')));
}
module.exports={readDocument,readTool,saveTool,catalog,validateRules,validateDialogues,validateAtmosphere,loadFlows,registerDialogues,applyAtmosphere,installRuntime,install};
