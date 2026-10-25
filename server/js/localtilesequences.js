const crypto = require('crypto');
const Builder = require('./localtilebuilder');
const Templates = require('../../shared/js/interactiontemplates');
const Types = require('../../shared/js/gametypes');
const quests = require('./quests/quests');

// Local interactions share the inventory transaction and revision checks used by legacy sequences.
class LocalTileSequences {
    constructor(cache, platform, options = {}) {
        this.cache = cache;
        this.platform = platform;
        this.dao = options.dao || require('./dao');
        this.now = options.now || Date.now;
        this.random = options.random || Math.random;
        this.root = options.root || require('path').resolve(__dirname, '../..');
        this.pending = new WeakMap();
        this.ticking = new WeakSet();
        this.nextTick = new WeakMap();
        this.definitions = {};
        for (const id of Builder.maps(this.root)) {
            this.definitions[id] = Object.fromEntries(Object.entries(Builder.definitions(this.root, id)).filter(([, a]) => a.type === 'sequence'));
        }
        this.stageDefinitions = this.definitions;
    }

    resolve(map, tile, nftId) {
        if (!Number.isInteger(tile?.gridX) || !Number.isInteger(tile?.gridY)) return null;
        const name = Builder.actionAt(this.root, map, tile.gridX, tile.gridY);
        const definition = this.definitions[map]?.[name];
        if (!definition) return null;
        const action = Builder.withAppearance(definition, map);
        const signature = Builder.hash(action.interaction ? Templates.runtimeDefinition(action) : action);
        return {map, name, action, x: tile.gridX, y: tile.gridY, signature,
            owner: action.scope === 'player' ? nftId : undefined};
    }

    handles(map, tile) {return !!this.resolve(map, tile);}
    player(world, nftId) {return Object.values(world.players || {}).find(p => p.nftId === nftId);}
    stage(r, state) {return r.action.stages.find(s => s.id === (state.stage === undefined ? r.action.start : state.stage));}
    key(r) {return JSON.stringify([r.x, r.y, r.signature, r.owner]);}

    observe(world, r, state) {
        if (!this.pending.has(world)) this.pending.set(world, new Map());
        const pending = this.pending.get(world);
        if (r.action.interaction && r.action.repeat === 'cooldown' && state.stage === null && state.readyAt) pending.set(this.key(r), {r, state});
        else pending.delete(this.key(r));
    }

    async state(r, world) {
        let state = await this.platform.getTileSequenceState(r.map, r.x, r.y, r.signature, r.owner);
        if (r.action.interaction && r.action.repeat === 'cooldown' && state.stage === null && state.readyAt && state.readyAt <= this.now()) {
            try {
                state = await this.platform.resetTileSequence({mapId: r.map, ...r, expectedRevision: state.revision,
                    now: this.now(), stage: r.action.start, tile: r.action.initialTile || 0});
                this.publish(world, r, state);
            } catch (error) {
                if (error.code !== 'tile_changed') throw error;
                state = await this.platform.getTileSequenceState(r.map, r.x, r.y, r.signature, r.owner);
            }
        }
        this.observe(world, r, state);
        return state;
    }

    async findCurrentStage(nftId, map, tile, world) {
        const r = this.resolve(map, tile, nftId);
        if (!r) return null;
        const state = await this.state(r, world), s = this.stage(r, state), player = this.player(world, nftId);
        if (r.owner) this.publish(world, r, state);
        const remaining = Math.max(0, (state.readyAt || 0) - this.now());
        if (remaining) return {key: s?.id || 'cooldown', name: 'Ready in ' + Math.ceil(remaining / 1000) + ' seconds', waiting: true,
            message: 'This interaction is ready again in ' + Math.ceil(remaining / 1000) + ' seconds.', revision: state.revision};
        if (!s) return {key: 'done', name: r.action.completedName || 'Completed', waiting: true,
            message: 'This interaction is complete.', revision: state.revision};
        const session = this.cache.get(player?.sessionId), hasTool = !s.tool || (session?.gameData?.items?.[s.tool] || 0) > 0;
        return {key: s.id, name: s.name, duration: s.duration, playAnimation: s.duration > 0,
            requirements: {level: s.level, ...(s.tool ? {tool: Types.getKindAsString(Number(s.tool)).toUpperCase()} : {})}, hasTool, revision: state.revision};
    }

    async executeStage(nftId, map, tile, item, world, expectedStage, expectedRevision) {
        const fail = message => ({success: false, message}), r = this.resolve(map, tile, nftId);
        if (!r) return fail('No interaction is placed here.');
        const state = await this.state(r, world), s = this.stage(r, state), player = this.player(world, nftId), session = this.cache.get(player?.sessionId);
        if (!player?.hasEnteredGame || !session || session.mapId !== map || Math.max(Math.abs(player.x - r.x), Math.abs(player.y - r.y)) > 1) return fail('Move next to this tile.');
        if (!s || expectedStage !== s.id || expectedRevision !== state.revision) return fail('This interaction changed. Try again.');
        if ((state.readyAt || 0) > this.now()) return fail('This interaction is not ready yet.');
        if (player.getLevel() < s.level) return fail('You need level ' + s.level + '.');
        if (s.quest && !quests.hasCompletedQuest(s.quest, session)) return fail('Complete quest ' + s.quest + ' first.');
        const requiredItems = Templates.requiredItems(s);
        if (requiredItems.some(row => (session.gameData?.items?.[row.item] || 0) < row.quantity)) return fail('You do not have the required tool or items.');
        const success = this.random() < s.successChance;
        let stage = success ? s.next : (s.failureNext || s.id);
        const completed = success && !stage;
        if (completed && r.action.repeat === 'immediate') stage = r.action.start;
        const next = r.action.stages.find(n => n.id === stage);
        const cooldown = completed && r.action.repeat === 'cooldown' ? r.action.cooldownSeconds : (next?.waitSeconds || 0);
        const items = [...s.costs.map(c => ({item: String(c.item), amount: -c.amount})), ...(success ? s.rewards.map(c => ({item: String(c.item), amount: c.amount})) : [])];
        const requestId = crypto.createHash('sha256').update(JSON.stringify([nftId, map, r.x, r.y, r.signature, r.owner, state.revision])).digest('hex');
        const effects = {...state.effects};
        if (success && s.trigger) {
            const active = Object.hasOwn(effects, s.trigger) ? effects[s.trigger] : world.checkTriggerActive(s.trigger);
            Object.defineProperty(effects, s.trigger, {value: s.triggerMode === 'toggle' ? !active : s.triggerMode !== 'deactivate', enumerable: true, writable: true});
        }
        let receipt;
        try {
            receipt = await this.dao.commitTileSequence({requestId, nftId, owner: r.owner, mapId: map, x: r.x, y: r.y, signature: r.signature,
                expectedRevision: state.revision, stage: stage || null, readyAt: cooldown ? this.now() + cooldown * 1000 : 0,
                tile: success ? s.tile : (state.tile ?? r.action.initialTile ?? 0), items, xp: success ? s.xp : 0, requiredItems, success, effects});
        } catch (error) {return fail(error.code === 'tile_changed' ? 'This tile changed. Try again.' : 'The action could not commit. Check your items and retry.');}
        for (const key of this.cache.keys()) {
            const data = this.cache.get(key);
            if (data?.nftId === nftId) {data.gameData.items = {...data.gameData.items, ...receipt.quantities}; this.cache.set(key, data);}
        }
        if (receipt.replayed) return {success: true, message: 'This action already completed. Refresh the tile.'};
        this.observe(world, r, receipt.state);
        // A presentation failure must never turn a committed inventory receipt into a failed action.
        try {await player.applyPersistedExperience?.(receipt.xp); this.publish(world, r, receipt.state); this.applyEffects(world, receipt.state);}
        catch (error) {console.error('Committed interaction publication failed:', error.message);}
        const message = success ? (s.message || s.name + ' complete.') : (s.failureMessage || 'The attempt failed. Try again.');
        world.sendNotifications(player, message, false);
        return {success: true, message, activity: {action: r.name, stage: s.id, target: r.name,
            quantity: r.action.interaction ? s.rewards.reduce((sum, row) => sum + row.amount, 0) : 1, x: r.x, y: r.y, failed: !success}};
    }

    applyEffects(world, state) {
        for (const [trigger, active] of Object.entries(state.effects || {})) {
            if (!!world.checkTriggerActive(trigger) !== active) world[active ? 'activateTrigger' : 'deactivateTrigger'](trigger);
        }
    }

    publish(world, r, state) {
        const tile = state.tile ?? r.action.initialTile ?? 0;
        if (r.action.scope === 'player') {
            const player = this.player(world, r.owner);
            if (player) {
                const Messages = require('./message');
                world.pushToPlayer(player, new Messages.TileStage({x: r.x, y: r.y, ...(tile ? {tile, stage: 0} : {clear: true})}));
            }
        } else if (tile) world.placeStagedTile(r.x, r.y, tile, 0);
        else world.clearStagedTile(r.x, r.y);
    }

    async hydrate(map, world, nftId) {
        for (const p of Builder.document(this.root, map).placements) {
            const action = this.definitions[map]?.[p.action];
            if (!action || (action.scope === 'player') !== !!nftId) continue;
            for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++) {
                const r = this.resolve(map, {gridX: x, gridY: y}, nftId), state = await this.state(r, world);
                this.publish(world, r, state);
                if (!nftId) this.applyEffects(world, state);
            }
        }
    }

    loadPersistedPlots(map, world) {return this.hydrate(map, world);}
    loadPlayerStates(map, world, nftId) {return this.hydrate(map, world, nftId);}

    async tick(world) {
        if (this.ticking.has(world) || (this.nextTick.get(world) || 0) > this.now()) return;
        this.nextTick.set(world, this.now() + 1000);
        this.ticking.add(world);
        try {
            for (const {r, state} of this.pending.get(world)?.values() || []) {
                if (state.readyAt <= this.now()) await this.state(r, world);
            }
        } finally {this.ticking.delete(world);}
    }
}

module.exports = LocalTileSequences;
