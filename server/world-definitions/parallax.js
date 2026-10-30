// Reusable content adapter: scene geometry stays owned by the map/Mapmaker.
function createParallaxScene(world) {
    return {
        packet() {
            const scenes = (world.map?.scenes || []).flatMap((scene, index, all) => {
                const definition = scene.parallax;
                return definition ? [{id: scene.id, x: scene.x, y: scene.y, w: scene.w, h: scene.h,
                    layers: definition.layers,
                    exclude: all.slice(0, index).filter(previous => previous.x < scene.x + scene.w && previous.x + previous.w > scene.x && previous.y < scene.y + scene.h && previous.y + previous.h > scene.y)
                        .map(({x, y, w, h}) => ({x: x * 16, y: y * 16, w: w * 16, h: h * 16})), ...(definition.placements ? {placements: definition.placements} : {}),
                    ...(definition.cutoutColors ? {cutoutColors: definition.cutoutColors} : {}),
                    ...(definition.backgroundColor ? {backgroundColor: definition.backgroundColor} : {})}] : [];
            });
            return {rendererExtensions: ['background', 'ground', 'entities', 'foreground'].map(plane => ({
                id: 'parallax-' + plane, script: 'parallax-renderer-worker.js', data: {scenes}
            }))};
        }
    };
}
module.exports = {createParallaxScene};
