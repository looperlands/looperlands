define(function () {
    const STEP_PIXELS = 6;
    const BAYER_2X2 = [0, 2, 3, 1];
    const DURATION_MS = 550;

    return function playDiagonalWipe(canvas, renderer, revealing, reducedMotion) {
        const context = canvas.getContext('2d');
        if (reducedMotion || !context) {
            canvas.width = canvas.height = 1;
            canvas.style.backgroundColor = revealing ? 'transparent' : 'black';
            return Promise.resolve();
        }

        // The mask shares the world viewport's CSS scale. Work in native art pixels.
        const width = canvas.width = Math.ceil(renderer.canvas.width / renderer.scale);
        const height = canvas.height = Math.ceil(renderer.canvas.height / renderer.scale);
        const columns = Math.ceil(width / STEP_PIXELS), rows = Math.ceil(height / STEP_PIXELS);
        const mask = context.createImageData(width, height);
        const thresholds = new Uint16Array(width * height);
        for (let y = 0; y < height; y++) {
            const row = Math.floor(y / STEP_PIXELS);
            for (let x = 0; x < width; x++) {
                const grain = BAYER_2X2[(y % 2) * 2 + x % 2];
                thresholds[y * width + x] = Math.floor(x / STEP_PIXELS) + row + grain;
            }
        }
        canvas.style.backgroundColor = 'transparent';

        const start = performance.now();
        return new Promise(resolve => {
            function draw(now) {
                const progress = Math.min(1, (now - start) / DURATION_MS);
                const diagonal = Math.round(progress * (columns + rows - 2 + BAYER_2X2.length));
                for (let i = 0; i < thresholds.length; i++) {
                    const swept = thresholds[i] < diagonal;
                    mask.data[i * 4 + 3] = swept !== revealing ? 255 : 0;
                }
                context.putImageData(mask, 0, 0);
                if (progress === 1) resolve();
                else requestAnimationFrame(draw);
            }
            draw(start);
        });
    };
});
