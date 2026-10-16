#!/usr/bin/env node
// Freeze this output in a platform migration; never read a mutable catalog during migration.
global.Types = {};
const Types = require('../shared/js/gametypes');
const Lakes = require('../server/js/lakes');
const Properties = require('../server/js/properties');
const {entryFactory} = require('../server/js/fieldguidemapcatalog');
const makeEntry = entryFactory(Types, Lakes, Properties);
const rows = new Map();
function add(raw) {
    const entry = makeEntry(raw);
    if (!entry || entry.visibility === 'excluded') return;
    const aliases = [String(raw), entry.target, Types.getKindFromString(entry.target)].filter(value => value !== undefined);
    for (const target of aliases) {
        const row = {entry_id: entry.id, target: String(target), category: entry.category, completion: entry.completion};
        rows.set(row.entry_id + ':' + row.target, row);
    }
}
// Include registered inventory types as shop stock is supplied by the platform.
Types.forEachKind((kind, name) => {if (!name.startsWith('NFT_') && (Types.isMob(kind) || Types.isItem(kind))) {add(name); add(kind);}});
for (const lake of Object.values(Lakes)) for (const fish of Object.keys(lake?.fish || {})) add(fish);
const sorted = [...rows.values()].sort((a, b) => (a.entry_id + ':' + a.target).localeCompare(b.entry_id + ':' + b.target));
process.stdout.write('[\n' + sorted.map(row => JSON.stringify(row)).join(',\n') + '\n]\n');
