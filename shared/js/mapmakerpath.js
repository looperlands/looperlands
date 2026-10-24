(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MapmakerPath=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    function find(map,start,end,area) {
        const key=p=>p.x+','+p.y,inside=p=>p.x>0&&p.y>0&&p.x<map.width&&p.y<map.height&&(!area||(p.x>=area.x&&p.y>=area.y&&p.x<area.x+area.width&&p.y<area.y+area.height));
        const blocked=new Set(map.collisions||[]),doors=new Set((map.doors||[]).map(key));
        const walk=p=>inside(p)&&!blocked.has(p.y*map.width+p.x)&&!doors.has(key(p));
        if(!walk(start)||!walk(end))return {path:[],error:'Blocked, outside the movement area, or on a door.'};
        const queue=[start],parents=new Map([[key(start),null]]);
        for(let i=0;i<queue.length&&i<2500;i++) {
            const current=queue[i];if(key(current)===key(end)){const path=[];let p=current;while(p){path.push(p);p=parents.get(key(p));}return {path:path.reverse()};}
            for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const p={x:current.x+dx,y:current.y+dy};if(walk(p)&&!parents.has(key(p))){parents.set(key(p),current);queue.push(p);}}
        }
        return {path:[],error:queue.length>=2500?'Route exceeds the runtime search budget; add nearer waypoints.':'No walkable route between these waypoints.'};
    }
    function route(map,points,area,origin) {const links=[];if(!points.length)return links;const sequence=[origin||points.at(-1),...points];for(let i=1;i<sequence.length;i++)links.push({from:sequence[i-1],to:sequence[i],...find(map,sequence[i-1],sequence[i],area)});if(origin)links.push({from:points.at(-1),to:points[0],...find(map,points.at(-1),points[0],area)});return links;}
    return {find,route};
});
