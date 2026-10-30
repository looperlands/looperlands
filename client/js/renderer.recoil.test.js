const fs = require('fs'), vm = require('vm');
class Character {}
class Mob extends Character {}
class Item {}
class Npc extends Character {}
let renderer;
vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), {
    Class: {extend: methods => methods},
    Types: {Orientations: {UP: 1}, alwaysOnTop: () => false, isFieldEffect: () => false},
    define: (_, factory) => { renderer = factory(null, Item, Character, Character, null, Mob, Npc); },
});
test.each([false, true])('body and equipment recoil together with flipped=%s; shadow stays planted', flip => {
    const actor = Object.assign(new Mob(), {id:7,hitPoints:60,maxHitPoints:100,x: 32, y: 48, flipSpriteX: flip, orientation: 2,
        sprite: {id: 1, name: 'body', width: 32, height: 32, offsetX: -8, offsetY: -12},
        currentAnimation: {name: 'atk_down', currentFrame: {x: 0, y: 0, index: 0}},
        hasShadow: () => true, hasWeapon: () => true, getWeaponName: () => 'sword', isVisible: () => true});
    const host = {scale: 2, tilesize: 16, upscaledRendering: true, drawEntityName: jest.fn(),
        game: {currentTime: 1000, combatFeedback: {getOffset: () => ({x: 2, y: 0})},
            shadows: {small: {id: 2, width: 16, height: 16}},
            sprites: {sword: {id: 3, width: 24, height: 24, offsetX: -4, offsetY: -8,
                animationData: {atk_down: {length: 5, row: 0}}}}}};
    actor.shadowOffsetX = actor.shadowOffsetY = 0;
    const [, data] = renderer.drawEntity.call(host, actor);
    const amount = flip ? -4 : 4;
    expect(data.drawData.find(draw => draw.spriteName === 'body').dx).toBe(-16 + amount);
    expect(data.drawData.find(draw => draw.spriteName === 'sword').dx).toBe(-8 + amount);
    expect(data.drawData.find(draw => draw.spriteName === 'shadow16').dx).toBe(0);
    expect(actor.x).toBe(32);
    expect(data.healthBar).toBeUndefined();
    host.game.combatPrototype={state:{live:true,mob:null},getHealthTargetId:()=>host.game.player?.target?.id};
    host.game.player={target:actor};
    expect(renderer.drawEntity.call(host,actor)[1].healthBar).toMatchObject({id:7,hp:60,maxHp:100});
    host.game.app={settings:{getMobHealthBarsEnabled:()=>false}};
    expect(renderer.drawEntity.call(host,actor)[1].healthBar).toBeUndefined();
    expect(host.game.player.target).toBe(actor);expect(actor.hitPoints).toBe(60);
    host.game.app.settings.getMobHealthBarsEnabled=()=>true;
    host.game.player.target={id:8};
    expect(renderer.drawEntity.call(host,actor)[1].healthBar).toBeUndefined();
});


test('trainer uses only its custom level/nameplate, while ordinary mob labels remain', () => {
    const actor=Object.assign(new Mob(), {id:7,name:'ogre',level:6,x:0,y:0});
    const host={scale:2,getHpIndicatorColor:()=> '#fff',game:{combatPrototype:{state:{mob:{id:7}}},
        app:{settings:{getRenderText:()=>true}}}};
    expect(renderer.drawEntityName.call(host,actor,-20)).toEqual([]);
    actor.id=8;
    expect(renderer.drawEntityName.call(host,actor,-20)[0].text).toBe('6 ogre');
});

test('live combat without a trainer renders avatar and mob names',()=>{
    const host={scale:2,getHpIndicatorColor:()=> '#fff',game:{playerId:1,combatPrototype:{state:{live:true,mob:null}},
        app:{settings:{getRenderText:()=>true,getRenderMyText:()=>true}}}};
    for(const actor of [Object.assign(new Character(),{id:1,name:'Local Looper',level:30,x:0,y:0}),
        Object.assign(new Mob(),{id:7,name:'spectre',level:6,x:0,y:0})]) {
        expect(renderer.drawEntityName.call(host,actor,-20)[0].text).toBe(actor.level+' '+actor.name);
    }
});
