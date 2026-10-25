
const Utils = require('./utils');

module.exports = class Checkpoint {
    constructor(id, x, y, width, height, validPosition) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.validPosition = validPosition;
    }
    
    contains(x, y) {return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height;}

    getRandomPosition() {
        const left = Math.ceil(this.x), top = Math.ceil(this.y);
        // Legacy Tiled rectangles can begin or end between whole map tiles.
        const width = Math.ceil(this.x + this.width) - left;
        const height = Math.ceil(this.y + this.height) - top;
        const size = width * height;
        if (!Number.isSafeInteger(size) || width < 1 || height < 1) throw new Error('Checkpoint ' + this.id + ' has no spawn tiles.');
        const start = Utils.randomInt(0, size - 1);
        for (let offset = 0; offset < size; offset++) {
            const tile = (start + offset) % size;
            const pos = {x: left + tile % width, y: top + Math.floor(tile / width)};
            if (!this.validPosition || this.validPosition(pos.x, pos.y)) return pos;
        }
        throw new Error('Checkpoint ' + this.id + ' has no walkable spawn tiles.');
    }
};
