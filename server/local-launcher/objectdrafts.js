(function(factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else window.MapmakerObjectDrafts = factory();
})(function() {
    const clone = value => JSON.parse(JSON.stringify(value));
    return class ObjectDrafts {
        constructor(rows = []) {
            this.rows = clone(rows); this.original = new Map(this.rows.map(row => [row.id, JSON.stringify(row)]));
            this.pending = new Map(); this.next = 0;
        }
        get count() {return this.pending.size;}
        isNew(id) {return !this.original.has(id);}
        add(value) {
            const row = clone(value); row.id = 'draft:' + (++this.next);
            this.rows.push(row); this.set(row); return row;
        }
        set(row) {
            const index = this.rows.findIndex(value => value.id === row.id);
            if (index < 0) throw new Error('Choose an object from this map draft.');
            this.rows[index] = row;
            if (JSON.stringify(row) === this.original.get(row.id)) this.pending.delete(row.id);
            else this.pending.set(row.id, {operation: this.isNew(row.id) ? 'add' : 'update', objectId: row.id, object: row});
        }
        remove(id) {
            const index = this.rows.findIndex(row => row.id === id);
            if (index < 0) return;
            this.rows.splice(index, 1);
            if (this.isNew(id)) this.pending.delete(id);
            else this.pending.set(id, {operation: 'remove', objectId: id});
        }
        changes() {
            return [...this.pending.values()].map(value => {
                const change = clone(value);
                if (change.operation === 'add') {delete change.objectId; change.object.id = null;}
                return change;
            });
        }
    };
});
