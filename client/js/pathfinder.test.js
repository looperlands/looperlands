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
            this.postedGrids = [];
            const self = { postMessage: data => this.onmessage({ data }) };
            vm.runInNewContext(workerSource, { self, console });
            this.complete = () => self.onmessage({ data: this.requests.shift() });
            workers.push(this);
        }

        postMessage(data) {
            // Browser workers receive a structured clone of each request.
            this.postedGrids.push(data.grid);
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
    const liveGrid = [[0, 42, 1, 0], [0, 0, 0, 0]];
    const finalGrid = liveGrid.slice(); // The game shares rows with its final pathing grid.
    const player = entity(7, 0, 0);
    pathfinder.ignoreEntity(player);
    pathfinder.ignoreEntity(entity(42, 1, 0));

    const pending = pathfinder.findPath(finalGrid, player, 3, 0);
    const snapshot = workers[0].requests[0];

    expect(workers[0].postedGrids[0]).toBe(finalGrid);
    expect(snapshot.grid).toEqual(liveGrid);
    expect(snapshot.ignoredPositions).toEqual([[0, 0], [1, 0]]);
    await workers[0].complete();
    expect(snapshot.grid).toEqual([[0, 0, 1, 0], [0, 0, 0, 0]]);
    expect((await pending).at(-1)).toEqual([3, 0]);
    pathfinder.clearIgnoreList();
    expect(liveGrid).toEqual([[0, 42, 1, 0], [0, 0, 0, 0]]);
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
    expect(await pickup).toEqual([[1, 0], [2, 0]]);
    expect(workers[1].requests).toHaveLength(0);
});

test('overlapping requests keep separate ignore lists and may finish out of order', async () => {
    const { pathfinder, workers } = createPathfinder();
    const grid = [[0, 11, 22, 0], [0, 0, 0, 0]];
    const player = entity(7, 0, 0);

    pathfinder.ignoreEntity(entity(11, 1, 0));
    const first = pathfinder.findPath(grid, player, 3, 0);
    pathfinder.ignoreEntity(entity(22, 2, 0));
    const second = pathfinder.findPath(grid, player, 3, 0);
    const firstSnapshot = workers[0].requests[0], secondSnapshot = workers[1].requests[0];

    expect(firstSnapshot.ignoredPositions).toEqual([[1, 0]]);
    expect(secondSnapshot.ignoredPositions).toEqual([[2, 0]]);
    await workers[1].complete();
    expect(secondSnapshot.grid[0]).toEqual([0, 11, 0, 0]);
    expect((await second).at(-1)).toEqual([3, 0]);
    pathfinder.clearIgnoreList();
    await workers[0].complete();
    expect(firstSnapshot.grid[0]).toEqual([0, 0, 22, 0]);
    expect((await first).at(-1)).toEqual([3, 0]);
    pathfinder.clearIgnoreList();
    expect(grid[0]).toEqual([0, 11, 22, 0]);
});

test('moving ignored entities use their next tile without clearing their current tile', async () => {
    const { pathfinder, workers } = createPathfinder();
    const grid = [[0, 33, 33, 1], [0, 0, 0, 0]];
    const player = entity(7, 0, 1);
    const moving = entity(33, 1, 0, 2, 0);
    pathfinder.ignoreEntity(moving);
    const pending = pathfinder.findPath(grid, player, 2, 0);
    const snapshot = workers[0].requests[0];

    expect(snapshot.ignoredPositions).toEqual([[2, 0]]);
    moving.nextGridX = 3; // Movement after posting cannot change the worker's ignore positions.
    await workers[0].complete();
    expect(snapshot.grid[0]).toEqual([0, 33, 0, 1]);
    expect((await pending).at(-1)).toEqual([2, 0]);
    pathfinder.clearIgnoreList();
    expect(grid[0]).toEqual([0, 33, 33, 1]);
});

test.each([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])('resolves a clear nearby move (%i,%i) without copying rows or posting to a worker', async (dx, dy) => {
    const {pathfinder, workers} = createPathfinder();
    const grid = Array.from({length: 3}, () => Array(3).fill(0));
    const copies = grid.map(row => jest.spyOn(row, 'slice'));
    const path = await pathfinder.findPath(grid, entity(7, 1, 1), 1 + dx, 1 + dy);

    expect(path[0]).toEqual([1, 1]);
    expect(path.at(-1)).toEqual([1 + dx, 1 + dy]);
    expect(path).toHaveLength(2);
    expect(workers.every(worker => worker.requests.length === 0)).toBe(true);
    copies.forEach(copy => expect(copy).not.toHaveBeenCalled());
});

test('resolves the current position and blocked destinations without worker requests', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[7, 99, 0], [0, 0, 88]];
    const player = entity(7, 0, 0);
    expect(await pathfinder.findPath(grid, player, 0, 0)).toEqual([[0, 0]]);
    expect(await pathfinder.findPath(grid, player, 1, 0)).toEqual([]);
    expect(await pathfinder.findPath(grid, player, 2, 1)).toEqual([]);
    expect(workers.every(worker => worker.requests.length === 0)).toBe(true);
});

test.each([[-1, 0], [4, 0], [0, 2], [0, -1], [0.5, 0]])('rejects an invalid destination (%s,%s) without a worker request', async (x, y) => {
    const {pathfinder, workers} = createPathfinder();
    expect(await pathfinder.findPath([[0, 0, 0, 0], [0, 0, 0, 0]], entity(7, 0, 0), x, y)).toEqual([]);
    expect(workers.every(worker => worker.requests.length === 0)).toBe(true);
});

test('consumes ignored entities on a short path without clearing the live collision', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[0, 11, 0], [0, 0, 0]];
    const player = entity(7, 0, 0);
    pathfinder.ignoreEntity(entity(11, 1, 0));
    expect(await pathfinder.findPath(grid, player, 1, 0)).toEqual([[0, 0], [1, 0]]);
    expect(grid[0][1]).toBe(11);
    expect(await pathfinder.findPath(grid, player, 1, 0)).toEqual([]);
    expect(workers.every(worker => worker.requests.length === 0)).toBe(true);
});

test('ignores a moving entity at its next tile, including on a short path', async () => {
    const {pathfinder} = createPathfinder();
    const grid = [[33, 0, 33], [0, 0, 0]];
    const player = entity(7, 1, 0), moving = entity(33, 0, 0, 2, 0);
    pathfinder.ignoreEntity(moving);
    expect(await pathfinder.findPath(grid, player, 2, 0)).toEqual([[1, 0], [2, 0]]);
    pathfinder.ignoreEntity(moving);
    expect(await pathfinder.findPath(grid, player, 0, 0)).toEqual([]);
    expect(grid[0]).toEqual([33, 0, 33]);
});

test('keeps longer diagonal detours in the worker when both direct corners are blocked', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[0, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]];
    const pending = pathfinder.findPath(grid, entity(7, 1, 1), 2, 2);
    expect(workers[0].requests).toHaveLength(1);
    await workers[0].complete();
    const path = await pending;
    expect(path.length).toBeGreaterThan(3);
    expect(path.at(-1)).toEqual([2, 2]);
    for (let i = 1; i < path.length; i++) {
        expect(grid[path[i][1]][path[i][0]]).toBe(0);
        expect(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1])).toBe(1);
    }
});

test('long paths use the synchronous worker snapshot even if the live grid changes before completion', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0]];
    const pending = pathfinder.findPath(grid, entity(7, 0, 0), 3, 0);
    expect(workers[0].postedGrids[0]).toBe(grid);
    grid[0][1] = 99;
    await workers[0].complete();
    expect(await pending).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(grid[0][1]).toBe(99);
});

test('a failed worker post releases its pending resolver and a later request still works', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0]];
    const posting = jest.spyOn(workers[0], 'postMessage').mockImplementationOnce(() => { throw new Error('post failed'); });
    await expect(pathfinder.findPath(grid, entity(7, 0, 0), 3, 0)).rejects.toThrow('post failed');
    expect(Object.keys(pathfinder.pendingRequests)).toHaveLength(0);
    posting.mockRestore();
    const next = pathfinder.findPath(grid, entity(7, 0, 0), 3, 0);
    await workers[1].complete();
    expect((await next).at(-1)).toEqual([3, 0]);
});

test('nearby paths match diagonal A* distance for all 512 collision layouts of a 3x3 grid', async () => {
    const {pathfinder, workers} = createPathfinder();
    const AStar = vm.runInNewContext(`${workerSource}\nAStar;`, {self: {}, console});
    for (let mask = 0; mask < 512; mask++) {
        const grid = Array.from({length: 3}, (_, y) => Array.from({length: 3}, (_, x) => (mask >> (y * 3 + x)) & 1));
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const expected = AStar(grid, [1, 1], [x, y], 'Euclidean');
                const pending = pathfinder.findPath(grid, entity(7, 1, 1), x, y);
                for (const worker of workers) if (worker.requests.length) await worker.complete();
                const actual = await pending;
                const distance = path => path.slice(1).reduce((sum, point, i) =>
                    sum + Math.hypot(point[0] - path[i][0], point[1] - path[i][1]), 0);
                expect(actual.length === 0).toBe(expected.length === 0);
                expect(distance(actual)).toBeCloseTo(distance(expected));
                if (actual.length) expect(actual.at(-1)).toEqual([x, y]);
            }
        }
    }
});


test('worker paths use straight diagonal steps across an open field', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = Array.from({length: 6}, () => Array(6).fill(0));
    const pending = pathfinder.findPath(grid, entity(7, 0, 0), 5, 5);
    await workers[0].complete();
    expect(await pending).toEqual(Array.from({length: 6}, (_, i) => [i, i]));
});

test.each([[[[0, 1], [0, 0]]], [[[0, 0], [1, 0]]]])('a short diagonal routes around a blocked side tile', async grid => {
    const {pathfinder} = createPathfinder();
    const path = await pathfinder.findPath(grid, entity(7, 0, 0), 1, 1);
    expect(path).toHaveLength(3);
    expect(path[1]).toEqual(grid[0][1] ? [0, 1] : [1, 0]);
});

test('worker diagonal steps never cut corners beside walls', async () => {
    const {pathfinder, workers} = createPathfinder();
    const grid = [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]];
    const pending = pathfinder.findPath(grid, entity(7, 0, 0), 3, 3);
    await workers[0].complete();
    const path = await pending;
    expect(path.at(-1)).toEqual([3, 3]);
    for (let i = 1; i < path.length; i++) {
        const [x, y] = path[i], [previousX, previousY] = path[i - 1];
        if (x !== previousX && y !== previousY) {
            expect(grid[previousY][x]).toBe(0);
            expect(grid[y][previousX]).toBe(0);
        }
    }
});
