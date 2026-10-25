(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FishingAuthoring=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const rarities={common:{weight:700,xp:1,speed:20},uncommon:{weight:243,xp:2,speed:15},rare:{weight:40,xp:5,speed:11},epic:{weight:15,xp:20,speed:8},legendary:{weight:2,xp:50,speed:6}};
    function chances(fish,lucky=false){
        const groups=Object.keys(rarities),counts=Object.fromEntries(groups.map(r=>[r,fish.filter(f=>f.rarity===r).length]));
        let cumulative=0;const odds={};
        for(const rarity of groups){let probability=counts[rarity]?rarities[rarity].weight/1000:0;if(rarity==='common')probability+=groups.filter(r=>!counts[r]).reduce((sum,r)=>sum+rarities[r].weight/1000,0);
            odds[rarity]=lucky?Math.pow(cumulative+probability,2)-Math.pow(cumulative,2):probability;cumulative+=probability;}
        return fish.map(f=>({...f,chance:counts[f.rarity]?odds[f.rarity]/counts[f.rarity]:0}));
    }
    function experience(level,rarity){return Math.round(10*rarities[rarity].xp*Math.pow(1.25,level-1));}
    return {rarities,chances,experience};
});
