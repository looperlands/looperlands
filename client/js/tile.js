/**
 * AnimatedTile Class
 * 
 * This class extends the Tile class to add advanced animation features for tiles in a tileset.
 * 
 * Required Parameter:
 * > `length`: Number of 16x16 tiles in the image source.
 *
 * Optional Parameters:
 * > `frames`: Number of animation frames (calculated if not provided, required mainly for colorShift).
 * > `speed`: Delay for each frame in milliseconds (array or single value, defaults to 100).
 * > `direction`: Direction of length and slide from source tile ('u', 'r', 'd', 'l', defaults to 'r').
 * > `slideAmount`: Amount to slide per animation frame (single value or array, defaults to 16, i.e., 1 tile).
 * > `colorShift`: Applies a tint shift to the image from one color to another over the duration of the animation.
 *     .:. Tiled Input: Start Color Hex Code, End Color Hex Code (i.e. FF00FF, FEE8FF)
 * > `loopStyle`: Different looping behaviors.
 *     .:. `loop`: The animation plays from start to end and then loops back to the beginning.
 *     .:. `ping-pong`: The animation plays from start to end and then reverses back to the start.
 *     .:. `bounce`: Similar to ping-pong, but the end frames are repeated before reversing.
 *     .:. `once`: The animation plays from start to end and then stops.
 *     .:. `reverse-loop`: The animation plays from end to start and then loops back to the end.
 *     .:. `triggered`: The animation waits for 'startTrigger' to animate forward to the end, then waits for 'endTrigger' to animate backward to the start.
 * > `startFrame`: Frame to start the animation on (default is the first frame).
 * > `bouncePause`: Additional delay (in milliseconds) at each end of the bounce loop (default is 0).
 */

define(function () {

    var Tile = Class.extend({});

    var AnimatedTile = Tile.extend({
        init: function (id, index, tileProps) {
            const { length, frames, speed, direction, slideAmount, colorShift, loopStyle, startFrame, bouncePause } = tileProps;
            
            this.id = id;
            this.index = index;
            this.length = length; // Number of 16x16 tiles that make up the image source
            this.lengthPixels = length * 16; // Total pixels in length of tiles
            this.speed = Array.isArray(speed) ? speed : [speed || 100]; // Speed for each frame (aka delay) default is 100ms (csv allowed)
            this.FPS = 50; // Max FPS is set in renderer.js as 50
            this.direction = direction || 'r'; // Default direction is right
            this.slideAmount = Array.isArray(slideAmount) ? slideAmount : [slideAmount || (length > 1 ? 16 : 0)]; // Default is one full tile (16px) per frame if length > 1 (csv allowed)
            this.currentSlideX = 0;
            this.currentSlideY = 0;
            this.loopStyle = loopStyle || 'loop'; // Default loop style is 'loop'
            this.currentFrame = startFrame || 0;
            this.forward = true; // Used for some loopStyles
            this.waitingForTrigger = this.loopStyle === 'triggered';
            this.bounceInProgress = false;
            this.bouncePause = bouncePause || 0;
            this.colorShift = colorShift || null;
            this.frames = frames ? frames : this.calculateFrames();
            this.lastTime = 0;
        },

        calculateFrames: function () {
            if (this.length === 1 && (this.slideAmount[0] !== 0 || this.colorShift)) {
                const slideFrames = this.slideAmount.length === 1 ? Math.ceil(this.lengthPixels / Math.abs(this.slideAmount[0])) : this.slideAmount.length;
                return Math.max(this.length, this.speed.length, slideFrames);
            }
            const slideFrames = (this.length > 1 && this.slideAmount.length === 1 && this.slideAmount[0] !== 0) ? Math.ceil(this.lengthPixels / Math.abs(this.slideAmount[0])) : this.slideAmount.length;
            return Math.max(this.length, this.speed.length, this.slideAmount[0] === 0 ? 1 : slideFrames);
        },

        tick: function () {
            // Check if the animation should proceed (length > 1 or colorShift is defined and not waiting for trigger)
            if ((this.length > 1 || this.colorShift) && !this.waitingForTrigger) {
                let slideOffset;

                // Calculate slide offset if length of tile source is greater than 1
                if (this.length > 1) {
                    slideOffset = this.getNextSlideOffset();
                } else {
                    slideOffset = { x: 0, y: 0 };
                }

                // Reset frame and slide if max slide length is reached
                if (this.length > 1 && (Math.abs(this.currentSlideX + slideOffset.x) >= this.lengthPixels || Math.abs(this.currentSlideY + slideOffset.y) >= this.lengthPixels)) {
                    this.currentFrame = 0;
                    this.currentSlideX = 0;
                    this.currentSlideY = 0;
                } else {
                    // Handle loop style and update slide positions
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
                    this.forward = this.currentFrame <= 0;
                } else if (this.loopStyle === 'bounce') {
                    if (!this.bounceInProgress) {
                        this.bounceInProgress = true;
                        this.currentFrame += this.forward ? -1 : 1;
                    } else {
                        this.forward = this.currentFrame <= 0;
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
            const minDelay = 1000 / this.FPS;
            const frameDelay = this.speed[this.currentFrame] || this.speed[this.speed.length - 1];
        
            if (this.loopStyle === 'bounce' && (this.currentFrame === 0 || this.currentFrame === this.frames - 1)) {
                return Math.max(frameDelay, minDelay) + this.bouncePause;
            }
            return Math.max(frameDelay, minDelay);
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

        getColorShiftForFrame: function () {
            if (!this.colorShift) return null;

            const progress = this.currentFrame / (this.frames - 1);

            return {
                colorDifference: this.colorShift,
                progress: progress
            };
        }
    });

    return AnimatedTile;
});