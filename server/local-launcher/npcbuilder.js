(() => {
    'use strict';
    const fetchData = (...args) => (window.ToolboxMapData?.fetch || fetch)(...args);
    const pane = document.getElementById('npc-behaviour');
    if (!pane) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    pane.innerHTML = `<header class="pane-heading"><h2>NPC behaviour & schedule</h2><p>Set routines for individual NPC placements in a map. <a href="#documentation/mapmaker-npcs">Read the guide</a> · <a href="#documentation/mapmaker-routes">Route painter guide</a></p></header>
    <div class="asset-library editor-toolbar"><div class="field"><label for="npc-map">Map</label><select id="npc-map"></select></div><button type="button" id="npc-reload">Reload routines</button><button type="button" id="npc-new" disabled>New routine</button><button type="button" id="npc-save-top" class="primary" disabled>Save routine</button></div>
    <p id="npc-status" role="status" aria-live="polite">Choose a map to load its routines.</p>
    <div id="npc-discard" class="asset-discard" hidden><p>You have unsaved changes. Discard them to continue?</p><button type="button" id="npc-discard-yes">Discard changes</button><button type="button" id="npc-discard-no">Keep editing</button></div>
    <div class="npc-workspace"><aside><div class="field"><label for="npc-search">Search routines</label><input id="npc-search" type="search" placeholder="Name, ID or NPC type"></div><p id="npc-count" class="field-hint"></p><div id="npc-list" class="npc-list" aria-label="NPC routines"></div></aside><form id="npc-form" hidden><div id="npc-fields"></div><div class="asset-save"><button type="submit" class="primary" id="npc-save">Save routine</button><button type="button" id="npc-reset" class="destructive">Reset saved override</button><span id="npc-dirty"></span></div><p id="npc-source" class="field-hint"></p><p class="field-hint">Save, then <a href="#build">build this map</a> to restart the game and load its NPC files. Placement and collision checks use the most recent map build.</p></form></div>`;
    const $ = selector => pane.querySelector(selector), form = $('#npc-form');
    let data, draft, originalKey, dirty = false, busy = false, sequence = 0, pending, loaded = false, fieldId = 0;
    function status(message, error = false) {$('#npc-status').textContent = message; $('#npc-status').classList.toggle('error', error);}
    function changed(value = true) {dirty = value;for(const node of pane.querySelectorAll('.npc-route-painter'))if(node.getClientRects().length)node.dispatchEvent(new Event('npc-route-refresh')); $('#npc-dirty').textContent = value ? 'Unsaved changes' : ''; $('#npc-save-top').disabled = busy || !draft || !value; $('#npc-save').disabled = busy || !value;}
    function guard(action) {if (!dirty) return action(); pending = action; $('#npc-discard').hidden = false; $('#npc-discard-no').focus();}
    $('#npc-discard-yes').onclick = () => {const action = pending; pending = null; $('#npc-discard').hidden = true; changed(false); action?.();};
    $('#npc-discard-no').onclick = () => {pending = null; $('#npc-discard').hidden = true;};
    async function request(url, body) {const response = await fetchData(url, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {}); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load NPC routines. Try again.'); return result;}
    const coordinateInputs = new WeakMap();
    function field(parent, object, key, label, options = {}) {
        const id = 'npc-field-' + ++fieldId, wrap = el('div', '', {className: 'field'});
        const input = options.choices ? el('select') : el(options.multiline || options.dialogue ? 'textarea' : 'input');
        if (options.choices) for (const [value, text] of options.choices) input.append(el('option', text, {value}));
        else if (!options.multiline && !options.dialogue) input.type = options.type || 'text';
        Object.assign(input, {id, value: object[key] ?? '', disabled: !!options.disabled});
        if (options.type === 'number') {input.min = String(options.min ?? 0); input.max = String(options.max ?? 10000); input.step = String(options.step ?? 1);}
        if (options.multiline || options.dialogue) input.rows = 3;
        if (options.maxLength) input.maxLength = options.maxLength;
        if (options.required) input.required = true;
        input.addEventListener('input', () => {object[key] = options.type === 'number' ? Number(input.value) : input.value; changed();});
        if (key === 'x' || key === 'y') {const pair = coordinateInputs.get(object) || {}; pair[key] = input; coordinateInputs.set(object, pair); window.MapLocation.mark(input, () => ({mapId: data?.mapId, x: pair.x?.value.trim() ? Number(pair.x.value) : NaN, y: pair.y?.value.trim() ? Number(pair.y.value) : NaN}));}
        wrap.append(el('label', label, {htmlFor: id}), input); if (options.hint) wrap.append(el('span', options.hint, {className: 'field-hint'})); parent.append(wrap); if (options.dialogue) window.ToolboxDialogueEditor.attach(input); return input;
    }
    function check(parent, label, value, update) {const input = el('input', '', {type: 'checkbox', checked: value}); const wrap = el('label', '', {className: 'asset-check'}); wrap.append(input, document.createTextNode(label)); parent.append(wrap); input.onchange = () => {update(input.checked); changed();};}
    function grid(parent) {const node = el('div', '', {className: 'asset-field-grid'}); parent.append(node); return node;}
    function section(parent, heading, help) {const node = el('section', '', {className: 'asset-section'}); node.append(el('h3', heading)); if (help) node.append(el('p', help, {className: 'field-hint'})); parent.append(node); return node;}
    function collapsible(parent, heading, help) {const node = el('details', '', {className: 'npc-detail'}); node.append(el('summary', heading)); if (help) node.append(el('p', help, {className: 'field-hint'})); parent.append(node); return node;}
    function button(parent, label, action, attrs = {}) {const node = el('button', label, {type: 'button', ...attrs}); node.onclick = action; parent.append(node); return node;}
    function area(parent, object) {const row = grid(parent); for (const [key, label] of [['x','Area X'],['y','Area Y'],['width','Area width'],['height','Area height']]) field(row, object, key, label, {type: 'number', min: ['width','height'].includes(key) ? 1 : 0, required: true});}
    function point(parent, object, prefix) {const row = grid(parent); field(row, object, 'x', prefix + ' X', {type: 'number', required: true}); field(row, object, 'y', prefix + ' Y', {type: 'number', required: true});}
    function route(parent, points, movementArea = () => draft.area) {
        const routeOwner=draft;
        const painter=el('section','',{className:'npc-route-painter'});parent.append(painter);painter.append(el('h4','Paint this route'),el('p','Click walkable tiles to append waypoints. Select a waypoint below to move it. Red segments cannot be walked within the current movement area.',{className:'field-hint'}));
        const mode=el('select','',{ariaLabel:'Route painting mode'});mode.append(el('option','Append waypoint',{value:'append'}),el('option','Move selected waypoint',{value:'move'}));const modeField=el('label','',{className:'field'});modeField.append(el('span','Click map to'),mode);painter.append(modeField);
        let selected=0,links=[],playing=false,frame=0,start=0;
        const feedback=el('p','',{className:'field-hint',role:'status'}),preview=el('p','',{className:'field-hint'});
        const map=window.MapmakerCanvas.attach(painter,data.mapId,{area:movementArea,onLoad:()=>updateMap(),onPick:p=>{
            const area=movementArea(),result=window.MapmakerPath.find(map.map,p,p);if(result.error){feedback.textContent=result.error;return;}
            if(mode.value==='move'){if(!points[selected]){feedback.textContent='Add a waypoint before choosing Move selected waypoint.';return;}Object.assign(points[selected],p);}else{if(points.length>=100){feedback.textContent='Use at most 100 waypoints.';return;}points.push({...p,waitSeconds:10});selected=points.length-1;}changed();draw();
        }});painter.append(feedback,preview);painter.addEventListener('npc-route-refresh',()=>updateMap());
        button(painter,'Fit route',()=>{const all=[draft.origin,...points],xs=all.map(p=>p.x),ys=all.map(p=>p.y);map.fit({x:Math.min(...xs)-2,y:Math.min(...ys)-2,width:Math.max(...xs)-Math.min(...xs)+4,height:Math.max(...ys)-Math.min(...ys)+4});});
        button(painter,'Fit movement area to route',()=>{const area=movementArea(),all=[...(area===draft.area?[draft.origin]:[]),...points];if(!all.length)return;Object.assign(area,{x:Math.min(...all.map(p=>p.x)),y:Math.min(...all.map(p=>p.y)),width:Math.max(...all.map(p=>p.x))-Math.min(...all.map(p=>p.x))+1,height:Math.max(...all.map(p=>p.y))-Math.min(...all.map(p=>p.y))+1});changed();render();});
        const play=button(painter,'Preview movement',()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){preview.textContent='Reduced motion is enabled. Route paths and wait settings remain available.';return;}playing=!playing;play.textContent=playing?'Pause movement':'Preview movement';start=performance.now();if(playing)frame=requestAnimationFrame(animate);else{cancelAnimationFrame(frame);updateMap();}});
        function updateMap(actor,recompute=true){if(draft!==routeOwner||!map.map)return;if(recompute)links=window.MapmakerPath.route(map.map,points,movementArea());map.set({regions:[movementArea()],points,selected,links,collisions:true,actor});feedback.textContent=links.map((l,i)=>l.error?'Segment '+(i+1)+': '+l.error:'').filter(Boolean).join(' ')||(points.length?points.length+' waypoints · all segments are walkable in the built map.':'No waypoints yet. Click a walkable tile or use Add waypoint.');}
        function animate(now){if(!playing||!painter.isConnected)return;const timeline=[];for(let i=0;i<links.length;i++){for(const p of links[i].path.slice(0,-1))timeline.push({p,ms:draft.stepMs});if(points[i])timeline.push({p:points[i],ms:points[i].waitSeconds*1000});}const duration=timeline.reduce((sum,t)=>sum+t.ms,0);if(!duration){playing=false;play.textContent='Preview movement';return;}let elapsed=(now-start)%duration,actor;for(const part of timeline){actor=part.p;if(elapsed<part.ms)break;elapsed-=part.ms;}preview.textContent='Movement preview · '+Math.round(duration/1000)+' seconds per loop, including waits. Runtime may pause for players, dialogue or schedules.';updateMap(actor,false);frame=requestAnimationFrame(animate);}
        const container = el('div', '', {className: 'npc-route'}); parent.append(el('h4','Waypoints'),container);
        function draw() {
            container.replaceChildren(); points.forEach((p, index) => {
                const row=el('details','',{className:'npc-waypoint',open:index===selected}),summary=el('summary');summary.append(el('strong','Waypoint '+(index+1)+' '),window.MapLocation.coordinate(data.mapId,p.x,p.y),el('span',p.waitSeconds+'s wait',{className:'field-hint'}));row.append(summary);row.ontoggle=()=>{if(row.open){selected=index;for(const other of container.children)if(other!==row&&other.tagName==='DETAILS')other.open=false;updateMap();}};const fields=grid(row);
                for(const key of ['x','y'])field(fields,p,key,'Tile '+key.toUpperCase(),{type:'number',required:true}).addEventListener('input',()=>updateMap()); field(fields, p, 'waitSeconds', 'Wait · seconds', {type: 'number', min: 1, step: 'any', required: true});
                field(fields, p, 'activity', 'Activity', {maxLength: 240}); field(fields, p, 'line', 'Ambient message', {dialogue: true, maxLength: 240}); field(fields, p, 'sound', 'Sound', {choices: [['','None'],['npc','NPC'],['watersplash','Water splash'],['honk','Honk']]});
                row.addEventListener('input',()=>{summary.replaceChildren(el('strong','Waypoint '+(index+1)+' '),window.MapLocation.coordinate(data.mapId,p.x,p.y),el('span',p.waitSeconds+'s wait',{className:'field-hint'}));});const actions=el('div','',{className:'npc-row-actions'});row.append(actions);
                button(actions,'Move up',()=>{if(index){[points[index-1],points[index]]=[points[index],points[index-1]];selected=index-1;changed();draw();}}).disabled=index===0;button(actions,'Move down',()=>{if(index<points.length-1){[points[index+1],points[index]]=[points[index],points[index+1]];selected=index+1;changed();draw();}}).disabled=index===points.length-1;
                button(actions, 'Remove waypoint', () => {points.splice(index,1);selected=Math.min(selected,points.length-1);changed();draw();}, {className: 'destructive'}); container.append(row);
            });
            button(container, 'Add waypoint', () => {if(points.length>=100)return;points.push({x:movementArea().x,y:movementArea().y,waitSeconds:10});selected=points.length-1;changed();draw();});updateMap();
        }
        draw();
    }
    function formatHour(hour) {
        if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return 'Invalid hour';
        const minutes = Math.floor(hour * 60 + 1e-7);
        return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
    }
    function schedule(parent) {
        const wrapper = section(parent, 'Daily schedule', 'Game-time hours: 0–24. The first phase starts at 0; later phases must be in ascending order. One game day lasts one real hour. Without a schedule, the normal route repeats.');
        check(wrapper, 'Use a daily schedule', !!draft.schedule, enabled => {if (enabled) draft.schedule = {buildings: [], phases: [{at: 0, key: 'work', activity: 'following my route', label: 'outside', location: 'outside', explanation: 'I am following my daily route.', travelling: 'walking to my next stop', route: structuredClone(draft.route)}]}; else delete draft.schedule; render();});
        if (!draft.schedule) return;
        const clock=el('input','',{type:'range',min:0,max:23.99,step:.25,value:12,ariaLabel:'Preview NPC schedule hour'}),clockText=el('p','',{role:'status'});wrapper.append(el('label','Preview game hour'),clock,clockText);
        const showPhase=()=>{const phase=[...draft.schedule.phases].reverse().find(p=>p.at<=Number(clock.value));clockText.textContent=formatHour(Number(clock.value))+' · '+(phase?.activity||'No phase')+' · '+(phase?.location||'outside');};clock.oninput=showPhase;showPhase();
        const buildings = el('div'), phases = el('div'); wrapper.append(buildings, phases);
        function drawBuildings() {
            buildings.replaceChildren(el('h4', 'Buildings & door routes'), el('p', 'Use public doors with a matching return door on this same map. The entrance lies in the outside area; the return tile lies in the building area.', {className: 'field-hint'}));
            draft.schedule.buildings.forEach((building, index) => {
                const details = el('details', '', {className: 'npc-detail'}); details.append(el('summary', building.label || 'New building')); const row = grid(details);
                field(row, building, 'key', 'Building ID', {required: true, hint: 'Use this ID in a schedule phase’s Location.'}); field(row, building, 'label', 'Building description', {required: true, maxLength: 240});
                point(details, building.entrance, 'Outside entrance'); point(details, building.exit, 'Inside return door'); area(details, building.area);
                button(details, 'Remove building', () => {draft.schedule.buildings.splice(index, 1); changed(); drawBuildings();}, {className: 'destructive'}); buildings.append(details);
            });
            button(buildings, 'Add building', () => {draft.schedule.buildings.push({key: 'building-' + (draft.schedule.buildings.length + 1), label: 'New building', entrance: {...draft.origin}, exit: {...draft.origin}, area: {...draft.area}}); changed(); drawBuildings();});
        }
        function drawPhases() {
            phases.replaceChildren(el('h4', 'Daily phases'));
            draft.schedule.phases.forEach((phase, index) => {
                const details = el('details', '', {className: 'npc-detail', open: false}); const summary = el('summary', formatHour(phase.at) + ' · ' + phase.activity); details.append(summary); const row = grid(details);
                const at = field(row, phase, 'at', 'Start hour', {type: 'number', min: 0, max: 23.99, step: 'any', required: true, hint: 'Decimals allowed: 6.5 is 06:30.'});
                field(row, phase, 'key', 'Activity type', {choices: [['work','Work'],['free-time','Free time'],['home','Home'],['sleep','Sleep']]});
                const activity = field(row, phase, 'activity', 'Activity description', {required: true, maxLength: 240});
                for (const input of [at, activity]) input.addEventListener('input', () => {summary.textContent = formatHour(phase.at) + ' · ' + phase.activity;});
                field(row, phase, 'location', 'Location ID', {required: true, hint: 'outside, or a Building ID above.'}); field(row, phase, 'label', 'Location description', {required: true, maxLength: 240}); field(row, phase, 'travelling', 'Travelling description', {required: true, maxLength: 240});
                field(details, phase, 'explanation', 'Routine dialogue', {dialogue: true, required: true, maxLength: 240}); details.append(el('h4', 'Phase route')); route(details, phase.route,()=>phase.location==='outside'?draft.area:draft.schedule.buildings.find(b=>b.key===phase.location)?.area||draft.area);
                button(details, 'Move phase up', () => {if (index) {[draft.schedule.phases[index-1], draft.schedule.phases[index]] = [draft.schedule.phases[index], draft.schedule.phases[index-1]]; changed(); drawPhases();}}).disabled = index === 0;
                button(details, 'Remove phase', () => {draft.schedule.phases.splice(index, 1); changed(); drawPhases();}, {className: 'destructive'}); phases.append(details);
            });
            button(phases, 'Add phase', () => {draft.schedule.phases.push({at: 12, key: 'free-time', activity: 'taking a break', label: 'outside', location: 'outside', explanation: 'I am taking a break.', travelling: 'walking to my break', route: structuredClone(draft.route)}); changed(); drawPhases();});
        }
        drawBuildings(); drawPhases();
    }
    function render() {
        const content = $('#npc-fields'); content.replaceChildren(); form.hidden = !draft; if (!draft) return;
        content.append(el('h3', draft.label || 'New routine'));
        const identity = section(content, 'Behaviour', 'A routine controls one placed NPC. Origin must exactly match its tile in the built map. Existing story reactions and quest references are preserved.');
        let row = grid(identity); field(row, draft, 'key', 'Routine ID', {disabled: !!originalKey, required: true}); field(row, draft, 'label', 'Name', {required: true, maxLength: 100});
        if (originalKey) field(row, draft, 'kind', 'NPC type', {disabled: true});
        else {const available = data.placements.filter(p => !data.config.npcs.some(n => n.kind === p.kind && n.origin.x === p.x && n.origin.y === p.y)); const choice = {placement: available.findIndex(p => p.kind === draft.kind && p.x === draft.origin.x && p.y === draft.origin.y)}; const select = field(row, choice, 'placement', 'NPC placement', {choices: available.map((p, i) => [String(i), p.kind + ' · ' + p.x + ', ' + p.y])}); window.MapLocation.mark(select, () => ({mapId: data.mapId, ...draft.origin})); window.ToolboxEntityPicker.attach(select,{type:'npc',label:'NPC placement',entries:available.map((p,i)=>({id:String(i),entityId:p.kind,name:p.kind+' · '+p.x+', '+p.y}))}); select.onchange = () => {const p = available[Number(select.value)]; draft.kind = p.kind; draft.origin = {x: p.x, y: p.y}; draft.area = {...draft.origin, width: 1, height: 1}; draft.route = [{...draft.origin, waitSeconds: 10}]; delete draft.schedule; changed(); render();};}
        field(row, draft, 'preset', 'Behaviour preset', {choices: [['patrol','Patrol'],['work','Work'],['socialise','Socialise']]}); field(row, draft, 'stepMs', 'Step duration · ms', {type: 'number', min: 300, max: 2000, required: true, hint: 'Lower values make walking faster.'});
        check(identity, 'Preserve the original click-through dialogue', draft.preserveDialogue === true, value => {draft.preserveDialogue = value;});
        point(identity, draft.origin, 'Spawn tile'); area(identity, draft.area);
        route(collapsible(content, 'Normal route · ' + draft.route.length + ' waypoints', 'Waypoints repeat in this order. Keep tiles walkable, inside the outside area and away from doors. Used when no daily schedule or during scene overrides.'), draft.route);
        const lines = collapsible(content, 'Ambient dialogue', 'One short message per line. Use the shared editor to style words. These messages accompany behaviour; quest dialogue stays in the Quest builder.'); draft.lines ||= {};
        for (const [key, label] of [['greeting','First greeting'],['return','Returning player'],['talk','Conversation'],['kill','Nearby combat'],['quest','Quest completed']]) {
            const proxy = {text: (draft.lines[key] || []).join('\n')}; const input = field(lines, proxy, 'text', label, {dialogue: true}); input.addEventListener('input', () => {draft.lines[key] = input.value.split('\n').filter(line => line.trim());});
        }
        schedule(content);
        $('#npc-reset').hidden = !data.customized.includes(originalKey); $('#npc-reset').textContent = data.bundled.includes(originalKey) ? 'Reset to bundled routine' : 'Remove saved routine';
        $('#npc-source').textContent = 'Source: ' + data.source + (data.config.enabled ? '' : ' · Map behaviours are disabled in the bundled configuration.');
    }
    function list() {
        const query = $('#npc-search').value.toLowerCase(), rows = data.config.npcs.filter(npc => [npc.key, npc.kind, npc.label].join(' ').toLowerCase().includes(query));
        $('#npc-count').textContent = rows.length + ' of ' + data.config.npcs.length + ' routines'; $('#npc-list').replaceChildren();
        for (const npc of rows) {const node = button($('#npc-list'), npc.label + ' · ' + npc.kind + ' (' + npc.origin.x + ', ' + npc.origin.y + ')', () => guard(() => select(npc.key))); window.MapLocation.mark(node, {mapId: data.mapId, ...npc.origin}); node.setAttribute('aria-pressed', String(originalKey === npc.key));}
        if (!rows.length) $('#npc-list').append(el('p', data.config.npcs.length ? 'No matching routines.' : 'No routines yet. Create one for a placed NPC.', {className: 'field-hint'}));
    }
    function select(key) {draft = structuredClone(data.config.npcs.find(npc => npc.key === key)); originalKey = draft?.key; changed(false); render(); list(); status(draft ? 'Loaded ' + draft.label + '.' : 'No routine selected.');}
    async function load(mapId, preferred) {
        const token = ++sequence; busy = true; form.inert = true; $('#npc-new').disabled = true; $('#npc-save-top').disabled = true; status('Loading map routines…');
        try {const next = await request('./api/npcs?mapId=' + encodeURIComponent(mapId)); if (token !== sequence) return; data = next; $('#npc-map').value = mapId; const found = data.config.npcs.some(npc => npc.key === preferred); select(preferred ? (found ? preferred : undefined) : data.config.npcs[0]?.key); if (preferred && !found) status('This routine no longer exists on ' + mapId + '. Refresh the inspector.', true); else status('Loaded ' + mapId + ' · ' + data.placements.length + ' NPC placements.');}
        catch (error) {if (token === sequence) {status(error.message, true); $('#npc-map').value = data?.mapId || mapId;}}
        finally {if (token === sequence) {busy = false; form.inert = false; $('#npc-new').disabled = !data?.placements.length; changed(dirty);}}
    }
    async function save(resetKey) {
        if (!data || busy || !draft || (!resetKey && !form.reportValidity())) return; busy = true; form.inert = true; changed(dirty); status('Saving NPC routine…');
        try {data = await request('./api/npcs', {mapId: data.mapId, revision: data.revision, ...(resetKey ? {resetKey} : {npc: draft, originalKey})}); select(resetKey ? data.config.npcs[0]?.key : draft.key); status('Saved. Build ' + data.mapId + ' to restart the game and load these NPC files.');}
        catch (error) {status(error.message, true);} finally {busy = false; form.inert = false; changed(dirty);}
    }
    function newRoutine(placement) {
        originalKey = undefined; draft = {key: '', label: placement.kind, kind: placement.kind, preset: 'patrol', preserveDialogue: true, origin: {x: placement.x, y: placement.y}, area: {x: placement.x, y: placement.y, width: 1, height: 1}, stepMs: 600, route: [{x: placement.x, y: placement.y, waitSeconds: 10}], lines: {}}; changed(); render(); list(); status('New routine. Choose an ID and movement area.');
    }
    $('#npc-new').onclick = () => guard(() => {
        const placement = data.placements.find(p => !data.config.npcs.some(n => n.kind === p.kind && n.origin.x === p.x && n.origin.y === p.y));
        if (!placement) {status('Every placed NPC already has a routine. Place another NPC in Tiled and build this map first.', true); return;}
        newRoutine(placement);
    });
    form.addEventListener('invalid', event => {for (let node = event.target.closest('details'); node; node = node.parentElement.closest('details')) node.open = true;}, true);
    form.onsubmit = event => {event.preventDefault(); save();}; $('#npc-save-top').onclick = () => save();
    $('#npc-reset').onclick = () => guard(() => save(originalKey));
    $('#npc-map').onchange = () => {const map = $('#npc-map').value; $('#npc-map').value = data?.mapId || map; guard(() => load(map));};
    $('#npc-reload').onclick = () => guard(() => load($('#npc-map').value, originalKey)); $('#npc-search').oninput = () => {if (data) list();};
    let routePromise;
    function routeScreen() {if(routePromise)return routePromise;routePromise=routeScreenData().finally(()=>{routePromise=undefined;});return routePromise;}
    async function routeScreenData() {
        const active = location.hash.startsWith('#npcs/behaviour'); document.getElementById('npc-assets').hidden = active; pane.hidden = !active;
        for (const link of document.querySelectorAll('.npc-subnav a')) {if (link.hash === (active ? '#npcs/behaviour' : '#npcs')) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');}
        if (!active || loaded) return; loaded = true;
        try {const result = await request('./api/npcs'); $('#npc-map').replaceChildren(...result.maps.map(map => el('option', map, {value: map}))); await load(window.ToolboxNavigation?.params().get('map')||window.ToolboxMapData?.preferred(result.maps[0])||result.maps[0],window.ToolboxNavigation?.params().get('routine'));}
        catch (error) {status(error.message, true); loaded = false;}
    }
    window.ToolboxNavigation?.route('npcs',async params=>{if(!location.hash.startsWith('#npcs/behaviour')||!params.has('map'))return;await routeScreen();guard(async()=>{if(data?.mapId!==params.get('map')||params.has('routine'))await load(params.get('map'),params.get('routine'));if(params.has('kind')&&data?.mapId===params.get('map')){const p=data.placements.find(p=>p.kind===params.get('kind')&&p.x===Number(params.get('x'))&&p.y===Number(params.get('y')));if(p){const routine=data.config.npcs.find(n=>n.kind===p.kind&&n.origin.x===p.x&&n.origin.y===p.y);if(routine)select(routine.key);else newRoutine(p);}else status('This NPC placement is no longer in the built map. Refresh the inspector.',true);}});});
    window.addEventListener('hashchange', routeScreen); routeScreen();
    window.addEventListener('beforeunload', event => {if (dirty) {event.preventDefault(); event.returnValue = '';}});
})();
