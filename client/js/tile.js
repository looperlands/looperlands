
define(function () {

    var Tile = Class.extend({});

    var AnimatedTile = Tile.extend({
        init: function (id, length, speed, index, direction, slide_amount, ping_pong) {
            this.startId = id;
            this.id = id;
            this.length = length; // Number of 16x16 tiles that make up the image source
            this.speed = Array.isArray(speed) ? speed : [speed || 100]; // Speed for each frame
            this.index = index;
            this.lastTime = 0;
            this.currentFrame = 0;
            this.direction = direction || 'r'; // Default direction is right
            this.currentSlideX = 0;
            this.currentSlideY = 0;
            this.maxSlide = length * 16;
            this.slide_amount = Array.isArray(slide_amount) ? slide_amount : [slide_amount || 16]; // Default is one full tile per frame
            this.ping_pong = ping_pong ? true : false;
        },

        tick: function () {
            if(this.length > 1){
                const slideOffset = this.getNextSlideOffset();
                if (Math.abs(this.currentSlideX + slideOffset.x) >= this.maxSlide || Math.abs(this.currentSlideY + slideOffset.y) >= this.maxSlide) {
                    this.currentFrame = 0;
                    this.currentSlideX = 0;
                    this.currentSlideY = 0;
                } else {
                    this.currentFrame++;
                    this.currentSlideX += slideOffset.x;
                    this.currentSlideY += slideOffset.y;
                }
            }
        },

        animate: function (time) {
            if ((time - this.lastTime) > this.getDelayForFrame()) {
                this.tick();
                this.lastTime = time;
                return true;
            } else {
                return false;
            }
        },

        getDelayForFrame: function () {
            return this.speed[this.currentFrame] || this.speed[this.speed.length - 1];
        },

        getCurrentOffset: function (){
            return { x: this.currentSlideX, y: this.currentSlideY };
        },

        getNextSlideOffset: function () {
            const frameOffset = this.slide_amount[this.currentFrame % this.slide_amount.length];
            switch (this.direction) {
                case 'u': return { x: 0, y: -frameOffset };
                case 'r': return { x: frameOffset, y: 0 };
                case 'd': return { x: 0, y: frameOffset };
                case 'l': return { x: -frameOffset, y: 0 };
                default: return { x: 0, y: 0 };
            }

        }
    });

    return AnimatedTile;
});