// Run the same native-pixel height pass used for outdoor scenery in the game.
importScripts('./vendor/height-shadows-worker.js');

const tile = 16;
let sample;
function prepare({proxy, artwork, bounds, paint}) {
    const cols = Math.ceil(proxy.width / tile), rows = Math.ceil(proxy.height / tile);
    const atlas = new OffscreenCanvas(cols * tile, rows * tile);
    atlas.getContext('2d').drawImage(proxy, 0, 0);
    const pixels = atlas.getContext('2d').getImageData(0, 0, proxy.width, proxy.height);
    let top = 0;
    for (let i = 0; i < pixels.data.length; i += 4) {
        const z = pixels.data[i + 1];
        if (!pixels.data[i + 3]) continue;
        top = Math.max(top, z);
        pixels.data[i] = Math.min(255, 3 * z);
        pixels.data[i + 2] = 255;
    }
    const view = new OffscreenCanvas(proxy.width, proxy.height);
    view.getContext('2d').putImageData(pixels, 0, 0);
    const pad = Math.ceil(Math.min(160, top) * 2.1 / tile) + 1;
    const w = cols + 2 * pad, h = rows + 2 * pad;
    const data = new Array(w * h);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) data[(y + pad) * w + x + pad] = y * cols + x + 1;
    }
    const art = new OffscreenCanvas(artwork.width, artwork.height);
    const ctx = art.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(artwork, 0, 0);
    // Match the baker's removal of neutral translucent ink within authored bounds.
    for (const [l, t, r, b] of paint) {
        const x = Math.max(0, l - bounds[0]), y = Math.max(0, t - bounds[1]);
        const width = Math.min(art.width, r - bounds[0]) - x, height = Math.min(art.height, b - bounds[1]) - y;
        if (width <= 0 || height <= 0) continue;
        const ink = ctx.getImageData(x, y, width, height);
        for (let i = 0; i < ink.data.length; i += 4) {
            if (ink.data[i + 3] < 176 && ink.data[i] <= 55 && ink.data[i] === ink.data[i + 1] && ink.data[i] === ink.data[i + 2]) ink.data[i + 3] = 0;
        }
        ctx.putImageData(ink, x, y);
    }
    artwork.close();
    proxy.close();
    const scene = {id: 'preview', x: 0, y: 0, width: w, height: h};
    sample = {pass: new self.HeightShadows.Pass({width: w, height: h, data}, atlas), scene,
        canvas: new OffscreenCanvas(w * tile, h * tile), pad: pad * tile, art};
    return view.transferToImageBitmap();
}

function castBounds(shade, pad, art) {
    let left = pad, top = pad, right = pad + art.width, bottom = pad + art.height;
    if (shade) {
        const pixels = shade.getContext('2d').getImageData(0, 0, shade.width, shade.height).data;
        for (let y = 0, i = 3; y < shade.height; y++) {
            for (let x = 0; x < shade.width; x++, i += 4) {
                if (!pixels[i]) continue;
                left = Math.min(left, x); right = Math.max(right, x + 1);
                top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
            }
        }
    }
    const margin = 6;
    return {x: left - margin, y: top - margin, width: right - left + 2 * margin, height: bottom - top + 2 * margin};
}

self.onmessage = ({data}) => {
    try {
        const proxy = data.proxy && prepare(data);
        if (!sample) return;
        const {canvas, pass, scene, pad, art} = sample;
        const light = self.HeightShadows.skyLight(data.hour * 150000, {dawn: 6, dusk: 18, duskDuration: 0}, 1);
        const shade = pass.draw(canvas, {cameraX: 0, cameraY: 0, scale: 1}, scene, light, [], {}, {shadows: true, playerShadow: false}, []);
        const crop = castBounds(shade, pad, art);
        const cast = new OffscreenCanvas(crop.width, crop.height);
        const ctx = cast.getContext('2d');
        ctx.fillStyle = '#dce3d3';
        ctx.fillRect(0, 0, cast.width, cast.height);
        if (shade) ctx.drawImage(shade, -crop.x, -crop.y);
        ctx.drawImage(art, pad - crop.x, pad - crop.y);
        const result = cast.transferToImageBitmap();
        self.postMessage({request: data.request, generation: data.generation, proxy, cast: result}, proxy ? [proxy, result] : [result]);
    } catch (error) {self.postMessage({request: data.request, error: error.message});}
};
