class Pathfinder {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = null;
        this.blankGrid = [];
        this.initBlankGrid_();
        this.ignored = [];
        this.pendingRequests = {};
        this.worker = new Worker('js/pathfinder-webworker.js');

        this.worker.onmessage = (e) => {
            const { requestId, path } = e.data;
            const resolve = this.pendingRequests[requestId];
            if (resolve) {
                resolve(path);
                delete this.pendingRequests[requestId];
            }
        };
    }

    initBlankGrid_() {
        for (let i = 0; i < this.height; i += 1) {
            this.blankGrid[i] = [];
            for (let j = 0; j < this.width; j += 1) {
                this.blankGrid[i][j] = 0;
            }
        }
    }

    generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    findPath(grid, entity, x, y, findIncomplete) {
        return new Promise((resolve, reject) => {
            try {
                const start = [entity.gridX, entity.gridY],
                      end = [x, y];
    
                this.grid = grid;
                this.applyIgnoreList_(true);

                const requestId = this.generateUniqueId();
                this.pendingRequests[requestId] = resolve;
                this.worker.postMessage({
                    requestId: requestId,
                    grid: this.grid,
                    start: start,
                    end: end
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    ignoreEntity(entity) {
        if (entity) {
            this.ignored.push(entity);
        }
    }

    applyIgnoreList_(ignored) {
        this.ignored.forEach(entity => {
            const x = entity.isMoving() ? entity.nextGridX : entity.gridX;
            const y = entity.isMoving() ? entity.nextGridY : entity.gridY;

            if (x >= 0 && y >= 0) {
                this.grid[y][x] = ignored ? 0 : 1;
            }
        });
    }

    clearIgnoreList() {
        this.applyIgnoreList_(false);
        this.ignored = [];
    }
}