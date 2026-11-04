(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./pixelfxcatalog'));
    else if (typeof define === 'function' && define.amd) define(['pixelfxcatalog'], factory);
    else root.PlacedFxConfig = factory(root.PixelFxCatalog);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Catalog) {
    'use strict';
    const hitStyles = {'hit:sparks':'impacts/hit-spark', 'hit:frost':'ice/snowflake-burst', 'hit:shadow':'shadow/dark-explosion'};
    const fail = message => {throw new Error(message);};
    function number(value, min, max, label) {
        if (!Number.isInteger(value) || value < min || value > max) fail(label + ' must be a whole number between ' + min + ' and ' + max + '.');
    }
    // The pinned library declares the supported options. Placement policy adds
    // bounded inputs; seed and the main palette have separate owners.
    function optionFields(effect) {
        const meta=Catalog.effects[effect];
        return Object.entries(meta.options).map(([key,value])=>{
            const field={key,default:value};
            if (typeof value==='boolean') return {...field,type:'boolean'};
            if (typeof value==='string') return {...field,type:value.startsWith('#')?'color':'text'};
            if (Array.isArray(value)) return {...field,type:typeof value[0]==='string'?'colors':'point',max:meta.size};
            if (key==='side') return {...field,type:'choice',values:[-1,1]};
            if (['aim','wind'].includes(key)) return {...field,type:'number',min:-4,max:4,step:.01};
            if (effect==='ui/health-bar-hit') return {...field,type:'number',min:0,max:1,step:.01};
            const integer=['count','coins','rays','shafts','lines','tendrils','teeth','from'].includes(key);
            // Very small dimensions break some upstream simulations (e.g. fire
            // ring needs flame sites). Keep size controls near tested defaults.
            const min=integer?1:Math.max(.01,Math.round(value*25)/100);
            const max=integer?Math.min(256,value*4):Math.max(1,value*4);
            return {...field,type:'number',min,max,step:integer?1:.01};
        });
    }
    function validateOptions(effect, options) {
        if (options===undefined) return;
        if (!options || typeof options!=='object' || Array.isArray(options)) fail('Effect options must be an object.');
        const fields=new Map(optionFields(effect).map(field=>[field.key,field]));
        const color=value=>typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value);
        for (const [key,value] of Object.entries(options)) {
            const f=fields.get(key);
            if (!f) fail('Unsupported effect option: '+key+'.');
            let valid=false;
            switch(f.type) {
            case 'boolean': valid=typeof value==='boolean';break;
            case 'color': valid=color(value);break;
            case 'text': valid=typeof value==='string' && value.length<=64 && !/[<>\u0000-\u001f]/.test(value);break;
            case 'choice': valid=f.values.includes(value);break;
            case 'colors': valid=Array.isArray(value) && value.length===f.default.length && value.every(color);break;
            case 'point': valid=Array.isArray(value) && value.length===2 && value.every((n,i)=>Number.isFinite(n) && n>=0 && n<=f.max[i]);break;
            case 'number': valid=Number.isFinite(value) && value>=f.min && value<=f.max && (f.step!==1 || Number.isInteger(value));break;
            }
            if (!valid) fail('Invalid effect option: '+key+'.');
        }
    }
    const validImage = image => typeof image==='string' && /^\/img\/map-fx\/custom-[a-f0-9]{32}\.png$/.test(image);
    function validateSprite(sprite) {
        if (!sprite || typeof sprite!=='object' || Array.isArray(sprite) || Object.keys(sprite).some(key=>!['image','frameWidth','frameHeight','columns','frames','fps'].includes(key))) fail('Choose a custom sprite sheet and its frame settings.');
        if (!validImage(sprite.image)) fail('Choose an uploaded local effect PNG.');
        number(sprite.frameWidth,1,1024,'Frame width');number(sprite.frameHeight,1,1024,'Frame height');
        number(sprite.columns,1,256,'Sheet columns');number(sprite.frames,1,256,'Frame count');number(sprite.fps,1,60,'Frames per second');
        if (sprite.frames/sprite.fps>60) fail('Keep custom animations within 60 seconds.');
    }
    function metadata(row) {
        return row.sprite ? {duration:row.sprite.frames/row.sprite.fps*1000,loop:false,size:[row.sprite.frameWidth,row.sprite.frameHeight]} : Catalog.effects[row.effect];
    }
    function validate(rows, map) {
        if (!Array.isArray(rows) || rows.length > 100) fail('Place at most 100 effects per map.');
        const ids = new Set();
        for (const r of rows) {
            if (!r || Object.keys(r).some(k => !['id','name','effect','x','y','width','height','scale','hue','palette','background','hazard','attackingMob','options','sprite'].includes(k))) fail('Unsupported placed FX field.');
            if (typeof r.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/i.test(r.id) || ids.has(r.id)) fail('FX IDs must be unique.');
            ids.add(r.id);
            if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 120 || /[<>\u0000-\u001f]/.test(r.name)) fail('Enter a plain-text FX name.');
            if (r.sprite !== undefined) {
                validateSprite(r.sprite);
                if (['effect','options','palette','hue','background'].some(key=>r[key]!==undefined)) fail('Custom sprite sheets use their own artwork instead of PixelFX appearance settings.');
            } else {
                if (!Object.hasOwn(Catalog.effects, r.effect)) fail('Choose an effect from the PixelFX catalog.');
                validateOptions(r.effect,r.options);
            }
            number(r.x, 0, (map?.width || 10000)-1, 'Tile X'); number(r.y, 0, (map?.height || 10000)-1, 'Tile Y');
            number(r.width, 1, 32, 'Area width'); number(r.height, 1, 32, 'Area height');
            if (map && (r.x+r.width>map.width || r.y+r.height>map.height)) fail('The FX area must fit inside the map.');
            if (!Number.isFinite(r.scale) || r.scale < .1 || r.scale > 4) fail('Visual scale must be between 0.1 and 4.');
            if (r.background !== undefined && !['transparent','original'].includes(r.background)) fail('Choose transparent overlay or original artwork.');
            if (r.hue !== undefined) number(r.hue, -180, 180, 'Hue shift');
            if (r.palette !== undefined && (typeof r.palette !== 'string' || !Object.hasOwn(Catalog.palettes, r.palette))) fail('Choose a palette from the PixelFX library.');
            if (r.attackingMob !== undefined) {
                number(r.attackingMob, 1, Number.MAX_SAFE_INTEGER, 'Attacking mob');
                if (map?.mobs && !map.mobs.some(mob => mob.id === r.attackingMob)) fail('Choose an attacking mob from this map.');
            }
            if (r.hazard !== null) {
                const h = r.hazard;
                if (!h || Object.keys(h).some(k => !['warningMs','activeMs','cooldownMs','damage','tickMs','impactMs','placement','areaWidth','areaHeight'].includes(k))) fail('Unsupported hazard settings.');
                if (h.placement !== undefined && !['fixed','random'].includes(h.placement)) fail('Choose fixed or random strike placement.');
                if (h.placement === 'random') {number(h.areaWidth,1,r.width,'Strike width');number(h.areaHeight,1,r.height,'Strike height');}
                number(h.warningMs, 750, 60000, 'Warning'); number(h.activeMs, 100, 60000, 'Active duration');
                number(h.cooldownMs, 250, 300000, 'Cooldown'); number(h.damage, 1, 10000, 'Damage');
                number(h.tickMs, 250, 60000, 'Damage interval');
                number(h.impactMs, 0, Math.min(h.warningMs, Math.ceil(metadata(r).duration)-1), 'Effect impact time');
            }
        }
        return rows;
    }
    function contains(r, x, y) {return x>=r.x && y>=r.y && x<r.x+r.width && y<r.y+r.height;}
    function effectSeed(row, cycle, seed, epoch=0) {
        let hash=seed|0;
        for (const char of row.id+':'+epoch+':'+cycle) hash=Math.imul(hash^char.charCodeAt(0),16777619);
        return (hash>>>0) || 1;
    }
    function hitRegion(row, cycle = 0, seed = 0) {
        const h=row.hazard;
        if(h?.placement!=='random')return {x:row.x,y:row.y,width:row.width,height:row.height};
        // A server-owned seed and cycle pick one stable tile footprint for every observer.
        let hash=seed|0;for(const char of row.id+':'+cycle)hash=Math.imul(hash^char.charCodeAt(0),16777619);
        const next=()=>{hash^=hash<<13;hash^=hash>>>17;hash^=hash<<5;return (hash>>>0)/4294967296;};
        return {x:row.x+Math.floor(next()*(row.width-h.areaWidth+1)),y:row.y+Math.floor(next()*(row.height-h.areaHeight+1)),width:h.areaWidth,height:h.areaHeight};
    }
    function playbackDuration(row) {
        const meta=metadata(row);
        return meta.loop && row.hazard ? Math.max(meta.duration,row.hazard.impactMs+row.hazard.activeMs) : meta.duration;
    }
    function cycleDuration(row) {
        const h=row.hazard;
        return h ? h.warningMs+Math.max(h.activeMs,playbackDuration(row)-h.impactMs)+h.cooldownMs : metadata(row).duration;
    }
    function phase(row, elapsed) {
        if (elapsed === null) return {kind:'inactive', effectMs:null};
        const duration = metadata(row).duration;
        if (!row.hazard) return {kind:'decoration', cycle:Math.floor(Math.max(0,elapsed)/duration), effectMs:Math.max(0, elapsed)%duration};
        const h = row.hazard, period = cycleDuration(row);
        const cycle = Math.floor(Math.max(0, elapsed)/period), at = Math.max(0, elapsed)%period;
        const kind = at<h.warningMs ? 'warning' : at<h.warningMs+h.activeMs ? 'active' : 'cooldown';
        const effectMs = at-h.warningMs+h.impactMs;
        return {kind, cycle, remaining:kind==='warning'?h.warningMs-at:kind==='active'?h.warningMs+h.activeMs-at:period-at,
            tick:Math.floor((at-h.warningMs)/h.tickMs), effectMs:effectMs<0 || effectMs>=playbackDuration(row) ? null : effectMs%duration};
    }
    return {validate, validateSprite, validImage, metadata, validateOptions, optionFields, contains, phase, hitRegion, effectSeed, cycleDuration, hitStyles, catalog:Catalog.effects, palettes:Catalog.palettes};
});
