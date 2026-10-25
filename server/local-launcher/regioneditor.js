// Reusable rectangular-area editor. Consumers adapt their model through
// getRegion() and onChange({x,y,width,height}); this component owns interaction.
(() => {
    'use strict';
    const G=window.MapmakerRegionGeometry;
    const el=(tag,text='',attrs={})=>Object.assign(document.createElement(tag),{textContent:text,...attrs});
    function attach(parent,mapId,options) {
        let mode=options.initialMode||'select',gesture,map,canvas;
        const root=el('div','',{className:'region-editor'}),toolbar=el('div','',{className:'world-inline-actions',role:'group',ariaLabel:'Area editing mode'});
        const hint=el('p','',{className:'field-hint',role:'status'}),buttons=new Map();
        function setMode(next){mode=next;for(const[id,button]of buttons)button.setAttribute('aria-pressed',String(mode===id));hint.textContent=mode==='draw'?'Drag across the map to draw a box.':mode==='pan'?'Drag to pan the map. Scroll to zoom.':'Drag inside the box to move it; drag an edge or corner handle to resize. Hold Shift to pan. Arrow keys move; Shift + arrows resize.';canvas?.draw();}
        for(const[id,label]of [['select','Move / resize'],['draw','Draw box'],['pan','Pan map']]){const button=el('button',label,{type:'button'});button.onclick=()=>setMode(id);buttons.set(id,button);toolbar.append(button);}
        const focus=el('button','Focus area',{type:'button'});focus.onclick=()=>canvas.fit(options.getRegion());toolbar.append(focus);root.append(toolbar,hint);parent.append(root);
        const cursor=id=>id==='move'?'move':id.length===1?(id==='n'||id==='s'?'ns-resize':'ew-resize'):(id==='nw'||id==='se'?'nwse-resize':'nesw-resize');
        function hit(context){const region=options.getRegion();for(const handle of G.handles(region)){const p=context.project(handle);if(Math.abs(context.screen.x-p.x)<=9&&Math.abs(context.screen.y-p.y)<=9)return handle.id;}const p=context.tile;return p.x>=region.x&&p.y>=region.y&&p.x<=region.x+region.width&&p.y<=region.y+region.height?'move':null;}
        function change(region){options.onChange(region);refresh();}
        const interaction={
            start(context){if(!map||mode==='pan'||context.shiftKey)return false;const kind=mode==='draw'?'draw':hit(context);if(!kind)return false;gesture={kind,start:context.tile,region:{...options.getRegion()},anchor:G.handles(options.getRegion()).find(h=>h.id===kind)};return true;},
            move(context){if(!gesture)return;const g=gesture;change(g.kind==='draw'?G.draw(g.start,context.tile,map):g.kind==='move'?G.move(g.region,{x:context.tile.x-g.start.x,y:context.tile.y-g.start.y},map):G.resize(g.region,g.kind,{x:g.anchor.x+context.tile.x-g.start.x,y:g.anchor.y+context.tile.y-g.start.y},map));},
            end(context,cancelled){if(!gesture)return;if(cancelled)change(gesture.region);else interaction.move(context);const wasDraw=gesture.kind==='draw';gesture=null;if(wasDraw)setMode('select');options.onCommit?.(options.getRegion());},
            cursor(context){if(mode==='pan'||context.shiftKey)return 'grab';if(mode==='draw')return 'crosshair';const target=gesture?.kind||hit(context);return target?cursor(target):'grab';},
            draw(ctx,context){if(mode==='pan')return;ctx.fillStyle='#ffffff';ctx.strokeStyle='#2563eb';ctx.lineWidth=2;for(const handle of G.handles(options.getRegion())){const p=context.project(handle);ctx.fillRect(p.x-5,p.y-5,10,10);ctx.strokeRect(p.x-5,p.y-5,10,10);}},
            keydown(event){if(!map||mode==='pan')return false;const delta={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}}[event.key];if(!delta)return false;const r=options.getRegion();change(event.shiftKey?G.resize(r,'se',{x:r.x+r.width+delta.x,y:r.y+r.height+delta.y},map):G.move(r,delta,map));options.onCommit?.(options.getRegion());return true;}
        };
        canvas=window.MapmakerCanvas.attach(root,mapId,{label:options.label||'Area editor. Drag to draw, move or resize the box. Arrow keys move; Shift and arrows resize.',area:options.area||options.getRegion,interaction,onLoad:data=>{map=data;options.onLoad?.(data);refresh();}});
        function refresh(){const r=options.getRegion();canvas?.set({regions:[r]});}
        setMode(mode);refresh();
        return {ready:canvas.ready,refresh,fit:()=>canvas.fit(options.getRegion()),setMode,get mode(){return mode;},destroy:()=>canvas.destroy()};
    }
    window.MapmakerRegionEditor={attach};
})();
