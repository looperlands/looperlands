(() => {
    'use strict';
    const pane = document.getElementById('fishing-pane'), F = window.FishingAuthoring;
    if (!pane || !F) return;
    const fetchData = (...args) => (window.ToolboxMapData?.fetch || fetch)(...args);
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent:text, ...attrs});
    const clone = value => JSON.parse(JSON.stringify(value));
    pane.innerHTML = `<header class="pane-heading"><h2>Fishing</h2><p>Draw fishing areas, set rod levels and choose catches. <a href="#documentation/mapmaker-fishing">Read the guide</a></p></header>
      <div class="fishing-toolbar"><div class="world-toolbar"><div class="field"><label for="fishing-map">Map</label><select id="fishing-map"></select></div><button type="button" class="fishing-save primary" disabled>Save all changes</button><button type="button" class="fishing-reload">Reload</button><a class="fishing-build" href="#build">Build this map</a><a class="fishing-validate" href="#validator">Validate map</a></div><p class="fishing-status" role="status" aria-live="polite">Choose a map.</p></div>
      <div class="asset-discard fishing-discard" hidden><p>Discard unsaved fishing changes to continue?</p><button type="button" class="fishing-discard-yes">Discard changes</button><button type="button" class="fishing-discard-no">Keep editing</button></div>
      <div class="fishing-workspace" hidden><div class="fishing-map-column"><div class="world-inline-actions"><button type="button" class="fishing-add">Draw fishing area</button><button type="button" class="fishing-close">Close water to fishing</button></div><p class="fishing-map-label field-hint"></p><div class="fishing-map-host"></div><p class="field-hint">Cast from a walkable tile one or two tiles away, in the same row or column. Save to Tiled, build this map, then start a fresh playtest.</p></div><aside class="fishing-inspector"><div class="fishing-editor"></div><details open><summary>Fishing on this map</summary><div class="field"><label for="fishing-search">Search areas and water</label><input id="fishing-search" type="search" placeholder="Name, lake or coordinates"></div><h3>Authored areas</h3><div class="world-list fishing-list"></div><h3>Existing Tiled water</h3><div class="world-list fishing-water-list"></div></details></aside></div>`;
    const $ = selector => pane.querySelector(selector);
    let data, catalog, collection, selected, water, regionEditor, busy = false, loaded = false, booting, pending, fieldId = 0, syncing = [];
    const current = () => collection?.rows.find(row => row.id === selected);
    const dirty = () => !!collection?.count;
    const label = row => row.name || (row.scope === 'closed' ? 'Closed water' : 'Fishing area');
    const bounds = row => ({x:row.x, y:row.y, width:row.width, height:row.height});
    const region = () => bounds(current() || water || data?.waters[0] || {x:1,y:1,width:5,height:5});
    function status(message, error = false) {$('.fishing-status').textContent = message;$('.fishing-status').classList.toggle('error',error);}
    function button(parent, text, run, attrs = {}) {const b = el('button',text,{type:'button',...attrs});b.onclick = run;parent.append(b);return b;}
    function controls() {$('.fishing-save').disabled = busy || !dirty();$('.fishing-save').textContent = 'Save all changes' + (dirty() ? ' ('+collection.count+')' : '');$('.fishing-reload').disabled = busy;$('#fishing-map').disabled = busy;$('.fishing-workspace').inert = busy;pane.setAttribute('aria-busy',String(busy));}
    function guard(action) {if (busy) return;if (!dirty()) return action();pending = action;$('.fishing-discard').hidden = false;$('.fishing-discard-no').focus();}
    $('.fishing-discard-yes').onclick = () => {const action = pending;pending = null;$('.fishing-discard').hidden = true;action?.();};
    $('.fishing-discard-no').onclick = () => {pending = null;$('.fishing-discard').hidden = true;};
    function touch() {const row = current();if (row) collection.set(row);syncing.forEach(sync => sync());renderList();controls();regionEditor?.refresh();status(collection.count+' unsaved changes. Save them together when ready.');}
    function select(row, existingWater = null, focus = true) {selected = row?.id;water = existingWater;renderEditor();renderList();controls();regionEditor?.refresh();if (focus) regionEditor?.fit();$('.fishing-map-label').textContent = row ? label(row)+' · blue outline is editable' : existingWater ? existingWater.id+' · existing water bounds, read only' : 'Choose water below to inspect its catches, or draw a fishing area.';}
    function add(scope = 'area', source = null) {
        const template = source ? catalog.lakes.find(lake => lake.id === source.id) : catalog.lakes.find(lake => lake.id === 'cobFarmLake') || catalog.lakes[0];
        const row = collection.add({id:null,kind:'fishing',name:scope === 'closed' ? 'Closed water' : source ? source.id+' override' : '',...bounds(source || {x:1,y:1,width:5,height:5}),scope,sourceLake:source?.id || '',level:template?.level || 1,fish:clone(template?.fish || []),editable:true});
        select(row);touch();regionEditor?.setMode(scope === 'existing' ? 'select' : 'draw');
    }
    async function request(body, id) {
        const response = await fetchData('./api/fishing'+(id ? '?mapId='+encodeURIComponent(id) : ''),{signal:AbortSignal.timeout(45000),...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})});
        const value = await response.json();if (!response.ok) throw new Error(value.error || 'Fishing could not load. Reload to try again.');return value;
    }
    async function load(id) {
        busy = true;controls();status('Reading fishing areas and existing Tiled water…');
        try {
            data = await request(null,id);collection = new window.MapmakerObjectDrafts(data.objects);$('#fishing-map').value = id;$('.fishing-workspace').hidden = false;
            $('.fishing-build').href = '#build/?map='+encodeURIComponent(id);$('.fishing-validate').href = '#validator/?map='+encodeURIComponent(id);
            const object = window.ToolboxNavigation.params().get('object');select(collection.rows.find(row => row.id === object || row.id === selected),null,false);
            regionEditor?.destroy();$('.fishing-map-host').replaceChildren();regionEditor = window.MapmakerRegionEditor.attach($('.fishing-map-host'),id,{label:'Fishing area map. Draw a box, drag to move or resize. Arrow keys move; Shift and arrows resize.',getRegion:region,editable:() => !!current()?.editable,getRegions:() => current() || water ? [region()] : [],onChange(value){const row = current();if (row?.editable) {Object.assign(row,value);touch();}},onLoad(){regionEditor?.refresh();}});
            status('Loaded '+collection.rows.length+' authored areas and '+data.waters.length+' existing waters. Saves update '+data.source+'.');
        } catch (error) {status(error.message,true);} finally {busy = false;controls();}
    }
    async function boot(params) {
        if (!loaded) {busy = true;controls();try {const setup = await request();catalog = setup.catalog;$('#fishing-map').replaceChildren(...setup.maps.map(id => el('option',id,{value:id})));loaded = true;} catch (error) {status(error.message,true);return;} finally {busy = false;controls();}}
        const id = params.get('map') || data?.mapId || $('#fishing-map').value;
        if (data?.mapId === id) {const object = params.get('object');if (object) select(collection.rows.find(row => row.id === object));return;}
        return guard(() => load(id));
    }
    function renderList() {
        const q = $('#fishing-search').value.toLowerCase(), list = $('.fishing-list'), waters = $('.fishing-water-list');list.replaceChildren();waters.replaceChildren();
        const rows = (collection?.rows || []).filter(row => [label(row),row.sourceLake,row.x+','+row.y].join(' ').toLowerCase().includes(q));
        rows.forEach(row => button(list,label(row)+' · '+(collection.isNew(row.id) ? 'unsaved' : '#'+row.id)+' · '+row.x+', '+row.y,() => select(row),{ariaPressed:String(selected === row.id)}));
        if (!rows.length) list.append(el('p',q ? 'No areas match your search.' : 'No authored areas yet. Draw an area or override existing water.',{className:'field-hint'}));
        const matches = (data?.waters || []).filter(row => row.id.toLowerCase().includes(q));
        matches.forEach(row => button(waters,row.id+' · '+row.count.toLocaleString()+' tiles',() => select(null,row),{ariaPressed:String(water?.id === row.id)}));
        if (!matches.length) waters.append(el('p',q ? 'No water matches your search.' : 'No lake-tagged tiles in the built map. Draw an area on the water you want to use.',{className:'field-hint'}));
    }
    function field(parent, text, row, key, options = {}) {
        const id = 'fishing-field-'+(++fieldId), wrap = el('div','',{className:'field'}), input = el(options.choices ? 'select' : 'input','',{id});
        if (options.choices) input.append(...options.choices.map(([value,name]) => el('option',name,{value})));
        else {input.type = options.number ? 'number' : 'text';if (options.number) {input.min = options.min ?? 0;input.max = options.max ?? 10000;input.step = 1;}else input.maxLength = 120;}
        input.value = row[key] ?? '';input.required = key !== 'name' && key !== 'sourceLake';
        syncing.push(() => {if (document.activeElement !== input) input.value = row[key] ?? '';});
        input.oninput = () => {if (options.number && !input.value) return;row[key] = options.number ? Number(input.value) : input.value;touch();options.change?.();};
        wrap.append(el('label',text,{htmlFor:id}),input);parent.append(wrap);return input;
    }
    function grid(parent) {const node = el('div','',{className:'asset-field-grid'});parent.append(node);return node;}
    function renderCatches(parent, row, editable) {
        parent.append(el('h3','Catch table'),el('p','Missing rarity rolls fall back to common. Lucky rolls twice and keeps the rarer catch. Percentages below are per fish.',{className:'field-hint'}));
        const table = el('div','',{className:'fishing-catches'});parent.append(table);
        const refresh = () => {const normal = F.chances(row.fish), lucky = F.chances(row.fish,true);table.querySelectorAll('.fishing-chance').forEach((node,i) => {const r = row.fish[i];if (!r || !normal[i]) return;if (!F.rarities[r.rarity]) {node.textContent='Choose a supported rarity.';return;}node.textContent = (normal[i].chance*100).toFixed(2)+'% normal · '+(lucky[i].chance*100).toFixed(2)+'% lucky · '+F.experience(row.level,r.rarity)+' XP · speed '+F.rarities[r.rarity].speed;});};
        syncing.push(refresh);
        row.fish.forEach((catchRow,index) => {
            const line = el('section','',{className:'fishing-catch'});table.append(line);
            if (editable) {
                const fields = grid(line), input = field(fields,'Catch '+(index+1),catchRow,'item');
                window.ToolboxEntityPicker.attach(input,{type:'item',entries:catalog.items,label:'Catch '+(index+1)});
                field(fields,'Rarity',catchRow,'rarity',{choices:Object.keys(F.rarities).map(id => [id,id.charAt(0).toUpperCase()+id.slice(1)]),change:refresh});
            } else line.append(el('p',(catalog.items.find(item => item.id === catchRow.item)?.name || catchRow.item)+' · '+catchRow.rarity));
            line.append(el('p','',{className:'fishing-chance field-hint'}));
            const description = el('p','',{className:'field-hint'});line.append(description);const refreshDescription = () => {description.textContent = catalog.items.find(item => item.id === catchRow.item)?.description || '';description.hidden = !description.textContent;};syncing.push(refreshDescription);refreshDescription();
            if (editable) button(line,'Remove catch',() => {row.fish.splice(index,1);touch();renderEditor();},{className:'destructive',ariaLabel:'Remove catch '+(index+1)});
        });
        if (editable) {if (!row.fish.some(f => f.rarity === 'common')) parent.append(el('p','Add at least one common catch before saving.',{className:'error'}));button(parent,'Add catch',() => {const next = catalog.items.find(item => !row.fish.some(f => f.item === item.id));if (next) {row.fish.push({item:next.id,rarity:'common'});touch();renderEditor();}});}
        refresh();
    }
    function renderEditor() {
        syncing = [];const host = $('.fishing-editor');host.replaceChildren();const row = current();
        if (!row) {
            if (!water) {host.append(el('h3','Choose where players fish'),el('p','Select existing Tiled water to see its catches, or draw an area to create a map-specific fishing table.'));return;}
            const template = catalog.lakes.find(lake => lake.id === water.id);host.append(el('h3',water.id),el('p',water.count.toLocaleString()+' lake-tagged tiles · required rod level '+(template?.level ?? 'unknown')));
            if (template) {button(host,'Override on this map',() => add('existing',water));renderCatches(host,template,false);}else host.append(el('p','This lake has no registered catch table. Choose a registered source in Tiled.',{className:'error'}));return;
        }
        const form = el('form','',{className:'fishing-form'});form.onsubmit = event => {event.preventDefault();save();};host.append(form);
        form.append(el('h3',row.scope === 'closed' ? 'Closed water' : 'Fishing area'),el('p',collection.isNew(row.id) ? 'New area · unsaved' : 'Tiled object #'+row.id,{className:'field-hint'}));
        if (!row.editable) {form.append(el('p','Edit this shape or rotation in Tiled.',{className:'error'}));return;}
        field(form,'Name (optional)',row,'name');
        field(form,'Apply to',row,'scope',{choices:[['area','Every tile in this area'],['existing','Existing source-water tiles only'],['closed','Close water to fishing']],change:renderEditor});
        if (row.scope !== 'area') field(form,row.scope === 'closed' ? 'Water to close' : 'Existing water',row,'sourceLake',{choices:[...(row.scope === 'closed' ? [['','All water in the box']] : []),...data.waters.map(w => [w.id,w.id])]});
        const geometry = grid(form);for (const [key,text] of [['x','Tile X'],['y','Tile Y'],['width','Width in tiles'],['height','Height in tiles']]) field(geometry,text,row,key,{number:true,min:key==='x'||key==='y'?0:1,max:key==='x'||key==='width'?data.dimensions.width:data.dimensions.height});
        if (row.scope === 'existing') form.append(el('p','Only tiles tagged with the selected lake inside this box change. Other ground and water keep their behavior.',{className:'field-hint'}));
        if (row.scope !== 'closed') {field(form,'Required rod level',row,'level',{number:true,min:1,max:100});renderCatches(form,row,true);}
        else form.append(el('p','No catches are allowed in the affected water after building. Remove this area to restore the underlying Tiled fishing tiles.',{className:'field-hint'}));
        button(form,'Remove area from draft',() => {collection.remove(row.id);select(null);touch();},{className:'destructive'});
    }
    async function save() {
        if (busy || !dirty()) return;
        const form = $('.fishing-editor').querySelector('form');if (form && !form.reportValidity()) return;
        busy = true;controls();status('Saving fishing changes to Tiled…');
        try {const selectedIndex = collection.rows.findIndex(row => row.id === selected);const result = await request({mapId:data.mapId,revision:data.revision,operations:collection.changes()});data = result;collection = new window.MapmakerObjectDrafts(result.objects);select(collection.rows.find(row => row.id === selected) || (selectedIndex >= 0 ? collection.rows[selectedIndex] : null),null,false);status('Saved to Tiled. Build '+data.mapId+' and start a fresh playtest to use these fishing areas.');}
        catch (error) {status(error.message+' Your draft is still here.',true);} finally {busy = false;controls();}
    }
    $('.fishing-add').onclick = () => add();$('.fishing-close').onclick = () => add('closed');$('.fishing-save').onclick = save;
    $('.fishing-reload').onclick = () => guard(() => {if (!data) return boot(window.ToolboxNavigation.params());window.MapmakerCanvas.invalidate(data.mapId);return load(data.mapId);});
    $('#fishing-map').onchange = event => {const id = event.target.value;event.target.value = data?.mapId || id;guard(() => load(id));};$('#fishing-search').oninput = renderList;
    window.addEventListener('beforeunload',event => {if (dirty()) {event.preventDefault();event.returnValue = '';}});
    window.ToolboxNavigation.route('fishing',params => {if (!booting) booting = boot(params).finally(() => {booting = null;});return booting;});
})();
