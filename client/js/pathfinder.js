class Pathfinder {
    constructor(width, height, workerCount = 2) {
        this.width = width;
        this.height = height;
        this.grid = null;
        this.blankGrid = [];
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
            try {
                const start = [entity.gridX, entity.gridY],
                      end = [x, y];

                this.grid = grid;
                this.applyIgnoreList_(true);

                const requestId = this.generateUniqueId();
                this.pendingRequests[requestId] = resolve;
                const worker = this.getNextWorker();
                worker.postMessage({
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