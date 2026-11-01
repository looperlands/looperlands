const {validate, isAvailable} = require('./contentavailability');
const halloween = {annual: {start: '10-15', end: '11-09'}};

test.each([
    ['2026-10-14T23:59:59.999Z', false],
    ['2026-10-15T00:00:00.000Z', true],
    ['2026-11-08T23:59:59.999Z', true],
    ['2026-11-09T00:00:00.000Z', false],
    ['2027-10-31T00:00:00.000Z', true]
])('annual availability uses UTC boundaries every year: %s', (date, active) => {
    expect(isAvailable(halloween, Date.parse(date))).toBe(active);
});

test('annual windows can cross New Year and leap-day windows are empty in other years', () => {
    const winter = {annual: {start: '12-20', end: '01-05'}};
    expect(isAvailable(winter, Date.parse('2026-12-31T23:59:59Z'))).toBe(true);
    expect(isAvailable(winter, Date.parse('2027-01-01T00:00:00Z'))).toBe(true);
    expect(isAvailable(winter, Date.parse('2027-01-05T00:00:00Z'))).toBe(false);
    const leap = {annual: {start: '02-29', end: '03-01'}};
    expect(isAvailable(leap, Date.parse('2028-02-29T12:00:00Z'))).toBe(true);
    expect(isAvailable(leap, Date.parse('2027-03-01T00:00:00Z'))).toBe(false);
});

test('one-off windows include their start and exclude their end without recurring', () => {
    const window = {startsAt: '2026-10-15T12:00:00Z', endsAt: '2026-11-09T12:00:00.500Z'};
    expect(isAvailable(window, Date.parse(window.startsAt) - 1)).toBe(false);
    expect(isAvailable(window, Date.parse(window.startsAt))).toBe(true);
    expect(isAvailable(window, Date.parse(window.endsAt) - 1)).toBe(true);
    expect(isAvailable(window, Date.parse(window.endsAt))).toBe(false);
    expect(isAvailable(window, Date.parse('2027-10-31T00:00:00Z'))).toBe(false);
    expect(isAvailable(undefined)).toBe(true);
    expect(() => validate(undefined)).not.toThrow();
});

test('a disabled schedule keeps its calendar but cannot become available', () => {
    const now = Date.parse('2026-10-31T12:00:00Z');
    for (const window of [halloween, {startsAt: '2026-10-30T00:00:00Z', endsAt: '2026-11-02T00:00:00Z'}]) {
        expect(isAvailable({...window, enabled: true}, now)).toBe(true);
        expect(isAvailable({...window, enabled: false}, now)).toBe(false);
        expect(() => validate({...window, enabled: 'false'})).toThrow('boolean');
    }
});

test.each([
    null, [], {}, {annual: {}}, {annual: {start: '10-15', end: '10-15'}},
    {annual: {start: '2-01', end: '03-01'}}, {annual: {start: '02-30', end: '03-01'}},
    {annual: {start: '13-01', end: '01-01'}}, {annual: {start: '10-15', end: '11-09', extra: true}},
    {...halloween, startsAt: '2026-01-01T00:00:00Z'},
    {startsAt: '2026-02-30T00:00:00Z', endsAt: '2026-03-02T00:00:00Z'},
    {startsAt: '2026-10-15T00:00:00+02:00', endsAt: '2026-11-09T00:00:00Z'},
    {startsAt: '2026-11-09T00:00:00Z', endsAt: '2026-10-15T00:00:00Z'},
    {startsAt: '2026-10-15T00:00:00Z', endsAt: '2026-10-15T00:00:00Z'},
    {startsAt: '2026-10-15T00:00:00Z', endsAt: '2026-11-09T00:00:00Z', extra: true}
])('invalid schedules fail validation and stay unavailable: %j', value => {
    expect(() => validate(value)).toThrow();
    expect(isAvailable(value)).toBe(false);
});

test('only development local playtests can override the content calendar', () => {
    const saved = {...process.env};
    jest.useFakeTimers().setSystemTime(new Date('2026-12-01T00:00:00Z'));
    try {
        process.env.LOOPERLANDS_CONTENT_DATE = '2026-10-31T12:00:00Z';
        process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        process.env.NODE_ENV = 'production';
        expect(isAvailable(halloween)).toBe(false);
        process.env.NODE_ENV = 'development';
        expect(isAvailable(halloween)).toBe(true);
        expect(isAvailable(halloween, Date.parse('2026-12-01T00:00:00Z'))).toBe(false);
        process.env.LOOPERLANDS_LOCAL_PLAYTEST = '0';
        expect(isAvailable(halloween)).toBe(false);
        process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        process.env.LOOPERLANDS_CONTENT_DATE = 'invalid';
        expect(isAvailable(halloween)).toBe(false);
        process.env.LOOPERLANDS_CONTENT_DATE = '';
        expect(isAvailable({annual: {start: '12-01', end: '12-02'}})).toBe(true);
    } finally {process.env = saved; jest.useRealTimers();}
});
