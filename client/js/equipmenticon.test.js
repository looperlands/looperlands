const fs = require('fs');
const vm = require('vm');

const weapon = 'NFT_32108d388ed1fccc3a80d9237f3f72e842aa727a16d2ed8d57c93849ee562cc7';
const source = require('../sprites/' + weapon + '.json');
let EquipmentIcon;
vm.runInNewContext(fs.readFileSync(require.resolve('./equipmenticon'), 'utf8'), {
    define: (_, factory) => {EquipmentIcon = factory({[weapon]: source, sword1: {}});}
});

test.each([1, 2, 3])('the axe icon selects the complete 19px region at asset scale %i', scale => {
    const icon = EquipmentIcon.get(weapon, scale);
    const png = fs.readFileSync(require.resolve('../img/' + scale + '/' + weapon + '.png'));
    const sheet = [png.readUInt32BE(16) / scale, png.readUInt32BE(20) / scale];
    const size = icon.style['background-size'].split(' ').map(parseFloat);
    const position = icon.style['background-position'].split(' ').map(parseFloat);
    const crop = sheet.map((extent, axis) => extent / (size[axis] / 100));
    const origin = sheet.map((extent, axis) => (extent - crop[axis]) * position[axis] / 100);

    expect(icon.style['background-image']).toContain('img/' + scale + '/' + weapon + '.png');
    expect(crop[0]).toBeCloseTo(19);
    expect(crop[1]).toBeCloseTo(19);
    expect(origin[0]).toBeCloseTo(51);
    expect(origin[1]).toBeCloseTo(396);
    expect(icon.width).toBe(19);
    expect(icon.height).toBe(19);
});

test('ordinary and dynamically loaded weapons retain their existing icon paths', () => {
    expect(EquipmentIcon.get('sword1')).toBeNull();
    expect(EquipmentIcon.get('unknown-dynamic-weapon')).toBeNull();
});
