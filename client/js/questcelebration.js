/* Presentation only: rewards have already been granted by the server. */
define(['cardartwork', '../../shared/js/dialogueformat'], function (CardArtwork, DialogueFormat) {
    const node = (tag, className, text) => {
        const el = document.createElement(tag);
        el.className = className;
        if (text != null) el.textContent = text;
        return el;
    };
    class QuestCelebration {
        constructor(app) {
            this.app = app;
            this.queue = [];
            this.root = node('section', 'quest-celebration');
            this.root.hidden = true;
            this.root.setAttribute('aria-label', 'Quest rewards');
            document.body.append(this.root);
            for (const event of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup']) {
                this.root.addEventListener(event, e => e.stopPropagation());
            }
            this.onPageHide = () => this.destroy();
            window.addEventListener('pagehide', this.onPageHide, {once: true});
        }
        show(notice) {
            const session = this.app.game.sessionId;
            if (this.session !== session) {
                this.queue = [];
                clearTimeout(this.timer);
                this.root.hidden = true;
                this.session = session;
            }
            this.queue.push(notice);
            if (this.root.hidden) this.next();
        }
        next() {
            clearTimeout(this.timer);
            this.leaving = false;
            this.root.classList.toggle('quest-leaving', false);
            this.root.replaceChildren();
            const notice = this.queue.shift();
            this.root.hidden = !notice;
            if (!notice) return;
            const quiet = this.app.settings.getReducedMotion() || !this.app.settings.getCombatEffectsEnabled() ||
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            this.quiet = !!quiet;
            this.root.classList.toggle('quest-quiet', this.quiet);
            const close = node('button', 'quest-close', '\u00d7');
            close.type = 'button'; close.setAttribute('aria-label', 'Dismiss quest rewards');
            close.addEventListener('click', () => this.close());
            const content = node('div', 'quest-content');
            content.setAttribute('role', 'status');
            const seal = node('div', 'quest-seal', '');
            seal.setAttribute('aria-hidden', 'true');
            seal.append(node('span', 'quest-check'));
            const sparks = node('div', 'quest-sparks');
            sparks.setAttribute('aria-hidden', 'true');
            for (let i = 0; i < 12; i++) {
                const spark = node('i', 'quest-spark');
                spark.style.setProperty('--angle', (i * 30) + 'deg'); sparks.append(spark);
            }
            content.append(seal, sparks, node('h2', 'quest-title', 'Quest complete!'), node('h3', 'quest-name', notice.questName));
            if (notice.endText) {
                const story = node('p', 'quest-story');
                DialogueFormat.append(story, Array.isArray(notice.endText) ? notice.endText.join(' ') : notice.endText);
                content.append(story);
            }
            if (Number(notice.xpReward) > 0) content.append(node('p', 'quest-xp', '+' + Number(notice.xpReward).toLocaleString('en-US') + ' XP earned'));
            const reward = notice.reward;
            if (reward && Number(reward.amount) > 0) {
                const kind = Types.getKindAsString(reward.item);
                const card = node('article', 'quest-reward');
                const art = node('div', 'quest-reward-art');
                if (kind) {
                    const sprite = node('span', 'quest-item');
                    sprite.setAttribute('aria-hidden', 'true');
                    art.append(sprite);
                    const metadata = this.app.game.sprites?.['item-' + kind];
                    CardArtwork.render(sprite, [{url: 'img/1/item-' + kind + '.png',
                        width: metadata?.width, height: metadata?.height,
                        animations: metadata?.animationData}], null, {slot: true});
                }
                card.append(art, node('span', 'quest-quantity', '\u00d7' + Number(reward.amount).toLocaleString('en-US')),
                    node('h4', 'quest-item-name', reward.name || kind || 'Item'), node('p', 'quest-received', 'Added to inventory'));
                content.append(card);
            }
            this.root.append(close, content);
            this.timer = setTimeout(() => this.close(), 5000);
        }
        close() {
            if (this.leaving || this.root.hidden) return;
            clearTimeout(this.timer);
            this.leaving = true;
            this.root.classList.toggle('quest-leaving', true);
            this.timer = setTimeout(() => this.next(), this.quiet ? 100 : 220);
        }

        destroy() {
            clearTimeout(this.timer); this.queue = [];
            window.removeEventListener('pagehide', this.onPageHide);
            this.root.remove();
        }
    }
    return QuestCelebration;
});
