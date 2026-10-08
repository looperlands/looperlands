const dao = require('./dao');
const Messages = require('./message');
// Personal objective mechanics consume a registered definition and progress
// adapter. All story names, characters, locations and hooks belong to the caller.
class StoryObjectives {
    constructor(world, definition, progress) {
        this.world = world; this.definition = definition; this.progress = progress;
        this.pending = new Map(); this.snapshots = new Map(); this.discoveries = new Map();
    }
    data(player) { return this.world.server.cache.get(player.sessionId)?.gameData || {}; }

    async record(player, flag) {
        const session = this.world.server.cache.get(player.sessionId);
        if (!session || this.progress.has(session.gameData, flag)) return;
        const response = await dao.registerChoice(session.nftId, flag);
        if (response === undefined) throw new Error('Could not save this discovery. Please try again.');
        const latest = this.world.server.cache.get(player.sessionId);
        if (!latest || latest.nftId !== session.nftId) return;
        latest.gameData.choices = [...new Set([...(latest.gameData.choices || []), flag])];
        this.world.server.cache.set(player.sessionId, latest);
    }

    async inspect(player, id) {
        const previous = this.pending.get(player.nftId) || Promise.resolve();
        const operation = previous.catch(() => {}).then(async () => {
            if (!player.hasEnteredGame || player.isDead || this.world.players[player.id] !== player) throw new Error('Enter the world before inspecting a story location.');
            const q = this.definition.quests.find(q => q.objectives.some(o => q.id + ':' + o.key === id));
            const objective = q?.objectives.find(o => q.id + ':' + o.key === id);
            const data = this.data(player);
            if (!q || !objective || !['inspect', 'collect', 'deliver'].includes(objective.type) || !this.progress.active(data, q.id) || !this.progress.applicable(data, objective) ||
                Math.abs(player.x - objective.x) + Math.abs(player.y - objective.y) > 3) throw new Error('This objective is not available here.');
            if (!this.progress.objectiveDone(data, q, objective) && !this.progress.hasItems(data, objective)) throw new Error('Bring the requested items in your story satchel first.');
            await this.record(player, this.definition.objectiveFlag(q, objective));
            this.discoveries.set(player.id, {text: objective.result, until: Date.now() + 120000});
            this.snapshots.delete(player.id);
            return {text: objective.result, quest: q.id, objective: objective.key, type: objective.type};
        });
        this.pending.set(player.nftId, operation);
        try { return await operation; }
        finally { if (this.pending.get(player.nftId) === operation) this.pending.delete(player.nftId); }
    }


    connected(player) {
        return player.hasEnteredGame && !player.isDead && this.world.players[player.id] === player;
    }

    // Serialize all mechanics with inspections so concurrent combat, arrivals
    // and dialogue never overwrite one another's durable objective facts.
    enqueue(player, operation) {
        const previous = this.pending.get(player.nftId) || Promise.resolve();
        const next = previous.catch(() => {}).then(operation);
        this.pending.set(player.nftId, next);
        return next.finally(() => {if (this.pending.get(player.nftId) === next) this.pending.delete(player.nftId);});
    }

    async mark(player, q, objective, count) {
        await this.record(player, this.definition.objectiveFlag(q, objective, count));
        this.discoveries.set(player.id, {text: objective.result, until: Date.now() + 120000});
        this.snapshots.delete(player.id);
    }

    talk(player, npc) {
        return this.enqueue(player, async () => {
            if (!this.connected(player) || this.world.npcs[npc.id] !== npc ||
                Math.abs(player.x - npc.x) + Math.abs(player.y - npc.y) > 5) return null;
            const data = this.data(player);
            for (const q of this.definition.quests.filter(q => this.progress.active(data, q.id))) {
                const o = this.progress.progress(data, q).find(o => !o.done && o.type === 'talk' && o.npcKey === npc.behaviorState?.key);
                if (!o || !this.progress.hasItems(data, o)) continue;
                await this.mark(player, q, o);
                return {presentation: 'world', speaker: npc.behaviorState.label, playerLine: o.playerLine,
                    text: o.result.replace(/^[^:]+: /, ''), satchel: this.progress.bag(this.data(player)).map(item => item.name)};
            }
            return null;
        });
    }

    kill(player, mob) {
        // Called only by the existing combat broker for actual damage contributors.
        return this.enqueue(player, async () => {
            if (!this.connected(player)) return;
            const data = this.data(player);
            for (const q of this.definition.quests.filter(q => this.progress.active(data, q.id))) {
                for (const o of this.progress.progress(data, q).filter(o => !o.done && o.type === 'kill' && o.mob === mob.kind &&
                    mob.x >= o.area.x && mob.y >= o.area.y && mob.x < o.area.x + o.area.width && mob.y < o.area.y + o.area.height)) {
                    await this.mark(player, q, o, this.progress.objectiveCount(this.data(player), q, o) + 1);
                }
            }
        });
    }

    tick() {
        if (Date.now() < (this.nextVisit || 0)) return;
        this.nextVisit = Date.now() + 300;
        for (const player of Object.values(this.world.players)) {
            if (!this.connected(player) || this.pending.has(player.nftId)) continue;
            const data = this.data(player);
            const q = this.definition.quests.find(q => this.progress.active(data, q.id) && this.progress.progress(data, q).some(o =>
                !o.done && o.type === 'visit' && Math.abs(player.x - o.x) + Math.abs(player.y - o.y) <= 1));
            if (!q) continue;
            this.enqueue(player, async () => {
                if (!this.connected(player)) return;
                const fresh = this.data(player);
                const o = this.progress.progress(fresh, q).find(o => !o.done && o.type === 'visit' &&
                    Math.abs(player.x - o.x) + Math.abs(player.y - o.y) <= 1);
                if (this.progress.active(fresh, q.id) && o) await this.mark(player, q, o);
            }).catch(error => this.world.pushToPlayer(player, new Messages.Chat(player, error.message, true)));
        }
    }

    travel(player, id) {
        const passage = this.definition.passages.find(p => p.id === id);
        if (!player.hasEnteredGame || player.isDead || this.world.players[player.id] !== player || !passage ||
            !this.progress.done(this.data(player), passage.requires) ||
            Math.abs(player.x - passage.x) + Math.abs(player.y - passage.y) > 3 ||
            !this.world.isValidPosition(passage.tx, passage.ty)) throw new Error('This passage is not available here.');
        player.setPosition(passage.tx, passage.ty);
        player.clearTarget();
        player.broadcast(new Messages.Teleport(player));
        this.world.pushToPlayer(player, new Messages.Teleport(player));
        this.world.handlePlayerVanish(player);
        this.world.pushRelevantEntityListTo(player);
        return {text: 'You follow the passage. ' + passage.label + '.'};
    }

    forget(player) { this.snapshots.delete(player.id); this.discoveries.delete(player.id); }

}
module.exports = {StoryObjectives};
