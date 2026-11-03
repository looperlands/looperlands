(() => {
    'use strict';
    const pane=document.getElementById('fx-pane'), Config=window.PlacedFxConfig;
    if(!pane || !Config)return;
    const el=(tag,text='',attrs={})=>Object.assign(document.createElement(tag),{textContent:text,...attrs});
    pane.innerHTML=`<header class="pane-heading"><h2>Map effects & hazards</h2><p>Place a campfire, candle or any PixelFX effect. Enable Hazard to damage players in the highlighted tiles. <a href="#documentation/mapmaker-fx">Read the guide</a></p></header>
        <div class="world-toolbar"><div class="field"><label for="fx-map">Map</label><select id="fx-map"></select></div><button class="fx-save primary" disabled>Save effects</button><button class="fx-reload">Reload</button><a class="fx-build" href="#build">Build this map</a></div>
        <p class="fx-status" role="status" aria-live="polite">Choose a map.</p><div class="asset-discard fx-discard" hidden><p>Discard unsaved FX changes?</p><button class="fx-discard-yes">Discard changes</button><button class="fx-discard-no">Keep editing</button></div>
        <div class="zones-workspace fx-workspace" hidden><div class="zones-map-column"><div class="world-toolbar"><div class="field"><label for="fx-search">Find an effect</label><input id="fx-search" type="search" placeholder="Campfire, candle, meteor…"></div><div class="field"><label for="fx-effect">PixelFX library</label><select id="fx-effect"></select></div><button class="fx-add">Place effect</button></div>
        <canvas class="fx-sample" width="320" height="180" aria-label="Selected library effect preview" style="background:#181b24;image-rendering:pixelated;max-width:100%"></canvas><p class="fx-description field-hint"></p><div class="world-toolbar"><button class="fx-preview">Restart placement preview</button><button class="fx-pause">Pause preview</button></div><p class="fx-phase field-hint" role="status"></p><div class="fx-map-host"></div></div>
        <aside class="zones-inspector"><div class="fx-editor"></div><h3>Placed effects</h3><div class="world-list fx-list"></div></aside></div>`;
    const $=s=>pane.querySelector(s);
    let data,original,selected,editor,painter,pending,busy=false,loaded=false,start=performance.now(),paused=false,fieldId=0;
    import('./vendor/pixelfxpainter.mjs').then(({PixelFxPainter})=>{painter=new PixelFxPainter((w,h)=>el('canvas','',{width:w,height:h}));}).catch(error=>status('FX preview unavailable: '+error.message,true));
    const current=()=>data?.entries.find(r=>r.id===selected), dirty=()=>data && original!==JSON.stringify(data.entries);
    function status(text,error=false){$('.fx-status').textContent=text;$('.fx-status').classList.toggle('error',error);}
    function controls(){$('.fx-save').disabled=busy || !dirty();$('.fx-reload').disabled=busy;$('#fx-map').disabled=busy;$('.fx-workspace').inert=busy;}
    function guard(action){if(busy)return;if(!dirty())return action();pending=action;$('.fx-discard').hidden=false;}
    $('.fx-discard-yes').onclick=()=>{const action=pending;pending=null;$('.fx-discard').hidden=true;action?.();};
    $('.fx-discard-no').onclick=()=>{$('.fx-discard').hidden=true;pending=null;};
    function button(parent,label,action,attrs={}){const b=el('button',label,{type:'button',...attrs});b.onclick=action;parent.append(b);return b;}
    function field(parent,label,row,key,min,max,step=1){
        const id='fx-field-'+(++fieldId),wrap=el('div','',{className:'field'}),input=el('input','',{id,type:min===undefined?'text':'number'});
        if(min!==undefined)Object.assign(input,{min,max,step});else input.maxLength=120;
        input.value=row[key] ?? (key==='hue'?0:'');input.required=true;input.oninput=()=>{row[key]=min===undefined?input.value:input.value===''?null:Number(input.value);touch();};
        wrap.append(el('label',label,{htmlFor:id}),input);parent.append(wrap);
    }
    function list(){const host=$('.fx-list');host.replaceChildren();for(const row of data?.entries || [])button(host,(row.hazard?'⚠ ':'')+row.name,()=>select(row.id,true),{ariaPressed:String(row.id===selected)});}
    function touch(){controls();list();editor?.refresh();status('Unsaved effects. Save, then build and start a fresh playtest.');}
    function choices(){const q=$('#fx-search').value.toLowerCase(),old=$('#fx-effect').value;$('#fx-effect').replaceChildren();let group;
        for(const[id,meta]of Object.entries(Config.catalog).filter(([id,m])=>(id+' '+m.name).toLowerCase().includes(q))){if(group?.label!==meta.category){group=el('optgroup','',{label:meta.category});$('#fx-effect').append(group);}group.append(el('option',meta.name,{value:id}));}
        if([...$('#fx-effect').options].some(o=>o.value===old))$('#fx-effect').value=old;
        $('.fx-add').disabled=!$('#fx-effect').value;describe();
    }
    function describe(){const meta=Config.catalog[$('#fx-effect').value];$('.fx-description').textContent=meta?meta.name+' · '+meta.category+' · '+(meta.duration/1000)+'s · '+(meta.loop?'loop':'repeats on placement')+(meta.actor?' · Designed around a character silhouette; check the preview before placing.':''): 'No matching effects.';}
    function select(id,focus=false){selected=id;renderEditor();list();editor?.refresh();if(focus)editor?.fit();start=performance.now();}
    function renderEditor(){
        const host=$('.fx-editor'),row=current();host.replaceChildren();if(!row){host.append(el('p','Choose an effect, then Place effect. Draw, move or resize its region on the map.'));return;}
        const form=el('form');form.onsubmit=e=>{e.preventDefault();save();};host.append(form);
        form.append(el('h3',Config.catalog[row.effect]?.name || row.effect));field(form,'Name',row,'name');
        button(form,'Use selected library effect',()=>{if(!$('#fx-effect').value)return;row.effect=$('#fx-effect').value;if(row.hazard)row.hazard.impactMs=0;renderEditor();touch();});
        const grid=el('div','',{className:'asset-field-grid'});form.append(grid);
        field(grid,'Tile X',row,'x',0,data.catalog.width-1);field(grid,'Tile Y',row,'y',0,data.catalog.height-1);
        field(grid,'Area width (tiles)',row,'width',1,32);field(grid,'Area height (tiles)',row,'height',1,32);field(form,'Visual scale',row,'scale',.1,4,.05);
        const colors=el('select','',{id:'fx-colors'});for(const[value,label]of [[0,'Original'],[60,'Golden shift'],[120,'Verdant shift'],[180,'Icy shift'],[-120,'Arcane shift'],[-60,'Rose shift']])colors.append(el('option',label,{value:String(value)}));
        const custom=el('option','Custom hue',{value:'custom'});colors.append(custom);colors.value=[0,60,120,180,-120,-60].includes(row.hue || 0)?String(row.hue || 0):'custom';
        colors.onchange=()=>{if(colors.value==='custom')return;row.hue=Number(colors.value);renderEditor();touch();};form.append(el('label','Color variation',{htmlFor:'fx-colors'}),colors);
        const background=el('select','',{id:'fx-background'});background.append(el('option','Transparent overlay',{value:'transparent'}),el('option','Original artwork',{value:'original'}));background.value=row.background || 'transparent';
        background.onchange=()=>{row.background=background.value;touch();};form.append(el('label','Background',{htmlFor:'fx-background'}),background);
        form.append(el('p','Transparent overlay removes dark translucent backdrops. Use Original artwork to keep dark smoke and shadows.',{className:'field-hint'}));
        field(form,'Hue shift (degrees)',row,'hue',-180,180);
        form.append(el('p','Colors change only the appearance. Original keeps the library colors.',{className:'field-hint'}));
        const label=el('label',' Hazard — damage players in this region'),check=el('input','',{type:'checkbox',checked:!!row.hazard});label.prepend(check);form.append(label);
        check.onchange=()=>{row.hazard=check.checked?{warningMs:1500,activeMs:500,cooldownMs:2500,damage:10,tickMs:500,impactMs:0}:null;renderEditor();start=performance.now();touch();};
        if(row.hazard){const h=row.hazard;
            const position=el('select','',{id:'fx-position'});position.append(el('option','Whole region',{value:'fixed'}),el('option','Random within region',{value:'random'}));position.value=h.placement || 'fixed';
            position.onchange=()=>{h.placement=position.value;if(h.placement==='random'){h.areaWidth=Math.min(2,row.width);h.areaHeight=Math.min(2,row.height);}else{delete h.areaWidth;delete h.areaHeight;}renderEditor();start=performance.now();touch();};
            form.append(el('label','Strike position',{htmlFor:'fx-position'}),position);
            if(h.placement==='random'){field(form,'Strike width (tiles)',h,'areaWidth',1,row.width);field(form,'Strike height (tiles)',h,'areaHeight',1,row.height);form.append(el('p','Each cycle picks a position inside the larger region. Only the highlighted strike footprint causes damage.',{className:'field-hint'}));}
            form.append(el('p',h.placement==='random'?'The chosen footprint is highlighted before damage. Visual scale does not change its hit area.':'Every tile in the region is highlighted before damage. Visual scale does not change the hit area.',{className:'field-hint'}));
            field(form,'Warning (ms)',h,'warningMs',750,60000);field(form,'Active damage (ms)',h,'activeMs',100,60000);field(form,'Safe pause after animation (ms)',h,'cooldownMs',250,300000);
            field(form,'Damage per hit',h,'damage',1,10000);field(form,'Damage interval (ms)',h,'tickMs',250,60000);
            field(form,'Impact frame (ms into effect)',h,'impactMs',0,Math.min(h.warningMs,Config.catalog[row.effect].duration-1));
            form.append(el('p','For a falling meteor, set the impact frame to its landing time. The animation starts during the warning, and damage begins at that frame.',{className:'field-hint'}));
        } else form.append(el('p','Decoration only. No damage, countdown or warning tiles.',{className:'field-hint'}));
        button(form,'Remove from draft',()=>{data.entries=data.entries.filter(r=>r!==row);select(data.entries[0]?.id);touch();},{className:'destructive'});
    }
    function draw(ctx,view){
        if(!data || !painter)return;painter.beginFrame();const elapsed=performance.now()-start;
        for(const source of data.entries){try{Config.validate([source],data.catalog);}catch(_){continue;}const p=Config.phase(source,elapsed),row={...source,...Config.hitRegion(source,p.cycle,12345)},center=view.project({x:row.x+row.width/2,y:row.y+row.height/2});
            if(row.hazard && p.kind!=='cooldown')for(let dy=0;dy<row.height;dy++)for(let dx=0;dx<row.width;dx++){
                const pos=view.project({x:row.x+dx,y:row.y+dy});ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(view.scale/16,view.scale/16);
                window.AttackWarning.tile(ctx,0,0,p.kind==='warning'?1-p.remaining/row.hazard.warningMs:1,p.kind==='active');ctx.restore();
            }
            if(p.effectMs!==null)painter.draw(ctx,row.effect,p.effectMs,center.x,center.y,row.scale*view.scale/16,row.hue || 0,row.background!=='original');
            if(row.hazard && p.kind==='warning'){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0ce';ctx.strokeStyle='#241d25';ctx.lineWidth=2;const label=(p.remaining/1000).toFixed(1),top=view.project({x:row.x+row.width/2,y:row.y});ctx.strokeText(label,top.x,top.y-3);ctx.fillText(label,top.x,top.y-3);}

        }
    }
    async function request(mapId,body){const response=await (window.ToolboxMapData?.fetch || fetch)('./api/world-authoring'+(mapId?'?tool=fx&mapId='+encodeURIComponent(mapId):''),{signal:AbortSignal.timeout(45000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw new Error(value.error || 'FX could not load.');return value;}
    async function load(id){busy=true;controls();status('Loading map effects…');try{
        data=await request(id);original=JSON.stringify(data.entries);$('#fx-map').value=id;$('.fx-workspace').hidden=false;$('.fx-build').href='#build/?map='+encodeURIComponent(id);
        editor?.destroy();$('.fx-map-host').replaceChildren();selected=data.entries[0]?.id;
        editor=window.MapmakerRegionEditor.attach($('.fx-map-host'),id,{getRegion:()=>current() || {x:0,y:0,width:1,height:1},getRegions:()=>data.entries,editable:()=>!!current(),onChange:region=>{Object.assign(current(),region);touch();},onCommit:renderEditor,onSelect:point=>{const r=data.entries.find(r=>Config.contains(r,point.x,point.y));if(r)select(r.id);},draw});
        select(selected);status('Loaded '+data.entries.length+' effects.');
    }catch(error){status(error.message,true);}finally{busy=false;controls();}}
    async function save(){if(busy || !dirty())return;if($('.fx-editor form')?.reportValidity()===false)return;try{Config.validate(data.entries,data.catalog);}catch(error){status(error.message,true);return;}busy=true;controls();try{data=await request(null,{mapId:data.mapId,tool:'fx',revision:data.revision,entries:data.entries});original=JSON.stringify(data.entries);select(selected);status('Effects saved. Build this map and start a fresh playtest.');}catch(error){status(error.message+' Your draft is still here.',true);}finally{busy=false;controls();}}
    $('.fx-add').onclick=()=>{let i=1;while(data.entries.some(r=>r.id==='fx_'+i))i++;const effect=$('#fx-effect').value;data.entries.push({id:'fx_'+i,name:Config.catalog[effect].name,effect,x:current()?.x || 0,y:current()?.y || 0,width:1,height:1,scale:.5,hue:0,background:'transparent',hazard:null});select('fx_'+i);editor?.setMode('draw');touch();};
    $('.fx-save').onclick=save;$('.fx-reload').onclick=()=>guard(()=>load(data?.mapId || $('#fx-map').value));
    $('#fx-map').onchange=e=>{const id=e.target.value;e.target.value=data?.mapId || id;guard(()=>load(id));};
    $('#fx-search').oninput=choices;$('#fx-effect').onchange=()=>{describe();start=performance.now();};
    $('.fx-preview').onclick=()=>{start=performance.now();paused=false;$('.fx-pause').textContent='Pause preview';};
    $('.fx-pause').onclick=()=>{paused=!paused;$('.fx-pause').textContent=paused?'Resume preview':'Pause preview';};
    window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
    choices();window.ToolboxNavigation.route('fx',async params=>{if(!loaded){const setup=await request();$('#fx-map').replaceChildren(...setup.maps.map(id=>el('option',id,{value:id})));loaded=true;}const id=params.get('map') || data?.mapId || $('#fx-map').value;if(id!==data?.mapId)guard(()=>load(id));});
    setInterval(()=>{if(pane.hidden || document.hidden || paused || busy)return;const meta=Config.catalog[$('#fx-effect').value];if(painter && meta){const ctx=$('.fx-sample').getContext('2d');ctx.clearRect(0,0,320,180);painter.draw(ctx,$('#fx-effect').value,(performance.now()-start)%meta.duration,160,140,Math.min(1,150/meta.size[1]));}editor?.refresh();const row=current();if(row){const p=Config.phase(row,performance.now()-start);$('.fx-phase').textContent=row.hazard?row.name+' · '+p.kind+' · '+(p.remaining/1000).toFixed(1)+'s · '+row.width*row.height+' region tiles':row.name+' · Decoration (no damage)';}},50);
})();
