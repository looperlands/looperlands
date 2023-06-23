
define(['character'], function(Character) {

    var NpcTalk = {
        "guard": [
            "Hello there, Looper",
            'You can learn more about <a target="_blank" href="https://medium.loopring.io/loopring-taiko-ready-layer-3-d9657327f908">Loopring and Taiko on Layer 3</a>.',
            "Layer 3 means we can build customized applications (like privacy) with scalability",
            'Vitalik Butarin <a target="_blank" href="https://vitalik.ca/general/2022/09/17/layer_3.html">said</a> L2 is for general-purpose scaling, L3 is for customized scaling',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=guard" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "king": [
            "Hi Looper, I'm the LoopWorm King",
            "Welcome to my kingdom",
            'You can buy our <a target="_blank" href="https://loopexchange.art/collection/web3-pets">Web3 Pets</a> to support us.',
            'Check out <a target="_blank" href="https://twitter.com/LoopWorms">my twitter</a> and give me a follow!',
            "Stay wormy",
            "or else...",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=king" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],

        "king2": [
            "Hi Looper, I'm the LoopWorm King2. Eventually I'll have a reward for you.",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=king2" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],        
    
        "villagegirl": [
            "Hi there, Looper!",
            "I'm Bstrat515",
            "I'm a twitter influencer for the Layer 2 protocol Loopring on the Ethereum blockchain.",
            'Check out <a target="_blank" href="http://twitter.com/share?text=%40bstrat515">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=villagegirl" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "villager": [
            "Good day, eh, Looper, the name's Ordinary Adam.",
            'Check out my Loopring L2 <a target="_blank" href="https://loopexchange.art/collection/ordinaryadam">collection</a>.',
            'Visit <a target="_blank" href="https://twitter.com/Ordinary_Adam">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=villager" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "agent": [
            "Don't believe everything you see, Looper.",
            'Visit <a target="_blank" href="https://twitter.com/heydomoshi">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=agent" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "rick": [
            "We're no strangers to love",
            "You know the rules and so do I",
            "A full commitment's what I'm thinking of",
            "You wouldn't get this from any other guy",
            "I just wanna tell you how I'm feeling",
            "Gotta make you understand",
            "Never gonna give you up",
            "Never gonna let you down",
            "Never gonna run around and desert you",
            "Never gonna make you cry",
            "Never gonna say goodbye",
            "Never gonna tell a lie and hurt you",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=rick" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        
        "scientist": [
            "Greetings, Looper.",
            "I am the inventor of these two potions.",
            "The red one will replenish your health points...",
            "The blue one will make you invincible with the power of Loopring...",
            "But it only lasts for a short while.",
            "So make good use of it!",
            "Now if you'll excuse me, I need to get back to my experiments...",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=scientist" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "nyan": [
            "nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan nyan nyan",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=nyan" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        
        "beachnpc": [
            "lorem ipsum dolor sit amet",
            "consectetur adipisicing elit, sed do eiusmod tempor"
        ],
        
        "forestnpc": [
            "lorem ipsum dolor sit amet",
            "consectetur adipisicing elit, sed do eiusmod tempor"
        ],
        
        "desertnpc": [
            "lorem ipsum dolor sit amet",
            "consectetur adipisicing elit, sed do eiusmod tempor"
        ],
        
        "lavanpc": [
            "lorem ipsum dolor sit amet",
            "consectetur adipisicing elit, sed do eiusmod tempor"
        ],
    
        "priest": [
            "Boo!",
            'Check out my Loopring L2 <a target="_blank" href="https://nft.gamestop.com/collection/ghostlytales">collection</a>.',
            'Visit <a target="_blank" href="https://twitter.com/onevincesuarez">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=priest" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        
        "sorcerer": [
            "Welcome to LooperLands...",
            "Wondering how to get cool in-game weapons?",
            "You'll need to earn them by tasks",
            "Like visiting NPCs for Red Packets",
            "And daily gauntlets",
            "And PvP contests",
            "You can also sell and trade them on L2 marketplaces",
            "Weapons will gain experience as you use them.",
            "And progress is tranasactable.",
            "#OwnYourAssets #WeMakeOurOwnUtility",
            "Good luck.",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=sorcerer" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        
        "octocat": [
            "Welcome to LooperLands!",
            'Want to see the  <a target="_blank" href="https://github.com/balkshamster/looperlands">source code</a>?'
        ],
        
        "coder": [
            "It's YaBoyNancy",
            'You should check out my <a target="_blank" href="https://nft.gamestop.com/collection/yaboynancysignaturecollection">Signature Collection</a> on GSMP',
            'Visit <a target="_blank" href="https://twitter.com/yaboynancy">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=coder" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
    
        "beachnpc": [
            "TurntManJimi needs no introduction, Looper.",
            'You should check out my <a target="_blank" href="https://loopexchange.art/collection/interdemintionalsamurais">InterdeMINTional Samurais</a> collection',
            'Visit <a target="_blank" href="https://twitter.com/theobewhoturnz">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=beachnpc" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        
        "desertnpc": [
            "Gauntlet this way, Looper!",
            "Only the power of Loopring can save you",
            "It is dangerous to go alone! Take this.",
            "Haha, fooled you. But the Skeleton King may offer a prize",
            "in the form of a Red Packet if you and your friends are brave and strong."
        ],
    
        "othernpc": [
            "lorem ipsum",
            "lorem ipsum"
        ],

        "goose": [
            "Honk!",
            'I raise funds #ForTheChildren - <a target="_blank" href="https://twitter.com/hashtag/ForTheChildren?src=hashtag_click">click here</a> to help',
            'Check out <a target="_blank" href="https://twitter.com/RSKAGY">my twitter</a> and give me a follow or <a target="_blank" href="http://twitter.com/share?text=%40RSKAGY">tweet me</a>',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=king" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],

        "tanashi": [
            "Hi, I'm Tanashi!",
        ]
    };

    var Npc = Character.extend({
        init: function(id, kind) {
            this._super(id, kind, 1);
            this.itemKind = Types.getKindAsString(this.kind);
            this.talkCount = NpcTalk[this.itemKind].length;
            this.talkIndex = 0;
        },
    
        talk: function() {
            var msg = null;
        
            if(this.talkIndex > this.talkCount) {
                this.talkIndex = 0;
            }
            if(this.talkIndex < this.talkCount) {
                msg = NpcTalk[this.itemKind][this.talkIndex];
            }
            this.talkIndex += 1;
            
            return msg;
        }
    });
    
    return Npc;
});