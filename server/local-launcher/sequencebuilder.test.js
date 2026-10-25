const fs=require('fs'),vm=require('vm'),S=require('../../shared/js/scriptedsequences'),C=require('../../shared/js/mapmakerauthoring');
async function setup(failure){
    const document={activeElement:null};let boot,mapOptions,failSave=false;const payloads=[];
    function element(tag='div'){return {tag,children:[],value:'',style:{},classList:{toggle(){}},get childElementCount(){return this.children.length;},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},focus(){document.activeElement=this;},reportValidity:()=>true,scrollIntoView(){},all(){return this.children.flatMap(n=>[n,...(n.all?.()||[])]);}};}
    const selectors=['.sequence-save','.sequence-reload','#sequence-map','.sequence-workspace','.sequence-status','.sequence-discard','.sequence-discard-no','.sequence-discard-yes','.sequence-build','.sequence-list','.sequence-editor','.sequence-map-tools','.sequence-map-host','.sequence-map-section','.sequence-preview-text','.sequence-preview-status','.sequence-preview-actions','.sequence-add','.sequence-preset','#sequence-search'];
    const nodes=Object.fromEntries(selectors.map(s=>[s,element()])),pane=element();pane.querySelector=s=>nodes[s]||nodes['.sequence-editor'].all().find(n=>n.className===s.slice(1));nodes['.sequence-preset'].tag='button';nodes['.sequence-save'].tag='button';nodes['.sequence-preset'].textContent='Camera & dialogue preset';nodes['.sequence-save'].textContent='Save sequences';document.getElementById=()=>pane;document.createElement=element;
    let data={mapId:'one',source:'tools/worlds/one.json',revision:'initial',entries:[],catalog:{width:40,height:30,routines:[{id:'host',name:'Host',x:5,y:6}],quests:[],npcs:[],mobs:[],sounds:[],music:[]}};
    const window={ScriptedSequences:S,MapmakerAuthoring:C,addEventListener(){},ToolboxDialogueEditor:{attach(){},appendPreview(parent,text){parent.append(element('p'));parent.children.at(-1).textContent=text;}},ToolboxNavigation:{route(name,handler){boot=handler;},params:()=>new URLSearchParams('map=one')},MapmakerCanvas:{attach(parent,id,options){mapOptions=options;options.onLoad?.({width:40,height:30});return {draw(){},fit(){},destroy(){}};}}};
    const fetch=async(url,options={})=>{if(failure){failure=false;return {ok:false,json:async()=>({error:'Temporary failure'})};}if(options.method==='POST'){const body=JSON.parse(options.body);payloads.push(body);if(failSave)return {ok:false,json:async()=>({error:'Section changed on disk'})};data={...data,revision:'saved',entries:body.entries};}return {ok:true,json:async()=>JSON.parse(JSON.stringify(url==='./api/world-authoring'&&!options.method?{maps:['one']}:data))};};
    vm.runInNewContext(fs.readFileSync(require.resolve('./sequencebuilder'),'utf8'),{document,window,fetch,AbortSignal,URLSearchParams});await boot(new URLSearchParams('map=one'));
    const all=()=>Object.values(nodes).flatMap(n=>[n,...n.all()]);return {nodes,payloads,button:text=>all().find(n=>n.tag==='button'&&n.textContent===text),field:label=>{const l=all().find(n=>n.tag==='label'&&n.textContent===label);return all().find(n=>n.id===l?.htmlFor);},get mapOptions(){return mapOptions;},stale(){failSave=true;}};
}
test('preset targets can be placed visually, saved and previewed without changing the saved draft',async()=>{
    const h=await setup();h.button('Camera & dialogue preset').onclick();h.mapOptions.onPick({x:12,y:13});
    expect(h.field('Target tile X').value).toBe('12');await h.button('Save sequences').onclick();expect(h.payloads[0].entries[0].steps[0]).toMatchObject({type:'camera',x:12,y:13});
    expect(h.nodes['.sequence-save'].disabled).toBe(true);h.button('Next preview step').onclick();expect(h.nodes['.sequence-preview-status'].textContent).toContain('Pan camera');expect(h.nodes['.sequence-save'].disabled).toBe(true);
});
test('reordering steps affects the saved execution order and stale saves keep the draft',async()=>{
    const h=await setup();h.button('Camera & dialogue preset').onclick();h.button('Move step down').onclick();h.stale();await h.button('Save sequences').onclick();
    expect(h.payloads[0].entries[0].steps.map(s=>s.type)).toEqual(['speech','camera','camera_reset']);expect(h.nodes['.sequence-status'].textContent).toBe('Section changed on disk');expect(h.nodes['.sequence-save'].disabled).toBe(false);
});
test('Reload recovers an initial catalogue failure',async()=>{
    const h=await setup(true);expect(h.nodes['.sequence-status'].textContent).toBe('Temporary failure');await h.nodes['.sequence-reload'].onclick();expect(h.nodes['.sequence-status'].textContent).toContain('Loaded 0 sequences');
});

test('editing after save updates the newly reloaded draft rather than stale field bindings',async()=>{
    const h=await setup();h.button('Camera & dialogue preset').onclick();await h.button('Save sequences').onclick();
    const name=h.field('Sequence name');name.value='A changed arrival';name.oninput();expect(h.nodes['.sequence-save'].disabled).toBe(false);
    await h.button('Save sequences').onclick();expect(h.payloads[1].entries[0].name).toBe('A changed arrival');
});
