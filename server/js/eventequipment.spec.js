const {EventEquipment, effectiveLevel, effectiveLevelInfo} = require('./eventequipment');
describe('event equipment', () => {
    const grant = {runId:'round',startsAt:'2026-10-08T10:00:00Z',endsAt:'2026-10-08T11:00:00Z',maps:['arena'],avatarLevel:20,weaponLevel:10,borrowedNftIds:['loan']};
    const now = Date.parse('2026-10-08T10:30:00Z');
    test('levels only change on event maps, during the round, for signed-up sessions', () => {
        const player={eventGrants:[grant],mapId:'arena',level:75,connection:{close:jest.fn()}};
        expect(effectiveLevel(player,'avatarLevel',75,now)).toBe(20);
        expect(effectiveLevel(player,'weaponLevel',65,now)).toBe(10);
        expect(player.level).toBe(75);
        expect(effectiveLevel({...player,mapId:'main'},'avatarLevel',75,now)).toBe(75);
        expect(effectiveLevel({...player,eventGrants:[]},'avatarLevel',75,now)).toBe(75);
        expect(effectiveLevel(player,'avatarLevel',75,Date.parse(grant.endsAt))).toBe(75);
    });
    test('conflicting event levels refuse gameplay instead of combining bonuses', () => {
        const player={eventGrants:[grant,{...grant,avatarLevel:30}],mapId:'arena',connection:{close:jest.fn()}};
        expect(effectiveLevel(player,'avatarLevel',75,now)).toBe(75);
        expect(player.connection.close).toHaveBeenCalled();
    });
    test('revoked borrowed avatar access closes its session', async () => {
        const service=new EventEquipment({getEventEquipment:jest.fn().mockResolvedValue({grants:[]})},false);
        const player={nftId:'loan',walletId:'wallet',eventGrants:[grant],connection:{close:jest.fn()}};
        await service.refresh(player);
        expect(player.connection.close).toHaveBeenCalled();
    });
    test('expired rentals close online sessions without waiting for the worker', () => {
        jest.useFakeTimers().setSystemTime(Date.parse(grant.endsAt));
        const service=new EventEquipment({},false);
        const player={nftId:'loan',eventGrants:[grant],connection:{close:jest.fn()}};
        service.players.add(player);service.tick();
        expect(player.connection.close).toHaveBeenCalled();expect(service.players.size).toBe(0);
        jest.useRealTimers();
    });
});

test('statistics show event levels while retaining the original progress outside the round', () => {
    const original={currentLevel:75,percentage:'42.00'};
    const player={mapId:'arena',eventGrants:[{startsAt:'2026-10-08T10:00:00Z',endsAt:'2026-10-08T11:00:00Z',maps:['arena'],avatarLevel:20,weaponLevel:10}]};
    const now=Date.parse('2026-10-08T10:30:00Z');
    expect(effectiveLevelInfo(player,'avatarLevel',original,now)).toEqual({currentLevel:20,percentage:'0.00',normalLevel:75});
    expect(effectiveLevelInfo(player,'weaponLevel',original,now).currentLevel).toBe(10);
    expect(original).toEqual({currentLevel:75,percentage:'42.00'});
    expect(effectiveLevelInfo({...player,mapId:'main'},'avatarLevel',original,now)).toBe(original);
});
