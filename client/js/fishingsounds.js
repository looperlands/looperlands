define(function () {
    const tau = Math.PI * 2;

    // These short mono clips share the spatial effects bus. Build each once, on first use.
    function clip(duration, sample) {
        let buffer;
        return function (context) {
            if (buffer) return buffer;
            const rate = 22050;
            buffer = context.createBuffer(1, Math.ceil(duration * rate), rate);
            const data = buffer.getChannelData(0);
            let fast = 0, slow = 0;
            for (let i = 0; i < data.length; i++) {
                const t = i / rate, noise = Math.random() * 2 - 1;
                fast += .55 * (noise - fast);
                slow += .09 * (noise - slow);
                const taper = Math.min(1, t / .003, (duration - t) / .009);
                data[i] = sample(t, fast - slow) * taper;
            }
            return buffer;
        };
    }

    function plip(t, pitch) {
        if (t < 0) return 0;
        const phase = pitch * t + 5 * (1 - Math.exp(-35 * t));
        return Math.sin(tau * phase) * (1 - Math.exp(-480 * t)) * Math.exp(-26 * t);
    }

    return {
        cast: clip(.24, (t, hiss) => Math.sin(Math.PI * t / .24) ** 2 *
            (hiss * .85 + .13 * Math.sin(tau * (940 * t - 1420 * t * t)))),
        land: clip(.26, (t, hiss) => .77 * plip(t, 175) + .32 * plip(t - .055, 330) + hiss * .32 * Math.exp(-24 * t)),
        bite: clip(.29, t => .56 * plip(t, 410) + .72 * plip(t - .105, 595)),
        reel: clip(.25, (t, hiss) => {
            const tooth = (29 * t - 23 * t * t) % 1;
            return Math.exp(-tooth * 8 - 2 * t) * (.8 * hiss + .36 * Math.sin(tau * 860 * t));
        })
    };
});
