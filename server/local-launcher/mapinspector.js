(() => {
    'use strict';
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const href = (screen, values = {}) => '#' + screen + '/?' + new URLSearchParams(values);
    const colors = {door:'#7c3b92',npc:'#185c9b',mob:'#a52828',item:'#376239',spawn:'#9b4824',checkpoint:'#145f52',trigger:'#6c5416',scene:'#596575',routine:'#185c9b',quest:'#633b88',entity:'#202936'};
    const labels = {door:'Doors / portals',npc:'NPCs',mob:'Mobs',item:'Items',spawn:'Spawn areas',checkpoint:'Checkpoints',trigger:'Triggers',scene:'Scenes',routine:'NPC routines',quest:'Quests',entity:'Other entities'};
    let libraryPromise;
    const images = new Map();
    async function request(url, body) {
        const response = await fetch(url, {signal: AbortSignal.timeout(45000), ...(body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {})});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The map request failed. Try again.');
        return data;
    }
    function library() {
        libraryPromise ||= request('./api/entity-library').catch(error => {libraryPromise = null; throw error;});
        return libraryPromise;
    }
    document.addEventListener('toolbox:assets-saved', () => {libraryPromise = null; images.clear();});
    function imageFor(entry, ready) {
        if (!entry?.preview) return null;
        let img = images.get(entry.id);
        if (!img) {img = new Image(); images.set(entry.id, img); img.src = entry.preview.url;}
        if (img.complete) return img.naturalWidth ? img : null;
        img.addEventListener('load', ready, {once:true});
        return null;
    }
    function thumbnail(entry) {
        const c = el('canvas', '', {width:44, height:44, className:'entity-thumbnail', ariaHidden:'true'});
        function paint() {
            const image = imageFor(entry, paint), p = entry?.preview;
            if (!image || !p) return;
            const ctx = c.getContext('2d'), scale = Math.min(40 / p.width, 40 / p.height, 3);
            ctx.clearRect(0,0,44,44);ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, 0,p.row*p.height,p.width,p.height, (44-p.width*scale)/2,(44-p.height*scale)/2,p.width*scale,p.height*scale);
        }
        paint(); return c;
    }
    function mount(parent, data, options = {}) {
        parent.replaceChildren();
        const restored = options.state || {}, enabled = new Set(restored.enabled || Object.keys(labels));
        let view = restored.view || {scale:1,x:0,y:0}, mode = restored.mode || 'inspect', selected = restored.selected,
            assetId = restored.assetId || '', draft = null, moving = null, lastTile = null, hover = null, drag = null,
            disposed = false, busy = false, entries = [], query = restored.query || '', page = 0;
        const blocked = new Set(data.collisions), entryById = new Map();
        const workspace = el('div','',{className:'inspector-workspace'}), main = el('div','',{className:'inspector-map'}), sidebar = el('aside','',{className:'inspector-sidebar'});
        const toolbar = el('div','',{className:'inspector-modebar'}), inspectButton = button('Inspect',()=>setMode('inspect')), placeButton = button('Place entities',()=>setMode('place'));
        toolbar.append(inspectButton, placeButton);
        const layers = el('details','',{className:'inspector-layers'});layers.append(el('summary','Layers & display'));
        const layerOptions = el('div','',{className:'analysis-layers'});
        for (const [type,label] of Object.entries(labels)) {
            const input = el('input','',{type:'checkbox',checked:enabled.has(type)}), wrap = el('label','',{className:'asset-check'});
            input.dataset.layer = type;input.onchange = ()=>{if(input.checked)enabled.add(type);else enabled.delete(type);page=0;renderList();draw();};
            wrap.append(input,document.createTextNode(label));wrap.style.color=colors[type];layerOptions.append(wrap);
        }
        const sprites = checkbox('Entity sprites', restored.sprites !== false), collisions = checkbox('Collisions', !!restored.collisions), grid = checkbox('Tile grid', !!restored.grid);
        layerOptions.append(sprites.wrap,collisions.wrap,grid.wrap);layers.append(layerOptions);toolbar.append(layers);
        const expand = button('Expand map',()=>{const expanded=workspace.classList.toggle('inspector-expanded');expand.textContent=expanded?'Exit expanded view':'Expand map';expand.setAttribute('aria-pressed',String(expanded));expand.classList.toggle('inspector-expanded-exit',expanded);(expanded?workspace:toolbar).append(expand);});toolbar.append(expand);
        parent.append(toolbar);
        const notice = el('p','',{className:'inspector-notice field-hint',role:'status',ariaLive:'polite'});main.append(notice);
        if (data.sources.stale) notice.append('Source changes are visible here. Build the map to update the game. ',el('a','Build this map',{href:href('build',{map:data.mapId})}));
        else notice.textContent='Saved placements appear immediately. Build the map before playtesting.';
        workspace.append(main,sidebar);parent.append(workspace);
        const controls = el('div','',{className:'map-controls'});
        controls.append(button('Zoom in',()=>zoom(1.5)),button('Zoom out',()=>zoom(1/1.5)),button('Fit map',()=>fit()));
        const coords = el('span','Hover for tile coordinates',{className:'map-coordinates field-hint'});controls.append(coords);main.append(controls);
        const canvas = el('canvas','',{className:'inspector-canvas',tabIndex:0,ariaLabel:'Map. Drag to pan, scroll or use plus and minus to zoom. In Place mode click a tile to preview the entity. Coordinate fields offer keyboard placement.'});canvas.height=560;
        const hint = el('p','Drag to pan · Scroll to zoom · Escape to cancel placement',{className:'map-art-hint field-hint'});main.append(canvas,hint);
        const jump = el('form','',{className:'inspector-jump'}), jumpX = numberInput('Go to tile X','inspector-jump-x',1,data.width-1), jumpY = numberInput('Go to tile Y','inspector-jump-y',1,data.height-1);
        jump.append(jumpX.wrap,jumpY.wrap,el('button','Go to tile',{type:'submit'}));
        jump.onsubmit=event=>{event.preventDefault();const p={x:Number(jumpX.input.value),y:Number(jumpY.input.value)};center(p);pick(p);};main.append(jump);
        const inspectPanel = el('div','',{className:'inspector-inspect-panel'}), detail = el('section','',{className:'inspector-detail',ariaLabel:'Selected map object',tabIndex:-1});
        inspectPanel.append(detail);
        const search = el('input','',{type:'search',id:'inspector-object-search',value:query,placeholder:'Name, type, ID or tile',ariaLabel:'Search map objects'});
        const typeSelect = el('select','',{ariaLabel:'Filter object type'});typeSelect.append(el('option','All object types',{value:''}));
        for(const [type,label] of Object.entries(labels))typeSelect.append(el('option',label,{value:type}));
        typeSelect.value=restored.type||'';
        const issues = checkbox('Objects with findings',!!restored.issues), count = el('p','',{className:'inspector-count field-hint',role:'status'}), list = el('div','',{className:'inspector-list',role:'list',ariaLabel:'Map objects'}), pages = el('div','',{className:'inspector-pagination'});
        inspectPanel.append(el('h3','Map objects'),el('label','Search objects',{htmlFor:search.id}),search,typeSelect,issues.wrap,count,list,pages);
        search.oninput=()=>{query=search.value;lastTile=null;page=0;renderList();draw();};typeSelect.onchange=()=>{page=0;lastTile=null;renderList();};issues.input.onchange=()=>{page=0;renderList();};
        const placePanel = el('div','',{className:'inspector-place-panel'}), paletteSearch = el('input','',{type:'search',placeholder:'Search entities',ariaLabel:'Search entities'}), paletteType = el('select','',{ariaLabel:'Entity category'});
        for(const [value,label] of [['','All entities'],['item','Items'],['mob','Mobs'],['npc','NPCs']])paletteType.append(el('option',label,{value}));
        paletteSearch.value=restored.paletteQuery||'';paletteType.value=restored.paletteType||'';
        const paletteCount = el('p','Loading entity library…',{className:'field-hint',role:'status'}), palette = el('div','',{className:'entity-palette',ariaLabel:'Entity library'}), placement = el('form','',{className:'entity-placement'});
        placePanel.append(placement,el('h3','Choose an entity'),paletteSearch,paletteType,paletteCount,palette);
        const create = el('details','',{className:'entity-create'});create.append(el('summary','Create a new entity'));
        const createLinks=el('div','',{className:'analysis-actions'});
        for(const [screen,label]of [['items','New item'],['mobs','New mob'],['npcs','New NPC']])createLinks.append(el('a',label,{href:href(screen,{map:data.mapId,create:'1'}),className:'analysis-link'}));
        create.append(el('p','Start from an existing entity in its editor. Save the new definition, then choose Place on map.'),createLinks);placePanel.append(create);
        sidebar.append(inspectPanel,placePanel);
        paletteSearch.oninput=renderPalette;paletteType.onchange=renderPalette;
        let artwork = null, firstResize = true;
        const resize = new ResizeObserver(()=>{
            if(!canvas.isConnected){resize.disconnect();return;}
            const oldW=firstResize&&restored.canvasWidth?restored.canvasWidth:canvas.width,oldH=firstResize&&restored.canvasHeight?restored.canvasHeight:canvas.height;
            canvas.width=Math.max(1,Math.round(canvas.clientWidth));canvas.height=Math.max(1,Math.round(canvas.clientHeight));
            if(firstResize&&!restored.view)fit();else{view.x+=(canvas.width-oldW)/2;view.y+=(canvas.height-oldH)/2;draw();}
            firstResize=false;
        });resize.observe(canvas);
        const image = new Image();image.onload=()=>{if(disposed)return;artwork=image;draw();};image.onerror=()=>{hint.textContent='Artwork unavailable. Geometry and entity previews remain visible.';};image.src=data.tileset;
        canvas.onwheel=event=>{event.preventDefault();zoom(event.deltaY<0?1.2:1/1.2,event.offsetX,event.offsetY);};
        canvas.onpointerdown=event=>{if(event.button!==0)return;drag={x:event.offsetX,y:event.offsetY,vx:view.x,vy:view.y};canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});};
        canvas.onpointermove=event=>{hover=point(event.offsetX,event.offsetY);coords.textContent='Tile '+hover.x+', '+hover.y;if(drag){view.x=drag.vx+event.offsetX-drag.x;view.y=drag.vy+event.offsetY-drag.y;}draw();};
        canvas.onpointerleave=()=>{hover=null;draw();};
        canvas.onpointerup=event=>{if(drag&&Math.hypot(event.offsetX-drag.x,event.offsetY-drag.y)<6)pick(point(event.offsetX,event.offsetY));drag=null;};canvas.onpointercancel=()=>{drag=null;};
        canvas.onkeydown=event=>{
            if(event.key==='Escape'){event.preventDefault();draft=null;moving=null;setMode('inspect');return;}
            const step={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[event.key];
            if(step){event.preventDefault();view.x+=step[0];view.y+=step[1];draw();}
            else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(event.key==='-'?1/1.5:1.5);}
        };
        function refreshLibrary(){return library().then(result=>{if(disposed)return;entries=result.entries;entryById.clear();for(const entry of entries)entryById.set(entry.id,entry);renderPalette();renderList();renderDetail();renderPlacement();draw();}).catch(error=>{if(disposed)return;paletteCount.textContent=error.message;paletteCount.classList.add('error');});}
        document.addEventListener('toolbox:assets-saved',refreshLibrary);refreshLibrary();
        if(data.placementError){placeButton.disabled=true;notice.textContent='Placement unavailable: '+data.placementError;}
        if(window.ToolboxNavigation.params().has('place')){assetId=window.ToolboxNavigation.params().get('place');mode='place';}
        setMode(mode);renderDetail();renderList();
        if(restored.expanded)expand.click();

        function button(label,run){const b=el('button',label,{type:'button'});b.onclick=run;return b;}
        function checkbox(label,checked){const wrap=el('label','',{className:'asset-check'}),input=el('input','',{type:'checkbox',checked});wrap.append(input,document.createTextNode(label));input.onchange=draw;return{wrap,input};}
        function numberInput(label,id,min,max,value=''){const wrap=el('div','',{className:'field'}),input=el('input','',{id,type:'number',min:String(min),max:String(max),step:'1',required:true,value:String(value)});wrap.append(el('label',label,{htmlFor:id}),input);return{wrap,input};}
        function message(text,error=false){notice.textContent=text;notice.classList.toggle('error',error);}
        function setMode(next){if(busy)return;mode=next==='place'&&!data.placements?'inspect':next;if(mode==='inspect'){draft=null;moving=null;}else selected=null;inspectPanel.hidden=mode!=='inspect';placePanel.hidden=mode!=='place';inspectButton.setAttribute('aria-pressed',String(mode==='inspect'));placeButton.setAttribute('aria-pressed',String(mode==='place'));canvas.classList.toggle('is-placing',mode==='place');renderPlacement();draw();}
        function point(x,y){return{x:Math.floor((x-view.x)/view.scale),y:Math.floor((y-view.y)/view.scale)};}
        function inside(p){return p&&p.x>0&&p.y>0&&p.x<data.width&&p.y<data.height;}
        function contains(o,p){return p.x>=o.x&&p.y>=o.y&&p.x<o.x+o.width&&p.y<o.y+o.height;}
        function hits(o,p){const f=entryById.get(o.kind)?.preview;if(contains(o,p))return true;if(!f||!sprites.input.checked||view.scale<3)return false;return p.x+.5>=o.x+f.offsetX/data.tilesize&&p.x+.5<o.x+(f.offsetX+f.width)/data.tilesize&&p.y+.5>=o.y+f.offsetY/data.tilesize&&p.y+.5<o.y+(f.offsetY+f.height)/data.tilesize;}
        function visible(){return data.objects.filter(o=>enabled.has(o.type));}
        function validation(p){if(!inside(p))return'Choose a tile inside the playable map.';if(blocked.has(p.y*data.width+p.x))return'This tile is blocked. Choose a walkable tile.';if(data.objects.some(o=>['npc','mob','item','entity'].includes(o.type)&&o.placementId!==moving&&contains(o,p)))return'This tile already contains an entity.';return'';}
        function pick(p){
            if(busy||!inside(p))return;
            jumpX.input.value=p.x;jumpY.input.value=p.y;
            if(mode==='place'){draft=p;renderPlacement();draw();return;}
            const matches=visible().filter(o=>hits(o,p));lastTile=p;page=0;
            if(matches.length)select(matches.sort((a,b)=>Number(contains(b,p))-Number(contains(a,p))||a.width*a.height-b.width*b.height)[0].id,false,true);
            else{selected=null;renderDetail();renderList();draw();}
        }
        function center(p){view.scale=Math.max(view.scale,16);view.x=canvas.width/2-(p.x+.5)*view.scale;view.y=canvas.height/2-(p.y+.5)*view.scale;draw();}
        function fit(){view.scale=Math.min(canvas.width/data.width,canvas.height/data.height)*.95;view.x=(canvas.width-data.width*view.scale)/2;view.y=(canvas.height-data.height*view.scale)/2;draw();}
        function zoom(factor,x=canvas.width/2,y=canvas.height/2){const old=view.scale;view.scale=Math.max(.15,Math.min(64,old*factor));view.x=x-(x-view.x)*view.scale/old;view.y=y-(y-view.y)*view.scale/old;draw();}
        function renderPalette(){
            const text=paletteSearch.value.toLowerCase(),rows=entries.filter(e=>(!paletteType.value||e.type===paletteType.value)&&[e.id,e.name,e.type].join(' ').toLowerCase().includes(text));
            paletteCount.textContent=rows.length+(rows.length===1?' entity':' entities')+(rows.length>60?' · showing 60; search to narrow the list':'');palette.replaceChildren();
            for(const entry of rows.slice(0,60)){
                const b=button('',()=>{assetId=entry.id;moving=null;draft=null;renderPalette();renderPlacement();draw();});b.className='entity-option';b.setAttribute('aria-pressed',String(entry.id===assetId));
                const copy=el('span');copy.append(el('strong',entry.name||entry.id),el('small',entry.type.toUpperCase()+' · '+entry.id));b.append(thumbnail(entry),copy);palette.append(b);
            }
            if(!rows.length)palette.append(el('p','No entities match. Try another search or create a new definition below.'));
        }
        function renderPlacement(){
            placement.replaceChildren();
            placement.hidden=!assetId;
            if(!assetId)return;
            const entry=entryById.get(assetId),heading=el('div','',{className:'entity-chosen'});heading.append(thumbnail(entry),el('h3',(moving?'Move ':'Place ')+(entry?.name||assetId)));placement.append(heading);
            if(!entry&&entries.length){placement.append(el('p','This entity is unavailable. Choose a saved definition.'));return;}
            const coordinates=el('div','',{className:'entity-coordinates'}),x=numberInput('Tile X','entity-tile-x',1,data.width-1,draft?.x??''),y=numberInput('Tile Y','entity-tile-y',1,data.height-1,draft?.y??'');coordinates.append(x.wrap,y.wrap);placement.append(coordinates);
            const problem=draft?validation(draft):'Click the map or enter tile coordinates to preview.';
            placement.append(el('p',problem||'Walkable, empty tile. Ready to save.',{className:'field-hint'+(draft&&problem?' error':'')}));
            const save=el('button',moving?'Save new position':'Save placement',{type:'submit',className:'primary',disabled:busy||!draft||!!problem||!entry});
            const actions=el('div','',{className:'analysis-actions'});actions.append(save,button('Cancel',()=>setMode('inspect')));placement.append(actions);
            if(entry)placement.append(el('a','Edit '+entry.type+' definition',{href:href(entry.type==='npc'?'npcs':entry.type==='mob'?'mobs':'items',{asset:assetId,map:data.mapId}),className:'analysis-link'}));
            const update=()=>{draft={x:Number(x.input.value),y:Number(y.input.value)};const complete=x.input.value!==''&&y.input.value!=='',problem=complete?validation(draft):'',hint=placement.querySelector('.field-hint');save.disabled=busy||!complete||!!problem||!entry;hint.textContent=complete?(problem||'Walkable, empty tile. Ready to save.'):'Enter both X and Y to preview the placement.';hint.classList.toggle('error',complete&&!!problem);draw();};x.input.oninput=update;y.input.oninput=update;
            placement.onsubmit=event=>{event.preventDefault();if(!save.disabled)persist(moving?{operation:'move',id:moving,position:draft}:{operation:'add',kind:assetId,position:draft});};
        }
        async function persist(change){
            if(busy)return;busy=true;sidebar.inert=true;parent.setAttribute('aria-busy','true');inspectButton.disabled=true;placeButton.disabled=true;message('Saving placement to Tiled source…');
            try{await request('./api/entity-placements',{mapId:data.mapId,revision:data.placements.revision,...change});draft=null;moving=null;selected=null;message('Saved. Refreshing the source placements…');await options.refresh();}
            catch(error){message(error.message,true);}
            finally{busy=false;sidebar.inert=false;parent.setAttribute('aria-busy','false');inspectButton.disabled=false;placeButton.disabled=!data.placements;}
        }
        function renderDetail(){
            detail.replaceChildren();const o=data.objects.find(o=>o.id===selected);
            if(!o){detail.append(el('h3',lastTile?'Tile '+lastTile.x+', '+lastTile.y:'Select an object'),el('p',lastTile?'Choose an object from this tile below, or use Place entities to add one.':'Click an entity on the map or choose it in the list below.',{className:'field-hint'}));return;}
            const heading=el('div','',{className:'entity-chosen'});heading.append(thumbnail(entryById.get(o.kind)),el('h3',o.name));detail.append(heading);
            const location=el('p');location.append(labels[o.type]+' · tile ',window.MapLocation.coordinate(data.mapId,o.x,o.y));if(o.width>1||o.height>1)location.append(' · '+o.width+' × '+o.height);detail.append(location);
            const actions=el('div','',{className:'analysis-actions'});
            if(o.editor)actions.append(el('a','Edit definition',{href:o.editor,className:'analysis-link'}));
            actions.append(button('Center on map',()=>center(o)));
            if(o.placementId){actions.append(button('Move',()=>{assetId=o.kind;setMode('place');moving=o.placementId;draft={x:o.x,y:o.y};renderPalette();renderPlacement();center(o);}),button('Remove placement',()=>persist({operation:'remove',id:o.placementId})));}
            if(o.type==='npc')actions.append(el('a','Behaviour / schedule',{href:href('npcs/behaviour',{map:data.mapId,kind:o.kind,x:o.x,y:o.y}),className:'analysis-link'}));
            detail.append(actions);
            if(o.placementId&&o.type==='npc')detail.append(el('p','NPC routines use the exact spawn tile. Update Behaviour / schedule after moving or removing this NPC.',{className:'field-hint'}));
            if(!o.placementId&&['npc','mob','item'].includes(o.type))detail.append(el('p','This placement uses the Tiled entities layer. Move or remove it in Tiled.',{className:'field-hint'}));
            for(const f of data.findings.filter(f=>f.objectId===o.id)){const note=el('p',f.severity+': '+f.message,{className:f.severity==='error'?'error':'field-hint'});const destination=/^Destination ([A-Za-z0-9_-]+) at (-?\d+), (-?\d+)/.exec(f.message);if(destination)window.MapLocation.mark(note,{mapId:destination[1],x:Number(destination[2]),y:Number(destination[3])});detail.append(note);}
            const properties=el('details');properties.append(el('summary','Source & properties'),el('code',o.id));
            const dl=el('dl','',{className:'inspector-properties'});
            for(const [key,value]of Object.entries(o.properties||{})){const valueNode=el('dd',String(value));dl.append(el('dt',key),valueNode);if(['x','y','cx','cy'].includes(key)){const p=o.properties;window.MapLocation.mark(valueNode,{mapId:o.type==='door'?(p.map||data.mapId):data.mapId,x:Number(key.startsWith('c')?p.cx:p.x),y:Number(key.startsWith('c')?p.cy:p.y)});}}
            properties.append(dl,button('Copy Tiled location',async()=>{const source=data.sources.tiled+' · '+(o.tiledLayer||o.type)+' · '+o.name+' · tile '+o.x+', '+o.y;try{await navigator.clipboard.writeText(source);message('Tiled location copied.');}catch(_){message(source);}}));detail.append(properties);
        }
        function renderList(){
            const findings=new Set(data.findings.map(f=>f.objectId)),text=query.toLowerCase().replace(/\s*,\s*/g,',');
            let rows=visible().filter(o=>(!typeSelect.value||o.type===typeSelect.value)&&(!issues.input.checked||findings.has(o.id))&&[o.name,o.type,o.kind,o.id,o.x+','+o.y].join(' ').toLowerCase().includes(text));
            if(lastTile)rows=rows.filter(o=>hits(o,lastTile));
            const pageSize=40;page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));count.textContent=rows.length+(rows.length===1?' object':' objects')+(lastTile?' at tile '+lastTile.x+', '+lastTile.y:'');list.replaceChildren();pages.replaceChildren();
            if(lastTile)pages.append(button('Show all objects',()=>{lastTile=null;page=0;renderList();}));
            for(const o of rows.slice(page*pageSize,(page+1)*pageSize)){
                const b=button('',()=>select(o.id,true,true));b.className='inspector-object';b.setAttribute('aria-pressed',String(o.id===selected));
                const copy=el('span');copy.append(el('strong',o.name),el('small',o.type+' · '+o.x+', '+o.y+(findings.has(o.id)?' · finding':'')));b.append(thumbnail(entryById.get(o.kind)),copy);
                const item=el('div','',{role:'listitem'});item.append(b);list.append(item);
            }
            if(!rows.length)list.append(el('p','No objects match. Adjust the search, type or layer filters.',{className:'field-hint'}));
            if(rows.length>pageSize){const previous=button('Previous',()=>{page--;renderList();}),next=button('Next',()=>{page++;renderList();});previous.disabled=page===0;next.disabled=(page+1)*pageSize>=rows.length;pages.append(previous,el('span',(page+1)+' / '+Math.ceil(rows.length/pageSize)),next);}
        }
        function select(id,focus=false,reveal=false){
            const o=data.objects.find(o=>o.id===id||o.builtId===id);if(!o){message('This object is no longer available. Refresh the map.',true);return;}
            selected=o.id;enabled.add(o.type);const input=layerOptions.querySelector('[data-layer="'+o.type+'"]');if(input)input.checked=true;
            mode='inspect';inspectPanel.hidden=false;placePanel.hidden=true;inspectButton.setAttribute('aria-pressed','true');placeButton.setAttribute('aria-pressed','false');canvas.classList.remove('is-placing');
            if(focus){lastTile=null;query='';search.value='';typeSelect.value='';issues.input.checked=false;center(o);}
            renderDetail();renderList();draw();
            if(reveal&&window.matchMedia('(max-width:820px)').matches){detail.focus({preventScroll:true});detail.scrollIntoView({block:'nearest'});}
        }
        let drawQueued=false;
        function redraw(){if(drawQueued||disposed)return;drawQueued=true;requestAnimationFrame(()=>{drawQueued=false;if(!disposed)draw();});}
        function draw(){
            if(disposed||!canvas.isConnected)return;
            const ctx=canvas.getContext('2d'),s=view.scale;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#f7f8fa';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(view.x,view.y);ctx.scale(s,s);ctx.fillStyle='#fff';ctx.fillRect(0,0,data.width,data.height);
            const minX=Math.max(0,Math.floor(-view.x/s)),maxX=Math.min(data.width,Math.ceil((canvas.width-view.x)/s)),minY=Math.max(0,Math.floor(-view.y/s)),maxY=Math.min(data.height,Math.ceil((canvas.height-view.y)/s));
            if(artwork){const size=data.tilesize,cols=artwork.width/size;for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)for(const raw of [].concat(data.tiles[y*data.width+x]||[])){const i=Number(raw)-1;if(i>=0)ctx.drawImage(artwork,(i%cols)*size,Math.floor(i/cols)*size,size,size,x,y,1,1);}}
            if(collisions.input.checked||!artwork){ctx.fillStyle=artwork?'#a52828':'#dde2e8';ctx.globalAlpha=artwork ? .3 : 1;for(const i of blocked){const x=i%data.width,y=Math.floor(i/data.width);if(x>=minX&&x<maxX&&y>=minY&&y<maxY)ctx.fillRect(x,y,1,1);}ctx.globalAlpha=1;}
            if(grid.input.checked&&s>=8){ctx.strokeStyle='#20293630';ctx.lineWidth=1/s;ctx.beginPath();for(let x=minX;x<=maxX;x++){ctx.moveTo(x,minY);ctx.lineTo(x,maxY);}for(let y=minY;y<=maxY;y++){ctx.moveTo(minX,y);ctx.lineTo(maxX,y);}ctx.stroke();}
            const rows=visible().filter(o=>o.x+o.width>=minX-8&&o.x<=maxX+8&&o.y+o.height>=minY-8&&o.y<=maxY+8).sort((a,b)=>a.y-b.y);
            for(const o of rows){
                if(o.width>1||o.height>1){ctx.fillStyle=colors[o.type];ctx.strokeStyle=colors[o.type];ctx.globalAlpha=.08;ctx.fillRect(o.x,o.y,o.width,o.height);ctx.globalAlpha=.65;ctx.lineWidth=1/s;ctx.strokeRect(o.x,o.y,o.width,o.height);ctx.globalAlpha=1;continue;}
                const entry=entryById.get(o.kind),img=sprites.input.checked?imageFor(entry,redraw):null;
                if(img&&s>=3){paintSprite(ctx,entry,img,o);}
                else{ctx.fillStyle=colors[o.type];ctx.strokeStyle='#fff';ctx.lineWidth=1/s;ctx.beginPath();ctx.arc(o.x+.5,o.y+.5,Math.max(.35,3/s),0,Math.PI*2);ctx.fill();ctx.stroke();}
            }
            const target=data.objects.find(o=>o.id===selected);
            if(target){ctx.strokeStyle='#fff';ctx.lineWidth=5/s;ctx.strokeRect(target.x,target.y,target.width,target.height);ctx.strokeStyle='#1e4f9d';ctx.lineWidth=2/s;ctx.strokeRect(target.x,target.y,target.width,target.height);if(s>=3){ctx.font='600 '+13/s+'px system-ui';const w=ctx.measureText(target.name).width+12/s;ctx.fillStyle='#1e4f9d';ctx.fillRect(target.x,target.y-22/s,w,20/s);ctx.fillStyle='#fff';ctx.fillText(target.name,target.x+6/s,target.y-8/s);}}
            const p=mode==='place'?(draft||hover):hover;
            if(inside(p)){const invalid=mode==='place'&&validation(p);ctx.strokeStyle=invalid?'#a52828':'#2563eb';ctx.lineWidth=2/s;ctx.strokeRect(p.x,p.y,1,1);if(mode==='place'){const entry=entryById.get(assetId),img=imageFor(entry,redraw);if(img){ctx.globalAlpha=.6;paintSprite(ctx,entry,img,p);ctx.globalAlpha=1;}}}
            ctx.restore();coords.textContent=(hover?'Tile '+hover.x+', '+hover.y+' · ':'')+Math.round(s/data.tilesize*100)+'%';
        }
        function paintSprite(ctx,entry,img,p){const f=entry.preview;ctx.drawImage(img,0,f.row*f.height,f.width,f.height,p.x+f.offsetX/data.tilesize,p.y+f.offsetY/data.tilesize,f.width/data.tilesize,f.height/data.tilesize);}
        return {draw,select,place(id){assetId=id;setMode('place');renderPalette();},destroy(){disposed=true;resize.disconnect();document.removeEventListener('toolbox:assets-saved',refreshLibrary);},snapshot(){return{mapId:data.mapId,view:{...view},canvasWidth:canvas.width,canvasHeight:canvas.height,expanded:workspace.classList.contains('inspector-expanded'),enabled:[...enabled],mode,assetId,selected,query,paletteQuery:paletteSearch.value,paletteType:paletteType.value,type:typeSelect.value,issues:issues.input.checked,sprites:sprites.input.checked,collisions:collisions.input.checked,grid:grid.input.checked};}};
    }
    window.MapInspector={mount};
})();
