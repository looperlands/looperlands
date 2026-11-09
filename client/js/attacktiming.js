// Keep swing artwork readable without changing the combat cooldown.
define(function () {
    return function attackTiming(speed, length) {
        const uniformSpeed = Array.isArray(speed) ? speed[0] : speed;
        if (!Number.isFinite(uniformSpeed) || uniformSpeed <= 0 || !Number.isInteger(length) || length < 3 ||
            (Array.isArray(speed) && !speed.every(value => value === uniformSpeed))) return speed;
        // Retain a little anticipation and recovery while showing every frame.
        const weights = Array.from({length}, (_, index) =>
            index === 0 || index === length - 1 ? 1.2 : 1);
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        const frameDuration = Math.max(uniformSpeed * length / total, 80);
        return weights.map(weight => frameDuration * weight);
    };
});
