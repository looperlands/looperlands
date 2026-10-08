const picnic = require('../npc-behaviors/lantern-picnic');
const {Cutscene} = require('../js/cutscene');
const picnicScene = require('../npc-behaviors/lantern-picnic-cutscene');
function register(target) {
    target.register('main', {id: 'lantern-picnic', quests: picnic.quests, dialogues: picnic.dialogues, npcBehavior: picnic.behavior,
        createScene(world) {
            if (!world.npcBehavior) return null;
            const scene = new Cutscene(world, picnicScene);
            scene.packet = player => {
                const data = world.server.cache.get(player.sessionId)?.gameData;
                const scenery = scene.state && {...scene.state, music: (data?.choices || []).includes('lantern:music-picnic')};
                const music = scenery?.phase === 'celebrating' && scenery.music;
                return {story: {title: 'The Lantern Picnic', goal: picnic.progress(data), event: scene.state?.message || ''}, picnic: scenery,
                    rendererExtensions: [{id: 'picnic', script: 'picnic-renderer-worker.js', data: scenery}],
                    musicAreas: music ? [{x: scenery.center.x - 8, y: scenery.center.y - 6, width: 16, height: 12, track: 'fluteguitar'}] : []};
            };
            return scene;
        }
    });
}
module.exports = {register};
