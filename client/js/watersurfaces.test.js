const fs = require('fs'), vm = require('vm');
const Water = require('./watersurfaces');
const WaterReflections = require('./waterreflections');
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
const ocean = {id:'sea', name:'Sea', kind:'ocean', x:0, y:0, width:7, height:7, tiles:[4,5]};
test('ocean immersion follows the visible tile around a deck, including its corners', () => {
    const tiles = Array(49).fill(4);
    tiles[2 * 7 + 2] = [4, 9]; // A dry deck laid over the ocean.
    tiles[4 * 7 + 3] = [9, 5]; // Surf laid over the sand.
    const field = new Water.Field([ocean], {width:7, data:tiles});
    expect(field.wet[0].rows[2]).toEqual([0,2,3,7]);
    expect(field.sample(40,40)).toBeNull();
    expect(field.sample(49,40).depth).toBeCloseTo(1/18);
    expect(field.sample(50,52).depth).toBeCloseTo(Math.hypot(2,4)/18);
    expect(field.sample(56,80).depth).toBe(1);
    expect(field.sample(64,80).depth).toBe(1);
    expect(field.sample(7*16,80)).toBeNull();
    const bounded = {...ocean, x:1,y:1,width:3,height:3};
    expect(new Water.Field([bounded],{width:7,data:tiles}).wet[0].rows).toEqual([[0,3],[0,1,2,3],[0,3]]);
});
test('ocean authoring accepts a tile selection and rejects ambiguous or missing IDs', () => {
    expect(() => Water.validate([ocean],map)).not.toThrow();
    for (const tiles of [undefined,[],[4,4],[0],[2.5],['4']]) expect(() => Water.validate([{...ocean,tiles}],map)).toThrow();
});

function authoredCoast(id) {
    const client = require('../maps/world_client_' + id + '.json');
    const server = require('../../server/maps/world_server_' + id + '.json');
    const areas = require('../../tools/worlds/' + id + '.json').waterSurfaces;
    Water.validate(areas,client);
    const field = new Water.Field(areas,client);
    const clientBlocked = new Set([...client.collisions,...client.blocking]), serverBlocked = new Set(server.collisions);
    const blocked = (x,y) => [clientBlocked.has(y*client.width+x),serverBlocked.has(y*client.width+x)];
    const depth = (x,y) => field.sample(x*16+8,y*16+15)?.depth || 0;
    return {client,field,blocked,depth};
}

test('both Main beaches lead into open sea, with the void sealed and Town dry', () => {
    const {client,field,blocked,depth} = authoredCoast('main');
    for (const y of [299,467]) {
        expect(depth(46,y-1)).toBe(0);
        expect(depth(46,y)).toBeGreaterThan(0);
        expect(depth(46,y)).toBeLessThan(1);
        expect(depth(46,y+4)).toBe(1);
        for (let step=-1;step<12;step++) expect(blocked(46,y+step)).toEqual([false,false]);
        expect(blocked(46,y+12)).toEqual([true,true]);
    }
    expect(blocked(92,305)).toEqual([true,true]);
    expect(blocked(117,476)).toEqual([true,true]);
    expect(blocked(44,297)).toEqual([true,true]); // Palm trunk on the sand.
    expect(depth(23,240)).toBe(0);
    const reflections = new WaterReflections(client,field);
    expect(field.scenery).toHaveLength(0);
    expect(reflections.sources).toEqual(expect.arrayContaining([
        expect.objectContaining({area:{x:19,y:293,width:5,height:5}}),
        expect.objectContaining({area:{x:43,y:293,width:5,height:5}})
    ]));
});
test.each(['m88n','m88n2'])('%s keeps ocean swimming on the existing water artwork', id => {
    const {client,field,depth,blocked} = authoredCoast(id);
    for (let y=268;y<=272;y++) expect(blocked(166,y)).toEqual([false,false]);
    expect(depth(166,268)).toBe(0);
    expect(depth(166,272)).toBe(1);
    expect(depth(100,302)).toBe(1);
    expect(depth(155,415)).toBe(0); // Planks layered over the sea.
    expect(depth(157,418)).toBe(1);
    expect(blocked(157,417)).toEqual([true,true]);
    const reflections = new WaterReflections(client,field);
    expect(reflections.sources).toEqual(expect.arrayContaining([
        expect.objectContaining({area:{x:91,y:264,width:5,height:4}}),
        expect.objectContaining({area:{x:156,y:414,width:3,height:3}})
    ]));
});

test('the Paradise Point East tentacle entrance and return tile connect the sand to the m88n ocean', () => {
    const {client,blocked,depth} = authoredCoast('m88n'), server = require('../../server/maps/world_server_m88n.json');
    for (const map of [client,server]) {
        const entrance = map.doors.filter(d=>d.x===157 && d.y===266);
        const exit = map.doors.filter(d=>d.x===157 && d.y===268);
        expect(entrance).toHaveLength(1);
        expect(entrance[0]).toMatchObject({tx:156,ty:268,titem:'m88ntentacle'});
        expect(exit).toHaveLength(1);
        expect(exit[0]).toMatchObject({tx:156,ty:266});
    }
    for (const [x,y] of [[157,265],[157,266],[156,268],[156,269],[156,270],[156,271],[157,268],[156,266]]) {
        expect(blocked(x,y)).toEqual([false,false]);
    }
    expect(depth(157,266)).toBe(0);
    expect(depth(156,271)).toBe(1);
    expect(depth(156,266)).toBe(0);
});

test('automatic reflections join only placed pieces of the same artwork and respect a manual waterline', () => {
    const map = {width:8,height:10,tilesetColumns:8,high:[10,11,56],data:Array(80).fill(1)};
    const area = {id:'ocean',name:'Ocean',kind:'ocean',x:0,y:0,width:8,height:10,tiles:[4]};
    for (let i=32;i<64;i++) map.data[i]=4;
    map.data[10]=[1,10]; map.data[11]=[1,11]; map.data[18]=[1,18,72]; map.data[19]=[1,19];
    map.data[26]=[1,26]; map.data[27]=[1,27];
    map.data[5]=56; // Elevated artwork too far from the shore.
    const natural = new WaterReflections(map,new Water.Field([area],map));
    expect(natural.sources).toHaveLength(1);
    expect(natural.sources[0].area).toEqual({x:2,y:1,width:2,height:3});
    expect(natural.sources[0].cells.flatMap(c=>c.layers).sort((a,b)=>a-b)).toEqual([10,11,18,19,26,27]);
    expect(natural.reflectsActor(40,16)).toBe(false);
    expect(natural.reflectsActor(40,62)).toBe(true);
    const box = {id:'custom',name:'Custom tree',kind:'reflection',x:2,y:1,width:2,height:3};
    const manual = new WaterReflections(map,new Water.Field([area,box],map));
    expect(manual.sources.map(s=>s.area)).toEqual([box]);
    expect(manual.sources[0].cells.flatMap(c=>c.layers)).toContain(72);
});

test('an untagged dock over ocean reflects while surf, level ground and isolated sand tiles stay out', () => {
    const map = {width:10,height:10,tilesetColumns:10,high:[],data:Array(100).fill(400)};
    const area = {id:'ocean',name:'Ocean',kind:'ocean',x:0,y:0,width:10,height:10,tiles:[400,20]};
    map.data[34]=[400,41]; map.data[35]=[400,42]; map.data[44]=[400,51]; map.data[45]=[400,52];
    map.data[11]=[400,10]; map.data[21]=[400,20]; // Sand above an animated surf tile.
    map.data[67]=[1,71]; map.data[68]=[1,72]; map.data[77]=[1,81]; map.data[78]=[1,82];
    const field = new Water.Field([area],map);
    const reflection = new WaterReflections(map,field);
    expect(reflection.sources.map(s=>s.area)).toEqual([{x:4,y:3,width:2,height:2}]);
});

test('offscreen scenery is not rasterized when an ocean spans the entire map', () => {
    const self = {WaterSurfaces:Water};
    vm.runInNewContext(fs.readFileSync(require.resolve('./water-renderer-worker'),'utf8'),{self});
    const painter = new self.WaterPainter({wet:[],dry:[],sources:[{area:{x:40,y:30,width:3,height:4},cells:[]}]});
    painter.drawScenery({}, {x:0,y:0,w:2000,h:2000}, {x:16,y:80,w:200,h:180}, {}, 0, false);
    expect(painter.sources[0].image).toBeNull();
});

test('a swimmer reflects in a short translucent band at the waterline, including during a spawn fade', () => {
    const self = {WaterSurfaces:Water};
    const ink = {clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}};
    class Canvas { getContext() { return ink; } }
    vm.runInNewContext(fs.readFileSync(require.resolve('./water-renderer-worker'), 'utf8'), {self, OffscreenCanvas:Canvas});
    const painter = new self.WaterPainter({wet:[], dry:[], sources:[]});
    function bands(immersion, globalAlpha) {
        const actor = {waterX:24, waterY:32, translateX:16, translateY:17, drawData:[], immersion, globalAlpha};
        const rows = [];
        let alpha = 1;
        const ctx = {
            // Canvas ignores invalid assignments, leaving the previous opacity in effect.
            set globalAlpha(value) { if (value >= 0 && value <= 1) alpha = value; },
            drawImage(image, sx, sy, sw, sh, x, y) { rows.push({y, alpha}); }
        };
        painter.drawMirror(ctx, actor, 1, 0, () => {});
        return rows;
    }
    const shore = bands(undefined), wading = bands(.4), swim = bands(1);
    expect(swim[0].y).toBe(32);
    expect(swim[0].alpha).toBeGreaterThan(0);
    expect(swim[0].alpha).toBeLessThan(.2);
    expect(swim.at(-1).alpha).toBeLessThan(swim[0].alpha);
    expect(swim.at(-1).y).toBeLessThan(wading.at(-1).y);
    expect(wading.at(-1).y).toBeLessThan(shore.at(-1).y);
    expect(wading[0].alpha).toBeLessThan(shore[0].alpha);
    expect(bands(1, NaN)).toEqual(swim);
    expect(bands(1, .5)[0].alpha).toBeCloseTo(swim[0].alpha / 2);
    expect(bands(1, 0)).toEqual([]);
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
