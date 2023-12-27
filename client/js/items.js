
define(['item'], function(Item) {
    
    var Items = {
        
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
            },
    
            onLoot: function(player) {
                player.startInvincibility();
            },
        }),

        Cobcorn: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBCORN, "object");
                this.lootMessage = "It's corn time!";
            },

            onLoot: function(player) {
                player.startInvincibility();
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
        GOLD1:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD1,"object");this.lootMessage="";}}),
        GOLD2:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD2,"object");this.lootMessage="";}}),
        GOLD3:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD3,"object");this.lootMessage="";}}),
        GOLD:Item.extend({init:function(id){this._super(id,Types.Entities.GOLD,"object");this.lootMessage="Picked up gold!";}}),
        EVERPEAKMAP1:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP1,"object");this.lootMessage="Discovered Fishing isle!";}}),
        EVERPEAKMAP2:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP2,"object");this.lootMessage="Discovered Gilded Gryphon";}}),
        EVERPEAKMAP3:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP3,"object");this.lootMessage="Discovered Enchanted Isle";}}),
        EVERPEAKMAP4:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP4,"object");this.lootMessage="Discovered Stormhelm Arena";}}),
        EVERPEAKMAP5:Item.extend({init:function(id){this._super(id,Types.Entities.EVERPEAKMAP5,"object");this.lootMessage="Discovered Riverbreeze District";}}),
        // @nextItemLine@
    };

    return Items;
});
