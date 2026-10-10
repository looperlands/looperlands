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
    return {duration, mainDaylight, previewTime, isInRange};
});
