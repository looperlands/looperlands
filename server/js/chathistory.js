const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_MESSAGES = 100;
const DEFAULT_RETENTION_DAYS = 30;

// One writer per file. Production uses a mounted directory outside the image.
class ChatHistory {
    constructor(filename, retentionDays = DEFAULT_RETENTION_DAYS) {
        if (!Number.isFinite(retentionDays) || retentionDays < 0) throw new Error('Invalid chat retention days');
        this.filename = filename;
        this.retentionMs = retentionDays * 86400000;
        this.state = {version: 1, identities: {}, streams: {}};
        if (filename) {
            fs.mkdirSync(path.dirname(filename), {recursive: true, mode: 0o700});
            try {
                const state = JSON.parse(fs.readFileSync(filename, 'utf8'));
                if (state.version !== 1 || !state.identities || !state.streams ||
                    Object.values(state.identities).some(id => !/^[a-f0-9]{32}$/.test(id)) ||
                    Object.values(state.streams).some(messages => !Array.isArray(messages) || messages.some(message => !Number.isFinite(message.epoch)))) {
                    throw new Error('Invalid chat history file');
                }
                this.state = state;
            } catch (error) {
                // Unreadable/corrupt history must never be silently replaced with an empty store.
                if (error.code !== 'ENOENT') throw error;
            }
            this.commit(this.state);
            this.cleanupTimer = setInterval(() => {
                try { this.commit(this.state); }
                catch (error) { console.error('Expired chat history could not be removed:', error.code || error.name); }
            }, 86400000);
            this.cleanupTimer.unref();
        }
    }

    retained(messages = []) {
        const cutoff = this.retentionMs ? Date.now() - this.retentionMs : -Infinity;
        return messages.filter(message => message.epoch >= cutoff).slice(-MAX_MESSAGES);
    }

    get(key) {
        const messages = this.state.streams[key];
        return messages && this.retained(messages);
    }

    publicId(wallet) {
        if (this.state.identities[wallet]) return this.state.identities[wallet];
        const id = crypto.randomBytes(16).toString('hex');
        this.commit({...this.state, identities: {...this.state.identities, [wallet]: id}});
        return id;
    }

    append(keys, message) {
        const streams = {...this.state.streams};
        for (const key of keys) {
            const messages = this.retained(streams[key]);
            // Gift receipts use a stable transfer ID and may be retried.
            streams[key] = messages.some(entry => entry.id === message.id) ? messages : [...messages, message].slice(-MAX_MESSAGES);
        }
        this.commit({...this.state, streams});
    }

    commit(next) {
        const streams = {};
        for (const [key, messages] of Object.entries(next.streams)) {
            const retained = this.retained(messages);
            if (retained.length) streams[key] = retained;
        }
        next = {...next, streams};
        if (!this.filename) { this.state = next; return; }
        const temporary = this.filename + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
        let descriptor;
        let renamed = false;
        try {
            descriptor = fs.openSync(temporary, 'wx', 0o600);
            fs.writeFileSync(descriptor, JSON.stringify(next));
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor); descriptor = undefined;
            fs.renameSync(temporary, this.filename); renamed = true;
            // Keep memory aligned with the committed file even if directory fsync fails.
            this.state = next;
            descriptor = fs.openSync(path.dirname(this.filename), 'r');
            fs.fsyncSync(descriptor);
        } finally {
            if (descriptor !== undefined) fs.closeSync(descriptor);
            if (!renamed && fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
    }

    close() { clearInterval(this.cleanupTimer); } // Every successful write is already flushed.
}

module.exports = {ChatHistory, DEFAULT_RETENTION_DAYS};
