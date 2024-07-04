
define(['item'], function(Item) {

    let Items = {

        Sword2: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.SWORD2, "weapon");
                this.lootMessage = "You pick up a steel sword";
            },
        }),

        Axe: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.AXE, "weapon");
                this.lootMessage = "You pick up an axe";
            },
        }),

        RedSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDSWORD, "weapon");
                this.lootMessage = "You pick up a blazing sword";
            },
        }),

        BlueSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.BLUESWORD, "weapon");
                this.lootMessage = "You pick up a magic sword";
            },
        }),

        GoldenSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOLDENSWORD, "weapon");
                this.lootMessage = "You pick up the ultimate sword";
            },
        }),

        MorningStar: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.MORNINGSTAR, "weapon");
                this.lootMessage = "You pick up a morning star";
            },
        }),

        LeatherArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.LEATHERARMOR, "armor");
                this.lootMessage = "You equip a leather armor";
            },
        }),

        MailArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.MAILARMOR, "armor");
                this.lootMessage = "You equip a mail armor";
            },
        }),

        PlateArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.PLATEARMOR, "armor");
                this.lootMessage = "You equip a plate armor";
            },
        }),

        RedArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDARMOR, "armor");
                this.lootMessage = "You equip a ruby armor";
            },
        }),

        GoldenArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOLDENARMOR, "armor");
                this.lootMessage = "You equip a golden armor";
            },
        }),

        NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.NFT_82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741, "armor");
                this.lootMessage = "You equip a NFT weapon.";
            },
        }),

        Flask: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.FLASK, "object");
                this.lootMessage = "You drink a health potion";
            },
        }),

        Wood: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.WOOD, "object");
                this.lootMessage = "Picked up some wood";
            },
        }),

        Ore: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.ORE, "object");
                this.lootMessage = "You picked up some iron ore";
            },
        }),

        Manacrystal: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.MANACRYSTAL, "object");
                this.lootMessage = "You found a mana crystal";
            },
        }),

        Potion: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.POTION, "object");
                this.lootMessage = "You drink a health potion";
            },
        }),

        Cake: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CAKE, "object");
                this.lootMessage = "You eat a cake";
            },
        }),

        Burger: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.BURGER, "object");
                this.lootMessage = "Loopring Layer 3 Taiko Boost!";
            },
        }),

        FirePotion: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.FIREPOTION, "object");
                this.lootMessage = "You feel the power of Loopring!";
            }
        }),

        Cobcorn: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCORN, "object");
                this.lootMessage = "It's corn time!";
            }
        }),

        Cobapple: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBAPPLE, "object");
                this.lootMessage = "An apple a day keeps the doctor away!";
            }
        }),

        Coblog: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBLOG, "object");
                this.lootMessage = "Let's get logging!";
            },
        }),

        Cobclover: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCLOVER, "object");
                this.lootMessage = "Feeling lucky?";
            },
        }),

        Cobegg: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBEGG, "object");
                this.lootMessage = "You pick up an egg!";
            },
        }),

        Cpotion_s: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CPOTION_S, "object");
                this.lootMessage = "You pick up a small healing potion!";
            },
        }),

        Cpotion_m: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CPOTION_M, "object");
                this.lootMessage = "You pick up a medium healing potion!";
            },
        }),

        Cpotion_l: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CPOTION_L, "object");
                this.lootMessage = "You pick up a large healing potion!";
            },
        }),

        Cimmupot: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CIMMUPOT, "object");
                this.lootMessage = "You pick up liquid loopium!";
            },
        }),

        Cagedrat: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CAGEDRAT, "object");
                this.lootMessage = "You pick up a caged rat!";
            },
        }),

        KEY_ARACHWEAVE:Item.extend({init:function(id){this._super(id,Types.Entities.KEY_ARACHWEAVE,"object");this.lootMessage="You picked up a strange webbed key";}}),
        BOARHIDE:Item.extend({init:function(id){this._super(id,Types.Entities.BOARHIDE,"object");this.lootMessage="Picked up Boar hide!";}}),
        THUDKEY:Item.extend({init:function(id){this._super(id,Types.Entities.THUDKEY,"object");this.lootMessage="Picked up Thudd's Key!";}}),
        BATWING:Item.extend({init:function(id){this._super(id,Types.Entities.BATWING,"object");this.lootMessage="Gathered a Bat Wing";}}),
        ORB:Item.extend({init:function(id){this._super(id,Types.Entities.ORB,"object");this.lootMessage="Picked up the strange orb!";}}),
        SLIMEBALL:Item.extend({init:function(id){this._super(id,Types.Entities.SLIMEBALL,"object");this.lootMessage="Picked up a slime ball";}}),
        REDOOZE:Item.extend({init:function(id){this._super(id,Types.Entities.REDOOZE,"object");this.lootMessage="Picked up Red Ooze";}}),
        WILDBLADE:Item.extend({init:function(id){this._super(id,Types.Entities.WILDBLADE,"object");this.lootMessage="Picked up a Wild blade";}}),
        WILDFLOWER:Item.extend({init:function(id){this._super(id,Types.Entities.WILDFLOWER,"object");this.lootMessage="Harvested Wildberry bush!!";}}),
        MAGICMUSHROOM:Item.extend({init:function(id){this._super(id,Types.Entities.MAGICMUSHROOM,"object");this.lootMessage="Picked a magic Mushroom!";}}),
        BLACKCAT:Item.extend({init:function(id){this._super(id,Types.Entities.BLACKCAT,"object");this.lootMessage="You caught a cat!";}}),
        HERMITHOME:Item.extend({init:function(id){this._super(id,Types.Entities.HERMITHOME,"object");this.lootMessage="Remnants of an old hermit remain here.";}}),
        GREEN_PEARL:Item.extend({init:function(id){this._super(id,Types.Entities.GREEN_PEARL,"object");this.lootMessage="Gathered a green pearl, shiny!";}}),
        FOREST_KEY:Item.extend({init:function(id){this._super(id,Types.Entities.FOREST_KEY,"object");this.lootMessage="Picked up a strange key.";}}),
        ICEKEY1:Item.extend({init:function(id){this._super(id,Types.Entities.ICEKEY1,"object");this.lootMessage="Picked up a key";}}),
        ICEKEY2:Item.extend({init:function(id){this._super(id,Types.Entities.ICEKEY2,"object");this.lootMessage="Picked up a key";}}),
        ICEKEY3:Item.extend({init:function(id){this._super(id,Types.Entities.ICEKEY3,"object");this.lootMessage="Picked up a key";}}),
        ICEKEY4:Item.extend({init:function(id){this._super(id,Types.Entities.ICEKEY4,"object");this.lootMessage="Picked up a key";}}),
        ICEBOUNDCRYSTAL:Item.extend({init:function(id){this._super(id,Types.Entities.ICEBOUNDCRYSTAL,"object");this.lootMessage="Retrieved Icebound Crystal";}}),
        SATCHEL:Item.extend({init:function(id){this._super(id,Types.Entities.SATCHEL,"object");this.lootMessage="Picked up satchel";}}),
        ICESSENCE:Item.extend({init:function(id){this._super(id,Types.Entities.ICESSENCE,"object");this.lootMessage="Extracted essence";}}),
        FORGEDSWORD:Item.extend({init:function(id){this._super(id,Types.Entities.FORGEDSWORD,"object");this.lootMessage="Recovered sword";}}),
        BANNER:Item.extend({init:function(id){this._super(id,Types.Entities.BANNER,"object");this.lootMessage="Picked up banner";}}),
        PNEUMA_SIGN:Item.extend({init:function(id){this._super(id,Types.Entities.PNEUMA_SIGN,"object");this.lootMessage="";}}),
        VILLAGESIGN10:Item.extend({init:function(id){this._super(id,Types.Entities.VILLAGESIGN10,"object");this.lootMessage="";}}),
        GOLD:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD,"resource");this.lootMessage="Picked up gold!";}}),
        GOLD1:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD1,"resource");this.lootMessage="Picked up gold!";}}),
        GOLD2:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD2,"resource");this.lootMessage="Picked up gold!";}}),
        GOLD3:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD3,"resource");this.lootMessage="Picked up gold!";}}),
        GOLD4:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD4,"resource");this.lootMessage="Picked up gold!";}}),
        GOLD5:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD5,"resource");this.lootMessage="Picked up gold!";}}),
        EVERPEAKMAP1:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP1,"object");this.lootMessage="Discovered Fishing isle!";}}),
        EVERPEAKMAP2:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP2,"object");this.lootMessage="Discovered Gilded Gryphon";}}),
        EVERPEAKMAP3:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP3,"object");this.lootMessage="Discovered Enchanted Isle";}}),
        EVERPEAKMAP4:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP4,"object");this.lootMessage="Discovered Stormhelm Arena";}}),
        EVERPEAKMAP5:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP5,"object");this.lootMessage="Discovered Riverbreeze District";}}),
        coffeebeans:Item.extend({init:function(id){this._super(id,Types.Entities.COFFEEBEANS,"object");this.lootMessage="You collected a coffee bean.";}}),
        crystal:Item.extend({init:function(id){this._super(id,Types.Entities.CRYSTAL,"object");this.lootMessage="You collected a crystal.";}}),
        trinket:Item.extend({init:function(id){this._super(id,Types.Entities.TRINKET,"object");this.lootMessage="You collected a trinket.";}}),
        wildflowers:Item.extend({init:function(id){this._super(id,Types.Entities.WILDFLOWERS,"object");this.lootMessage="You collected a wildflower.";}}),
        luminousstones:Item.extend({init:function(id){this._super(id,Types.Entities.LUMINOUSSTONES,"object");this.lootMessage="You collected a luminous stone.";}}),
        //Short Destroyers
        vhs:Item.extend({init:function(id){this._super(id,Types.Entities.VHS,"object");this.lootMessage="You collected a VHS.";}}),
        dvd:Item.extend({init:function(id){this._super(id,Types.Entities.DVD,"object");this.lootMessage="You collected a DVD.";}}),
        game:Item.extend({init:function(id){this._super(id,Types.Entities.GAME,"object");this.lootMessage="You collected a Game Cartridge.";}}),
        popcorn:Item.extend({init:function(id){this._super(id,Types.Entities.POPCORN,"object");this.lootMessage="You collected a Bag of Popcorn.";}}),
        energydrink:Item.extend({
            init:function(id) {
                this._super(id,Types.Entities.ENERGYDRINK,"object");
                this.lootMessage="You collected an Energy Drink.";
            },
        }),
        flyer:Item.extend({init:function(id){this._super(id,Types.Entities.FLYER,"object");this.lootMessage="You collected a Flyer.";}}),
        //m88n Items
        m88nmap:Item.extend({init:function(id){this._super(id,Types.Entities.M88NMAP,"object");this.lootMessage="You found a mysterious map!";}}),
        m88negg1:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG1,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg2:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG2,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg3:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG3,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg4:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG4,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg5:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG5,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg6:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG6,"object");this.lootMessage="You found an easter egg!";}}),
        m88negg7:Item.extend({init:function(id){this._super(id,Types.Entities.M88NEGG7,"object");this.lootMessage="You found an easter egg!";}}),
        m88nfabergeegg:Item.extend({init:function(id){this._super(id,Types.Entities.M88NFABERGEEGG,"object");this.lootMessage="You found a golden faberge easter egg!";}}),
        m88ngem:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGEM,"resource");this.lootMessage="You picked up a m88n gem!";}}),
        m88nmoneybags:Item.extend({init:function(id){this._super(id,Types.Entities.M88NMONEYBAGS,"object");this.lootMessage="You picked up a big bag of money!";}}),
        m88ngoldenpoo:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDENPOO,"object");this.lootMessage="You picked up a shiny golden poo!";}}),
        m88ngoldenchalis:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDENCHALIS,"object");this.lootMessage="You picked up a golden chalis!";}}),
        m88ndrsgme:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDRSGME,"object");this.lootMessage="You picked up a DRS'd share of GME!";}}),
        movieglasses:Item.extend({init:function(id){this._super(id,Types.Entities.MOVIEGLASSES,"object");this.lootMessage="You picked up some 3D movie glasses!";}}),
        battery:Item.extend({init:function(id){this._super(id,Types.Entities.BATTERY,"object");this.lootMessage="You picked up a battery!";}}),
        gameboy:Item.extend({init:function(id){this._super(id,Types.Entities.GAMEBOY,"object");this.lootMessage="You picked up a vintage Gameboy!";}}),
        hardwallet:Item.extend({init:function(id){this._super(id,Types.Entities.HARDWALLET,"object");this.lootMessage="You picked up a hard wallet for your crypto!";}}),
        m88ncompass:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCOMPASS,"object");this.lootMessage="You found a mysterious compass!";}}),
        m88nbinoculars:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBINOCULARS,"object");this.lootMessage="You found some mysterious binoculars!";}}),
        m88npeel:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPEEL,"object");this.lootMessage="You found a banana peel!";}}),
        m88ndungbeetle:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDUNGBEETLE,"object");this.lootMessage="You found a dung beetle!";}}),
        m88nfly:Item.extend({init:function(id){this._super(id,Types.Entities.M88NFLY,"object");this.lootMessage="You found a fly!";}}),
        m88njunebug:Item.extend({init:function(id){this._super(id,Types.Entities.M88NJUNEBUG,"object");this.lootMessage="You found a june bug!";}}),
        m88nbutterfly:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBUTTERFLY,"object");this.lootMessage="You found a butterfly!";}}),
        m88nstickbug:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSTICKBUG,"object");this.lootMessage="You found a stick bug!";}}),
        m88ndiamondnecklace:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDIAMONDNECKLACE,"object");this.lootMessage="You found a diamond necklace!";}}),
        m88ndiamondring:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDIAMONDRING,"object");this.lootMessage="You found a diamond ring!";}}),
        m88ngoldearrings:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDEARRINGS,"object");this.lootMessage="You found a pair of gold earrings!";}}),
        m88nclover:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCLOVER,"object");this.lootMessage="You found a clover!";}}),
        m88nluckyclover:Item.extend({init:function(id){this._super(id,Types.Entities.M88NLUCKYCLOVER,"object");this.lootMessage="You found a lucky clover!";}}),
        m88nmail:Item.extend({init:function(id){this._super(id,Types.Entities.M88NMAIL,"object");this.lootMessage="You found a piece of mail!";}}),
        m88npackage:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPACKAGE,"object");this.lootMessage="You found a package!";}}),
        m88nsteak:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSTEAK,"object");this.lootMessage="You found a steak!";}}),
        m88npotato:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPOTATO,"object");this.lootMessage="You found a potato!";}}),
        m88nsalad:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSALAD,"object");this.lootMessage="You found a salad!";}}),
        m88nbrewski:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBREWSKI,"object");this.lootMessage="You found a brewski!";}}),
        m88npie:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPIE,"object");this.lootMessage="You found a slice of pie!";}}),
        m88nseeds:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSEEDS,"object");this.lootMessage="You found a bag of seeds!";}}),
        m88nsack:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSACK,"object");this.lootMessage="You found a sack!";}}),
        m88nshovel:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSHOVEL,"object");this.lootMessage="You found a shovel!";}}),
        m88nwatercan:Item.extend({init:function(id){this._super(id,Types.Entities.M88NWATERCAN,"object");this.lootMessage="You found a water can!";}}),
        m88nticket:Item.extend({init:function(id){this._super(id,Types.Entities.M88NTICKET,"object");this.lootMessage="You found a mysterious ticket!";}}),
        m88ngoldenticket:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDENTICKET,"object");this.lootMessage="You found a mysterious golden ticket!";}}),
        m88ndrsbook:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDRSBOOK,"object");this.lootMessage="You found a DRS book! Are you the book king?";}}),
        m88ngoldtiara:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDTIARA,"object");this.lootMessage="You found a golden tiara!";}}),
        m88nteddy:Item.extend({init:function(id){this._super(id,Types.Entities.M88NTEDDY,"object");this.lootMessage="You found Teddy!";}}),
        m88ndirt:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDIRT,"object");this.lootMessage="You found some m88n dirt!";}}),
        m88nworm:Item.extend({init:function(id){this._super(id,Types.Entities.M88NWORM,"object");this.lootMessage="You found a worm!";}}),
        m88nsnail:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSNAIL,"object");this.lootMessage="You found a snail!";}}),
        m88ntentacle:Item.extend({init:function(id){this._super(id,Types.Entities.M88NTENTACLE,"object");this.lootMessage="You found a mysterious tentacle!";}}),
        m88nfastshoes:Item.extend({init:function(id){this._super(id,Types.Entities.M88NFASTSHOES,"object");this.lootMessage="You found some fast shoes!";}}),
        m88nslowshoes:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSLOWSHOES,"object");this.lootMessage="You found some slow shoes!";}}),
        m88nwizardshat:Item.extend({init:function(id){this._super(id,Types.Entities.M88NWIZARDSHAT,"object");this.lootMessage="You found a wizard's hat!";}}),
        m88nbrassknuckles:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBRASSKNUCKLES,"object");this.lootMessage="You found some brass knuckles!";}}),
        m88nkevlararmor:Item.extend({init:function(id){this._super(id,Types.Entities.M88NKEVLARARMOR,"object");this.lootMessage="You found some kevlar armor!";}}),
        m88ngrenade:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGRENADE,"object");this.lootMessage="You found a grenade!";}}),
        m88ndinnerbell:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDINNERBELL,"object");this.lootMessage="You found a dinner bell!";}}),
        m88npants:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPANTS,"object");this.lootMessage="You found a pair of pants!";}}),
        m88ntshirt:Item.extend({init:function(id){this._super(id,Types.Entities.M88NTSHIRT,"object");this.lootMessage="You found a t-shirt!";}}),
        m88ngoldmedal:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDMEDAL,"object");this.lootMessage="You found a gold medal!";}}),
        m88nsilvermedal:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSILVERMEDAL,"object");this.lootMessage="You found a silver medal!";}}),
        m88nbronzemedal:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBRONZEMEDAL,"object");this.lootMessage="You found a bronze medal!";}}),
        m88nfishingpole:Item.extend({init:function(id){this._super(id,Types.Entities.M88NFISHINGPOLE,"object");this.lootMessage="You found a fishing pole!";}}),
        m88nprizes:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPRIZES,"object");this.lootMessage="You found a mysterious prize!";}}),
        m88nlamp:Item.extend({init:function(id){this._super(id,Types.Entities.M88NLAMP,"object");this.lootMessage="You found a mysterious lamp!";}}),
        m88ngemticket:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGEMTICKET,"object");this.lootMessage="You found a mysterious ticket!";}}),
        m88nbag:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBAG,"object");this.lootMessage="You found a mysterious bag!";}}),
        m88nvipbag:Item.extend({init:function(id){this._super(id,Types.Entities.M88NVIPBAG,"object");this.lootMessage="You found a mysterious bag!";}}),
        m88ngoldbag:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGOLDBAG,"object");this.lootMessage="You found a mysterious bag!";}}),
        m88ngembag:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGEMBAG,"object");this.lootMessage="You found a mysterious bag!";}}),
        //MRMlabs Items
        firstaidkit:Item.extend({init:function(id){this._super(id,Types.Entities.FIRSTAIDKIT,"object");this.lootMessage="You found a first aid kit!";}}),
        bandaid:Item.extend({init:function(id){this._super(id,Types.Entities.BANDAID,"object");this.lootMessage="You found a bandaid!";}}),
        lighter:Item.extend({init:function(id){this._super(id,Types.Entities.LIGHTER,"object");this.lootMessage="You found a lighter!";}}),
        cigarette:Item.extend({init:function(id){this._super(id,Types.Entities.CIGARETTE,"object");this.lootMessage="You found a cigarette!";}}),
        cigarettepack:Item.extend({init:function(id){this._super(id,Types.Entities.CIGARETTEPACK,"object");this.lootMessage="You found a cigarette pack!";}}),
        soap:Item.extend({init:function(id){this._super(id,Types.Entities.SOAP,"object");this.lootMessage="You found a bar of soap!";}}),
        strangeyellowliquid:Item.extend({init:function(id){this._super(id,Types.Entities.STRANGEYELLOWLIQUID,"object");this.lootMessage="You found a bottle filled with a strange yellow liquid!";}}),
        //m88n TT Items
        m88nammocan:Item.extend({init:function(id){this._super(id,Types.Entities.M88NAMMOCAN,"object");this.lootMessage="You found an ammo can!";}}),
        m88nbanana:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBANANA,"object");this.lootMessage="You found a banana!";}}),
        m88nbasketball:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBASKETBALL,"object");this.lootMessage="You found a basketball!";}}),
        m88nblueprint:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBLUEPRINT,"object");this.lootMessage="You found some blueprints!";}}),
        m88nbnote:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBNOTE,"object");this.lootMessage="You found a beamed note!";}}),
        m88nbone:Item.extend({init:function(id){this._super(id,Types.Entities.M88NBONE,"object");this.lootMessage="You found a bone!";}}),
        m88ncarrot:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCARROT,"object");this.lootMessage="You found a carrot!";}}),
        m88ncheese:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCHEESE,"object");this.lootMessage="You found some cheese!";}}),
        m88nchocolate:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCHOCOLATE,"object");this.lootMessage="You found some chocolate!";}}),
        m88ncleanundies:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCLEANUNDIES,"object");this.lootMessage="You found some clean undies!";}}),
        m88ndogcollar:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDOGCOLLAR,"object");this.lootMessage="You found a dog collar!";}}),
        m88nducky:Item.extend({init:function(id){this._super(id,Types.Entities.M88NDUCKY,"object");this.lootMessage="You found a rubber ducky!";}}),
        m88nenote:Item.extend({init:function(id){this._super(id,Types.Entities.M88NENOTE,"object");this.lootMessage="You found an eighth note!";}}),
        m88nfancyhat:Item.extend({init:function(id){this._super(id,Types.Entities.M88NFANCYHAT,"object");this.lootMessage="You found a fancy hat!";}}),
        m88nglowstick:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGLOWSTICK,"object");this.lootMessage="You found a glow stick!";}}),
        m88nguitar:Item.extend({init:function(id){this._super(id,Types.Entities.M88NGUITAR,"object");this.lootMessage="You found a guitar!";}}),
        m88nhardhat:Item.extend({init:function(id){this._super(id,Types.Entities.M88NHARDHAT,"object");this.lootMessage="You found a hard hat!";}}),
        m88nhockeystick:Item.extend({init:function(id){this._super(id,Types.Entities.M88NHOCKEYSTICK,"object");this.lootMessage="You found a hockey stick!";}}),
        m88nipod:Item.extend({init:function(id){this._super(id,Types.Entities.M88NIPOD,"object");this.lootMessage="You found an iPod!";}}),
        m88njoystick:Item.extend({init:function(id){this._super(id,Types.Entities.M88NJOYSTICK,"object");this.lootMessage="You found a retro joystick!";}}),
        m88nlettermanjacket:Item.extend({init:function(id){this._super(id,Types.Entities.M88NLETTERMANJACKET,"object");this.lootMessage="You found a letterman jacket!";}}),
        m88nluggage:Item.extend({init:function(id){this._super(id,Types.Entities.M88NLUGGAGE,"object");this.lootMessage="You found some luggage!";}}),
        m88npolicebadge:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPOLICEBADGE,"object");this.lootMessage="You found a police badge!";}}),
        m88npolicehat:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPOLICEHAT,"object");this.lootMessage="You found a police hat!";}}),
        m88nqnote:Item.extend({init:function(id){this._super(id,Types.Entities.M88NQNOTE,"object");this.lootMessage="You found a quarter note!";}}),
        m88nrainbow:Item.extend({init:function(id){this._super(id,Types.Entities.M88NRAINBOW,"object");this.lootMessage="You found a rainbow!";}}),
        m88nrolex:Item.extend({init:function(id){this._super(id,Types.Entities.M88NROLEX,"object");this.lootMessage="You found a Rolex!";}}),
        m88nrollingpin:Item.extend({init:function(id){this._super(id,Types.Entities.M88NROLLINGPIN,"object");this.lootMessage="You found a rolling pin!";}}),
        m88nrose:Item.extend({init:function(id){this._super(id,Types.Entities.M88NROSE,"object");this.lootMessage="You found a red rose!";}}),
        m88nrubyring:Item.extend({init:function(id){this._super(id,Types.Entities.M88NRUBYRING,"object");this.lootMessage="You found a ruby ring!";}}),
        m88nshades:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSHADES,"object");this.lootMessage="You found a pair of shades!";}}),
        m88nsnote:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSNOTE,"object");this.lootMessage="You found a sixteenth note!";}}),
        m88nsnowflake:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSNOWFLAKE,"object");this.lootMessage="You found a snowflake!";}}),
        m88ntp:Item.extend({init:function(id){this._super(id,Types.Entities.M88NTP,"object");this.lootMessage="You found some tp!";}}),
        m88nworkgloves:Item.extend({init:function(id){this._super(id,Types.Entities.M88NWORKGLOVES,"object");this.lootMessage="You found a work glove!";}}),
        m88ncheesepizza:Item.extend({init:function(id){this._super(id,Types.Entities.M88NCHEESEPIZZA,"object");this.lootMessage="You found a slice of cheese pizza!";}}),
        m88npizza:Item.extend({init:function(id){this._super(id,Types.Entities.M88NPIZZA,"object");this.lootMessage="You found a slice of pizza!";}}),
        m88nsword:Item.extend({init:function(id){this._super(id,Types.Entities.M88NSWORD,"object");this.lootMessage="You found a sword!";}}),
        //Duckville
        EYEBALL:Item.extend({
            init:function(id){
                this._super(id,Types.Entities.EYEBALL,"object");
                this.lootMessage="Keep an eye out!!";
            }
        }),
        REDPOTION:Item.extend({
            init:function(id){
                this._super(id,Types.Entities.REDPOTION,"object");
                this.lootMessage="Gotcha self a splash of health";
            }
        }),
        GREYPOTION:Item.extend({init:function(id){
            this._super(id,Types.Entities.GREYPOTION,"object");
            this.lootMessage="CACHOW! STAY ALIVE LOOPER!";
        }
    }),
        HAMSTER1:Item.extend({init:function(id){this._super(id,Types.Entities.HAMSTER1,"object");this.lootMessage="Thank you for saving me!";}}),
        DUCKBIT:Item.extend({init:function(id){this._super(id,Types.Entities.DUCKBIT,"object");this.lootMessage="Quack Quack";}}),
        MILK2:Item.extend({init:function(id){this._super(id,Types.Entities.MILK2,"object");this.lootMessage="";}}),
        MILK1:Item.extend({init:function(id){this._super(id,Types.Entities.MILK1,"object");this.lootMessage="Yum milk!";}}),
        // @nextItemLine@
    };

    return Items;
});