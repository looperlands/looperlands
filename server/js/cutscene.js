const questState = require('./quests/queststate');

function validateDefinition(definition) {
    if (!definition?.id || !definition.memoryKey || (!definition.trigger?.questCompleted && typeof definition.eligible !== 'function') ||
        !Number.isInteger(definition.center?.x) || !Number.isInteger(definition.center?.y) ||
        !definition.actors?.length || !definition.steps?.length || !definition.activity || !definition.messages ||
        ['triggerRadius', 'audienceRadius', 'arrivalTimeoutMs', 'durationMs', 'cooldownMs', 'speechGapMs'].some(key => !Number.isFinite(definition[key]) || definition[key] < 0)) throw new Error('Invalid cutscene definition');
    const actors = new Set(definition.actors.map(actor => actor.key));
    if (actors.size !== definition.actors.length || definition.actors.some(actor => !actor.key || !Number.isInteger(actor.destination?.x) || !Number.isInteger(actor.destination?.y)) ||
        definition.steps.some(step => !['speech', 'wait', 'cue'].includes(step.type) ||
            (step.type === 'speech' && (!actors.has(step.npc) || typeof step.text !== 'string' || /[<>]/.test(step.text))) ||
            (step.type === 'wait' && (!Number.isFinite(step.durationMs) || step.durationMs < 0)) ||
            (step.waitMs !== undefined && (!Number.isFinite(step.waitMs) || step.waitMs < 0)))) throw new Error('Invalid cutscene steps');
}



// Shared scene playback uses existing collision-aware NPC routines.
// Content, eligibility and animation cues come from registered configuration/scripts.
class Cutscene {
    constructor(world, definition, now = Date.now) {
        validateDefinition(definition);
        this.definition = definition;
        this.mapId = world.id.replace(/^world_/, '');
        this.world = world;
        this.now = now;
        this.state = null;
        this.actors = [];
        this.cooldownUntil = 0;
    }

    completed(player) {
        const data = this.world.server.cache.get(player.sessionId)?.gameData;
        return this.definition.trigger?.questCompleted ? questState.completed(data, this.definition.trigger.questCompleted) : this.definition.eligible(player, data);
    }

    seatFor(actor, preferred, reserved) {
        const behavior = this.world.npcBehavior;
        for (let radius = 0; radius <= 5; radius++) {
            for (let y = preferred.y - radius; y <= preferred.y + radius; y++) {
                for (let x = preferred.x - radius; x <= preferred.x + radius; x++) {
                    const point = {x, y};
                    if (reserved.has(x + ',' + y) || !behavior.walkable(point) || behavior.occupied(point, actor.npc)) continue;
                    if (behavior.canReach ? behavior.canReach(actor, point) : (actor.npc.x === x && actor.npc.y === y) || behavior.findPath(actor, point).length) return point;
                }
            }
        }
        return null;
    }

    start(player) {
        const behavior = this.world.npcBehavior;
        if (this.state && this.state.phase !== 'finished') return false;
        const keys = this.definition.actors.map(actor => actor.key);
        const preferred = this.definition.actors.map(actor => actor.destination);
        const reserved = new Set();
        const actors = keys.map(key => behavior.routines.get(key));
        if (actors.some(actor => !actor || actor.sceneOwner)) return;
        const seats = actors.map((actor, index) => {
            const seat = this.seatFor(actor, preferred[index], reserved);
            if (seat) reserved.add(seat.x + ',' + seat.y);
            return seat;
        });
        if (seats.some(seat => !seat)) return;
        this.state = {...this.definition.state?.(player, this.world.server.cache.get(player.sessionId)?.gameData),
            phase: 'gathering', center: this.definition.center, message: this.definition.messages.gathering};
        this.owner = player;
        this.startedAt = this.now();
        this.attendees = new Map();
        this.actors = actors.map((actor, index) => ({actor, originalRoute: actor.definition.route,
            originalWaypoint: actor.waypoint, seat: seats[index]}));
        behavior.conversation = null;
        behavior.nextConversation = Infinity;
        for (const {actor, seat} of this.actors) {
            actor.sceneOwner = this;
            actor.scheduleOverride = {...this.definition.activity, activity: this.definition.activity.key};
            actor.definition.route = [{...seat, waitSeconds: 600, activity: this.definition.activity.gathering}];
            actor.waypoint = 0;
            actor.path = [];
            actor.nextStep = this.now();
            actor.blockedSince = 0;
        }
        this.lines = this.definition.steps;
        this.nextLine = 0;
        this.lineIndex = 0;
    }

    tick() {
        const time = this.now();
        const behavior = this.world.npcBehavior;
        if (!behavior || !Object.values(this.world.players).some(player => player.hasEnteredGame)) return;
        if (!this.state || (this.state.phase === 'finished' && time >= this.cooldownUntil)) {
            const player = Object.values(this.world.players).find(player => player.hasEnteredGame && !player.isDead &&
                Math.abs(player.x - this.definition.center.x) + Math.abs(player.y - this.definition.center.y) <= this.definition.triggerRadius && this.completed(player) &&
                !behavior.memory.has(this.mapId, this.definition.id, player, this.definition.memoryKey));
            if (player) this.start(player);
            return;
        }
        if (this.state.phase === 'finished') return;
        if (this.actors.some(({actor}) => this.world.entities[actor.npc.id] !== actor.npc)) {this.finish(time, false); return;}
        behavior.nextConversation = Infinity;
        if (time - this.startedAt > this.definition.arrivalTimeoutMs && this.state.phase === 'gathering') { this.finish(time, false); return; }
        if (this.state.phase === 'gathering') {
            // A visitor can stand on a reserved seat. Choose another reachable seat
            // rather than teleporting an actor or leaving the event stuck forever.
            const reserved = new Set(this.actors.map(({seat}) => seat.x + ',' + seat.y));
            for (const entry of this.actors) {
                if (behavior.occupied(entry.seat, entry.actor.npc)) {
                    reserved.delete(entry.seat.x + ',' + entry.seat.y);
                    const replacement = this.seatFor(entry.actor, entry.seat, reserved);
                    if (replacement) {
                        entry.seat = replacement;
                        entry.actor.definition.route[0] = {...replacement, waitSeconds: 600, activity: this.definition.activity.gathering};
                        entry.actor.path = [];
                        entry.actor.nextStep = time;
                        reserved.add(replacement.x + ',' + replacement.y);
                    }
                }
            }
            if (!this.actors.every(({actor, seat}) => actor.npc.x === seat.x && actor.npc.y === seat.y)) return;
            this.state.phase = 'celebrating';
            this.state.message = this.definition.messages.playing;
            this.finishAt = time + this.definition.durationMs;
            this.nextLine = time;
            for (const {actor} of this.actors) {
                behavior.state(actor, {activity: this.definition.activity.playing});
                behavior.face(actor, this.state.center);
                actor.pauseUntil = this.finishAt;
            }
        }
        for (const player of behavior.nearbyPlayers(this.state.center, this.definition.audienceRadius)) {
            if (this.completed(player)) this.attendees.set(player.nftId, player);
        }
        if (this.lineIndex < this.lines.length && time >= this.nextLine) {
            const step = this.lines[this.lineIndex];
            const actor = step.npc && behavior.routines.get(step.npc);
            if (actor && this.world.entities[actor.npc.id] !== actor.npc) {this.finish(time, false); return;}
            if (actor && (actor.listeners?.size || (actor.npc.behaviorState.activity === 'talking' && time < actor.speechUntil))) return;
            if (step.type === 'wait') {this.lineIndex++; this.nextLine = time + step.durationMs;}
            else if (step.type === 'cue') {
                try {this.definition.onCue?.(step, this.world, this.state);}
                catch (error) {this.finish(time, false); console.error('Could not run scene cue: ' + error.message); return;}
                this.lineIndex++; this.nextLine = time + (step.waitMs || 0);
            } else if (behavior.speak(actor, step.text, null, true)) {
                this.lineIndex++; this.nextLine = time + (step.waitMs ?? this.definition.speechGapMs);
            }
        }
        if (time < this.finishAt || this.lineIndex < this.lines.length || time < this.nextLine) return;
        this.finish(time, true);
    }

    forget(player) {
        this.attendees?.delete(player.nftId);
        if (this.owner === player && this.state?.phase !== 'finished') this.finish(this.now(), false);
    }

    finish(time, celebrated) {
        const behavior = this.world.npcBehavior;
        for (const {actor, originalRoute, originalWaypoint} of this.actors) {
            delete actor.sceneOwner;
            actor.scheduleOverride = null;
            actor.definition.route = originalRoute;
            actor.waypoint = originalWaypoint;
            actor.path = [];
            actor.pauseUntil = Math.max(time + 2000, actor.speechUntil);
            actor.nextStep = time + 2000;
            behavior.state(actor, {activity: this.definition.activity.finished});
        }
        for (const player of celebrated ? this.attendees.values() : []) {
            try { behavior.memory.remember(this.mapId, this.definition.id, player, this.definition.memoryKey); }
            catch (error) { console.error('Could not save scene memory: ' + error.message); }
        }
        behavior.nextConversation = time + 120000;
        this.cooldownUntil = time + this.definition.cooldownMs;
        this.state.phase = 'finished';
        this.state.message = this.definition.messages.finished;
    }
}

module.exports = {Cutscene, validateDefinition};
