/* 🦉 Owls vs Space Invaders — Retro Deluxe
   - Per-weapon shoot sounds (no music)
   - Enemy counterfire
   - Breakable bunkers
   - Lives (3) with damage flash (red X) + brief invulnerability
   - Alien pixel-debris explosions (fall downward)
   - Power-ups (BTC/ETH/DOGE/XRP/SOL), coin counter, level-up sound
   - Color-shifting invaders, balanced difficulty
*/

(() => {
  // ---------- Canvas & UI ----------
  const canvas  = document.getElementById("game");
  const ctx     = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn= document.getElementById("startBtn");

  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const powerEl = document.getElementById("powerup");
  const coinsEl = document.getElementById("coins");
  const livesEl = document.getElementById("lives");

  const WIDTH  = canvas.width  || 960;
  const HEIGHT = canvas.height || 600;

// ---------- Animation Handles ----------
let mainLoopHandle = null;   // main gameplay loop
let gameOverHandle = null;   // game-over loop
let startLoopHandle = null;  // (if you ever add a start-screen loop)

/** Stop all currently running requestAnimationFrame loops */
function cancelAllLoops() {
  if (mainLoopHandle)  { cancelAnimationFrame(mainLoopHandle);  mainLoopHandle  = null; }
  if (gameOverHandle)  { cancelAnimationFrame(gameOverHandle);  gameOverHandle  = null; }
  if (startLoopHandle) { cancelAnimationFrame(startLoopHandle); startLoopHandle = null; }
}

  // Stop any leftover <audio> hums from old sessions
  Object.values(document.getElementsByTagName("audio")).forEach(a => a.pause());

  // ---------- Sounds ----------
  const sounds = {
    shoot:      new Audio("/apps/m88ninvaders/assets/sounds/shoot.wav"),
    shoot_btc:  new Audio("/apps/m88ninvaders/assets/sounds/shoot_btc.wav"),
    shoot_eth:  new Audio("/apps/m88ninvaders/assets/sounds/shoot_eth.wav"),
    shoot_doge: new Audio("/apps/m88ninvaders/assets/sounds/shoot_doge.wav"),
    shoot_xrp:  new Audio("/apps/m88ninvaders/assets/sounds/shoot_xrp.wav"),
    shoot_sol:  new Audio("/apps/m88ninvaders/assets/sounds/shoot_sol.wav"),
    bonus:      new Audio("/apps/m88ninvaders/assets/sounds/bonus.wav"),
    death:      new Audio("/apps/m88ninvaders/assets/sounds/death.wav"),
    gameover:   new Audio("/apps/m88ninvaders/assets/sounds/gameover.wav"),  
    powerup:    new Audio("/apps/m88ninvaders/assets/sounds/powerup.wav"),
    levelup:    new Audio("/apps/m88ninvaders/assets/sounds/levelup.wav")
  };
  Object.keys(sounds).forEach(k => { if (k.startsWith("shoot")) sounds[k].volume = 0.6; });
  sounds.powerup.volume = 0.7;
  sounds.levelup.volume = 0.8;
  sounds.death.volume = 0.2;
  sounds.gameover.volume = 0.9;


  // Preload to avoid pops on first play
  Object.values(sounds).forEach(s => { s.load(); });

  // ---------- Owl sprite inputs from HTML (so each owl can be swapped per-page) ----------
  const owlJSON = document.getElementById("owl-json").value;
  const owlIMG  = document.getElementById("owl-img").value;

  // ---------- Game State ----------
  let running = false, gameOver = false;
  let score = 0, level = 1, coinsCollected = 0;
  let lives = 3;

  // ---- Bonus UFO (extra life) ----
let bonusUfo = null;              // { x, y, vx, w, h, alive }
let nextBonusAt = 0;              // when it can spawn again (ms)
let bonusUsedThisLevel = false;   // only one UFO per qualifying level

const BONUS_PERIOD_LEVELS = 3;    // appears every 3rd level
const BONUS_MIN_DELAY = 12000;    // ms after level start
const BONUS_MAX_DELAY = 22000;    // ms after level start
const BONUS_SPEED = 320;          // px/sec

function randBonusDelay() {
  return BONUS_MIN_DELAY + Math.random() * (BONUS_MAX_DELAY - BONUS_MIN_DELAY);
}

  const keys = { ArrowLeft:false, ArrowRight:false, Space:false };

  const BASE_COOLDOWN = 380;
  let fireCooldown = BASE_COOLDOWN;
  let lastShotAt = 0;

  let powerUpActive = null;
  let powerUpUntil  = 0;

  const player = { x: WIDTH/2, y: HEIGHT-70, w: 52, h: 52, speed: 360, facing: "right" };

  const bullets = [];
  const enemyBullets = [];
  const powerups = [];
  let invaders = [];
  let invDx = 34, invDir = 1, invStepEvery = 950, invLastStep = 0, invDrop = 16, nextPowerAt = 0;

  // Hit flash / red X
  let invulnerable = false;
  let invulnTimer  = 0;
  let redXTimer    = 0;

  // Bunkers & Alien Debris
  const bunkers = [];
  const alienParticles = []; // {x,y,vx,vy,life,color,size}

  // ETH twin companion (as in your prior version)
  let ethTwin = null;

  // ---------- Owl Sprite ----------
  let owlSprite = null;
  let owlPreviewSprite = null;

  class Sprite {
    constructor(cfg, image, scaleBoost = 1) {
      this.img = image;
      this.frameW = cfg.width;
      this.frameH = cfg.height;
      this.scale  = (cfg.scale || 2) * scaleBoost;
      this.offsetX = cfg.offset_x || 0;
      this.offsetY = cfg.offset_y || 0;
      this.animations = cfg.animations;
      this.frameRate = cfg.fps || 4;
      this.current = "idle_up";
      this.frame = 0;
      this.frameTimer = 0;
      this.flipX = false;
    }
    has(name){ return !!this.animations[name]; }
    set(name){
      if (!this.has(name)) return;
      if (this.current !== name){ this.current = name; this.frame = 0; this.frameTimer = 0; this.flipX = false; }
    }
    setDirectional(name){
      if (this.has(name)){ this.set(name); this.flipX = false; return; }
      if (name.endsWith("_left")){
        const r = name.replace(/_left$/, "_right");
        if (this.has(r)){ this.set(r); this.flipX = true; return; }
      }
    }
    update(dt){
      const anim = this.animations[this.current]; if(!anim) return;
      const dur = 1/this.frameRate; this.frameTimer += dt;
      while(this.frameTimer >= dur){ this.frameTimer -= dur; this.frame = (this.frame + 1) % anim.length; }
    }
    draw(ctx, x, y, aura=false){
      const anim = this.animations[this.current]; if(!anim) return;
      const sx = this.frame * this.frameW, sy = anim.row * this.frameH;
      const dw = this.frameW * this.scale, dh = this.frameH * this.scale;
      const dx = x - dw/2 + this.offsetX, dy = y - dh/2 + this.offsetY;
      ctx.save();
      if (aura){ ctx.shadowColor="#00ff9f"; ctx.shadowBlur=20 + Math.sin(performance.now()/300)*10; }
      if (this.flipX){ ctx.translate(x*2,0); ctx.scale(-1,1); }
      ctx.drawImage(this.img, sx, sy, this.frameW, this.frameH, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  // ---------- Load & Preview ----------
  loadOwl().then(() => {
    startPreviewLoop();
    requestAnimationFrame(mainLoop);
  });

  async function loadOwl(){
    const cfg = await fetch(owlJSON).then(r => r.json());
    const img = await new Promise((res, rej) => { const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error("Failed to load owl image")); i.src=owlIMG; });
    owlSprite = new Sprite(cfg, img);
    owlPreviewSprite = new Sprite(cfg, img, 1.5);
    player.w = owlSprite.frameW * owlSprite.scale;
    player.h = owlSprite.frameH * owlSprite.scale;
  }

  function startPreviewLoop(){
    const c = document.getElementById("owlPreview");
    if (!c || !owlPreviewSprite) return;
    const pc = c.getContext("2d");
    const names = Object.keys(owlPreviewSprite.animations);
    const startAnim = names.includes("idle_down") ? "idle_down" : names.includes("idle_up")   ? "idle_up"   : names[0];
    owlPreviewSprite.set(startAnim);
    let last = performance.now();
    (function loop(now){
      const dt = (now - last)/1000; last = now;
      pc.clearRect(0,0,c.width,c.height);
      owlPreviewSprite.update(dt);
      owlPreviewSprite.draw(pc, c.width/2, c.height/2, true);
      requestAnimationFrame(loop);
    })(last);
  }

  // ---------- Input ----------
  window.addEventListener("keydown", e=>{
    if (e.code==="ArrowLeft") keys.ArrowLeft=true;
    if (e.code==="ArrowRight") keys.ArrowRight=true;
    if (e.code==="Space"){ keys.Space=true; e.preventDefault(); }
    if (e.code==="Enter" && (!running || gameOver)) startGame();
  });
  window.addEventListener("keyup", e=>{
    if (e.code==="ArrowLeft") keys.ArrowLeft=false;
    if (e.code==="ArrowRight") keys.ArrowRight=false;
    if (e.code==="Space") keys.Space=false;
  });
  startBtn?.addEventListener("click", startGame);

  // Auto-start as soon as the adapter approves payment
window.addEventListener('m88ninvaders:start-approved', () => {
  try { startGame(); } catch (_) {}
}, { once: true });


  // ---------- Bunkers ----------
function buildBunkers(force = false) {
  // If we already have bunkers and this isn't a forced rebuild, keep them (persist health across levels)
  if (!force && bunkers.length > 0) return;

  // Fresh build (only happens at new game or when forced)
  bunkers.length = 0;

  const bunkerCount = 3;
  const baseY = HEIGHT - 180;
  const spacing = WIDTH / (bunkerCount + 1);

  for (let i = 0; i < bunkerCount; i++) {
    const bx = spacing * (i + 1);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        bunkers.push({
          x: Math.round(bx + (c - 3) * 12),
          y: Math.round(baseY + (r - 2) * 10),
          w: 10,
          h: 8,
          hp: 3
        });
      }
    }
  }
}

  function goToStartScreen() {
    // Reset state to normal start screen
    gameOver = false;
    running = false;
    overlay.style.display = "flex"; // shows the start UI box again
    window.removeEventListener("keydown", handleGameOverKeys);
  }  

  // ---------- Game Flow ----------
  function startGame(){
    if (window.M88NInvadersCanStart && !window.M88NInvadersCanStart()) {
      return; // wait for /start to approve before starting
    }
    
    cancelAllLoops();
    level = 1; score = 0; coinsCollected = 0; lives = 3;
    powerUpActive=null; powerUpUntil=0; fireCooldown=BASE_COOLDOWN;
    enemyBullets.length = 0; bullets.length = 0; powerups.length = 0; alienParticles.length = 0;
  
    // NEW: brand-new game gets fresh bunkers with full health
    buildBunkers(true);

    // Bonus UFO reset
    bonusUfo = null;
    bonusUsedThisLevel = false;
    nextBonusAt = performance.now() + randBonusDelay();
  
    overlay.style.display="none"; gameOver=false; running=true;
    invDir=1; invLastStep=performance.now();
    resetWave();
    updateUI();
    // (Re)start the main loop
    mainLoopHandle = requestAnimationFrame(mainLoop);
  }

  function resetWave(){
    // formation & pacing (balanced)
    invaders = buildInvaders(level);
    invDir=1;
    invDx = 34 + (level - 1) * 4;
    invDrop = 16 + Math.min(level * 1.5, 18);
    invStepEvery = Math.max(250, 950 - (level - 1) * 70);
    invLastStep = performance.now();

    // player position & states
    player.x=WIDTH/2; player.y=HEIGHT-70;
    invulnerable = false; invulnTimer = 0; redXTimer = 0;


    // clear projectiles/powerups
    bullets.length = 0; enemyBullets.length = 0; powerups.length = 0;

    scheduleNextPower();
  }

  function scheduleNextPower(){
    let base = 10000;
    if (level >= 5) base -= 2000;
    if (level >= 8) base -= 2000;
    nextPowerAt = performance.now() + (base + Math.random()*4000);
  }

  function buildInvaders(lv){
    // cap rows/cols for stability
    const rows = Math.min(8, 4 + Math.min(lv, 3));
    const cols = Math.min(14, 9 + Math.min(lv, 2));
    const cellW=56, cellH=40, padY=60;
    const startX=(WIDTH - (cols-1)*cellW)/2 - 12;
  
    // color cycling for high levels
    const allColors = ["#9ad1ff","#a8ffcf","#ffb3ef","#ffe08a","#ff9a9a","#c6b3ff","#9afff5","#ffd580"];
    const colorCount = lv < 3 ? 1 : lv < 5 ? 2 : lv < 7 ? 3 : lv < 9 ? 5 : allColors.length;
    const palette = allColors.slice(0, colorCount);
  
    const INVADER_PATTERNS = [
      ["0011111100","0111111110","1110111011","1111111111","0110111010","0011001100","0100000010","1000000001","0100000010","0010000100"],
      ["0001100000","0011110000","0111111000","1110011100","1111111100","0011110000","0010010000","0100001000","1000000100","0100001000"],
      ["0001100000","0011110000","0111111000","1111111100","1101101100","1000000100","0100001000","0010010000","0001100000","0000000000"],
      ["0010010000","0111111000","1111111100","1101101100","1111111100","0011110000","0010010000","0001100000","0001100000","0000000000"]
    ];
    const typesToUse = Math.min(1 + Math.floor((lv - 1)/2), INVADER_PATTERNS.length);
    const chosen = INVADER_PATTERNS.slice(0, typesToUse);
  
    const list=[];
    for(let r=0;r<rows;r++){
      const pat = chosen[r % chosen.length];
      const color = palette[(r + lv) % palette.length];
      for(let c=0;c<cols;c++){
        list.push({ x:Math.round(startX + c*cellW), y:padY + r*cellH, w:40, h:26, alive:true, rowKind:pat, color });
      }
    }
    return list;
  }

  function updateUI(){
    scoreEl && (scoreEl.textContent = `SCORE: ${score}`);
    levelEl && (levelEl.textContent = `LEVEL: ${level}`);
    powerEl && (powerEl.textContent = `POWER: ${powerUpActive ? powerUpActive.toUpperCase() : "—"}`);
    coinsEl && (coinsEl.textContent = `COINS: ${coinsCollected}`);
    livesEl && (livesEl.textContent = `LIVES: ${"❤️".repeat(Math.max(0,lives))}`);
  }

  // ---------- Helpers ----------
  function rects(a,b){ return a && b && a.x < b.x + b.w && a.x + (a.w||0) > b.x && a.y < b.y + b.h && a.y + (a.h||0) > b.y; }

  // Hue shift for invaders
  function hueShift(hex, t, intensity = 15) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const [h, s, l] = rgbToHsl(r, g, b);
    const hShift = (h + (Math.sin(t) * intensity)) % 360;
    const [nr, ng, nb] = hslToRgb(hShift, s, l);
    return `rgb(${nr},${ng},${nb})`;
  }
  function rgbToHsl(r, g, b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h, s, l=(max+min)/2;
    if (max===min){ h=s=0; }
    else {
      const d=max-min;
      s=l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        case b: h=(r-g)/d+4; break;
      }
      h*=60;
    }
    return [h,s,l];
  }
  function hslToRgb(h,s,l){
    const c=(1-Math.abs(2*l-1))*s;
    const hp=h/60; const x=c*(1-Math.abs((hp%2)-1));
    let [r,g,b]=[0,0,0];
    if (hp>=0&&hp<1) [r,g,b]=[c,x,0];
    else if (hp<2)   [r,g,b]=[x,c,0];
    else if (hp<3)   [r,g,b]=[0,c,x];
    else if (hp<4)   [r,g,b]=[0,x,c];
    else if (hp<5)   [r,g,b]=[x,0,c];
    else             [r,g,b]=[c,0,x];
    const m=l-c/2;
    return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];
  }

  // ---------- Power-ups ----------
  function allowedPowersForLevel(lv){
    const arr=["btc"]; if(lv>=2)arr.push("eth"); if(lv>=3)arr.push("doge"); if(lv>=4)arr.push("xrp"); if(lv>=5)arr.push("sol"); return arr;
  }
  function spawnPower(lv){
    const allowed=allowedPowersForLevel(lv);
    const type=allowed[Math.floor(Math.random()*allowed.length)];
    const x=50+Math.random()*(WIDTH-100);
    powerups.push({x,y:-20,w:28,h:28,vy:100+Math.random()*40,type});
  }
  function applyPower(type, now) {
    powerUpActive = type;
    powerUpUntil = now + (type === "btc" ? 12000 : 7000);
    fireCooldown = BASE_COOLDOWN * 0.8;

    // ETH twin companion (spawns beside player)
    if (type === "eth") {
      ethTwin = {
        x: player.x + (Math.random() < 0.5 ? -60 : 60),
        y: player.y,
        offset: 60,
        dir: Math.random() < 0.5 ? -1 : 1,
        alive: true
      };
    }
    updateUI();
  }

  // ---------- Main Loop ----------
  let lastTime = performance.now();
  function mainLoop(now) {
    // If we’re in game-over mode, do NOT run or reschedule the main loop.
    if (gameOver) return;
  
    const dt = (now - lastTime) / 1000; 
    lastTime = now;
  
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackdrop(now);
  
    if (running && !gameOver) {
      update(dt, now);
      draw(now);
    } else if (owlSprite) {
      owlSprite.set("idle_up");
      owlSprite.update(dt);
      owlSprite.draw(ctx, player.x, player.y);
    }
  
    // Only reschedule while not in game-over mode
    if (!gameOver) {
      mainLoopHandle = requestAnimationFrame(mainLoop);
    }
  }

  function drawBackdrop(now){
    // Simple starfield
    ctx.save();
    ctx.fillStyle="#000"; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.globalAlpha=0.25;
    const seed = Math.floor(now/40);
    for (let i=0;i<120;i++){
      const x = (i*73 + seed*13) % WIDTH;
      const y = (i*97 + seed*7)  % HEIGHT;
      ctx.fillStyle = (i%7===0) ? "#7df" : "#9fa";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  // ---------- Update ----------
  function update(dt, now){
    // power expiry
    if(powerUpActive&&now>powerUpUntil){powerUpActive=null;fireCooldown=BASE_COOLDOWN;ethTwin=null;updateUI();}

    // movement
    let vx=0;if(keys.ArrowLeft)vx-=1;if(keys.ArrowRight)vx+=1;
    player.x+=vx*player.speed*dt;player.x=Math.max(30,Math.min(WIDTH-30,player.x));
    if(vx<0)player.facing="left";else if(vx>0)player.facing="right";

    // owl animation
    if(owlSprite){
      const moving=vx!==0;const canShoot=(now-lastShotAt>=fireCooldown);const shooting=keys.Space&&canShoot;
      if(moving){const dir=player.facing;if(shooting&&owlSprite.has(`atk_${dir}`))owlSprite.setDirectional(`atk_${dir}`);else owlSprite.setDirectional(`walk_${dir}`);}
      else{if(shooting&&owlSprite.has("atk_up"))owlSprite.set("atk_up");else owlSprite.set("idle_up");}
      owlSprite.update(dt);
    }

    // ETH twin follow + mimic fire
    if (ethTwin && ethTwin.alive) {
      ethTwin.x = player.x + ethTwin.offset * ethTwin.dir;
      ethTwin.y = player.y;
      const canShoot = now - lastShotAt >= fireCooldown;
      if (keys.Space && canShoot) {
        const y0 = ethTwin.y - player.h / 2 - 12;
        bullets.push({ x: ethTwin.x, y: y0, w: 5, h: 18, vy: -1100, type: "eth", pierce: 1 });
      }
      if (now > powerUpUntil || powerUpActive !== "eth") ethTwin.alive = false;
    }

    // shooting
    if(keys.Space) tryShoot(now);

    // player bullets
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];

      // bullets vs bonus UFO (extra life)
if (bonusUfo) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (Math.abs(b.x - bonusUfo.x) < (bonusUfo.w / 2) &&
        Math.abs(b.y - bonusUfo.y) < (bonusUfo.h / 2)) {
      // hit!
      bullets.splice(i, 1);
      bonusUfo = null;
      bonusUsedThisLevel = true;

      // award life (cap at 5 if you want)
      lives = Math.min(lives + 1, 5);
      updateUI(); // or setUI(), whichever your file uses

      // sound feedback (re-use powerup sound)
      try { sounds.powerup.currentTime = 0; sounds.powerup.play(); } catch(e){}
      break;
    }
  }
}

      if (b.type === "doge") {
        // bouncing bubble
        b.x += (b.vx || 0)*dt; b.y += b.vy*dt;
        if ((b.x <= 20 && b.vx < 0) || (b.x >= WIDTH - 20 && b.vx > 0)) { b.vx *= -1; b.bounces = (b.bounces||0)+1; }
        if (b.y <= 20 && b.vy < 0) { b.vy *= -0.8; b.bounces=(b.bounces||0)+1; }
        b.vy += (b.gravity||0)*dt; b.gravity = Math.min((b.gravity||50)+10*dt, 200);
        if (b.bounces > (b.maxBounces||4) || b.y < -60 || b.y > HEIGHT+60) { bullets.splice(i,1); continue; }
      } else {
        if(b.waveAmp){ b.waveT=(b.waveT||0)+dt; b.x+=Math.sin(b.waveT*b.waveFreq)*b.waveAmp*dt*60; }
        b.x+=(b.vx||0)*dt; b.y+=b.vy*dt;
        if (b.y < -60 || b.x < -40 || b.x > WIDTH+40){ bullets.splice(i,1); continue; }
      }
    }

    // spawn power
    if(now>nextPowerAt){ spawnPower(level); scheduleNextPower(); }

    // powerups fall
    for(let i=powerups.length-1;i>=0;i--){ const p=powerups[i]; p.y+=p.vy*dt; if(p.y>HEIGHT+40) powerups.splice(i,1); }

    // enemy movement + enemy shooting
    updateInvaders(dt, now);

    // enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.y += b.vy * dt;

      // hit player (if not invulnerable)
      if (!invulnerable &&
          b.y + b.h > player.y - player.h / 2 &&
          b.y < player.y + player.h / 2 &&
          Math.abs(b.x - player.x) < player.w / 2) {
        enemyBullets.splice(i, 1);
        onPlayerHit();
        continue;
      }
      if (b.y > HEIGHT + 40) enemyBullets.splice(i, 1);
    }

    // coin/Power-up pickup by bullets
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];
      for(let j=powerups.length-1;j>=0;j--){
        const p=powerups[j];
        if(rects(b,p)){
          createCoinBurst(p.x+p.w/2,p.y+p.h/2,p.type);
          applyPower(p.type,now);
          if (!sounds.powerup.paused){ sounds.powerup.pause(); sounds.powerup.currentTime = 0; }
          sounds.powerup.play();
          bullets.splice(i,1); powerups.splice(j,1); break;
        }
      }
    }
    // coin/Power-up pickup by player
    for(let i=powerups.length-1;i>=0;i--){
      const p=powerups[i];
      if(rects({x:player.x-player.w/2,y:player.y-player.h/2,w:player.w,h:player.h},p)){
        createCoinBurst(p.x+p.w/2,p.y+p.h/2,p.type);
        applyPower(p.type,now);
        if (!sounds.powerup.paused){ sounds.powerup.pause(); sounds.powerup.currentTime = 0; }
        sounds.powerup.play();
        powerups.splice(i,1);
      }
    }

    // ---- Bonus UFO spawn/update ----
if (!bonusUsedThisLevel && !bonusUfo && level % BONUS_PERIOD_LEVELS === 0 && now >= nextBonusAt) {
  // spawn from left or right
  const fromLeft = Math.random() < 0.5;
  bonusUfo = {
    x: fromLeft ? -40 : (WIDTH + 40),
    y: 70,
    vx: fromLeft ? BONUS_SPEED : -BONUS_SPEED,
    w: 46,
    h: 18,
    alive: true,
  };
  // play fly-by sound once at spawn
  try { sounds.bonus.currentTime = 0; sounds.bonus.play(); } catch(e){}
}

if (bonusUfo) {
  bonusUfo.x += bonusUfo.vx * dt;

  // off-screen → remove and prevent another spawn this level
  if (bonusUfo.x < -80 || bonusUfo.x > WIDTH + 80) {
    bonusUfo = null;
    bonusUsedThisLevel = true;
  }
}

    // bullet vs bunker collisions (both sides)
    for (let i = bunkers.length - 1; i >= 0; i--) {
      const bnk = bunkers[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (rects(bullets[j], bnk)) { bullets.splice(j,1); bnk.hp--; }
      }
      for (let j = enemyBullets.length - 1; j >= 0; j--) {
        if (rects(enemyBullets[j], bnk)) { enemyBullets.splice(j,1); bnk.hp--; }
      }
      if (bnk.hp <= 0) bunkers.splice(i,1);
    }

    // update alien particles (falling debris)
    for (let i = alienParticles.length - 1; i >= 0; i--) {
      const p = alienParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;       // gravity
      p.life -= dt;
      if (p.life <= 0) alienParticles.splice(i,1);
    }

    // invulnerability timers
    if (invulnerable) {
      invulnTimer -= dt;
      if (invulnTimer <= 0) invulnerable = false;
    }
    if (redXTimer > 0) redXTimer -= dt;
  }

  function onPlayerHit(){
    loseLife();
    redXTimer = 0.4;          // flash red X for 0.4s

    if (lives <= 0) {
      showGameOver();
    }    
  }

  // Play death on life loss; play gameover and end the game at 0 lives
let playedGameOverSFX = false;

function loseLife() {
  if (invulnerable) return; // respect your existing invulnerability window

  // decrement and update HUD
  lives--;
  updateUI && updateUI();

  // death sfx on any life loss
  try { if (sounds.death) { sounds.death.currentTime = 0; sounds.death.play(); } } catch (e) {}

  if (lives <= 0) {
    // game over sfx exactly once
    if (!playedGameOverSFX) {
      try { if (sounds.gameover) { sounds.gameover.currentTime = 0; sounds.gameover.play(); } } catch (e) {}
      playedGameOverSFX = true;
      // optional: reset flag after a bit so future games can play again
      setTimeout(() => { playedGameOverSFX = false; }, 2000);
    }
    showGameOver();
  } else {
    // give the player a short invulnerability window just like you already do
    invulnerable = true;
    invulnTimer = 1.2; // keep your existing timing if different
  }
}


// ---------- Game Over Screen ----------
function showGameOver() {
  running = false;
  gameOver = true;

  // Make sure no other loops keep clearing over our Game Over UI
  cancelAllLoops();

    // Send score to the adapter for payout (LooperLands)
    try {
      window.dispatchEvent(new CustomEvent('m88ninvaders:gameover', {
        detail: { score, coins: coinsCollected || 0, level }
      }));
    } catch (e) {}
  

  bullets.length = 0;
  enemyBullets.length = 0;

  // Reset any transform just in case
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  gameOverTargets = [
    { label: "YES", x: WIDTH / 2 - 90, y: HEIGHT / 2 + 80, w: 120, h: 40, action: "yes" },
    { label: "NO",  x: WIDTH / 2 + 90, y: HEIGHT / 2 + 80, w: 120, h: 40, action: "no" }
  ];

  // Input for the game-over screen
  window.addEventListener("keydown", handleGameOverKeys);
  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft")  keys.ArrowLeft  = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
    if (e.code === "Space")      keys.Space      = false;
  });

  // Start the dedicated game-over loop
  gameOverHandle = requestAnimationFrame(gameOverLoop);
}

let gameOverTargets = [];

function handleGameOverKeys(e) {
  if (e.code === "ArrowLeft") keys.ArrowLeft = true;
  if (e.code === "ArrowRight") keys.ArrowRight = true;
  if (e.code === "Space") keys.Space = true;
}

function gameOverLoop(now) {
  if (!gameOver) return;
  const dt = 1 / 60;

  // movement
  let vx = 0;
  if (keys.ArrowLeft) vx -= 1;
  if (keys.ArrowRight) vx += 1;
  player.x += vx * player.speed * dt;
  player.x = Math.max(30, Math.min(WIDTH - 30, player.x));

  // shooting
  if (keys.Space && Math.random() > 0.9)
    bullets.push({ x: player.x, y: player.y - player.h / 2 - 12, w: 5, h: 14, vy: -600, type: "base" });

  // update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y += bullets[i].vy * dt;
    if (bullets[i].y < -40) bullets.splice(i, 1);
  }

  // detect hits
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    for (const t of gameOverTargets) {
      if (b.x > t.x - t.w/2 && b.x < t.x + t.w/2 &&
          b.y > t.y - t.h && b.y < t.y + t.h/2) {
        bullets.splice(i, 1);
        if (t.action === "yes") return restartGameAfterGameOver();
        if (t.action === "no")  return backToStartScreen();
      }
    }
  }

  // --- DRAW ---
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.3;
  drawBackdrop(now);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // GAME OVER title
  ctx.font = "bold 64px 'Press Start 2P', monospace";
  ctx.fillStyle = "#ff3b3b";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 25;
  ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 100);

  // PLAY AGAIN
  ctx.shadowBlur = 0;
  ctx.font = "bold 28px 'Press Start 2P', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("PLAY AGAIN?", WIDTH / 2, HEIGHT / 2 - 20);

  // YES / NO
  ctx.font = "24px 'Press Start 2P', monospace";
  for (const t of gameOverTargets) {
    ctx.fillStyle = t.action === "yes" ? "#00ff90" : "#ff4b4b";
    ctx.fillText(t.label, t.x, t.y);
  }
  ctx.restore();

  // draw owl + bullets
  if (owlSprite) {
    owlSprite.set("idle_up");
    owlSprite.update(dt);
    owlSprite.draw(ctx, player.x, player.y, true);
  }
  for (const b of bullets) {
    ctx.fillStyle = "#00ff90";
    ctx.fillRect(b.x - 2, b.y, b.w, b.h);
  }

  gameOverHandle = requestAnimationFrame(gameOverLoop);
}

function restartGameAfterGameOver() {
  if (gameOverHandle) cancelAnimationFrame(gameOverHandle);
  gameOver = false;
  window.removeEventListener("keydown", handleGameOverKeys);
  startGame();
}

function backToStartScreen() {
  // Hard reset: behaves exactly like a fresh page load
  window.location.reload();
}

  // ---------- Enemy Formation ----------
  function updateInvaders(dt, now){
    // step horizontally
    if (now - invLastStep >= invStepEvery) {
      invLastStep = now;
      let hitEdge = false;
      for (const v of invaders) {
        if (!v.alive) continue;
        v.x += invDx * invDir;
        if (v.x < 10 || v.x + v.w > WIDTH - 10) hitEdge = true;
      }
      if (hitEdge) {
        invDir *= -1;
        for (const v of invaders) { if (v.alive) v.y += invDrop; }
      }
    }

    // enemy counterfire (small chance per frame)
    if (Math.random() < 0.02) {
      const shooters = invaders.filter(v => v.alive);
      if (shooters.length > 0) {
        const s = shooters[Math.floor(Math.random()*shooters.length)];
        enemyBullets.push({ x: s.x + s.w/2, y: s.y + s.h, w: 4, h: 12, vy: 280, type: "enemy" });
      }
    }

    // bullets hit invaders
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = 0; j < invaders.length; j++) {
        const v = invaders[j];
        if (!v.alive) continue;
        if (rects({x:b.x-(b.w/2), y:b.y-b.h, w:b.w, h:b.h}, {x:v.x, y:v.y, w:v.w, h:v.h})) {
          // pierce handling
          if (b.pierce) { b.pierce--; }
          else { bullets.splice(i,1); }

          v.alive = false;
          score += 10;

          // pixel debris explosion (falling)
          spawnAlienDebris(v);

          break;
        }
      }
    }

    // level cleared
    if (invaders.every(v => !v.alive)) {
      sounds.levelup.currentTime = 0;
      sounds.levelup.play();
    
      // brief delay before next wave
      running = false;
      setTimeout(() => {
        level++;
        
        // Bonus UFO scheduling on level-up
        bonusUsedThisLevel = false;
        nextBonusAt = performance.now() + randBonusDelay();

        resetWave();
        updateUI();
        running = true;
      }, 1000); // 1-second pause
    }    
  }

  function spawnAlienDebris(inv){
    const N = 15 + Math.floor(Math.random()*6);
    for (let k=0; k<N; k++){
      alienParticles.push({
        x: inv.x + inv.w/2,
        y: inv.y + inv.h/2,
        vx: (Math.random()*2-1) * 120,
        vy: -Math.random()*120,   // initial burst upward…
        life: 0.8 + Math.random()*0.4,
        color: inv.color,
        size: 2 + Math.floor(Math.random()*2)
      });
    }
  }

  // ---------- Draw ----------
  function draw(now){
    // powerups
    for(const p of powerups){ drawCoin(p); }

    // invaders
    for (const v of invaders) {
      if (!v.alive) continue;
      drawInvader(v.x, v.y, v.w, v.h, v.rowKind, v.color);
    }

    // alien debris
    for (const p of alienParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life/1.2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    // enemy bullets
    for (const b of enemyBullets) {
      ctx.save();
      ctx.fillStyle = "#ff5555";
      ctx.shadowColor = "#ff5555";
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2, b.y, b.w, b.h);
      ctx.restore();
    }

    // bunkers
    for (const bnk of bunkers) {
      ctx.save();
      const c = Math.max(0, (bnk.hp / 3));
      ctx.fillStyle = `rgba(${120 + 80 * c},${255 * c},${120 * c},1)`;
      ctx.fillRect(bnk.x, bnk.y, bnk.w, bnk.h);
      ctx.restore();
    }

    // player bullets
    for(const b of bullets){ drawBullet(b); }

    // ---- Draw bonus UFO ----
if (bonusUfo) {
  ctx.save();
  ctx.shadowColor = "#ff5d5d";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ff4b4b";
  ctx.fillRect(bonusUfo.x - bonusUfo.w/2, bonusUfo.y - bonusUfo.h/2, bonusUfo.w, bonusUfo.h);
  // small "antenna" for flavor
  ctx.fillRect(bonusUfo.x - 6, bonusUfo.y - bonusUfo.h/2 - 6, 12, 4);
  ctx.restore();
}

    // ETH twin
    if (ethTwin && ethTwin.alive && owlSprite) {
      owlSprite.set("idle_up");
      owlSprite.draw(ctx, ethTwin.x, ethTwin.y, true); // glow aura
    }

    // player (with invulnerability shimmer)
    if (owlSprite) {
      ctx.save();
      if (invulnerable) { ctx.globalAlpha = 0.6 + 0.4*Math.cos(performance.now()/60); }
      owlSprite.draw(ctx, player.x, player.y);
      ctx.restore();
    }

    // red X flash on damage
    if (redXTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, redXTimer / 0.4);
      ctx.fillStyle = "#ff2b2b";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText("X", player.x, player.y - player.h/2 - 6);
      ctx.restore();
    }
  }

  function drawBullet(b){
    const colorMap = {
      base:"#00ff90", btc:"#f7931a", eth:"#7a6ff0", doge:"#ffe75d", xrp:"#26ffe6", sol:"#a259ff"
    };
    ctx.save();
    ctx.shadowColor = colorMap[b.type] || "#00ff90";
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = ctx.shadowColor;

    if (b.type === "doge") {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.w/2, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillRect(b.x - (b.w/2), b.y - b.h, b.w, b.h);
    }
    ctx.restore();
  }

  function drawInvader(x, y, w, h, pattern, color) {
    const px = w / 10, py = h / 10;
    const time = performance.now() / 1000;
    const shifted = hueShift(color, time * 1.5, 10 + level * 1.5);

    ctx.save();
    ctx.shadowBlur = 8 + level;
    ctx.shadowColor = shifted;
    ctx.fillStyle = shifted;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (pattern[r][c] === "1")
          ctx.fillRect(x + c * px, y + r * py, px - 1, py - 1);
      }
    }
    ctx.restore();
  }

  function drawCoin(p){
    const styles = {
      btc: { c:"#f7931a", sym:"₿" },
      eth: { c:"#7a6ff0", sym:"Ξ" },
      doge:{ c:"#ffdf5d", sym:"Ð" },
      xrp: { c:"#26ffe6", sym:"✕" },
      sol: { c:"#a259ff", sym:"◎" }
    };
    const st = styles[p.type] || {c:"#fff", sym:"?"};
    ctx.save();
    ctx.fillStyle = st.c;
    ctx.shadowColor = st.c;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle="#000";
    ctx.font="bold 14px monospace";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(st.sym, p.x + p.w/2, p.y + p.h/2+1);
    ctx.restore();
  }

  function createCoinBurst(x,y,type){
    coinsCollected++; updateUI();
    const colorMap={btc:"#f7931a",eth:"#7a6ff0",doge:"#ffe75d",xrp:"#26ffe6",sol:"#a259ff"};
    const color=colorMap[type]||"#ffffff";
    for(let i=0;i<12;i++){
      const a=Math.random()*Math.PI*2; const speed=80+Math.random()*100;
      alienParticles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:0.5,color,size:2});
    }
  }

  // ---------- Shooting ----------
  function tryShoot(now) {
    if (now - lastShotAt < fireCooldown) return;
    lastShotAt = now;

    // play per-weapon shoot sound
    let sfx = sounds.shoot;
    if (powerUpActive && sounds[`shoot_${powerUpActive}`]) sfx = sounds[`shoot_${powerUpActive}`];
    sfx.currentTime = 0; sfx.play();

    const y0 = player.y - player.h / 2 - 12;

    switch (powerUpActive) {
      case "btc":
        fireCooldown = 260;
        bullets.push({ x: player.x, y: y0, w: 6, h: 16, vy: -1100, type: "btc" });
        bullets.push({ x: player.x - 14, y: y0, w: 5, h: 14, vy: -1000, vx: -180, type: "btc" });
        bullets.push({ x: player.x + 14, y: y0, w: 5, h: 14, vy: -1000, vx: 180, type: "btc" });
        break;
      case "eth":
        fireCooldown = 300;
        bullets.push({ x: player.x, y: y0, w: 5, h: 20, vy: -1200, type: "eth", pierce: 2 });
        break;
      case "doge":
        fireCooldown = 320;
        bullets.push({ x: player.x, y: y0, w: 8, h: 8, vy: -600, vx: 300, type: "doge", bounces: 0, maxBounces: 4, gravity: 0 });
        break;
      case "xrp":
        fireCooldown = 320;
        bullets.push({ x: player.x, y: y0, w: 6, h: 18, vy: -1000, type: "xrp", pierce: 3 });
        break;
      case "sol":
        fireCooldown = 300;
        bullets.push({ x: player.x - 10, y: y0, w: 5, h: 14, vy: -1000, vx: -140, type: "sol" });
        bullets.push({ x: player.x + 10, y: y0, w: 5, h: 14, vy: -1000, vx: 140, type: "sol" });
        break;
      default:
        fireCooldown = BASE_COOLDOWN;
        bullets.push({ x: player.x, y: y0, w: 4, h: 14, vy: -880, type: "base" });
        break;
    }
  }
})();