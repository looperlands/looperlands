define(['map', 'storage'], function (Mapx, Storage) {
    class MapTransition {
        constructor(game, options = {}) {
            this.game = game;
            this.http = options.http || axios;
            this.location = options.location || window.location;
            this.history = options.history || window.history;
            this.later = options.later || ((fn, delay) => setTimeout(fn, delay));
            this.cancel = options.cancel || (timer => clearTimeout(timer));
            this.active = false;
        }

        start(destination) {
            if (this.active) return this.pending || Promise.resolve(false);
            this.active = true;
            this.context = {destination: {...destination}, sourceSessionId: this.game.sessionId};
            this.game.pauseForMapTransition();
            return this.retry();
        }

        retry() {
            if (this.pending) return this.pending;
            const context = this.context;
            this.game.app.setMapTransition(true);
            this.pending = this.perform(context).catch(error => {
                this.cancel(this.timer);
                this.welcomeResolve = this.welcomeReject = null;
                this.game.started = false;
                this.game.isStopped = true;
                this.game.client?.disable();
                // Keep a consumed session's Storage: loading it again returns 409.
                // A failed socket attempt gets a fresh ticket on the next retry.
                if (context.socketAttempted) {
                    context.sourceSessionId = context.sessionId;
                    context.sessionId = context.storage = null;
                    context.socketAttempted = false;
                }
                console.error('[map] Transition failed', error);
                if (context.phase === 'ticket' && error.response?.status === 404) {
                    this.game.app.showMapTransitionFailure(null, 'Your travel session expired. Choose your character to continue.');
                } else {
                    this.game.app.showMapTransitionFailure(() => this.retry());
                }
                return false;
            }).finally(() => {this.pending = null;});
            return this.pending;
        }

        async perform(context) {
            context.phase = 'map';
            if (!context.map) {
                context.map = await new Promise((resolve, reject) => {
                    const map = new Mapx(!this.game.renderer.upscaledRendering, this.game, context.destination.map);
                    map.ready(() => resolve(map), reject);
                });
            }
            if (!context.sessionId) {
                context.phase = 'ticket';
                const response = await this.http.post('/session/' + context.sourceSessionId + '/teleport',
                    {...context.destination}, {timeout: 15000});
                if (response.status !== 200 || typeof response.data?.sessionId !== 'string' || !response.data.sessionId) {
                    throw new Error('Invalid destination session');
                }
                context.sessionId = response.data.sessionId;
            }
            if (!context.storage) {
                context.phase = 'session';
                const storage = new Storage(context.sessionId);
                try {
                    await storage.loadData({timeout: 15000});
                } catch (error) {
                    // The GET may have consumed its ticket before its response was
                    // lost. The original socket remains alive until adoption.
                    context.sessionId = null;
                    throw error;
                }
                if (storage.data.mapId !== context.destination.map) throw new Error('Destination map did not match session');
                context.storage = storage;
            }

            context.phase = 'renderer';
            this.game.resetForMapTransition(context.map, context.storage);
            const url = new URL(this.location.href);
            url.searchParams.set('sessionId', context.sessionId);
            this.history.replaceState(null, '', url.href);
            // Also wait for the renderer worker's decoded tilesheet. Image.onload
            // in the main thread alone does not guarantee a renderable first frame.
            await this.deadline(this.game.renderer.whenTilesetReady(), 20000);
            this.game.isStopped = false;
            context.phase = 'socket';
            context.socketAttempted = true;
            await this.deadline(new Promise((resolve, reject) => {
                this.welcomeResolve = resolve;
                this.welcomeReject = reject;
                this.game.connect(() => {});
                context.client = this.game.client;
            }), 20000);
            return true;
        }

        deadline(promise, duration) {
            return new Promise((resolve, reject) => {
                const timer = this.timer = this.later(() => reject(new Error('Map transition timed out')), duration);
                promise.then(value => {this.cancel(timer); resolve(value);}, error => {this.cancel(timer); reject(error);});
            });
        }

        complete() {
            if (!this.active || !this.welcomeResolve || this.context.client !== this.game.client) return;
            const resolve = this.welcomeResolve;
            this.welcomeResolve = this.welcomeReject = null;
            this.active = false;
            this.game.started = true;
            this.game.isStopped = false;
            this.game.initAchievements();
            this.game.app.setMapTransition(false);
            this.game.tick();
            resolve();
        }

        connectionLost() {
            this.welcomeReject?.(new Error('Destination connection was lost'));
        }
    }
    return MapTransition;
});
