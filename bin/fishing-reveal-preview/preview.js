require.config({baseUrl:'/js'});
// Load only these specimen sheets instead of the full gameplay sprite catalog.
const previewFish = {common:'cobguppy', uncommon:'m88nclownfish', rare:'m88npufferfish', epic:'m88njellyfish', legendary:'m88nanglerfish'};
const previewIds = Object.values(previewFish);
define('sprites', previewIds.map(id => 'text!../sprites/' + id + '.json'), function (...sources) {
    return Object.fromEntries(previewIds.map((id, index) => [id, JSON.parse(sources[index])]));
});
require(['fishingcatch', 'sprites', 'audio', '../../shared/js/altnames'], function (FishingCatch, sprites, AudioManager) {
    const element = id => document.getElementById(id);
    let noticeTimer;
    const app = {game:{fish:sprites, player:{x:808,y:652,sprite:{width:64}},
        showNotification(text) {
            clearTimeout(noticeTimer); element('ready').textContent = text; element('ready').hidden = false;
            noticeTimer = setTimeout(() => {element('ready').hidden = true;}, 2400);
        },
        renderer: {
            // Project the recorded character into the CSS background's cover crop.
            getScreenPosition(x,y) {
                const scale = Math.max(innerWidth / 1278, innerHeight / 1250);
                return {x:innerWidth / 2 + (x - 639) * scale, y:innerHeight / 2 + (y - 625) * scale};
            },
            canvas:{getBoundingClientRect() {
                const controls = element('controls').getBoundingClientRect(), header = document.querySelector('header').getBoundingClientRect();
                const side = controls.left > innerWidth / 2;
                return {left:0,top:header.bottom + 8,right:side ? controls.left - 8 : innerWidth,bottom:side ? innerHeight : controls.top - 8};
            }}
        }
    }, settings:{
        getReducedMotion:() => element('quiet').checked,
        getCombatEffectsEnabled:() => true,
        getFishCatchCardsEnabled:() => element('cards').checked
    }};
    const reveal = new FishingCatch(app);
    element('cards').addEventListener('change', () => reveal.clear());
    const xp = {common:10, uncommon:25, rare:75, epic:150, legendary:400};
    // Match production's sound engine, base mix, browser fallback and mute behavior.
    const audio = new AudioManager(app.game);
    window.addEventListener('pagehide', () => {clearTimeout(noticeTimer); audio.destroy();}, {once:true});
    element('sound').addEventListener('change', () => audio.setVolumes({sound:element('sound').checked ? 1 : 0}));
    function show() {
        const rarity = element('rarity').value;
        const quantity = element('double').checked ? 2 : 1;
        const perfect = element('perfect').checked;
        const id = previewFish[rarity];
        reveal.show({fish:id, name:AltNames.getName(id), rarity, quantity, perfect,
            experience:Math.round(xp[rarity] * (perfect ? 1.5 : 1)) * quantity,
            mapId:rarity === 'common' ? 'cobsfarm' : 'm88n2', requiredLevel:rarity === 'common' ? 1 : 10}, () => {
            if (element('sound').checked) audio.playSound('fishingsuccess');
        });
    }
    element('controls').addEventListener('submit', event => {event.preventDefault(); show();});
    element('ready').hidden = true;
    document.querySelector('button').disabled = false;
    show();
});
