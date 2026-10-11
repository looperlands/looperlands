const fs=require('fs'), path=require('path');
function runtimeCatalog(stageDefinitions, storyIds = []) {
    const Types=require('../../../shared/js/gametypes'), Collectables=require('../collectables'), Lakes=require('../lakes');
    const {buildActivityCatalog}=require('../activitycatalog');
    const scenes=new Map();
    return {storyIds,
        resolveArea(value,mapId) {
            if (!scenes.has(mapId)) {
                const filename=path.resolve(__dirname,'../../../client/maps/world_client_'+mapId+'.json');
                scenes.set(mapId,fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')).scenes || []:[]);
            }
            return scenes.get(mapId).some(scene=>String(scene.name || scene.id)===String(value));
        },tileActions:buildActivityCatalog(Types,stageDefinitions).tileActions,
        resolveEntity(value,type) {
            const kind=typeof value==='number'?value:/^\d+$/.test(String(value))?Number(value):Types.Entities[value];
            if (type==='fish') return Lakes.isFish(value)?value:null;
            if (type==='item') return Collectables.isTransferable(kind)?kind:Collectables.isTransferable(value)?value:null;
            if (type==='loot') return Types.isItem(kind)?kind:Lakes.isFish(value)?value:null;
            if (type==='mob') return Types.isMob(kind)?kind:null;
            if (type==='npc') return Types.isNpc(kind)?kind:null;
            return null;
        }};
}
module.exports={runtimeCatalog};
