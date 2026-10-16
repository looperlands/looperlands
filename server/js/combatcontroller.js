// Server-owned combat for normal play. Training extends this without exposing its commands here.
const Types = require('../../shared/js/gametypes');
const Messages = require('./message');
const FieldAttacks = require('./combatfieldattacks');
const same = (a, b) => a.x === b.x && a.y === b.y;
const STREAK_WINDOW = 1500;

class CombatController {
    constructor(world, now = Date.now) {
        this.world = world;
        this.now = now;
        this.encounters = new Map();
        this.mobIds = new Set();
        this.fieldAttacks = new FieldAttacks(this);
        world.combat = this;
    }

    bind(player) {
        const socket = player.connection._connection;
        socket.on('combat', command => {
            if (!player.hasEnteredGame || player.isDead || this.world.players[player.id] !== player) return;
            if (!command || typeof command !== 'object') return;
            if (command.action === 'ready') {
                if (!this.encounters.has(player.id)) this.enable(player);
                return;
            }
            const encounter = this.encounters.get(player.id);
            if (!encounter) return;
            if (command.action === 'move') this.move(encounter, command, this.now());
            if (command.action === 'technique') this.fieldAttacks.technique(encounter, command.mobId, this.now());
        });
        socket.on('disconnect', () => this.disable(player));
        const receive = player.connection.listen_callback;
        player.connection.listen_callback = message => {
            const encounter = this.encounters.get(player.id);
            if (!encounter || !Array.isArray(message)) return receive(message);
            const type = Number(message[0]);
            if (type === Types.Messages.HURT && !message[2]) {
                const mob = this.world.entities[message[1]];
                if (mob && this.fieldAttacks.intercept(encounter,mob,this.now())) return;
            }
            // Positions come from completed tiles; retain normal target clearing on path start.
            if ([Types.Messages.MOVE, Types.Messages.LOOTMOVE].includes(type)) {
                player.clearTarget();
                return;
            }
            if (type !== Types.Messages.HIT) return receive(message);
            const previous = this.activeAttack;
            this.activeAttack = {player,targetId:Number(message[1]),credited:false};
            try { return receive(message); }
            finally { this.activeAttack = previous; }
        };
    }

    enable(player) {
        const now = this.now();
        const encounter = {player,phase:'field',lockUntil:0,combo:null,fieldCombo:null,chargeHit:0,
            correction:1,nextTile:null,lastMove:now,moveBudget:0,moveBudgetAt:now,
            streak:0,streakUntil:0,stats:{corrections:0}};
        this.encounters.set(player.id,encounter);
        this.send(encounter);
    }

    disable(player) {
        const encounter = this.encounters.get(player.id);
        if (!encounter) return;
        this.fieldAttacks.clear(encounter);
        this.encounters.delete(player.id);
        if (this.world.players[player.id] === player) player.connection._connection.emit('combat',{enabled:false,live:true});
    }

    teleport(player) {
        const encounter = this.encounters.get(player.id);
        if (!encounter) return;
        this.fieldAttacks.clear(encounter);
        encounter.correction++;
        encounter.nextTile=null;
        encounter.moveBudget=0;encounter.moveBudgetAt=this.now();
        encounter.streak=0;encounter.streakUntil=0;
        this.send(encounter);
    }

    tick() {
        const now=this.now();
        if (now < (this.nextTick || 0)) return;
        this.nextTick=now+50;
        this.fieldAttacks.tick(now);
        for (const encounter of this.encounters.values()) {
            const player=encounter.player;
            if (player.isDead || this.world.players[player.id] !== player) { this.disable(player);continue; }
            if (now >= encounter.streakUntil) encounter.streak=0;
            this.send(encounter);
        }
    }

    send(encounter) {
        const player=encounter.player;
        const state=this.fieldAttacks.state(encounter);
        // Nearby players also see the warning and suspend this mob's ordinary attack animation.
        state.fieldAttacks=this.fieldAttacks.visibleState(player);
        const packet={enabled:true,live:true,...state,phase:'field',lockUntil:0,lane:[],
            correction:encounter.correction,chargeHit:encounter.chargeHit,
            streak:encounter.streak,streakUntil:encounter.streakUntil,
            player:{x:player.x,y:player.y},mob:null};
        const signature=JSON.stringify(packet),now=this.now();
        if (signature===encounter.lastPacket && now < encounter.nextHeartbeat) return;
        encounter.lastPacket=signature;encounter.nextHeartbeat=now+1000;
        player.connection._connection.emit('combat',{...packet,serverNow:now});
    }

    free(x, y, ignored = []) {
        if (!Number.isInteger(x) || !Number.isInteger(y) || !this.world.isValidPosition(x, y)) return false;
        if (this.world.map.doors?.some(door => door.x === x && door.y === y)) return false;
        return !Object.values(this.world.entities).some(entity => !ignored.includes(entity)
            && ['player', 'mob', 'npc'].includes(entity.type) && entity.x === x && entity.y === y);
    }


    streakBonus(encounter) { return Math.min(75, Math.max(0, encounter.streak-1)*25); }


    killExperience(mob, player, killer, baseXp) {
        const encounter = this.encounters.get(player.id);
        const attack = this.activeAttack;
        if (!encounter || killer !== player || mob.hitPoints > 0 || this.world.entities[mob.id] !== mob
            || this.mobIds.has(Number(mob.id)) || attack?.player !== player
            || attack.targetId !== Number(mob.id) || attack.credited) return baseXp;
        attack.credited = true;
        this.recordKill(encounter);
        return baseXp + Math.round(baseXp * this.streakBonus(encounter) / 100);
    }


    recordKill(encounter) {
        const now = this.now();
        encounter.streak = now < encounter.streakUntil ? encounter.streak + 1 : 1;
        encounter.streakUntil = now + STREAK_WINDOW;
        this.send(encounter);
    }


    playerCanMove(encounter, x, y) {
        // Ordinary actors store path destinations on the server, not their visible
        // current tiles. Their collision is already resolved by client pathfinding.
        // Only the trainer has authoritative per-tile positions in this prototype.
        return Number.isInteger(x) && Number.isInteger(y) && this.world.isValidPosition(x,y)
            && (!encounter.mob || !same(encounter.mob,{x,y}));
    }


    reserveNextTile(encounter, next) {
        const {player} = encounter;
        encounter.nextTile = next && Math.abs(next.x-player.x)<=1 && Math.abs(next.y-player.y)<=1
            && !same(player,next) && this.playerCanMove(encounter,next.x,next.y) ? {x:next.x,y:next.y} : null;
    }


    move(encounter, point, now) {
        const {player} = encounter;
        // Ignore queued steps from before a correction/reset without causing another rollback.
        if (point.correction !== encounter.correction) { this.send(encounter); return; }
        if (same(player, point)) { this.reserveNextTile(encounter,point.next); return; }
        const dx = point.x - player.x, dy = point.y - player.y;
        const speed = player.getMoveSpeed(), cost = Math.hypot(dx,dy)*speed;
        // Keep elapsed-time credit for two diagonal tiles, matching the client's bounded
        // frame catch-up. Packet batching must not turn valid movement into a speed violation.
        const budget = Math.min(2*Math.SQRT2*speed, encounter.moveBudget + now-encounter.moveBudgetAt);
        const valid = now >= encounter.lockUntil && Math.abs(dx)<=1 && Math.abs(dy)<=1
            && budget+35 >= cost && this.playerCanMove(encounter,point.x,point.y)
            && (!dx || !dy || this.playerCanMove(encounter,player.x+dx,player.y) && this.playerCanMove(encounter,player.x,player.y+dy));
        if (!valid) {
            encounter.lastCorrection = {from:{x:player.x,y:player.y},to:{x:point.x,y:point.y},budget,cost,
                locked:now < encounter.lockUntil,occupied:!this.playerCanMove(encounter,point.x,point.y)};
            encounter.correction++; encounter.stats.corrections++; encounter.nextTile = null;
            this.send(encounter); return;
        }
        encounter.moveBudget = budget-cost; encounter.moveBudgetAt = now;
        player.setPosition(point.x,point.y); encounter.lastMove = now;
        this.reserveNextTile(encounter,point.next);
        // Completed steps can change groups before the client ZONE message arrives.
        // Publish the new visibility set here; ZONE can no longer detect that change.
        if (this.world.handleEntityGroupMembership(player)) {
            this.world.pushToPreviousGroups(player, new Messages.Destroy(player));
            this.world.pushRelevantEntityListTo(player);
        }
        this.world.pushToAdjacentGroups(player.group,new Messages.Move(player),player.id);
        player.resetTimeout?.();
        player.move_callback?.(point.x,point.y);
        this.world.server?.activity?.meaningful(player);
    }

}
module.exports = CombatController;
