const {loadCatalog, flag, visitFlag, project} = require('./fieldguidecatalog');
const {FieldGuideStore} = require('./fieldguidestore');
const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');

class FieldGuide {
    constructor(sessions, worlds, platform, options = {}) {
        this.sessions = sessions; this.worlds = worlds; this.platform = platform;
        this.catalog = options.catalog || loadCatalog(Types, Lakes);
        this.store = options.store || new FieldGuideStore(platform);
        this.store.onSaved = (nftId, choice) => {
            for (const id of this.sessions.keys()) {
                const session = this.sessions.get(id);
                if (session?.nftId !== nftId || session.f2p || !session.gameData) continue;
                session.gameData.fieldGuide = [...new Set([...(session.gameData.fieldGuide || []), choice])];
                this.sessions.set(id, session);
                const player = this.worlds()[session.mapId]?.getPlayerById(session.entityId);
                if (player) this.remember(player, [choice]);
            }
        };
        this.jobs = new Map();
        this.known = new WeakMap();
        this.shopLoads = new Map();
        this.makeEntry = require('./fieldguidemapcatalog').entryFactory(Types, Lakes, require('./properties'));
        this.indexEntries();
    }
    indexEntries() {
        this.entries = [...new Map(Object.values(this.catalog.maps).flatMap(map => map.entries).map(entry => [entry.id, entry])).values()];
        this.byTarget = new Map();
        for (const entry of this.entries) for (const target of [entry.target, Types.getKindFromString(entry.target)]) {
            if (target === undefined) continue;
            const key = String(target), entries = this.byTarget.get(key) || new Set();
            entries.add(entry); this.byTarget.set(key, entries);
        }
    }
    async loadShops(map) {
        const collection = this.catalog.maps[map];
        if (!collection?.shops?.length) return;
        const cached = this.shopLoads.get(map);
        if (cached && Date.now() - cached.time < 300000) return cached.promise;
        const load = {time: Date.now()};
        load.promise = Promise.all(collection.shops.map(shop => this.platform.getShopInventory(shop))).then(stocks => {
            if (stocks.some(stock => !Array.isArray(stock))) throw new Error('Map shop inventory unavailable');
            const entries = new Map(collection.entries.filter(entry => !entry.shopOnly).map(entry => [entry.id, entry]));
            for (const stock of stocks) for (const item of stock) {
                const entry = this.makeEntry(item.item);
                if (entry && !entries.has(entry.id)) entries.set(entry.id, {...entry, shopOnly: true});
            }
            collection.entries = [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
            this.indexEntries();
        }).catch(error => {this.shopLoads.delete(map); throw error;});
        this.shopLoads.set(map, load);
        return load.promise;
    }
    context(sessionId) {
        const session = this.sessions.get(sessionId);
        const player = session && this.worlds()[session.mapId]?.getPlayerById(session.entityId);
        return player && player.hasEnteredGame && !player.isBot?.() && player.sessionId === sessionId && player.nftId === session.nftId && player.walletId === session.walletId && player.mapId === session.mapId ? {session, player} : null;
    }
    remember(player, facts) {
        const known = this.known.get(player) || new Set();
        for (const fact of facts) known.add(fact);
        this.known.set(player, known);
    }
    facts(session) {
        const player = this.worlds()[session.mapId]?.getPlayerById(session.entityId);
        const known = player?.nftId === session.nftId ? this.known.get(player) || [] : [];
        return new Set([...(session.gameData?.fieldGuide || []), ...known, ...(session.f2p ? [] : this.store.facts(session.nftId))]);
    }
    serial(player, work) {
        const key = player.nftId, previous = this.jobs.get(key) || Promise.resolve();
        const next = previous.catch(() => {}).then(work); this.jobs.set(key, next);
        return next.finally(() => {if (this.jobs.get(key) === next) this.jobs.delete(key);});
    }
    async save(player, choices, session = this.context(player.sessionId)?.session) {
        if (!session) return [];
        const facts = this.facts(this.context(player.sessionId)?.session || session);
        const missing = [...new Set(choices)].filter(choice => !facts.has(choice));
        if (missing.length && !session.f2p) await this.store.add(player.nftId, missing);
        this.remember(player, choices);
        // Merge after disk I/O without overwriting concurrent quest/inventory updates.
        const current = this.context(player.sessionId);
        if (current?.player === player) {
            current.session.gameData.fieldGuide = [...new Set([...(current.session.gameData.fieldGuide || []), ...choices])];
            this.sessions.set(player.sessionId, current.session);
        }
        return missing;
    }
    record(player, event, target, amount = 1) {
        if (this.closing || !(amount > 0) || !player || player.isBot?.()) return Promise.resolve();
        // Preserve earned facts even before a shop's stock has been loaded, or
        // before this registered target is added to a map's exported content.
        const definition = this.byTarget.has(String(target)) ? null : this.makeEntry(target);
        const entries = this.byTarget.get(String(target)) || (definition && new Set([definition]));
        if (!entries) return Promise.resolve();
        const session = this.context(player.sessionId)?.session;
        if (!session) return Promise.resolve();
        const choices = [];
        for (const entry of entries) {
            if (entry.visibility === 'excluded') continue;
            const acquisition = ['obtain', 'loot', 'catch'].includes(event) && entry.category !== 'monsters';
            const combat = ['encounter', 'defeat'].includes(event) && entry.category === 'monsters';
            if (!acquisition && !combat) continue;
            choices.push(flag(entry.id, 'discovered'));
            if (entry.completion === event || entry.completion === 'obtain' && acquisition) choices.push(flag(entry.id, 'completed'));
        }
        const facts = this.facts(session);
        if (choices.every(choice => facts.has(choice))) return Promise.resolve();
        return this.serial(player, async () => {
            const missing = await this.save(player, choices, session);
            const found = [...entries].filter(entry => missing.includes(flag(entry.id, 'discovered')) || missing.includes(flag(entry.id, 'completed')));
            if (found.length && this.context(player.sessionId)?.player === player) {
                const entry = found[0], completed = missing.includes(flag(entry.id, 'completed'));
                const first = missing.includes(flag(entry.id, 'discovered'));
                player.send([Types.Messages.NOTIFY, (first ? 'New discovery: ' : '') + entry.name + (completed ? ' — ' + {obtain: 'collected', loot: 'looted', catch: 'caught', defeat: 'defeated'}[entry.completion] : '')]);
            }
        });
    }
    observe(player, event, target, amount = 1) {
        this.record(player, event, target, amount).catch(error => console.error('[field-guide] Progress could not be recorded:', error.message));
    }
    visit(player) {return this.serial(player, () => this.save(player, [visitFlag(player.mapId)]));}
    reconcile(player) {
        return this.serial(player, async () => {
            let context = this.context(player.sessionId);
            if (!context) return;
            if (!context.session.f2p && (!context.session.fieldGuideLoaded || !Array.isArray(context.session.gameData.fieldGuide))) {
                const facts = await this.platform.getFieldGuide(player.nftId);
                context = this.context(player.sessionId);
                if (!context || context.player !== player) return;
                context.session.gameData.fieldGuide = [...new Set([...(context.session.gameData.fieldGuide || []), ...facts])];
                this.remember(player, facts);
                context.session.fieldGuideLoaded = true;
                this.sessions.set(player.sessionId, context.session);
            }
            const choices = [visitFlag(player.mapId)], data = context.session.gameData;
            for (const entry of this.entries) {
                if (entry.visibility === 'excluded') continue;
                const kind = Types.getKindFromString(entry.target);
                const owned = Number(data.items?.[entry.category === 'fish' ? entry.target : kind]) > 0;
                const defeated = entry.category === 'monsters' && Number(data.mobKills?.[kind]) > 0;
                if (owned && entry.category !== 'monsters' || defeated) choices.push(flag(entry.id, 'discovered'));
                if (owned && entry.completion === 'obtain' || defeated) choices.push(flag(entry.id, 'completed'));
            }
            await this.save(player, choices);
        });
    }
    async list(req, res) {
        res.set?.('Cache-Control', 'no-store');
        const initial = this.context(req.params.sessionId);
        if (!initial) return res.status(401).json({error: 'Your game session is no longer active.'});
        const initialMap = initial.player.mapId, map = req.query?.map || initialMap;
        if (typeof map !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(map)) return res.status(400).json({error: 'Invalid map.'});
        try {
            if (this.closing) throw new Error('Field Guide is shutting down');
            if (this.store.error && !initial.session.f2p) throw this.store.error;
            await this.loadShops(map);
            await this.reconcile(initial.player);
            const current = this.context(req.params.sessionId);
            if (!current || current.player !== initial.player || current.player.mapId !== initialMap) return res.status(409).json({error: 'Your map changed. Reopen the Field Guide.'});
            const facts = this.facts(current.session);
            if (!facts.has(visitFlag(map))) return res.status(403).json({error: 'Explore this map before opening its Field Guide.'});
            const collection = this.catalog.maps[map] || {edition: '1', entries: []};
            return res.json({map, maps: [...new Set([current.player.mapId, ...[...facts].filter(value => value.startsWith('field-guide:map:')).map(value => value.slice('field-guide:map:'.length))])],
                temporary: !!current.session.f2p, ...project(collection, facts)});
        } catch (error) {
            console.error('[field-guide]', error.message);
            return res.status(503).json({error: 'Your Field Guide is temporarily unavailable. Please retry.'});
        }
    }
    async close() {
        this.closing = true;
        await Promise.allSettled([...this.jobs.values()]);
        await this.store.close();
    }
}
module.exports = {FieldGuide};
