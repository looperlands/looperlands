const fs = require('fs'), vm = require('vm');
const format = require('../../shared/js/dialogueformat');

function setup(options = {}, value = 'Bring wood.') {
    const Event = class {constructor(type) {this.type = type;}};
    function element(tag) {
        const node = {tag, children: [], value: '', maxLength: -1, selectionStart: 0, selectionEnd: 0, listeners: {},
            append(...nodes) {for (const child of nodes) {child.remove?.(); this.children.push(child); child.parent = this;}},
            remove() {if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);},
            before(child) {const parent = this.parent, index = parent.children.indexOf(this); parent.children.splice(index, 0, child); child.parent = parent;},
            replaceChildren(...nodes) {this.children = []; this.append(...nodes);},
            setAttribute() {}, focus() {},
            matches() {return this.disabled || this.parentDisabled;}, closest() {return this.inert ? {} : null;},
            querySelectorAll(tag) {return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]);},
            addEventListener(type, callback) {(this.listeners[type] ||= []).push(callback);},
            dispatchEvent(event) {for (const callback of this.listeners[event.type] || []) callback(event);},
            setSelectionRange(start, end) {this.selectionStart = start; this.selectionEnd = end;},
            setRangeText(text, start, end) {this.value = this.value.slice(0, start) + text + this.value.slice(end); this.setSelectionRange(start + text.length, start + text.length);}
        };
        return node;
    }
    const window = {DialogueText: {presentInstant: jest.fn()}, DialogueFormat: {...format, append(parent, source) {parent.textContent = source;}}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./dialogueeditor'), 'utf8'), {window, document: {createElement: element}, Event});
    const parent = element('div'), input = element('textarea');
    input.value = value; input.labels = [{textContent: 'NPC speech'}]; parent.append(input);
    const editor = window.ToolboxDialogueEditor.attach(input, options), wrapper = parent.children[0];
    const button = label => wrapper.querySelectorAll('button').find(button => button.textContent === label);
    const click = label => button(label).dispatchEvent(new Event('click'));
    const type = value => {input.value = value; input.dispatchEvent(new Event('input'));};
    return {window, input, wrapper, editor, button, click, type};
}

test('each textarea gets one editor and toolbar changes notify existing model bindings', () => {
    const h = setup(), changes = [];
    h.input.addEventListener('input', () => changes.push(h.input.value));
    h.input.setSelectionRange(6, 10); h.click('Item');
    expect(h.input.value).toBe('Bring <span class="dialogue-item">wood</span>.');
    expect(changes).toEqual([h.input.value]);
    expect(h.window.ToolboxDialogueEditor.attach(h.input)).toBe(h.editor);
    h.click('Undo'); expect(h.input.value).toBe('Bring wood.');
    expect(changes).toHaveLength(2);
});

test('manual typing and record resets invalidate toolbar undo history', () => {
    const h = setup(); h.click('Wave'); h.type('New wording');
    expect(h.button('Undo').disabled).toBe(true); h.click('Undo');
    expect(h.input.value).toBe('New wording');
    h.click('Shake'); h.input.value = 'Another NPC'; h.editor.reset(); h.click('Undo');
    expect(h.input.value).toBe('Another NPC');
});

test('multiline selections stay independently balanced for one-message-per-line fields', () => {
    const h = setup({}, 'Hello\n\nGoodbye'); h.input.setSelectionRange(0, h.input.value.length); h.click('Danger + shake');
    for (const line of h.input.value.split('\n').filter(Boolean)) expect(() => format.validate(line, 'Line')).not.toThrow();
    h.click('Remove styles'); expect(h.input.value).toBe('Hello\n\nGoodbye');
    h.click('Undo'); expect(h.input.value).toContain('dialogue-danger dialogue-shake');
});

test('tags are opt-in, follow context availability and substitute sample values in previews', () => {
    let enabled = false;
    const h = setup({tags: () => enabled ? [{key: 'remaining', sample: 7}] : []}, 'Need {{remaining}}.');
    expect(h.button('{{remaining}}')).toBeUndefined();
    enabled = true; h.editor.refresh(); h.input.setSelectionRange(h.input.value.length, h.input.value.length); h.click('{{remaining}}');
    expect(h.input.value).toBe('Need {{remaining}}.{{remaining}}');
    expect(h.wrapper.children[3].textContent).toBe('Need 7.7');
    enabled = false; h.editor.refresh(); expect(h.button('{{remaining}}')).toBeUndefined();
});

test('length limits, disabled fieldsets, read-only and inert forms prevent toolbar edits', () => {
    const h = setup(); h.input.maxLength = 12; h.click('Item');
    expect(h.input.value).toBe('Bring wood.'); expect(h.button('Undo').disabled).toBe(true);
    h.input.maxLength = -1;
    for (const state of ['disabled', 'parentDisabled', 'readOnly', 'inert']) {
        h.input[state] = true; h.editor.refresh(); h.click('Item');
        expect(h.input.value).toBe('Bring wood.'); h.input[state] = false;
    }
    h.editor.refresh(); h.click('Item'); expect(h.input.value).toContain('dialogue-item');
});

test('live previews prepare game effects while leaving the authored source untouched', () => {
    const h = setup({}, '<span class="dialogue-wave">Hello</span>');
    const preview = h.wrapper.children[3];
    expect(h.window.DialogueText.presentInstant).toHaveBeenLastCalledWith(preview);
    h.type('<span class="dialogue-danger dialogue-shake">Beware</span>');
    expect(h.window.DialogueText.presentInstant).toHaveBeenLastCalledWith(preview);
    expect(h.input.value).toBe('<span class="dialogue-danger dialogue-shake">Beware</span>');
    const container = {};
    h.window.ToolboxDialogueEditor.appendPreview(container, '<span class="dialogue-wave">Hi</span>');
    expect(h.window.DialogueText.presentInstant).toHaveBeenLastCalledWith(container);
});
