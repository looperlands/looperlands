const {createHash} = require('crypto');
const ERRORS = {
    occurrence_already_used: 'You have already completed this occurrence.', switch_to_bound_looper: 'Switch to the Looper that accepted this assignment.',
    quest_paused: 'The map maker has paused new acceptances for this quest.', acceptance_closed: 'The acceptance window has closed.',
    reacceptance_disabled: 'This quest cannot be reaccepted after withdrawal.', owned_looper_required: 'Use a Looper that you own to accept this work.',
    prerequisite_not_met: 'Complete the prerequisite quest first.', active_limit: 'Finish or withdraw an active assignment before accepting another.',
    reward_allowance_exhausted: 'Your daily quest reward allowance is fully reserved. Try again after reset.', rewards_unavailable: 'This quest needs more reward funding before it can accept new players.',
    already_completed: 'This assignment is already completed.', attempt_inactive: 'This assignment is no longer active.', wrong_recipient: 'Bring the full basket to the named hand-in location.',
    objectives_incomplete: 'Complete the required activities before claiming this reward.', quest_expired: 'The completion deadline has passed. Your items have not been taken.',
    reward_reservation_missing: 'This reward reservation needs attention. Please retry later.', insufficient_items: 'You no longer have the full basket. Gather the missing items and try again.',
    cannot_withdraw: 'This assignment cannot be withdrawn in its current state.', withdrawal_disabled: 'Withdrawal is disabled for this quest.',
    request_id_conflict: 'This request ID was already used for a different action. Refresh the quest before retrying.',
    attempt_not_found: 'This assignment could not be found for your Looper.', occurrence_not_found: 'This quest occurrence is no longer available.',
    invalid_quest_board_request: 'The quest request could not be validated. Refresh the board and try again.',
    occurrence_id_conflict: 'This quest publication conflicts with a previous version.', event_id_conflict: 'A gameplay event needs reconciliation. Please retry later.'
};
function fail(status,message) {const e=new Error(message);e.status=status;throw e;}
function near(player,bounds) {
    if (!bounds) return false;
    const dx=Math.max(bounds.x-player.x,0,player.x-(bounds.x+bounds.width-1));
    const dy=Math.max(bounds.y-player.y,0,player.y-(bounds.y+bounds.height-1));
    return dx+dy<=1;
}
class QuestBoardController {
    constructor(sessions,worlds,service,options={}) {this.sessions=sessions;this.worlds=worlds;this.service=service;this.options=options;}
    context(sessionId) {
        const session=this.sessions.get(sessionId),world=session&&this.worlds()[session.mapId],player=world?.getPlayerById(session.entityId);
        if (!player || player.sessionId!==sessionId || player.walletId!==session.walletId || player.nftId!==session.nftId || player.mapId!==session.mapId || player.hasEnteredGame===false) fail(401,'Your game session is no longer active.');
        return {sessionId,session,world,player,identity:{wallet:session.walletId,nftId:session.nftId}};
    }
    check(previous,bounds) {
        const current=this.context(previous.sessionId);
        if (current.player!==previous.player || current.session.mapId!==previous.session.mapId || current.session.nftId!==previous.identity.nftId || (bounds&&!bounds.some(b=>near(current.player,b)))) fail(409,'Your location changed. Please reopen the quest board.');
        return current;
    }
    board(context,id) {
        const board=this.service.config(context.session.mapId)?.boards.find(b=>b.id===id&&b.enabled);
        if (!board) fail(404,'This quest board is unavailable.');
        if (![board.bounds,...(board.placements || [])].some(b=>near(context.player,b))) fail(403,'Walk up to this quest board.'); return board;
    }
    requestId(req) {return createHash('sha256').update(req.body.requestId).digest('hex');}
    confirmed(req) {
        if (req.body?.confirmed!==true || typeof req.body.requestId!=='string' || !/^[A-Za-z0-9_.:-]{8,128}$/.test(req.body.requestId)) fail(400,'Confirm the quest action and include its request ID.');
    }
    locked(snapshot,context) {
        if ((context.player.getLevel?.() ?? this.options.level?.(context.session) ?? 1)<(snapshot.requiredLevel || 1)) return 'Requires level '+snapshot.requiredLevel+'.';
        if (snapshot.requiredQuest&&!this.options.stories?.hasCompletedQuest(snapshot.requiredQuest,context.session)) return 'Complete the prerequisite quest first.';
        return null;
    }
    decorate(data,context) {
        const label=this.options.itemLabel || (v=>String(v));
        const itemView=item=>({...item,itemLabel:label(item.item),...(this.options.itemImage?{image:this.options.itemImage(item.item)}:{})});
        const decorate=o=>{
            if (!o?.snapshot) return o;
            const s=o.snapshot;
            return {...o,lockedReason:this.locked(s,context),snapshot:{...s,objectives:s.objectives.map(obj=>({...obj,targetLabel:obj.target?label(obj.target):null,
                ...(obj.items?{items:obj.items.map(itemView)}:{})})),
                rewards:{...s.rewards,...(s.rewards.items?{items:s.rewards.items.map(itemView)}:{})}}};
        };
        return {...data,nftId:context.identity.nftId,occurrences:(data.occurrences || []).filter(o=>!o.snapshot.secret || !this.locked(o.snapshot,context)).map(decorate),attempts:(data.attempts || []).map(a=>({...a,isCurrentLooper:a.nftId===context.identity.nftId,occurrence:decorate(a.occurrence)}))};
    }
    storyList(board,context) {
        const stories=this.options.stories; if (!stories) return [];
        return board.questIds.map(id=>stories.questsByID[id]).filter(Boolean).map(q=>{
            const lockedReason=this.locked(q,context),completed=stories.hasCompletedQuest(q.id,context.session),started=stories.hasQuest(q.id,context.session);
            return {id:q.id,name:q.name,description:q.questLogText || q.startText,category:'adventures',npc:q.npc,requiredLevel:q.requiredLevel || 1,
                status:completed?'completed':started?'in_progress':lockedReason?'locked':'available',lockedReason,canAccept:board.allowStoryAcceptance&&!started&&!lockedReason};
        });
    }
    async run(res,operation) {
        try {return res.json(await operation());}
        catch(error) {
            const upstream=error.response?.status,status=error.status || ([400,403,404,409,422].includes(upstream)?upstream:503);
            const data=error.response?.data,code=data?.code;
            const message=error.status?error.message:ERRORS[code] || data?.error || data?.message || 'Quest service unavailable. Retry with the same request to confirm the result.';
            return res.status(status).json({error:message,...(code?{code}:{})});
        }
    }
    discovery(req,res) {return this.run(res,async()=>{
        const context=this.context(req.params.sessionId),config=this.service.config(context.session.mapId);
        const result={mapId:context.session.mapId,boards:config?.boards.filter(b=>b.enabled) || [],handInLocations:config?.handInLocations || []};
        // Retain accepted recipients even when a later JSON version moves a crate.
        if (!this.service.configs?.size && !config) return result;
        const state=await this.service.state(context.identity,context.session.mapId); this.check(context);
        for (const attempt of state.attempts || []) {
            const recipient=attempt.occurrence?.snapshot.recipient;
            if (recipient && attempt.occurrence.mapId===context.session.mapId && ['accepted','ready'].includes(attempt.status) && !result.handInLocations.some(r=>r.id===recipient.id&&JSON.stringify(r.bounds)===JSON.stringify(recipient.bounds))) result.handInLocations=[...result.handInLocations,recipient];
        }
        return result;
    });}
    list(req,res,journal=false) {return this.run(res,async()=>{
        const context=this.context(req.params.sessionId),board=journal?null:this.board(context,req.params.boardId);
        await this.options.progress?.flush();
        const state=await this.service.state(context.identity,journal?null:context.session.mapId);
        this.check(context,board?[board.bounds,...(board.placements || [])]:null);
        if (board) {
            state.occurrences=state.occurrences.filter(o=>o.snapshot.boardIds.includes(board.id));
            state.attempts=state.attempts.filter(a=>a.occurrence.snapshot.boardIds.includes(board.id));
        }
        return this.decorate({...state,mapId:context.session.mapId,board,stories:board?this.storyList(board,context):[]},context);
    });}
    accept(req,res) {return this.run(res,async()=>{
        this.confirmed(req); const context=this.context(req.params.sessionId),board=this.board(context,req.params.boardId);
        const state=await this.service.state(context.identity,context.session.mapId);
        const occurrence=state.occurrences.find(o=>o.id===req.body.occurrenceId);
        this.check(context,[board.bounds,...(board.placements || [])]);
        if (!occurrence || !occurrence.snapshot.boardIds.includes(board.id) || !board.questIds.includes(occurrence.questId)) fail(404,'This quest is not offered by this board.');
        const reason=this.locked(occurrence.snapshot,context); if(reason) fail(403,reason);
        return this.service.platform.questBoard('accept',{...context.identity,occurrenceId:occurrence.id,requestId:this.requestId(req)});
    });}
    story(req,res) {return this.run(res,async()=>{
        if(req.body?.confirmed!==true) fail(400,'Confirm this adventure.');
        const context=this.context(req.params.sessionId),board=this.board(context,req.params.boardId),story=this.storyList(board,context).find(q=>q.id===req.body.questId);
        if(!story?.canAccept) fail(409,story?.lockedReason || 'Speak to the quest giver to start this adventure.');
        const message=this.options.stories.newQuest(this.sessions,context.sessionId,story.id);
        if(!message) fail(409,'This adventure could not be started.'); return {success:true,questId:story.id,message};
    });}
    action(req,res,action) {return this.run(res,async()=>{
        this.confirmed(req); const context=this.context(req.params.sessionId);
        await this.options.progress?.flush();
        const state=await this.service.state(context.identity),attempt=state.attempts.find(a=>a.id===req.params.attemptId);
        this.check(context);
        if(!attempt || attempt.nftId!==context.identity.nftId) fail(404,'This assignment belongs to a different Looper.');
        const recipient=attempt.occurrence.snapshot.recipient;
        const check=()=>{
            const current=this.check(context);
            // Replays of a committed receipt remain possible after map changes.
            if(action==='settle' && recipient && attempt.status!=='completed' && (current.session.mapId!==attempt.occurrence.mapId || req.body.recipientId!==recipient.id || !near(current.player,recipient.bounds))) fail(403,'Walk up to '+recipient.label+' to hand in the full basket.');
        };
        check();
        const perform=()=>{check();return this.service.platform.questBoard(action,{...context.identity,attemptId:attempt.id,requestId:this.requestId(req),...(recipient?{recipientId:recipient.id}:{})});};
        const result=action==='settle'&&this.options.settle?await this.options.settle(context,perform):await perform();
        if(result.receipt) await this.options.applyReceipt?.(context,result.receipt);
        return result;
    });}
}
module.exports={QuestBoardController,near};
