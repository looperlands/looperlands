
define(['character'], function(Character) {

    var NpcTalk = {
        "guard": [
            "Hello there",
            "We don't need to see your identification",
            "You are not the player we're looking for",
            "Move along, move along..."
        ],
    
        "king": [
            "Hi, I'm the LoopWorm King",
            "Welcome to my kingdom",
            'Check out <a target="_blank" href="https://twitter.com/LoopWorms">my twitter</a> and give me a follow!',
            "Stay wormy",
            "or else..."
        ],
    
        "villagegirl": [
            "Hi there, adventurer!",
            "How do you like this game?",
            "I'm Bstrat515",
            "I'm a twitter influencer for the Layer 2 protocol Loopring on the Ethereum blockchain.",
            'Check out <a target="_blank" href="http://twitter.com/share?text=%40bstrat515">my twitter</a> and give me a follow!',
            'My next message is a Redpacket QR code',
            '<img src="https://loopworms.io/DEV/LooperLands/QR.jpg" width="75%"/>'
        ],
    
        "villager": [
            "Howdy stranger, the name's Ordinary Adam.",
            'Check out <a target="_blank" href="https://twitter.com/Ordinary_Adam">my twitter</a> and give me a follow!'
        ],
    
        "agent": [
            "Don't believe everything you see.",
            'Check out <a target="_blank" href="https://twitter.com/heydomoshi">my twitter</a> and give me a follow!'
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
            "Never gonna tell a lie and hurt you"
        ],
        
        "scientist": [
            "Greetings.",
            "I am the inventor of these two potions.",
            "The red one will replenish your health points...",
            "The blue one will make you invincible with the power of Loopring...",
            "But it only lasts for a short while.",
            "So make good use of it!",
            "Now if you'll excuse me, I need to get back to my experiments..."
        ],
    
        "nyan": [
            "nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan",
            "nyan nyan nyan nyan nyan nyan nyan nyan"
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
            'Check out <a target="_blank" href="https://twitter.com/onevincesuarez">my twitter</a> and give me a follow!'
        ],
        
        "sorcerer": [
            "Ah... I had foreseen you would come to see me.",
            "Well? How do you like my new staff?",
            "Pretty cool, eh?",
            "Where did I get it, you ask?",
            "I understand. It's easy to get envious.",
            "I actually crafted it myself, using my mad wizard skills.",
            "But let me tell you one thing...",
            "There are lots of items in this game.",
            "Some more powerful than others.",
            "In order to find them, exploration is key.",
            "Good luck."
        ],
        
        "octocat": [
            "Welcome to LooperLands!",
            "Want to see the source code?",
        ],
        
        "coder": [
            "It's YaBoyNancy",
            'Check out <a target="_blank" href="https://twitter.com/yaboynancy">my twitter</a> and give me a follow!'
        ],
    
        "beachnpc": [
            "Don't mind me, I'm just here on vacation.",
            "I have to say...",
            'Check out <a target="_blank" href="https://twitter.com/theobewhoturnz">my twitter</a> and give me a follow!'
        ],
        
        "desertnpc": [
            "One does not simply walk into these mountains...",
            "An ancient undead lord is said to dwell here.",
            "Nobody knows exactly what he looks like...",
            "...for none has lived to tell the tale.",
            "It's not too late to turn around and go home, kid."
        ],
    
        "othernpc": [
            "lorem ipsum",
            "lorem ipsum"
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