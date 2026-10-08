const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// One store per game-server process, shared by its worlds. No wallet or session
// identifiers are written to disk. Recognition follows the authenticated avatar.
class NpcMemory {
    constructor(filename) {
        this.filename = filename;
        this.records = {};
        if (!filename) return;
        fs.mkdirSync(path.dirname(filename), {recursive: true, mode: 0o700});
        try {
            const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
            if (saved.version !== 1 || !saved.records || typeof saved.records !== 'object' || Array.isArray(saved.records) ||
                Object.entries(saved.records).some(([key, flags]) => !/^[a-f0-9]{64}$/.test(key) ||
                    !Array.isArray(flags) || flags.some(flag => typeof flag !== 'string'))) {
                throw new Error('Invalid NPC memory file');
            }
            this.records = saved.records;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }

    key(mapId, npcKey, player) {
        if (!player.nftId) return null;
        return crypto.createHash('sha256').update(JSON.stringify([
            mapId, npcKey, String(player.nftId).toLowerCase()
        ])).digest('hex');
    }

    has(mapId, npcKey, player, flag) {
        return (this.records[this.key(mapId, npcKey, player)] || []).includes(flag);
    }

    remember(mapId, npcKey, player, flag) {
        const key = this.key(mapId, npcKey, player);
        if (!key || this.has(mapId, npcKey, player, flag)) return;
        const next = {...this.records, [key]: [...(this.records[key] || []), flag]};
        if (this.filename) {
            const temporary = this.filename + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
            try {
                fs.writeFileSync(temporary, JSON.stringify({version: 1, records: next}), {flag: 'wx', mode: 0o600});
                fs.renameSync(temporary, this.filename);
            } finally {
                if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
            }
        }
        this.records = next;
    }
}

module.exports = {NpcMemory};
