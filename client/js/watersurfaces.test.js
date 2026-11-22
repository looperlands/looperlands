const fs = require('fs'), vm = require('vm');
const Water = require('./watersurfaces');
const pond = {id:'pool', name:'Pool', kind:'pond', x:0, y:0, width:6, height:4, shape:'oval', depth:'swim', paint:true};
const deck = {id:'deck', name:'Bridge', kind:'dry', x:2, y:1, width:1, height:2};
const stream = {...pond, id:'flow', kind:'stream', shape:'rect', depth:'wade', flow:'east', paint:false};
const map = {width:12, height:16};
test('shore, wading depth and dry decks are resolved at the interpolated feet', () => {
    const field = new Water.Field([pond, deck]);
    expect(field.sample(1, 1)).toBeNull();
    expect(field.sample(3, 32).depth).toBeLessThan(.2);
    const distantIsland = {...deck, x:20, shape:'natural'};
    expect(new Water.Field([pond,distantIsland]).sample(48,15).depth).toBe(new Water.Field([pond]).sample(48,15).depth);
    expect(field.sample(68,32).depth).toBe(1);
    expect(field.sample(38,25)).toBeNull();
    expect(field.sample(49,25).depth).toBeLessThan(.1);
    expect(new Water.Field([pond, stream]).sample(60,32)).toEqual({area:stream, depth:.3});
    expect(new Water.Field([pond, deck, stream]).sample(38,25)).toBeNull();
});
test('reflection attachments carry only the selected scenery cells in their original paint order', () => {
    const reflection = {id:'tree', name:'Tree', kind:'reflection', x:1, y:0, width:2, height:2};
    const source = new Water.Field([reflection]).reflectionSources({width:3, data:[1,[2,9,5],2,1,7,3], high:[7]});
    expect(source).toEqual([{area:reflection,cells:[{x:0,y:0,layers:[9,5]},{x:0,y:1,layers:[7]}]}]);
});
test.each([
    [{...pond, width:13}], [{...pond,x:-1}], [pond,pond], [{...pond,paint:1}], [{...stream,flow:'out'}],
    [{...deck,depth:'swim'}], [{...pond,depth:'deep'}], [{...pond,shape:'round'}], [{...pond,name:'<invalid>'}],
    [{id:'big', name:'Big', kind:'reflection', x:0,y:0,width:1,height:13}]
].map(areas => [areas]))('rejects invalid authoring without changing the map', areas => {
    expect(() => Water.validate(areas, map)).toThrow();
});
test('accepts opt-out and stock-art stream choices', () => {
    expect(() => Water.validate([],map)).not.toThrow();
    expect(() => Water.validate([pond,stream,deck],map)).not.toThrow();
});
test.each([1,2,3])('clips gear and the current body pose to a common plane at zoom %s', scale => {
    const part = (name, y, height) => ({spriteName:name, dy:y*scale, dH:height*scale, sy:32, sH:height, shadowBody:'player'});
    const body = part('armor',-12,32), sword = part('sword',-8,32), badge = {...part('badge',-21,9),renderAbove:true};
    const actor = {translateY:16*scale,waterY:31,drawData:[part('shadow16',0,16),sword,body,part('boots',9,7),badge]};
    Water.immerse(actor,1,scale,0);
    expect(actor.drawData).toEqual([sword,body,badge]);
    expect(body.dy + body.dH).toBe(15*scale);
    expect(sword.dy + sword.dH).toBe(15*scale);
    expect(body.shadowBody).toBeUndefined();
    expect(badge.dy).toBe(-21*scale);
    expect(body.sH).toBe(17);
});
test('a vertically flipped sprite clips from the opposite end of the source frame', () => {
    const part = {spriteName:'armor',dy:0,dH:32,sy:40,sH:32};
    const actor = {scaleY:-1,translateY:48,waterY:31,drawData:[part]};
    Water.immerse(actor,1,1,0);
    expect(part).toMatchObject({dy:17,sy:67,sH:5,dH:5});
});
test('movement emits distance-spaced wakes, one crossing splash, and clears on discontinuities', () => {
    const self = {WaterSurfaces:Water};
    vm.runInNewContext(fs.readFileSync(require.resolve('./water-renderer-worker'), 'utf8'), {self});
    const painter = new self.WaterPainter({wet:[],dry:[],sources:[]});
    const update = (x,t,wet=true,reduced=false) => painter.track([{waterPlayer:'peer',waterX:x,waterY:20,...(wet ? {immersion:1} : {})}],t,reduced);
    update(1,0,false); update(5,50); update(9,100); update(13,150);
    expect(painter.marks.map(m => m.type)).toEqual(['splash','wake']);
    for (let t=250;t<=1800;t+=100) update(13,t);
    expect(painter.marks.map(m => m.type)).toEqual(['idle']);
    update(16,1850,false);
    expect(painter.marks.at(-1)).toMatchObject({x:13,type:'splash'});
    update(300,1900); update(400,9000);
    expect(painter.marks).toHaveLength(0);
    update(406,9050,true,true);
    expect(painter.actors.size).toBe(0);
    update(410,9100); painter.track([],9120,false);
    expect(painter.actors.size).toBe(0);
});
test('the Main crossing has a walkable route through both exports and real tree artwork on its north bank', () => {
    const client = require('../maps/world_client_main.json'), server = require('../../server/maps/world_server_main.json');
    const areas = require('../../tools/worlds/main.json').waterSurfaces;
    Water.validate(areas,client);
    const water = new Water.Field(areas), y = 240;
    for (let x=19;x<=27;x++) for (const m of [client,server]) {
        const index=y*m.width+x;
        expect(m.collisions).not.toContain(index);
        expect(m.blocking || []).not.toContain(index);
    }
    expect(water.sample(19*16+8,y*16+15)).toBeNull();
    expect(water.sample(23*16+8,y*16+15).depth).toBe(1);
    expect(water.sample(27*16+8,y*16+15)).toBeNull();
    expect(water.reflectionSources(client)[0].cells.length).toBeGreaterThan(12);
});

test('a natural bank samples the same pixel contour as the painter', () => {
    const a = {...pond, shape:'natural'}, field = new Water.Field([a]);
    for (let y=.5;y<64;y+=5) {
        const {left,right} = Water.bankRow(a,y);
        expect(field.sample(left-.1,y)).toBeNull();
        expect(field.sample(right+.1,y)).toBeNull();
        expect(field.sample((left+right)/2,y).depth).toBeGreaterThan(0);
    }
});
test('swimming fits the visible standing body once per skin, independently of gear and attack frames', () => {
    const self={WaterSurfaces:Water}, rgba=new Uint8ClampedArray(32*32*4);
    for(let y=7;y<=26;y++) rgba[(y*32+10)*4+3]=255;
    const ctx={drawImage:jest.fn(),getImageData:()=>({data:rgba})};
    class Canvas {getContext(){return ctx;}}
    vm.runInNewContext(fs.readFileSync(require.resolve('./water-renderer-worker'),'utf8'),{self,OffscreenCanvas:Canvas});
    const painter=new self.WaterPainter({wet:[],dry:[],sources:[]});
    const body={image:{}, width:32,height:32,sourceScale:1,offsetY:-12,animationData:{idle_down:{row:3}}};
    const actor=()=>({waterBody:'armor',waterY:15,immersion:1,translateY:0,drawData:[{spriteName:'armor',dy:-12,dH:32,sy:0,sH:32}]});
    const a=actor(),b=actor();
    painter.prepare({healthTime:0,reducedMotion:true,scale:1,entityData:[a,b]},{armor:body});
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(a.drawData[0]).toMatchObject({dy:-2,dH:17});
    expect(b.drawData).toEqual(a.drawData);
});
