(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HitFeel = factory();
})(typeof window === 'object' ? window : this, function () {
    const presets = {
        subtle: {flash:50, sparks:8, recoil:3, shake:1, freeze:30},
        balanced: {flash:65, sparks:12, recoil:5, shake:1, freeze:45},
        arcade: {flash:80, sparks:18, recoil:8, shake:2, freeze:65}
    };
    // Elapsed time drives presentation only. Nothing here changes an entity or a combat clock.
    function sample(age, config, options = {}, critical = false) {
        const active = age >= 0 && age < 420;
        const strength = critical ? 1.4 : 1;
        const freeze = options.freeze && !options.reduced ? config.freeze + (critical ? 15 : 0) : 0;
        const motionAge = Math.max(0, age - freeze);
        const shakeHit = critical || options.kill || options.counter;
        return {
            active,
            flash: active && options.flash && age < config.flash,
            frozen: active && age < freeze,
            poseAge: active ? motionAge : Math.max(0, age),
            recoil: active && options.recoil && !options.reduced && motionAge < 200
                ? Math.round(config.recoil * strength * Math.pow(1 - motionAge / 200, 2)) : 0,
            shakeX: active && shakeHit && options.shake && !options.reduced && age < 150
                ? Math.round(Math.cos(age / 11) * config.shake * strength * (1 - age / 150)) : 0,
            shakeY: active && shakeHit && options.shake && !options.reduced && age < 150
                ? Math.round(Math.sin(age / 15) * config.shake * .6 * strength * (1 - age / 150)) : 0,
            particles: active && options.particles && !options.reduced && motionAge < 280 ? config.sparks : 0,
            particleAge: motionAge
        };
    }
    function healthTrail(age, hp) {
        if (age < 160) return 1;
        return hp + (1-hp) * Math.max(0, 1-(age-160)/380);
    }
    function squash(age, enabled, reduced) {
        const amount = enabled && !reduced && age >= 0 && age < 170 ? .16 * Math.pow(1-age/170,2) : 0;
        return {x:1+amount,y:1-amount};
    }
    return {presets, sample, healthTrail, squash};
});
