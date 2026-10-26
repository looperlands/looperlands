const {award, present} = require('./dailyplay');
function days(from, count) {return Object.fromEntries(Array.from({length: count}, (_, i) => [new Date(Date.parse(from)+i*86400000).toISOString().slice(0,10), 0]));}
test('daily play awards day three and each full week exactly once', () => {
    const ledger = days('2026-10-01', 14); award(ledger); award(ledger);
    expect(present(ledger, Date.parse('2026-10-14T12:00:00Z'))).toMatchObject({points:31, activeDays:14, streak:14, todayPoints:8, nextBonusDay:21});
});
test('UTC midnight preserves the streak until a full day is missed and never removes points', () => {
    const ledger = days('2026-10-01', 3); award(ledger);
    expect(present(ledger, Date.parse('2026-10-04T00:00:00Z'))).toMatchObject({points:6, streak:3, checkedInToday:false});
    expect(present(ledger, Date.parse('2026-10-05T00:00:00Z'))).toMatchObject({points:6, streak:0, nextBonusDay:3});
});
test('out-of-order activity completes bonuses and does not revoke already earned bonuses', () => {
    const ledger = {...days('2026-10-01', 3), ...days('2026-10-05', 3)}; award(ledger);
    const previous = present(ledger, Date.parse('2026-10-07')).points;
    ledger['2026-10-04'] = 0; award(ledger);
    expect(present(ledger, Date.parse('2026-10-07'))).toMatchObject({streak:7, points:17});
    expect(present(ledger, Date.parse('2026-10-07')).points).toBeGreaterThan(previous);
});
