// One clock curve shared by scene lighting, atmosphere and the HUD.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else root.WorldTime = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const duration = 1000 * 60 * 60;
    function mainDaylight(time) {
        const minute = ((time % duration) + duration) % duration / 60000;
        if (minute < 40) return 1;
        if (minute < 45) return (Math.cos((minute - 40) / 5 * Math.PI) + 1) / 2;
        if (minute < 55) return 0;
        return (1 - Math.cos((minute - 55) / 5 * Math.PI)) / 2;
    }
    function previewTime(mode, time, hour) {
        if (Number.isFinite(hour) && hour >= 0 && hour < 24) return hour / 24 * duration;
        return mode === 'day' ? 20 * 60000 : mode === 'night' ? 50 * 60000 : time;
    }
    function isInRange(time, range) {
        if (range === undefined) return true;
        if (typeof range !== 'string' || !Number.isFinite(time)) return false;
        const match = range.trim().match(/^(\d{1,2}):([0-5]\d)\s*-\s*(\d{1,2}):([0-5]\d)$/);
        if (!match || Number(match[1]) > 23 || Number(match[3]) > 23) return false;
        const start = Number(match[1]) * 60 + Number(match[2]);
        const end = Number(match[3]) * 60 + Number(match[4]);
        const minute = ((time % duration) + duration) % duration / duration * 1440;
        // Equal endpoints mean all day. Overnight windows wrap through midnight.
        return start === end || (start < end ? minute >= start && minute < end : minute >= start || minute < end);
    }
    const smooth = value => (1 - Math.cos(Math.max(0, Math.min(1, value)) * Math.PI)) / 2;
    function atmosphereLight(config, time) {
        const cycle = config.dayNight;
        const hour = ((time % duration) + duration) % duration / duration * 24;
        let daylight = config.cycle ? mainDaylight(time) : 1, warmth = 0, warmColor;
        if (config.cycle && cycle) {
            if (hour < cycle.dawn || hour >= cycle.dusk + cycle.duskDuration) daylight = 0;
            else if (hour < cycle.dawn + cycle.dawnDuration) {
                const progress = (hour - cycle.dawn) / cycle.dawnDuration;
                daylight = smooth(progress); warmth = Math.sin(progress * Math.PI); warmColor = cycle.dawnColor;
            } else if (hour < cycle.dusk) daylight = 1;
            else {
                const progress = (hour - cycle.dusk) / cycle.duskDuration;
                daylight = 1 - smooth(progress); warmth = Math.sin(progress * Math.PI); warmColor = cycle.duskColor;
            }
        }
        const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        const mix = (a, b, amount) => a.map((value, i) => value + (b[i] - value) * amount);
        let tint = rgb(config.color || '#000000');
        if (cycle && config.cycle) {
            tint = mix(rgb(cycle.nightColor), rgb(cycle.dayColor), daylight);
            if (warmColor) tint = mix(tint, rgb(warmColor), warmth * .7);
        }
        return {daylight, darkness: config.nightDarkness + daylight * (config.dayDarkness - config.nightDarkness),
            color: '#' + tint.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')};
    }
    function atmosphereDarkness(config, time) {return atmosphereLight(config, time).darkness;}
    return {duration, mainDaylight, previewTime, isInRange, atmosphereDarkness, atmosphereLight};
});
