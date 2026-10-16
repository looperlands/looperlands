const fs = require('fs');
const path = require('path');
const Types = require('../../shared/js/gametypes');

const DEFAULTS = Object.freeze({enabled: true, chance: 0.5, minCooldownMs: 3000, maxCooldownMs: 6000, damageMultiplier: 4});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const mobKind = kind => typeof kind === 'string' && Types.isMob(Types.getKindFromString(kind));

function settings(base, overrides, label) {
    if (!object(overrides)) throw new Error(label + ' must be an object');
    for (const [key, value] of Object.entries(overrides)) {
        if (!Object.hasOwn(DEFAULTS, key)) throw new Error(label + ': unknown setting ' + key);
        const valid = key === 'enabled' ? typeof value === 'boolean'
            : Number.isFinite(value) && (key === 'chance' ? value >= 0 && value <= 1
                : key === 'damageMultiplier' ? value > 0 : value >= 1000 && Number.isInteger(value));
        if (!valid) throw new Error(label + ': invalid ' + key);
    }
    const result = {...base, ...overrides};
    if (result.minCooldownMs > result.maxCooldownMs) throw new Error(label + ': minCooldownMs exceeds maxCooldownMs');
    return Object.freeze(result);
}

class CombatConfig {
    constructor(config = {}) {
        if (!object(config) || Object.keys(config).some(key => !['defaults', 'mobs', 'spawns'].includes(key))) {
            throw new Error('Expected defaults, mobs and/or spawns');
        }
        const {defaults = {}, mobs = {}, spawns = []} = config;
        this.defaults = settings(DEFAULTS, defaults, 'defaults');
        if (!object(mobs)) throw new Error('mobs must be an object keyed by mob kind');
        this.mobs = new Map();
        for (const [kind, overrides] of Object.entries(mobs)) {
            if (!mobKind(kind)) throw new Error('Unknown mob kind: ' + kind);
            this.mobs.set(kind, settings(this.defaults, overrides, kind));
        }
        if (!Array.isArray(spawns)) throw new Error('spawns must be an array');
        this.spawns = new Map();
        for (const spawn of spawns) {
            if (!object(spawn)) throw new Error('Invalid spawn');
            const {kind, x, y, ...overrides} = spawn;
            if (!mobKind(kind) || !Number.isInteger(x) || x < 1 || !Number.isInteger(y) || y < 0) throw new Error('Invalid spawn kind or coordinates');
            const key = this.spawnKey(kind, x, y);
            if (this.spawns.has(key)) throw new Error('Duplicate spawn: ' + key);
            this.spawns.set(key, settings(this.mobs.get(kind) || this.defaults, overrides, key));
        }
    }
    spawnKey(kind, x, y) { return kind + ':' + x + ',' + y; }
    forMob(mob) {
        const kind = Types.getKindAsString(mob.kind);
        // Match the original spawn, so walking, lunging and respawning retain the override.
        return this.spawns.get(this.spawnKey(kind, mob.spawningX, mob.spawningY)) || this.mobs.get(kind) || this.defaults;
    }
}

function loadConfig(mapId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(mapId || '')) return new CombatConfig();
    const filename = path.join(__dirname, '../mob-combat', mapId + '.json');
    try { return new CombatConfig(JSON.parse(fs.readFileSync(filename, 'utf8'))); }
    catch (error) {
        if (error.code !== 'ENOENT') console.error('Could not load charged attacks from ' + filename + ': ' + error.message);
        return new CombatConfig();
    }
}
module.exports = {CombatConfig, DEFAULTS, loadConfig};
