const {Cutscene} = require('../js/cutscene');
const questState = require('../js/quests/queststate');
const {ids: Q, choices: C} = require('./lantern-friendship');
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const definition = {
    id: 'lantern-friendship-comparison', memoryKey: 'attended', center: {x: 42, y: 216},
    triggerRadius: 5, audienceRadius: 10, arrivalTimeoutMs: 180000, durationMs: 54000, cooldownMs: 60000, speechGapMs: 6000,
    eligible(player, data) {
        return !questState.completed(data, Q.NAME) && (data?.quests?.IN_PROGRESS || []).some(q => (q.questKey || q.id) === Q.NAME) &&
            ['adam-account', 'stall-covered', 'compare-requested'].every(key => data?.choices?.includes(C[key]));
    },
    actors: [{key: 'town-gardener', destination: {x: 40, y: 215}}, {key: 'town-watch', destination: {x: 42, y: 218}}, {key: 'town-neighbour', destination: {x: 40, y: 210}}],
    activity: {key: 'comparison', location: 'the old picnic spot', explanation: 'We are briefly comparing our accounts of the invitations.', travelling: 'walking to compare invitations', gathering: 'joining a short conversation', playing: 'comparing invitations', finished: 'returning to the usual routine'},
    messages: {gathering: 'The neighbours are coming when they are free.', playing: 'Adam and Watch compare their accounts.', finished: 'The neighbours return to their usual routines.'},
    steps: [
        {type: 'speech', npc: 'town-neighbour', text: 'All baskets present. None improved.'},
        {type: 'speech', npc: 'town-gardener', text: 'Watch, you said the invitations were covered.'},
        {type: 'speech', npc: 'town-watch', text: 'Delivered. Rowan delivered them.'},
        {type: 'speech', npc: 'town-gardener', text: 'Including his?'},
        {type: 'wait', durationMs: 2000},
        {type: 'speech', npc: 'town-watch', text: 'I thought you had asked him.'},
        {type: 'speech', npc: 'town-gardener', text: 'I thought you had.'},
        {type: 'speech', npc: 'town-neighbour', text: 'A very efficient system. Nobody had to say anything.'},
        {type: 'wait', durationMs: 2000},
        {type: 'speech', npc: 'town-gardener', text: 'We should probably change that part.'}
    ]
};
// Content-owned lifecycle adapter. It never writes progression or presentation packets.
class ComparisonScene extends Cutscene {
    constructor(world, now = Date.now) {super(world, definition, now); this.activeAt = null; this.awaySince = null;}
    present(player) {
        return player && Object.values(this.world.players).includes(player) && player.hasEnteredGame && !player.isDead &&
            (!player.server || player.server === this.world);
    }
    audience(player) {return this.present(player) && distance(player, this.definition.center) <= this.definition.audienceRadius;}
    seatFor(actor, preferred, reserved) {
        const behavior = this.world.npcBehavior;
        for (let radius = 0; radius <= 5; radius++) {
            for (let y = preferred.y - radius; y <= preferred.y + radius; y++) {
                for (let x = preferred.x - radius; x <= preferred.x + radius; x++) {
                    const point = {x, y};
                    if (distance(point, this.definition.center) > 9 || reserved.has(x + ',' + y) ||
                        !behavior.walkable(point) || behavior.occupied(point, actor.npc)) continue;
                    if (behavior.canReach(actor, point)) return point;
                }
            }
        }
        return null;
    }
    start(player) {
        this.activeAt = null; this.awaySince = null;
        return super.start(player);
    }
    prune() {
        for (const [id, player] of this.attendees || []) if (!this.audience(player)) this.attendees.delete(id);
    }
    tick() {
        const time = this.now();
        try {
            if (this.state && this.state.phase !== 'finished') {
                if (!this.present(this.owner)) {this.forget(this.owner); return;}
                if (this.audience(this.owner)) this.awaySince = null;
                else if (this.awaySince === null) this.awaySince = time;
                if (this.awaySince !== null && time - this.awaySince >= 10000) {this.finish(time, false); return;}
                if (this.activeAt !== null && time - this.activeAt >= 180000) {this.finish(time, false); return;}
                this.prune();
            }
            super.tick();
            if (this.state?.phase === 'celebrating' && this.activeAt === null) this.activeAt = time;
        } catch (error) {
            this.lastError = error.message;
            if (this.state && this.state.phase !== 'finished') this.finish(time, false);
        }
    }
    forget(player) {
        if (player) super.forget(player);
        else if (this.state && this.state.phase !== 'finished') this.finish(this.now(), false);
    }
    finish(time, successful) {
        if (!this.state || this.state.phase === 'finished') return;
        const behavior = this.world.npcBehavior;
        this.prune();
        // Restore every actor even when a state broadcast or schedule preparation fails.
        // Never restore a saved room/position: public-door travel determines the current room.
        for (const {actor, originalRoute} of this.actors) {
            delete actor.sceneOwner;
            actor.scheduleOverride = null;
            actor.definition.route = originalRoute;
            actor.path = [];
            actor.waypoint = 0;
            actor.blockedSince = 0;
            actor.nextStep = time;
            actor.pauseUntil = time;
            actor.speechUntil = time;
            try {
                if (actor.schedule) {
                    actor.schedule.override = null;
                    actor.schedule.phase = null;
                    actor.schedule.prepare(time);
                }
                behavior.state(actor, {activity: actor.schedule?.phase?.activity || 'returning to the usual routine'});
            } catch (error) {this.lastError = error.message;}
        }
        for (const player of successful ? this.attendees.values() : []) {
            try {behavior.memory.remember(this.mapId, definition.id, player, definition.memoryKey);}
            catch (error) {this.lastError = error.message;}
        }
        behavior.nextConversation = time + 120000;
        this.cooldownUntil = time + (successful ? 60000 : 30000);
        this.state.phase = 'finished'; this.state.message = definition.messages.finished;
        this.activeAt = null; this.awaySince = null;
    }
}
module.exports = {definition, ComparisonScene};
