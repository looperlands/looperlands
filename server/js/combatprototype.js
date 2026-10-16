// Opt-in local training encounter. Installed only by bin/local-npc-preview.js.
const Types = require('../../shared/js/gametypes');
const Messages = require('./message');
const CombatController = require('./combatcontroller');
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const same = (a, b) => a.x === b.x && a.y === b.y;
const TIMING = {windup: 850, lunge: 180, recovery: 1250, attack: 800, streak: 1500};

class CombatPrototype extends CombatController {
    constructor(world, now = Date.now) {
        super(world, now);
        world.combatPrototype = this;
    }

    bind(player) {
        const regen = player.regenHealthBy;
        player.regenHealthBy = (...args) => {
            if (!this.encounters.has(player.id)) return regen.apply(player, args);
        };
        const socket = player.connection._connection;
        socket.on('combat-preview', command => {
            if (!player.hasEnteredGame || this.world.players[player.id] !== player) return;
            player.resetTimeout();
            try { this.command(player, command); }
            catch (error) { socket.emit('combat-preview', {error: error.message}); }
        });
        socket.on('disconnect', () => this.disable(player, false));
        const receive = player.connection.listen_callback;
        player.connection.listen_callback = message => {
            if (this.intercept(player,message)) return;
            if (Number(message?.[0]) !== Types.Messages.HIT) return receive(message);
            // One HIT can kill several mobs through cleave/AoE. Only its intended
            // target may advance the streak or earn bonus XP, regardless of kill order.
            const previous = this.activeAttack;
            this.activeAttack = {player,targetId:Number(message[1]),credited:false};
            try { return receive(message); }
            finally { this.activeAttack = previous; }
        };
    }

    intercept(player, message) {
        if (!Array.isArray(message)) return false;
        const type = Number(message[0]);
        const combat = [Types.Messages.AGGRO, Types.Messages.ATTACK, Types.Messages.HIT, Types.Messages.HURT, Types.Messages.SHOOT];
        // A second local player cannot damage or recruit another player's trainer.
        if (this.mobIds.has(Number(message[1])) && combat.includes(type)) return true;
        const encounter = this.encounters.get(player.id);
        if (!encounter) return false;
        if (type === Types.Messages.HURT && !message[2]) {
            const mob = this.world.entities[message[1]];
            if (mob && this.fieldAttacks.intercept(encounter,mob,this.now())) return true;
        }
        if (this.now() < encounter.lockUntil && combat.includes(type)) return true;
        // MOVE contains the path destination, not the tile currently occupied.
        // Training instead accepts completed adjacent steps with a speed check.
        if (type === Types.Messages.ATTACK) this.encounters.get(player.id).selected = false;
        return [Types.Messages.MOVE, Types.Messages.LOOTMOVE].includes(type);
    }

    arena(player) {
        // Find a clear, walkable patch near the player, without changing map tiles.
        for (let radius = 0; radius <= 18; radius++) {
            for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
                const x = player.x + dx, y = player.y + dy;
                let clear = true;
                for (let oy = -2; oy <= 2 && clear; oy++) for (let ox = -2; ox <= 2; ox++) {
                    if (!this.free(x + ox, y + oy, [player])) { clear = false; break; }
                }
                if (clear) return {x, y};
            }
        }
        throw new Error('No clear training patch nearby. Move to an open area and try again.');
    }

    command(player, command) {
        if (!command || typeof command !== 'object') return;
        if (command.action === 'enable') {
            if (!this.encounters.has(player.id)) this.enable(player);
            return;
        }
        if (command.action === 'disable') { this.disable(player); return; }
        const encounter = this.encounters.get(player.id);
        if (!encounter) return;
        const now = this.now();
        if (command.action === 'reset') { this.reset(encounter); return; }
        if (command.action === 'move') { this.move(encounter, command, now); return; }
        if (command.action === 'select') { encounter.selected = Number(command.mobId) === Number(encounter.mob.id); return; }
        if (command.action === 'technique' && command.mobId && Number(command.mobId) !== Number(encounter.mob.id)) {
            this.fieldAttacks.technique(encounter,command.mobId,now); return;
        }
        if (command.action !== 'technique' || now < encounter.lockUntil || now > encounter.comboUntil
            || distance(player, encounter.mob) !== 1 || encounter.phase === 'round') return;
        if (encounter.combo === 'counter') {
            encounter.selected = true;
            encounter.combo = null;
            encounter.nextAttack = encounter.until;
            this.damage(encounter, 22, 'Counter');
        }
        this.send(encounter);
    }

    enable(player) {
        const center = this.arena(player);
        const Mob = require('./mob');
        const mob = new Mob(this.world.nextMobId(), Types.Entities.OGRE, center.x, center.y - 1);
        mob.handleRespawn = () => {};
        mob.regenHealthBy = () => {};
        mob.maxHitPoints = mob.hitPoints = 160;
        const encounter = {player, mob, center, origin: {x: player.x, y: player.y}, originalHp: player.hitPoints,
            selected: true, eventId: 0, round: 0, lastMove: 0, correction: 0, streak: 0, streakUntil: 0,
            stats: {evades:0,counters:0,hits:0,corrections:0}, chargeHit:0};
        this.world.handlePlayerVanish(player);
        this.encounters.set(player.id, encounter); this.mobIds.add(Number(mob.id));
        this.world.addMob(mob);
        this.world.pushToPlayer(player, mob.spawn());
        this.reset(encounter);
    }

    placePlayer(encounter, position) {
        const {player} = encounter;
        player.setPosition(position.x, position.y);
        this.world.handleEntityGroupMembership(player);
        this.world.pushRelevantEntityListTo(player);
        encounter.correction++;
        encounter.lastMove = this.now();
        encounter.moveBudget = 0; encounter.moveBudgetAt = this.now(); encounter.nextTile = null;
    }

    reset(encounter, repositionPlayer = true) {
        const {player, mob, center} = encounter;
        if (repositionPlayer) this.fieldAttacks.clear(encounter);
        const now = this.now();
        const spawn = repositionPlayer ? {x:center.x,y:center.y-1}
            : [[0,-2],[2,0],[0,2],[-2,0],[1,-1],[-1,1]].map(([dx,dy])=>({x:player.x+dx,y:player.y+dy}))
                .find(point=>this.trainerCanMove(encounter,point));
        if (!spawn) { encounter.until = now+300; return; }
        mob.setPosition(spawn.x, spawn.y); mob.hitPoints = 160;
        this.world.handleEntityGroupMembership(mob);
        if (repositionPlayer) {
            this.placePlayer(encounter, {x: center.x, y: center.y + 1});
            encounter.selected = true;
        }
        player.hitPoints = player.maxHitPoints;
        this.world.pushToPlayer(player, player.health());
        Object.assign(encounter, {phase: 'chase', until: now + 1200, combo: null, comboUntil: 0,
            lockUntil: 0, nextAttack: now + 1200, lane: [], strikes: 0, round: encounter.round + 1});
        this.event(encounter, repositionPlayer ? 'reset' : 'ready', 'Bait the lunge');
        this.send(encounter);
    }

    disable(player, restore = true) {
        const encounter = this.encounters.get(player.id);
        if (!encounter) return;
        this.fieldAttacks.clear(encounter);
        this.encounters.delete(player.id); this.mobIds.delete(Number(encounter.mob.id));
        this.world.pushBroadcast(encounter.mob.despawn());
        this.world.removeEntity(encounter.mob);
        if (restore && this.world.players[player.id] === player) {
            player.hitPoints = Math.min(player.maxHitPoints, encounter.originalHp);
            this.world.pushToPlayer(player, player.health());
            if (this.free(encounter.origin.x, encounter.origin.y, [player])) this.placePlayer(encounter, encounter.origin);
            player.connection._connection.emit('combat-preview', {enabled: false, attackRate: player.getAttackRate(), player: {x: player.x, y: player.y}});
            this.world.pushToAdjacentGroups(player.group, new Messages.Teleport(player), player.id);
        } else if (this.world.players[player.id] === player) {
            player.connection._connection.emit('combat-preview', {enabled: false, attackRate: player.getAttackRate()});
        }
    }

    hurt(encounter, fraction, kind, label) {
        const {player} = encounter;
        const previousHp = player.hitPoints;
        player.hitPoints = Math.max(1, player.hitPoints - Math.ceil(player.maxHitPoints * fraction));
        if (kind === 'hurt' && player.hitPoints < previousHp) encounter.chargeHit++;
        this.world.pushToPlayer(player, player.health());
        this.event(encounter, kind, label);
        if (player.hitPoints === 1) this.endRound(encounter, 'Try again');
    }

    trainerCanMove(encounter, point) {
        return (!encounter.nextTile || !same(point,encounter.nextTile))
            && this.free(point.x,point.y,[encounter.mob]);
    }

    event(encounter, kind, label) {
        encounter.event = {id: ++encounter.eventId, kind, label};
        const stat = kind === 'evade' ? 'evades' : ['hurt','mob-attack'].includes(kind) ? 'hits'
            : kind === 'attack' && label === 'Counter' ? 'counters' : null;
        if (stat) encounter.stats[stat]++;
    }

    damage(encounter, points, label) {
        const {mob, player} = encounter;
        mob.hitPoints = Math.max(0, mob.hitPoints - points);
        this.world.pushToPlayer(player, new Messages.Damage(mob, points, label !== 'Attack'));
        this.event(encounter, 'attack', label);
        if (!mob.hitPoints) this.endRound(encounter, 'Victory');
    }

    endRound(encounter, label) {
        encounter.phase = 'round'; encounter.until = this.now() + 2000;
        encounter.combo = null; encounter.lane = []; encounter.lockUntil = 0;
        this.event(encounter, 'round', label);
    }

    tick() {
        const now = this.now();
        this.fieldAttacks.tick(now);
        for (const encounter of this.encounters.values()) {
            const {player, mob} = encounter;
            if (this.world.players[player.id] !== player || player.isDead) { this.disable(player, false); continue; }
            if (now >= encounter.streakUntil) encounter.streak = 0;
            if (encounter.combo && now > encounter.comboUntil) encounter.combo = null;
            if (encounter.fieldCombo || [...this.fieldAttacks.attacks.values()].some(a=>a.encounter===encounter)) {
                // Avoid stacking the practice lunge on top of an ordinary mob's warning.
                encounter.until = Math.max(encounter.until,now+300);
                encounter.nextAttack = Math.max(encounter.nextAttack,now+300);
            }
            if (now >= encounter.until) {
                if (encounter.phase === 'round') { this.reset(encounter,false); continue; }
                if (encounter.phase === 'chase') {
                    if (distance(player, mob) === 1) {
                        if (encounter.strikes < 2) {
                            encounter.strikes++;
                            encounter.until = now + TIMING.attack;
                            this.hurt(encounter, .08, 'mob-attack', 'Strike');
                            this.send(encounter);
                            continue;
                        }
                        encounter.strikes = 0;
                        const dx = Math.sign(player.x - mob.x), dy = Math.sign(player.y - mob.y);
                        encounter.direction = {x: dx, y: dy};
                        encounter.lane = [1, 2].map(n => ({x: mob.x + dx * n, y: mob.y + dy * n}))
                            .filter(p => this.world.isValidPosition(p.x, p.y));
                        encounter.aimed = encounter.lane.some(p => same(p, player));
                        encounter.phase = 'windup'; encounter.until = now + TIMING.windup;
                        this.event(encounter, 'windup', 'Sidestep!');
                    } else {
                        const candidates = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({x:mob.x+dx,y:mob.y+dy}))
                            .filter(p => this.trainerCanMove(encounter,p)).sort((a,b) => distance(a,player)-distance(b,player));
                        const next = candidates.find(p => distance(p, player) < distance(mob, player));
                        if (next) { mob.setPosition(next.x, next.y); this.world.handleEntityGroupMembership(mob); }
                        encounter.until = now + 300;
                    }
                } else if (encounter.phase === 'windup') {
                    encounter.phase = 'lunge'; encounter.until = now + TIMING.lunge;
                    const destination = encounter.lane[0];
                    if (destination && this.trainerCanMove(encounter,destination)) {
                        mob.setPosition(destination.x, destination.y); this.world.handleEntityGroupMembership(mob);
                    }
                    this.event(encounter, 'lunge', 'Lunge');
                } else if (encounter.phase === 'lunge') {
                    const hit = encounter.lane.some(p => same(p, player));
                    encounter.phase = 'recovery'; encounter.until = now + TIMING.recovery;
                    if (hit) {
                        encounter.combo = null;
                        this.hurt(encounter, .24, 'hurt', 'Hit — leave the marked tiles');
                    } else if (encounter.aimed) {
                        encounter.combo = 'counter'; encounter.comboUntil = encounter.until;
                        this.event(encounter, 'evade', 'Counter ready');
                    }
                    encounter.lane = [];
                } else {
                    encounter.phase = 'chase'; encounter.until = now + 500; encounter.combo = null;
                }
            }
            if (encounter.selected && !encounter.nextTile && !encounter.combo && ['chase','windup'].includes(encounter.phase)
                && now >= encounter.nextAttack && distance(player,mob) === 1 && now - encounter.lastMove > 150) {
                encounter.nextAttack = now + TIMING.attack;
                this.damage(encounter, 6, 'Attack');
            }
            this.send(encounter);
        }
    }

    send(encounter) {
        const {player, mob} = encounter;
        player.connection._connection.emit('combat-preview', {enabled: true, serverNow: this.now(), ...this.fieldAttacks.state(encounter),
            phase: encounter.phase, until: encounter.until, combo: encounter.combo, comboUntil: encounter.comboUntil,
            lockUntil: encounter.lockUntil, lane: encounter.lane, event: encounter.event, correction: encounter.correction,
            direction: encounter.direction, attackRate: player.getAttackRate(),
            streak: encounter.streak, streakUntil: encounter.streakUntil, streakBonusPercent: this.streakBonus(encounter), chargeHit:encounter.chargeHit,
            player: {x:player.x, y:player.y}, mob: {id:mob.id,x:mob.x,y:mob.y,level:mob.level,hp:mob.hitPoints,maxHp:160}});
    }
}
module.exports = {CombatPrototype, TIMING};
