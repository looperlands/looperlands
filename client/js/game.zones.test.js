const fs=require('fs'),vm=require('vm');
test('trigger entry and exit use the active game instance without depending on a global self',()=>{
    const source=fs.readFileSync(require.resolve('./game'),'utf8'),start=source.indexOf('            handleTrigger(trigger, entity) {'),end=source.indexOf('            handleNotify(message)',start),methods=vm.runInNewContext('({'+source.slice(start,end)+'})',{Npc:class{}});
    const player={id:1,isDead:false,onLeave:jest.fn()},game={...methods,player,client:{sendTrigger:jest.fn()},showNotification:jest.fn()};const trigger={id:7,player_message:'Entered zone',message:'Fallback'};
    game.handleTrigger(trigger,player);game.handleTrigger(trigger,player);expect(game.client.sendTrigger).toHaveBeenCalledTimes(1);expect(game.client.sendTrigger).toHaveBeenCalledWith(7,true);expect(game.showNotification).toHaveBeenCalledWith('Entered zone');
    player.onLeave.mock.calls[0][1]();expect(game.client.sendTrigger).toHaveBeenCalledWith(7,false);expect(player.triggerArea).toBeNull();
    const second={...methods,player:{id:2,onLeave:jest.fn()},client:{sendTrigger:jest.fn()},showNotification:jest.fn()};second.handleTrigger(trigger,second.player);expect(second.client.sendTrigger).toHaveBeenCalledWith(7,true);expect(game.client.sendTrigger).toHaveBeenCalledTimes(2);
});
