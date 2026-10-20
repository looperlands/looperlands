define(function () {
    class ClientUpdates {
        constructor(app, options = {}) {
            this.app = app;
            this.document = options.document || document;
            this.location = options.location || window.location;
            this.fetch = options.fetch || window.fetch.bind(window);
            this.later = options.later || ((fn, delay) => setTimeout(fn, delay));
            this.cancel = options.cancel || (id => clearTimeout(id));
            this.revision = this.document.querySelector('meta[name="looperlands-client-revision"]')?.content;
        }

        start(socket) {
            if (!this.revision || this.started) return;
            this.started = true;
            this.socket = socket;
            socket.on('client-update', () => this.check());
            socket.on('server-reboot', packet => this.waitForReboot(packet));
            socket.on('server-reboot-cancelled', () => {
                this.waiting = null; this.app.game.client.isReloading = false;
                this.app.game.showNotification('The update was postponed. You can keep playing.');
            });
            this.check();
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
                const update = await this.request('/client-update?from=' + this.revision);
                if (!/^[a-f0-9]{40}$/.test(update.revision || '')) throw new Error('Invalid client release');
                if (this.waiting) {
                    if (update.ready && update.serverRevision === this.waiting.revision) this.navigate(this.waiting.sessionId, update.revision);
                } else if (update.ready && update.revision !== this.revision) {
                    if (update.mode === 'none') this.adopt(update.revision);
                    else if (update.mode === 'css') {await this.styles(update.revision); this.adopt(update.revision);}
                    else if (update.mode === 'reload' && this.app.game?.started) {
                        const ticket = await this.request('/session/' + this.app.sessionId + '/client-reload', {revision: update.revision});
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
