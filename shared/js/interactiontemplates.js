(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.InteractionTemplates = factory();
})(typeof window === 'undefined' ? this : window, function () {
    'use strict';
    const templates = [
        {id: 'resource', name: 'Resource deposit', description: 'Gather an item. The deposit returns after a cooldown.', action: 'Gather', repeat: 'cooldown', scope: 'shared', complete: 'Depleted'},
        {id: 'chest', name: 'Chest', description: 'Give each player a reward once.', action: 'Open', repeat: 'once', scope: 'player', complete: 'Opened'},
        {id: 'repair', name: 'Repair', description: 'Use materials to repair something for everyone.', action: 'Repair', repeat: 'once', scope: 'shared', complete: 'Repaired'},
        {id: 'switch', name: 'Switch', description: 'Turn something on and off. Connect each outcome to an event.', action: 'Turn on', repeat: 'immediate', scope: 'shared', complete: 'Off'},
        {id: 'blank', name: 'Custom interaction', description: 'Start with one action and add steps when needed.', action: 'Use', repeat: 'once', scope: 'shared', complete: 'Completed'}
    ];
    function stage(id, name) {
        return {id, name, duration: 1, waitSeconds: 0, level: 1, tool: '', quest: '', costs: [], rewards: [], xp: 0,
            tile: 0, successChance: 1, next: '', failureNext: '', message: '', failureMessage: '', trigger: '', triggerMode: 'activate'};
    }
    function create(id) {
        const template = templates.find(t => t.id === id) || templates.at(-1);
        const first = stage('use', template.action);
        const action = {type: 'sequence', name: template.name, interaction: {template: template.id}, scope: template.scope,
            repeat: template.repeat, cooldownSeconds: 60, initialTile: 0, completedName: template.complete, start: first.id, stages: [first]};
        if (id === 'switch') {
            const off = stage('turn_off', 'Turn off');
            first.next = off.id;
            first.duration = off.duration = 0;
            off.triggerMode = 'deactivate';
            action.stages.push(off);
        }
        return action;
    }
    // Presentation-only fields must not reset persistent gameplay progress.
    function runtimeDefinition(action) {
        const copy = JSON.parse(JSON.stringify(action));
        if (copy.interaction) {
            delete copy.name;
            delete copy.interaction;
            delete copy.completedName;
            delete copy.appearances;
            for (const step of copy.stages) {delete step.name; delete step.message; delete step.failureMessage;}
        }
        return copy;
    }
    function requiredItems(step) {
        const amounts = new Map();
        for (const row of step.costs) amounts.set(String(row.item), row.amount);
        if (step.tool) amounts.set(String(step.tool), Math.max(1, amounts.get(String(step.tool)) || 0));
        return [...amounts].map(([item, quantity]) => ({item, quantity}));
    }
    return {templates, create, stage, runtimeDefinition, requiredItems};
});
