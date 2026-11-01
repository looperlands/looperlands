const story = require('./halloween-story');

function register(target, event = require('./halloween-content').event) {
    const availability = {...event.availability, enabled: event.enabled};
    const quests = structuredClone(story.quests), dialogues = structuredClone(story.dialogues);
    // An explicit source root may differ from the module's startup snapshot.
    // Reapply baseline copy and its overrides without mutating cached story data.
    const text = require('./halloween-text');
    text.apply(quests, dialogues, Object.fromEntries(story.defaultTexts.map(entry => [entry.id, entry.value])));
    text.apply(quests, dialogues, event.textOverrides);
    quests.forEach(quest => {quest.availability = availability;});
    dialogues.forEach(dialogue => {
        dialogue.availability = availability;
        dialogue.name = event.actors.find(actor => actor.key === dialogue.key).label;
    });
    const definition = {...require('./halloween-shop'), availability};
    target.register('main', {id: 'halloween', quests, dialogues,
        installHttp: (app, services) => require('../js/halloweenhttp').installHttp(app, services, definition)});
}

module.exports = {register};
