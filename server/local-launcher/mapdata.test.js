const fs = require('fs'), vm = require('vm'), path = require('path');
function events(id, revision = id, extra = []) {
    return [
        {type:'progress',mapId:id,label:'Tiled objects',completed:0,total:3},
        {type:'resource',key:'map-list',data:{maps:['one','two'],catalog:{items:[{id:'GOLD'}]}}},
        {type:'resource',key:'map-canvas',data:{mapId:id,width:4,height:4,tilesize:16,tiles:Array.from({length:16}, (_, i) => i + 1),collisions:[3],serverCollisions:[7],tileset:'/tiles.png',artworkRevision:'art'}},
        {type:'resource',key:'doors',data:{mapId:id,doors:[{id:revision}]}},
        {type:'resource',key:'analysis',data:{validation:{mapId:id,findings:[]},inspector:{mapId:id,objects:[]}}},
        {type:'resource',key:'entity-library',data:{revision:'assets',entries:[{id:'rat',preview:{width:16}}]}},
        ...extra, {type:'ready',mapId:id,revision}
    ];
}
function response(rows) {return new Response(rows.map(row => JSON.stringify(row)).join('\n') + '\n');}
function fixture(fetch) {
    class Node extends EventTarget {
        constructor() {super(); this.classList={toggle:jest.fn()};this.options=[];this.textContent='';}
        setAttribute() {}
    }
    const nodes = new Map();
    const document = Object.assign(new EventTarget(), {hidden:false,getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}});
    const window = Object.assign(new EventTarget(), {ToolboxNavigation:{screen:()=> 'doors'}});
    const imageSources = [];
    class Image {
        set src(value) {imageSources.push(value);queueMicrotask(()=>this.onload());}
    }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'mapdata.js'),'utf8'), {window,document,fetch,location:{href:'http://localhost:8010/local/'},
        Image,URL,URLSearchParams,AbortSignal,Event,CustomEvent,TextDecoder,structuredClone,queueMicrotask,setTimeout,clearTimeout,setInterval:()=>1});
    return {api:window.ToolboxMapData,nodes,imageSources,window,document};
}
test('tools, analysis and coordinate previews reuse one load and one artwork image', async () => {
    const fetch = jest.fn(async()=>response(events('one'))), {api,imageSources} = fixture(fetch);
    const [doors, canvas, inspector, preview] = await Promise.all([
        api.fetch('./api/doors?mapId=one'), api.fetch('./api/map-canvas?mapId=one'),
        api.fetch('./api/map-inspector?mapId=one'), api.fetch('./api/map-preview?mapId=one&x=1&y=1')
    ]);
    expect((await doors.json()).doors).toEqual([{id:'one'}]);
    const geometry = await canvas.json();geometry.tiles[0] = 999;
    const inspected = await inspector.json();
    expect(inspected.tiles[0]).toBe(1);expect(inspected.collisions).toEqual([7]);
    expect(geometry.collisions).toEqual([3]);
    expect((await preview.json()).tiles[6 * 13 + 6]).toBe(6);
    expect((await (await api.fetch('./api/entity-library')).json()).entries[0].id).toBe('rat');
    expect((await (await api.fetch('./api/doors')).json()).maps).toEqual(['one','two']);
    expect((await (await api.fetch('./api/encounters')).json()).catalog.items).toEqual([{id:'GOLD'}]);
    expect((await (await api.fetch('./api/assets')).json())).toEqual({revision:'assets',entries:[{id:'rat'}]});
    expect(fetch).toHaveBeenCalledTimes(1);expect(imageSources).toHaveLength(1);
});
test('a slower previous map cannot overwrite the loading state of the newly selected map', async () => {
    const streams = new Map();
    const fetch = jest.fn(async url => new Response(new ReadableStream({start(controller){streams.set(new URL(url,'http://localhost/local/').searchParams.get('mapId'), controller);}})));
    const {api,nodes} = fixture(fetch);
    const first=api.select('one'), second=api.select('two');
    function finish(id) {const controller=streams.get(id);controller.enqueue(new TextEncoder().encode(events(id).map(value=>JSON.stringify(value)).join('\n')+'\n'));controller.close();}
    finish('two'); await second;finish('one');await first;
    expect(nodes.get('map-data-title').textContent).toBe('two ready');
    expect(api.preferred('fallback')).toBe('two');
});
test('saves invalidate the shared snapshot and the next tool joins its refresh', async () => {
    let revision = 1;
    const fetch = jest.fn(async (url, options={}) => {
        if(options.method==='POST') {revision++;return new Response('{}');}
        return response(events('one',String(revision)));
    });
    const {api,imageSources} = fixture(fetch);
    await api.select('one');
    await api.fetch('./api/doors',{method:'POST',body:'{"mapId":"one"}'});
    expect((await (await api.fetch('./api/doors?mapId=one')).json()).doors).toEqual([{id:'2'}]);
    expect(fetch.mock.calls.filter(([url])=>url.includes('map-workspace'))).toHaveLength(2);
    expect(imageSources).toHaveLength(1);
});
test('an incomplete stream retries; an unavailable section does not hide usable map data', async () => {
    const fetch = jest.fn().mockResolvedValueOnce(response(events('one').slice(0,-1)))
        .mockImplementation(async()=>response(events('one','one',[{type:'resource',key:'lighting',error:'Invalid light',status:422}])));
    const {api,nodes} = fixture(fetch);
    await expect(api.select('one')).rejects.toThrow('before completion');
    expect(nodes.get('map-data-reload').disabled).toBe(false);
    await api.select('one');
    expect((await api.fetch('./api/lighting?mapId=one')).status).toBe(422);
    expect((await api.fetch('./api/doors?mapId=one')).ok).toBe(true);
    expect(nodes.get('map-data-reload').textContent).toBe('Retry loading');
    expect(fetch).toHaveBeenCalledTimes(2);
});
test('aborting one tool does not cancel another tool sharing its map load', async () => {
    const controller = new AbortController(), fetch = jest.fn(async()=>response(events('one')));
    const {api} = fixture(fetch);
    const abandoned = api.fetch('./api/doors?mapId=one',{signal:controller.signal});
    const active = api.fetch('./api/map-inspector?mapId=one');controller.abort();
    await expect(abandoned).rejects.toThrow();expect((await active).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await api.fetch('./api/map-preview?mapId=one&x=1.2&y=2')).status).toBe(400);
});
test('a running build blocks cached reads and completion refreshes the active map', async () => {
    let status = 'running';
    const fetch = jest.fn(async url => url === './api/build' ? new Response(JSON.stringify({job:{id:'build',status}}))
        : response(events('one',status)));
    const {api,nodes} = fixture(fetch);
    await api.select('one');await api.fetch('./api/build');
    expect(nodes.get('map-data-title').textContent).toBe('Map build in progress');
    expect((await api.fetch('./api/doors?mapId=one')).ok).toBe(false);
    status = 'succeeded';await api.fetch('./api/build');
    expect((await (await api.fetch('./api/doors?mapId=one')).json()).doors[0].id).toBe('succeeded');
});
test('an explicit editor deep link keeps its map selection through the editor route', async () => {
    const fetch = jest.fn(async url => response(events(new URL(url,'http://localhost/local/').searchParams.get('mapId'))));
    const {api,nodes,window,document} = fixture(fetch);
    await api.fetch('./api/doors?mapId=one');await api.select('two');
    const select = nodes.get('door-map');select.options = [{}];select.value = 'one';
    const change = jest.fn();select.addEventListener('change', change);
    window.ToolboxNavigation.params = () => new URLSearchParams({map:'one',object:'7'});
    document.dispatchEvent(new CustomEvent('toolbox:pane',{detail:'doors'}));await Promise.resolve();
    expect(select.value).toBe('one');expect(change).not.toHaveBeenCalled();
});
test('explicit reload refreshes the visible editor even when opened through a deep link', async () => {
    const {api,nodes,window,document}=fixture(jest.fn(async()=>response(events('one'))));
    await api.fetch('./api/doors?mapId=one');
    const select=nodes.get('door-map');select.options=[{}];select.value='one';
    window.ToolboxNavigation.params=()=>new URLSearchParams({map:'one'});
    const refresh=jest.fn();document.getElementById('doors-pane').querySelector=()=>({click:refresh});
    await nodes.get('map-data-reload').onclick();expect(refresh).toHaveBeenCalledTimes(1);
});
