const Config = require('../../shared/js/placedfxconfig');
const Types = require('../../shared/js/gametypes');

// The server owns timing and damage. Rendered pixels never determine collision.
class PlacedFxController {
    constructor(world, clock = Date.now) {
        this.world = world; this.clock = clock; this.players = new Map(); this.serial = 0;
        this.configure(world.map.placedFx || []);
    }
    configure(rows) {
        Config.validate(rows, this.world.map);
        const key = JSON.stringify(rows); if (key === this.key) return;
        this.key = key; this.rows = rows; this.epoch = this.clock(); this.seed = Math.floor(Math.random()*2147483647); this.players.clear();
    }
    packet(value) {return {serialize: () => [Types.Messages.PIXEL_FX, value]};}
    tick() {
        const now = this.clock(), present = new Set();
        for (const player of Object.values(this.world.players)) {
            if (!player.hasEnteredGame || player.isDead || player.hitPoints <= 0 || player.isBot()) continue;
            present.add(player);
            let state = this.players.get(player);
            if (!state) {
                state = {joined:now, ticks:new Map()}; this.players.set(player, state);
                this.world.pushToPlayer(player, this.packet({type:'map', mapId:this.world.id, rows:this.rows, epoch:this.epoch, seed:this.seed, now}));
            }
            for (const row of this.rows) {
                if (!row.hazard) continue;
                const phase = Config.phase(row, now-this.epoch), h = row.hazard;
                // Newly arrived players get a full warning cycle before they can be hit.
                const cycleStart = this.epoch+phase.cycle*Config.cycleDuration(row);
                if (phase.kind!=='active' || cycleStart<state.joined || !Config.contains(Config.hitRegion(row,phase.cycle,this.seed),player.x,player.y)) continue;
                const token = phase.cycle+':'+phase.tick;
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
