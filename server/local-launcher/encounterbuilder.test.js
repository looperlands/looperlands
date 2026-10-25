const fs = require('fs'), vm = require('vm'), G = require('./regiongeometry');
async function setup(failure) {
    let interaction, mounted, boot, failSave = false;
    const payloads=[], document={activeElement:null};
    function element(tag='div') {
        return {tag,children:[],value:'',attributes:{},classList:{toggle(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(k,v){this.attributes[k]=v;},setCustomValidity(){},reportValidity:()=>true,focus(){document.activeElement=this;},all(){return this.children.flatMap(n=>[n,...(n.all?.()||[])]);},querySelectorAll(selector){return this.all().filter(n=>n.className===selector.slice(1));},querySelector(selector){return this.all().find(n=>selector.startsWith('#')?n.id===selector.slice(1):n.className===selector.slice(1));}};
    }
    const selectors=['.encounter-save','.encounter-reload','#encounter-map','.encounter-workspace','.encounter-status','.encounter-discard','.encounter-discard-no','.encounter-discard-yes','.encounter-mode','.encounter-build','.encounter-validate','.encounter-tools','.encounter-map-host','.encounter-editor','.encounter-list','.encounter-count','.encounter-pages','#encounter-search','#encounter-filter'];
    const nodes=Object.fromEntries(selectors.map(s=>[s,element()])), pane=element();pane.querySelector=s=>nodes[s]||nodes['.encounter-editor'].querySelector(s);
    document.getElementById=()=>pane;document.createElement=element;
    const window={ToolboxEntityPicker:{attach:jest.fn()},addEventListener(){},MapmakerRegionGeometry:G,MapmakerObjectDrafts:require('./objectdrafts'),ToolboxNavigation:{route(tool,handler){boot=handler;},params:()=>new URLSearchParams('map=one')},MapmakerCanvas:{invalidate(){},attach(parent,id,options){interaction=options.interaction;mounted=options;return {draw(){},set(){},fit(){},destroy(){}};}}};
    let nextId=1;
    let data={mapId:'one',source:'one.tmx',revision:'initial',dimensions:{width:40,height:30},objects:[]};
    const fetch=async(url,options={})=>{
        if ((failure === 'catalog' && url === './api/encounters') || (failure === 'map' && url.includes('?mapId='))) {failure = null;return {ok:false,json:async()=>({error:'Temporary loading failure'})};}
        if(options.method==='POST') {
            const body=JSON.parse(options.body);payloads.push(body);
            if(failSave)return {ok:false,json:async()=>({error:'This map changed in Tiled. Reload before saving.'})};
            for(const change of body.operations){data.objects=data.objects.filter(row=>row.id!==change.objectId);if(change.operation!=='remove')data.objects.push({...change.object,id:change.objectId||String(nextId++)});}data={...data,revision:'saved'};return {ok:true,json:async()=>JSON.parse(JSON.stringify(data))};
        }
        const value=url==='./api/encounters'?{maps:['one'],catalog:{items:[{id:'GOLD',name:'Gold'},{id:'flask',name:'Flask'}],mobs:[{id:'rat',name:'Rat'}]}}:data;
        return {ok:true,json:async()=>JSON.parse(JSON.stringify(value))};
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./encounterbuilder'),'utf8'),{window,document,fetch,AbortSignal,Image:class{},URLSearchParams});
    await boot(new URLSearchParams('map=one'));mounted?.onLoad({width:40,height:30});
    const all=()=>Object.values(nodes).flatMap(n=>[n,...n.all()]);
    return {nodes,payloads,get interaction(){return interaction;},button:label=>all().find(n=>n.tag==='button'&&n.textContent===label),field:label=>{const l=all().find(n=>n.tag==='label'&&n.textContent===label);return all().find(n=>n.id===l?.htmlFor);},stale(){failSave=true;},context:(x,y)=>({tile:{x,y},screen:{x:x*20,y:y*20},project:p=>({x:p.x*20,y:p.y*20})})};
}
test('visual chest placement saves exact tile and loot, stale save preserves the draft',async()=>{
    const h=await setup();h.button('Place chest').onclick();h.interaction.start(h.context(8.1,9.2));h.interaction.end(h.context(8.1,9.2),false);
    expect(h.field('Tile X').value).toBe('8');expect(h.field('Tile Y').value).toBe('9');await h.nodes['.encounter-save'].onclick();
    expect(h.payloads[0].operations[0]).toMatchObject({operation:'add',object:{kind:'chest',x:8,y:9,loot:[{item:'GOLD',weight:1}]}});
    h.stale();h.interaction.keydown({key:'ArrowRight'});await h.nodes['.encounter-save'].onclick();
    expect(h.nodes['.encounter-status'].textContent).toContain('changed in Tiled');expect(h.field('Tile X').value).toBe('9');expect(h.nodes['.encounter-save'].disabled).toBe(false);
});
test('draws an encounter, resizes from an outer corner and saves population',async()=>{
    const h=await setup();h.button('Draw encounter').onclick();h.interaction.start(h.context(6,7));h.interaction.move(h.context(9,10));h.interaction.end(h.context(9,10),false);
    expect(h.field('Width in tiles').value).toBe('4');
    h.button('Select / move').onclick();h.interaction.start(h.context(10,11));h.interaction.move(h.context(12,13));h.interaction.end(h.context(12,13),false);
    expect(h.field('Width in tiles').value).toBe('6');await h.nodes['.encounter-save'].onclick();
    expect(h.payloads[0].operations[0].object).toMatchObject({kind:'encounter',x:6,y:7,width:6,height:6,mob:'rat',count:3});
});
test('reward chest can be positioned independently and cancelled drag restores its region',async()=>{
    const h=await setup();h.button('Draw reward area').onclick();h.interaction.start(h.context(6,7));h.interaction.end(h.context(9,10),false);
    h.button('Place reward chest').onclick();h.interaction.start(h.context(18,19));
    expect(h.field('Reward tile X').value).toBe('18');expect(h.field('Reward tile Y').value).toBe('19');
    h.interaction.start(h.context(8,9));h.interaction.move(h.context(14,15));h.interaction.end(h.context(14,15),true);
    expect(h.field('Tile X').value).toBe('6');await h.nodes['.encounter-save'].onclick();expect(h.payloads[0].operations[0].object).toMatchObject({rewardX:18,rewardY:19,x:6,y:7});
});

test.each(['catalog','map'])('Reload recovers a failed first %s request before any data exists',async failure=>{
    const h=await setup(failure);expect(h.nodes['.encounter-status'].textContent).toBe('Temporary loading failure');
    expect(h.nodes['.encounter-reload'].disabled).toBe(false);await h.nodes['.encounter-reload'].onclick();
    expect(h.nodes['.encounter-status'].textContent).toContain('Loaded 0 objects');expect(h.interaction).toBeTruthy();
});
test('repeated placement and reward creation keep every pending object without intermediate requests', async () => {
    const h=await setup();h.button('Place chest').onclick();
    for(const [x,y] of [[6,6],[8,6],[10,6]]){h.interaction.start(h.context(x,y));h.interaction.end(h.context(x,y),false);}
    expect(h.payloads).toHaveLength(0);expect(h.nodes['.encounter-save'].textContent).toContain('(3)');
    h.button('Draw encounter').onclick();h.interaction.start(h.context(12,12));h.interaction.end(h.context(15,15),false);
    expect(h.button('Add clear-area reward').disabled).toBe(false);h.button('Add clear-area reward').onclick();
    expect(h.payloads).toHaveLength(0);await h.nodes['.encounter-save'].onclick();
    expect(h.payloads).toHaveLength(1);expect(h.payloads[0].operations).toHaveLength(5);
    expect(h.payloads[0].operations.map(row=>row.object.kind)).toEqual(['chest','chest','chest','encounter','reward']);
});
test('failed batch saves retain all additions for correction and retry', async () => {
    const h=await setup();h.button('Place chest').onclick();
    for(const [x,y]of [[6,6],[8,6]]){h.interaction.start(h.context(x,y));h.interaction.end(h.context(x,y),false);}
    h.stale();await h.nodes['.encounter-save'].onclick();
    expect(h.nodes['.encounter-save'].disabled).toBe(false);expect(h.nodes['.encounter-save'].textContent).toContain('(2)');
    expect(h.nodes['.encounter-status'].textContent).toContain('changed in Tiled');
});
