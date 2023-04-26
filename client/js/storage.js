define(function() {

    var Storage = Class.extend({
        init: function(walletId, nftId){
            let _this = this;
            this.walletId = walletId;
            this.nftId = nftId;
        },
    
        loadData: async function() {
            console.log("In loadData(");
            _this = this;
            let response = await axios.get(`/wallets/${this.walletId}/nfts/${this.nftId}`)
            if (response.data.hasAlreadyPlayed === undefined) {
                _this.resetData();
                _this.data.player.armor = this.nftId.replace("0x", "NFT_");
                return false;
            } else {            
                _this.data = response.data;
                // Remove the 0x from the nftId
                _this.data.player.armor = this.nftId.replace("0x", "NFT_");
                return true;
            }

        },
        resetData: function() {
            this.data = {
                hasAlreadyPlayed: false,
                player: {
                    name: "",
                    weapon: "",
                    armor: "",
                    image: ""
                },
                achievements: {
                    unlocked: [],
                    ratCount: 0,
                    skeletonCount: 0,
                    totalKills: 0,
                    totalDmg: 0,
                    totalRevives: 0
                }
            };
        },
    
        hasLocalStorage: function() {
            return Modernizr.localstorage;
        },
    
        save: function() {
            axios.post(`/wallets/${this.walletId}/nfts/${this.nftId}`, this.data).then(function (response) {
                console.log("Response from Loopworms: ", response.status, response.text, response.data);
            }).catch(function (error) {
                console.log(error);
            });
        },
    
        clear: function() {
            if(this.hasLocalStorage()) {
                localStorage.data = "";
                this.resetData();
            }
        },
    
        // Player
    
        hasAlreadyPlayed: function() {
            return this.data.hasAlreadyPlayed;
        },
    
        initPlayer: function(name) {
            this.data.hasAlreadyPlayed = true;
            this.setPlayerName(name);
        },
        
        setPlayerName: function(name) {
            this.data.player.name = name.trim();
            this.save();
        },
    
        setPlayerImage: function(img) {
            this.data.player.image = img;
            this.save();
        },

        setPlayerArmor: function(armor) {
            this.data.player.armor = armor;
            this.save();
        },
    
        setPlayerWeapon: function(weapon) {
            this.data.player.weapon = weapon;
            this.save();
        },

        savePlayer: function(img, armor, weapon) {
            this.setPlayerImage(img);
            this.setPlayerArmor(armor);
            this.setPlayerWeapon(weapon);
        },
    
        // Achievements
    
        hasUnlockedAchievement: function(id) {
            return _.include(this.data.achievements.unlocked, id);
        },
    
        unlockAchievement: function(id) {
            if(!this.hasUnlockedAchievement(id)) {
                this.data.achievements.unlocked.push(id);
                this.save();
                return true;
            }
            return false;
        },
    
        getAchievementCount: function() {
            return _.size(this.data.achievements.unlocked);
        },
    
        // Angry rats
        getRatCount: function() {
            return this.data.achievements.ratCount;
        },
    
        incrementRatCount: function() {
            if(this.data.achievements.ratCount < 10) {
                this.data.achievements.ratCount++;
                this.save();
            }
        },
        
        // Skull Collector
        getSkeletonCount: function() {
            return this.data.achievements.skeletonCount;
        },

        incrementSkeletonCount: function() {
            if(this.data.achievements.skeletonCount < 10) {
                this.data.achievements.skeletonCount++;
                this.save();
            }
        },
    
        // Meatshield
        getTotalDamageTaken: function() {
            return this.data.achievements.totalDmg;
        },
    
        addDamage: function(damage) {
            if(this.data.achievements.totalDmg < 5000) {
                this.data.achievements.totalDmg += damage;
                this.save();
            }
        },
        
        // Hunter
        getTotalKills: function() {
            return this.data.achievements.totalKills;
        },

        incrementTotalKills: function() {
            if(this.data.achievements.totalKills < 50) {
                this.data.achievements.totalKills++;
                this.save();
            }
        },
    
        // Still Alive
        getTotalRevives: function() {
            return this.data.achievements.totalRevives;
        },
    
        incrementRevives: function() {
            if(this.data.achievements.totalRevives < 5) {
                this.data.achievements.totalRevives++;
                this.save();
            }
        },
    });
    
    return Storage;
});
