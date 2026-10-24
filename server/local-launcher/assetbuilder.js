(() => {
    'use strict';
    const editors = [];
    const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    async function request(url, body) {
        const response = await fetch(url, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {});
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'The asset request failed. Try again.'); return data;
    }
    function editor(pane, group) {
        const prefix = group, mob = group === 'mobs';
        pane.innerHTML = `<header class="pane-heading"><h2>${mob ? 'Mob & NPC editor' : 'Item editor'}</h2><p>${mob ? 'Create characters, prepare spritesheets and tune their gameplay.' : 'Create collectible items and prepare their spritesheets.'} <a href="#documentation/mapmaker-${group}">Read the guide</a></p></header>
        <div class="asset-library"><div class="field"><label for="${prefix}-library">${mob ? 'Mob or NPC' : 'Item'}</label><select id="${prefix}-library"><option value="">Loading assets…</option></select></div><button type="button" data-action="reload">Reload list</button><button type="button" data-action="copy" disabled>${mob ? 'New mob / NPC' : 'New item'}</button></div>
        <p class="field-hint">Choose an existing asset to edit. The New button uses the selected asset as a template; enter a new ID to register a separate type.</p>
        <p class="asset-feedback" role="status" aria-live="polite">Loading assets…</p>
        <div class="asset-discard" hidden><p>You have unsaved changes. Discard them to load another asset?</p><button type="button" data-action="discard">Discard changes</button><button type="button" data-action="keep">Keep editing</button></div>
        <form class="asset-form" hidden><div class="asset-workspace"><div class="asset-controls">
        <section class="asset-section"><h3>Identity</h3><div class="asset-field-grid">
        <div class="field"><label for="${prefix}-id">ID</label><input id="${prefix}-id" name="id" required maxlength="100"><span class="field-hint">Used in Tiled and quest definitions. Saved IDs stay fixed.</span></div>
        <div class="field"><label for="${prefix}-name">Display name</label><input id="${prefix}-name" name="name" required maxlength="100"></div>
        <div class="field"><label for="${prefix}-type">Type</label><select id="${prefix}-type" name="type">${mob ? '<option value="mob">Mob · combat character</option><option value="npc">NPC · dialogue character</option>' : '<option value="item">Item · inventory collectible</option>'}</select></div></div>
        <p class="asset-origin field-hint"></p></section>
        <section class="asset-section"><h3>Spritesheet</h3><p class="field-hint">PNG with transparent background. Frames run from left to right; animation rows start at 0. A left-facing character mirrors the right-facing frames.</p>
        <div class="asset-field-grid"><div class="field"><label for="${prefix}-file">Upload spritesheet</label><input id="${prefix}-file" type="file" accept="image/png"><span class="field-hint">Up to 4 MB. The editor prepares crisp 1×, 2× and 3× sheets.</span></div>
        <div class="field"><label for="${prefix}-scale">Uploaded sheet scale</label><select id="${prefix}-scale" name="sourceScale"><option value="1">1× · original pixels</option><option value="2">2× · double pixels</option><option value="3">3× · triple pixels</option></select><span class="field-hint">Frame sizes below always use 1× pixels.</span></div>
        <div class="field"><label for="${prefix}-width">Frame width</label><input id="${prefix}-width" name="width" type="number" min="1" max="256" required></div>
        <div class="field"><label for="${prefix}-height">Frame height</label><input id="${prefix}-height" name="height" type="number" min="1" max="256" required></div>
        <div class="field"><label for="${prefix}-offset-x">Horizontal offset</label><input id="${prefix}-offset-x" name="offset_x" type="number" min="-512" max="512" required></div>
        <div class="field"><label for="${prefix}-offset-y">Vertical offset</label><input id="${prefix}-offset-y" name="offset_y" type="number" min="-512" max="512" required></div></div>
        <p class="field-hint">Offsets position the frame relative to the 16 × 16 game tile. The preview shows the tile origin and footprint.</p></section>
        <section class="asset-section"><div class="asset-section-heading"><h3>Animations</h3><button type="button" data-action="add-animation">Add animation</button></div>
        <p class="field-hint">Choose an animation to preview it. Duration is milliseconds per frame; leave it blank to use the gameplay default. Existing per-frame timing is preserved.</p>
        <div class="animation-rows"></div></section>
        <section class="asset-section"><h3>Gameplay</h3><div class="asset-mob-fields asset-field-grid"></div>
        <div class="asset-item-fields asset-field-grid"></div>
        <div class="asset-npc-fields field"><label for="${prefix}-dialogue">Dialogue · one message per line</label><textarea id="${prefix}-dialogue" name="dialogue" rows="5"></textarea><span class="field-hint">Plain-text greetings. Add quest objectives and styled quest dialogue in the <a href="#quests">Quest builder</a>.</span></div>
        <p class="asset-gameplay-hint field-hint"></p></section>
        <div class="asset-save"><button type="submit" class="primary">Save & register</button><span class="asset-dirty" role="status"></span></div><p class="asset-save-result field-hint"></p>
        <p class="field-hint">Writes sprite files, all prepared image scales and the shared gameplay definition. Then <a href="#build">build your map</a> to load the changes in the game.</p>
        </div><aside class="asset-preview"><h3>Live preview</h3><div class="asset-field-grid"><div class="field"><label for="${prefix}-animation">Animation</label><select id="${prefix}-animation" class="animation-select"></select></div><div class="field"><label for="${prefix}-zoom">Preview zoom</label><select id="${prefix}-zoom" class="preview-zoom"><option value="2">2×</option><option value="4" selected>4×</option><option value="6">6×</option></select></div></div>
        <canvas class="frame-preview" width="384" height="320" role="img" aria-label="Animated sprite preview"></canvas>
        <div class="asset-preview-actions"><button type="button" data-action="pause">Pause</button><button type="button" data-action="step">Next frame</button><label class="asset-check"><input type="checkbox" class="preview-grid" checked>Tile guide</label></div>
        <p class="frame-caption field-hint"></p><p class="sheet-caption field-hint"></p><h4>Sheet & frame grid</h4><div class="sheet-scroll"><canvas class="sheet-preview" role="img" aria-label="Spritesheet with frame grid"></canvas></div>
        <p class="asset-placement field-hint"></p></aside></div></form>`;
        const $ = selector => pane.querySelector(selector), form=$('form'), fields=form.elements;
        const state={catalog:null,asset:null,image:null,uploaded:false,dirty:false,frame:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,sequence:0};
        function status(message,error=false) {const node=$('.asset-feedback');node.textContent=message;node.classList.toggle('error',error);const result=$('.asset-save-result');if(result){result.textContent=message;result.classList.toggle('error',error);}}
        function dirty(value=true) {state.dirty=value; $('.asset-dirty').textContent=value?'Unsaved changes':'';}
        let pendingAction;
        function withDiscard(action){if(!state.dirty){action();return;}pendingAction=action;$('.asset-discard').hidden=false;$('[data-action="keep"]').focus();}
        $('[data-action="discard"]').onclick=()=>{const action=pendingAction;pendingAction=undefined;$('.asset-discard').hidden=true;dirty(false);action?.();};
        $('[data-action="keep"]').onclick=()=>{pendingAction=undefined;$('.asset-discard').hidden=true;fields.name.focus();};
        function numberField(parent,key,label,value,min,max,step='1') {
            const wrap=el('div','',{className:'field'}), id=prefix+'-'+key;
            wrap.append(el('label',label,{htmlFor:id}),el('input','',{id,name:key,type:'number',value:String(value),min:String(min),max:String(max),step,required:true}));parent.append(wrap);
        }
        for(const [key,label,value,min,max,step] of [['level','Level',1,1,1000],['hpMod','Health multiplier',1,0.01,100,'0.01'],['armorMod','Armor multiplier',1,0.01,100,'0.01'],['weaponMod','Damage multiplier',1,0.01,100,'0.01'],['respawnDelay','Respawn delay · ms',10000,1000,86400000],['moveSpeed','Movement duration · ms',350,50,2000],['idleSpeed','Idle frame duration · ms',700,16,10000],['atkSpeed','Attack frame duration · ms',100,16,10000],['aggroRange','Aggro range · tiles',1,0,20]]) numberField($('.asset-mob-fields'),key,label,value,min,max,step);
        const drops=el('div','',{className:'asset-wide-field drop-editor'});$('.asset-mob-fields').append(drops);
        const dropEditor=new window.DropEditor(drops,()=>dirty());
        const aggressive=el('label','',{className:'asset-check'}); aggressive.append(el('input','',{type:'checkbox',name:'isAggressive'}),document.createTextNode('Aggressive · approaches nearby players'));$('.asset-mob-fields').append(aggressive);
        numberField($('.asset-item-fields'),'collectAmount','Amount per pickup',1,1,9999);
        const description=el('div','',{className:'field'});description.append(el('label','Inventory description',{htmlFor:prefix+'-description'}),el('textarea','',{id:prefix+'-description',name:'inventoryDescription',maxLength:500}));$('.asset-item-fields').append(description);
        const transfer=el('label','',{className:'asset-check'});transfer.append(el('input','',{type:'checkbox',name:'transferable'}),document.createTextNode('Allow transfers between players'));$('.asset-item-fields').append(transfer);
        function toggleType(){for(const type of ['mob','npc','item']) {const node=$('.asset-'+type+'-fields');node.hidden=fields.type.value!==type;for(const input of node.querySelectorAll('input,textarea,button')) input.disabled=node.hidden;}
            $('.asset-gameplay-hint').textContent=fields.type.value==='item'?'New items are inventory collectibles. Existing equipment and consumable effects keep their current scripted behavior.':fields.type.value==='mob'?'Combat uses the normal game formulas. Smaller movement and animation durations are faster. Drop chances below use registered item IDs.':'';}
        function animations(){const result={};for(const row of $('.animation-rows').children){const inputs=row.querySelectorAll('input');const name=inputs[0].value.trim();if(!name||Object.hasOwn(result,name)) throw new Error('Give every animation a unique name.');const old=state.asset.sprite.animations[name];result[name]={row:Number(inputs[1].value),length:Number(inputs[2].value)};if(inputs[3].value) result[name].speed=Number(inputs[3].value);else if(Array.isArray(old?.speed))result[name].speed=old.speed;}return result;}
        function sprite(){return {...state.asset.sprite,id:(fields.type.value==='item'?'item-':'')+fields.id.value,width:Number(fields.width.value),height:Number(fields.height.value),offset_x:Number(fields.offset_x.value),offset_y:Number(fields.offset_y.value),animations:animations()};}
        function addAnimation(name='',value={row:0,length:1}){
            const row=el('div','',{className:'animation-row'}),suffix=crypto.randomUUID();
            for(const [key,label,type,current] of [['name','Name','text',name],['row','Row','number',value.row],['length','Frames','number',value.length],['speed','Duration · ms','number',Array.isArray(value.speed)?'':value.speed??'']]){
                const wrap=el('div','',{className:'field'}),id=prefix+'-'+suffix+'-'+key,input=el('input','',{id,type,value:String(current),required:key!=='speed'});if(type==='number'){input.min=key==='row'?'0':key==='speed'?'16':'1';input.max=key==='speed'?'10000':'256';}else input.pattern='[a-z][a-z0-9_]{0,47}';wrap.append(el('label',label,{htmlFor:id}),input);row.append(wrap);
            }
            const remove=el('button','Remove',{type:'button',ariaLabel:'Remove '+(name||'animation')});remove.onclick=()=>{row.remove();dirty();refresh();};row.append(remove);$('.animation-rows').append(row);
        }
        function refresh(){try{const data=animations(),selected=$('.animation-select').value;$('.animation-select').replaceChildren(...Object.keys(data).map(name=>el('option',name,{value:name})));$('.animation-select').value=data[selected]?selected:data.idle_down?'idle_down':data.idle?'idle':Object.keys(data)[0]||'';drawSheet();drawFrame();}catch(error){status(error.message,true);}}
        async function loadImage(source){const image=new Image();image.src=source;await image.decode();return image;}
        async function select(id){if(!id)return;const token=++state.sequence;status('Loading '+id+'…');form.inert=true;try{
            const asset=await request('./api/assets/'+encodeURIComponent(id));const image=asset.image?await loadImage(asset.image):null;if(token!==state.sequence)return;
            $('#'+prefix+'-library').value=id;state.asset=asset;state.image=image;state.uploaded=false;state.originalId=id;fields.id.value=id;fields.id.readOnly=true;fields.name.value=asset.name;fields.type.value=asset.type;fields.type.disabled=true;
            fields.width.value=asset.sprite.width;fields.height.value=asset.sprite.height;fields.offset_x.value=asset.sprite.offset_x??-16;fields.offset_y.value=asset.sprite.offset_y??-16;fields.sourceScale.value='1';$('#'+prefix+'-file').value='';
            for(const key of ['level','hpMod','armorMod','weaponMod','respawnDelay','collectAmount','inventoryDescription','transferable','moveSpeed','idleSpeed','atkSpeed','aggroRange','isAggressive']){
                const value=asset.gameplay[key]??asset.client[key]??({level:1,hpMod:1,armorMod:1,weaponMod:1,respawnDelay:10000,collectAmount:1,inventoryDescription:'',transferable:true,isAggressive:true,moveSpeed:350,idleSpeed:700,atkSpeed:100,aggroRange:1}[key]);
                if(fields[key].type==='checkbox')fields[key].checked=value;else fields[key].value=value;
            }
            dropEditor.setItems(state.catalog.entries.filter(entry=>entry.type==='item'));dropEditor.setValue(asset.gameplay.drops||{});fields.dialogue.value=asset.dialogue.join('\n');$('.animation-rows').replaceChildren();for(const [name,value]of Object.entries(asset.sprite.animations))addAnimation(name,value);
            $('.asset-origin').textContent=asset.builtin?'Built-in type · saves an override without replacing its scripted behavior.':'Toolbox type · numeric kind '+asset.kind;
            $('.asset-placement').textContent='Tiled: add a point in an object layer named mapmaker-entities and name the point '+asset.id+'. Build that map to spawn it.';
            toggleType();form.hidden=false;state.frame=0;dirty(false);refresh();$('[data-action="copy"]').disabled=false;status('Loaded '+asset.id+'.');
        }catch(error){if(token===state.sequence)status(error.message,true);}finally{if(token===state.sequence)form.inert=false;}}
        async function loadCatalog(preferred){const token=++state.sequence;status('Loading assets…');try{const data=await request('./api/assets');if(token!==state.sequence)return;state.catalog=data;const entries=data.entries.filter(entry=>mob?entry.type!=='item':entry.type==='item');const selectNode=$('#'+prefix+'-library');selectNode.replaceChildren(...entries.map(entry=>el('option',entry.id+(entry.type==='npc'?' · NPC':'')+(entry.builtin?'':' · custom'),{value:entry.id})));selectNode.value=entries.some(e=>e.id===preferred)?preferred:entries.some(e=>e.id===(mob?'rat':'wood'))?(mob?'rat':'wood'):entries[0]?.id||'';await select(selectNode.value);}catch(error){status(error.message,true);}}
        function drawSheet(){if(!state.image)return;let data;try{data=sprite();}catch(_){return;}const canvas=$('.sheet-preview'),ctx=canvas.getContext('2d');canvas.width=state.image.width;canvas.height=state.image.height;ctx.drawImage(state.image,0,0);const scale=Number(fields.sourceScale.value),w=data.width*scale,h=data.height*scale;if(w<1||h<1)return;ctx.strokeStyle='#2563eb99';ctx.lineWidth=1;for(let x=0;x<canvas.width;x+=w){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,canvas.height);ctx.stroke();}for(let y=0;y<canvas.height;y+=h){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(canvas.width,y+.5);ctx.stroke();}
            $('.sheet-caption').textContent=state.image.width+' × '+state.image.height+' source pixels · '+scale+'× sheet';}
        function drawFrame(){if(!state.image||!state.asset)return;let data;try{data=sprite();}catch(_){return;}const animation=data.animations[$('.animation-select').value];if(!animation)return;state.frame%=Math.max(1,animation.length);const canvas=$('.frame-preview'),ctx=canvas.getContext('2d'),zoom=Number($('.preview-zoom').value),scale=Number(fields.sourceScale.value);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;const originX=canvas.width/2-8*zoom,originY=canvas.height/2;
            if($('.preview-grid').checked){ctx.fillStyle='#e7eef9';ctx.fillRect(originX,originY,16*zoom,16*zoom);ctx.strokeStyle='#8491a2';ctx.strokeRect(originX+.5,originY+.5,16*zoom,16*zoom);ctx.beginPath();ctx.moveTo(originX-8,originY);ctx.lineTo(originX+8,originY);ctx.moveTo(originX,originY-8);ctx.lineTo(originX,originY+8);ctx.stroke();}
            const valid=data.width>0&&data.height>0&&(animation.row+1)*data.height*scale<=state.image.height&&animation.length*data.width*scale<=state.image.width;
            if(valid)ctx.drawImage(state.image,state.frame*data.width*scale,animation.row*data.height*scale,data.width*scale,data.height*scale,originX+data.offset_x*zoom,originY+data.offset_y*zoom,data.width*zoom,data.height*zoom);
            $('.frame-caption').textContent=valid?'Frame '+(state.frame+1)+' of '+animation.length+' · row '+animation.row:'Frames extend outside the sheet. Check the scale, frame size, row and frame count.';
            $('.frame-caption').classList.toggle('error',!valid);
        }
        function prepareImages(data){if(!state.image)throw new Error('Upload a PNG spritesheet first.');const sourceScale=Number(fields.sourceScale.value),width=state.image.width/sourceScale,height=state.image.height/sourceScale;if(!Number.isInteger(width)||!Number.isInteger(height)||width%data.width||height%data.height)throw new Error('The sheet must contain whole frames. Check the uploaded scale and frame size.');if(width*3>4096||height*3>4096||width*height*9>8388608)throw new Error('This sheet is too large to prepare at 3×. Keep the prepared sheet within 4096 pixels per side and 8 million pixels.');
            const output={};for(const scale of [1,2,3]){const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(state.image,0,0,canvas.width,canvas.height);output[scale]=canvas.toDataURL('image/png');}return output;}
        form.addEventListener('submit',async event=>{event.preventDefault();if(!state.asset)return;const button=$('[type="submit"]');button.disabled=true;button.textContent='Saving…';form.inert=true;status('Preparing and saving asset…');try{
            const data=sprite(),payload={id:fields.id.value,name:fields.name.value,type:fields.type.value,originalId:state.originalId,revision:state.originalId?state.asset.revision:state.catalog.revision,sprite:data,gameplay:{},client:{},dialogue:fields.dialogue.value.split('\n').filter(line=>line.trim())};
            for(const key of ['level','hpMod','armorMod','weaponMod','respawnDelay','collectAmount'])payload.gameplay[key]=Number(fields[key].value);
            if(payload.type==='mob')payload.gameplay.drops=dropEditor.value();
            payload.gameplay.inventoryDescription=fields.inventoryDescription.value;payload.gameplay.transferable=fields.transferable.checked;
            for(const key of ['moveSpeed','idleSpeed','atkSpeed','aggroRange'])payload.client[key]=Number(fields[key].value);payload.client.isAggressive=fields.isAggressive.checked;
            if(state.uploaded||!state.originalId)payload.images=prepareImages(data);
            const saved=await request('./api/assets',payload);dirty(false);await loadCatalog(saved.id);status('Saved '+saved.id+' · kind '+saved.kind+'. Build your map to load it in the game.');document.dispatchEvent(new CustomEvent('toolbox:assets-saved'));
        }catch(error){status(error.message,true);}finally{form.inert=false;button.disabled=false;button.textContent='Save & register';}});
        form.addEventListener('input',event=>{if(event.target.type==='file'||event.target.closest('.asset-preview'))return;dirty();state.frame=0;refresh();});
        fields.type.onchange=()=>{toggleType();dirty();};
        $('.animation-select').onchange=()=>{state.frame=0;drawFrame();};$('.preview-zoom').onchange=drawFrame;$('.preview-grid').onchange=drawFrame;
        $('#'+prefix+'-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;const token=++state.sequence;try{if(file.type!=='image/png'||file.size>4*1024*1024)throw new Error('Choose a PNG file smaller than 4 MB.');const url=URL.createObjectURL(file);let image;try{image=await loadImage(url);}finally{URL.revokeObjectURL(url);}if(token!==state.sequence)return;if(image.width>4096||image.height>4096||image.width*image.height>8388608)throw new Error('Choose a PNG within 4096 pixels per side and 8 million pixels.');state.image=image;state.uploaded=true;dirty();refresh();status('Uploaded '+file.name+'. Check frame dimensions and animation rows before saving.');}catch(error){status(error.message,true);}};
        fields.sourceScale.onchange=()=>{if(state.originalId&&!state.uploaded){fields.sourceScale.value='1';status('Upload a sheet before changing its source scale.',true);return;}dirty();refresh();};
        $('#'+prefix+'-library').onchange=event=>{const id=event.target.value;event.target.value=state.originalId||state.templateId;withDiscard(()=>select(id));};
        $('[data-action="reload"]').onclick=()=>withDiscard(()=>loadCatalog(state.originalId));
        $('[data-action="copy"]').onclick=()=>{if(!state.asset)return;$('.asset-discard').hidden=true;pendingAction=undefined;state.templateId=state.originalId;state.originalId=null;fields.id.readOnly=false;fields.id.value='';fields.name.value=fields.name.value+' copy';fields.type.disabled=!mob;$('.asset-origin').textContent='New type · a numeric kind will be assigned when you save.';$('.asset-placement').textContent='After saving, use the new ID as the name of a point in the Tiled object layer mapmaker-entities.';dirty();fields.id.focus();status('Creating a copy. Choose a unique ID and display name.');};
        $('[data-action="add-animation"]').onclick=()=>{addAnimation();dirty();};
        function setPlaying(value){state.playing=value;$('[data-action="pause"]').textContent=value?'Pause':'Play';}
        $('[data-action="pause"]').onclick=()=>setPlaying(!state.playing);$('[data-action="step"]').onclick=()=>{setPlaying(false);state.frame++;drawFrame();};setPlaying(state.playing);
        let last=0;function tick(time){if(!pane.hidden&&state.playing&&state.image){let animation;try{animation=animations()[$('.animation-select').value];}catch(_){}const duration=Array.isArray(animation?.speed)?animation.speed[state.frame%animation.speed.length]:animation?.speed??Number(fields.idleSpeed.value||150);if(time-last>duration){state.frame++;drawFrame();last=time;}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
        document.addEventListener('toolbox:assets-saved',async()=>{if(!state.catalog)return;try{state.catalog=await request('./api/assets');dropEditor.setItems(state.catalog.entries.filter(entry=>entry.type==='item'));}catch(_){/* Reload list remains available when the refresh cannot reach the server. */}});
        let loaded=false;document.addEventListener('toolbox:pane',event=>{if(event.detail===group&&!loaded){loaded=true;loadCatalog();}});if(location.hash==='#'+group){loaded=true;loadCatalog();}
        return {isDirty:()=>state.dirty};
    }
    for(const group of ['mobs','items']) {const pane=document.getElementById(group+'-pane');if(pane)editors.push(editor(pane,group));}
    window.addEventListener('beforeunload',event=>{if(editors.some(editor=>editor.isDirty())){event.preventDefault();event.returnValue='';}});
})();
