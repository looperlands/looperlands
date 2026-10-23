define(function () {
    const sharedTilesets = {oa: 'oa', oadungeon: 'oa', oaoverworld: 'oa'};
    const validMap = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);

    class MapAssets {
        constructor(renderer, options = {}) {
            this.renderer = renderer;
            this.document = options.document || document;
            this.navigator = options.navigator || navigator;
            this.fetch = options.fetch || window.fetch.bind(window);
            this.maps = new Set();
            this.assets = new Set();
            this.queue = [];
            this.active = 0;
        }

        static tilesetId(mapId) {
            return sharedTilesets[mapId] || mapId;
        }

        static paths(mapId, renderer) {
            if (!validMap(mapId)) return [];
            const mobile = renderer.mobile || renderer.tablet;
            const scales = renderer.upscaledRendering ? [1] : mobile ? [2] : [2, 3];
            return ['maps/world_client_' + mapId + (mobile ? '.json' : '.js'),
                ...scales.map(scale => 'img/' + scale + '/tilesheet_' + MapAssets.tilesetId(mapId) + '.png')];
        }

        near(map, x, y) {
            const connection = this.navigator.connection;
            if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
            // Warm only nearby destinations, with a three-map budget per visit.
            // No sessions, gate checks or gameplay requests are made speculatively.
            const doors = Object.entries(map.doors).map(([tile, destination]) => {
                const index = Number(tile) - 1;
                return {destination, distance: Math.abs(index % map.width - x) + Math.abs(Math.floor(index / map.width) - y)};
            }).filter(door => door.distance <= 8).sort((a, b) => a.distance - b.distance);
            for (const {destination} of doors) {
                const mapId = destination.map;
                if (this.maps.size >= 3) break;
                if (!validMap(mapId) || mapId === map.mapId) continue;
                const paths = MapAssets.paths(mapId, this.renderer);
                const key = new URL(paths[0], this.document.baseURI).href;
                if (this.maps.has(key)) continue;
                this.maps.add(key);
                for (const path of paths) {
                    const url = new URL(path, this.document.baseURI).href;
                    if (this.assets.has(url)) continue;
                    this.assets.add(url);
                    this.queue.push(url);
                }
            }
            this.drain();
        }

        drain() {
            while (this.active < 2 && this.queue.length) {
                const url = this.queue.shift();
                this.active++;
                // Fill the normal HTTP cache so the next document and its workers
                // reuse the same revision-scoped URLs. Never delay actual travel.
                Promise.resolve().then(() => this.fetch(url, {cache: 'force-cache', credentials: 'same-origin', priority: 'low',
                    ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? {signal: AbortSignal.timeout(15000)} : {})}))
                    .then(response => response.ok ? response.arrayBuffer() : undefined)
                    .catch(() => {}) // A failed prefetch falls back to normal map loading.
                    .finally(() => {this.active--; this.drain();});
            }
        }
    }

    return MapAssets;
});
