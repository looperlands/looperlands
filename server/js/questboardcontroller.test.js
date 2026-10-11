const {createHash}=require('crypto');
const requestId=createHash('sha256').update('request-123').digest('hex');
const {QuestBoardController}=require('./questboardcontroller');
function fixture(){
 const session={walletId:'wallet',nftId:'avatar',entityId:1,mapId:'map',gameData:{quests:{}}};
 const player={sessionId:'s',walletId:'wallet',nftId:'avatar',mapId:'map',x:10,y:11,getLevel:()=>10};
 const board={id:'board',enabled:true,label:'Board',bounds:{x:10,y:10,width:1,height:1},questIds:['Q'],allowStoryAcceptance:true};
 const recipient={id:'crate',label:'The supply crate',bounds:{x:20,y:20,width:1,height:1}};
 const occurrence={id:'occurrence',questId:'Q',mapId:'map',snapshot:{boardIds:['board'],name:'Supplies',objectives:[{id:'goods',eventType:'DELIVER_ITEMS',recipientId:'crate',items:[{item:'1',amount:2}]}],rewards:{xp:10},recipient}};
 const attempt={id:'attempt',nftId:'avatar',status:'accepted',occurrence};
 const platform={questBoard:jest.fn(async()=>({attempt}))},state={occurrences:[occurrence],attempts:[attempt],inventory:{'1':2}};
 const service={config:()=>({boards:[board],handInLocations:[recipient]}),state:jest.fn(async()=>structuredClone(state)),platform};
 const cache={get:()=>session},world={getPlayerById:()=>player},controller=new QuestBoardController(cache,()=>({map:world}),service);
 const req={params:{sessionId:'s',boardId:'board',attemptId:'attempt'},body:{confirmed:true,requestId:'request-123',occurrenceId:'occurrence',recipientId:'crate',wallet:'forged',nftId:'other'}};
 const res={status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()};return {session,player,board,recipient,occurrence,attempt,service,platform,controller,req,res,state};
}
test('accept binds session identity and exact board, disregarding forged wallet or rewards',async()=>{
 const f=fixture();await f.controller.accept(f.req,f.res);expect(f.platform.questBoard).toHaveBeenCalledWith('accept',{wallet:'wallet',nftId:'avatar',occurrenceId:'occurrence',requestId});
 f.player.x=30;await f.controller.accept(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(403);expect(f.platform.questBoard).toHaveBeenCalledTimes(1);
});
test('accept revalidates location after platform reads and rejects a different board offer',async()=>{
 const f=fixture();f.service.state.mockImplementation(async()=>{f.player.x=40;return f.state;});await f.controller.accept(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(409);expect(f.platform.questBoard).not.toHaveBeenCalled();
 const g=fixture();g.occurrence.snapshot.boardIds=['elsewhere'];await g.controller.accept(g.req,g.res);expect(g.res.status).toHaveBeenCalledWith(404);
});
test('delivery checks exact immutable recipient and revalidates inside inventory writer',async()=>{
 const f=fixture();await f.controller.action(f.req,f.res,'settle');expect(f.res.status).toHaveBeenCalledWith(403);expect(f.platform.questBoard).not.toHaveBeenCalled();
 f.player.x=20;f.player.y=21;await f.controller.action(f.req,f.res,'settle');expect(f.platform.questBoard).toHaveBeenCalledWith('settle',{wallet:'wallet',nftId:'avatar',attemptId:'attempt',requestId,recipientId:'crate'});
 f.platform.questBoard.mockClear();f.controller.options.settle=async(_,operation)=>{f.player.x=50;return operation();};await f.controller.action(f.req,f.res,'settle');expect(f.platform.questBoard).not.toHaveBeenCalled();
});
test('action-only earned rewards may be claimed anywhere and completed receipts replay away from crate',async()=>{
 const f=fixture();f.occurrence.snapshot.recipient=null;f.player.x=90;await f.controller.action(f.req,f.res,'settle');expect(f.platform.questBoard).toHaveBeenCalledTimes(1);
 const g=fixture();g.attempt.status='completed';await g.controller.action(g.req,g.res,'settle');expect(g.platform.questBoard).toHaveBeenCalledTimes(1);
});
test('attempt is bound to accepting Looper and stale/disconnected sessions cannot act',async()=>{
 const f=fixture();f.attempt.nftId='different';await f.controller.action(f.req,f.res,'withdraw');expect(f.res.status).toHaveBeenCalledWith(404);
 f.player.nftId='different';await f.controller.list(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(401);
});
test('journal can read away from board; secret locked quests are omitted; story progress stays separate',async()=>{
 const f=fixture();f.player.x=90;f.occurrence.snapshot.secret=true;f.occurrence.snapshot.requiredLevel=100;await f.controller.list(f.req,f.res,true);expect(f.res.json.mock.calls[0][0].occurrences).toEqual([]);expect(f.res.json.mock.calls[0][0].attempts).toHaveLength(1);
});
test('disabled boards reject new acceptance while journal remains readable',async()=>{
 const f=fixture();f.board.enabled=false;await f.controller.accept(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(404);await f.controller.list(f.req,f.res,true);expect(f.res.json.mock.calls.at(-1)[0].attempts).toHaveLength(1);
});
test('discovery retains old snapshotted recipients for outstanding accepted contracts',async()=>{
 const f=fixture();const old={...f.recipient,bounds:{x:70,y:70,width:1,height:1}};f.attempt.occurrence={...f.occurrence,snapshot:{...f.occurrence.snapshot,recipient:old}};await f.controller.discovery(f.req,f.res);expect(f.res.json.mock.calls[0][0].handInLocations).toContainEqual(old);
});
test('errors preserve domain conflicts and ambiguous failures encourage same request retry',async()=>{
 const f=fixture();f.platform.questBoard.mockRejectedValue({response:{status:409,data:{error:'This occurrence is closed.'}}});await f.controller.accept(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(409);expect(f.res.json).toHaveBeenLastCalledWith({error:'This occurrence is closed.'});
});

test('browser UUID request IDs are normalized to stable platform IDs on every retry',async()=>{const f=fixture();f.req.body.requestId='550e8400-e29b-41d4-a716-446655440000';await f.controller.accept(f.req,f.res);await f.controller.accept(f.req,f.res);const sent=f.platform.questBoard.mock.calls;expect(sent[0][1].requestId).toMatch(/^[a-f0-9]{64}$/);expect(sent[0]).toEqual(sent[1]);});

test('platform business codes return clear player-facing conflicts',async()=>{const f=fixture();f.platform.questBoard.mockRejectedValue({response:{status:409,data:{code:'rewards_unavailable'}}});await f.controller.accept(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(409);expect(f.res.json).toHaveBeenCalledWith({code:'rewards_unavailable',error:'This quest needs more reward funding before it can accept new players.'});});
