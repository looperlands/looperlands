const Config = require('../../shared/js/placedfxconfig');
const Types = require('../../shared/js/gametypes');

// The server owns timing and damage. Rendered pixels never determine collision.
class PlacedFxController {
    constructor(world, clock = Date.now) {
        this.world = world; this.clock = clock; this.players = new Map(); this.serial = 0; this.revision = 0;
        this.configure(world.map.placedFx || []);
    }
    configure(rows) {
        Config.validate(rows, this.world.map);
        const key = JSON.stringify(rows); if (key === this.key) return;
        this.key = key; this.rows = rows; this.epoch = this.clock(); this.seed = Math.floor(Math.random()*2147483647); this.players.clear();
        this.controlledRows = rows.filter(row => row.attackingMob !== undefined);
        this.activations = new Map(this.controlledRows.map(row => [row.id, null]));
        this.revision++;
    }
    packet(value) {return {serialize: () => [Types.Messages.PIXEL_FX, value]};}
    updateActivations(now) {
        if (!this.controlledRows.length) return;
        const attacking = new Set();
        for (const mob of Object.values(this.world.mobs || {})) {
            const target = this.world.players[mob.target];
            if (!mob.isDead && mob.hitPoints > 0 && target?.hasEnteredGame && !target.isDead && target.hitPoints > 0 && !target.isBot()) attacking.add(mob.kind);
        }
        let changed = false;
        for (const row of this.controlledRows) {
            const enabled = attacking.has(row.attackingMob);
            if (enabled === (this.activations.get(row.id) !== null)) continue;
            this.activations.set(row.id, enabled ? now : null);
            changed = true;
        }
        if (changed) this.revision++;
    }
    tick() {
        const now = this.clock(), present = new Set();
        this.updateActivations(now);
        for (const player of Object.values(this.world.players)) {
            if (!player.hasEnteredGame || player.isBot()) continue;
            present.add(player);
            let state = this.players.get(player);
            if (!state) {
                state = {joined:null, ticks:new Map()}; this.players.set(player, state);
            }
            const alive = !player.isDead && player.hitPoints > 0;
            if (alive && state.joined === null) {
                state.joined = now;
                state.revision = undefined;
            } else if (!alive) {
                state.joined = null;
                state.ticks.clear();
            }
            // The world keeps rendering behind the revive screen. Dead observers
            // still need activation updates, but regain warning protection on revive.
            if (state.revision !== this.revision) {
                this.world.pushToPlayer(player, this.packet({type:'map', mapId:this.world.id, rows:this.rows, epoch:this.epoch, seed:this.seed, activations:Object.fromEntries(this.activations), now}));
                state.revision = this.revision;
            }
            if (!alive) continue;
            for (const row of this.rows) {
                if (!row.hazard) continue;
                const epoch = row.attackingMob === undefined ? this.epoch : this.activations.get(row.id);
                if (epoch === null) continue;
                const phase = Config.phase(row, now-epoch), h = row.hazard;
                // Newly arrived players get a full warning cycle before they can be hit.
                const cycleStart = epoch+phase.cycle*Config.cycleDuration(row);
                if (phase.kind!=='active' || cycleStart<state.joined || !Config.contains(Config.hitRegion(row,phase.cycle,this.seed),player.x,player.y)) continue;
                const token = epoch+':'+phase.cycle+':'+phase.tick;
                if (state.ticks.get(row.id)===token) continue;
                state.ticks.set(row.id, token);
                player.handleHurt({type:'hazard', kind:'map-fx', name:row.name, id:row.id}, h.damage);
                if (player.hitPoints<=0) break;
            }
        }
        for (const player of this.players.keys()) if (!present.has(player)) this.players.delete(player);
    }
    hit(entity, attacker, damage, critical) {
        if (damage<=0 || attacker.type!=='player') return;
        const effect = critical ? 'impacts/crit-hit' : Config.hitStyles[attacker.selectedHit];
        if (!effect) return;
        this.world.pushToAdjacentGroups(entity.group, this.packet({type:'hit', mapId:this.world.id, id:++this.serial, effect, x:entity.x,y:entity.y}));
    }
}
module.exports = PlacedFxController;
