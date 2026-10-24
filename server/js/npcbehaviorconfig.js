const Types = require('../../shared/js/gametypes');
const {validateSchedule} = require('./npcschedule');
const inside = (point, area) => !area || (point.x >= area.x && point.y >= area.y && point.x < area.x + area.width && point.y < area.y + area.height);

function validateConfig(config) {
    if (typeof config.enabled !== 'boolean' || !Array.isArray(config.npcs)) throw new Error('Invalid NPC behaviour config');
    const keys = new Set();
    for (const npc of config.npcs) {
        if (!npc.key || keys.has(npc.key) || !Types.isNpc(Types.getKindFromString(npc.kind)) ||
            !npc.area || !['x', 'y', 'width', 'height'].every(key => Number.isInteger(npc.area[key])) ||
            npc.area.width < 1 || npc.area.height < 1 || !inside(npc.origin || {}, npc.area) ||
            !Number.isInteger(npc.origin?.x) || !Number.isInteger(npc.origin?.y) ||
            !Array.isArray(npc.route) || !npc.route.length ||
            npc.route.some(p => !Number.isInteger(p.x) || !Number.isInteger(p.y) || !inside(p, npc.area) ||
                !Number.isFinite(p.waitSeconds) || p.waitSeconds < 1 ||
                (p.line && (typeof p.line !== 'string' || p.line.length > 240 || /[<>]/.test(p.line))) ||
                (p.sound && !['watersplash', 'honk', 'npc'].includes(p.sound))) ||
            !Number.isFinite(npc.stepMs) || npc.stepMs < 300 || npc.stepMs > 2000 ||
            (npc.preserveDialogue !== undefined && typeof npc.preserveDialogue !== 'boolean') ||
            !['patrol', 'work', 'socialise'].includes(npc.preset)) {
            throw new Error('Invalid NPC routine: ' + npc.key);
        }
        validateSchedule(npc);
        keys.add(npc.key);
        for (const rule of npc.reactions || []) {
            if (!rule.when || !Object.keys(rule.when).length ||
                Object.entries(rule.when).some(([key, value]) => !['questCompleted', 'choice', 'memory'].includes(key) ||
                    typeof value !== 'string' || !value || value.length > 100) || !rule.lines) {
                throw new Error('Invalid NPC memory reaction: ' + npc.key);
            }
        }
        for (const lines of [npc.lines || {}, ...(npc.reactions || []).map(rule => rule.lines)].flatMap(lines => Object.values(lines))) {
            if (!Array.isArray(lines) || lines.some(line => typeof line !== 'string' || line.length > 240 || /[<>]/.test(line))) {
                throw new Error('NPC lines must be short plain text: ' + npc.key);
            }
        }
    }
    for (const scene of config.conversations || []) {
        if ((scene.hours && (!Array.isArray(scene.hours) || scene.hours.length !== 2 || scene.hours.some(hour => !Number.isFinite(hour) || hour < 0 || hour >= 24) || scene.hours[0] === scene.hours[1])) || !Number.isFinite(scene.cooldownSeconds) || scene.cooldownSeconds < 20 || !scene.steps?.length ||
            scene.steps.some(step => !keys.has(step.npc) || typeof step.text !== 'string' ||
                step.text.length > 240 || /[<>]/.test(step.text))) throw new Error('Invalid NPC conversation');
    }
    const ambience = config.ambience;
    if (ambience && (!ambience.scene || !Number.isFinite(ambience.cycleSeconds) || ambience.cycleSeconds < 60 ||
        !Number.isFinite(ambience.nightOpacity) || ambience.nightOpacity < 0 || ambience.nightOpacity > 0.45 ||
        !Number.isInteger(ambience.particleCount) || ambience.particleCount < 0 || ambience.particleCount > 24 ||
        (ambience.mode && !['day', 'night', 'cycle'].includes(ambience.mode)) ||
        !['fireflies', 'leaves', 'none'].includes(ambience.particles))) throw new Error('Invalid world ambience');
    if (ambience?.areas && (typeof ambience.areas !== 'object' || Array.isArray(ambience.areas) ||
        Object.entries(ambience.areas).some(([scene, effects]) => !scene || !Array.isArray(effects) ||
            effects.length > 3 || effects.some(effect => !['fireflies', 'leaves', 'pollen', 'dust', 'gusts', 'spray', 'sand', 'embers', 'ash', 'mist'].includes(effect.type) ||
                !Number.isInteger(effect.count) || effect.count < 1 || effect.count > 24) ||
            effects.reduce((total, effect) => total + effect.count, 0) > 24))) throw new Error('Invalid area ambience');
    if (config.speech && (!Number.isFinite(config.speech.cooldownSeconds) || config.speech.cooldownSeconds < 10 ||
        !Number.isFinite(config.speech.radius) || config.speech.radius < 8 ||
        !Number.isFinite(config.speech.greetingCooldownSeconds) || config.speech.greetingCooldownSeconds < 90)) {
        throw new Error('Invalid NPC speech limits');
    }
    return config;
}

module.exports = {validateConfig};
