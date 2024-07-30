/**
 * AnimatedTile Class
 * 
 * This class extends the Tile class to add advanced animation features for tiles in a tileset.
 * 
 * Required Parameter:
 * - `length`: Number of 16x16 tiles in the image source.
 *
 * Optional Parameters:
 * - `frames`: Number of animation frames (calculated if not provided).
 * - `speed`: Delay for each frame in milliseconds (array or single value, defaults to 100).
 * - `direction`: Direction of length and slide from source tile ('u', 'r', 'd', 'l', defaults to 'r').
 * - `slideAmount`: Amount to slide per animation frame (single value or array, defaults to 16, i.e., 1 tile).
 * - `hueChange`: Changes tile color over animation.
 *     - Single value: Total hue rotation over all frames in degrees.
 *     - Two comma-separated colors: Change from first color to the second color over the animation.
 * - `loopStyle`: Different looping behaviors.
 *     - `loop`: The animation plays from start to end and then loops back to the beginning.
 *     - `ping-pong`: The animation plays from start to end and then reverses back to the start.
 *     - `bounce`: Similar to ping-pong, but the end frames may be repeated before reversing.
 *     - `once`: The animation plays from start to end and then stops.
 *     - `reverse-loop`: The animation plays from end to start and then loops back to the end.
 *     - `triggered`: The animation waits for 'startTrigger' to animate forward to the end, then waits for 'endTrigger' to animate backward to the start.
 * - `delayedStart`: Delay before the animation starts in milliseconds (optional).
 */

define(function () {

    var Tile = Class.extend({});

    var AnimatedTile = Tile.extend({
        init: function (id, length, frames, delayedStart, speed, index, direction, slideAmount, hueChange, loopStyle, delayedStart) {
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
            this.hueChange = hueChange ? this.parseHueChange(hueChange) : null;
            this.loopStyle = loopStyle || 'loop'; // Default loop style is 'loop'
            this.loopStyle = loopStyle ? loopStyle : null;
            this.frames = frames ? frames : this.calculateFrames();
            this.currentFrame = 0;
            this.forward = true; // Used for ping-pong, bounce, and triggered styles
            this.waitingForTrigger = this.loopStyle === 'triggered';
            this.delayedStart = delayedStart || 0; // Delay in milliseconds
        },

        calculateFrames: function () {
            const slideFrames = this.slideAmount.length === 1 ? Math.ceil(this.maxSlide / Math.abs(this.slideAmount[0])) : this.slideAmount.length;
            return Math.max(this.length, this.speed.length, slideFrames);
        },

        tick: function () {
            if (this.length > 1 && !this.waitingForTrigger) {
                this.handleLoopStyle();
                const slideOffset = this.getNextSlideOffset();
                this.currentSlideX += slideOffset.x;
                this.currentSlideY += slideOffset.y;
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
                this.forward = !this.forward;
                if (this.loopStyle === 'bounce') {
                    this.currentFrame += this.forward ? 1 : -1;
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
            if (this.delayedStart > 0) {
                this.delayedStart -= (time - this.lastTime);
                this.lastTime = time;
                return false;
            }

            if ((time - this.lastTime) > this.getDelayForFrame() && !this.waitingForTrigger) {
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

        getCurrentHueAngle: function () {
            return this.hueChange ? this.getHueForFrame() : null;
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

        parseHueChange: function (hueChange) {
            const values = hueChange.split(',');
            if (values.length === 1) {
                const hueValue = parseFloat(values[0]);
                if (!isNaN(hueValue)) {
                    return hueValue;
                }
            } else if (values.length === 2) {
                const startColor = this.parseColor(values[0]);
                const endColor = this.parseColor(values[1]);
                if (startColor && endColor) {
                    return [startColor, endColor];
                }
            }
            return null;
        },

        parseColor: function (color) {
            if (color.length === 6 && !isNaN(parseInt(color, 16))) {
                return {
                    r: parseInt(color.slice(0, 2), 16),
                    g: parseInt(color.slice(2, 4), 16),
                    b: parseInt(color.slice(4, 6), 16)
                };
            }
            return null;
        },

        getHueForFrame: function () {
            if (!this.hueChange) return null;

            if (typeof this.hueChange === 'number') {
                const hueAnglePerFrame = this.hueChange / this.frames;
                return hueAnglePerFrame * this.currentFrame;
            }

            const startColor = this.hueChange[0];
            const endColor = this.hueChange[1];
            const progress = this.currentFrame / this.frames;

            const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress);
            const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress);
            const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress);

            return `rgb(${r},${g},${b})`;
        }

    });

    return AnimatedTile;
});