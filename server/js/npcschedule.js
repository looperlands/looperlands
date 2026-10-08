const WorldTime = require('../../client/js/worldtime-worker');
const same = (a, b) => a.x === b.x && a.y === b.y;
const inside = (p, a) => p.x >= a.x && p.y >= a.y && p.x < a.x + a.width && p.y < a.y + a.height;
const point = p => p && Number.isInteger(p.x) && Number.isInteger(p.y);
const plain = text => typeof text === 'string' && text.length > 0 && text.length <= 240 && !/[<>]/.test(text);

function validateSchedule(definition) {
    const schedule = definition.schedule;
    if (!schedule) return;
    const buildings = schedule.buildings;
    const phases = schedule.phases;
    if (!Array.isArray(buildings) || !Array.isArray(phases) || !phases.length || phases[0].at !== 0) throw new Error('Invalid NPC schedule: ' + definition.key);
    const keys = new Set(['outside']);
    for (const building of buildings) {
        if (!building.key || keys.has(building.key) || !plain(building.label) ||
            !point(building.entrance) || !point(building.exit) || !inside(building.entrance, definition.area) ||
            !building.area || !['x', 'y', 'width', 'height'].every(key => Number.isInteger(building.area[key])) ||
            building.area.width < 1 || building.area.height < 1 || !inside(building.exit, building.area)) throw new Error('Invalid NPC building: ' + definition.key);
        keys.add(building.key);
    }
    for (const [i, phase] of phases.entries()) {
        const area = phase.location === 'outside' ? definition.area : buildings.find(b => b.key === phase.location)?.area;
        if (!Number.isFinite(phase.at) || phase.at < 0 || phase.at >= 24 || (i > 0 && phase.at <= phases[i - 1].at) ||
            !area || !['work', 'free-time', 'home', 'sleep'].includes(phase.key) || !plain(phase.activity) ||
            !plain(phase.label) || !plain(phase.explanation) || !plain(phase.travelling) ||
            !Array.isArray(phase.route) || !phase.route.length || phase.route.some(p => !point(p) || !inside(p, area) ||
                !Number.isFinite(p.waitSeconds) || p.waitSeconds < 1)) throw new Error('Invalid NPC schedule phase: ' + definition.key);
    }
}

function phaseAt(schedule, time) {
    const hour = ((time % WorldTime.duration) + WorldTime.duration) % WorldTime.duration / WorldTime.duration * 24;
    return schedule.phases.findLast(phase => phase.at <= hour);
}

// The clock selects an activity; movement still happens one tile at a time.
// Only explicit, public, bidirectional doors can connect a routine's areas.
class NpcSchedule {
    constructor(behavior, routine) {
        this.behavior = behavior;
        this.routine = routine;
        this.definition = routine.definition.schedule;
        this.room = 'outside';
        this.phase = null;
        this.override = null;
        this.buildings = new Map(this.definition.buildings.map(building => [building.key, building]));
        const doors = Object.values(behavior.world.map.doors || {});
        const publicDoor = door => door && !['tmap', 'tnft', 'ttid', 'tcollection', 'tevent', 'thttp_redirect'].some(key => door[key] !== undefined);
        for (const building of this.buildings.values()) {
            const entrance = doors.find(d => same(d, building.entrance));
            const exit = doors.find(d => same(d, building.exit));
            if (!publicDoor(entrance) || !publicDoor(exit) || !same({x: entrance.tx, y: entrance.ty}, building.exit) ||
                !same({x: exit.tx, y: exit.ty}, building.entrance) ||
                !behavior.walkable(building.entrance, true) || !behavior.walkable(building.exit, true)) throw new Error('NPC schedule needs a public return door: ' + building.key);
            building.entryDoor = entrance;
            building.exitDoor = exit;
        }
        if (this.definition.phases.some(phase => phase.route.some(p => !behavior.walkable(p)))) throw new Error('Blocked NPC schedule waypoint: ' + routine.definition.key);
    }

    area() { return this.room === 'outside' ? this.routine.definition.area : this.buildings.get(this.room).area; }

    prepare(time) {
        const phase = phaseAt(this.definition, this.behavior.worldTime());
        const override = this.routine.scheduleOverride || null;
        if (phase !== this.phase || override !== this.override) {
            this.phase = phase;
            this.override = override;
            this.routine.path = [];
            this.routine.waypoint = 0;
            this.routine.nextStep = time;
            this.routine.blockedSince = 0;
        }
        const activity = override ? 'picnic' : phase.key;
        const location = override ? 'the picnic south of the market' : phase.label;
        this.behavior.state(this.routine, {schedule: activity, scheduleLocation: location});
    }

    destination() {
        const targetRoom = this.override ? 'outside' : this.phase.location;
        if (targetRoom !== this.room) {
            const leaving = this.room !== 'outside';
            const building = this.buildings.get(leaving ? this.room : targetRoom);
            return {...(leaving ? building.exit : building.entrance), portal: leaving ? building.exitDoor : building.entryDoor,
                room: leaving ? 'outside' : targetRoom};
        }
        return (this.override ? this.routine.definition.route : this.phase.route)[this.routine.waypoint];
    }

    cross(destination) {
        const target = {x: destination.portal.tx, y: destination.portal.ty};
        if (!this.behavior.walkable(destination, true) || !this.behavior.walkable(target, true) ||
            this.behavior.occupied(target, this.routine.npc)) return false;
        this.behavior.move(this.routine, target, true);
        this.room = destination.room;
        return true;
    }

    routeLength() { return (this.override ? this.routine.definition.route : this.phase.route).length; }
    sleeping() { return !this.override && this.phase?.key === 'sleep' && this.room === this.phase.location; }
    travelActivity() { return this.override ? 'walking to the picnic' : this.phase.travelling; }

    canReachOutside(destination) {
        if (this.room === 'outside') return this.behavior.findPath(this.routine, destination).length > 0 || same(this.routine.npc, destination);
        const building = this.buildings.get(this.room);
        return (same(this.routine.npc, building.exit) || this.behavior.findPath(this.routine, {...building.exit, portal: building.exitDoor}).length > 0) &&
            this.behavior.findPath(this.routine, destination, {start: building.entrance, area: this.routine.definition.area}).length > 0;
    }

    describe() {
        const phase = this.phase || phaseAt(this.definition, this.behavior.worldTime());
        const plan = this.definition.phases.map(p => String(p.at).padStart(2, '0') + ':00 — ' + p.activity + ' at ' + p.label).join('<br>');
        const current = this.override ? 'I am taking a break for our picnic. Afterwards I will return to my usual day.' :
            this.sleeping() ? 'You woke me, but I can spare a moment. ' + phase.explanation : phase.explanation;
        return current + '<br><br>' + plan + '<br><br>If you need me for a quest, you can still talk to me indoors. I will stop to listen, then carry on.';
    }
}
module.exports = {NpcSchedule, validateSchedule, phaseAt};
