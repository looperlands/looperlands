define(['character'], function (Character) {

    let NpcTalk = {
        "guard": [
            "Hello there, Looper",
            'You can learn more about <a target="_blank" href="https://medium.loopring.io/loopring-taiko-ready-layer-3-d9657327f908">Loopring and Taiko on Layer 3</a>.',
            "Layer 3 means we can build customized applications (like privacy) with scalability",
            'Vitalik Butarin <a target="_blank" href="https://vitalik.ca/general/2022/09/17/layer_3.html">said</a> L2 is for general-purpose scaling, L3 is for customized scaling',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=guard" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],

        "king": [
            //"/openShop wormking King's Shop",
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
        ///////////////////////OA NPCS////////////////////
        "torin": [
            "Slimes are encroaching on our lands!",
        ],

        "elara": [
            "Those pesky boars!",
        ],

        "eldrin": [
            "Greetings traveller! I'm the mayor of Hushwind.",
        ],

        "elric": [
            "I'd advise against entering, friend.",
        ],
        "gripnar": [
            "greetings warrior!",
        ],
        "keldor": [
            "The frost is gripping this area, stay safe friend",
        ],

        "draylen": [
            "Be careful out there wanderer, it's dangerous",
        ],

        "liora": [
            "Be careful of what lurks in the shadow",
        ],
        "torvin": [
            "Greetings traveller",
        ],
        "glink": [
            "Hehe! Twisted paths and endless loops, in this maze of many stoops.",
            "First may lead, third's a trick, but second steps, back you pick.",
            "Revisit a choice once made, or in circles you'll forever wade!",
        ],

        "neena": [
            "Hey there!",
        ],
        "thaelen": [
            "Greetings warrior, can you assist us?",
        ],
        "jeniper": [
            "Haven't seen you around! You new here?",
        ],
        "athlyn": [
            "Hey! you seem useful, let me put you to work!",
        ],
        "torvin": [
            "Hey can you see if my friend's safe?",
        ],
        "whiskers": [
            "Meeeow",
            "n'stuff",
        ],
        "gelidus": [
            "Greetings warrior",
        ],
        "edur": [
            "Spare a moment?",
        ],
        "lumi": [
            "Please, can you help me!",
        ],
        "snjor": [
            "I used to be an adventurer like you",
        ],
        "torian": [
            "Prepare yourself.",
        ],


        /////////////////////////////////////////////////////

        "scientist": [
            'Hey there, Looper. my name is <a href="https://www.cobmin.com" target="_blank">cobmin</a>.',
            "I\'m a creator and developer in the loopring ecosystem.",
            'I made the NFT toolkit <a href="https://maizehelps.art/" target="_blank">Maize</a>',
            'and am currently working on <a href="https://www.cobsfarm.com" target="_blank">Cob\'s Farm</a>.',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=scientist" target="blank">this link</a> - it might be a Red Packet!',
            "Remember, read to succeed Looper!"
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
            "Boo! I'm Vince Suarez' REAL Ghost",
            'Check out my Loopring L2 <a target="_blank" href="https://nft.gamestop.com/collection/ghostlytales">collection</a>.',
            'Visit <a target="_blank" href="https://twitter.com/onevincesuarez">my twitter</a> and give me a follow!',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=priest" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],

        "sorcerer": [
            "Welcome to LooperLands, I'm NickMan",
            'Visit <a target="_blank" href="https://twitter.com/NickManL2">my twitter</a> and give me a follow!',
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

        "wildwill": [
            "Arg me hearty! Pray, do ye have a trusty blade or pistol stowed away in yer pouch there??",
            "Ye do??",
            "Ah bless the winds upon this day!",
            "Behold yon sea beast o’re yonder! It gobbled up me ship and me loyal crew.",
            "I swear to Davey I will not rest until that foul creature meets his doom!",
            "Will ye help me?",
            "Grab yer crewmates and meet me by the shore! We be no match for this beast on our own.",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=wildwill" target="blank">this link</a> - it might be a Red Packet!',
        ],

        "desertnpc": [
            "I'm NFTSpike and should need no introduction.",
            "I make Web3 games on Loopring that are dope AF",
            'You should check out my <a target="_blank" href="https://www.spikedrollups.com/">Spiked Rollups</a> games',
            'Visit <a target="_blank" href="https://twitter.com/nftspike">my twitter</a> and give me a follow!',
            "The Skeleton King may offer a prize",
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
            "https://twitter.com/CyberTanashi",
            'Check out <a target="_blank" href="https://twitter.com/CyberTanashi">my twitter</a> and give me a follow or <a target="_blank" href="http://twitter.com/share?text=%40CyberTanashi">tweet me</a>',
            "Now go about your adventure, Looper!"
        ],

        "villagesign1": [
            "Journey Before Destination, Radiants."
        ],

        "miner": [
            "WHAT HAVE WE UNLEASHED?",
            "THE MEGAMAG IS HERE!",
            "Dug our own grave...",
            "Stay away from those caves Looper!",
            "It isn't safe out there..."
        ],

        "cobhillsnpc": [
            "Slimes...",
            "Slimes everywhere!",
            "They do look quite pretty, though."
        ],

        "coblumberjack": [
            "Come, get yourself warm by the fire!",
            "The ghosts haunt this forest...",
            "But the campfire keeps them away!"
        ],

        "cobcobmin": [
            "Welcome to Cob's Farm, traveler!",
            "View our scenic farms, admire vibrant flowers, and animals.",
            "If adventure calls, our dungeons are rife with monsters and rewards.",
            "Cob's Farm offers beauty and valor for everyone."
        ],
        "VILLAGESIGN2": ["Gregloop and Thunders Humble Abode."], //GREGLOOP
        "VILLAGESIGN3": ["Home of Ripnatius Ironhand"], //RIPNTEAR
        "VILLAGESIGN4": ["Pneuma's Dispensary"], //PNEUMA
        "VILLAGESIGN5": ["Bertles Turtle Club"],
        "VILLAGESIGN6": ["Scrimp House"],
        "VILLAGESIGN7": ["Home of Chocolate Wheystead"],
        "VILLAGESIGN8": ["BFA"], //BFA (Alex)
        "VILLAGESIGN9": ["Home of JackStraw"], // Jackstraw

        "cobellen": [
            "Ahh such beauty.",
            "I can't wait to grow my own flowers."
        ],

        "cobfern": [
            "Adventurer, beware! Slimes have taken over these parts recently.",
            "If you're heading to Willowdale Crossing, tread carefully.", 
            "The path is swarming with those gooey critters."
        ],

        "cobjohnny": [
            "Farm life is tough but it's something that we will all be able to do soon."
        ],
        "VILLAGESIGN11": ["Home of Haxmya"], // Home of Haxmya
        "VILLAGESIGN12": ["Squeaky Squeakerton's Squeakeasy"], //Squeaky's home
        "VILLAGESIGN13": ["Rookie Rodman"],
        "VILLAGESIGN14": ["Skilled Caster"],
        "VILLAGESIGN15": ["Seasoned Angler"],
        "VILLAGESIGN16": ["Adept Hookmaster"],
        "VILLAGESIGN": ["Change me"],
        "VILLAGESIGN17": ["Veteran Linehandler"],
        "VILLAGESIGN18": ["Elite Tacklechief"],
        "VILLAGESIGN19": ["Master Baiter"],
        "VILLAGESIGN20": ["Grand Fisher Sage"],
        "VILLAGESIGN21": ["Change me"],
        "VILLAGESIGN22": ["Change me"],
        "VILLAGESIGN23": ["Change me"],
        "VILLAGESIGN24": ["Change me"],
        "THEDIUS": ["Greetings"],
        "NIANDRA": ["Hello there"],
        "BLARK": ["Hello!"],
        "DANIEL": ["Salutations"],
        "ESTELLA": ["Greetings"],
        "CITYSIGN1": ["Home of MyCupBloody"],
        "CITYSIGN2": ["Phunk ‘n Stollen’s"],
        "CITYSIGN3": ["Home of Enraged"],
        "CITYSIGN4": ["FOR SALE!"],
        "CITYSIGN5": ["FOR SALE!"],
        "CITYSIGN6": ["FOR SALE!"],
        "CITYSIGN7": ["FOR SALE!"],
        "CITYSIGN8": ["FOR SALE!"],
        "CITYSIGN9": ["FOR SALE!"],
        "CITYSIGN10": ["FOR SALE!"],

        "cobelliott": [
            "Need your weapons sharpened or armor reinforced?", "Those Slimes might be soft, but they're pesky in large numbers.",
            "Stay vigilant out there.", "I've heard tales of bigger creatures lurking beyond the Slime-infested areas."
        ],

        "cobashley": [
            "Welcome to Willowdale Crossing!", 
            "We're a peaceful town, but lately, there's been trouble with Slimes nearby.",
            "You never know what you might encounter out there."
        ],

        "cobmauve": [
            "Ah, nothing beats a hot drink after a long day dodging Slimes, right?",
            "You look like you could use a break.", 
            "The wilderness is getting more dangerous by the day."
        ],

        "keeperariadne": [
            "Welcome, traveler!", "These portals are the gateways to familiar lands afar.", "Step through and find yourself where you need to be in mere moments."
        ],

        "mayoroswald": [
            "Greetings, traveler.", "Our town thrives on the bravery of adventurers like you.", "Can you help us with our Slime predicament?"
        ],

        "newcomersilas": [
            "Willowdale Crossing seems like a fine place to call home, doesn't it?", "If only I could decide on the right spot.", "What do you think of the area near the market?"
        ],

        "patroncora": [
            "This is the best spot in town for a cup of joe and the latest gossip."
        ],
        // @nextNPCLine@
    };

    var Npc = Character.extend({
        init: function (id, kind) {
            this._super(id, kind, 1);
            this.itemKind = Types.getKindAsString(this.kind);
            this.talkCount = NpcTalk[this.itemKind].length;
            this.talkIndex = 0;
            this.thoughts = [];
            this.thoughtsClearedCallback = null;
        },

        talk: function () {
            var msg = null;

            if (this.talkIndex > this.talkCount) {
                this.talkIndex = 0;
            }
            if (this.talkIndex < this.talkCount) {
                msg = NpcTalk[this.itemKind][this.talkIndex];
            }
            this.talkIndex += 1;

            return msg;
        },

        addThoughts: function (messages, thoughtsClearedCallback) {
            // add elements from messages array to thoughts array
            for (var i = 0; i < messages.length; i++) {
                this.thoughts.push(messages[i]);
            }

            this.thoughtsClearedCallback = thoughtsClearedCallback;
        }
    });

    return Npc;
});