let tileset = undefined;
let tilesize = 16;
let canvas = undefined;
let ctx = undefined;

async function loadTileset(src) {
    const imgblob = await fetch('https://upload.wikimedia.org/wikipedia/commons/5/55/John_William_Waterhouse_A_Mermaid.jpg')
        .then(r => r.blob());
    tileset = await createImageBitmap(imgblob);
    console.log("set tileset to " + tileset);
}


function getX(id, w) {
    if (id == 0) {
        return 0;
    }
    return (id % w == 0) ? w - 1 : (id % w) - 1;
};


function drawScaledImage(ctx, image, x, y, w, h, dx, dy, scale) {

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

function drawTile(ctx, tileid, tileset, setW, gridW, cellid) {
    if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
        this.drawScaledImage(ctx,
            tileset,
            getX(tileid + 1, (setW)) * tilesize,
            Math.floor(tileid / (setW)) * tilesize,
            tilesize,
            tilesize,
            getX(cellid + 1, gridW) * tilesize,
            Math.floor(cellid / gridW) * tilesize);
    }
};

function render(tiles, cameraX, cameraY, scale) {
    ctx.translate(-cameraX * scale, -cameraY * scale);
    for (let tile of tiles) {
        drawTile(ctx, tile.tileid, tileset, tile.setW, tile.gridW, tile.cellid)
    }
}


onmessage = (e) => {
    if (e.data.type === "setTileset") {
        loadTileset(e.data.src);
    } else if (e.data.type === "render") {
        render(e.data.tiles, e.data.cameraX, e.data.cameraY, e.data.scale);
    } else if (e.data.type === "setCanvasSize") {
        canvas.width = e.data.width;
        canvas.height = e.data.height;
    } else if (e.data.type === "setCanvas") {
        console.log("setting canvas");
        canvas = e.data.canvas;
        ctx = canvas.getContext('2d');
    }
};