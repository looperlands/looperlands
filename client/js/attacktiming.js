// Redistribute an existing swing's duration; combat cadence stays unchanged.
define(function () {
    return function attackTiming(speed, length) {
        if (!Number.isFinite(speed) || speed <= 0 || !Number.isInteger(length) || length < 3) return speed;
        const contact = Math.floor(length / 2);
        const weights = Array.from({length}, (_, index) =>
            index === contact ? 0.5 : index === 0 || index === length - 1 ? 1.25 : 1);
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        return weights.map(weight => speed * length * weight / total);
    };
});
