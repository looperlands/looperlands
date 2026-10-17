/* Space Owls host. Sends appearance only; never session IDs, wallets or inventory. */
(function (root) {
    'use strict';
    let active = null;

    function avatarContext(game, baseURL) {
        const player = game.player;
        const sprite = player && (player.getArmorSprite ? player.getArmorSprite() : player.sprite);
        if (!sprite || !sprite.filepath || !sprite.animationData) {
            throw new Error('Your Looper is still loading. Try the cabinet again in a moment.');
        }
        const src = new URL(sprite.filepath, baseURL);
        if (!['http:', 'https:'].includes(src.protocol)) throw new Error('Unsupported avatar image.');
        const width = Number(sprite.width), height = Number(sprite.height);
        if (!(width > 0 && height > 0 && width <= 512 && height <= 512)) throw new Error('Invalid avatar dimensions.');
        // Static sprites may be loaded at 2x/3x by the world renderer. Dynamic NFTs use 1x.
        const sourceScale = sprite.dynamicNFT ? 1 : (Number(sprite.scale) || 1);
        return {
            name: String(player.name || 'Looper').slice(0, 40),
            muted: game.audioManager?.enabled === false,
            avatar: {src: src.href, config: {
                width: width * sourceScale, height: height * sourceScale,
                scale: 56 / (Math.max(width, height) * sourceScale),
                offset_x: 0, offset_y: 0,
                animations: JSON.parse(JSON.stringify(sprite.animationData))
            }}
        };
    }

    function isGuestMessage(event, frame, origin) {
        return event.source === frame.contentWindow && event.origin === origin &&
            event.data && event.data.channel === 'looper-arcade-v1';
    }

    // Share the world's deterministic pixel mask, including its reduced-motion fade.
    function dissolveAvatar(game) {
        const player = game.player;
        if (!Number.isFinite(game.currentTime)) return {duration: 0, finish() {}};
        const duration = game.app?.settings?.getReducedMotion?.() ? 120 : 600;
        const previous = player.pixelDissolve;
        const outgoing = {startedAt: game.currentTime, duration, incoming: false};
        player.pixelDissolve = outgoing;
        return {duration, finish(animate = true) {
            // Never overwrite a newer death/respawn effect or a replacement player.
            if (game.player !== player || player.pixelDissolve !== outgoing) return;
            player.pixelDissolve = animate && !player.isDead && !game.disconnected
                ? {startedAt: game.currentTime, duration, incoming: true} : (previous || null);
        }};
    }

    function open(game, options = {}) {
        if (active) return active;
        if (!game.player || game.player.isDead || game.disconnected) throw new Error('Return to the world before opening the arcade.');
        const context = avatarContext(game, document.baseURI);
        let container = document.getElementById('minigame');
        if (container?.classList.contains('active')) throw new Error('Close the other mini-game first.');
        const created = !container;
        if (!container) {
            container = document.createElement('div'); container.id = 'minigame';
            document.body.append(container);
        }
        if (!document.getElementById('looper-arcade-style')) {
            const style = document.createElement('link');
            style.id = 'looper-arcade-style'; style.rel = 'stylesheet';
            style.href = new URL('css/arcade.css', document.baseURI).href;
            document.head.append(style);
        }
        const previous = {
            classes: container.className, style: container.getAttribute('style'),
            loaded: game.minigameLoaded, focus: document.activeElement,
            children: [...container.children].map(child => [child, child.hidden]),
            music: game.audioManager?.currentMusic
        };
        previous.children.forEach(([child]) => { child.hidden = true; });
        container.className = 'active clickable ll-arcade-open';
        container.removeAttribute('style');
        const transition = dissolveAvatar(game);
        if (transition.duration) {
            container.classList.add('ll-arcade-entering');
            container.style.opacity = '0';
        }
        const entryTimer = setTimeout(() => {
            container.style.removeProperty('opacity');
            container.classList.remove('ll-arcade-entering');
        }, transition.duration ? transition.duration + 80 : 0);
        const panel = document.createElement('section');
        panel.className = 'll-arcade-panel'; panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Space Owls arcade');
        panel.innerHTML = '<header class="ll-arcade-bar"><strong>SPACE OWLS <span>M88N LABS × LOOPERLANDS</span></strong><button type="button">Return to world <kbd>Esc</kbd></button></header><p class="ll-arcade-loading" role="status">Bringing your Looper into the arcade…</p>';
        // LL listens for world clicks on body; modal controls must not bubble there.
        for (const type of ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend']) {
            panel.addEventListener(type, event => event.stopPropagation());
        }
        const closeButton = panel.querySelector('button');
        const status = panel.querySelector('[role="status"]');
        const frame = document.createElement('iframe');
        frame.title = 'Space Owls — free play';
        frame.setAttribute('allow', 'autoplay');
        frame.referrerPolicy = 'no-referrer';
        frame.src = new URL('apps/spaceowls/index.html?embedded=1', document.baseURI).href;
        panel.append(frame); container.append(panel);
        game.keyboardHandler?.handleBlur?.();
        game.touchListener?.reset?.();
        game.player?.disengage?.();
        game.player?.stop?.();
        game.player.pathRequestId = (game.player.pathRequestId || 0) + 1;
        game.minigameLoaded = true;
        game.audioManager?.fadeOutCurrentMusic?.(0.05);
        let result = null, closed = false;
        const timeout = setTimeout(() => {
            status.hidden = false;
            status.textContent = 'The arcade could not load. Return to the world and try again.';
        }, 15000);
        const close = (settings = {}) => {
            if (closed) return;
            closed = true;
            clearTimeout(timeout);
            clearTimeout(entryTimer);
            transition.finish(settings.rearm !== false);
            window.removeEventListener('message', onMessage);
            document.removeEventListener('keydown', onKey, true);
            // Destroying the browsing context stops all game loops, listeners and sound.
            panel.remove();
            if (created) container.remove();
            else {
                container.className = previous.classes;
                if (previous.style === null) container.removeAttribute('style');
                else container.setAttribute('style', previous.style);
                previous.children.forEach(([child, hidden]) => { child.hidden = hidden; });
            }
            game.minigameLoaded = previous.loaded;
            if (settings.resumeMusic !== false && previous.music && game.audioManager?.enabled) {
                game.audioManager.clearFadeOut?.(previous.music);
                game.audioManager.playMusic?.(previous.music);
            }
            active = null;
            game.arcadeSession = null;
            previous.focus?.focus?.({preventScroll: true});
            if (settings.rearm !== false) options.onClose?.(result);
        };
        function onKey(event) {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopImmediatePropagation(); close();
            } else if (event.key === 'Tab') {
                // Parent document focus stays in the modal. Guest handles its own boundary.
                event.preventDefault(); event.stopImmediatePropagation();
                frame.contentWindow.focus();
                frame.contentWindow.postMessage({channel: 'looper-arcade-v1', type: 'focus-entry', last: event.shiftKey}, window.location.origin);
            }
        }
        function onMessage(event) {
            if (!isGuestMessage(event, frame, window.location.origin)) return;
            if (event.data.type === 'ready') {
                frame.contentWindow.postMessage({channel: 'looper-arcade-v1', type: 'init', context}, window.location.origin);
            } else if (event.data.type === 'loaded') {
                clearTimeout(timeout); status.hidden = true; frame.contentWindow.focus();
            } else if (event.data.type === 'error') {
                clearTimeout(timeout); status.hidden = false;
                status.textContent = 'Your avatar could not load. Return to the world and try again.';
            } else if (event.data.type === 'close') close();
            else if (event.data.type === 'focus-exit') closeButton.focus();
            else if (event.data.type === 'result') {
                const {score, level} = event.data;
                if (Number.isSafeInteger(score) && score >= 0 && Number.isSafeInteger(level) && level > 0) {
                    result = {score, level, verified: false}; // Display only. Never a payout input.
                }
            }
        }
        closeButton.addEventListener('click', event => {
            event.preventDefault(); event.stopPropagation(); close();
        });
        window.addEventListener('message', onMessage);
        document.addEventListener('keydown', onKey, true);
        closeButton.focus();
        active = game.arcadeSession = {close};
        return active;
    }
    const api = {open, avatarContext, isGuestMessage, dissolveAvatar};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.LooperArcade = api;
})(typeof window !== 'undefined' ? window : globalThis);
