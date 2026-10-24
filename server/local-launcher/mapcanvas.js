(() => {
    'use strict';
    const cache=new Map(),el=(tag,text='',attrs={})=>Object.assign(document.createElement(tag),{textContent:text,...attrs});
    async function load(mapId,refresh=false) {if(refresh)cache.delete(mapId);if(!cache.has(mapId))cache.set(mapId,fetch('./api/map-canvas?mapId='+encodeURIComponent(mapId)).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Map artwork could not load.');return d;}).catch(e=>{cache.delete(mapId);throw e;}));return cache.get(mapId);}
    function attach(parent,mapId,options={}) {
        let data,image,disposed=false,overlay={},view={scale:1,x:0,y:0},drag;
        const wrap=el('div','',{className:'authoring-map'}),controls=el('div','',{className:'map-controls'}),canvas=el('canvas','',{className:'authoring-map-canvas',tabIndex:0,ariaLabel:options.label||'Map canvas. Drag to pan, plus/minus to zoom. Click to place a tile; coordinate fields provide keyboard placement.'}),note=el('p','Loading built map…',{className:'field-hint'});
        canvas.height=460;
        function button(label,run){const b=el('button',label,{type:'button'});b.onclick=run;controls.append(b);}
        button('Zoom in',()=>zoom(1.5));button('Zoom out',()=>zoom(1/1.5));button('Fit map',()=>fit());
        const coordinate=el('span','Hover for coordinates',{className:'field-hint'});let hover;window.MapLocation.mark(coordinate,()=>({mapId,...hover}));controls.append(coordinate);wrap.append(controls,canvas,note);parent.append(wrap);
        function point(x,y){return {x:Math.floor((x-view.x)/view.scale),y:Math.floor((y-view.y)/view.scale)};}
        function fit(area){if(!data)return;const a=area||{x:0,y:0,width:data.width,height:data.height};view.scale=Math.max(.1,Math.min(48,canvas.width/(a.width+4),canvas.height/(a.height+4)));view.x=canvas.width/2-(a.x+a.width/2)*view.scale;view.y=canvas.height/2-(a.y+a.height/2)*view.scale;draw();}
        function zoom(factor,x=canvas.width/2,y=canvas.height/2){const old=view.scale;view.scale=Math.max(.1,Math.min(48,old*factor));view.x=x-(x-view.x)*view.scale/old;view.y=y-(y-view.y)*view.scale/old;draw();}
        function draw(){if(!data||!canvas.isConnected||disposed)return;const ctx=canvas.getContext('2d'),s=view.scale;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#f7f8fa';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(view.x,view.y);ctx.scale(s,s);const minX=Math.max(0,Math.floor(-view.x/s)),maxX=Math.min(data.width,Math.ceil((canvas.width-view.x)/s)),minY=Math.max(0,Math.floor(-view.y/s)),maxY=Math.min(data.height,Math.ceil((canvas.height-view.y)/s));ctx.fillStyle='#ffffff';ctx.fillRect(0,0,data.width,data.height);
            if(image){const size=data.tilesize,columns=image.width/size;for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)for(const raw of [].concat(data.tiles[y*data.width+x]||[])){const i=Number(raw)-1;if(i>=0)ctx.drawImage(image,i%columns*size,Math.floor(i/columns)*size,size,size,x,y,1,1);}}
            if(overlay.collisions){ctx.fillStyle='#a52828';ctx.globalAlpha=.25;for(const i of data.collisions){const x=i%data.width,y=Math.floor(i/data.width);if(x>=minX&&x<maxX&&y>=minY&&y<maxY)ctx.fillRect(x,y,1,1);}ctx.globalAlpha=1;}
            for(const r of overlay.regions||[]){ctx.fillStyle='#2563eb';ctx.globalAlpha=.18;ctx.fillRect(r.x,r.y,r.width,r.height);ctx.globalAlpha=1;ctx.strokeStyle='#2563eb';ctx.lineWidth=2/s;ctx.strokeRect(r.x,r.y,r.width,r.height);}
            for(const link of overlay.links||[]){const points=link.path?.length?link.path:[link.from,link.to];ctx.strokeStyle=link.error?'#a52828':'#2563eb';ctx.lineWidth=2/s;ctx.setLineDash(link.error?[5/s,3/s]:[]);ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x+.5,p.y+.5));ctx.stroke();ctx.setLineDash([]);}
            for(const [i,p]of (overlay.points||[]).entries()){ctx.fillStyle=i===overlay.selected?'#1e4f9d':'#2563eb';ctx.beginPath();ctx.arc(p.x+.5,p.y+.5,Math.max(.45,8/s),0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.font=12/s+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),p.x+.5,p.y+.5);}
            if(overlay.actor){ctx.fillStyle='#202936';ctx.strokeStyle='#ffffff';ctx.lineWidth=2/s;ctx.beginPath();ctx.arc(overlay.actor.x+.5,overlay.actor.y+.5,Math.max(.4,6/s),0,Math.PI*2);ctx.fill();ctx.stroke();}
            if(overlay.tile){const p=overlay.tile,size=data.tilesize,i=p.id-1;if(image&&i>=0)ctx.drawImage(image,i%(image.width/size)*size,Math.floor(i/(image.width/size))*size,size,size,p.x,p.y,1,1);}
            ctx.restore();
        }
        canvas.onpointerdown=e=>{drag={x:e.offsetX,y:e.offsetY,vx:view.x,vy:view.y};canvas.setPointerCapture(e.pointerId);};
        canvas.onpointermove=e=>{hover=point(e.offsetX,e.offsetY);coordinate.textContent='Tile '+hover.x+', '+hover.y;if(drag){view.x=drag.vx+e.offsetX-drag.x;view.y=drag.vy+e.offsetY-drag.y;draw();}};
        canvas.onpointerup=e=>{if(drag&&Math.hypot(e.offsetX-drag.x,e.offsetY-drag.y)<6){const p=point(e.offsetX,e.offsetY);if(p.x>=0&&p.y>=0&&p.x<data.width&&p.y<data.height)options.onPick?.(p);}drag=null;};canvas.onpointercancel=()=>{drag=null;};canvas.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.2:1/1.2,e.offsetX,e.offsetY);};
        canvas.onkeydown=e=>{const move={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[e.key];if(move){e.preventDefault();view.x+=move[0];view.y+=move[1];draw();}else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1/1.5:1.5);}};
        const observer=new ResizeObserver(()=>{if(!canvas.isConnected){observer.disconnect();disposed=true;return;}canvas.width=Math.max(1,Math.round(canvas.clientWidth));fit(options.area?.());});observer.observe(canvas);
        const ready=load(mapId).then(d=>{if(disposed||!canvas.isConnected)return;data=d;fit(options.area?.());note.textContent='Built artwork · drag to pan · scroll to zoom. Collision/path previews exclude moving entities and dynamic layers.';const img=new Image();img.onload=()=>{image=img;draw();};img.onerror=()=>{note.textContent='Artwork unavailable. Geometry and overlays remain visible.';};img.src=d.tileset;options.onLoad?.(d);}).catch(e=>{note.textContent=e.message;note.classList.add('error');});
        return {ready,get map(){return data;},set(value){overlay=value;draw();},fit,draw,destroy(){disposed=true;observer.disconnect();}};
    }
    window.MapmakerCanvas={attach,load};
})();
