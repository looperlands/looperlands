define(['sprites'], function (metadata) {
    const cache = new Map(), current = new WeakMap();
    const retryDelay = 5000;
    const idleAnimations = ['idle_down', 'idle', 'idle_right', 'idle_up', 'walk_down'];

    function spriteSource(sprite, url) {
        if (!sprite?.width || !sprite?.height) return null;
        const path = url || sprite.filepath || sprite.image?.src || (sprite.baseImageURL && sprite.getUrlByScale?.(1));
        if (!path) return null;
        return {url: path, width: sprite.width, height: sprite.height,
            scale: url || !sprite.filepath || sprite.dynamicNFT ? 1 : sprite.scale || 1,
            animations: sprite.animationData || sprite.animations};
    }

    function sources(game, app, type) {
        const player = game.player, avatar = type === 'avatar';
        const name = avatar ? player.getSpriteName() : player.getWeaponName();
        const dynamic = avatar ? player.dynamicArmorNFTData : player.dynamicWeaponNFTData;
        const result = [];
        result.push(spriteSource(avatar ? player.normalSprite || player.sprite : game.sprites[name]));
        // Dynamic sprites do not have a static baseImageURL. Reconstruct only
        // from the current asset's metadata when its runtime sprite is not ready.
        if (dynamic?.tokenHash && dynamic.nftId?.replace('0x', 'NFT_') === name) {
            const asset = avatar ? 'looper' : dynamic.assetType;
            const template = avatar ? metadata.clotharmor : asset === 'ranged_weapon'
                ? metadata.NFT_ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273
                : asset === 'fishingrod' ? metadata.NFT_344a35ef18eafc0708b2e42b14443db0990fa39977d9347fb256905cbd5ba819 : metadata.redsword;
            result.push(spriteSource(template, 'https://looperlands.sfo3.digitaloceanspaces.com/assets/' + asset + '/1/' + dynamic.tokenHash + '.png'));
        }
        result.push(spriteSource(metadata[name], 'img/1/' + name + '.png'));
        if (!avatar) {
            result.push(spriteSource(game.sprites['item-' + name]));
            const icon = app.dynamicNFTIconURL?.[name];
            // Ranged assets use their full gameplay sheet, not an item icon.
            if (icon?.includes('_icon.png')) result.push({url: icon.replace('/3/', '/1/')});
            result.push({url: 'img/1/item-' + name + '.png'});
        }
        return result.filter(Boolean);
    }

    function visibleBounds(image, source) {
        const scale = source.scale || 1;
        const width = source.width ? source.width * scale : image.naturalHeight;
        const height = source.height ? source.height * scale : image.naturalHeight;
        const animations = source.animations || {idle: {row: 0, length: 1}};
        const names = [...new Set([...idleAnimations, ...Object.keys(animations)])].filter(name => animations[name]);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        for (const name of names) {
            const animation = animations[name];
            for (let column = 0; column < animation.length; column++) {
                const x = column * width, y = animation.row * height;
                if (x + width > image.naturalWidth || y + height > image.naturalHeight) continue;
                if (!ctx) return {x, y, width, height, scale};
                ctx.clearRect(0, 0, width, height); ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
                let pixels;
                try {pixels = ctx.getImageData(0, 0, width, height).data;}
                catch {return {x, y, width, height, scale};}
                let left = width, top = height, right = -1, bottom = -1;
                for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
                    if (!pixels[(row * width + col) * 4 + 3]) continue;
                    left = Math.min(left, col); top = Math.min(top, row); right = Math.max(right, col); bottom = Math.max(bottom, row);
                }
                if (right >= left) return {x: x + left, y: y + top, width: right - left + 1, height: bottom - top + 1, scale};
            }
        }
        return null;
    }

    function load(source) {
        const key = JSON.stringify(source), previous = cache.get(key);
        if (previous && previous.expires > Date.now()) return previous.promise;
        const entry = {expires: Infinity};
        entry.promise = new Promise((resolve, reject) => {
            const image = new Image(); image.crossOrigin = 'anonymous';
            image.onload = () => {
                try {
                    const bounds = visibleBounds(image, source);
                    if (!bounds) {reject(new Error('Empty artwork')); return;}
                    resolve({...bounds, sheetWidth: image.naturalWidth, sheetHeight: image.naturalHeight, url: source.url});
                } catch (error) {reject(error);}
            };
            image.onerror = () => reject(new Error('Artwork could not load'));
            image.src = source.url;
        }).catch(error => {entry.expires = Date.now() + retryDelay; throw error;});
        if (cache.size >= 64) cache.delete(cache.keys().next().value);
        cache.set(key, entry); return entry.promise;
    }

    function render(element, candidates, status, options = {}) {
        const key = JSON.stringify([candidates, options]), previous = current.get(element);
        if (previous?.key === key && previous.expires > Date.now()) return previous.promise;
        const request = {key, expires: Infinity}; current.set(element, request);
        element.hidden = !options.slot;
        if (options.slot) element.style.backgroundImage = 'none';
        if (status) {status.hidden = false; status.textContent = 'Loading artwork…';}
        request.promise = (async () => {
            let fallback = false;
            for (const source of candidates) {
                try {
                    const image = await load(source);
                    if (current.get(element) !== request) return false;
                    const backgroundImage = 'url("' + new URL(image.url, document.baseURI).href + '")';
                    if (options.slot) {
                        // A square virtual crop centers the full weapon in the
                        // responsive HUD slot without changing its click target.
                        const side = Math.max(image.width, image.height);
                        const x = image.x - (side - image.width) / 2, y = image.y - (side - image.height) / 2;
                        Object.assign(element.style, {backgroundImage,
                            backgroundSize: image.sheetWidth / side * 100 + '% ' + image.sheetHeight / side * 100 + '%',
                            backgroundPosition: (image.sheetWidth === side ? 50 : x / (image.sheetWidth - side) * 100) + '% ' +
                                (image.sheetHeight === side ? 50 : y / (image.sheetHeight - side) * 100) + '%',
                            backgroundRepeat: 'no-repeat'});
                    } else {
                        // Fit visible pixels, not the often mostly empty 48px frame.
                        const zoom = Math.max(1, Math.floor(Math.min(114 / (image.width / image.scale), 104 / (image.height / image.scale))));
                        const factor = Math.min(zoom / image.scale, 114 / image.width, 104 / image.height);
                        Object.assign(element.style, {width: image.width * factor + 'px', height: image.height * factor + 'px',
                            backgroundImage, backgroundSize: image.sheetWidth * factor + 'px ' + image.sheetHeight * factor + 'px',
                            backgroundPosition: -image.x * factor + 'px ' + -image.y * factor + 'px', transform: 'none'});
                    }
                    request.expires = fallback ? Date.now() + retryDelay : Infinity;
                    element.hidden = false; if (status) status.hidden = true;
                    return true;
                } catch {fallback = true;}
            }
            if (current.get(element) === request) {
                request.expires = Date.now() + retryDelay;
                if (status) status.textContent = 'Artwork unavailable';
            }
            return false;
        })();
        return request.promise;
    }
    return {sources, render, cancel: element => current.delete(element)};
});
