
define(function () {

    var Animation = Class.extend({
        init: function (name, length, row, width, height) {
            this.name = name;
            this.length = length;
            this.row = row;
            this.width = width;
            this.height = height;
            this.reset();
        },

        tick: function () {
            var i = this.currentFrame.index;

            i = (i < this.length - 1) ? i + 1 : 0;

            if (this.count > 0) {
                if (i === 0) {
                    this.count -= 1;
                    if (this.count === 0) {
                        this.currentFrame.index = 0;
                        this.endcount_callback();
                        return;
                    }
                }
            }

            this.currentFrame.x = this.width * i;
            this.currentFrame.y = this.height * this.row;
            this.currentFrame.index = i;
        },

        setSpeed: function (speed) {
            if (Array.isArray(speed)) {
                if (speed.length < this.length) {
					// SPEED ARRAY PROVIDED: ARRAY DOESN'T MATCH FRAME LENGTH >> USE LAST SPEED VALUE TO FILL REMAINING SLOTS
                    this.speed = speed.concat(Array(this.length - speed.length).fill(speed[speed.length - 1]));
                } else {
					// SPEED ARRAY PROVIDED: SET SPEED FOR EACH FRAME (exclude extra speeds if provided)
                    this.speed = speed.slice(0, this.length);
                }
            } else {
				// SINGLE SPEED PROVIDED: SET ALL FRAMES TO THE SAME SPEED
                this.speed = Array(this.length).fill(speed);
            }
        },

        setCount: function (count, onEndCount) {
            this.count = count;
            this.endcount_callback = onEndCount;
        },

        isTimeToAnimate: function (time) {
            return (time - this.lastTime) > this.speed[this.currentFrame.index];
        },

        update: function (time) {
            if (this.lastTime === 0 && this.name.substr(0, 3) === "atk") {
                this.lastTime = time;
            }

            if (this.isTimeToAnimate(time)) {
                this.lastTime = time;
                this.tick();
                return true;
            } else {
                return false;
            }
        },

        reset: function () {
            this.lastTime = 0;
            this.currentFrame = { index: 0, x: 0, y: this.row * this.height };
        }
    });

    return Animation;
});