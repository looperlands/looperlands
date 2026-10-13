// Redistribute an existing swing's duration; combat cadence stays unchanged.
define(function () {
    return function attackTiming(speed, length) {
        const uniformSpeed = Array.isArray(speed) ? speed[0] : speed;
        if (!Number.isFinite(uniformSpeed) || uniformSpeed <= 0 || !Number.isInteger(length) || length < 3 ||
            (Array.isArray(speed) && !speed.every(value => value === uniformSpeed))) return speed;
        const contact = Math.floor(length / 2);
        // Hold the anticipation, snap through contact, then let the pose settle.
        const weights = Array.from({length}, (_, index) =>
            index === 0 ? 1.6 : index === contact ? 0.2 : index === length - 1 ? 1.4 : index < contact ? 0.35 : 0.65);
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        return weights.map(weight => uniformSpeed * length * weight / total);
    };
});
