global.Types = {};
const processMap=require('./processmap');
function input(objects){return {map:{width:8,height:8,tilewidth:16,tileset:[],layer:[],objectgroup:[{name:'mapmaker-entities',object:objects}]}};}
beforeEach(()=>jest.spyOn(console,'log').mockImplementation(()=>{}));afterEach(()=>jest.restoreAllMocks());
test('point placement exports the exact kind and legacy static entity tile position',()=>{expect(processMap(input([{name:'rat',x:32,y:48}]),{mode:'server'}).staticEntities).toEqual({26:'rat'});});
test.each([[{name:'unknown',x:32,y:48}],[{name:'rat',x:0,y:0}],[{name:'rat',x:1000,y:0}],[{name:'rat',x:32,y:48,gid:2}],[{name:'rat',x:32,y:48},{name:'guard',x:32,y:48}]].map(objects=>[objects]))('rejects invalid placement without silently dropping it',objects=>{expect(()=>processMap(input(objects),{mode:'server'})).toThrow();});
