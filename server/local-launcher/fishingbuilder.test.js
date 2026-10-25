const fs=require('fs'),vm=require('vm');
async function setup(failure) {
    let boot,mapOptions,failSave=false;const payloads=[],document={activeElement:null};
    function element(tag='div'){return {tag,children:[],value:'',classList:{toggle(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},focus(){document.activeElement=this;},reportValidity:()=>true,all(){return this.children.flatMap(n=>[n,...(n.all?.()||[])]);},querySelectorAll(selector){return this.all().filter(n=>n.className===selector.slice(1));},querySelector(selector){return this.all().find(n=>selector==='form'?n.tag==='form':n.className===selector.slice(1));}};}
    const selectors=['.fishing-save','.fishing-reload','#fishing-map','.fishing-workspace','.fishing-status','.fishing-discard','.fishing-discard-no','.fishing-discard-yes','.fishing-build','.fishing-validate','.fishing-add','.fishing-close','.fishing-map-label','.fishing-map-host','.fishing-editor','.fishing-list','.fishing-water-list','#fishing-search'];
    const nodes=Object.fromEntries(selectors.map(s=>[s,element()])),pane=element();pane.querySelector=s=>nodes[s];document.getElementById=()=>pane;document.createElement=element;
    const window={FishingAuthoring:require('../../shared/js/fishingauthoring'),MapmakerObjectDrafts:require('./objectdrafts'),ToolboxEntityPicker:{attach:jest.fn()},MapmakerRegionEditor:{attach(parent,id,options){mapOptions=options;return {refresh(){},fit(){},destroy(){},setMode(){}};}},MapmakerCanvas:{invalidate(){}},ToolboxNavigation:{route(name,handler){boot=handler;},params:()=>new URLSearchParams('map=one')},addEventListener(){}};
    let data={mapId:'one',source:'one.tmx',revision:'first',dimensions:{width:20,height:20},objects:[],waters:[{id:'cobFarmLake',count:6,x:4,y:4,width:3,height:2}]},nextId=1;
    const fetch=async(url,options={})=>{if(failure){failure=false;return {ok:false,json:async()=>({error:'Temporary failure'})};}if(options.method==='POST'){const body=JSON.parse(options.body);payloads.push(body);if(failSave)return {ok:false,json:async()=>({error:'Changed in Tiled'})};for(const change of body.operations){data.objects=data.objects.filter(r=>r.id!==change.objectId);if(change.operation!=='remove')data.objects.push({...change.object,id:change.objectId||String(nextId++)});}data={...data,revision:'saved'};return {ok:true,json:async()=>JSON.parse(JSON.stringify(data))};}return {ok:true,json:async()=>JSON.parse(JSON.stringify(url.includes('?mapId=')?data:{maps:['one'],catalog:{lakes:[{id:'cobFarmLake',level:1,fish:[{item:'cobguppy',rarity:'common'}]}],items:[{id:'cobguppy',name:'Guppy'},{id:'cobneon',name:'Neon'}]}}))};};
    vm.runInNewContext(fs.readFileSync(require.resolve('./fishingbuilder'),'utf8'),{window,document,fetch,AbortSignal,URLSearchParams});await boot(new URLSearchParams('map=one'));
    const all=()=>Object.values(nodes).flatMap(n=>[n,...n.all()]);
    return {nodes,payloads,get map(){return mapOptions;},button:label=>all().find(n=>n.tag==='button'&&n.textContent===label),field:label=>{const l=all().find(n=>n.tag==='label'&&n.textContent===label);return all().find(n=>n.id===l?.htmlFor);},stale(){failSave=true;}};
}
test('draw/save/readback keeps the saved selection editable and sends further edits as updates',async()=>{
    const h=await setup();expect(h.map.editable()).toBe(false);h.nodes['.fishing-add'].onclick();h.map.onChange({x:7,y:8,width:3,height:4});await h.nodes['.fishing-save'].onclick();
    expect(h.payloads[0].operations[0]).toMatchObject({operation:'add',object:{x:7,y:8,width:3,height:4,level:1,fish:[{item:'cobguppy',rarity:'common'}]}});
    expect(h.field('Tile X').value).toBe(7);h.map.onChange({x:8,y:8,width:3,height:4});await h.nodes['.fishing-save'].onclick();expect(h.payloads[1].operations[0]).toMatchObject({operation:'update',objectId:'1',object:{x:8}});
});
test('existing water inspection is read only and creates a map-specific override',async()=>{
    const h=await setup();h.button('cobFarmLake · 6 tiles').onclick();expect(h.map.editable()).toBe(false);h.button('Override on this map').onclick();expect(h.map.editable()).toBe(true);await h.nodes['.fishing-save'].onclick();expect(h.payloads[0].operations[0].object).toMatchObject({scope:'existing',sourceLake:'cobFarmLake',x:4,y:4,width:3,height:2});
});
test('stale saves preserve the whole draft and require confirmation before reload',async()=>{
    const h=await setup();h.nodes['.fishing-add'].onclick();h.stale();await h.nodes['.fishing-save'].onclick();expect(h.nodes['.fishing-status'].textContent).toContain('draft is still here');expect(h.nodes['.fishing-save'].disabled).toBe(false);h.nodes['.fishing-reload'].onclick();expect(h.nodes['.fishing-discard'].hidden).toBe(false);h.nodes['.fishing-discard-no'].onclick();expect(h.map.editable()).toBe(true);
});
test('Reload recovers a failed initial catalog load',async()=>{const h=await setup(true);expect(h.nodes['.fishing-status'].textContent).toBe('Temporary failure');await h.nodes['.fishing-reload'].onclick();expect(h.map).toBeDefined();});

test('removing a catch refreshes the table without losing the draft',async()=>{
    const h=await setup();h.nodes['.fishing-add'].onclick();h.button('Add catch').onclick();expect(()=>h.button('Remove catch').onclick()).not.toThrow();await h.nodes['.fishing-save'].onclick();expect(h.payloads[0].operations[0].object.fish).toEqual([{item:'cobneon',rarity:'common'}]);
});
