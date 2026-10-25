(() => {
    'use strict';
    const el=(tag,text='',attrs={})=>Object.assign(document.createElement(tag),{textContent:text,...attrs});
    const href=(screen,values={})=>'#'+screen+'/?'+new URLSearchParams(values);
    async function request(url){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Map analysis could not load. Refresh to retry.');return data;}
    function make(tool){
        const pane=document.getElementById(tool+'-pane'),inspector=tool==='inspector';if(!pane)return;
        pane.innerHTML=`<header class="pane-heading"><h2>${inspector?'Interactive map inspector':'Map validator'}</h2><p>${inspector?'Place items, mobs and NPCs. Select an entity to inspect it or open its editor.':'Find map problems before playtesting, then open the object or editor that can fix them.'} <a href="#documentation/mapmaker-${tool}">Read the guide</a></p></header>
        <div class="analysis-toolbar"><div class="field"><label for="${tool}-map">Map</label><select id="${tool}-map"></select></div><button type="button" class="analysis-refresh">${inspector?'Refresh map':'Run validation'}</button><a class="analysis-other" href="#${inspector?'validator':'inspector'}">${inspector?'Validate this map':'Inspect this map'}</a></div>
        <p class="analysis-status" role="status" aria-live="polite">Choose a map.</p><p class="analysis-source field-hint"></p><div class="analysis-body"></div>`;
        const $=selector=>pane.querySelector(selector);let bootPromise,data,sequence=0,loaded=false;
        function status(message,error=false){$('.analysis-status').textContent=message;$('.analysis-status').classList.toggle('error',error);}
        function boot(){if(bootPromise)return bootPromise;bootPromise=bootData().finally(()=>{bootPromise=undefined;});return bootPromise;}
        async function bootData(){if(loaded)return;loaded=true;try{const list=await request('./api/map-inspector');$('#'+tool+'-map').replaceChildren(...list.maps.map(id=>el('option',id,{value:id})));await load(window.ToolboxNavigation.params().get('map')||list.maps[0]);}catch(error){loaded=false;status(error.message,true);}}
        async function load(mapId,objectId){const seq=++sequence;$('.analysis-refresh').disabled=true;status(inspector?'Reading map and object definitions…':'Checking map geometry and references…');$('.analysis-body').setAttribute('aria-busy','true');
            try{const result=await request('./api/'+(inspector?'map-inspector':'map-validation')+'?mapId='+encodeURIComponent(mapId));if(seq!==sequence)return;data=result;$('#'+tool+'-map').value=mapId;$('.analysis-other').href=href(inspector?'validator':'inspector',{map:mapId});$('.analysis-source').textContent='Built geometry: '+result.sources.server+' · Tiled source: '+result.sources.tiled+(result.sources.stale?' · Build is older than Tiled source':'');status(result.summary.errors+' errors · '+result.summary.warnings+' warnings · '+result.summary.objects+' objects. Checked '+new Date(result.checkedAt).toLocaleTimeString()+'.');if(inspector){renderInspector();const target=objectId||window.ToolboxNavigation.params().get('object');if(target)selectObject(target,true);}else renderValidator();}
            catch(error){if(seq===sequence){data=null;$('.analysis-body').replaceChildren();status(error.message,true);}}
            finally{if(seq===sequence){$('.analysis-refresh').disabled=false;$('.analysis-body').setAttribute('aria-busy','false');}}
        }
        function action(parent,text,url){if(!url)return;parent.append(el('a',text,{href:url,className:'analysis-link'}));}
        function renderValidator(){const body=$('.analysis-body');body.replaceChildren();
            const filter=el('div','',{className:'analysis-filters'}),search=el('input','',{type:'search',placeholder:'Search problem, object or check',ariaLabel:'Search validation findings'}),severity=el('select','',{ariaLabel:'Finding severity'});for(const [value,label]of [['','Errors and warnings'],['error','Errors only'],['warning','Warnings only']])severity.append(el('option',label,{value}));filter.append(search,severity);body.append(filter);
            const summary=el('p','',{role:'status'}),list=el('div','',{className:'analysis-findings'});body.append(summary,list);
            function show(){const rows=data.findings.filter(f=>(!severity.value||severity.value===f.severity)&&[f.message,f.code,f.details].join(' ').toLowerCase().includes(search.value.toLowerCase()));summary.textContent=rows.length+' matching findings';list.replaceChildren();for(const f of rows){const article=el('article','',{className:'analysis-finding'});article.append(el('p',(f.severity==='error'?'Error':'Warning')+' · '+f.code,{className:'analysis-severity '+f.severity}),el('h3',f.message));const destination=/^Destination ([A-Za-z0-9_-]+) at (-?\d+), (-?\d+)/.exec(f.message);if(destination)window.MapLocation.mark(article.querySelector('h3'),{mapId:destination[1],x:Number(destination[2]),y:Number(destination[3])});if(f.x!==undefined){const place=el('p','',{className:'field-hint'});place.append('Tile ',window.MapLocation.coordinate(data.mapId,f.x,f.y));article.append(place);}const actions=el('div','',{className:'analysis-actions'});action(actions,'Open editor',f.editor);action(actions,f.objectId?'Show object on map':'Open map inspector',href('inspector',{map:data.mapId,...(f.objectId?{object:f.objectId}:{})}));article.append(actions);list.append(article);}if(!rows.length)list.append(el('p',data.findings.length?'No findings match these filters.':'No problems found by these checks. Playtest the map to verify runtime behaviour.'));}
            search.oninput=show;severity.onchange=show;show();const details=el('details','',{className:'analysis-coverage'});details.append(el('summary','Checks and limits'));const checks=el('ul');for(const check of data.checks)checks.append(el('li',check));details.append(checks,el('p',data.limitations));body.append(details);
        }
        let inspectorView;
        function renderInspector(){
            const previous=inspectorView?.snapshot();
            inspectorView?.destroy();
            const mapId=data.mapId;
            inspectorView=window.MapInspector.mount($('.analysis-body'),data,{
                state:previous?.mapId===data.mapId?previous:null,
                refresh:()=>{if(data?.mapId===mapId)return load(mapId);}
            });
        }
        function selectObject(id,focus){inspectorView?.select(id,focus);}
        $('#'+tool+'-map').onchange=()=>load($('#'+tool+'-map').value);$('.analysis-refresh').onclick=()=>load($('#'+tool+'-map').value);
        document.addEventListener('toolbox:pane',event=>{if(event.detail===tool)boot();});
        window.ToolboxNavigation.route(tool,async params=>{
            if(!params.has('map')&&!(inspector&&params.has('place')))return;
            await boot();
            const mapId=params.get('map')||data?.mapId;
            if(mapId&&data?.mapId!==mapId)await load(mapId,params.get('object'));
            if(!inspector||!data)return;
            if(params.has('object'))selectObject(params.get('object'),true);
            else if(params.has('place'))inspectorView?.place(params.get('place'));
        });
        if(window.ToolboxNavigation.screen()===tool)boot();
    }
    make('validator');make('inspector');
})();
