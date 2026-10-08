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
    return {duration, mainDaylight, previewTime};
});
