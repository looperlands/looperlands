const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(require.resolve('./questbuilder'), 'utf8');

function fixture(current, bundledId) {
    let change;
    const select = {replaceChildren(...options) {this.options = options;}, append(value) {this.options.push(value);},
        addEventListener(name, listener) {change = listener;}};
    const nodes = {'quest-availability': select, 'quest-availability-field': {}, 'quest-availability-hint': {}};
    const context = {$: id => nodes[id], option: (value, text) => ({value, text}), quest: () => current, bundledId,
        changed: jest.fn(), data: {catalog: {seasonalEvents: [
            {id: 'autumn-market', name: 'Autumn market', enabled: false}, {id: 'spring-fair', name: 'Spring fair', enabled: true}
        ]}}};
    const render = source.slice(source.indexOf('    function renderAvailability('), source.indexOf('    function renderProgressHelp('));
    const handler = source.slice(source.indexOf("    $('quest-availability').addEventListener('change'"), source.indexOf("    $('quest-ordered').addEventListener"));
    vm.createContext(context); vm.runInContext(render + handler, context);
    context.renderAvailability(current, !!bundledId);
    return {select, nodes, changed: context.changed, choose(value) {select.value = value; change();}};
}

test('the availability dropdown includes disabled events and saves only the selected reference', () => {
    const current = {}, f = fixture(current);
    expect(f.select.options).toContainEqual({value: 'autumn-market', text: 'Autumn market (disabled)'});
    f.choose('autumn-market');
    expect(current).toEqual({availabilityEvent: 'autumn-market'});
    expect(f.nodes['quest-availability-hint'].textContent).toContain('enabled setting and UTC window');
    f.choose(''); expect(current).toEqual({}); expect(f.changed).toHaveBeenCalledTimes(2);
});

test('opening and preserving an explicit source window does not silently discard it', () => {
    const window = {annual: {start: '10-01', end: '11-01'}}, current = {availability: window}, f = fixture(current);
    expect(f.select.value).toBe('__explicit__');
    f.choose('__explicit__'); expect(current.availability).toBe(window); expect(f.changed).not.toHaveBeenCalled();
    f.choose('spring-fair'); expect(current).toEqual({availabilityEvent: 'spring-fair'});
});

test('missing references remain visible for repair and bundled quest schedules cannot be changed here', () => {
    const current = {availabilityEvent: 'removed'}, f = fixture(current);
    expect(f.select.options).toContainEqual({value: 'removed', text: 'removed · missing event'});
    const bundled = fixture(current, 'HALLOWEEN_WELCOME');
    expect(bundled.select.disabled).toBe(true); expect(bundled.nodes['quest-availability-field'].hidden).toBe(true);
    bundled.choose('spring-fair'); expect(current.availabilityEvent).toBe('removed');
});
