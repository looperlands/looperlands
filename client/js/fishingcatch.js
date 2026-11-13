/* Presentation of server-confirmed catches; never awards inventory or XP. */
define(['cardartwork'], function (CardArtwork) {
    const tiers = {
        common: {reveal:650, impact:370, duration:2400, particles:8, distance:75, rays:0, scale:1},
        uncommon: {reveal:720, impact:420, duration:2600, particles:12, distance:100, rays:0, scale:1},
        rare: {reveal:880, impact:550, duration:3000, particles:24, distance:135, rays:0, scale:1.03},
        epic: {reveal:1040, impact:680, duration:3400, particles:40, distance:170, rays:8, scale:1.07},
        legendary: {reveal:1280, impact:850, duration:4000, particles:60, distance:215, rays:12, scale:1.12}
    };
    const node = (tag, className, text) => {
        const element = document.createElement(tag);
        element.className = className;
        if (text != null) element.textContent = text;
        return element;
    };

    class FishingCatch {
        constructor(app) {
            this.app = app;
            this.root = node('section', 'fishing-catch');
            this.root.hidden = true;
            this.root.setAttribute('role', 'status');
            this.root.setAttribute('aria-live', 'polite');
            this.root.setAttribute('aria-atomic', 'true');
            document.body.append(this.root);
            this.onPageHide = () => this.destroy();
            window.addEventListener('pagehide', this.onPageHide, {once: true});
            this.onResize = () => {
                clearTimeout(this.resizeTimer);
                this.resizeTimer = setTimeout(() => this.position(), 100);
            };
            window.addEventListener('resize', this.onResize);
        }

        show(receipt, onReveal) {
            if (!receipt || typeof receipt.fish !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(receipt.fish) ||
                typeof receipt.name !== 'string' || !Object.keys(tiers).includes(receipt.rarity) ||
                !Number.isSafeInteger(receipt.quantity) || receipt.quantity < 1 ||
                !Number.isFinite(receipt.experience) || receipt.experience < 0) return false;
            this.clear();
            if (!this.app.settings.getFishCatchCardsEnabled()) {
                this.app.game.showNotification('Caught ' + receipt.name + (receipt.quantity > 1 ? ' \u00d7' + receipt.quantity : '') + ' \u00b7 +' + receipt.experience.toLocaleString('en-US') + ' XP');
                if (typeof onReveal === 'function') onReveal();
                return false;
            }
            const quiet = this.app.settings.getReducedMotion() || !this.app.settings.getCombatEffectsEnabled() ||
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const tier = Object.keys(tiers).indexOf(receipt.rarity);
            const profile = tiers[receipt.rarity];
            this.profile = profile;
            this.root.className = 'fishing-catch fc-' + receipt.rarity + (quiet ? ' fc-quiet' : '') + (receipt.perfect ? ' fc-perfect' : '');
            this.root.style.setProperty('--fc-reveal', profile.reveal + 'ms');
            this.root.style.setProperty('--fc-impact', profile.impact + 'ms');
            this.root.style.setProperty('--fc-size', profile.scale);

            const card = node('div', 'fc-card');
            const turn = node('div', 'fc-turn');
            const back = node('div', 'fc-face fc-back');
            back.setAttribute('aria-hidden', 'true');
            back.append(node('span', 'fc-hook'), node('span', 'fc-ripples'));
            const front = node('div', 'fc-face fc-front');
            const heading = node('div', 'fc-heading');
            heading.append(node('span', 'fc-result', receipt.perfect ? 'Perfect!' : 'Caught!'),
                node('span', 'fc-rarity', receipt.rarity));
            const art = node('div', 'fc-art');
            art.setAttribute('aria-hidden', 'true');
            art.append(node('span', 'fc-shadow'));
            this.sprite = node('span', 'fc-sprite');
            const status = node('span', 'fc-art-status');
            art.append(this.sprite, status);
            const metadata = this.app.game.fish?.[receipt.fish] || this.app.game.sprites?.[receipt.fish];
            CardArtwork.render(this.sprite, [{url: 'img/1/' + receipt.fish + '.png',
                width: metadata?.width, height: metadata?.height,
                animations: metadata?.animationData}], status, {slot: true});

            const rewards = node('div', 'fc-rewards');
            rewards.append(node('span', 'fc-quantity', '\u00d7' + receipt.quantity + ' fish'),
                node('span', 'fc-xp', '+' + receipt.experience.toLocaleString('en-US') + ' XP'));
            front.append(heading, art, node('h2', 'fc-name', receipt.name), rewards);
            turn.append(back, front); card.append(turn);
            const effects = node('div', 'fc-effects');
            effects.setAttribute('aria-hidden', 'true');
            if (!quiet) {
                if (tier > 0) effects.append(node('div', 'fc-wash'));
                if (tier >= 2) effects.append(node('div', 'fc-ring'));
                if (tier >= 3) {
                    const rays = node('div', 'fc-rays');
                    for (let i = 0; i < profile.rays; i++) {
                        const ray = node('i', 'fc-ray');
                        ray.style.setProperty('--fc-angle', (i * 360 / profile.rays) + 'deg');
                        rays.append(ray);
                    }
                    effects.append(rays);
                }
                const sparks = node('div', 'fc-sparks');
                const count = profile.particles + (receipt.perfect ? 8 : 0);
                for (let i = 0; i < count; i++) {
                    const spark = node('i', 'fc-spark');
                    const angle = i / count * Math.PI * 2;
                    const distance = profile.distance + i % 4 * 19;
                    spark.style.setProperty('--fc-x', Math.cos(angle) * distance + 'px');
                    spark.style.setProperty('--fc-y', Math.sin(angle) * distance - 32 + 'px');
                    spark.style.setProperty('--fc-delay', (profile.impact + i % 3 * 18) + 'ms');
                    sparks.append(spark);
                }
                effects.append(sparks);
            }
            this.root.append(effects, card);
            this.root.hidden = false;
            this.position();
            // The sound lands with the flip, and is cancelled with a stale reveal.
            if (typeof onReveal === 'function') this.soundTimer = setTimeout(onReveal, quiet ? 0 : profile.impact);
            this.timer = setTimeout(() => this.close(), profile.duration);
            this.quiet = quiet;
            return true;
        }

        position() {
            const {renderer, player} = this.app.game;
            if (this.root.hidden || !renderer?.getScreenPosition || !player) return;
            const origin = renderer.getScreenPosition(player.x + 8, player.y + 8);
            const bodyHalfWidth = Math.max(8, (player.sprite?.width || 16) / 2);
            const edge = renderer.getScreenPosition(player.x + 8 + bodyHalfWidth, player.y + 8);
            const viewport = renderer.canvas.getBoundingClientRect();
            // Reserve the largest spring frame so it never swings over the player.
            const halfWidth = this.root.offsetWidth * this.profile.scale * 1.12 / 2;
            const halfHeight = this.root.offsetHeight * this.profile.scale * 1.12 / 2;
            const gap = Math.max(44, Math.abs(edge.x - origin.x) + 28);
            const minX = Math.max(8, viewport.left + 8) + halfWidth;
            const maxX = Math.min(window.innerWidth - 8, viewport.right - 8) - halfWidth;
            const top = viewport.bottom - viewport.top < halfHeight * 2 + 16 ? 8 : Math.max(8, viewport.top + 8);
            const bottom = viewport.bottom - viewport.top < halfHeight * 2 + 16 ? window.innerHeight - 8 : Math.min(window.innerHeight - 8, viewport.bottom - 8);
            const minY = top + halfHeight, maxY = bottom - halfHeight;
            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            let x, y = clamp(origin.y - halfHeight * .2, minY, maxY);
            if (origin.x + gap + halfWidth >= minX && origin.x + gap + halfWidth <= maxX) x = origin.x + gap + halfWidth;
            else if (origin.x - gap - halfWidth >= minX && origin.x - gap - halfWidth <= maxX) x = origin.x - gap - halfWidth;
            else {
                x = clamp(origin.x, minX, maxX);
                const above = origin.y - gap - halfHeight, below = origin.y + gap + halfHeight;
                y = above >= minY ? above : below <= maxY ? below : clamp(origin.y, minY, maxY);
            }
            this.root.style.left = x + 'px';
            this.root.style.top = y + 'px';
        }

        close() {
            clearTimeout(this.timer);
            if (this.root.hidden) return;
            this.root.classList.add('fc-leaving');
            this.timer = setTimeout(() => this.clear(), this.quiet ? 0 : 220);
        }

        clear() {
            clearTimeout(this.timer);
            clearTimeout(this.soundTimer);
            clearTimeout(this.resizeTimer);
            if (this.sprite) CardArtwork.cancel(this.sprite);
            this.sprite = null;
            this.root.hidden = true;
            this.root.replaceChildren();
        }

        destroy() {
            this.clear();
            window.removeEventListener('pagehide', this.onPageHide);
            window.removeEventListener('resize', this.onResize);
            this.root.remove();
        }
    }
    return FishingCatch;
});
