const G=require('./regiongeometry');
const map={width:30,height:20},region={x:5,y:6,width:10,height:8};

test('drawing snaps either drag direction to tiles and clamps both corners to the map',()=>{
    expect(G.draw({x:15.8,y:12.7},{x:3.1,y:4.2},map)).toEqual({x:3,y:4,width:13,height:9});
    expect(G.draw({x:-4,y:-8},{x:40,y:50},map)).toEqual({x:0,y:0,width:30,height:20});
    expect(G.draw({x:4,y:8},{x:4.9,y:8.9},map)).toEqual({x:4,y:8,width:1,height:1});
});
test('moving keeps the original size and cannot escape any edge',()=>{
    expect(G.move(region,{x:100,y:100},map)).toEqual({x:20,y:12,width:10,height:8});
    expect(G.move(region,{x:-100,y:-100},map)).toEqual({x:0,y:0,width:10,height:8});
    expect(G.move(region,{x:1.4,y:-1.7},map)).toEqual({x:6,y:4,width:10,height:8});
    expect(region).toEqual({x:5,y:6,width:10,height:8});
});
test.each([
    ['nw',{x:2,y:3},{x:2,y:3,width:13,height:11}],
    ['n',{x:10,y:3},{x:5,y:3,width:10,height:11}],
    ['ne',{x:18,y:3},{x:5,y:3,width:13,height:11}],
    ['e',{x:18,y:10},{x:5,y:6,width:13,height:8}],
    ['se',{x:18,y:17},{x:5,y:6,width:13,height:11}],
    ['s',{x:10,y:17},{x:5,y:6,width:10,height:11}],
    ['sw',{x:2,y:17},{x:2,y:6,width:13,height:11}],
    ['w',{x:2,y:10},{x:2,y:6,width:13,height:8}]
])('resizing %s anchors the opposite edges', (handle,point,expected)=>expect(G.resize(region,handle,point,map)).toEqual(expected));
test('resizing clamps to the map and keeps at least one tile when crossing opposite edges',()=>{
    expect(G.resize(region,'nw',{x:100,y:100},map)).toEqual({x:14,y:13,width:1,height:1});
    expect(G.resize(region,'se',{x:-100,y:-100},map)).toEqual({x:5,y:6,width:1,height:1});
    expect(G.resize(region,'se',{x:100,y:100},map)).toEqual({x:5,y:6,width:25,height:14});
    expect(G.resize(region,'nw',{x:-100,y:-100},map)).toEqual({x:0,y:0,width:15,height:14});
});
test('handles cover every corner and edge midpoint',()=>{
    expect(G.handles(region)).toEqual([{id:'nw',x:5,y:6},{id:'n',x:10,y:6},{id:'ne',x:15,y:6},{id:'e',x:15,y:10},{id:'se',x:15,y:14},{id:'s',x:10,y:14},{id:'sw',x:5,y:14},{id:'w',x:5,y:10}]);
});
