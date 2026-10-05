const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pathfinderSource = fs.readFileSync(path.join(__dirname, 'pathfinder.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(__dirname, 'pathfinder-webworker.js'), 'utf8');

function createPathfinder() {
    const workers = [];
    class Worker {
        constructor() {
            this.requests = [];
            const self = { postMessage: data => this.onmessage({ data }) };
            vm.runInNewContext(workerSource, { self, console });
            this.complete = () => self.onmessage({ data: this.requests.shift() });
            workers.push(this);
        }

        postMessage(data) {
            // Browser workers receive a structured clone of each request.
            this.requests.push(JSON.parse(JSON.stringify(data)));
        }
    }

    const Pathfinder = vm.runInNewContext(`${pathfinderSource}\nPathfinder;`, { Worker });
    return { pathfinder: new Pathfinder(4, 2), workers };
}

function entity(id, x, y, nextX, nextY) {
    return {
        id,
        gridX: x,
        gridY: y,
        nextGridX: nextX,
        nextGridY: nextY,
        isMoving: () => nextX !== undefined,
    };
}

test('ignores entities in the worker snapshot without changing live grid rows', async () => {
    const { pathfinder, workers } = createPathfinder();
    const liveGrid = [[0, 42, 1, 99], [0, 0, 0, 0]];
    const finalGrid = liveGrid.slice(); // The game shares rows with its final pathing grid.
    const player = entity(7, 0, 0);
    pathfinder.ignoreEntity(player);
    pathfinder.ignoreEntity(entity(42, 1, 0));

    const pending = pathfinder.findPath(finalGrid, player, 1, 0);

    expect(workers[0].requests[0].grid).toEqual([[0, 0, 1, 99], [0, 0, 0, 0]]);
    expect(liveGrid).toEqual([[0, 42, 1, 99], [0, 0, 0, 0]]);
    await workers[0].complete();
    expect(await pending).toEqual([[0, 0], [1, 0]]);
    pathfinder.clearIgnoreList();
    expect(liveGrid).toEqual([[0, 42, 1, 99], [0, 0, 0, 0]]);
});

test('a chest drop stays reachable when the chest opens during a pending request', async () => {
    const { pathfinder, workers } = createPathfinder();
    const grid = [[0, 0, 42, 0], [0, 0, 0, 0]];
    const player = entity(7, 0, 0);
    pathfinder.ignoreEntity(player);
    pathfinder.ignoreEntity(entity(42, 2, 0));
    const opening = pathfinder.findPath(grid, player, 2, 0);

    // The chest despawns, its drop clears the tile, and the player moves.
    grid[0][2] = 0;
    player.gridX = 1;
    await workers[0].complete();
    await opening;
    pathfinder.clearIgnoreList();

    expect(grid[0]).toEqual([0, 0, 0, 0]);
    pathfinder.ignoreEntity(player);
    const pickup = pathfinder.findPath(grid, player, 2, 0);
    await workers[1].complete();
    expect(await pickup).toEqual([[1, 0], [2, 0]]);
});

test('overlapping requests keep separate ignore lists and may finish out of order', async () => {
    const { pathfinder, workers } = createPathfinder();
    const grid = [[0, 11, 22, 0], [0, 0, 0, 0]];
    const player = entity(7, 0, 0);

    pathfinder.ignoreEntity(entity(11, 1, 0));
    const first = pathfinder.findPath(grid, player, 1, 0);
    pathfinder.ignoreEntity(entity(22, 2, 0));
    const second = pathfinder.findPath(grid, player, 2, 0);

    expect(workers[0].requests[0].grid[0]).toEqual([0, 0, 22, 0]);
    expect(workers[1].requests[0].grid[0]).toEqual([0, 11, 0, 0]);
    await workers[1].complete();
    expect((await second).at(-1)).toEqual([2, 0]);
    pathfinder.clearIgnoreList();
    await workers[0].complete();
    expect((await first).at(-1)).toEqual([1, 0]);
    pathfinder.clearIgnoreList();
    expect(grid[0]).toEqual([0, 11, 22, 0]);
});

test('moving ignored entities use their next tile without clearing their current tile', async () => {
    const { pathfinder, workers } = createPathfinder();
    const grid = [[0, 33, 33, 1], [0, 0, 0, 0]];
    const player = entity(7, 0, 1);
    pathfinder.ignoreEntity(entity(33, 1, 0, 2, 0));
    const pending = pathfinder.findPath(grid, player, 2, 0);

    expect(workers[0].requests[0].grid[0]).toEqual([0, 33, 0, 1]);
    await workers[0].complete();
    expect((await pending).at(-1)).toEqual([2, 0]);
    pathfinder.clearIgnoreList();
    expect(grid[0]).toEqual([0, 33, 33, 1]);
});
