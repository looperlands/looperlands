const story = require('./halloween-story');
const {HalloweenScene} = require('../js/halloween');

function register(target) {
    target.register('main', {id: 'halloween', quests: story.quests, dialogues: story.dialogues,
        installHttp: require('../js/halloweenhttp').installHttp,
        createScene: world => new HalloweenScene(world)});
}

module.exports = {register};
