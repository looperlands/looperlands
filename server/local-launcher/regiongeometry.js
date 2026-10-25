(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MapmakerRegionGeometry=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    function draw(start,end,map) {
        const a={x:clamp(Math.floor(start.x),0,map.width-1),y:clamp(Math.floor(start.y),0,map.height-1)};
        const b={x:clamp(Math.floor(end.x),0,map.width-1),y:clamp(Math.floor(end.y),0,map.height-1)};
        return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x)+1,height:Math.abs(a.y-b.y)+1};
    }
    function move(region,delta,map) {
        return {...region,x:clamp(region.x+Math.round(delta.x),0,map.width-region.width),y:clamp(region.y+Math.round(delta.y),0,map.height-region.height)};
    }
    function resize(region,handle,point,map) {
        let left=region.x,top=region.y,right=left+region.width,bottom=top+region.height;
        if(handle.includes('w'))left=clamp(Math.round(point.x),0,right-1);
        if(handle.includes('e'))right=clamp(Math.round(point.x),left+1,map.width);
        if(handle.includes('n'))top=clamp(Math.round(point.y),0,bottom-1);
        if(handle.includes('s'))bottom=clamp(Math.round(point.y),top+1,map.height);
        return {x:left,y:top,width:right-left,height:bottom-top};
    }
    function handles(region) {
        const left=region.x,top=region.y,right=left+region.width,bottom=top+region.height,middleX=(left+right)/2,middleY=(top+bottom)/2;
        return [['nw',left,top],['n',middleX,top],['ne',right,top],['e',right,middleY],['se',right,bottom],['s',middleX,bottom],['sw',left,bottom],['w',left,middleY]].map(([id,x,y])=>({id,x,y}));
    }
    return {draw,move,resize,handles};
});
