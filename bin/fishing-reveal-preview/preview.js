require.config({baseUrl:'/js'});
// Load only these specimen sheets instead of the full gameplay sprite catalog.
const previewFish = {common:'cobguppy', uncommon:'m88nclownfish', rare:'m88npufferfish', epic:'m88njellyfish', legendary:'m88nanglerfish'};
const previewIds = Object.values(previewFish);
define('sprites', previewIds.map(id => 'text!../sprites/' + id + '.json'), function (...sources) {
    return Object.fromEntries(previewIds.map((id, index) => [id, JSON.parse(sources[index])]));
});
require(['fishingcatch', 'sprites', 'audio', '../../shared/js/altnames'], function (FishingCatch, sprites, AudioManager) {
    const element = id => document.getElementById(id);
    const app = {game:{fish:sprites}, settings:{
        getReducedMotion:() => element('quiet').checked,
        getCombatEffectsEnabled:() => true
    }};
    const reveal = new FishingCatch(app);
    const xp = {common:10, uncommon:25, rare:75, epic:150, legendary:400};
    // Match production's sound engine, base mix, browser fallback and mute behavior.
    const audio = new AudioManager(app.game);
    window.addEventListener('pagehide', () => audio.destroy(), {once:true});
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
