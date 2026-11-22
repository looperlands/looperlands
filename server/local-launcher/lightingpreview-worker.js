// Reuse the game renderer so beams, color blending and shadow projection match gameplay.
importScripts('./vendor/lighting-renderer.js', './vendor/emissive-glow-worker.js', './lighting-contract.js');
let previewGlowCanvas;
self.onmessage = event => {
    try {
        const {objects, dimensions, x, y, darkness, requestId, motion, view} = event.data;
        const nativeWidth = view?.width || dimensions.tilewidth * 13, nativeHeight = view?.height || dimensions.tileheight * 13;
        const resolution = Math.min(1, 1024 / nativeWidth, 1024 / nativeHeight);
        tilesize = dimensions.tilewidth * resolution;
        const width = Math.max(1, Math.ceil(nativeWidth * resolution)), height = Math.max(1, Math.ceil(nativeHeight * resolution));
        if (!canvases.lighting) {
            canvases.lighting = new OffscreenCanvas(width, height);
            contexes.lighting = canvases.lighting.getContext('2d');
        }
        canvases.lighting.width = width;canvases.lighting.height = height;
        obstacles = transformObstacles(objects.filter(row => row.kind === 'shadow' && !row.rotation).map(MapmakerLighting.obstacle))
            .map(polygon => polygon.map(point => ({x: point.x * resolution, y: point.y * resolution})));
        obstacleRevision++;
        playerPosition = {x: -1000000, y: -1000000};
        const sources = objects.filter(row => row.kind === 'light' && !row.rotation).map(row => {
            MapmakerLighting.glow(row.properties, row.shape === 'ellipse');
            return MapmakerLighting.light(row, dimensions.tilewidth);
        });
        for (const light of sources) {
            if (!Number.isFinite(light.x) || !Number.isFinite(light.y) || (light.radius !== undefined && (!Number.isFinite(light.radius) || light.radius < 1 || light.radius > 64))) throw new Error('Use a light radius from 1 to 64 tiles');
            if (light.global && (!(light.w > 0) || !(light.h > 0) || light.w > dimensions.width * dimensions.tilewidth || light.h > dimensions.height * dimensions.tileheight)) throw new Error('Keep area-light dimensions within the map size');
            if ((light.innerRadius || 0) > (light.radius || 1)) throw new Error('Inner radius must not exceed the light radius');
            light.x *= resolution;light.y *= resolution;
            if (light.global) {light.w *= resolution;light.h *= resolution;}
        }
        const cameraX = view ? view.x * resolution : (x - 6) * tilesize, cameraY = view ? view.y * resolution : (y - 6) * tilesize;
        const scene = {x: 0, y: 0, width: dimensions.width, height: dimensions.height, darkness};
        renderLightOverlay(sources, cameraX, cameraY, 1, 0, scene, [],
            {shadows: true, playerShadow: false, dynamicLights: motion}, '', 0);
        let glowBitmap;
        if (sources.some(light => light.glowIntensity > 0)) {
            previewGlowCanvas ||= new OffscreenCanvas(width, height);
            if (previewGlowCanvas.width !== width) previewGlowCanvas.width = width;
            if (previewGlowCanvas.height !== height) previewGlowCanvas.height = height;
            const ctx = previewGlowCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            drawEmissiveGlow(ctx, sources, cameraX, cameraY, {scene, scale: 1, emissiveGlow: true, dynamicLights: motion, reducedMotion: !motion});
            glowBitmap = previewGlowCanvas.transferToImageBitmap();
        }
        const bitmap = canvases.lighting.transferToImageBitmap();
        self.postMessage({requestId, bitmap, glowBitmap}, glowBitmap ? [bitmap, glowBitmap] : [bitmap]);
    } catch (error) {self.postMessage({requestId: event.data.requestId, error: error.message});}
};
