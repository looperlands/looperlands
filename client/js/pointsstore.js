define(['reforgefx', 'cardartwork', 'sprites'], function (Forge, CardArtwork, sprites) {
    const node = (tag, className, text) => {const el=document.createElement(tag); if(className) el.className=className; if(text!=null) el.textContent=String(text); return el;};
    const button = (label, action) => {const el=node('button','ev-button',label); el.type='button'; el.addEventListener('click',action); return el;};
    class PointsStore {
        constructor(app) {
            this.app=app; this.tab='shop'; this.opened=false; this.busy=false; this.pending=null; this.session=null;
            this.root=node('div','game-events points-exchange'); this.root.hidden=true;
            this.board=node('section','ev-board'); this.board.setAttribute('role','dialog'); this.board.setAttribute('aria-modal','true'); this.board.setAttribute('aria-label','Points Exchange');
            this.root.append(this.board); document.body.append(this.root);
            this.root.addEventListener('click',event=>event.stopPropagation());
            document.addEventListener('keydown',event=>this.keyboard(event),true);
            this.timer=setInterval(()=>this.tick(),5000);
        }
        url(path='points-store') {return '/session/'+encodeURIComponent(this.app.sessionId)+'/'+path;}
        remember() {
            try {if(this.pending) localStorage.setItem(this.purchaseStorageKey,JSON.stringify(this.pending)); else localStorage.removeItem(this.purchaseStorageKey);} catch (_) {}
        }
        async open(tab='shop') {
            this.app.hideWindows(); this.app.hideChat(); this.app.eventBoard?.close(); this.app.game.keyboardHandler?.handleBlur?.();
            this.session=this.app.sessionId; this.opener=document.activeElement; this.opened=true; this.tab=tab; this.error=null; this.notice=null; this.selection=null;
            this.root.hidden=false; this.root.classList.add('ev-open'); this.render(); this.board.querySelector('button')?.focus();
            await this.load();
        }
        close() {this.fx?.stop();this.opened=false; this.root.hidden=true; this.root.classList.remove('ev-open'); this.opener?.focus?.();}
        async tick() {
            const game=this.app.game;
            if(!game?.started || game.player?.isDead || !game.client?.connection?.connected) {if(this.opened)this.close(); return;}
            if(this.session!==this.app.sessionId) {
                this.session=this.app.sessionId; this.data=null; this.pending=null;
                // The wallet returned by the server supplies the durable retry identity.
                this.purchaseStorageKey=null;
            }
            if(this.opened && !this.busy && (this.tab==='objectives' || !this.selection)) await this.load();
            else await this.loadRewards();
        }
        async loadRewards() {
            try {const response=await axios.get(this.url('rewards')); this.applyRewards(response.data);} catch (_) {this.applyRewards({unlocks:[]});}
        }
        applyRewards(data) {
            this.rewards=data;
            if(this.app.game.player)this.app.game.player.selectedTrail=(data.unlocks || []).includes(data.selectedTrail)?data.selectedTrail:null;
            document.querySelectorAll('#emoteMenu [data-emotion]').forEach(el=>{
                const id=el.dataset.emotion, source=Types.unlockableEmotions[id];
                if(!source)return;
                const owned=(data.unlocks || []).includes('emote:'+id);
                el.disabled=!owned; el.title=owned ? id : source==='event' ? 'Unlock through an event' : 'Unlock at the Points Exchange';
                el.setAttribute('aria-label',id+(owned ? '' : ' — '+el.title));
            });
        }
        async load() {
            const session=this.app.sessionId;
            try {
                const response=await axios.get(this.url());
                if(session!==this.app.sessionId)return;
                this.data=response.data; this.error=null; this.applyRewards(this.data);
                const storageKey='points-purchase:'+this.data.wallet;
                if(this.purchaseStorageKey!==storageKey) {
                    this.purchaseStorageKey=storageKey;
                    try {const saved=JSON.parse(localStorage.getItem(storageKey)); if(saved && typeof saved.requestId==='string' && typeof saved.productId==='string')this.pending=saved;} catch (_) {}
                }
            } catch (error) {this.data=null; this.error=error.response?.data?.error || 'Points are temporarily unavailable.';}
            if(this.opened)this.render();
        }
        keyboard(event) {
            if(!this.opened)return;
            if(event.key==='Escape'){event.preventDefault();this.close();}
            if(event.key==='Tab') {
                const controls=Array.from(this.board.querySelectorAll('button,select')).filter(el=>!el.disabled&&!el.hidden);
                const first=controls[0],last=controls[controls.length-1];
                if(!controls.includes(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
                else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
                else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
            }
            event.stopImmediatePropagation();
        }
        restoreFocus(identity) {
            if(!this.opened || !identity)return;
            const controls=Array.from(this.board.querySelectorAll('button')).filter(el=>!el.disabled&&!el.hidden);
            const target=controls.find(el=>(el.getAttribute('aria-label') || el.textContent.trim())===identity) || controls[0];
            target?.focus({preventScroll:true});
        }
        render() {
            const active=document.activeElement;
            const focusIdentity=this.board.contains?.(active) ? active.getAttribute('aria-label') || active.textContent.trim() : null;
            this.stage=null;
            const scroll=this.board.querySelector('.ps-content')?.scrollTop || 0;
            this.board.replaceChildren();
            const header=node('header','ev-header'), title=node('div');
            title.append(node('h2','','Points Exchange'));
            const wallet=node('div','ps-wallet');
            if(this.data) wallet.append(node('i','ps-coin'),node('strong','',this.data.balance.available),node('span','','points'));
            const close=button('×',()=>this.close());close.setAttribute('aria-label','Close Points Exchange');header.append(title,wallet,close);this.board.append(header);
            const nav=node('nav','ev-tabs'); nav.setAttribute('aria-label','Points Exchange sections');
            for(const [id,label] of [['shop','Shop'],['objectives','Earn points'],['rewards','Collection']]) {
                const tab=button(label,()=>{if(this.busy)return;this.tab=id;this.selection=null;this.render();});tab.disabled=this.busy;tab.classList.toggle('ev-selected',this.tab===id);tab.setAttribute('aria-pressed',String(this.tab===id));nav.append(tab);
            }
            this.board.append(nav);
            const content=node('div','ev-content ps-content');this.board.append(content);
            if(this.error){const error=node('p','ps-error',this.error);error.setAttribute('role','alert');content.append(error,button('Refresh',()=>this.load()));}
            if(!this.data){if(!this.error)content.append(node('p','','Opening the workshop…'));this.restoreFocus(focusIdentity);return;}
            if(this.notice){const notice=node('p','ps-notice',this.notice);notice.setAttribute('role','status');content.append(notice);}
            if(this.pending && !this.busy) {
                const pending=node('div','ps-pending');pending.append(node('h3','','Check your pending purchase'),node('p','','The forge has not confirmed this purchase. Check its receipt before starting another. You cannot be charged twice.'));
                const retry=button('Check purchase',()=>this.buy());retry.disabled=!this.data.canPurchase;pending.append(retry);
                if(!this.data.canPurchase)pending.append(node('p','','Visit the merchant beside the main-map event board to check it.'));
                content.append(pending);
            }
            if(this.tab==='objectives')this.renderObjectives(content);
            else if(this.tab==='rewards')this.renderRewards(content);
            else if(this.selection)this.renderConfirmation(content);
            else this.renderProducts(content);
            content.scrollTop=scroll;this.restoreFocus(focusIdentity);
        }
        renderProducts(content) {
            const services=node('section','ps-services');services.append(node('h3','','Make a change'));
            const options=node('div','ps-services-list');
            for(const product of this.data.products.filter(row=>row.type!=='unlock')) {
                const choice=button('',()=>{this.selection={product,nftId:null,choice:null};this.notice=null;this.render();});choice.className='ps-service';choice.disabled=this.busy||!!this.pending;
                const art=node('div','ps-service-art'),asset=this.data.assets.find(row=>product.assetTypes.includes(row.type));
                if(asset)this.renderArtwork(art,asset,product.type);
                const text=node('div','ps-service-text');text.append(node('strong','',({'weapon-reroll':'Weapon trait','rod-reroll':'Fishing-rod trait','class-change':'Avatar class'}[product.id] || product.name)),node('span','',product.type==='class'?'Choose a different class':'Roll a different trait'));
                choice.append(art,text,node('strong','ps-service-price',product.price+' points'));options.append(choice);
            }
            services.append(options,node('p','ps-footnote','Your level and XP are always preserved.'));content.append(services);
            const keepsakes=node('section','ps-keepsakes');keepsakes.append(node('h3','','Make it yours'));
            for(const product of this.data.products.filter(row=>row.type==='unlock')) {
                const reward=this.data.rewards.find(row=>row.id===product.reward),owned=this.data.unlocks.includes(product.reward),row=node('div','ps-keepsake-row');
                const text=node('div');text.append(node('strong','',product.name),node('span','ps-footnote',reward?.type==='title'?'An earned title beside your name':reward?.type==='trail'?'Pixel sparks follow you while moving':'Permanent emote · all your avatars'));
                const choose=button(owned?'Owned':product.price+' points',()=>{this.selection={product,nftId:null,choice:null};this.notice=null;this.render();});choose.disabled=owned||this.busy||!!this.pending;
                row.append(this.rewardArtwork(reward,'ps-keepsake-symbol'),text,choose);keepsakes.append(row);
            }
            content.append(keepsakes,node('p','ps-exclusive','Event-exclusive styles and emotes are earned at events. They are never sold here.'));
        }
        rewardArtwork(reward,className) {
            if(reward?.image){const img=node('img',className);img.src=reward.image;img.alt=reward.label;return img;}
            return node('span',className,reward?.symbol || 'Aa');
        }
        renderArtwork(element,asset,type,status) {
            const name=asset.nftId.replace(/^0x/,'NFT_'),metadata=sprites[name],candidates=[];
            if(metadata)candidates.push({url:'img/1/'+name+'.png',width:metadata.width,height:metadata.height,animations:metadata.animations});
            const player=this.app.game.player,equipped=type==='class'?player.getSpriteName?.():player.getWeaponName?.();
            if(equipped===name)candidates.push(...CardArtwork.sources(this.app.game,this.app,type==='class'?'avatar':'weapon'));
            if(type!=='class')candidates.push({url:'img/1/item-'+name+'.png'});
            CardArtwork.render(element,candidates,status,{slot:true});
        }
        renderConfirmation(content) {
            const selection=this.selection, product=selection.product, stage=node('section','ps-stage');
            const back=button('‹ Back to shop',()=>{this.selection=null;this.notice=null;this.render();});back.className='ps-back';back.disabled=this.busy||!!this.pending;content.append(back);
            const heading=node('div','ps-stage-heading');heading.append(node('h3','',product.name),node('p','',product.type==='reroll'?'A different trait. Same level and XP.':product.description));stage.append(heading);
            let asset,alternatives=[];
            const controls=node('div','ps-controls');
            if(product.type!=='unlock') {
                const assets=this.data.assets.filter(row=>product.assetTypes.includes(row.type)&&row.traits.includes(row.trait));
                if(!assets.some(row=>row.nftId===selection.nftId))selection.nftId=assets[0]?.nftId || null;
                if(assets.length>1) {
                    const picker=node('fieldset','ps-tile-picker');picker.append(node('legend','','Choose your '+(product.type==='class'?'avatar':'equipment')));
                    const tiles=node('div','ps-choice-tiles');
                    for(const item of assets) {
                        const tile=button('',()=>{selection.nftId=item.nftId;selection.choice=null;this.render();});tile.className='ps-choice-tile';
                        tile.setAttribute('aria-pressed',String(selection.nftId===item.nftId));tile.disabled=this.busy||!!this.pending;
                        const icon=node('div','ps-choice-art');this.renderArtwork(icon,item,product.type);
                        tile.append(icon,node('span','',item.name));tiles.append(tile);
                    }
                    picker.append(tiles);controls.append(picker);
                }
                asset=assets.find(row=>row.nftId===selection.nftId);
                if(asset) {
                    alternatives=asset.traits.filter(trait=>trait!==asset.trait);
                    if(product.type==='class') {
                        if(!alternatives.includes(selection.choice))selection.choice=alternatives[0];
                        const picker=node('fieldset','ps-tile-picker');picker.append(node('legend','','Choose a new class'));
                        const tiles=node('div','ps-choice-tiles ps-class-tiles');
                        for(const value of alternatives) {
                            const tile=button('',()=>{selection.choice=value;this.render();});tile.className='ps-choice-tile';tile.disabled=this.busy||!!this.pending;
                            tile.setAttribute('aria-pressed',String(selection.choice===value));
                            const icon=node('img','ps-choice-art');icon.src='img/classes/'+value+'.png';icon.alt='';
                            tile.append(icon,node('span','',Forge.label(value)));tiles.append(tile);
                        }
                        picker.append(tiles);controls.append(picker);
                    }
                }
            }
            const display=node('div','ps-display'), card=node('div','ps-asset-card');
            const art=node('div','ps-equipment-art'),artStatus=node('span','ps-art-status');
            if(asset) {
                card.append(art,artStatus,node('strong','ps-asset-name',asset.name),node('span','ps-current-trait',Forge.label(asset.trait)));
                this.renderArtwork(art,asset,product.type,artStatus);
            } else if(product.type==='unlock') {
                const reward=this.data.rewards.find(row=>row.id===product.reward);
                card.classList.add('ps-keepsake');card.append(this.rewardArtwork(reward,'ps-reward-symbol'),node('strong','ps-asset-name',reward?.label || product.name));
            } else card.append(node('strong','','Your next transformation'),node('p','','No eligible owned equipment. Borrowed items cannot be permanently changed.'));
            const canvas=node('canvas','ps-fx');canvas.width=400;canvas.height=440;canvas.setAttribute('aria-hidden','true');display.append(card,canvas);stage.append(display);
            const ritual=node('div','ps-ritual');
            if(product.type==='reroll'&&asset) {
                const reel=node('div','ps-reel'),track=node('div','ps-reel-track');reel.setAttribute('aria-hidden','true');
                for(const trait of [alternatives[1] || alternatives[0],asset.trait,alternatives[0]])track.append(node('span','ps-trait-token',Forge.label(trait)));
                reel.append(track,node('span','ps-reel-marker'));ritual.append(reel);
                ritual.append(node('p','ps-outcomes',alternatives.map(Forge.label).join(' or ')+' · equal chance'));
            }
            const status=node('p','ps-ritual-status',product.type==='unlock'?'Permanent · all your avatars':'');status.setAttribute('role','status');ritual.append(status);stage.append(ritual,controls);
            const purchase=node('div','ps-purchase'),owned=product.reward&&this.data.unlocks.includes(product.reward);
            const caption=node('div');caption.append(node('strong','ps-price',product.price+' points'),node('span','ps-after',this.data.balance.available>=product.price?'Leaves '+(this.data.balance.available-product.price)+' points':'Need '+(product.price-this.data.balance.available)+' more'));
            const confirm=button(this.busy?'Forging…':owned?'Already collected':product.type==='reroll'?'Reforge trait':product.type==='class'?'Change class':'Unlock keepsake',()=>{
                this.pending={requestId:crypto.randomUUID(),productId:product.id,nftId:selection.nftId,choice:selection.choice,confirmed:true};this.remember();this.buy();
            });confirm.className='ps-forge-button';
            confirm.disabled=owned||this.busy||!!this.pending||!this.data.canPurchase||this.data.balance.available<product.price||(product.type!=='unlock'&&!asset);
            purchase.append(caption,confirm);stage.append(purchase);
            if(!this.data.canPurchase)stage.append(node('p','ps-visit','Visit the merchant beside the main-map event board to purchase.'));
            content.append(stage);this.stage=stage;this.ritualTraits=alternatives;
        }
        async buy() {
            if(this.busy||!this.pending)return;
            const session=this.app.sessionId, storageKey=this.purchaseStorageKey, request=this.pending;
            this.busy=true;this.error=null;this.render();
            const fx=this.opened&&this.stage ? new Forge.ReforgeFX(this.stage,this.ritualTraits || [],name=>this.app.game.audioManager?.playSound(name)) : null;
            this.fx=fx;
            try {
                const response=await axios.post(this.url('points-store/purchases'),request);
                // Receipt identity is captured before awaiting: never clear another wallet's retry.
                try {localStorage.removeItem(storageKey);} catch (_) {}
                if(session!==this.app.sessionId)return;
                this.pending=null;
                await fx?.settle(response.data.trait || 'Unlocked');
                if(session!==this.app.sessionId)return;
                this.notice=(response.data.trait?'New trait: '+Forge.label(response.data.trait)+'.':'Unlocked! Find it in your collection.')+(response.data.refreshRequired?' Reconnect to apply the confirmed change.':'');
            } catch(error) {
                fx?.stop();
                if(session!==this.app.sessionId)return;
                if(error.response?.status===400){this.pending=null;this.remember();}
                this.error=error.response?.data?.error || 'Purchase not confirmed. Check the same purchase before buying again.';
            } finally {
                fx?.stop();this.busy=false;
                if(session===this.app.sessionId) {
                    const error=this.error;await this.load();if(error){this.error=error;if(this.opened)this.render();}
                }
            }
        }
        progressBar(value,target,label) {
            const count=Math.max(0,Math.min(target,Number(value)||0)),bar=node('div','ps-meter'),fill=node('span','ps-meter-fill');
            bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(target));bar.setAttribute('aria-valuenow',String(count));
            fill.style.width=(target>0?count/target*100:0)+'%';bar.append(fill);return bar;
        }
        renderObjectives(content) {
            const goals=this.data.objectives,spread=node('div','ps-spread'),daily=node('section','ps-page'),weekly=node('section','ps-page');
            daily.append(node('h3','','Daily objectives'),node('p','ps-description','Earn '+goals.dailyReward+(goals.dailyReward===1?' point per challenge.':' points per challenge.')+' Complete all three for '+(goals.dailyReward*goals.daily.length)+' points.'),node('p','ps-footnote','Combat level '+(goals.level || 1)+(goals.locked?' · fixed for today':' · lock when you start')));
            for(const goal of goals.daily) {
                const row=node('div','ps-goal');row.append(node('strong','',goal.label),node('span','',goal.progress+' / '+goal.target),this.progressBar(goal.progress,goal.target,goal.label));daily.append(row);
            }
            daily.append(node('p','ps-footnote','Each challenge rewards once per day, across your avatars.'),node('p','ps-footnote','Resets at 00:00 UTC. Progress refreshes automatically.'));
            weekly.append(node('h3','','Weekly regular'),node('p','ps-description','Complete a daily objective on '+goals.weeklyTarget+' days. Earn '+goals.weeklyReward+' extra points.'));
            const stamps=node('div','ps-stamps');
            for(let i=0;i<goals.weeklyTarget;i++){const stamp=node('span',i<goals.weeklyDays?'ps-stamp ps-stamped':'ps-stamp',i<goals.weeklyDays?'✓':String(i+1));stamp.setAttribute('aria-label','Day '+(i+1)+(i<goals.weeklyDays?' completed':' remaining'));stamps.append(stamp);}
            weekly.append(stamps,this.progressBar(goals.weeklyDays,goals.weeklyTarget,'Weekly objective days'),node('p','ps-footnote',Math.min(goals.weeklyDays,goals.weeklyTarget)+' of '+goals.weeklyTarget+' days completed · resets Monday'),node('h3','','Make a habit of it'),node('p','ps-description','Days do not need to be consecutive. Your active-day and streak points still count.'),node('p','ps-footnote','Progress is saved to your wallet. Play, fish or harvest to fill the daily bars.'));
            spread.append(daily,weekly);content.append(spread);
        }
        renderRewards(content) {
            const spread=node('div','ps-spread'),ownedPage=node('section','ps-page'),eventPage=node('section','ps-page');
            ownedPage.append(node('h3','','Your collection'));
            const titles=this.data.rewards.filter(reward=>reward.type==='title'&&this.data.unlocks.includes(reward.id));
            const titleTiles=node('div','ps-title-tiles');
            for(const title of [{id:null,label:'No title'},...titles]) {
                const tile=button('',async()=>{
                    if(this.titleBusy)return;
                    this.titleBusy=true;this.render();
                    try {await axios.put(this.url('rewards/title'),{title:title.id});this.notice='Title updated.';await this.load();}
                    catch(error){this.error=error.response?.data?.error || 'Title could not be confirmed.';}
                    finally{this.titleBusy=false;this.render();}
                });
                tile.className='ps-title-tile';tile.disabled=!!this.titleBusy;tile.setAttribute('aria-pressed',String((this.data.selectedTitle || null)===title.id));
                tile.append(node('span','ps-title-mark',title.id?'Aa':'—'),node('span','',title.label));titleTiles.append(tile);
            }
            ownedPage.append(titleTiles,node('h3','','Avatar trails'));
            const trailTiles=node('div','ps-title-tiles');
            for(const trail of [{id:null,label:'No trail'},...this.data.rewards.filter(row=>row.type==='trail'&&this.data.unlocks.includes(row.id))]) {
                const tile=button('',async()=>{
                    if(this.trailBusy)return;
                    this.trailBusy=true;this.render();
                    try {await axios.put(this.url('rewards/trail'),{trail:trail.id});this.notice=trail.id?'Trail equipped.':'Trail removed.';await this.load();}
                    catch(error){this.error=error.response?.data?.error || 'Trail could not be confirmed.';}
                    finally{this.trailBusy=false;this.render();}
                });
                tile.className='ps-title-tile';tile.disabled=!!this.trailBusy;tile.setAttribute('aria-pressed',String((this.data.selectedTrail || null)===trail.id));
                tile.append(trail.id?this.rewardArtwork(trail,'ps-trail-preview'):node('span','ps-title-mark','—'),node('span','',trail.label));trailTiles.append(tile);
            }
            ownedPage.append(trailTiles,node('p','ps-footnote','Equip a trail here after buying it. Trails follow all your avatars.'),node('h3','','Emotes'));
            eventPage.append(node('h3','','Event keepsakes'),node('p','ps-description','Some things you have to be there for. These emotes are reserved for events.'));
            for(const reward of this.data.rewards.filter(row=>row.type==='emote')) {
                const owned=this.data.unlocks.includes(reward.id),row=node('article','ps-reward-row');
                const text=node('div');text.append(node('strong','',reward.label),node('span','ps-footnote',owned?'Unlocked':reward.source==='event'?'Event exclusive · not for sale':'Available in the shop'));
                row.append(node('span','ps-emote',reward.symbol),text);(reward.source==='event'?eventPage:ownedPage).append(row);
            }
            ownedPage.append(node('p','ps-footnote','Unlocked emotes are in your emote menu.'));
            eventPage.append(node('p','ps-footnote','Permanent unlocks stay with your wallet, across all your avatars.'));
            spread.append(ownedPage,eventPage);content.append(spread);
        }
        disconnect() {clearInterval(this.timer);this.close();}
    }
    return PointsStore;
});
