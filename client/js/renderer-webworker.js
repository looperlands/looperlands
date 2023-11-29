let tileset = undefined;
let tilesize = 16;
let canvases = {};
let contexes = {};
let cursors = {};
let cursor = undefined;


async function loadImg(src) {
    const imgblob = await fetch(src)
        .then(r => r.blob());
    return await createImageBitmap(imgblob);
}


function getX(id, w) {
    if (id == 0) {
        return 0;
    }
    return (id % w == 0) ? w - 1 : (id % w) - 1;
};


function drawScaledImage(ctx, image, x, y, w, h, dx, dy, scale) {

    //console.log(arguments);

    ctx.drawImage(image,
        x,
        y,
        w,
        h,
        dx * scale,
        dy * scale,
        w * scale,
        h * scale);
}

function drawTile(ctx, tileid, tileset, setW, gridW, cellid, scale) {
    if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
        this.drawScaledImage(ctx,
            tileset,
            getX(tileid + 1, setW) * tilesize,
            Math.floor(tileid / setW) * tilesize,
            tilesize,
            tilesize,
            getX(cellid + 1, gridW) * tilesize,
            Math.floor(cellid / gridW) * tilesize,
            scale);
    }
};

function render(id, tiles, cameraX, cameraY, scale, clear) {
    let ctx = contexes[id];
    let canvas = canvases[id];
    if (clear === true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.save();
    ctx.translate(-cameraX * scale, -cameraY * scale);
    for (let tile of tiles) {
        drawTile(ctx, tile.tileid, tileset, tile.setW, tile.gridW, tile.cellid, scale)
    }
    ctx.restore();
}


onmessage = (e) => {
    if (e.data.type === "setTileset") {
        loadImg(e.data.src).then((img) => {
            tileset = img;
        });
    }
    else if (e.data.type === "setMouseCursor") {
        cursor = cursors[e.data.name];
        console.log("setMouseCursor", e.data.name);
    } else if (e.data.type === "loadCursor") {
        loadImg(e.data.src).then((img) => {
            cursors[e.data.name] = img;
            console.log("loaded cursor", e.data.name);
        });
    }
    else if (e.data.type === "render") {
        for (let renderData of e.data.renderData) {
            if (renderData.cursor !== undefined) {
                renderCursor(renderData);
            } else {
                render(renderData.id, renderData.tiles, renderData.cameraX, renderData.cameraY, renderData.scale, renderData.clear);
            }
        }
        requestAnimationFrame(() => {
            postMessage({ type: "rendered" });
        });
    } else if (e.data.type === "setCanvasSize") {

        for (let id in canvases) {
            let canvas = canvases[id];
            let ctx = contexes[id];
            canvas.width = e.data.width;
            canvas.height = e.data.height;
            ctx.imageSmoothingEnabled  = false;
        }
    } else if (e.data.type === "setCanvas") {
        let id = e.data.id;
        let canvas = e.data.canvas;
        canvases[id] = canvas;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled  = false;
        contexes[id] = ctx;
    }
};

function renderCursor(renderData) {
    let mx = renderData.mx;
    let my = renderData.my;
    let s = renderData.s;
    let os = renderData.os;
    let cursorImg = cursors[renderData.name];
    let ctx = contexes[renderData.id];
    ctx.save();
    ctx.drawImage(cursorImg, 0, 0, 14 * os, 14 * os, mx, my, 14 * s, 14 * s);
    ctx.restore();
}
