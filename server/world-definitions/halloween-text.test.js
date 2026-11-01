global.Types = {};
const Text = require('./halloween-text');

function story() {
    const quests = [{id: 'MYSTERY', name: 'A missing shadow', startText: 'Find the shoes.', endText: 'The shadow is home.',
        reward: {item: 123, amount: 3}, requiredChoices: ['freed'], objectives: [{id: 'trail', label: 'Inspect the shoes.', npcKey: 'halloween:shoes'}]}];
    const dialogues = [{key: 'halloween:witch', nodes: {welcome: {text: 'Go north to the shoes.',
        actions: [{type: 'handout_quest', quest: 'MYSTERY'}],
        options: [{text: 'I will help.', goto: 'accept', conditions: [{if: 'quest_open', quest: 'MYSTERY'}]}],
        conditions: [{if: 'choice_made', choice: 'freed', text: 'Return south to me.'}]}}}];
    return {quests, dialogues};
}

test('text IDs remain stable when displayed names and directions change', () => {
    const f = story(), before = Text.getEntries(f.quests, f.dialogues);
    f.quests[0].name = 'A new title'; f.dialogues[0].nodes.welcome.text = 'Go east instead.';
    const after = Text.getEntries(f.quests, f.dialogues);
    expect(after.map(entry => entry.id)).toEqual(before.map(entry => entry.id));
    expect(after.map(entry => entry.id)).toContain('objective:MYSTERY:trail');
    expect(after.map(entry => entry.id)).toContain('condition:halloween:witch:welcome:0');
    expect(before.find(entry => entry.id === 'quest:MYSTERY:name').value).toBe('A missing shadow');
});

test('authored directions update all text surfaces while preserving quest gates, rewards and dialogue transitions', () => {
    const f = story(), node = f.dialogues[0].nodes.welcome;
    const actions = node.actions, condition = node.conditions[0], choice = node.options[0], reward = f.quests[0].reward;
    Text.apply(f.quests, f.dialogues, {
        'quest:MYSTERY:startText': 'Find the shoes by the lake.',
        'objective:MYSTERY:trail': 'Inspect the shoes beside the lake.',
        'dialogue:halloween:witch:welcome:text': 'Go east to the <span class="dialogue-item">shoes</span>.',
        'choice:halloween:witch:welcome:0': 'I will visit the lake.',
        'condition:halloween:witch:welcome:0': 'Return west to me.'
    });
    expect(f.quests[0].startText).toBe('Find the shoes by the lake.');
    expect(f.quests[0].objectives[0]).toEqual({id: 'trail', label: 'Inspect the shoes beside the lake.', npcKey: 'halloween:shoes'});
    expect(node.text).toContain('Go east'); expect(node.actions).toBe(actions);
    expect(node.options[0]).toBe(choice); expect(choice.goto).toBe('accept');
    expect(choice.conditions).toEqual([{if: 'quest_open', quest: 'MYSTERY'}]);
    expect(node.conditions[0]).toBe(condition); expect(condition.choice).toBe('freed'); expect(condition.text).toBe('Return west to me.');
    expect(f.quests[0].reward).toBe(reward); expect(f.quests[0].requiredChoices).toEqual(['freed']);
});

test.each([
    {'dialogue:halloween:witch:welcome:actions': 'skip the quest'},
    {'dialogue:halloween:witch:welcome:text': '<script>alert(1)</script>'},
    {'dialogue:halloween:witch:welcome:text': '<span class="unknown">go</span>'},
    {'dialogue:halloween:witch:welcome:text': '{{untrusted}}'},
    {'dialogue:halloween:witch:welcome:text': ''},
    {'dialogue:halloween:witch:welcome:text': 5},
    {'quest:MYSTERY:name': '<span class="dialogue-item">Name</span>'},
    {'objective:MYSTERY:trail': 'x'.repeat(201)},
    []
])('invalid overrides fail before changing any existing story text: %j', overrides => {
    const f = story(), before = JSON.stringify(f);
    expect(() => Text.apply(f.quests, f.dialogues, overrides)).toThrow();
    expect(JSON.stringify(f)).toBe(before);
});

test('one invalid entry cannot partially apply earlier valid entries', () => {
    const f = story();
    expect(() => Text.apply(f.quests, f.dialogues, {'quest:MYSTERY:name': 'Changed', invalid: 'no'})).toThrow();
    expect(f.quests[0].name).toBe('A missing shadow');
});

test('runtime loads authored text while retaining immutable defaults for editor reset', () => {
    jest.isolateModules(() => {
        const content = jest.requireActual('./halloween-content');
        jest.doMock('./halloween-content', () => ({...content, event: {...content.event, textOverrides: {
            'dialogue:halloween:witch:accept-shadow:text': 'Find the shoes beside the lake.'
        }}}));
        const loaded = require('./halloween-story');
        expect(loaded.dialogues.find(row => row.key === 'halloween:witch').nodes['accept-shadow'].text).toBe('Find the shoes beside the lake.');
        const original = loaded.defaultTexts.find(row => row.id === 'dialogue:halloween:witch:accept-shadow:text');
        expect(original.value).toMatch(/northern river bridge/);
        expect(Object.isFrozen(loaded.defaultTexts)).toBe(true); expect(Object.isFrozen(original)).toBe(true);
        jest.dontMock('./halloween-content');
    });
});
