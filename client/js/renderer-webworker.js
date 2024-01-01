let tileset = undefined;
let tilesize = 16;
let canvases = {};
let contexes = {};
let cursors = {};
let cursor = undefined;
let hasLoadedFont = false;


async function loadImg(src) {
    const imgblob = await fetch(src)
        .then(r => r.blob());
    return await createImageBitmap(imgblob);
}

async function loadFont() {
    if(self.FontFace) {
        // first declare our font-face
        const fontFace = new FontFace(
            'GraphicPixel',
            "url('../fonts/graphicpixel-webfont.eot') format('embedded-opentype'), url('../fonts/graphicpixel-webfont.eot?#iefix') format('embedded-opentype'), url('../fonts/graphicpixel-webfont.woff') format('woff'), url('../fonts/graphicpixel-webfont.ttf') format('truetype'), url('../fonts/graphicpixel-webfont.svg#GraphicPixelRegular') format('svg')"
        );
        // add it to the list of fonts our worker supports
        self.fonts.add(fontFace);
        await fontFace.load();
    }

    hasLoadedFont = true;
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

    const tilesLength = tiles.length;
    for (let i = 0; i < tilesLength; i++) {
        let tile = tiles[i];
        drawTile(ctx, tile.tileid, tileset, tile.setW, tile.gridW, tile.cellid, scale);
    }

    ctx.restore();
}


onmessage = (e) => {
    if(!hasLoadedFont) {
        loadFont();
    }

    if (e.data.type === "setTileset") {
        loadImg(e.data.src).then((img) => {
            tileset = img;
        });
    } else if (e.data.type === "loadCursor") {
        loadImg(e.data.src).then((img) => {
            cursors[e.data.name] = img;
            console.log("loaded cursor", e.data.name);
        });
    }
    else if (e.data.type === "render") {
        const renderDataLength = e.data.renderData.length;
        for (let i = 0; i < renderDataLength; i++) {
            let renderData = e.data.renderData[i];
            if (renderData.cursor !== undefined) {
                renderCursor(renderData);
            } else if (renderData.type === "text") {
                drawText(renderData);
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


let lastRenderLength = 0;
async function drawText(renderData) {
    const textDataLength = renderData.textData.length;

    /*
        Don't render if there is no text to render the second time
        which allows for clearing the screen once
        after the user disables the text rendering
    */
    let disabled = textDataLength === lastRenderLength && textDataLength === 0;
    if(disabled) {
        return;
    }

    let id = renderData.id;
    let ctx = contexes[id];
    let canvas = canvases[id];

    const cameraX = renderData.cameraX;
    const cameraY = renderData.cameraY;
    const scale = renderData.scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX * scale, -cameraY * scale);
    for (let i = 0; i < textDataLength; i++) {
        let textData = renderData.textData[i];
        let {text, x, y, centered, color, strokeColor, title} = textData;

        let strokeSize;

        switch (scale) {
            case 1:
                strokeSize = 3; break;
            case 2:
                strokeSize = 3; break;
            case 3:
                strokeSize = 5;
        }

        if (text && x && y) {
            if (centered) {
                ctx.textAlign = "center";
            }
            let fontSize;
            if (title) {
                switch (scale) {
                    case 1: fontSize = 5; break;
                    case 2: fontSize = 10; break;
                    case 3: fontSize = 15; break;
                }
            } else {
                if (textData.fontSize) {
                    fontSize = textData.fontSize;
                } else {
                    switch (scale) {
                        case 1: fontSize = 10; break;
                        case 2: fontSize = 13; break;
                        case 3: fontSize = 20; break;
                    }
                }
            }

            let font = `${fontSize}px GraphicPixel`;
            ctx.font = font;

            if (textData.globalAlpha !== undefined) {
                ctx.globalAlpha = textData.globalAlpha;
            }

            ctx.strokeStyle = strokeColor || "#373737";
            ctx.lineWidth = strokeSize;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = color || "white";
            ctx.fillText(text, x, y);

        }
    }
    ctx.restore();
    lastRenderLength = textDataLength;
}
