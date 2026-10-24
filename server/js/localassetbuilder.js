const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const zlib = require('zlib');
const manifestPath = 'shared/js/mapmakerentities.json';
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const hash = (...values) => crypto.createHash('sha256').update(Buffer.concat(values.map(v => Buffer.isBuffer(v) ? v : Buffer.from(v)))).digest('hex');
function readManifest(root) {return JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));}
function baseTypes(root) {
    const sandbox = {module: {exports: {}}, exports: {}, require: () => [], console};
    vm.runInNewContext(fs.readFileSync(path.join(root, 'shared/js/gametypes.js'), 'utf8'), sandbox, {timeout: 1000});
    return sandbox.module.exports;
}
function safeFile(root, relative) {
    const target = path.resolve(root, relative);
    if (!target.startsWith(path.resolve(root) + path.sep)) fail('Invalid asset path.');
    let current = target;
    while (current !== path.resolve(root)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('Asset paths must not contain symbolic links.');
        current = path.dirname(current);
    }
    return target;
}
function spriteId(id, type) {return type === 'item' ? 'item-' + id : id;}
function catalog(root) {
    const Types = baseTypes(root), custom = readManifest(root), entries = [];
    Types.forEachKind((kind, id) => {
        if (id.startsWith('NFT_')) return;
        const type = Types.isMob(kind) ? 'mob' : Types.isNpc(kind) ? 'npc' : Types.isItem(kind) ? 'item' : null;
        if (!type || !fs.existsSync(path.join(root, 'client/sprites', spriteId(id, type) + '.json'))) return;
        entries.push({id, kind, type, builtin: true});
    });
    for (const entry of custom) {
        const existing = entries.find(row => row.id === entry.id);
        if (existing) Object.assign(existing, {name: entry.name, customized: true});
        else entries.push({id: entry.id, kind: entry.kind, type: entry.type, name: entry.name, builtin: false});
    }
    return {entries: entries.sort((a,b) => a.id.localeCompare(b.id)), revision: hash(JSON.stringify(custom))};
}
function readAsset(root, id) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(id)) fail('Choose an asset from the list.');
    const entry = catalog(root).entries.find(row => row.id === id);
    if (!entry) fail('This asset was not found.', 404);
    const manifest = readManifest(root), custom = manifest.find(row => row.id === id);
    const sid = spriteId(id, entry.type), relative = 'client/sprites/' + sid + '.json';
    const sprite = custom?.sprite || JSON.parse(fs.readFileSync(safeFile(root, relative), 'utf8'));
    const images = [1,2,3].map(scale => {
        const file = safeFile(root, 'client/img/' + scale + '/' + sid + '.png');
        return fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
    });
    // Only data fields are exposed. Existing scripted item effects remain in properties.js.
    const properties = require('./properties')[id] || {};
    const gameplay = {...Object.fromEntries(['level','hpMod','armorMod','weaponMod','respawnDelay','collectAmount','inventoryDescription','transferable','drops'].filter(key => properties[key] !== undefined).map(key => [key, properties[key]])), ...custom?.gameplay};
    return {...entry, name: custom?.name || id, sprite, gameplay, dialogue: custom?.dialogue || require('../../shared/js/npctalk')[id] || ['Hello, traveler.'],
        client: custom?.client || require('./localassetdefaults').mobDefaults(root,entry.kind,baseTypes(root)),
        revision: hash(JSON.stringify(custom || null), JSON.stringify(sprite), ...images),
        image: images[0].length ? 'data:image/png;base64,' + images[0].toString('base64') : null,
        source: manifestPath};
}
function integer(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max) fail(label + ' must be a whole number between ' + min + ' and ' + max + '.');
    return value;
}
function number(value, min, max, label) {
    if (!Number.isFinite(value) || value < min || value > max) fail(label + ' must be between ' + min + ' and ' + max + '.');
    return value;
}
function validateSprite(input, sid, type, requireAnimations = true) {
    if (!input || typeof input !== 'object') fail('Sprite settings are missing.');
    const sprite = JSON.parse(JSON.stringify(input));
    sprite.id = sid;
    integer(sprite.width, 1, 256, 'Frame width'); integer(sprite.height, 1, 256, 'Frame height');
    for (const key of ['offset_x','offset_y','bubbleOffsetX','bubbleOffsetY']) if (sprite[key] !== undefined) integer(sprite[key], -512, 512, key);
    if (!sprite.animations || Array.isArray(sprite.animations) || !Object.keys(sprite.animations).length || Object.keys(sprite.animations).length > 64) fail('Add between 1 and 64 animations.');
    for (const [name, animation] of Object.entries(sprite.animations)) {
        if (!/^[a-z][a-z0-9_]{0,47}$/.test(name)) fail('Animation names use lowercase letters, numbers and underscores.');
        integer(animation.row, 0, 255, 'Animation row'); integer(animation.length, 1, 256, 'Frame count');
        if (animation.speed !== undefined) {
            for (const speed of Array.isArray(animation.speed) ? animation.speed : [animation.speed]) integer(speed, 16, 10000, 'Frame duration');
        }
    }
    const required = type === 'item' ? ['idle'] : type === 'npc' ? ['idle_down'] : ['idle_down','idle_up','idle_right','walk_down','walk_up','walk_right','atk_down','atk_up','atk_right','death'];
    if (requireAnimations && required.some(name => !sprite.animations[name])) fail('Required animations: ' + required.join(', ') + '.');
    return sprite;
}
// Check chunk framing, CRCs and bounded decompression before accepting a PNG from the browser.
function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {crc ^= byte; for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));}
    return (crc ^ 0xffffffff) >>> 0;
}
function validatePng(data, sprite, scale) {
    if (typeof data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(data) || data.length > 6 * 1024 * 1024) fail('Upload a PNG spritesheet smaller than 4 MB per prepared scale.');
    const buffer = Buffer.from(data.slice(22), 'base64');
    if (!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) fail('The uploaded file is not a PNG.');
    let offset=8, width, height, ended=false, header, compressed=[];
    while (offset + 12 <= buffer.length) {
        const length=buffer.readUInt32BE(offset), end=offset+12+length;
        if (end > buffer.length) fail('The PNG is incomplete.');
        const type=buffer.toString('ascii',offset+4,offset+8), chunk=buffer.subarray(offset+4,end-4);
        if (crc32(chunk) !== buffer.readUInt32BE(end-4)) fail('The PNG checksum is invalid.');
        if (offset===8 && (type!=='IHDR' || length!==13)) fail('The PNG header is invalid.');
        if (type==='IHDR') {header=buffer.subarray(offset+8,end-4); width=header.readUInt32BE(0); height=header.readUInt32BE(4);}
        if (type==='IDAT') compressed.push(buffer.subarray(offset+8,end-4));
        offset=end;
        if (type==='IEND') {ended=length===0 && offset===buffer.length; break;}
    }
    if (!ended || !compressed.length || width < 1 || height < 1 || width > 4096 || height > 4096 || width*height > 8388608) fail('Use a complete PNG no larger than 4096 pixels per side and 8 million pixels.');
    // Canvas exports standard non-interlaced 8-bit RGBA/RGB PNGs.
    if (header[8]!==8 || ![2,6].includes(header[9]) || header[10] || header[11] || header[12]) fail('Prepare this PNG through the editor before saving.');
    const stride=width*(header[9]===6?4:3)+1, expected=stride*height;
    let pixels; try {pixels=zlib.inflateSync(Buffer.concat(compressed), {maxOutputLength: expected});} catch (_) {fail('The PNG pixel data is invalid.');}
    if (pixels.length!==expected) fail('The PNG pixel data is incomplete.');
    for (let y=0;y<height;y++) if (pixels[y*stride]>4) fail('The PNG filter is invalid.');
    if (width%(sprite.width*scale) || height%(sprite.height*scale)) fail('The spritesheet must contain whole frames at every scale.');
    for (const animation of Object.values(sprite.animations)) if (animation.length*sprite.width*scale>width || (animation.row+1)*sprite.height*scale>height) fail('An animation extends outside the spritesheet. Check its row and frame count.');
    return {buffer, width, height};
}
function saveAsset(root, input) {
    if (!input || !['mob','npc','item'].includes(input.type)) fail('Choose Mob, NPC or Item.');
    const {id,type}=input;
    if (['constructor','prototype','__proto__','getType'].includes(id)) fail('Choose a different ID.');
    if (typeof id!=='string' || !/^[a-z][a-z0-9_]{1,47}$/.test(id) && !catalog(root).entries.some(row=>row.id===id)) fail('Use 2–48 lowercase letters, numbers or underscores for the ID.');
    const manifest=readManifest(root), index=manifest.findIndex(row=>row.id===id), existing=catalog(root).entries.find(row=>row.id===id);
    if (input.originalId && input.originalId!==id) fail('Saved IDs cannot be renamed. Create a copy instead.');
    if (!input.originalId && existing) fail('This ID already exists. Choose another ID.',409);
    if (input.originalId && (!existing || existing.type!==type)) fail('The saved asset type cannot be changed.');
    const currentRevision=input.originalId ? readAsset(root,id).revision : catalog(root).revision;
    if (input.originalId && input.revision!==currentRevision) fail('Assets changed in another tab or on disk. Reload the asset list before saving.',409);
    const Types=baseTypes(root);
    if (!existing && (Types.getKindFromString(id) !== undefined || Types.Entities[id.toUpperCase()] !== undefined)) fail('This ID is already registered by the game. Choose another ID.',409);
    const used=new Set(Object.values(Types.Entities).concat(manifest.map(row=>row.kind)));
    let kind=existing?.kind || 1800000000; while (!existing && used.has(kind)) kind++;
    const name=String(input.name||'').trim(); if (!name || name.length>100) fail('Give this asset a name of 1–100 characters.');
    const sprite=validateSprite(input.sprite,spriteId(id,type), type, !existing?.builtin);
    const gameplay={}, client={};
    if (type==='mob') {
        for (const [key,min,max] of [['level',1,1000],['respawnDelay',1000,86400000]]) gameplay[key]=integer(input.gameplay?.[key],min,max,key);
        for (const key of ['hpMod','armorMod','weaponMod']) gameplay[key]=number(input.gameplay?.[key],0.01,100,key);
        for (const [key,min,max] of [['moveSpeed',50,2000],['idleSpeed',16,10000],['atkSpeed',16,10000],['aggroRange',0,20]]) client[key]=integer(input.client?.[key],min,max,key);
        client.isAggressive=input.client?.isAggressive===true;
        const drops=input.gameplay?.drops || {};
        if (!drops || typeof drops!=='object' || Array.isArray(drops) || Object.keys(drops).length>30) fail('Drops must be an object with at most 30 item IDs.');
        let total=0;
        for (const [item,chance] of Object.entries(drops)) {
            const custom=manifest.find(row=>row.id===item && row.type==='item');
            if (!custom && !Types.isItem(Types.getKindFromString(item))) fail('Unknown drop item: '+item);
            total+=number(chance,0,100,'Drop chance');
        }
        if (total>100) fail('Drop chances must total at most 100%.');
        gameplay.drops=drops;
    }
    if (type==='item') {
        gameplay.collectAmount=integer(input.gameplay?.collectAmount,1,9999,'Collection amount');
        gameplay.inventoryDescription=String(input.gameplay?.inventoryDescription||'').slice(0,500);
        gameplay.transferable=input.gameplay?.transferable===true;
        if (!existing || !existing.builtin) gameplay.collectable=true;
    }
    const dialogue=type==='npc' ? input.dialogue : undefined;
    if (type==='npc' && (!Array.isArray(dialogue) || !dialogue.length || dialogue.length>50 || dialogue.some(line=>typeof line!=='string'||line.length>2000||/[<>]/.test(line)))) fail('Add 1–50 plain-text dialogue lines, up to 2000 characters each. Use the Quest builder for styled quest dialogue.');
    const entry={id,kind,type,name,builtin:existing?.builtin===true,sprite,gameplay,client,...(dialogue?{dialogue}:{})};
    if (index>=0) manifest[index]=entry; else manifest.push(entry);
    const updates=[];
    if (input.images) {
        const pngs=[1,2,3].map(scale=>validatePng(input.images[scale],sprite,scale));
        for (let i=1;i<3;i++) if (pngs[i].width!==pngs[0].width*(i+1) || pngs[i].height!==pngs[0].height*(i+1)) fail('The prepared 1×, 2× and 3× sheets must have matching dimensions.');
        pngs.forEach((png,i)=>updates.push(['client/img/'+(i+1)+'/'+sprite.id+'.png',png.buffer]));
    } else {
        if (!existing) fail('Upload or copy a spritesheet before saving.');
        for (const scale of [1,2,3]) {
            const file=safeFile(root,'client/img/'+scale+'/'+sprite.id+'.png');
            if (!fs.existsSync(file)) fail('This sprite is missing a scale. Prepare the sheet before saving.');
            // Existing legacy PNG encodings are preserved; geometry must still fit.
            const png=fs.readFileSync(file), width=png.readUInt32BE(16),height=png.readUInt32BE(20);
            if (Object.values(sprite.animations).some(a=>a.length*sprite.width*scale>width||(a.row+1)*sprite.height*scale>height)) fail('Animation frames extend outside the current sheet.');
        }
    }
    updates.push(['client/sprites/'+sprite.id+'.json',Buffer.from(JSON.stringify(sprite,null,2)+'\n')]);
    updates.push(['client/js/mapmakerentities.js',Buffer.from('// Generated from shared/js/mapmakerentities.json. Do not edit.\n' + 'define(function () { return ' + JSON.stringify(manifest) + '; });\n')]);
    updates.push([manifestPath,Buffer.from(JSON.stringify(manifest,null,2)+'\n')]);
    const backups=[];
    try {
        for (const [relative,data] of updates) {
            const file=safeFile(root,relative); fs.mkdirSync(path.dirname(file),{recursive:true});
            backups.push([file,fs.existsSync(file)?fs.readFileSync(file):null]);
            const temp=file+'.'+crypto.randomUUID()+'.tmp';
            try {fs.writeFileSync(temp,data,{flag:'wx'}); fs.renameSync(temp,file);} finally {fs.rmSync(temp,{force:true});}
        }
    } catch (error) {
        for (const [file,data] of backups.reverse()) {if (data) fs.writeFileSync(file,data); else fs.rmSync(file,{force:true});}
        throw error;
    }
    require('../../shared/js/gametypes').registerMapmakerEntities(manifest);
    return {...readAsset(root,id),requiresBuild:true};
}
module.exports={catalog,readAsset,saveAsset,validateSprite,validatePng,baseTypes};
