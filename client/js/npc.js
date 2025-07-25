define(['character'], function (Character) {
    let NpcTalk = {
        // "example_dialogue_npc": [
        //     "You can put anything here, it won't be used, but there needs to be at least one line for the npc to show up"
        // ],
        "guard": [
            "Hello there, Looper",
            'You can learn more about <a target="_blank" href="https://medium.loopring.io/loopring-taiko-ready-layer-3-d9657327f908">Loopring and Taiko on Layer 3</a>.',
            "Layer 3 means we can build customized applications (like privacy) with scalability",
            'Vitalik Butarin <a target="_blank" href="https://vitalik.ca/general/2022/09/17/layer_3.html">said</a> L2 is for general-purpose scaling, L3 is for customized scaling',
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=guard" target="blank">this link</a> - it might be a Red Packet!',
            "Now go about your adventure, Looper!"
        ],
        "taikoguard" : [
            "Welcome to LooperLands, Taikonaut!",
            'Your F2P Looper (avatar) will allow you to explore but the best experience is with a premium asset which retains progress.',
            "Go explore - there is a GOOSE near the town with a Golden Sword NFT - get your own Red Packet with the Loopring wallet!",
            'See if you can get a Taiko powerup!',
            'More quests and TaikoTown are coming.',
            "Follow us on <a href='https://twitter.com/LooperLands' target='blank'>Twitter</a>."
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

        "forestnpc": [
            "Yahaha! You completed the quest!",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=beachnpc" target="blank">this link</a> and collect your prize!',
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
            "We should all start preparing ourselves",
            "The Bright Lord has conjured his first DIMMIE KILLER",
            "BIG BRIMMIE is coming to enslave the Dimmies!",
            "If he's not defeated...",
            "it could mean the end of dimmilization as we know it...",
            "We cannot let this happen!",
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr.php?NPC=beachnpc" target="blank">this link</a> and collect your prize!',
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

        "shopowner": [
            "/openShop potionshop Potion Shop",
        ],

        "blacksmith": [
            "/openShop blacksmith Blacksmith\'s shop"
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
            'Follow <a href="https://loopworms.io/DEV/LooperLands/QR/qr3.php?NPC=king&walletId={walletId}" target="blank">this link</a> - it might be a Red Packet!',
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

        "cobcatblack": [
            "Meow!",
            "Welcome to the basement, traveler.",
            "I'm BC, the guardian of the portals.",
            "Simply step on a portal to be transported to your desired destination.",
            "For now, you can return to Looper Lands or visit the Gilded Gryphon.",
            "More destinations will be available in the future, so keep an eye out!"
        ],

        "cobcobmin": [
            "Welcome to Cob's Farm, traveler!",
            "Our world is new and ripe for exploration.",
            "For now, you can wander our scenic farms, admire vibrant flowers, and meet the animals.",
            "Exciting adventures and quests will be added soon, so stay tuned!",
            "Cob's Farm is a place of beauty and potential, with many surprises on the horizon."
        ],

        "VILLAGESIGN2": ["Gregloop and Thunders Humble Abode."], //GREGLOOP
        "VILLAGESIGN3": ["Home of Ripnatius Ironhand"], //RIPNTEAR
        "VILLAGESIGN4": ["Pneuma's Dispensary"], //PNEUMA
        "VILLAGESIGN5": ["Bertles Turtle Club"],
        "VILLAGESIGN6": ["Bruv Shack"],
        "VILLAGESIGN7": ["Home of Chocolate Wheystead"],
        "VILLAGESIGN8": ["BFA"], //BFA (Alex)
        "VILLAGESIGN9": ["Home of JackStraw"], // Jackstraw

        "cobellen": [
            "Welcome to our lovely home!",
            "Isn't this world beautiful? I can't wait to fill our garden with vibrant flowers.",
            "Feel free to explore and relax. The farm holds many secrets and wonders.",
            "Together, we'll make Cob's Farm flourish with life and color."
        ],

        "cobminer": [
            "Hey there, traveler!",
            "You've stumbled upon my latest discovery, this mysterious cave.",
            "I'm just starting to dig, and who knows what treasures or secrets lie within.",
            "Come back later to see what I've unearthed!"
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

        "guardianfintan": [
            "I am the guardian of these waters.", "Your deeds ripple through the town's destiny."

        ],

        "newcomersilas": [
            "Willowdale Crossing seems like a fine place to call home, doesn't it?", "If only I could decide on the right spot.", "What do you think of the area near the market?"
        ],

        "patroncora": [
            "This is the best spot in town for a cup of joe and the latest gossip."
        ],
        "GOFFREY": ["Welcome to Duckville!",
                    'If you like ducks you can <a target="_blank" href="https://loopexchange.art/collection/dsgoinquackers">buy one here</a>',
                    "Please help save Duckville!"
        ],

        //m88n's NPCs
        "wenmoon": [
            "Yo! I'm wenmoon, I was sent down here to be your lunar envoy.",
            "Legend has it there are some pretty epic treasures hidden in The Nexus!",
            "I'd say check out Paradise Point first and have a good look around!",
            "This universe is ever expanding and joining the community helps keep you in the loop.",
            //'First stop: Dreamland! Own a piece from the <a target="_blank" href="https://loopexchange.art/collection/onesie-party">Its a Onesie Party! collection</a> for access to the VIP Lounge!',
            'On X? <a target="_blank" href="https://x.com/m88nwalker">Give m88nwalker a follow</a> to stay updated.',
            'How about Discord? <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for lots more!',
            "Keep your eyes open, be curious, ask quesions, and have fun!"
            //"Have fun!"
        ],

        "kingfroggy": [
            "Greetings! I'm Froggy, the King of DreamLand.",
            "Wanna be King of the next pillow fight?",
            'Own a piece from the <a target="_blank" href="https://loopexchange.art/collection/onesie-party">Its a Onesie Party! collection</a> for access to the VIP Lounge!',
            'Join us in Discord! <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for insider details.',
            "Have fun!"
        ],

        "nexan4": [
            "Pleased to meet you traveler!",
            "Welcome to Paradise Point East.",
            "This is a magical little beach town!",
            "Have you been on the yacht yet?"
        ],

        "nexan5": [
            "Hey friend! Are you looking for a quick snack?",
            "What are you in the mood for?",
            "/openShop the_snack_stand The Snack Stand"
            //"I'm waiting for my assistant to bring more supplies, check back again soon!"
        ],

        "nexan10": [
            "Ahoy! I'm Darwin, an explorer of the metaverse...",
            "I've noticed some cool new bugs around The Nexus.",
            "Keep your eyes peeled and see if you can find any too!"
        ],

        "nexan11": [
            "Greetings, power to the players! I'm a fellow gamer and collector.",
            'Join us in Discord! <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for insider details.',
            "Keep your eyes open for hidden stuff and have fun!"
        ],

        "nexan12": [
            "Pleased to meet you, I'm the head chef here in The Nexus!",
            "If you're ever looking for a little snack, check out our cart at the end of the street!"
        ],

        "nexan13": [
            "Whew, it's a warm one out today.",
            "Great weather to help the crops grow fast!",
            "We have some special crops in our garden ;)",
            "If you ever need a uh...tomato hook up, we got you covered!"
        ],

        "nexan14": [
            "Dig dig dig, all day long, dig dig dig, while I sing this song...",
            "Wanna play in the dirt with me?",
            "/openShop the_garden_stand The Garden Stand"
        ],

        "nexan15": [
            "Well hello there, I'm the local mail man here in The Nexus.",
            "Are you enjoying Paradise Point?"
        ],

        "nexan16": [
            "The fish are biting today!",
            'Grab a <a target="_blank" href="https://loopexchange.art/collection/assets-for-looperlands">fishing pole</a> and see if you can catch something epic...',
            "There is some easier fishing over on that dock for level 1 fishing rods.",
            "Once you get to level 3 you can start fishing off the shore with me."
        ],

        "nexan17": [
            "Go stare at the water, creep."
        ],

        "nexan18": [
            "It's always sunny in Paradise Point!",
            "This is my second favorite place to catch a tan.",
            "There's a hidden island out there, but you need a special compass to find it."
        ],

        "nexan19": [
            "It's a beautiful day for lounging at the beach!",
            "Hey, I hear the ocean is worth exploring...",
            "But first you have to beat up that octopus and take one of his tentacles."
        ],

        "nexan20": [
            "Enjoy the weather while we wait to moon!",
            "I wanna check out that yacht but you need a special ticket to board..."
        ],

        "nexan28": [
            "The water is amazing, come swim!",
            "Don't go out too far though, watch out for sharks..."
        ],

        "nexan29": [
            "Welcome to the Sun Chaser Champagne Lounge, special guest!",
            //"The bar is closed right now while re-stock, but it will open again soon!",
            //"Hang out and enjoy the luxuious vibes though! The fishing is great off the bow."
            "Most of these portals go to the private Helio Islands.",
            //"If you're interested in becoming an island owner you can DM m88nwalker to inquire.",
            "On the far right of the second floor is a portal to a secret hidden island.",
            "You'll need to find a mysterious compass to navigate to that one though...",
            "Can I get you something to drink from the bar?",
            "/openShop the_bar The Bar"
        ],

        "m88nmobilebartender": [
            "Well hello again!",
            "Can I get you something to drink from the bar?",
            "/openShop the_bar The Bar"
        ],

        "m88nbananastand": [
            "Well hello there, I'm mister manager!",
            "Welcome to The Nexus Exchange.",
            "There's always money in the banana stand ;)",
            "What can I get for you today?",
            "/openShop the_banana_stand The Banana Stand"
        ],

        "thehookup": [
            "Yo! I'm the hookup here in The Nexus...",
            "Whatcha need?",
            "/openShop trenchcoat Trench Coat"
        ],

        "nexan31": [
            "Hey there! How's it going? I'm Fred the Foreman.",
            "I'm working with the city planner to expand Paradise Point..."
        ],

        "nexan32": [
            "Yo, daddy-o!",
            "Nice sideburns..."
        ],

        "nexan33": [
            "Hey, what's up buddy?",
            "Nice day out huh?",
            "Did you know that completing certain quests in The Nexus will unlock secret doors?"
        ],

        "nexan34": [
            "Hey there!",
            "What's shakin?",
            "That octopus can be hard to take down unless you have a group.",
            "He does give a pretty massive xp reward once you defeat him though..."
        ],

        "m88nbushguy": [
            "Pssst..."
        ],

        "m88nsignguy": [
            "wen?",
            "Tomorrow!"
        ],

        "m88nmysteryhood": [
            "You wanna know what's in the box don't you?",
            "You'll see..."
        ],

        "m88ntaikotwin1": [
            "Yo yo! We're the Taiko Twins!",
            "Head north to get to the train station, from there you can visit any of the lands...",
            "Head south to explore Paradise Point and the rest of The Nexus..."
        ],

        "m88ntaikotwin2": [
            "Yo yo! We're the Taiko Twins!",
            "Head south to explore Paradise Point and the rest of The Nexus...",
            "Head north to get to the train station, from there you can visit any of the lands..."
        ],

        "m88nstimytimy": [
            "GM GM, I'm Stimy Timy!",
            "I spent my stimulus on crypto, nfts, and stonks. I'm gonna be rich soon, living the island life!",
            'Checkout <a target="_blank" href="https://stimy-timy.mintopia.top/">my new collection </a>on Base...',
            "You can integrate any of those NFT's as an avatar or a companion to use in here!",
            'Come<a target="_blank" href="https://x.com/stimytimy"> follow me on X</a>, and say hi!',
            'And come <a target="_blank" href="https://discord.gg/bjjNewZegM">join us in Discord </a>for insider details.'
            //"If you want to buy a private island here in The Nexus checkout Nexus Real Estate, they have some for sale."
        ],

        "m88nrealtyagent": [
            "Howdy! I'm Gary, the real estate agent for Nexus Realty.",
            "If you're looking to buy some property in The Nexus, you've come to the right place.",
            "Right now we have several properties available and when you buy from us you get a FREE Lambo!",
            "If you're digging the boardwalk, we have beach houses avialable in Paradise Point...",
            //"And if you're looking for something a little more exclusive we have private islands available in the Helio Islands.",
            "If you're looking for something exclusive we have private islands available in the Helio Islands.",
            //"That yacht over there, The Sun Chaser, has a private Captain's Quarters on it that is available to purchse.",
            "And if you really want to get out of town, we have m88n pods available in Lunaria",
            'Checkout <a target="_blank" href="https://discord.gg/bjjNewZegM">PLANET M88NWALKER in Discord</a> and DM m88nwalker to inquire.',
            'On X? <a target="_blank" href="https://x.com/m88nwalker">Give him a follow</a> to stay updated.',
            "Have fun exploring The Nexus. There are lots of hidden treasures around here!"
        ],

        "m88ngenie": [
            "What's up pal! I'm the all powerful magic genie!",
            "Congratulations on finding my magic lamp...you gave it a rub and now I'm here to grant your wish!",
            "You have 15 seconds to pick as many wishes as you can, then I will disappear until you find my lamp again...",
            "/openShop make_a_wish Make a Wish"
        ],

        "nexan35": [
            "How's it going?",
            "You like gold?",
            "If you go bash some crabs on the beach they drop gold sometimes."
        ],

        "nexan36": [
            "Hey there explorer!",
            "Keep your eyes peeled for treasure chests filled with random goodies.",
            "Make sure to look behind things too, they're not always out in the open..."
        ],

        "nexan37": [
            "Ya dig the drums? So does my cat.",
            'Check it... <a target="_blank" href="https://www.youtube.com/watch?v=NUYvbT6vTPs">Cat Digs Polka Drums</a> ...LOL',
            "Did you hear about DreamLand?? Something weird happened...",
            "It's more of a NightmareLand now...I think they need your help in there!"
        ],

        "nexan38": [
            //"Hey there!",
            "Where am I?"
        ],

        "nexan39": [
            "Well hello!",
            "Welcome to Paradise Point West.",
            "Make sure to meet the residents and talk with them, they know things..."
        ],

        "nexan40": [
            "Hey there!",
            //"Legend has it there is a secret portal back to DreamLand somewhere in LooperLands...",
            //"But you have to be wearing a magical onesie to pass through it.",
            //'View available onesies from the <a target="_blank" href="https://loopexchange.art/collection/onesie-party">Its a Onesie Party! collection</a> and choose yours!',
            //'Join us in Discord! <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for insider details.',
            "Good luck on your journey!"
        ],

        "nexan41": [
            //"Hey there!",
            "So many beautiful flowers around here!",
            "Completing quests in The Nexus can yeild some big rewards..."
        ],

        "nexan42": [
            //"Hey there!",
            "Some of these bushes really don't like when I trim them."
        ],

        "nexan43": [
            //"Hey there!",
            "Have you fished in the ocean yet?",
            "There is a fisherman down by the beach who can rent you a pole if you don't have one..."
        ],

        "nexan44": [
            //"Hey there!",
            "How do you like the tunes?"
        ],

        "nexan45": [
            "Just sweeping up some sand...",
            "Hey, I left some little piles of magical sand all around The Nexus...",
            "If you stand on top of it a portal will bring you back here to the beach."
        ],

        "nexan46": [
            "Hey there!",
            "I'm trying to make some m88n gems being a street performer.",
            "It's a pretty good gig, there are a lot of tourists that come through here."
        ],

        "nexan47": [
            //"Hey there!",
            "It's been 84 years...",
            "But I did find it once, long ago...",
            "And it was glorious...",
            "I'll find it again some day, it feels like it's so close..."
        ],

        "nexan48": [
            //"Hey there!",
            "Mmmmmm, m88nshine!",
            "This stuff is out of this world!",
            "You can find more in the Champagne Lounge on the Yacht!"
        ],

        "m88nmermanking": [
            "Hey there explorer, welcome to my kingdom!",
            "Congratulations on finding my hidden treasure!",
            "You know all about Poseidons Trident right?",
            'If not you can <a target="_blank" href="https://explorer.loopring.io/nft/0x1e8ab2cc09be581530bb9f3ac94353f6f7412239-0-0x9c501909139284402c5cb7b992f5584ead266e5d-0x040242f718b1846887030ee10304e0887bc6ada30cf58d3a8fe449cbe5067e2b-10">learn about the lore of Poseidons Trident</a> and see it here!',
            'Make sure to snap a selfie with me and <a target="_blank" href="https://discord.gg/bjjNewZegM">DM m88nwalker in Discord</a> to see if you are one of the first 8.',
            "And if you own a home in The Nexus pick out a couple pieces to take home with you.",
            "Just let m88nwalker know and he'll move it over for you."
        ],

        "m88nmermaidprincess": [
            "Heyyyy, you found Atlantis!",
            "Congratulations, that's pretty impressive...",
            "Considering how often it magically relocates...",
            "Have you been collecting those mysterious maps we hid around The Nexus?",
            "If you have all 741 of them, you may enter the forbidden city behind me!"
        ],

        "kingfroggybw": [
            "Greetings! I'm Froggy, you have entered the twilight zone. Welcome to NightmareLand...",
            "If you ask around enough you may find a few who remember the magic of DreamLand.",
            "But that is nothing but a faint memory now...",
            "When the dark clouds rolled in these horrible monsters came with them.",
            "Will you please help us restore DreamLand to it's origins by completing a series quests?",
            //"By the way, legend has it there is a secret portal back to DreamLand somewhere in LooperLands...",
            //"But you have to be wearing a magical onesie to pass through it.",
            //'View available onesies from the <a target="_blank" href="https://loopexchange.art/collection/onesie-party">Its a Onesie Party! collection</a> and choose yours!',
            //'Join us in Discord! <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for insider details.',
            "Good luck on your journey!"
        ],

        "m88nape": [
            "Congratulations on finding the hidden island!",
            "Looks like our plan of no cell, no sell worked, check out who we locked up so far...",
            "If you grab that crossbow to the side there you can sling pies at these clowns!",
            "Have fun and enjoy that free rental for 24 hours!",
            'If you want to buy a premium asset <a target="_blank" href="https://explorer.loopring.io/collections/0xdd2221cfd3a7068ca78c03784fa076c39f11de60">check out the Pie Slingers collection</a> and choose yours!',
            'If you want to see the origins of the clowns <a target="_blank" href="https://loopexchange.art/collection/clown-people">check out the Clown People collection</a> and tell us your favorite!',
            'Join us in Discord! <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for insider details.',
            "Have fun! They drop more DRS'd shares of GME so you can stock back up!"
        ],

        "m88nsage": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-maps-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage2": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-compass-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage3": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-binoculars-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage4": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-skeleton-key-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage5": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-mermaid-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage6": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-undertow-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nsage7": [
            "Greetings! They call me the Sage because I know all the secrets of The Nexus...",
            "Only the most dedicated or lucky travellers find me, so congratulations.",
            'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-mirror-legend/">a piece of the legend</a> with you. Read carefully...',
            "Good luck on your journey!"
        ],

        "m88nfrosty": [
            "Happy Birthday!",
            "Hey! Remember me? I'm from m88nwalker's first LooperLands collection!",
            "There was enough magic left in my hat to stop by and share a little snow.",
            "It's warm here so I can't stay long, but I had to let you know...",
            "We're hanging out on Santa's Secret Island, while we wait for next Christmas!",
            //'If you own a piece from the <a target="_blank" href="https://loopexchange.art/collection/looperlands-christmas">Christmas in LooperLands collection</a> you get early access!',
            //"After Christmas is over I won't have enough magic to keep the portal open. But...",
            'If you own a piece from the <a target="_blank" href="https://loopexchange.art/collection/looperlands-christmas">Christmas in LooperLands collection</a> you can come visit anytime!',
            "Have fun and stay frosty!"
            //"Enjoy the holidays! See you in there!"
        ],

        "m88nsanta": [
            "Ho ho ho!",
            "Make sure to be collecting Manacrystals...",
            "You can use them to craft potions that refill your snowball inventory.", 
            //'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-mirror-legend/">a piece of the legend</a> with you. Read carefully...',
            "/openShop potionshop Potion Shop"
        ],

        "m88nrudolph": [
            "Sup ho ho homie!",
            "Those naughty little elves over there are pestering the reindeer.",
            //'As a reward, I will share <a target="_blank" href="https://m88nlabs.com/the-nexus-mirror-legend/">a piece of the legend</a> with you. Read carefully...',
            "Can you go smack them around for me?"
        ],

        "m88ntownie": [
            "Heyyy! What's up?",
            "My Name is Ty, I'm a Townie! Are you on Taiko yet?",
            "A new NFT collection of all my friends are on Taiko!",
            'You can <a target="_blank" href="https://on.mintpad.co/townies">mint your Townie NFTs</a> directly on Mintpad.',
            "Then just talk to m88nwalker if you want to upgrade and have it integrated like me.",
            "Wanna know something else cool?...",
            "If you get lucky and mint a legendary Zombie Townie...",
            'You get to pick out another one from the <a target="_blank" href="https://loopexchange.art/collection/zombie-townies">Zombie Townies collection</a> on Loopring for free!',
            "Join the Townie Clan!"
        ],

        "m88ntownie2": [
            "Hello, welcome to The Nexus Merch Shop!",
            "Grab a glass of champagne and take a look around.",
            "Walk up to the computer at the counter to browse our inventory online.",
            "There will be new fresh designs added periodically.",
            "Talk to m88nwalker about any custom design ideas you have.",
            "Thanks for shopping with us!",
            "Have a great day!"
        ],

        "m88ntownies": [
            "Heyyy! What's up?",
            "We're The Townies! Are you on Taiko yet?",
            "A new NFT collection of all my friends are on Taiko!",
            'You can <a target="_blank" href="https://on.mintpad.co/townies">mint your Townie NFTs</a> directly on Mintpad.',
            "Then just talk to m88nwalker if you want to upgrade and have it integrated like me.",
            "Wanna know something else cool?...",
            "If you get lucky and mint a legendary Zombie Townie...",
            'You get to pick out another one from the <a target="_blank" href="https://loopexchange.art/collection/zombie-townies">Zombie Townies collection</a> on Loopring for free!',
            "Join the Townie Clan!"
        ],

        "m88nastronaut": [
            "Yooo! Wanna play some laser tag?",
            //"Gather some players and DM m88nwalker for the gear!",
            'Gather some players and <a target="_blank" href="https://discord.gg/bjjNewZegM">DM m88nwalker</a> for the gear!',
            "Make sure to be collecting ore and gold...",
            "You can use them to craft potions that refill your laser ammo inventory.", 
            "/openShop blacksmith Blacksmith\'s shop"
        ],

        "nexanzombiecat": [
            "Mmmmm brains.....",
            "Just kidding, it's only rotten cat food!"
        ],

        "nexanexecutioner": [
            "Gather round...",
            "The show is just about to start..."
        ],

        "nexanzombie2": [
            //"Mmmmm brains.....",
            "Arrrr, uhhhhhh, mmmmm!"
        ],

        "nexanzombie3": [
            //"Mmmmm brains.....",
            "Arrrr, uhhhhhh, mmmmm!"
        ],

        "nexanzombie4": [
            //"Mmmmm brains.....",
            "Arrrr, uhhhhhh, mmmmm!"
        ],

        "nexanzombie5": [
            //"Mmmmm brains.....",
            "Arrrr, uhhhhhh, mmmmm!"
        ],

        "nexanhazmat2": [
            "Howdy! I'm from the Nexus Hazmat Response Team...",
            "We'll be bringing in some more supplies soon.",
            "It's getting hot in here and I'm ready for my lunch break...",
            "Think I'm gonna go grab some chicken wings.",
            "Speaking of...can you and your companion go slay hotwing while I'm gone?",
            "That labyrinth balances out the funky energy in here so we need to keep it clear."
        ],

        //MRMlabs NPCs
        "tylerdurden": [
            //"We are all part of the same compost heap.",
            //"The things you own end up owning you.",
            "It's only after we've lost everything that we're free to do anything.",
            //"Sticking feathers up your butt does not make you a chicken!",
            //"You decide your own level of involvement.",
            //"You wanna make an omelet, you gotta break some eggs.",
            //"His name was Robert Paulson",
            //"I want you to hit me as hard as you can."
        ],

        //Taiko Town NPCs
        "taikotownnpc1": [
            //"Hello World.",
            //"I am the first NPC in Taiko Town, it feels good to be alive!",
            "Well hello there!",
            "You must be here to learn about LooperLands.",
            "To get started, head down to the bottom of this map and locate the Taiko HQ.",
            "My friend is down there and he's expecting you!",
            "Look for the double pink arrows pointing toward him.",
            "He'll have instructions for your first quest..."
            //"Pretty soon my friends and I are going to have a bunch of quests we'll need your help with..."
        ],

        "taikotownnpc2": [
            "Welcome to Taiko Town!",
            "This is one of many worlds in LooperLands, a free online multiplayer role playing game.",
            "Explore that bar at the bottom of your screen. You'll see things like your chat, quest log, and inventory.",
            "Talk to NPC's around here for information and quests.",
            "If you think you're lost you can pull up a map overview by pressing (M) on your keyboard.",
            "Look for the double pink arrows pointing toward them.",
            'Need help? <a target="_blank" href="https://discord.gg/zWFKjfS2PA">Join us in Discord</a> and ask away!'
        ],

        "taikotownnpc3": [
            "Power to the players!",
            "Completing loot quests is another way to earn bonus xp and level up your assets.",
            "Check your quest log if you're trying to figure out where to go.",
            "If you think you're lost you can pull up a map overview by pressing (M) on your keyboard.",
            'Need help? <a target="_blank" href="https://discord.gg/zWFKjfS2PA">Join us in Discord</a> and ask away!'
        ],

        "taikotownnpc4": [
            "Greetings!",
            "LooperLands is free to play, but F2P assets will not retain their progress or level.",
            'Browse <a target="_blank" href="https://looperlands.io/shop">our shop</a> to purchase assets that can level up.',
            'You can also <a target="_blank" href="https://on.mintpad.co/townies">mint a Taiko Townie NFT</a> directly on Mintpad.',
            'Then just <a target="_blank" href="https://discord.gg/zWFKjfS2PA">DM us in Discord</a> to get your asset integrated!',
            "Check your quest log if you're trying to figure out where to go.",
            "If you think you're lost you can pull up a map overview by pressing (M) on your keyboard.",
            'Need help? <a target="_blank" href="https://discord.gg/zWFKjfS2PA">Join us in Discord</a> and ask away!'
        ],

        "taikotownnpc5": [
            "Howdy!",
            "Did you know you can also go fishing in LooperLands?!",
            "Check your quest log if you're trying to figure out where to go.",
            "If you think you're lost you can pull up a map overview by pressing (M) on your keyboard.",
            'Need help? <a target="_blank" href="https://discord.gg/zWFKjfS2PA">Join us in Discord</a> and ask away!'
        ],

        "taikotownnpc6": [
            "Hey there.",
            "Check your quest log if you're trying to figure out where to go.",
            'Need help? <a target="_blank" href="https://discord.gg/zWFKjfS2PA">Join us in Discord</a> and ask away!'
        ],

        "taikotownnpc7": [
            "Feel free to stick around and explore Taiko Town more or check out the many other worlds",
            "that are a part of LooperLands by hopping on the train across from each billboard!",
            'Come <a target="_blank" href="https://discord.gg/zWFKjfS2PA">join us in Discord</a> if you are not in there already...cheers!'
        ],

        "stupidmonkey": [
            "Welcome to StupidMonkeys Realm Hero, where dynamic NFTs bring your monkeys to life!",
            "Level up, evolve, and conquer in thrilling PvP battles to claim your title as the Hero of the MonkeyRealm!",
            'Come <a target="_blank" href="https://www.stupidmonkeys.co/">check out our website</a> to learn more!'
        ],

        //Robits NPCs
        "ROBITSC1": [
            "Welcome to Cyber City.",
            "Have you visited Mase's Bar yet?",
            "Beep Boop.",
        ],
        "KAWAIIPRINCESS": [
            "Hi! Im Kawaii Princess!",
            "Can you help save Cyber City?",
            "Come visit us at Mox-E's Karaoke Bar!",
        ],
        "KAWAIIPRINCESS2": [
            "What a perfect night for Karaoke!",
            "Its the end of the month and the weekend!",
            "Let's kill this love!",
        ],
        "CLOWNCAPONEBIT": [
            "Hey ya big Clown! It's your favorite Web 3 Clown here Clown Capone.",
            "The Circus is coming to Town!",
            'Wanna <a target="_blank" href="https://marketplace.lifesajoke.xyz/lifesajokenft">join the Circus</a>?!',
        ],

        //Short Destroyers
        "derrick": [
            "Sup man. Heard you got stuck doing Misty's shelving duty. We've all been there.",
            "Sucks man. She's never gonna leave that suited dude for us. He's going places.",
            "Listen… I've got this acid, but I can't do it."
        ],
        "frog": [
            "Checkout the Acid Lake! It might be hiding some goodies..."
        ],
        "angrymom": [
            "You should be ashamed of yourselves. This store is full of filth! What if a child had seen this garbage? I don't think this is the kind of image you want to project to the world."
        ],
        "devon": [
            "Here's a flier with all the info... Whoaaaa! All the fliers flew away!",
            "Appreciate the help... This show will be a blast!"
        ],
        "misty": [
            "Oh hey.",
            "I'm alright... just not feeling very good today.",
            "I didn't call in sick because I thought it would be messed up for y'all with the A.M. here all day, but... *makes puppy dog eyes at you* It would be so chill of you if you could cover for me?",
            "Yeah... I was on shelving duty."
        ],
        "managertim": [
            "Get back to work.",
            "Have you seen that lady's kid?",
            "That guy's been staring at that video game wall for hours. Can you help him?"
        ],
        "oracle": [
            "I think the system is glitching.",
            "See that giraffe over there?",
            "They keep sending people to kill it...",
            "but it just keeps coming back...",
        ],
        "gill": [
            "I'm looking for this game. Do you have it? Rampage"
        ],
        "customer1": [
            "You know what movie was really good? Hitch. I don't even care if it's for girls.",
            "Did you see the news yesterday? That new factory just finished up the road. Can't believe this shithole town's just getting worse.",
            "Do y'all got a box set of The OC? It's for my girlfriend..."
        ],
        "customer2": [
            "I don't really like scary movies. Is there anything less frightening in this section?",
            "I'm not really in the mood for anything too action-y, either.",
            "Do y'all have a box set of The OC?"
        ],
        "portalgill": [
            'Rumors of their death are greatly exaggerated...',
            'Pickup a <a target="_blank" href="https://loopexchange.art/collection/riseofthezombiestockloopers">Zombie Short Destroyer here</a> for access!',
            'Or you can grab an <a target="_blank" href="https://loopexchange.art/collection/riseofthezombiestockweapons">SDU weapon here</a>!'
        ],
        
      
        "ZILEEL": [
            "Thank you for joining us friend!",
            "Do you want to build a snowman?",
            "BOOMBAYAH"
        ],
        "HDUCKLEE": [
            "I'm HDuckLee!",
            "Objection, your Honor!",
            "Have you heard of Implied Warranty of Habitability?"
        ],

        "APEBRAIN1":  [
            "Join the Apebrains army.",
            "Cyber Kong is controlling our Apebrain friends!",
            "Team up and let's raid against him.?"
        ],

        "CORTEZ":  [
            "Watch your back, kid. This city's glitchier than code.",
            "Legends speak of a hidden sector, full of treasures and dangers.",
            "Keep sharp weapons and sharper wits. In Cyber City, they're your lifelines."
        ],

        "NICO1":  [
            "Hi! I'm Nico!",
            "Want to play darts?",
            "Soju is water."
        ],

        "JUSTIN":  [
            "Would you like a drink?",
            "You ever try diving or mountaineering traveler?",
            "Enjoy your stay in Cyber City"
        ],

        "GAVIN":  [
            "She'd take the world off my shoudlers...",
            "Cyber City may be a glitchy mess, but it's home.",
            "ZILEEL is my favorite!"
        ],

        "KARAOKEBIT":  [
            "Thank you for visitng Mox-E!",
            "Here take this Red Envelope!",
            "Enjoy your time in Cyber City!"
        ],

        "BALKSBIT": [
            "Hi im Balks!",
            "My hamsters have escaped!",
            "Will you help me find them?"
        ],
        "BIRDSBIT": [
            "Hi friends, Birds here!",
            "Thank you for visiting Cyber City!",
            "Birds Boss Raid coming soon!"
        ],
        "CRISPYBIT": [
            "Whats uppp?",
            "Hi im Crispy",
            "Are you enjoying Cyber City?"
        ],
        "DARIUS": [
            "Oh, hello there.",
            "Omae wa mou shindeiru",
            "Shinra Tensei"
        ],
        "SEB": [
            "Heh, you're new here, aren't you?",
            "Don't worry, you'll get the hang of it.",
            "Come back if you need anything."
        ],
        "NAH": [
            "Are you visiting Cyber City?",
            "I'm Nah, the owner of Mox-E's Karaoke Bar.",
            "Enjoy your stay!"
        ],
        "FUZZYBIT": [
            "Fuzzy here!",
            "Have you seen the new NFTs?",
            "Check out Layerloot <a target='_blank' href='https://www.layerloot.io/'>here</a>!"
        ],
        "JIMBIT": [
            "Come battle in our PvP Rumble Legacy arena!",
            "Are you brave enough to face the best?",
            "Show your skills and earn your place in the Hall of Fame!"
        ],
        "DSOUZBIT": [
            "Hi Ds0uz here!",
            "Check out the Gamer's Galaxie podcast <a target='_blank' href='https://rss.com/podcasts/gamersgalaxie/'>here</a>!",
            "BEEP BOOP MO$*!"
        ],
        "OBSERVER": [
            "Observer here.",
            "74K makes the best music.",
            "Raves coming soon to Cyber City!"
        ],
        "PIZZABIT": [
            "Get your pizza here!",
            "Ahh, the smell of fresh pizza!",
            "I'm walking here!"
        ],
        "JACKBIT": [
            "I come from the past to warn you of the future.",
            "Evil lies within the shadows of Cyber City",
            "Quickly, you must find the hidden sector and defeat the evil within."
        ],
        "GENTLEBIT": [
            "Welcome to the Cyber Dragon Suites!",
            "You must own A Cyber Dragon Suite Key to enter your room!",
            "Buy a piece of Cyber City history <a target='_blank' href='https://loopexchange.art/collection/cybercity'>here</a>!",
            "How may I be of service?"
            
        ],
        "MAGMABIT": [
            "Welcome to the Magma Chamber!",
            "Infernoid lies ahead, are you ready to face him?",
            "May the fire of the Magma Chamber guide you."
        ],
        "ROBITSMAIN": [
            "Come visit us in Cyber City! :)",
            "Grab a Cyberbit <a target='_blank' href='https://loopexchange.art/collection/cybercity'>here</a>!",
            "Beep Boop"
        ],
        "DFVBIT": [
            "A few things I am not. I am not a cat.",
            "Ya got a meme buddy?",
            "Hang in there!"
        ],
        "PRINCEBIT": [
            "Have you seen Joe?",
            "I hear MRM Labs has a map coming soon.",
            "Inkheads are the best!"
        ],
        "BIDENBIT": [
            "zZz",
        ],
        "ARTWHITE": [
            "Hi friend ArtWhite here! :)",
            "Come eat some Burgers at Burgercats!",
            "Thank you for visiting!"
        ],
        "ARTWHITEROBIT": [
            "Hi friend! I was created by both ArtWhite and Robits!",
            "You might be able to grab me as an Avatar <a target='_blank' href='https://loopexchange.art/collection/cybercity'>here</a>!",
            "I love burgercats!"
        ],
        "OCARINABIT": [
            "Hi I'm Ocarina!",
            "Welcome to the Tea room!",
        ],
        "WENMOONBIT":  [
            "Hey there, I'm wenmoon. I was sent here by m88nwalker, welcome to LooperLands!",
            "There are many different galaxies in LooperLands, our home is The Nexus.",
            "Come check it out sometime, Paradise Point is where you're gonna want to start.",
            'On X? <a target="_blank" href="https://twitter.com/moonwalker_nfts">Give us a follow</a> to stay updated.',
            'How about Discord? <a target="_blank" href="https://discord.gg/bjjNewZegM">Checkout PLANET M88NWALKER</a> for lots more!',
            "Check out our collections <a target='_blank' href='https://loopexchange.art/profile/0x1e8ab2cc09be581530bb9f3ac94353f6f7412239'>here</a>!",
            "Have fun exploring LooperLands!"
        ],
        "FEDORABIT":  [
            "Hi im Fedora!",
            "Check out FedoraVerse <a target='_blank' href='https://loopexchange.art/collection/fedoraverse3'>here</a>!",
        ],
        "APEBRAINOG": [
            "Hi my name is Jinzo!",
            "Check out my Apebrain Collection <a target='_blank' href='https://loopexchange.art/collection/apebrain'>here</a>!"
        ],
        "SIREN": [
            "Legends say that Sirens have held the Arden Depths captive since the beginning of time.",
            "Check out my Apebrain Collection <a target='_blank' href='https://loopexchange.art/collection/sirensoftheardendepths'>here</a>!",
            "Embrace the Siren's song!"
        ],
        // BITCORN NPCS
        "BITNPC_BITCORN": [
            "Hello There. Welcorne to the cornHOLE!",
            "Looking for bits x bit looperland items? <a target='_blank' href='https://loopexchange.art/collection/bitsxbit'>Try Here!</a>",
            "<a target='_blank' href='https://loopexchange.art/collection/FunkyTacos'>FunkyTacos purchased from enchworm.loopring.eth</a> are also a part of the bits x bit looperlands collection!",
            "Have you heard of the worminati?",
            "👀👀",            
            "LIFE IS A-MAIZ-ING",
        ],
        "BITNPC_THORNBEARD_KNEEL": [
            "Folks 'round here call me Thornbeard...<br> guess it makes sense when your beard's more weed than whisker.",
            "I tell ya, gettin' seeds to grow in this soil is gonna be the end of me.",
            "I give 'em water... Nothin'",
            "I gave 'em shelter... Nothin'",
            "I tell 'em stories.... Nothin'",
            "I sing rockin' cool oldies.... Nothin'",
            "Well... except Bud.<br><i>[Gently pats the little sprout]</i><br>I can't let him down, gotta get 'em the family he deserves.",
        ],
        "BITNPC_THORNBEARD": [
            "Folks round here call me Thornbeard.<br>Guess that's what happens when your beard's more weed than whisker."
        ],
        "VOYAGER": [
            "Prepare for the Dark Voyage!",
            "Help us take back our ship and save our crew!",
            "Please take this to help you on your journey <a target='_blank' href='https://imgur.com/a/2fOBZvn'>Try Here!</a>",
        ], 
        "VOYAGERMONKEY": [
            "Save our friends!",
            "HOO HOO HA HA!",
            "Ape dont fight ape!, we must unite!",
        ], 
        "CHEN": [
            "Are you ready to journey into space?",
            "Aliens are dangerous, dont get caught!",
            "You might need this <a target='_blank' href='https://imgur.com/a/gKoXhHK'>Try Here!</a>",
        ], 
        "VOYAGERROBIT": [
            "The aliens are up ahead, get ready!",
            "Take this with you <a target='_blank' href='https://imgur.com/a/ZDJq7xb'>Try Here!</a>!",
            "Beep Boop",
        ], 
        "SARAH": [
            "The evil Zorath is up ahead!",
            "Let's take back our ship!",
        ], 
        "MOONBASES": [
            "Thank you for your help space cadet!",
            "I hope this helps you on your journey <a target='_blank' href='https://imgur.com/a/QaDRUKn'>Try Here!</a>",
        ], 
        "NURSEOWNER": [
            "Welcome to Aberdeen Institute School of Nursing, my name is Dr. Bernard!",
            "Left-sided heart failure occurs when the left ventricle cannot pump blood effectively to the rest of the body, leading to a buildup of fluid in the lungs.",
            "Common symptoms include shortness of breath, coughing, and fatigue.",
            "Please check out our Institute's website <a target='_blank' href='https://aberdeen.institute/'>Here!</a>",
        ],
        "WHISPYRED": [
            "Be sure to grab a little Ghosty <a target='_blank' href='https://loopexchange.art/collection/cybercity'>Here!</a>",
            "Cyber City is Haunted!",
            "Have you seen Whispy the Diamond Ghost anywhere?",
            "He might be stuck in a secret spot in the Haunted Mansion!",
            "Be on the lookout, he might have something for you...",
        ],
        "WHISPYWITCH": [
            "Enter the Haunted House if you dare!",
            "Thank you for coming! Take this red packet <a target='_blank' href='https://imgur.com/a/halloween-2024-cyber-city-WgjsXcs'>Here!</a> ",
        ],
        "WHISPYKING": [
            "Are you ready to take on the Pumpkin Warlock?",
            ""
        ],
        "WHISPYBOBBY": [
            "Bobby here! Welcome back!",
            "Evil lies beyond those doors, stay close to your friends.",
        ],
        "WHISPYDIAMOND": [
            "Oh thank goodness! You found me!",
            "Do you know the way out?",
            "Take this Red Packet as a thank you for finding me!<a target='_blank' href='https://imgur.com/gallery/whispy-diamond-ghost-9mOqsxK'>Here!</a>",
        ],
        "WHISPYLL": [
            "Hi I'm Whispy the Ghost! Please help purify the ghosts in Cyber City!",
            "Bring a little Ghosty home today <a target='_blank' href='https://loopexchange.art/collection/cybercity'>Here!</a>",

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
            this.showIndicator = false;
        },

        talk: function (walletId) {
            let msg = null;

            if (this.talkIndex > this.talkCount) {
                this.talkIndex = 0;
            }
            if (this.talkIndex < this.talkCount) {
                msg = NpcTalk[this.itemKind][this.talkIndex];
            }
            this.talkIndex += 1;

            msg = msg.replace("{walletId}", walletId);

            return msg;
        },

        addThoughts: function (messages, thoughtsClearedCallback) {
            // add elements from messages array to thoughts array
            for (var i = 0; i < messages.length; i++) {
                this.thoughts.push(messages[i]);
            }

            this.thoughtsClearedCallback = thoughtsClearedCallback;
        },

        setShowIndicator: function (indicator) {
            this.showIndicator = indicator;
        },

        hasTalked: function() {
          this.hasTalkedRecently = true;
        },

        hasInteraction : function () {
            if ((this.showIndicator || this.thoughts.length > 0 || NpcTalk[this.itemKind].length > 0) && !this.hasTalkedRecently) {
                return true;
            }

            setTimeout(() => this.hasTalkedRecently = false, 500);
            return false;
        }
    });

    return Npc;
});