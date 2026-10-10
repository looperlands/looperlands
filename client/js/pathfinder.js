class Pathfinder {
    constructor(width, height, workerCount = 2) {
        this.width = width;
        this.height = height;
        this.ignored = [];
        this.pendingRequests = {};
        this.workers = [];
        this.currentWorkerIndex = 0;

        // Create a pool of workers
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker('js/pathfinder-webworker.js');
            worker.onmessage = this.handleWorkerMessage.bind(this);
            this.workers.push(worker);
        }
    }

    handleWorkerMessage(e) {
        const { requestId, path } = e.data;
        const resolve = this.pendingRequests[requestId];
        if (resolve) {
            resolve(path);
            delete this.pendingRequests[requestId];
        }
    }

    generateUniqueId() {
        return '_' + Math.random().toString(36).substring(2, 9);
    }

    getNextWorker() {
        const worker = this.workers[this.currentWorkerIndex];
        this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
        return worker;
    }

    findPath(grid, entity, x, y) {
        return new Promise((resolve, reject) => {
            let requestId;
            try {
                const start = [entity.gridX, entity.gridY],
                      end = [x, y];
                const inBounds = ([x, y]) => Number.isInteger(x) && Number.isInteger(y)
                    && y >= 0 && y < grid.length && x >= 0 && x < grid[y].length;
                const ignoredPositions = this.ignored.map(entity => {
                    const moving = entity.isMoving();
                    return moving ? [entity.nextGridX, entity.nextGridY] : [entity.gridX, entity.gridY];
                }).filter(inBounds);
                this.clearIgnoreList();

                if (!inBounds(start) || !inBounds(end)) {
                    resolve([]);
                    return;
                }
                const dx = x - start[0], dy = y - start[1];
                if (dx === 0 && dy === 0) {
                    resolve([start]);
                    return;
                }
                const walkable = position => inBounds(position) && (!grid[position[1]][position[0]]
                    || ignoredPositions.some(([x, y]) => position[0] === x && position[1] === y));
                if (!walkable(end)) {
                    resolve([]);
                    return;
                }
                if (Math.abs(dx) + Math.abs(dy) === 1) {
                    resolve([start, end]);
                    return;
                }
                if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
                    const horizontal = [x, start[1]], vertical = [start[0], y];
                    // A diagonal needs both adjacent tiles clear to avoid cutting corners.
                    if (walkable(horizontal) && walkable(vertical)) {
                        resolve([start, end]);
                        return;
                    }
                    // Route around a blocked corner using cardinal steps.
                    const corners = dy < 0 || dx < 0 ? [vertical, horizontal] : [horizontal, vertical];
                    const corner = corners.find(walkable);
                    if (corner) {
                        resolve([start, corner, end]);
                        return;
                    }
                }

                requestId = this.generateUniqueId();
                this.pendingRequests[requestId] = resolve;
                const worker = this.getNextWorker();
                // postMessage snapshots the grid; ignored cells are cleared only in that worker copy.
                worker.postMessage({requestId, grid, start, end, ignoredPositions});
            } catch (error) {
                delete this.pendingRequests[requestId];
                this.clearIgnoreList();
                reject(error);
            }
        });
    }

    ignoreEntity(entity) {
        if (entity) {
            this.ignored.push(entity);
        }
    }

    clearIgnoreList() {
        this.ignored = [];
    }
}
