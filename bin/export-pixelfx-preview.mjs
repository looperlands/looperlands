#!/usr/bin/env node
// Usage: node bin/export-pixelfx-preview.mjs /path/to/patch-gg/pixelfx
// Source revision is recorded with the generated sheets. No upstream runtime ships.
import {mkdirSync, writeFileSync, copyFileSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const source = process.argv[2];
if (!source) throw new Error('Supply a checkout of patch-gg/pixelfx.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'bin/pixelfx-preview/assets');
const {loadEffect, renderFrames} = await import(pathToFileURL(resolve(source, 'tools/lib/fxlib.mjs')));
const {encodePNG} = await import(pathToFileURL(resolve(source, 'tools/lib/png.mjs')));
const specs = {
    critical: {source:'impacts/crit-hit', from:0, to:.6, duration:340, scale:.3},
    sparks: {source:'impacts/hit-spark', from:0, to:.45, duration:240, scale:.4},
    frost: {source:'ice/snowflake-burst', from:0, to:1, duration:400, scale:.35},
    shadow: {source:'shadow/dark-explosion', from:0, to:1.3, duration:450, scale:.25},
    holy: {source:'holy/smite', from:.5, to:1.7, duration:600, scale:.4},
    lightning: {source:'lightning/lightning-strike', from:.75, to:1.65, duration:500, scale:.35},
    pillar: {source:'fire/flame-pillar', from:.55, to:2.6, duration:1400, scale:.4},
    meteor: {source:'fire/meteor', from:0, to:2.2, duration:2200, scale:.4, impact:620},
    flamethrower: {source:'fire/flamethrower', from:0, to:1.6, duration:1600, scale:.7, loop:true},
    poof: {source:'spawn/poof', from:0, to:1.2, duration:600, scale:.5}
};
mkdirSync(output, {recursive:true});
const manifest = {upstream:'https://github.com/patch-gg/pixelfx', revision:execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(), effects:{}};
for (const [name, spec] of Object.entries(specs)) {
    const effect = await loadEffect(spec.source);
    const rendered = renderFrames(effect, {fps:20, actor:false, bg:'none'});
    const frames = rendered.frames.filter(frame => frame.t >= spec.from - .001 && frame.t <= spec.to + .001);
    const {w, h} = rendered, columns = Math.min(8, frames.length), rows = Math.ceil(frames.length / columns);
    const pixels = new Uint8Array(w * columns * h * rows * 4);
    frames.forEach((frame, index) => {
        for (let y=0; y<h; y++) pixels.set(frame.clear.subarray(y*w*4, (y+1)*w*4), ((Math.floor(index/columns)*h+y)*w*columns+(index%columns)*w)*4);
    });
    writeFileSync(join(output,name+'.png'), encodePNG(w*columns,h*rows,pixels));
    manifest.effects[name] = {...spec,width:w,height:h,origin:effect.meta.origin,columns,frames:frames.length};
    console.log(name+': '+frames.length+' frames');
}
writeFileSync(join(output,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
copyFileSync(resolve(source,'LICENSE'),join(output,'PixelFX-LICENSE'));
copyFileSync(resolve(source,'NOTICE.md'),join(output,'PixelFX-NOTICE.md'));
