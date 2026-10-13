define(function () {
    class HealthBarFeedback {
        constructor(fill, trail) {
            this.fill = fill;
            this.trail = trail;
        }

        update(width, maxHp, reducedMotion) {
            if (!this.fill || !this.trail) return;
            width = Math.max(0, width);
            this.fill.style.width = width + 'px';
            if (width === this.width && maxHp === this.maxHp && !reducedMotion) return;
            clearTimeout(this.timer);
            const damage = this.width !== undefined && maxHp === this.maxHp && width < this.width;
            if (damage && !reducedMotion) {
                this.trail.classList.remove('settling');
                this.trail.style.width = Math.max(parseFloat(this.trail.style.width) || 0, this.width) + 'px';
                this.timer = setTimeout(() => {
                    this.trail.classList.add('settling');
                    this.trail.style.width = width + 'px';
                }, 180);
            } else {
                this.trail.classList.remove('settling');
                this.trail.style.width = width + 'px';
            }
            this.width = width;
            this.maxHp = maxHp;
        }

        dispose() {
            clearTimeout(this.timer);
        }
    }
    return HealthBarFeedback;
});
