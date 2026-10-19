/* Standalone presentation study. Damage and actors are simulated; assets are from this checkout. */
(async function () {
    const $ = id => document.getElementById(id);
    const canvases = [$('baseline'), $('enhanced')];
    const contexts = canvases.map(canvas => canvas.getContext('2d'));
    const toggles = ['flash', 'particles', 'recoil', 'shake', 'freeze', 'squash', 'slash', 'trail', 'layered', 'shatter'];
    const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
    $('reduced').checked = reducedPreference.matches;
    const images = {};
    const tinted = new Map();
    let ready = false, simTime = 0, lastTime = null, hit = null, nextHit = Infinity, hits = 0, combo = 0;
    let audioContext, buffers = [], audioReady = null;
    const loadImage = name => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { images[name] = img; resolve(); };
        img.onerror = () => reject(new Error('Could not load ' + name));
        img.src = '/client/img/1/' + name + '.png';
    });
    const getOptions = () => Object.fromEntries([...toggles, 'reduced'].map(id => [id, $(id).checked]));
    const config = () => HitFeel.presets[$('preset').value];
    const floor = document.createElement('canvas');
    const baselineConfig = {flash:75, sparks:8, recoil:2, shake:2, freeze:0};
    function updateLabels() {
        const c = config(), reduced = $('reduced').checked;
        $('preset-label').textContent = $('preset').selectedOptions[0].textContent;
        for (const key of ['flash','particles','recoil','shake','freeze']) {
            const units = {flash:c.flash+' ms', particles:c.sparks+' sparks', recoil:c.recoil+' px', shake:c.shake+' px', freeze:c.freeze+' ms'};
            $(key+'-value').value = !$(key).checked ? 'Off' : reduced && key !== 'flash' ? 'Reduced' : units[key];
        }
    }
    async function prepareAudio() {
        if (!audioReady) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioReady = Promise.all(['hit1', 'hit2'].map(async name => {
                const response = await fetch('/client/audio/sounds/' + name + '.mp3');
                if (!response.ok) throw new Error('Sound file unavailable');
                return audioContext.decodeAudioData(await response.arrayBuffer());
            })).then(decoded => { buffers = decoded; });
        }
        await audioContext.resume();
        await audioReady;
    }
    function sound(critical) {
        if (!$('sound').checked || !buffers.length || audioContext.state !== 'running') return;
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        source.buffer = buffers[hits % buffers.length];
        source.playbackRate.value = ($('layered').checked ? 1+Math.min(4,combo-1)*.06 : 1) * (critical ? .88 : 1);
        gain.gain.value = .35;
        source.connect(gain).connect(audioContext.destination);
        source.start();
        if ($('layered').checked) {
            const bass = audioContext.createOscillator(), envelope = audioContext.createGain(), now = audioContext.currentTime;
            bass.frequency.setValueAtTime(critical?110:90,now);bass.frequency.exponentialRampToValueAtTime(38,now+.1);
            envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(.24,now+.004);envelope.gain.exponentialRampToValueAtTime(.001,now+.12);
            bass.connect(envelope).connect(audioContext.destination);bass.start(now);bass.stop(now+.13);
        }
    }
    function attack(critical = false, finisher = false) {
        if (!ready) return;
        // Repeated input cannot create duplicate hits before the current contact is reached.
        if (hit && simTime-hit.start < 350) return;
        combo = hit && simTime-hit.start < 1600 ? Math.min(5,combo+1) : 1;
        hit = {start:simTime, critical, finisher, sounded:false};
        nextHit = simTime + 1250;
        $('status').textContent = (finisher ? 'Finisher' : critical ? 'Critical hit' : 'Normal hit') + ' · contact in 120 ms · ' + ($('slow').checked ? '¼ speed' : 'normal speed');
    }
    function drawSprite(ctx, name, frame, row, width, height, x, y, flip = false, flash = null) {
        let source = images[name], sx = frame * width, sy = row * height;
        if (flash) {
            const key = name + ':' + frame + ':' + row + ':' + flash;
            if (!tinted.has(key)) {
                const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
                const m = mask.getContext('2d');
                m.drawImage(source,sx,sy,width,height,0,0,width,height);
                m.globalCompositeOperation = 'source-in'; m.fillStyle = flash; m.fillRect(0,0,width,height);
                tinted.set(key,mask);
            }
            source = tinted.get(key); sx = sy = 0;
        }
        ctx.save();
        if (flip) { ctx.translate(x + width, y); ctx.scale(-1,1); x = y = 0; }
        ctx.drawImage(source,sx,sy,width,height,Math.round(x),Math.round(y),width,height);
        ctx.restore();
    }
    function label(ctx, text, x, y, color = '#fff1d0', size = 7) {
        ctx.font = size + 'px GraphicPixel'; ctx.textAlign = 'center';
        ctx.lineWidth = 2; ctx.strokeStyle = '#211b20'; ctx.strokeText(text,x,y);
        ctx.fillStyle = color; ctx.fillText(text,x,y);
    }
    function drawScene(ctx, enhanced) {
        const elapsed = hit ? simTime - hit.start : -1000;
        const age = elapsed - 120, critical = Boolean(hit?.critical);
        const options = enhanced ? getOptions() : {flash:true,particles:true,recoil:true,shake:critical,freeze:false,reduced:$('reduced').checked};
        options.kill = Boolean(hit?.finisher);
        const c = enhanced ? config() : baselineConfig;
        const effect = HitFeel.sample(age,c,options,enhanced && critical);
        if (!enhanced) {
            effect.recoil = !options.reduced && age>=0 && age<160 ? Math.round(2*Math.pow(1-age/160,2)) : 0;
            effect.shakeX = options.shake && !options.reduced && age>=0 && age<180 ? Math.round(Math.cos(age/13)*2*(1-age/180)) : 0;
            effect.shakeY = options.shake && !options.reduced && age>=0 && age<180 ? Math.round(Math.sin(age/17+1)*2*(1-age/180)*.65) : 0;
        }
        const poseElapsed = age >= 0 && effect.active ? 120 + effect.poseAge : elapsed;
        const attacking = elapsed >= 0 && poseElapsed < 350;
        const swingFrame = attacking ? Math.min(4, Math.floor(poseElapsed / 60)) : Math.floor(simTime/600)%2;
        ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,384,232); ctx.imageSmoothingEnabled = false;
        ctx.scale(2,2); ctx.save(); ctx.translate(effect.shakeX,effect.shakeY);
        ctx.drawImage(floor,560,460,192,116,0,0,192,116);
        // Planted shadows make sprite-only recoil visible without suggesting movement through a tile.
        ctx.globalAlpha=.65;
        ctx.drawImage(images.shadow16,0,0,16,16,77,70,16,16);
        ctx.drawImage(images.shadow16,0,0,16,16,105,70,16,16);
        ctx.globalAlpha=1;
        drawSprite(ctx,'clotharmor',swingFrame,attacking?0:2,32,32,69,55);
        drawSprite(ctx,'sword1',swingFrame,attacking?0:2,48,48,61,47);
        const mobFrame = Math.floor((effect.frozen ? hit.start+120 : simTime)/600)%2;
        const shattering = enhanced && hit?.finisher && age>=65 && options.shatter && !options.reduced;
        const defeated = hit?.finisher && age>=0;
        ctx.save();
        if (shattering) {
            const progress=Math.min(1,(age-65)/500);
            ctx.globalAlpha=1-progress;
            ctx.translate(137+effect.recoil,43);ctx.scale(-1,1);
            for(let y=0;y<48;y+=4)for(let x=0;x<48;x+=4){
                const seed=(x*17+y*31)%19, velocity=(x-24)*1.7;
                ctx.drawImage(images.ogre,mobFrame*48+x,96+y,4,4,Math.round(x+velocity*progress),Math.round(y-(12+seed)*progress+52*progress*progress),4,4);
            }
        } else {
            if(defeated)ctx.globalAlpha=1-Math.min(1,Math.max(0,age-100)/450);
            const squash=HitFeel.squash(age,enhanced&&options.squash,options.reduced);
            ctx.translate(113+effect.recoil,86);ctx.scale(squash.x,squash.y);ctx.translate(-113-effect.recoil,-86);
            drawSprite(ctx,'ogre',mobFrame,2,48,48,89+effect.recoil,43,true,effect.flash?(enhanced?'#fff2cf':'#ff8686'):null);
        }
        ctx.restore();
        if(enhanced && options.slash && !options.reduced && age>=-30 && age<110){
            const progress=(age+30)/140;
            ctx.save();ctx.globalAlpha=1-progress;ctx.lineWidth=3;ctx.strokeStyle='#fff2bf';
            ctx.beginPath();ctx.arc(86,68,19,-1.4+progress*.9,.8+progress*.9);ctx.stroke();
            ctx.lineWidth=1;ctx.strokeStyle='#ffb13b';ctx.beginPath();ctx.arc(86,68,22,-1.2+progress*.9,.6+progress*.9);ctx.stroke();ctx.restore();
        }
        const hp = age >= 0 ? hit?.finisher ? 0 : critical ? .43 : .7 : 1;
        ctx.fillStyle='#251e22';ctx.fillRect(97,36,32,5);
        ctx.fillStyle='#4c3437';ctx.fillRect(98,37,30,3);
        if(enhanced && options.trail){ctx.fillStyle='#fff2d7';ctx.fillRect(98,37,Math.round(30*HitFeel.healthTrail(age,hp)),3);}
        ctx.fillStyle='#c36447';ctx.fillRect(98,37,Math.round(30*hp),3);
        label(ctx,'Wanderer',85,50,'#fff1d0',6);
        label(ctx,'Ogre',113,32,'#fff1d0',6);
        if (effect.particles) {
            const progress = effect.particleAge / (enhanced ? 280 : 220);
            if (progress < 1) {
                ctx.globalAlpha = 1-progress;
                for (let i=0;i<effect.particles;i++) {
                    const angle = i / effect.particles * Math.PI*2;
                    const distance = enhanced ? 3+(1-Math.pow(1-progress,3))*(critical?22:16) : 3+(1-Math.pow(1-progress,2))*7;
                    const x = Math.round(104+Math.cos(angle)*distance);
                    const y = Math.round(65+Math.sin(angle)*distance*.7+(enhanced?progress*progress*8:0));
                    const size = progress < .5 ? 2 : 1;
                    ctx.fillStyle='#593526';ctx.fillRect(x-1,y-1,size+2,size+2);
                    ctx.fillStyle=i%3===0?'#fff2bf':'#ffb13b';ctx.fillRect(x,y,size,size);
                }
                if (progress < .25) {
                    ctx.fillStyle='#fff2bf';ctx.fillRect(101,64,7,3);ctx.fillRect(103,62,3,7);
                }
                ctx.globalAlpha=1;
            }
        }
        if (age>=0 && age<650) {
            const numberAge = $('reduced').checked ? 0 : enhanced ? effect.poseAge : age;
            const bounce=enhanced&&!options.reduced?Math.sin(Math.min(1,numberAge/350)*Math.PI)*4:0;
            label(ctx,hit?.finisher?'96!':critical?'48!':'24',113+effect.recoil,28-Math.min(14,numberAge/35)-bounce,critical?'#fce045':'#fff2d7',enhanced&&critical?11:8);
        }
        ctx.restore();
        if(enhanced && hit && age>=0 && age<850 && combo>1)label(ctx,combo+' HIT COMBO',155,13,'#fce045',6);
        if (enhanced && effect.frozen) {
            ctx.fillStyle='#251e22';ctx.fillRect(62,101,68,11);
            label(ctx,'IMPACT HOLD',96,109,'#fce045',6);
        }
        if (!hit) label(ctx,'Click or press Space to strike',96,107,'#fff2d7',6);
    }
    function frame(time) {
        const delta = lastTime === null ? 0 : Math.min(50,time-lastTime); lastTime=time;
        if (!document.hidden) simTime += delta * ($('slow').checked ? .25 : 1);
        if (ready) {
            if (hit && !hit.sounded && simTime >= hit.start+120) {
                hit.sounded=true; hits++; sound(hit.critical);
                $('status').textContent=(hit.finisher?'Finisher':hit.critical?'Critical':'Normal')+' hit confirmed · simulated damage '+(hit.finisher?'96':hit.critical?'48':'24')+' · combo '+combo;
            }
            if ($('loop').checked && simTime >= nextHit) attack(hits%3===2,hits%6===5);
            contexts.forEach((ctx,index)=>drawScene(ctx,index===1));
        }
        requestAnimationFrame(frame);
    }
    $('attack').addEventListener('click',()=>attack());
    $('critical').addEventListener('click',()=>attack(true));
    $('finisher').addEventListener('click',()=>attack(true,true));
    canvases.forEach(canvas=>canvas.addEventListener('click',()=>attack()));
    document.addEventListener('keydown',event=>{
        if (event.repeat || ['INPUT','SELECT','BUTTON','A'].includes(event.target.tagName)) return;
        if (['Space','KeyC','KeyF'].includes(event.code)) {event.preventDefault();attack(event.code!=='Space',event.code==='KeyF');}
    });
    $('loop').addEventListener('change',()=>{if($('loop').checked)attack();});
    $('sound').addEventListener('change',async()=>{
        if (!$('sound').checked) return;
        try {await prepareAudio(); $('status').textContent='Sound enabled · LooperLands hit1 / hit2 samples';}
        catch {$('sound').checked=false; $('status').textContent='Sound could not start. Toggle Sound to try again.';audioReady=null;}
    });
    for (const id of [...toggles,'preset','reduced']) $(id).addEventListener('change',()=>{updateLabels();attack();});
    reducedPreference.addEventListener('change',event=>{$('reduced').checked=event.matches;updateLabels();});
    document.addEventListener('visibilitychange',()=>{lastTime=null;});
    try {
        const [map] = await Promise.all([
            fetch('/opendesign/mockups/social-chat/assets/town.json').then(response=>{if(!response.ok)throw new Error('Map unavailable');return response.json();}),
            ...['clotharmor','sword1','ogre','shadow16','tilesheet_main'].map(loadImage),document.fonts.ready
        ]);
        floor.width=map.width*16;floor.height=map.height*16;
        const ctx=floor.getContext('2d');ctx.imageSmoothingEnabled=false;
        map.data.forEach((tile,i)=>{for(let id of Array.isArray(tile)?tile:[tile]){if(!id)continue;id--;ctx.drawImage(images.tilesheet_main,id%map.columns*16,Math.floor(id/map.columns)*16,16,16,i%map.width*16,Math.floor(i/map.width)*16,16,16);}});
        ready=true;$('attack').disabled=$('critical').disabled=$('finisher').disabled=false;
        $('attack').innerHTML='Strike <kbd>Space</kbd>';
        $('status').textContent='Ready · strike once, or enable Repeat to compare the rhythm.';
        updateLabels();requestAnimationFrame(frame);
    } catch(error) {$('status').textContent=error.message+'. Restart with node bin/local-hit-feel-preview.js and reload.';}
})();
