const Types = require('../../shared/js/gametypes');
const merchant = {mapId:'main', key:'points:merchant', x:57, y:217};
function register(target) {
    target.register('main', {id:'points-exchange', dialogues:[{npc:Types.getKindFromString('shopowner'), key:merchant.key, name:'Points Exchange', start:'welcome',
        nodes:{welcome:{pointsStore:true}}}],
    createScene(world) {
        let npc;
        return {tick() {
            if (npc || !world.isValidPosition(merchant.x,merchant.y) || Object.values(world.entities).some(row => row.x === merchant.x && row.y === merchant.y)) return;
            npc = world.addNpc(Types.getKindFromString('shopowner'),merchant.x,merchant.y);
            npc.behaviorState = {key:merchant.key,label:'Points Exchange',activity:'waiting',orientation:Types.Orientations.DOWN};
        }};
    }});
}
module.exports = {register,merchant};
