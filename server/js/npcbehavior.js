const Types = require('../../shared/js/gametypes');
const Messages = require('./message');
const WorldTime = require('../../client/js/worldtime-worker');
const {NpcSchedule, validateSchedule} = require('./npcschedule');
const {definitions} = require('./worlddefinitions');

const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const inside = (point, area) => !area || (point.x >= area.x && point.y >= area.y &&
    point.x < area.x + area.width && point.y < area.y + area.height);
const pointKey = point => point.x + ',' + point.y;

function validateConfig(config) {
    if (typeof config.enabled !== 'boolean' || !Array.isArray(config.npcs)) throw new Error('Invalid NPC behaviour config');
    const keys = new Set();
    for (const npc of config.npcs) {
        if (!npc.key || keys.has(npc.key) || !Types.isNpc(Types.getKindFromString(npc.kind)) ||
            !npc.area || !['x', 'y', 'width', 'height'].every(key => Number.isInteger(npc.area[key])) ||
            npc.area.width < 1 || npc.area.height < 1 || !inside(npc.origin || {}, npc.area) ||
            !Number.isInteger(npc.origin?.x) || !Number.isInteger(npc.origin?.y) ||
            !Array.isArray(npc.route) || !npc.route.length ||
            npc.route.some(p => !Number.isInteger(p.x) || !Number.isInteger(p.y) || !inside(p, npc.area) ||
                !Number.isFinite(p.waitSeconds) || p.waitSeconds < 1 ||
                (p.line && (typeof p.line !== 'string' || p.line.length > 240 || /[<>]/.test(p.line))) ||
                (p.sound && !['watersplash', 'honk', 'npc'].includes(p.sound))) ||
            !Number.isFinite(npc.stepMs) || npc.stepMs < 300 || npc.stepMs > 2000 ||
            (npc.preserveDialogue !== undefined && typeof npc.preserveDialogue !== 'boolean') ||
            !['patrol', 'work', 'socialise'].includes(npc.preset)) {
            throw new Error('Invalid NPC routine: ' + npc.key);
        }
        validateSchedule(npc);
        keys.add(npc.key);
        for (const rule of npc.reactions || []) {
            if (!rule.when || !Object.keys(rule.when).length ||
                Object.entries(rule.when).some(([key, value]) => !['questCompleted', 'choice', 'memory'].includes(key) ||
                    typeof value !== 'string' || !value || value.length > 100) || !rule.lines) {
                throw new Error('Invalid NPC memory reaction: ' + npc.key);
            }
        }
        for (const lines of [npc.lines || {}, ...(npc.reactions || []).map(rule => rule.lines)].flatMap(lines => Object.values(lines))) {
            if (!Array.isArray(lines) || lines.some(line => typeof line !== 'string' || line.length > 240 || /[<>]/.test(line))) {
                throw new Error('NPC lines must be short plain text: ' + npc.key);
            }
        }
    }
    for (const scene of config.conversations || []) {
        if ((scene.hours && (!Array.isArray(scene.hours) || scene.hours.length !== 2 || scene.hours.some(hour => !Number.isFinite(hour) || hour < 0 || hour >= 24) || scene.hours[0] === scene.hours[1])) || !Number.isFinite(scene.cooldownSeconds) || scene.cooldownSeconds < 20 || !scene.steps?.length ||
            scene.steps.some(step => !keys.has(step.npc) || typeof step.text !== 'string' ||
                step.text.length > 240 || /[<>]/.test(step.text))) throw new Error('Invalid NPC conversation');
    }
    const ambience = config.ambience;
    if (ambience && (!ambience.scene || !Number.isFinite(ambience.cycleSeconds) || ambience.cycleSeconds < 60 ||
        !Number.isFinite(ambience.nightOpacity) || ambience.nightOpacity < 0 || ambience.nightOpacity > 0.45 ||
        !Number.isInteger(ambience.particleCount) || ambience.particleCount < 0 || ambience.particleCount > 24 ||
        (ambience.mode && !['day', 'night', 'cycle'].includes(ambience.mode)) ||
        !['fireflies', 'leaves', 'none'].includes(ambience.particles))) throw new Error('Invalid world ambience');
    if (ambience?.areas && (typeof ambience.areas !== 'object' || Array.isArray(ambience.areas) ||
        Object.entries(ambience.areas).some(([scene, effects]) => !scene || !Array.isArray(effects) ||
            effects.length > 3 || effects.some(effect => !['fireflies', 'leaves', 'pollen', 'dust', 'gusts', 'spray', 'sand', 'embers', 'ash', 'mist'].includes(effect.type) ||
                !Number.isInteger(effect.count) || effect.count < 1 || effect.count > 24) ||
            effects.reduce((total, effect) => total + effect.count, 0) > 24))) throw new Error('Invalid area ambience');
    if (config.speech && (!Number.isFinite(config.speech.cooldownSeconds) || config.speech.cooldownSeconds < 10 ||
        !Number.isFinite(config.speech.radius) || config.speech.radius < 8 ||
        !Number.isFinite(config.speech.greetingCooldownSeconds) || config.speech.greetingCooldownSeconds < 90)) {
        throw new Error('Invalid NPC speech limits');
    }
    return config;
}

function loadConfig(mapId) {
    if (process.env.NPC_BEHAVIORS === 'off') return null;
    try {
        const source = definitions.behavior(mapId);
        if (!source) return null;
        const config = validateConfig(JSON.parse(JSON.stringify(source)));
        return config.enabled ? config : null;
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Could not load NPC behaviours for ' + mapId + ': ' + error.message);
        return null;
    }
}

class NpcBehavior {
    constructor(world, config, memory, now = Date.now, clock = () => performance.now()) {
        this.world = world;
        this.config = validateConfig(config);
        this.memory = memory;
        this.now = now;
        this.clock = clock;
        this.mapId = world.id.replace(/^world_/, '');
        this.routines = new Map();
        this.playerStates = new Map();
        this.lastTick = 0;
        this.conversation = null;
        this.conversationCursor = 0;
        this.nextConversation = now() + 20000;
        this.recentSpeech = [];
        for (const definition of config.npcs) this.registerRoutine(definition);
    }

    registerRoutine(definition) {
        validateConfig({enabled: true, npcs: [definition]});
        if (this.routines.has(definition.key)) return false;
        const npc = Object.values(this.world.npcs).find(entity => entity.kind === Types.getKindFromString(definition.kind) &&
            entity.x === definition.origin.x && entity.y === definition.origin.y);
        if (!npc || definition.route.some(p => !this.walkable(p))) {
            console.warn('Skipping NPC routine with missing NPC or blocked waypoint: ' + definition.key);
            return false;
        }
        const routine = {definition, npc, waypoint: 0, path: [], nextStep: this.now() + 2000,
            pauseUntil: 0, speechUntil: 0, lastReaction: 0, lineIndexes: {}, blockedSince: 0, listeners: new Map()};
        npc.behaviorState = {key: definition.key, label: definition.label, preset: definition.preset,
            activity: 'resting', orientation: Types.Orientations.DOWN, moveSpeed: definition.stepMs - 100};
        if (definition.schedule) {
            try { routine.schedule = new NpcSchedule(this, routine); }
            catch (error) { console.warn(error.message); return false; }
        }
        this.routines.set(definition.key, routine);
        return true;
    }

    walkable(point, allowDoor = false) {
        const map = this.world.map;
        return !map.isOutOfBounds(point.x, point.y) && !map.isColliding(point.x, point.y) &&
            (allowDoor || !Object.values(map.doors || {}).some(door => door.x === point.x && door.y === point.y));
    }

    occupied(point, npc) {
        return Object.values(this.world.entities).some(entity => entity !== npc &&
            ['npc', 'player', 'mob', 'chest'].includes(entity.type) && entity.x === point.x && entity.y === point.y);
    }

    findPath(routine, destination, options = {}) {
        const start = options.start || routine.npc;
        const area = options.area || routine.schedule?.area() || routine.definition.area;
        const occupied = new Set(Object.values(this.world.entities).filter(entity => entity !== start &&
            ['npc', 'player', 'mob', 'chest'].includes(entity.type)).map(pointKey));
        const queue = [{x: start.x, y: start.y}];
        const parents = new Map([[pointKey(start), null]]);
        for (let index = 0; index < queue.length && index < 2500; index++) {
            const current = queue[index];
            if (distance(current, destination) === 0) {
                const route = [];
                let node = current;
                while (parents.get(pointKey(node))) {
                    route.unshift(node);
                    node = parents.get(pointKey(node));
                }
                return route;
            }
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const next = {x: current.x + dx, y: current.y + dy};
                if (parents.has(pointKey(next)) || !inside(next, area) ||
                    !this.walkable(next, Boolean(destination.portal) && distance(next, destination) === 0) || occupied.has(pointKey(next))) continue;
                parents.set(pointKey(next), current);
                queue.push(next);
            }
        }
        return [];
    }

    state(routine, changes) {
        const next = {...routine.npc.behaviorState, ...changes};
        if (JSON.stringify(next) === JSON.stringify(routine.npc.behaviorState)) return;
        routine.npc.behaviorState = next;
        this.world.pushToAdjacentGroups(routine.npc.group, new Messages.NpcState(routine.npc));
    }

    face(routine, target) {
        const dx = target.x - routine.npc.x, dy = target.y - routine.npc.y;
        this.state(routine, {orientation: Math.abs(dx) > Math.abs(dy) ?
            (dx < 0 ? Types.Orientations.LEFT : Types.Orientations.RIGHT) :
            (dy < 0 ? Types.Orientations.UP : Types.Orientations.DOWN)});
    }

    hasFact(routine, player, type, value) {
        if (type === 'memory') return this.memory.has(this.mapId, routine.definition.key, player, value);
        const data = this.world.server.cache.get(player.sessionId)?.gameData || {};
        const known = type === 'choice' ? (data.choices || []).includes(value) :
            ['COMPLETED', 'FINISHED'].some(status => (data.quests?.[status] || []).some(quest => (quest.questKey || quest.id) === value));
        if (known) this.remember(routine, player, type + ':' + value);
        return known || this.memory.has(this.mapId, routine.definition.key, player, type + ':' + value);
    }

    line(routine, type, player) {
        let lines = routine.definition.lines?.[type] || [];
        let variant = type;
        if (player) {
            for (const [index, rule] of (routine.definition.reactions || []).entries()) {
                if (rule.lines[type]?.length && Object.entries(rule.when).every(([fact, value]) => this.hasFact(routine, player, fact, value))) {
                    lines = rule.lines[type];
                    variant = type + ':' + index;
                }
            }
        }
        const index = routine.lineIndexes[variant] || 0;
        routine.lineIndexes[variant] = index + 1;
        return lines.length ? lines[index % lines.length] : null;
    }

    remember(routine, player, flag) {
        try {
            this.memory.remember(this.mapId, routine.definition.key, player, flag);
        } catch (error) {
            // Persistence trouble must not interrupt the world's movement/queues.
            if (!this.lastMemoryError || this.now() - this.lastMemoryError > 60000) {
                console.error('Could not persist NPC recognition: ' + (error.code || error.message));
                this.lastMemoryError = this.now();
            }
        }
    }

    canSpeak(routine, time) {
        const radius = this.config.speech?.radius || 14;
        const cooldown = (this.config.speech?.cooldownSeconds || 18) * 1000;
        this.recentSpeech = this.recentSpeech.filter(speech => time - speech.time < cooldown);
        if (this.recentSpeech.some(speech => distance(speech, routine.npc) <= radius)) return false;
        if ([...this.routines.values()].some(actor => actor.npc.behaviorState.activity === 'talking' &&
            time < actor.speechUntil && distance(actor.npc, routine.npc) <= radius)) return false;
        return !this.conversation || !this.conversation.definition.steps.some(step => {
            const actor = this.routines.get(step.npc);
            return actor && distance(actor.npc, routine.npc) <= radius;
        });
    }

    speak(routine, text, player, conversationLine = false) {
        if (!text || (!conversationLine && !this.canSpeak(routine, this.now()))) return false;
        const listeners = player ? [player] : this.nearbyPlayers(routine.npc, 12);
        if (!listeners.length) return false;
        const time = this.now();
        routine.speechUntil = time + 6000;
        routine.pauseUntil = Math.max(routine.pauseUntil, time + 6000);
        const message = new Messages.Chat(routine.npc, text, true);
        for (const listener of listeners) this.world.pushToPlayer(listener, message);
        this.recentSpeech.push({x: routine.npc.x, y: routine.npc.y, time});
        return true;
    }

    nearbyPlayers(point, range) {
        return Object.values(this.world.players).filter(player => player.hasEnteredGame &&
            !player.isDead && !player.isBot() && distance(player, point) <= range);
    }

    tick() {
        const time = this.now();
        if (time - this.lastTick < 200) return;
        this.lastTick = time;
        const players = Object.values(this.world.players).filter(player => player.hasEnteredGame && !player.isBot());
        const ids = new Set(players.map(player => player.id));
        for (const id of this.playerStates.keys()) if (!ids.has(id)) this.playerStates.delete(id);
        for (const routine of this.routines.values()) {
            this.maintainListeners(routine, time);
            if (routine.schedule && players.length && time >= routine.pauseUntil) routine.schedule.prepare(time);
        }
        this.tickConversation(time);
        for (const player of players) this.observePlayer(player, time);
        for (const routine of this.routines.values()) {
            if (this.world.entities[routine.npc.id] !== routine.npc) continue;
            if (time < routine.pauseUntil) continue;
            if (!(routine.schedule ? players.length : players.some(player => inside(player, routine.definition.area))) || time < routine.nextStep) continue;
            this.advance(routine, time);
        }
    }

    worldTime() {
        return WorldTime.previewTime(this.config.ambience?.previewTimeMode, this.clock(), this.config.ambience?.previewHour);
    }

    decorateDialogue(npc, node) {
        const schedule = this.routines.get(npc.behaviorState?.key)?.schedule;
        if (schedule && node.npcContext) node.text = schedule.describe() + (node.text ? '<br><br>' + node.text : '');
        return node;
    }

    canReach(routine, destination) {
        return routine.schedule ? routine.schedule.canReachOutside(destination) :
            distance(routine.npc, destination) === 0 || this.findPath(routine, destination).length > 0;
    }

    ambienceFor(player) {
        const config = this.config.ambience;
        if (!config) return null;
        const scene = this.world.map.getSceneAt?.(player.x, player.y);
        const {areas, ...common} = config;
        const effects = areas ? areas[scene?.name] || [] : scene?.name === config.scene ? [{type: config.particles, count: config.particleCount}] : [];
        const bounds = scene && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(scene[key])) ?
            {x: scene.x * 16, y: scene.y * 16, width: scene.w * 16, height: scene.h * 16} : null;
        return {...common, scene: scene?.name || '', sceneId: scene?.id, effects, bounds,
            particles: effects[0]?.type || 'none', particleCount: effects[0]?.count || 0};
    }

    observePlayer(player, time) {
        let state = this.playerStates.get(player.id);
        if (!state) { state = {near: new Set(), greeted: new Map(), ambience: undefined}; this.playerStates.set(player.id, state); }
        const ambience = this.ambienceFor(player);
        const active = Boolean(ambience?.effects.length);
        const ambienceKey = JSON.stringify(ambience);
        const features = this.world.scenes?.packet(player) || {};
        const snapshot = JSON.stringify([ambienceKey, features]);
        if (state.snapshot !== snapshot) {
            this.world.pushToPlayer(player, new Messages.WorldAmbience(ambience || Object.keys(features).length ?
                {...ambience, ...features, epoch: 0, serverTime: time} : null));
            state.snapshot = snapshot;
        }
        state.ambience = active;
        state.ambienceKey = ambienceKey;
        for (const [key, routine] of this.routines) {
            if (this.world.entities[routine.npc.id] !== routine.npc || routine.schedule?.sleeping()) continue;
            if (distance(player, routine.npc) > 3) { state.near.delete(key); continue; }
            if (state.near.has(key)) continue;
            if (time < routine.speechUntil || time < routine.pauseUntil || !this.canSpeak(routine, time) ||
                time - (state.greeted.get(key) || 0) < (this.config.speech?.greetingCooldownSeconds || 180) * 1000) continue;
            const seen = this.memory.has(this.mapId, key, player, 'met');
            const text = this.line(routine, seen ? 'return' : 'greeting', player);
            if (!text) continue;
            this.remember(routine, player, 'met');
            state.near.add(key);
            state.greeted.set(key, time);
            this.face(routine, player);
            this.speak(routine, text, player);
        }
    }


    advance(routine, time) {
        const destination = routine.schedule?.destination() || routine.definition.route[routine.waypoint];
        if (distance(routine.npc, destination) === 0) {
            if (destination.portal) {
                if (routine.schedule.cross(destination)) routine.path = [];
                routine.nextStep = time + 1000;
                return;
            }
            this.state(routine, {activity: routine.schedule && !routine.schedule.override ? routine.schedule.phase.activity : destination.activity || 'resting'});
            routine.nextStep = time + destination.waitSeconds * 1000;
            routine.waypoint = (routine.waypoint + 1) % (routine.schedule?.routeLength() || routine.definition.route.length);
            routine.path = [];
            routine.blockedSince = 0;
            if (destination.line) this.speak(routine, destination.line);
            if (destination.sound) {
                for (const player of this.nearbyPlayers(routine.npc, 8)) this.world.pushToPlayer(player, new Messages.Sound(destination.sound));
            }
            return;
        }
        if (!routine.path.length) routine.path = this.findPath(routine, destination);
        const next = routine.path[0];
        if (!next || distance(routine.npc, next) !== 1 || !this.walkable(next, Boolean(destination.portal) && distance(next, destination) === 0) || this.occupied(next, routine.npc)) {
            routine.path = [];
            routine.nextStep = time + 2000;
            routine.blockedSince ||= time;
            if (!routine.schedule && time - routine.blockedSince > 20000) {
                routine.waypoint = (routine.waypoint + 1) % (routine.schedule?.routeLength() || routine.definition.route.length);
                routine.blockedSince = 0;
            }
            return;
        }
        this.face(routine, next);
        this.state(routine, {activity: routine.schedule?.travelActivity() || 'walking'});
        this.move(routine, next);
        routine.path.shift();
        routine.nextStep = time + routine.definition.stepMs;
        routine.blockedSince = 0;
    }

    move(routine, next, teleport = false) {
        this.world.moveNpc(routine.npc, next.x, next.y, teleport);
        // Remove the moving NPC for clients that can no longer see its new group.
        for (const group of routine.npc.recentlyLeftGroups || []) {
            this.world.pushToGroup(group, new Messages.Destroy(routine.npc));
        }
        routine.npc.recentlyLeftGroups = [];
    }

    listen(player, entityId, active = true) {
        const routine = [...this.routines.values()].find(entry => entry.npc.id === Number(entityId) &&
            this.world.entities[entry.npc.id] === entry.npc);
        if (!routine || this.world.players[player.id] !== player) return false;
        if (active && (!player.hasEnteredGame || player.isDead || player.isBot() || distance(player, routine.npc) > 5)) return false;
        if (active) {
            routine.listeners.set(player.id, this.now() + 15000);
            this.face(routine, player);
        } else routine.listeners.delete(player.id);
        this.maintainListeners(routine, this.now());
        return true;
    }

    maintainListeners(routine, time) {
        for (const [id, expires] of routine.listeners) {
            const player = this.world.players[id];
            if (expires <= time || !player?.hasEnteredGame || player.isDead || player.isBot() || distance(player, routine.npc) > 5) {
                routine.listeners.delete(id);
            }
        }
        if (routine.listeners.size) {
            routine.listening = true;
            routine.pauseUntil = Math.max(routine.pauseUntil, time + 1000);
            routine.speechUntil = routine.pauseUntil;
            this.state(routine, {activity: 'talking'});
        } else if (routine.listening) {
            routine.listening = false;
            routine.pauseUntil = Math.min(routine.pauseUntil, time);
            routine.speechUntil = Math.min(routine.speechUntil, time);
            this.state(routine, {activity: 'resting'});
        }
    }

    interact(player, kind, entityId) {
        const routine = [...this.routines.values()].find(entry => entry.npc.kind === Number(kind) &&
            this.world.entities[entry.npc.id] === entry.npc &&
            (!entityId || entry.npc.id === Number(entityId)) && distance(player, entry.npc) <= 5);
        if (!routine) return null;
        const time = this.now();
        routine.pauseUntil = Math.max(routine.pauseUntil, time + 20000);
        routine.speechUntil = time + 20000;
        this.face(routine, player);
        this.state(routine, {activity: 'talking'});
        const seen = this.memory.has(this.mapId, routine.definition.key, player, 'met');
        this.remember(routine, player, 'met');
        const state = this.playerStates.get(player.id);
        if (state) {
            state.near.add(routine.definition.key);
            state.greeted.set(routine.definition.key, time);
        }
        if (routine.definition.preserveDialogue) return null;
        const quests = this.world.server.cache.get(player.sessionId)?.gameData?.quests || {};
        const helped = this.memory.has(this.mapId, routine.definition.key, player, 'helped') ||
            ['COMPLETED', 'FINISHED'].some(status => (quests[status] || []).some(quest =>
                routine.definition.questIds?.includes(quest.questKey || quest.id)));
        if (helped && routine.definition.lines?.quest?.length) return {text: this.line(routine, 'quest', player)};
        const text = this.line(routine, seen ? 'talk' : 'greeting', player) || this.line(routine, 'talk', player);
        return text ? {text} : null;
    }

    react(type, player, data) {
        const time = this.now();
        const position = data?.mob || player;
        for (const routine of this.routines.values()) {
            if (this.world.entities[routine.npc.id] !== routine.npc) continue;
            if (type === 'quest') {
                if (!routine.definition.questIds?.includes(data.quest.id)) continue;
                this.remember(routine, player, 'helped');
                this.remember(routine, player, 'questCompleted:' + data.quest.id);
            }
            if (routine.schedule?.sleeping()) continue;
            if (distance(routine.npc, player) > 12 || distance(routine.npc, position) > 12 || time < routine.pauseUntil || time - routine.lastReaction < 30000 ||
                !this.canSpeak(routine, time)) continue;
            if (type === 'kill' && routine.definition.mobKinds?.length && !routine.definition.mobKinds.includes(Types.getKindAsString(data.mob.kind))) continue;
            const text = this.line(routine, type, player);
            if (!text) continue;
            routine.lastReaction = time;
            this.face(routine, player);
            this.speak(routine, text, player);
        }
    }

    tickConversation(time) {
        if (this.conversation) {
            const conversation = this.conversation;
            if (time < conversation.nextLine) return;
            const actors = [...new Set(conversation.definition.steps.map(step => this.routines.get(step.npc)))];
            if (actors.some(actor => !actor || actor.schedule?.sleeping() || this.world.entities[actor.npc.id] !== actor.npc ||
                (actor.npc.behaviorState.activity === 'talking' && time < actor.pauseUntil))) {
                this.conversation = null;
                for (const actor of actors) {
                    if (actor && actor.npc.behaviorState.activity !== 'talking') actor.pauseUntil = Math.min(actor.pauseUntil, time + 2000);
                }
                return;
            }
            const step = conversation.definition.steps[conversation.index];
            const routine = this.routines.get(step.npc);
            if (!routine || this.nearbyPlayers(routine.npc, 12).length === 0 ||
                (routine.npc.behaviorState.activity === 'talking' && time < routine.pauseUntil)) {
                this.conversation = null;
                return;
            }
            this.state(routine, {activity: 'socialising'});
            const partner = actors.find(actor => actor !== routine);
            if (partner) this.face(routine, partner.npc);
            this.speak(routine, step.text, null, true);
            conversation.index++;
            conversation.nextLine = time + 6000;
            if (conversation.index === conversation.definition.steps.length) this.conversation = null;
            return;
        }
        if (time < this.nextConversation) return;
        this.nextConversation = time + 10000;
        const definitions = this.config.conversations || [];
        for (let offset = 0; offset < definitions.length; offset++) {
            const index = (this.conversationCursor + offset) % definitions.length;
            const definition = definitions[index];
            if (definition.hours) {
                const hour = ((this.worldTime() % WorldTime.duration) + WorldTime.duration) % WorldTime.duration / WorldTime.duration * 24;
                const [start, end] = definition.hours;
                if (!(start < end ? hour >= start && hour < end : hour >= start || hour < end)) continue;
            }
            const actors = [...new Set(definition.steps.map(step => this.routines.get(step.npc)))];
            if (actors.some(actor => !actor || actor.schedule?.sleeping() || this.world.entities[actor.npc.id] !== actor.npc ||
                time < actor.pauseUntil || !this.nearbyPlayers(actor.npc, 12).length) ||
                actors.some(actor => distance(actor.npc, actors[0].npc) > 8) || !this.canSpeak(actors[0], time)) continue;
            this.conversation = {definition, index: 0, nextLine: time};
            const pauseUntil = time + definition.steps.length * 6000;
            for (const actor of actors) actor.pauseUntil = pauseUntil;
            this.nextConversation = time + definition.cooldownSeconds * 1000;
            this.conversationCursor = (index + 1) % definitions.length;
            break;
        }
    }
}

module.exports = {NpcBehavior, loadConfig, validateConfig};
