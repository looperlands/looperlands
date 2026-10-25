function operations(input, allowed = ['add', 'update', 'remove']) {
    const rows = input?.operations;
    const fail = message => {throw Object.assign(new Error(message), {status: 400});};
    if (!Array.isArray(rows) || !rows.length || rows.length > 500 || typeof input.revision !== 'string') fail('Save between 1 and 500 map changes together.');
    const ids = new Set();
    for (const row of rows) {
        if (!row || !allowed.includes(row.operation)) fail('Choose supported map changes.');
        if (row.operation === 'add') continue;
        const id = String(row.objectId ?? row.id ?? '');
        if (!/^\d+$/.test(id) || ids.has(id)) fail('Each saved object may be changed once per batch.');
        ids.add(id);
    }
    return rows;
}
// Every editor writes the same TMX file. Share its queue across object types.
const saves = new Map();
module.exports = {operations, saves};
