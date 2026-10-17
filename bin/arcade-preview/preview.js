(async () => {
    const play = document.getElementById('play');
    const cabinet = document.getElementById('cabinet');
    const scene = document.querySelector('.scene');
    const status = document.getElementById('return-status');
    const worldCanvas = document.getElementById('world-avatar');
    const options = [...document.querySelectorAll('[data-avatar]')];
    const assets = new Map();
    const config = await fetch('sprites/clotharmor.json').then(r => r.json());
    let selected = 'clotharmor', entering = false;
    const game = {minigameLoaded: false, player: null};
    function draw(canvas, image, frame = 0) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, frame * 32, config.animations.idle_down.row * 32, 32, 32, 0, 0, canvas.width, canvas.height);
    }
    function select(button) {
        selected = button.dataset.avatar;
        const image = assets.get(selected);
        game.player = {name: button.innerText.trim(), sprite: {
            filepath: image.src, width: config.width, height: config.height, scale: 1, animationData: config.animations
        }, stop() {}};
        options.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
        draw(worldCanvas, image);
    }
    try {
        await Promise.all(options.map(async button => {
            const image = new Image();
            await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = 'img/1/' + button.dataset.avatar + '.png'; });
            assets.set(button.dataset.avatar, image);
            draw(button.querySelector('canvas'), image);
            button.addEventListener('click', () => { if (!entering && !game.minigameLoaded) select(button); });
        }));
        select(options[0]); play.disabled = false; play.textContent = 'Enter the arcade';
    } catch (_) { status.textContent = 'Avatar assets could not load. Refresh to try again.'; return; }
    async function enter() {
        if (entering || game.minigameLoaded || play.disabled) return;
        entering = true; scene.classList.add('entering'); play.disabled = true; cabinet.disabled = true;
        status.textContent = 'Entering Space Owls…';
        await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650));
        try {
            window.LooperArcade.open(game, {onClose(result) {
                scene.classList.remove('entering');
                play.disabled = false; cabinet.disabled = false;
                status.textContent = result ? `Back in the world. Score ${result.score.toLocaleString()} · level ${result.level}.` : 'Back beside the cabinet. Your Looper is ready for another run.';
            }});
        } catch (error) {
            scene.classList.remove('entering'); play.disabled = false; cabinet.disabled = false;
            status.textContent = error.message;
        } finally { entering = false; }
    }
    play.addEventListener('click', enter); cabinet.addEventListener('click', enter);
    document.addEventListener('keydown', event => {
        if (event.key === 'Enter' && event.target === document.body && !game.minigameLoaded) { event.preventDefault(); enter(); }
    });
    setInterval(() => { if (!entering && !game.minigameLoaded) draw(worldCanvas, assets.get(selected), Math.floor(Date.now() / 350) % 2); }, 350);
})();
