(() => {
    'use strict';
    const Config = window.WorldFxConfig, Particles = window.WorldParticles;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const clone = value => JSON.parse(JSON.stringify(value));
    const starters = {
        snow: {colors: ['#d6edff', '#ffffff'], velocityX: 3, velocityY: 12, sway: 8, pulse: 0, size: 1},
        rain: {colors: ['#79a9d4', '#bbddff'], shape: 'spark', velocityX: -18, velocityY: 65, sway: 0, pulse: 0, size: 1, opacity: 0.65},
        magic: {colors: ['#c8a0ff', '#7ce5e1', '#fff3b0'], shape: 'star', velocityX: 2, velocityY: -5, sway: 12, pulse: 0.6, glow: 8, spin: 0.5},
        smoke: {colors: ['#7e8794', '#c8ced6'], shape: 'soft', size: 5, opacity: 0.4, velocityX: 5, velocityY: -8, sway: 10, pulse: 0.25}
    };
    const previews = new Set();
    let id = 0;
    function button(parent, label, run, attrs = {}) {
        const control = el('button', label, {type: 'button', ...attrs});
        control.onclick = run; parent.append(control); return control;
    }
    function field(parent, label, value, options, update) {
        const wrap = el('div', '', {className: 'field'}), key = 'particle-field-' + (++id);
        const input = el(options.choices ? 'select' : 'input', '', {id: key});
        if (options.choices) for (const [value, name] of options.choices) input.append(el('option', name, {value}));
        else Object.assign(input, {type: options.type || 'number', min: options.min ?? 0, max: options.max ?? 1, step: options.step ?? 0.05});
        input.value = value; input.required = true;
        input.addEventListener(options.choices ? 'change' : 'input', () => {
            if (!input.checkValidity()) return;
            update(options.choices || options.type === 'color' ? input.value : Number(input.value));
        });
        wrap.append(el('label', label, {htmlFor: key}), input);
        if (options.hint) wrap.append(el('span', options.hint, {className: 'field-hint'}));
        parent.append(wrap); return input;
    }
    function grid(parent) {const row = el('div', '', {className: 'asset-field-grid'}); parent.append(row); return row;}
    function preview(parent, getSpec, burst = false) {
        const aside = el('div', '', {className: 'particle-preview'});
        const canvas = el('canvas', '', {width: burst ? 360 : 480, height: 224, role: 'img', ariaLabel: burst ? 'Live interaction burst preview' : 'Live custom particle preview'});
        const controls = el('div', '', {className: 'world-inline-actions'});
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        let paused = reduced.matches, elapsed = 0, previous, night = false;
        const pause = button(controls, paused ? 'Play preview' : 'Pause preview', () => {paused = !paused; pause.textContent = paused ? 'Play preview' : 'Pause preview';});
        pause.disabled = reduced.matches;
        button(controls, 'Restart preview', () => {elapsed = 0;});
        field(aside, 'Preview background', 'day', {choices: [['day','Day'],['night','Night']]}, value => {night = value === 'night';});
        const note = el('p', '', {className: 'field-hint', role: 'status'});
        aside.append(canvas, controls, note); parent.append(aside);
        const draw = time => {
            if (!canvas.isConnected) {previews.delete(draw);return;}
            if (canvas.closest('[hidden]') || document.hidden) {previous = time;return;}
            if (!paused && !reduced.matches && previous !== undefined) elapsed += Math.min(0.1, (time - previous) / 1000);
            previous = time;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = night ? '#202936' : '#edf1f5'; ctx.fillRect(0,0,canvas.width,224);
            let spec; try {spec = getSpec();} catch (error) {note.textContent = error.message;return;}
            note.textContent = reduced.matches ? 'Motion paused for reduced motion. Appearance is shown in a still frame.' : burst ? 'Repeats for preview only. The game emits one burst on success.' : 'One world patch, scaled to fit. Check placement in the map preview below.';
            if (!spec) return;
            const seconds = reduced.matches ? (burst ? 0.3 : 0) : elapsed;
            if (burst) {
                const age = seconds % (spec.lifetimeMs / 1000 + 0.5), alpha = 1 - age * 1000 / spec.lifetimeMs;
                if (alpha <= 0) return;
                for (let i = 0; i < spec.count; i++) {
                    let step = 0;
                    const random = () => {const n = Math.sin((i + 1) * 127.1 + (++step) * 311.7) * 43758.5453; return n - Math.floor(n);};
                    const startX = (random() - 0.5) * spec.spread, vx = (random() * 2 - 1) * spec.speed, vy = -(0.5 + random()) * spec.speed;
                    const size = 1 + Math.floor(random() * spec.size), color = spec.colors[Math.floor(random() * spec.colors.length)];
                    const point = {x: 180 + (startX + vx * age) * 2, y: 160 + (vy * age + 0.5 * spec.gravity * age * age) * 2, scale: 2, seed: i * 1.618 + 0.5};
                    ctx.save(); ctx.globalAlpha = alpha;
                    if (spec.design) Particles.draw(ctx, point, 'custom', age, night ? 0 : 1, {...spec.design, colors: [color], size});
                    else {ctx.fillStyle = color;ctx.fillRect(Math.round(point.x),Math.round(point.y),size*2,size*2);}
                    ctx.restore();
                }
            } else for (const point of Particles.positions(spec.type, spec.count, seconds, {x: 0,y: 0,scale: 1},480,224,spec.design)) {
                Particles.draw(ctx,point,spec.type,seconds,night?0:1,spec.design);
            }
        };
        previews.add(draw);
    }
    function appearance(parent, getDesign, change, {burst = false, redraw} = {}) {
        const controls = el('div', '', {className: 'particle-controls'});
        parent.append(controls);
        field(controls,'Start from','',{choices:[['','Choose a starting effect'],['snow','Snow'],['rain','Rain'],['magic','Magic motes'],['smoke','Smoke']]},key=>{
            if (!key) return;
            change(Config.custom(starters[key]));redraw();
        });
        const design = Config.custom(getDesign()), row = grid(controls);
        field(row,'Shape',design.shape,{choices:Config.shapes.map(shape=>[shape,{pixel:'Pixel',spark:'Streak',star:'Star',soft:'Soft puff'}[shape]])},value=>{design.shape=value;change(design);});
        field(row,'Size · map pixels',design.size,{min:1,max:8,step:1},value=>{design.size=value;change(design);});
        const palette = el('div', '', {className: 'particle-palette'}); controls.append(palette);
        for (const [index,color] of design.colors.entries()) {
            const line = el('div', '', {className: 'particle-color'});
            field(line,'Color '+(index+1),color,{type:'color'},value=>{design.colors[index]=value;change(design);});
            const remove=button(line,'Remove color '+(index+1),()=>{design.colors.splice(index,1);change(design);redraw();}, {className: 'destructive'});
            remove.disabled=design.colors.length===1;palette.append(line);
        }
        const add=button(controls,'Add color',()=>{design.colors.push('#ffffff');change(design);redraw();});add.disabled=design.colors.length>=6;
        const light=grid(controls);
        field(light,'Opacity',design.opacity,{min:0,max:1},value=>{design.opacity=value;change(design);});
        field(light,'Glow · map pixels',design.glow,{min:0,max:24,step:1},value=>{design.glow=value;change(design);});
        field(light,'Pulse strength',design.pulse,{min:0,max:1},value=>{design.pulse=value;change(design);});
        field(light,'Spin · radians / second',design.spin,{min:-6,max:6,step:0.1},value=>{design.spin=value;change(design);});
        if (!burst) {
            const motion=grid(controls);
            field(motion,'Horizontal drift · pixels / second',design.velocityX,{min:-80,max:80,step:1,hint:'Positive moves right; negative moves left.'},value=>{design.velocityX=value;change(design);});
            field(motion,'Vertical drift · pixels / second',design.velocityY,{min:-80,max:80,step:1,hint:'Positive falls; negative rises.'},value=>{design.velocityY=value;change(design);});
            field(motion,'Sway · map pixels',design.sway,{min:0,max:32,step:1},value=>{design.sway=value;change(design);});
        }
    }
    function ambient(parent, config, touch) {
        const list=el('div'), footer=el('div','',{className:'world-inline-actions'}), budget=el('p','',{className:'field-hint',role:'status'});
        parent.append(budget,list,footer);
        const count=()=>config.particles.reduce((total,effect)=>total+(Number(effect.count)||0),0);
        function update() {budget.textContent=count()+' / 24 particles per patch · '+config.particles.length+' / 3 effects'+(count()>24?' · Reduce the particle count before saving.':'');budget.classList.toggle('error',count()>24);add.disabled=custom.disabled=config.particles.length>=3||count()>=24;}
        function changed() {touch();update();}
        function draw() {
            list.replaceChildren();
            config.particles.forEach((effect,index)=>{
                const block=el('div','',{className:'particle-effect'});block.append(el('h4','Effect '+(index+1)));
                const row=grid(block);
                field(row,'Particle type',effect.type,{choices:Config.types.map(type=>[type,type==='custom'?'Custom effect':type[0].toUpperCase()+type.slice(1)])},value=>{
                    effect.type=value;if(value==='custom')effect.design=Config.custom();else delete effect.design;changed();draw();
                });
                field(row,'Particle count',effect.count,{min:1,max:24,step:1},value=>{effect.count=value;changed();});
                button(row,'Remove effect '+(index+1),()=>{config.particles.splice(index,1);changed();draw();}, {className: 'destructive'});
                if(effect.type==='custom') {
                    const designer=el('div','',{className:'particle-designer'});block.append(designer);
                    appearance(designer,()=>effect.design,design=>{effect.design=design;changed();},{redraw:draw});
                    preview(designer,()=>Config.ambient([effect])[0]);
                }
                list.append(block);
            });update();
        }
        function append(isCustom) {if(config.particles.length>=3||count()>=24)return;config.particles.push({type:isCustom?'custom':'leaves',count:Math.min(6,24-count()),...(isCustom?{design:Config.custom()}: {})});changed();draw();}
        const add=button(footer,'Add built-in effect',()=>append(false)),custom=button(footer,'Design custom effect',()=>append(true));draw();
    }
    function burst(parent, action, stage, touch) {
        const panel=el('section','',{className:'world-section'});panel.append(el('h3','Particle burst'),el('p','Play an effect at this tile when the action succeeds. Preview changes before saving.',{className:'field-hint'}));parent.append(panel);
        const body=el('div');panel.append(body);
        function current() {return Config.stageBurst(action.stageParticles,stage);}
        function save(value) {
            if(!action.stageParticles||typeof action.stageParticles!=='object')action.stageParticles={};
            action.stageParticles.enabled=true;action.stageParticles.stages||={};action.stageParticles.stages[stage]=value;touch();
        }
        function draw() {
            body.replaceChildren();
            const value=current(), mode=value?(value.design?'custom':value.preset):'none';
            field(body,'Burst effect',mode,{choices:[['none','No particles'],...Object.keys(Config.presets).map(key=>[key,key[0].toUpperCase()+key.slice(1)]),['custom','Custom effect']]},key=>{
                save(key==='none'?false:key==='custom'?{...Config.burst('sparks'),design:Config.custom(starters.magic)}:{preset:key});draw();
            });
            if(!value)return;
            const row=grid(body), settings=clone(value);
            for(const [key,label,min,max,step]of [['count','Particle count',0,48,1],['speed','Speed · pixels / second',0,100,1],['gravity','Gravity · pixels / second²',-100,250,1],['lifetimeMs','Lifetime · milliseconds',100,2000,50],['spread','Spread · map pixels',0,40,1]]) {
                field(row,label,settings[key],{min,max,step},number=>{settings[key]=number;save(settings);});
            }
            if(settings.design) {
                const designer=el('div','',{className:'particle-designer'});body.append(designer);
                appearance(designer,()=>settings.design,design=>{settings.design=design;save(settings);},{burst:true,redraw:draw});
                preview(designer,current,true);
            }else preview(body,current,true);
        }
        draw();
    }
    const tick=time=>{for(const draw of previews)draw(time);requestAnimationFrame(tick);};requestAnimationFrame(tick);
    window.ToolboxParticleEditor={ambient,burst};
})();
