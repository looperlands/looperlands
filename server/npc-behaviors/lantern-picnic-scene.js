const {INVITE, MUSIC} = require('./lantern-picnic');

// Production quest payoff using the same collision-aware routines.
// Quest progress is personal; the gathering is a visible event for everyone nearby.
class LanternPicnicScene {
    constructor(world, now = Date.now) {
        this.world = world;
        this.now = now;
        this.state = null;
        this.actors = [];
        this.cooldownUntil = 0;
    }

    completed(player) {
        const data = this.world.server.cache.get(player.sessionId)?.gameData;
        return ['COMPLETED', 'FINISHED'].some(status => (data?.quests?.[status] || []).some(quest =>
            (quest.questKey || quest.id) === INVITE));
    }

    seatFor(actor, preferred, reserved) {
        const behavior = this.world.npcBehavior;
        for (let radius = 0; radius <= 5; radius++) {
            for (let y = preferred.y - radius; y <= preferred.y + radius; y++) {
                for (let x = preferred.x - radius; x <= preferred.x + radius; x++) {
                    const point = {x, y};
                    if (reserved.has(x + ',' + y) || !behavior.walkable(point) || behavior.occupied(point, actor.npc)) continue;
                    if (behavior.canReach(actor, point)) return point;
                }
            }
        }
        return null;
    }

    start(player) {
        const behavior = this.world.npcBehavior;
        const keys = ['town-gardener', 'town-neighbour', 'town-watch'];
        const preferred = [{x: 40, y: 215}, {x: 43, y: 215}, {x: 42, y: 218}];
        const reserved = new Set();
        const actors = keys.map(key => behavior.routines.get(key));
        if (actors.some(actor => !actor)) return;
        const seats = actors.map((actor, index) => {
            const seat = this.seatFor(actor, preferred[index], reserved);
            if (seat) reserved.add(seat.x + ',' + seat.y);
            return seat;
        });
        if (seats.some(seat => !seat)) return;
        const choices = this.world.server.cache.get(player.sessionId)?.gameData?.choices || [];
        const music = choices.includes(MUSIC);
        const visitor = 'A neighbour';
        this.state = {phase: 'gathering', center: {x: 42, y: 216}, music, visitor,
            message: visitor + ' finished the preparations. Adam, Bstrat and the watch are walking to the picnic, south of the market.'};
        this.owner = player;
        this.startedAt = this.now();
        this.attendees = new Map();
        this.actors = actors.map((actor, index) => ({actor, originalRoute: actor.definition.route,
            originalWaypoint: actor.waypoint, seat: seats[index]}));
        behavior.conversation = null;
        behavior.nextConversation = Infinity;
        for (const {actor, seat} of this.actors) {
            actor.scheduleOverride = 'picnic';
            actor.definition.route = [{...seat, waitSeconds: 600, activity: 'joining the picnic'}];
            actor.waypoint = 0;
            actor.path = [];
            actor.nextStep = this.now();
            actor.blockedSince = 0;
        }
        // Public lines describe the gathering. Personal choices are explained in
        // each player's dialogue and music packet, without speaking for bystanders.
        this.lines = [
            ['town-gardener', 'The bread is here, and the blankets are ready. It is finally time to eat!'],
            ['town-neighbour', 'That basket did more than one job today. Let us leave room for everyone.'],
            ['town-watch', 'My gate check is done. I can join you for a little while.'],
            ['town-neighbour', 'The lanterns are lit. Come sit with us south of the market.'],
            ['town-watch', 'I usually pass this spot while patrolling. It is good to stop here with my neighbours.'],
            ['town-gardener', 'There is bread and cake for everyone by the blanket.'],
            ['town-neighbour', 'One place is still empty. Rowan used to bring invitations from the other parts of the island.'],
            ['town-watch', 'Save that place. An old friend may still find the road home.']
        ];
        this.nextLine = 0;
        this.lineIndex = 0;
    }

    tick() {
        const time = this.now();
        const behavior = this.world.npcBehavior;
        if (!behavior || !Object.values(this.world.players).some(player => player.hasEnteredGame)) return;
        if (!this.state || (this.state.phase === 'finished' && time >= this.cooldownUntil)) {
            const player = Object.values(this.world.players).find(player => player.hasEnteredGame && !player.isDead &&
                Math.abs(player.x - 42) + Math.abs(player.y - 216) <= 30 && this.completed(player) &&
                !behavior.memory.has('main', 'lantern-picnic', player, 'celebrated'));
            if (player) this.start(player);
            return;
        }
        if (this.state.phase === 'finished') return;
        behavior.nextConversation = Infinity;
        if (time - this.startedAt > 180000 && this.state.phase === 'gathering') { this.finish(time, false); return; }
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
                        entry.actor.definition.route[0] = {...replacement, waitSeconds: 600, activity: 'joining the picnic'};
                        entry.actor.path = [];
                        entry.actor.nextStep = time;
                        reserved.add(replacement.x + ',' + replacement.y);
                    }
                }
            }
            if (!this.actors.every(({actor, seat}) => actor.npc.x === seat.x && actor.npc.y === seat.y)) return;
            this.state.phase = 'celebrating';
            this.state.message = 'The picnic is happening south of the market! Join the neighbours by the blanket. ' +
                'The watch has finished the gate check and can stay for a while.';
            this.finishAt = time + 90000;
            this.nextLine = time;
            for (const {actor} of this.actors) {
                behavior.state(actor, {activity: 'enjoying the picnic'});
                behavior.face(actor, this.state.center);
                actor.pauseUntil = this.finishAt;
            }
        }
        for (const player of behavior.nearbyPlayers(this.state.center, 16)) {
            if (this.completed(player)) this.attendees.set(player.nftId, player);
        }
        if (this.lineIndex < this.lines.length && time >= this.nextLine) {
            const [key, text] = this.lines[this.lineIndex];
            const actor = behavior.routines.get(key);
            if (actor.npc.behaviorState.activity === 'talking' && time < actor.speechUntil) return;
            if (behavior.speak(actor, text, null, true)) {
                this.lineIndex++;
                this.nextLine = time + 6000;
            }
        }
        if (time < this.finishAt) return;
        this.finish(time, true);
    }

    finish(time, celebrated) {
        const behavior = this.world.npcBehavior;
        for (const {actor, originalRoute, originalWaypoint} of this.actors) {
            actor.scheduleOverride = null;
            actor.definition.route = originalRoute;
            actor.waypoint = originalWaypoint;
            actor.path = [];
            actor.pauseUntil = Math.max(time + 2000, actor.speechUntil);
            actor.nextStep = time + 2000;
            behavior.state(actor, {activity: 'returning to rounds'});
        }
        for (const player of celebrated ? this.attendees.values() : []) {
            try { behavior.memory.remember('main', 'lantern-picnic', player, 'celebrated'); }
            catch (error) { console.error('Could not save picnic memory: ' + error.message); }
        }
        behavior.nextConversation = time + 120000;
        this.cooldownUntil = time + 30000;
        this.state.phase = 'finished';
        this.state.message = 'The picnic has finished. The neighbours remember it and are returning to their usual rounds.';
    }
}

module.exports = LanternPicnicScene;
