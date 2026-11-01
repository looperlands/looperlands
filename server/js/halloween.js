const {SeasonalScene} = require('./seasonalscene');
const {event, availability} = require('../world-definitions/halloween-content');
const placements = event.actors;

// Kept for existing feature tests and integrations; production composes all
// seasonal events through the shared per-map scene.
class HalloweenScene extends SeasonalScene {
    constructor(world, options = {}) {
        const content = options.event || event;
        const schedule = options.availability || (options.event ? {...content.availability, enabled: content.enabled} : availability);
        super(world, [{...content, availability: schedule, enabled: schedule.enabled ?? content.enabled}], {...options,
            presentation: {prefix: 'halloween', script: 'halloween-parallax-worker.js', namespaceSounds: false}});
        this.availability = schedule;
    }
}
module.exports = {HalloweenScene, placements};
