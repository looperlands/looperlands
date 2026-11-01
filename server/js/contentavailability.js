// Content schedules use the server's UTC calendar, independently of the game's
// accelerated day/night clock. End boundaries are always exclusive.
function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function monthDay(value) {
    if (typeof value !== 'string' || !/^\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date('2000-' + value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(5, 10) === value;
}

function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return NaN;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) return NaN;
    return date.getTime();
}

function validate(availability) {
    if (availability === undefined) return;
    if (!object(availability)) throw new Error('Content availability must be an annual window or a UTC timestamp window.');
    if (availability.annual !== undefined) {
        const annual = availability.annual;
        if (Object.keys(availability).length !== 1 || !object(annual) || Object.keys(annual).some(key => !['start', 'end'].includes(key)) ||
            !monthDay(annual.start) || !monthDay(annual.end) || annual.start === annual.end) {
            throw new Error('Annual availability needs different start and end dates in MM-DD format.');
        }
        return;
    }
    const start = timestamp(availability.startsAt), end = timestamp(availability.endsAt);
    if (Object.keys(availability).some(key => !['startsAt', 'endsAt'].includes(key)) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        throw new Error('Availability needs UTC startsAt and endsAt timestamps, with the end after the start.');
    }
}

function currentTime() {
    const previewDate = process.env.LOOPERLANDS_CONTENT_DATE;
    return previewDate && require('./localplaytest').isLocalPlaytest() ? timestamp(previewDate) : Date.now();
}

function isAvailable(availability, now = currentTime()) {
    if (availability === undefined) return true;
    try {validate(availability);} catch (_) {return false;}
    const date = new Date(now);
    if (!Number.isFinite(date.getTime())) return false;
    if (availability.annual) {
        const day = date.toISOString().slice(5, 10), {start, end} = availability.annual;
        return start < end ? day >= start && day < end : day >= start || day < end;
    }
    return date.getTime() >= timestamp(availability.startsAt) && date.getTime() < timestamp(availability.endsAt);
}

module.exports = {validate, isAvailable};
