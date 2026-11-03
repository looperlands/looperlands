/* Local visual study. No production gameplay, accounts or purchase APIs. */
(async function(){
    const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
    const sim=new FxPlayground.Playground(),images={},sprites={},sheets={};
    const floor=document.createElement('canvas'),keys=new Set();
    let manifest,ready=false,previous=null,lastRepeat=0,repeatAction='critical',destination=null;
    let effects=[],departures=[],arrivals=[],lastHit=null,lastMeasure=0,frames=0,moving=false;
    const reduced=()=>$('reduced').checked;
    const status=text=>{$('status').textContent=text;};
    const loadImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load '+url));image.src=url;});
    const json=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Could not load '+url);return r.json();};
    const point=(x,y)=>[Math.round(x),Math.round(y)];
    function label(text,x,y,color='#fff1d0',size=7){
        ctx.save();ctx.font=size+'px GraphicPixel';ctx.textAlign='center';ctx.lineWidth=2;
        ctx.strokeStyle='#211b20';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
    }
    function sprite(context,name,x,y,direction='right',action='idle',time=sim.time){
        const data=sprites[name],image=images[name];if(!data||!image)return;
        const orientation=direction==='left'?'right':direction;
        const animation=data.animations[action+'_'+orientation]||data.animations['idle_'+orientation]||data.animations.idle;
        if(!animation)return;
        const frame=action==='atk'?Math.min(animation.length-1,Math.floor(time/65)+1):Math.floor(time/(action==='walk'?110:450))%animation.length;
        context.save();context.translate(Math.round(x-8),Math.round(y-12));
        if(direction==='left'){context.translate(16,0);context.scale(-1,1);}
        context.drawImage(image,frame*data.width,animation.row*data.height,data.width,data.height,data.offset_x||0,data.offset_y||0,data.width,data.height);
        context.restore();
    }
    function actor(context,x,y,direction,action,time,pet=false){
        if(pet){sprite(context,'browndog',x,y,direction,action,time);return;}
        if(direction==='up')sprite(context,$('weapon').value,x,y,direction,action,time);
        sprite(context,$('avatar').value,x,y,direction,action,time);
        if(direction!=='up')sprite(context,$('weapon').value,x,y,direction,action,time);
    }
    function capture(pet=false){
        const image=document.createElement('canvas');image.width=80;image.height=80;
        actor(image.getContext('2d'),40,65,sim.player.direction,'idle',0,pet);
        const ghost=document.createElement('canvas');ghost.width=80;ghost.height=80;
        const mask=ghost.getContext('2d');mask.drawImage(image,0,0);mask.globalCompositeOperation='source-in';
        mask.fillStyle='#c3efff';mask.fillRect(0,0,80,80);
        return {image,ghost};
    }
    function addEffect(style,x,y,options={}){
        if(!manifest.effects[style]||reduced())return;
        effects.push({style,x,y,at:sim.time,flip:sim.player.x>x,...options});
        if(effects.length>48)effects.splice(0,effects.length-48);
        const data=manifest.effects[style],scale=$('size').value==='native'?1:data.scale*Number($('size').value);
        $('dimensions').textContent=style+' · '+data.width+'×'+data.height+' → '+Math.round(data.width*scale)+'×'+Math.round(data.height*scale)+' world px';
    }
    function drain(){
        for(const event of sim.drain()){
            if(event.type==='impact'){
                addEffect(event.style,event.x,event.y);lastHit={at:sim.time,x:event.x,y:event.y};
                status(event.style==='none'?'Original weapon animation; added effect off.':event.style+' impact · cosmetic overlay, simulated hit.');
            }
            if(event.type==='miss')status('Move closer to the skeleton to land a hit.');
            if(event.type==='death'){
                departures.push({...event,...capture()});status('Player departure · enemy artwork is unchanged. Press Respawn to return.');
            }
            if(event.type==='arrival'){
                departures=[];effects=[];arrivals.push({...event});
                if(event.style==='poof')addEffect('poof',event.x,event.y);
                status('Arrival: '+event.style+'.');
            }
            if(event.type==='hurt')status('Trap hit · −'+event.amount+' HP. Reset or Respawn restores health.');
            if(event.type==='hazard')status('Warning: '+event.hazard.kind+'. Move off the marked tiles.');
            if(event.type==='charge')status('Sidestep the gold marker, then return to the skeleton for an automatic counter.');
            if(event.type==='opening')status('Dodged! Return next to the skeleton within 1.25 seconds.');
            if(event.type==='automatic-counter')status('Automatic counter confirmed — no extra attack button.');
            if(event.type==='frozen'){addEffect('frost',sim.enemy.x,sim.enemy.y);status('Enemy frozen for 3 seconds · frost counter cooldown 10 seconds.');}
        }
    }
    function action(name,record=true){
        if(!ready)return;
        if(record){repeatAction=name;lastRepeat=sim.time;}
        sim.counterStyle=$('counter').value;sim.frostCounter=$('frost-counter').checked;
        if(name==='hit')sim.attack($('impact').value);
        if(name==='critical')sim.attack('critical',true);
        if(name==='counter')sim.counter($('counter').value,$('frost-counter').checked);
        if(name==='charge')sim.charge();
        if(name==='freeze'){
            if(sim.time<sim.freezeReady)status('Frost counter is cooling down: '+Math.ceil((sim.freezeReady-sim.time)/1000)+'s.');
            else sim.counter('frost',true);
        }
        if(name==='death'){
            if(sim.player.dead){sim.respawn($('arrival').value);drain();}
            sim.die($('death').value);
        }
        if(name==='arrival')sim.respawn($('arrival').value);
        if(['pillar','meteor','flamethrower'].includes(name))sim.hazard(name);
        if(name==='companion'){
            const x=sim.player.x-28,y=sim.player.y+8;
            sim.companion=!sim.companion;
            if(sim.companion){arrivals.push({x,y,at:sim.time,style:$('arrival').value});if($('arrival').value==='poof')addEffect('poof',x,y);}
            else departures.push({x,y,at:sim.time,style:$('death').value,...capture(true)});
            $('companion').textContent=sim.companion?'Dismiss companion':'Summon companion';
            status(sim.companion?'Companion arrived.':'Companion departure using its own sprite.');
        }
        drain();canvas.focus({preventScroll:true});
    }
    function drawSheet(effect){
        const data=manifest.effects[effect.style],age=sim.time-effect.at;
        const duration=effect.duration||data.duration;
        if(age<0||(!effect.loop&&age>=duration)||reduced())return;
        const fraction=effect.loop?(age%duration)/duration:Math.min(.9999,age/duration);
        const frame=Math.min(data.frames-1,Math.floor(fraction*data.frames));
        const scale=$('size').value==='native'?1:data.scale*Number($('size').value);
        const width=Math.max(1,Math.round(data.width*scale)),height=Math.max(1,Math.round(data.height*scale));
        ctx.save();ctx.translate(...point(effect.x,effect.y));
        if(effect.flip)ctx.scale(-1,1);
        ctx.drawImage(sheets[effect.style],frame%data.columns*data.width,Math.floor(frame/data.columns)*data.height,data.width,data.height,
            -Math.round(data.origin[0]*scale),-Math.round(data.origin[1]*scale),width,height);
        ctx.restore();
    }
    function drawDeparture(event){
        const age=sim.time-event.at,duration=reduced()?180:1000,p=Math.max(0,Math.min(1,age/duration));
        if(p>=1)return;
        ctx.save();ctx.translate(Math.round(event.x-40),Math.round(event.y-65));
        if(reduced()){ctx.globalAlpha=1-p;ctx.drawImage(event.image,0,0);ctx.restore();return;}
        if(event.style==='soul'){
            ctx.globalAlpha=1-p;ctx.drawImage(event.image,0,0);
            ctx.globalAlpha=Math.sin(p*Math.PI)*.65;
            ctx.drawImage(event.ghost,0,-Math.round(p*32));
        }else{
            for(let y=0;y<80;y+=2)for(let x=0;x<80;x+=2){
                const rank=((x*17+y*31)%101)/101;
                if(event.style==='embers'){
                    if(rank<p)continue;
                    const edge=rank-p<.15;
                    ctx.globalAlpha=edge?.8:1;
                    ctx.drawImage(event.image,x,y,2,2,x+Math.round(Math.sin(x+y)*p*7),y-Math.round(edge?p*12:0),2,2);
                }else{
                    ctx.globalAlpha=1-p;
                    ctx.drawImage(event.image,x,y,2,2,x+Math.round((x-40)*p*1.2),y+Math.round((rank*32-25)*p+28*p*p),2,2);
                }
            }
        }
        ctx.restore();
        for(let i=0;i<16;i++){
            const a=i*2.399,d=4+p*18;
            ctx.globalAlpha=(1-p)*.8;ctx.fillStyle=event.style==='embers'?(i%2?'#ffb546':'#ffe7a9'):'#b9edff';
            ctx.fillRect(Math.round(event.x+Math.cos(a)*d),Math.round(event.y-10+Math.sin(a)*d*.6-p*15),1,2);
        }
        ctx.globalAlpha=1;
    }
    function drawArrival(event){
        if(event.style==='poof')return;
        const age=sim.time-event.at,p=age/(reduced()?180:800);if(p<0||p>=1)return;
        ctx.save();ctx.translate(...point(event.x,event.y));ctx.globalAlpha=1-p;
        if(event.style==='portal'){
            ctx.strokeStyle='#c7b4ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,8+p*18,3+p*7,0,0,Math.PI*2);ctx.stroke();
            if(!reduced())for(let i=0;i<8;i++){
                const a=i*Math.PI/4+age/300;ctx.fillStyle='#ede3ff';ctx.fillRect(Math.round(Math.cos(a)*(8+p*18)),Math.round(Math.sin(a)*(3+p*7)-p*15),1,2);
            }
        }else{
            ctx.fillStyle='#e1fff6';ctx.globalAlpha=(1-p)*.3;ctx.fillRect(-7,-70,14,72);
            ctx.globalAlpha=1-p;ctx.fillRect(-1,-70,2,72);ctx.fillRect(-12,-Math.round(p*32),24,2);
        }
        ctx.restore();
    }
    function tileMark(tile,active,progress){
        const [x,y]=point(tile.x-8,tile.y-8);ctx.save();
        ctx.globalAlpha=active?.32:.12+progress*.12;ctx.fillStyle=active?'#ff5f30':'#ffd36e';ctx.fillRect(x,y,16,16);
        ctx.globalAlpha=1;ctx.strokeStyle=active?'#ff9c60':'#ffdc85';ctx.lineWidth=1;
        ctx.strokeRect(x+.5,y+.5,15,15);ctx.restore();
    }
    function drawHazards(){
        for(const h of sim.hazards){
            const center=h.tiles[Math.floor(h.tiles.length/2)],active=sim.time>=h.impactAt&&sim.time<h.until;
            if(sim.time<h.until)h.tiles.forEach(tile=>tileMark(tile,active,(sim.time-h.at)/(h.impactAt-h.at)));
            if(h.kind==='meteor')drawSheet({style:'meteor',x:center.x,y:center.y,at:h.impactAt-manifest.effects.meteor.impact});
            if(h.kind==='pillar')drawSheet({style:'pillar',x:center.x,y:center.y,at:h.impactAt});
            if(h.kind==='flamethrower'&&active)drawSheet({style:'flamethrower',x:h.tiles[0].x-8,y:center.y,at:h.impactAt,loop:true});
            if(sim.time<h.impactAt)label((Math.max(0,h.impactAt-sim.time)/1000).toFixed(1),center.x,center.y-14,'#ffdf8b');
        }
        if(sim.enemyCharge){
            tileMark(sim.enemyCharge,false,1-(sim.enemyCharge.until-sim.time)/1000);
            label('DODGE',sim.enemyCharge.x,sim.enemyCharge.y-32,'#ffe39a');
        }
    }
    function shadow(x,y){ctx.globalAlpha=.5;ctx.drawImage(images.shadow16,...point(x-8,y-8));ctx.globalAlpha=1;}
    function drawScene(){
        ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,384,240);ctx.imageSmoothingEnabled=false;
        ctx.drawImage(floor,480,400,384,240,0,0,384,240);
        const p=sim.player,e=sim.enemy,attackAge=sim.time-sim.attackAt,attack=attackAge>=0&&attackAge<300;
        const frozen=e.frozenUntil>sim.time;
        if(!p.dead){shadow(p.x,p.y);actor(ctx,p.x,p.y,p.direction,attack?'atk':moving?'walk':'idle',attack?attackAge:sim.time);}
        shadow(e.x,e.y);sprite(ctx,'skeleton',e.x,e.y,'left','idle',frozen?e.frozenUntil-3000:sim.time);
        if(sim.companion){shadow(p.x-28,p.y+8);actor(ctx,p.x-28,p.y+8,'right','idle',sim.time,true);}
        if($('night').checked){ctx.fillStyle='rgba(8,13,35,.63)';ctx.fillRect(0,0,384,240);}
        drawHazards();
        for(const effect of effects)drawSheet(effect);
        for(const event of departures)drawDeparture(event);
        for(const event of arrivals)drawArrival(event);
        if(frozen){
            ctx.save();ctx.fillStyle='rgba(126,207,255,.25)';ctx.strokeStyle='#a6e4ff';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(e.x-13,e.y+1);ctx.lineTo(e.x-16,e.y-25);ctx.lineTo(e.x-4,e.y-36);ctx.lineTo(e.x+14,e.y-28);ctx.lineTo(e.x+15,e.y);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
            label('FROZEN '+((e.frozenUntil-sim.time)/1000).toFixed(1)+'s',e.x,e.y-40,'#c4efff',6);
        }
        if($('roof').checked){
            ctx.fillStyle='#293e29';ctx.fillRect(126,90,128,35);ctx.fillStyle='#375539';
            for(let i=0;i<8;i++)ctx.fillRect(126+i*16,90+(i%2)*3,16,20);
            ctx.fillStyle='#192a20';ctx.fillRect(126,123,128,4);label('OVERHEAD CANOPY',190,102,'#d7dec7',6);
        }
        if(!p.dead)label('You',p.x,p.y-34,'#fff0ce',6);
        if(!frozen)label('Practice skeleton',e.x,e.y-34,'#d1c3a4',6);
        if(lastHit&&!frozen&&sim.time-lastHit.at<500){
            const age=sim.time-lastHit.at;label('HIT',lastHit.x,lastHit.y-40-(reduced()?0:age/60),'#ffe1a1',7);
        }
        if(p.dead&&sim.time-sim.deadAt>1000)label('Press Respawn to return',192,200,'#f5d2a0',8);
        if(destination){ctx.strokeStyle='#c5cfaa';ctx.strokeRect(Math.round(destination.x)-3,Math.round(destination.y)-3,6,6);}
    }
    function frame(now){
        const dt=previous===null?0:Math.min(60,now-previous);previous=now;
        const rate=Number($('timing').value),delta=document.hidden?0:dt*rate;
        if(ready){
            let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
            let dy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
            if(dx||dy)destination=null;
            else if(destination){dx=destination.x-sim.player.x;dy=destination.y-sim.player.y;if(Math.hypot(dx,dy)<3){destination=null;dx=dy=0;}}
            moving=!!(dx||dy)&&!sim.player.dead&&rate>0;sim.move(dx,dy,delta);
            sim.counterStyle=$('counter').value;sim.frostCounter=$('frost-counter').checked;
            sim.update(delta);drain();
            if($('repeat').checked&&sim.time-lastRepeat>1800){lastRepeat=sim.time;action(repeatAction,false);}
            effects=effects.filter(e=>sim.time-e.at<(e.duration||manifest.effects[e.style].duration));
            departures=departures.filter(e=>sim.time-e.at<1100);arrivals=arrivals.filter(e=>sim.time-e.at<1000);
            drawScene();frames++;
            if(now-lastMeasure>500){
                $('fps').textContent=Math.round(frames*1000/(now-lastMeasure))+' FPS';frames=0;lastMeasure=now;
                $('health').textContent=sim.player.hp+' HP';$('health').style.color=sim.player.hp<40?'#ff9c80':'';
                $('active').textContent=effects.length+' burst effects · '+sim.hazards.length+' traps';
                $('freeze').textContent=sim.time<sim.freezeReady?'Frost counter ready in '+Math.ceil((sim.freezeReady-sim.time)/1000)+'s':'Frost counter ready';
            }
        }
        requestAnimationFrame(frame);
    }
    function reset(){sim.reset();effects=[];departures=[];arrivals=[];destination=null;lastHit=null;lastRepeat=0;keys.clear();$('companion').textContent='Summon companion';$('repeat').checked=false;status('Ready · try a critical hit, or dodge a trap.');canvas.focus({preventScroll:true});}
    document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>action(button.dataset.action)));
    $('reset').addEventListener('click',reset);
    $('crowd').addEventListener('click',()=>{
        for(let i=0;i<12;i++)addEffect($('counter').value,72+(i%6)*48,95+Math.floor(i/6)*70,{at:sim.time+(i%3)*80,flip:false});
        status('12 simultaneous effects · watch readability and frame rate.');canvas.focus({preventScroll:true});
    });
    for(const id of ['impact','counter','death','arrival'])$(id).addEventListener('change',()=>action({impact:'hit',counter:'counter',death:'death',arrival:'arrival'}[id]));
    $('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('reduced').addEventListener('change',()=>{effects=[];status('Reduced motion '+(reduced()?'on: dangerous tile warnings and freeze state remain visible.':'off.'));});
    canvas.addEventListener('pointerdown',event=>{
        const box=canvas.getBoundingClientRect();destination={x:(event.clientX-box.left)/box.width*384,y:(event.clientY-box.top)/box.height*240};canvas.focus({preventScroll:true});
    });
    const actionKeys={Space:'hit',KeyC:'critical',KeyE:'counter',KeyF:'freeze',KeyQ:'charge'};
    document.addEventListener('keydown',event=>{
        if(['INPUT','SELECT','BUTTON','A'].includes(event.target.tagName))return;
        if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
        if(event.repeat)return;
        if(actionKeys[event.code]){event.preventDefault();action(actionKeys[event.code]);}
        if(event.code==='KeyR'){event.preventDefault();reset();}
    });
    document.addEventListener('keyup',event=>keys.delete(event.code));
    window.addEventListener('blur',()=>{keys.clear();destination=null;previous=null;});
    document.addEventListener('visibilitychange',()=>{keys.clear();previous=null;});
    try{
        manifest=await json('assets/manifest.json');
        const names=['clotharmor','leatherarmor','platearmor','sword1','axe','bluesword','NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741','skeleton','browndog'];
        const [map]=await Promise.all([
            json('/opendesign/mockups/social-chat/assets/town.json'),
            ...names.map(async name=>{[images[name],sprites[name]]=await Promise.all([loadImage('/client/img/1/'+name+'.png'),json('/client/sprites/'+name+'.json')]);}),
            ...['shadow16','tilesheet_main'].map(async name=>{images[name]=await loadImage('/client/img/1/'+name+'.png');}),
            ...Object.keys(manifest.effects).map(async name=>{sheets[name]=await loadImage('assets/'+name+'.png');}),document.fonts.ready
        ]);
        floor.width=map.width*16;floor.height=map.height*16;
        const context=floor.getContext('2d');context.imageSmoothingEnabled=false;
        map.data.forEach((tile,index)=>{for(let id of Array.isArray(tile)?tile:[tile]){if(!id)continue;id--;context.drawImage(images.tilesheet_main,id%map.columns*16,Math.floor(id/map.columns)*16,16,16,index%map.width*16,Math.floor(index/map.width)*16,16,16);}});
        ready=true;reset();requestAnimationFrame(frame);
    }catch(error){status(error.message+'. Restart with node bin/local-pixelfx-preview.js and reload.');}
})();
