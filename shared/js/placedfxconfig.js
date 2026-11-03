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
    function validate(rows, map) {
        if (!Array.isArray(rows) || rows.length > 100) fail('Place at most 100 effects per map.');
        const ids = new Set();
        for (const r of rows) {
            if (!r || Object.keys(r).some(k => !['id','name','effect','x','y','width','height','scale','hue','background','hazard'].includes(k))) fail('Unsupported placed FX field.');
            if (typeof r.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/i.test(r.id) || ids.has(r.id)) fail('FX IDs must be unique.');
            ids.add(r.id);
            if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 120 || /[<>\u0000-\u001f]/.test(r.name)) fail('Enter a plain-text FX name.');
            if (!Object.hasOwn(Catalog.effects, r.effect)) fail('Choose an effect from the PixelFX catalog.');
            number(r.x, 0, (map?.width || 10000)-1, 'Tile X'); number(r.y, 0, (map?.height || 10000)-1, 'Tile Y');
            number(r.width, 1, 32, 'Area width'); number(r.height, 1, 32, 'Area height');
            if (map && (r.x+r.width>map.width || r.y+r.height>map.height)) fail('The FX area must fit inside the map.');
            if (!Number.isFinite(r.scale) || r.scale < .1 || r.scale > 4) fail('Visual scale must be between 0.1 and 4.');
            if (r.background !== undefined && !['transparent','original'].includes(r.background)) fail('Choose transparent overlay or original artwork.');
            if (r.hue !== undefined) number(r.hue, -180, 180, 'Hue shift');
            if (r.hazard !== null) {
                const h = r.hazard;
                if (!h || Object.keys(h).some(k => !['warningMs','activeMs','cooldownMs','damage','tickMs','impactMs','placement','areaWidth','areaHeight'].includes(k))) fail('Unsupported hazard settings.');
                if (h.placement !== undefined && !['fixed','random'].includes(h.placement)) fail('Choose fixed or random strike placement.');
                if (h.placement === 'random') {number(h.areaWidth,1,r.width,'Strike width');number(h.areaHeight,1,r.height,'Strike height');}
                number(h.warningMs, 750, 60000, 'Warning'); number(h.activeMs, 100, 60000, 'Active duration');
                number(h.cooldownMs, 250, 300000, 'Cooldown'); number(h.damage, 1, 10000, 'Damage');
                number(h.tickMs, 250, 60000, 'Damage interval');
                number(h.impactMs, 0, Math.min(h.warningMs, Catalog.effects[r.effect].duration-1), 'Effect impact time');
            }
        }
        return rows;
    }
    function contains(r, x, y) {return x>=r.x && y>=r.y && x<r.x+r.width && y<r.y+r.height;}
    function hitRegion(row, cycle = 0, seed = 0) {
        const h=row.hazard;
        if(h?.placement!=='random')return {x:row.x,y:row.y,width:row.width,height:row.height};
        // A server-owned seed and cycle pick one stable tile footprint for every observer.
        let hash=seed|0;for(const char of row.id+':'+cycle)hash=Math.imul(hash^char.charCodeAt(0),16777619);
        const next=()=>{hash^=hash<<13;hash^=hash>>>17;hash^=hash<<5;return (hash>>>0)/4294967296;};
        return {x:row.x+Math.floor(next()*(row.width-h.areaWidth+1)),y:row.y+Math.floor(next()*(row.height-h.areaHeight+1)),width:h.areaWidth,height:h.areaHeight};
    }
    function playbackDuration(row) {
        const meta=Catalog.effects[row.effect];
        return meta.loop && row.hazard ? Math.max(meta.duration,row.hazard.impactMs+row.hazard.activeMs) : meta.duration;
    }
    function cycleDuration(row) {
        const h=row.hazard;
        return h ? h.warningMs+Math.max(h.activeMs,playbackDuration(row)-h.impactMs)+h.cooldownMs : Catalog.effects[row.effect].duration;
    }
    function phase(row, elapsed) {
        const duration = Catalog.effects[row.effect].duration;
        if (!row.hazard) return {kind:'decoration', effectMs:Math.max(0, elapsed)%duration};
        const h = row.hazard, period = cycleDuration(row);
        const cycle = Math.floor(Math.max(0, elapsed)/period), at = Math.max(0, elapsed)%period;
        const kind = at<h.warningMs ? 'warning' : at<h.warningMs+h.activeMs ? 'active' : 'cooldown';
        const effectMs = at-h.warningMs+h.impactMs;
        return {kind, cycle, remaining:kind==='warning'?h.warningMs-at:kind==='active'?h.warningMs+h.activeMs-at:period-at,
            tick:Math.floor((at-h.warningMs)/h.tickMs), effectMs:effectMs<0 || effectMs>=playbackDuration(row) ? null : effectMs%duration};
    }
    return {validate, contains, phase, hitRegion, cycleDuration, hitStyles, catalog:Catalog.effects};
});
