define(function () {
    class ClientUpdates {
        constructor(app, options = {}) {
            this.app = app;
            this.document = options.document || document;
            this.location = options.location || window.location;
            this.fetch = options.fetch || window.fetch.bind(window);
            this.later = options.later || ((fn, delay) => setTimeout(fn, delay));
            this.cancel = options.cancel || (id => clearTimeout(id));
            this.now = options.now || Date.now;
            this.performance = options.performance || (typeof window !== 'undefined' ? window.performance : null);
            this.revision = this.document.querySelector('meta[name="looperlands-client-revision"]')?.content;
            this.recovering = /^[a-f0-9]{40}$/.test(this.revision || '') && new URL(this.location.href).searchParams.has('clientRevision');
        }

        recoveryStatus(message) {
            const overlay = this.document.getElementById?.('client-recovery');
            const label = this.document.getElementById?.('client-recovery-message');
            if (overlay) overlay.hidden = false;
            if (label) label.textContent = message;
        }

        failRecovery() {
            this.cancel(this.recoveryTimer);
            this.recoveryFailed = true;
            this.recoveryStatus('The game could not reconnect. Choose your character to continue.');
            const link = this.document.getElementById?.('client-recovery-reconnect');
            if (link) link.hidden = false;
            this.app.game?.client?.connection?.disconnect();
        }

        completeRecovery() {
            if (!this.recovering || this.recoveryFailed) return;
            this.cancel(this.recoveryTimer);
            this.recovering = false;
            // WELCOME precedes the first rendered frame. Keep the cover until it can paint.
            this.later(() => {
                const overlay = this.document.getElementById?.('client-recovery');
                if (overlay) overlay.hidden = true;
            }, 100);
        }

        async loadSession() {
            if (!this.recovering) return this.app.storage.loadData();
            const deadline = this.now() + 120000;
            this.recoveryTimer = this.later(() => this.failRecovery(), 120000);
            while (!this.recoveryFailed && this.now() < deadline) {
                try {
                    this.recoveryStatus('Waiting for the game server…');
                    const update = await this.request('/client-update?from=' + this.revision);
                    if (!/^[a-f0-9]{40}$/.test(update.revision || '') || !update.ready || update.serverRevision !== update.revision) throw new Error('Server is starting');
                    this.recoveryStatus('Restoring your character…');
                    const result = await this.app.storage.loadData({timeout: 10000});
                    if (this.recoveryFailed || this.now() >= deadline) break;
                    this.recoveryStatus('Loading the updated game assets…');
                    return result;
                } catch (error) {
                    if ([401, 403, 404].includes(error.response?.status)) {this.failRecovery(); throw error;}
                    await new Promise(resolve => this.later(resolve, 1000));
                }
            }
            this.failRecovery();
            throw new Error('Client recovery timed out');
        }

        async warmAssets(revision, files = []) {
            const mapId = this.app.game.mapId;
            if (this.warmedRevision === revision && this.warmedMap === mapId) return;
            const root = new URL('/_client/' + revision + '/', this.location.href);
            const urls = new Set();
            const add = value => {
                if (typeof value !== 'string') return;
                const url = new URL(value, this.document.baseURI || this.location.href);
                if (url.origin !== root.origin || !/^\/_client\/[a-f0-9]{40}\//.test(url.pathname)) return;
                url.pathname = url.pathname.replace(/^\/_client\/[a-f0-9]{40}\//, root.pathname);
                url.hash = ''; urls.add(url.href);
            };
            for (const file of files) add(new URL(file, root).href);
            for (const element of this.document.querySelectorAll('script[src], link[rel="stylesheet"]')) add(element.src || element.href);
            for (const entry of this.performance?.getEntriesByType('resource') || []) add(entry.name);
            // Background world sprites do not block startup. Warming the entire catalogue
            // would evict startup assets from smaller browser caches.
            for (const sprites of this.app.game.spritesets || []) for (const sprite of Object.values(sprites)) {
                if (sprite.image) add(sprite.filepath);
            }
            // Visible sprites fetched by render workers have no window resource timing.
            for (const entity of Object.values(this.app.game.entities || {})) add(entity.sprite?.filepath);
            if (mapId) add(new URL('maps/world_client_' + mapId + '.js', root).href);
            const queue = [...urls];
            this.app.game.showNotification('Downloading game update…');
            const results = await Promise.allSettled(Array.from({length: Math.min(4, queue.length)}, async () => {
                while (queue.length) {
                    const response = await this.fetch(queue.shift(), {cache: 'force-cache', credentials: 'same-origin',
                        ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? {signal: AbortSignal.timeout(30000)} : {})});
                    // Changed-file lists also include assets removed by the new release.
                    if (response.status === 404) continue;
                    if (!response.ok) throw new Error('Updated asset is unavailable');
                    await response.arrayBuffer();
                }
            }));
            const failure = results.find(result => result.status === 'rejected');
            if (failure) throw failure.reason;
            this.warmedRevision = revision;
            this.warmedMap = mapId;
        }

        start(socket) {
            if (!this.revision) return;
            if (!this.socketHandlers) {
                this.socketHandlers = {
                    'client-update': () => this.check(),
                    'server-reboot': packet => this.waitForReboot(packet),
                    'server-reboot-cancelled': () => {
                        this.waiting = null; this.app.game.client.isReloading = false;
                        this.app.game.showNotification('The update was postponed. You can keep playing.');
                    },
                };
            }
            if (this.socket !== socket || !this.socketBound) {
                for (const [event, handler] of Object.entries(this.socketHandlers)) {
                    if (this.socketBound) this.socket?.off(event, handler);
                    socket.on(event, handler);
                }
                this.socket = socket;
                this.socketBound = true;
            }
            if (!this.started) {
                this.started = true;
                this.check();
            }
        }

        async request(url, body) {
            const response = await this.fetch(url, {cache: 'no-store', credentials: 'same-origin',
                ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? {signal: AbortSignal.timeout(10000)} : {}),
                ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
            if (!response.ok) throw new Error('Update is not ready');
            return response.json();
        }

        async check() {
            if (this.pending || !this.started) return;
            this.cancel(this.timer);
            this.pending = true;
            try {
                if (this.app.game?.mapTransition?.active) return;
                const update = await this.request('/client-update?from=' + this.revision);
                if (this.app.game?.mapTransition?.active) return;
                if (!/^[a-f0-9]{40}$/.test(update.revision || '')) throw new Error('Invalid client release');
                if (this.waiting) {
                    if (update.ready && update.serverRevision === this.waiting.revision) {
                        await this.warmAssets(update.revision, update.files);
                        if (this.app.game?.mapTransition?.active) return;
                        this.navigate(this.waiting.sessionId, update.revision);
                    }
                } else if (update.ready && update.revision !== this.revision) {
                    if (update.mode === 'none') this.adopt(update.revision);
                    else if (update.mode === 'css') {await this.styles(update.revision); this.adopt(update.revision);}
                    else if (update.mode === 'reload' && this.app.game?.started) {
                        await this.warmAssets(update.revision, update.files);
                        if (this.app.game?.mapTransition?.active || !this.app.game?.started || this.warmedMap !== this.app.game.mapId) return;
                        const sessionId = this.app.sessionId;
                        const ticket = await this.request('/session/' + sessionId + '/client-reload', {revision: update.revision});
                        if (this.app.game?.mapTransition?.active || this.app.sessionId !== sessionId) return;
                        if (!/^[a-f0-9]{40}$/.test(ticket.sessionId || '') || ticket.revision !== update.revision) throw new Error('Invalid client reload ticket');
                        this.app.game.showNotification('Applying game update…');
                        this.navigate(ticket.sessionId, ticket.revision);
                    }
                }
            } catch (error) { /* Keep the current client alive and retry after transient failures or combat. */ }
            finally {
                this.pending = false;
                if (!this.navigating) this.timer = this.later(() => this.check(), this.waiting ? 1000 : 5000);
            }
        }

        adopt(revision) {
            this.revision = revision;
            this.document.querySelector('meta[name="looperlands-client-revision"]').content = revision;
            this.document.querySelector('base').href = '/_client/' + revision + '/';
        }

        async styles(revision) {
            const replacements = [];
            try {
                await Promise.all([...this.document.querySelectorAll('link[rel="stylesheet"]')].map(link => {
                    const url = new URL(link.href, this.location.href);
                    if (url.origin !== new URL(this.location.href).origin || !/^\/_client\/[a-f0-9]{40}\//.test(url.pathname)) return;
                    const next = link.cloneNode();
                    const media = link.media;
                    next.media = 'not all';
                    url.pathname = url.pathname.replace(/^\/_client\/[a-f0-9]{40}\//, '/_client/' + revision + '/');
                    next.href = url.href;
                    replacements.push({link, next, media});
                    return new Promise((resolve, reject) => {
                        const timer = this.later(() => reject(new Error('Stylesheet load timed out')), 10000);
                        next.onload = () => {this.cancel(timer); resolve();};
                        next.onerror = () => {this.cancel(timer); reject(new Error('Stylesheet load failed'));};
                        link.parentNode.insertBefore(next, link.nextSibling);
                    });
                }));
                for (const {link, next, media} of replacements) {next.media = media; link.remove();}
            } catch (error) {for (const {next} of replacements) next.remove(); throw error;}
        }

        waitForReboot(packet) {
            if (!/^[a-f0-9]{40}$/.test(packet?.revision || '') || !/^[a-f0-9]{40}$/.test(packet.sessionId || '')) return;
            this.waiting = packet;
            this.app.game.client.isReloading = true;
            this.app.game.showNotification('Updating the game. Reconnecting automatically…');
            this.check();
        }

        navigate(sessionId, revision) {
            const url = new URL(this.location.href);
            url.searchParams.set('sessionId', sessionId);
            url.searchParams.set('clientRevision', revision);
            this.navigating = true;
            this.app.game.client.isReloading = true;
            this.socket.disconnect();
            this.location.replace(url.href);
        }
    }
    return ClientUpdates;
});
