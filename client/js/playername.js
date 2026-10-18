define([], function () {
    const needsName = title => !title || /^player[^\p{L}\p{N}]*$/iu.test(title.trim());

    class PlayerName {
        constructor(app) {
            this.app = app;
            this.editor = document.getElementById('player-name-editor');
            this.input = document.getElementById('player-display-name');
            this.status = document.getElementById('player-name-status');
            this.hint = document.getElementById('player-name-hint');
            this.saveButton = document.getElementById('player-name-save');
            this.saveButton.addEventListener('click', () => this.save());
            this.input.addEventListener('keydown', event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                this.save();
            });
            [this.editor, this.hint].forEach(node => ['click', 'touchstart', 'keydown'].forEach(type =>
                node.addEventListener(type, event => event.stopPropagation())));
            document.getElementById('player-name-choose').addEventListener('click', () => {
                this.hint.hidden = true;
                if (!$('body').hasClass('settings')) this.app.toggleSettings();
                this.app.settings.selectSection('interface');
                this.input.focus();
            });
            document.getElementById('player-name-dismiss').addEventListener('click', () => {this.hint.hidden = true;});
        }

        update(title) {
            this.title = title || '';
            // Selected badges stay in the rendered title, outside the editable name.
            if (document.activeElement !== this.input) this.input.value = this.title.replace(/[^\p{L}\p{N} ._’'-]/gu, '').trim();
        }

        onWelcome(title) {
            this.update(title);
            if (this.considered) return;
            this.considered = true;
            if (!needsName(title)) return;
            const wallet = String(this.app.storage.data.walletId || '').toLowerCase();
            const key = 'looperlands:display-name-asked:' + wallet;
            try {if (localStorage.getItem(key)) return;} catch (_) { /* Storage is optional. */ }
            setTimeout(async () => {
                if (!this.app.game.started || this.app.game.player.isDead || !needsName(this.title)) return;
                try {
                    const {data} = await axios.post('/session/' + encodeURIComponent(this.app.sessionId) + '/title/prompt');
                    try {localStorage.setItem(key, 'true');} catch (_) { /* The platform also remembers. */ }
                    if (data.showPrompt && this.app.game.started && !this.app.game.player.isDead && needsName(this.title)) this.hint.hidden = false;
                } catch (_) { /* Keep gameplay quiet; Settings remains available. */ }
            }, 8000);
        }

        async save() {
            if (this.saving) return;
            const title = this.input.value.trim();
            if (!/^[\p{L}\p{N}][\p{L}\p{N} ._’'-]{1,23}$/u.test(title)) {
                this.status.textContent = 'Use 2–24 letters, numbers, spaces or . _ - and apostrophes.';
                return;
            }
            this.saving = true;
            this.saveButton.disabled = true;
            this.saveButton.textContent = 'Saving…';
            this.editor.setAttribute('aria-busy', 'true');
            this.status.textContent = '';
            try {
                const {data} = await axios.put('/session/' + encodeURIComponent(this.app.sessionId) + '/title', {title});
                this.app.game.player.title = data.title;
                this.app.game.player.name = data.name;
                this.title = data.title;
                this.input.value = title;
                this.hint.hidden = true;
                this.status.textContent = 'Name saved.';
            } catch (error) {
                this.status.textContent = error.response?.data?.error || 'Your name could not be saved. Please try again.';
            } finally {
                this.saving = false;
                this.saveButton.disabled = false;
                this.saveButton.textContent = 'Save name';
                this.editor.removeAttribute('aria-busy');
            }
        }
    }
    return PlayerName;
});
