const fs = require('fs');
const path = require('path');

// Durable outbox of idempotent Field Guide facts. Use one file per server process.
class FieldGuideStore {
    constructor(platform, options = {}) {
        this.platform = platform;
        this.file = options.file || process.env.FIELD_GUIDE_SPOOL_PATH || path.resolve('data/field-guide/pending.json');
        this.pending = new Map(); this.queue = Promise.resolve(); this.error = null;
        try {
            fs.mkdirSync(path.dirname(this.file), {recursive: true});
            if (fs.existsSync(this.file)) {
                const records = JSON.parse(fs.readFileSync(this.file, 'utf8'));
                if (!Array.isArray(records)) throw new Error('Invalid Field Guide outbox');
                for (const record of records) {
                    if (typeof record.nftId !== 'string' || typeof record.fact !== 'string' || !record.fact.startsWith('field-guide:')) throw new Error('Invalid Field Guide outbox record');
                    this.pending.set(this.key(record), record);
                }
            }
        } catch (error) {this.error = error; console.error('[field-guide] Preserve and repair the outbox:', error.message);}
        if (options.timer !== false) {
            this.timer = setInterval(() => this.flush().catch(error => console.error('[field-guide]', error.message)), 15000);
            this.timer.unref?.();
        }
    }
    key(record) {return JSON.stringify([record.nftId, record.fact]);}
    facts(nftId) {return [...this.pending.values()].filter(r => r.nftId === nftId).map(r => r.fact);}
    serialize(work) {const next = this.queue.catch(() => {}).then(work); this.queue = next; return next;}
    async write(records) {
        const temporary = this.file + '.tmp';
        const handle = await fs.promises.open(temporary, 'w', 0o600);
        try {await handle.writeFile(JSON.stringify([...records.values()])); await handle.sync();}
        finally {await handle.close();}
        await fs.promises.rename(temporary, this.file);
    }
    add(nftId, facts) {
        return this.serialize(async () => {
            if (this.error) throw this.error;
            const next = new Map(this.pending);
            for (const fact of facts) {const record = {nftId, fact}; next.set(this.key(record), record);}
            await this.write(next); this.pending = next;
        });
    }
    flush() {
        if (this.flushing) return this.flushing;
        this.flushing = (async () => {
            await this.queue;
            if (this.error) throw this.error;
            for (const [key, record] of [...this.pending]) {
                const response = await this.platform.recordFieldGuide(record.nftId, [record.fact]);
                if (!response?.accepted?.includes(record.fact)) return;
                await this.serialize(async () => {
                    const next = new Map(this.pending); next.delete(key);
                    await this.write(next);
                    this.onSaved?.(record.nftId, record.fact);
                    this.pending = next;
                });
            }
        })().finally(() => {this.flushing = null;});
        return this.flushing;
    }
    async close() {clearInterval(this.timer); await this.queue; await this.flush();}
}
module.exports = {FieldGuideStore};
