// Offline playtest equivalent of the platform's UTC daily-play contract.
const DAY = 86400000;
const dayOf = now => new Date(now).toISOString().slice(0, 10);
const bonus = streak => streak === 3 ? 3 : streak > 0 && streak % 7 === 0 ? 7 : 0;
function award(days) {
    let previous, streak = 0;
    for (const day of Object.keys(days).sort()) {
        streak = Date.parse(day) - Date.parse(previous) === DAY ? streak + 1 : 1;
        days[day] = Math.max(days[day], bonus(streak));
        previous = day;
    }
}
function present(days = {}, now = Date.now()) {
    const today = dayOf(now), entries = Object.entries(days).filter(([day]) => day <= today);
    const known = new Map(entries), checkedInToday = known.has(today);
    let cursor = Date.parse(today) - (checkedInToday ? 0 : DAY), streak = 0;
    while (known.has(dayOf(cursor))) {streak++; cursor -= DAY;}
    const nextBonusDay = streak < 3 ? 3 : (Math.floor(streak / 7) + 1) * 7;
    return {points: entries.length + entries.reduce((sum, [, value]) => sum + value, 0), activeDays: entries.length,
        streak, checkedInToday, todayPoints: checkedInToday ? 1 + known.get(today) : 0,
        nextBonusDay, nextBonusPoints: bonus(nextBonusDay), resetsAt: new Date(Date.parse(today) + DAY).toISOString()};
}
module.exports = {award, present, dayOf};
