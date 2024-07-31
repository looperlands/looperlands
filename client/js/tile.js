/**
 * AnimatedTile Class
 * 
 * This class extends the Tile class to add advanced animation features for tiles in a tileset.
 * 
 * Required Parameter:
 * - `length`: Number of 16x16 tiles in the image source.
 *
 * Optional Parameters:
 * - `frames`: Number of animation frames (calculated if not provided, required mainly for hueChange).
 * - `speed`: Delay for each frame in milliseconds (array or single value, defaults to 100).
 * - `direction`: Direction of length and slide from source tile ('u', 'r', 'd', 'l', defaults to 'r').
 * - `slideAmount`: Amount to slide per animation frame (single value or array, defaults to 16, i.e., 1 tile).
 * - `hueChange`: Changes tile color over animation.
 *     - Tiled input => Single value: Total hue rotation over all frames in degrees.
 *     - Tiled input => Two comma-separated colors: Change from first color to the second color over the animation.
 * - `loopStyle`: Different looping behaviors.
 *     - `loop`: The animation plays from start to end and then loops back to the beginning.
 *     - `ping-pong`: The animation plays from start to end and then reverses back to the start.
 *     - `bounce`: Similar to ping-pong, but the end frames are repeated before reversing.
 *     - `once`: The animation plays from start to end and then stops.
 *     - `reverse-loop`: The animation plays from end to start and then loops back to the end.
 *     - `triggered`: The animation waits for 'startTrigger' to animate forward to the end, then waits for 'endTrigger' to animate backward to the start.
 * - `startFrame`: Frame to start the animation on (default is the first frame).
 */

define(function () {

    var Tile = Class.extend({});

    var AnimatedTile = Tile.extend({
        init: function (id, length, frames, speed, index, direction, slideAmount, hueChange, loopStyle, startFrame) {
            this.id = id;
            this.length = length; // Number of 16x16 tiles that make up the image source
            this.speed = Array.isArray(speed) ? speed : [speed || 100]; // Speed for each frame (aka delay)
            this.index = index;
            this.lastTime = 0;
            this.direction = direction || 'r'; // Default direction is right
            this.maxSlide = length * 16;
            this.slideAmount = Array.isArray(slideAmount) ? slideAmount : [slideAmount || 16]; // Default is one full tile per frame
            this.currentSlideX = 0;
            this.currentSlideY = 0;
            this.hueChange = hueChange || null; // Hue change in degrees
            this.loopStyle = loopStyle || 'loop'; // Default loop style is 'loop'
            this.frames = frames ? frames : this.calculateFrames();
            this.currentFrame = startFrame || 0;
            this.forward = true; // Used for ping-pong, bounce, and triggered styles
            this.waitingForTrigger = this.loopStyle === 'triggered';
            this.bounceInProgress = false;
        },

        calculateFrames: function () {
            if (this.length === 1 && (this.slideAmount[0] !== 0 || this.hueChange)) {
                const slideFrames = this.slideAmount.length === 1 ? Math.ceil(this.maxSlide / Math.abs(this.slideAmount[0])) : this.slideAmount.length;
                return Math.max(this.speed.length, slideFrames);
            }
            const slideFrames = (this.slideAmount.length === 1 && this.slideAmount[0] !== 0) ? Math.ceil(this.maxSlide / Math.abs(this.slideAmount[0])) : this.slideAmount.length;
            return Math.max(this.length, this.speed.length, this.slideAmount[0] === 0 ? 1 : slideFrames);
        },
        
        tick: function () {
            if ((this.length > 1 || this.slideAmount[0] !== 0 || this.hueChange) && !this.waitingForTrigger) {
                const slideOffset = this.getNextSlideOffset();
                if (Math.abs(this.currentSlideX + slideOffset.x) >= this.maxSlide || Math.abs(this.currentSlideY + slideOffset.y) >= this.maxSlide) {
                    this.currentFrame = 0;
                    this.currentSlideX = 0;
                    this.currentSlideY = 0;
                } else {
                    this.handleLoopStyle();
                    this.currentSlideX += slideOffset.x;
                    this.currentSlideY += slideOffset.y;
                }
            }
        },
        
        handleLoopStyle: function () {
            switch (this.loopStyle) {
                case 'ping-pong':
                case 'bounce':
                    this.handlePingPongAndBounce();
                    break;
                case 'once':
                    if (this.currentFrame < this.frames - 1) this.currentFrame++;
                    break;
                case 'reverse-loop':
                    this.currentFrame = this.currentFrame <= 0 ? this.frames - 1 : this.currentFrame - 1;
                    break;
                case 'triggered':
                    this.handleTriggered();
                    break;
                default: // 'loop'
                    this.currentFrame = this.currentFrame >= this.frames - 1 ? 0 : this.currentFrame + 1;
                    break;
            }
        },

        handlePingPongAndBounce: function () {
            this.currentFrame += this.forward ? 1 : -1;
        
            if (this.currentFrame >= this.frames - 1 || this.currentFrame <= 0) {
                if (this.loopStyle === 'ping-pong') {
                    this.forward = !this.forward;
                } else if (this.loopStyle === 'bounce') {
                    if (!this.bounceInProgress) {
                        this.bounceInProgress = true;
                        this.currentFrame += this.forward ? -1 : 1;
                    } else {
                        this.forward = !this.forward;
                        this.bounceInProgress = false;
                    }
                }
            }
        },       

        handleTriggered: function () {
            if (this.waitingForTrigger) return;
            this.currentFrame += this.forward ? 1 : -1;

            if ((this.forward && this.currentFrame >= this.frames - 1) || (!this.forward && this.currentFrame <= 0)) {
                this.waitingForTrigger = true;
            }
        },

        animate: function (time) {
            if (this.frames > 1 && (time - this.lastTime) > this.getDelayForFrame() && !this.waitingForTrigger) {
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

        getCurrentOffset: function () {
            return { x: this.currentSlideX, y: this.currentSlideY };
        },

        getNextSlideOffset: function () {
            const frameOffset = this.slideAmount[this.currentFrame % this.slideAmount.length];
            switch (this.direction) {
                case 'u': return { x: 0, y: -frameOffset };
                case 'r': return { x: frameOffset, y: 0 };
                case 'd': return { x: 0, y: frameOffset };
                case 'l': return { x: -frameOffset, y: 0 };
                default: return { x: 0, y: 0 };
            }
        },

        getHueForFrame: function () {
            if (!this.hueChange) return null;

            if (typeof this.hueChange === 'number') {
                const hueAnglePerFrame = this.hueChange / this.frames;
                return hueAnglePerFrame * this.currentFrame;
            }
            
            return null;
        }
    });

    return AnimatedTile;
});