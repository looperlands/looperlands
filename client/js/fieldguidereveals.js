define(function () {
    // Only unviewed presentation cues live here. The server owns the Guide's progress.
    class MonsterReveals {
        constructor(storage, key) {
            this.storage = storage;
            this.key = key;
            this.pending = new Map();
            try { this.merge(JSON.parse(storage().getItem(key) || '[]')); } catch (_) { /* Storage may be unavailable. */ }
        }
        merge(receipts) {
            if (!Array.isArray(receipts)) return;
            for (const receipt of receipts) {
                if (!receipt || typeof receipt.id !== 'string' || !/^[a-f0-9]{24}$/.test(receipt.id)) continue;
                const {id, discovered, completed} = receipt;
                if (discovered !== true && completed !== true) continue;
                const previous = this.pending.get(id);
                this.pending.set(id, {id, discovered: discovered === true || !!previous?.discovered, completed: completed === true || !!previous?.completed});
            }
        }
        record(receipts) {
            this.merge(receipts);
            this.save();
        }
        forEntry(entry) {
            const cue = this.pending.get(entry.id);
            if (!cue || entry.category !== 'monsters' || entry.state === 'unknown') return null;
            const completed = cue.completed && entry.state === 'completed';
            return cue.discovered || completed ? {discovered: cue.discovered, completed} : null;
        }
        seen(id, cue) {
            const pending = this.pending.get(id);
            if (!pending) return;
            if (cue.discovered) pending.discovered = false;
            if (cue.completed) pending.completed = false;
            if (!pending.discovered && !pending.completed) this.pending.delete(id);
            this.save();
        }
        save() {
            try {
                if (this.pending.size) this.storage().setItem(this.key, JSON.stringify([...this.pending.values()]));
                else this.storage().removeItem(this.key);
            } catch (_) { /* Keep pending cues in memory when storage is unavailable. */ }
        }
    }
    return MonsterReveals;
});
