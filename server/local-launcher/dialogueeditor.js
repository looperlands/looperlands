(() => {
    'use strict';
    const format = window.DialogueFormat;
    const instances = new WeakMap();
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function appendPreview(parent, source) {
        format.append(parent, source);
        window.DialogueText.presentInstant(parent);
    }
    /** Enhance a textarea in place, preserving its constraints and input events.
     * tags: optional [{key, sample}], or a function returning them for current context.
     * reset() clears toolbar history after loading a record; refresh() updates tags/state.
     * Dynamic forms are weakly held and need no teardown when their DOM is removed.
     */
    function attach(input, options = {}) {
        if (instances.has(input)) return instances.get(input);
        const label = options.label || input.labels?.[0]?.textContent || 'Dialogue';
        const wrapper = element('div', undefined, 'dialogue-editor');
        input.before(wrapper);
        const toolbar = element('div', undefined, 'dialogue-editor-toolbar');
        toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', label + ' editor controls');
        const counterControls = element('div', undefined, 'dialogue-editor-counters');
        const previewHeading = element('div', 'Dialogue preview', 'dialogue-editor-preview-label');
        const preview = element('div', undefined, 'dialogue-editor-preview');
        preview.setAttribute('aria-label', label + ' preview');
        const note = element('p', undefined, 'dialogue-editor-note');
        if (input.id) note.id = input.id + '-editor-note';
        wrapper.append(toolbar, input, previewHeading, preview, note);
        const history = [];
        let applying = false;
        const tags = () => (typeof options.tags === 'function' ? options.tags() : options.tags) || [];
        const controlsDisabled = () => input.disabled || input.readOnly;
        const blocked = () => input.matches(':disabled') || input.readOnly || !!input.closest('[inert]');
        function apply(replacement, start = input.selectionStart, end = input.selectionEnd, selection) {
            if (blocked()) return;
            const value = input.value.slice(0, start) + replacement + input.value.slice(end);
            if (input.maxLength >= 0 && value.length > input.maxLength) {
                note.textContent = 'This text is too long. Shorten it before adding more formatting.';
                return;
            }
            history.push({value: input.value, start, end}); if (history.length > 20) history.shift();
            input.focus(); input.setRangeText(replacement, start, end, 'end');
            if (selection) input.setSelectionRange(start + selection[0], start + selection[1]);
            applying = true; input.dispatchEvent(new Event('input', {bubbles: true})); applying = false;
            refresh();
        }
        function button(text, title, callback, parent = toolbar) {
            const control = element('button', text);
            control.type = 'button'; control.title = title;
            control.addEventListener('pointerdown', event => event.preventDefault());
            control.addEventListener('click', () => {if (!blocked()) callback();}); parent.append(control); return control;
        }
        for (const style of format.styles) {
            button(style.label, style.hint + `: <span class="${style.classes}">text</span>`, () => {
                const selected = input.value.slice(input.selectionStart, input.selectionEnd) || 'text';
                if (!selected.trim()) {note.textContent = 'Select a word or phrase to style.'; input.focus(); return;}
                const opening = `<span class="${style.classes}">`;
                const replacement = selected.split('\n').map(line => line ? opening + line + '</span>' : '').join('\n');
                const selection = selected.includes('\n') ? [0, replacement.length] : [opening.length, opening.length + selected.length];
                apply(replacement, input.selectionStart, input.selectionEnd, selection);
            });
        }
        const remove = button('Remove styles', 'Remove span formatting from this text field', () => {
            const value = input.value.replace(/<\/?span\b[^>]*>/gi, '');
            if (value !== input.value) apply(value, 0, input.value.length);
        });
        const undo = button('Undo', 'Undo the last editor toolbar action', () => {
            const previous = history.pop(); if (!previous) return;
            input.focus(); input.value = previous.value; input.setSelectionRange(previous.start, previous.end);
            applying = true; input.dispatchEvent(new Event('input', {bubbles: true})); applying = false; refresh();
        });
        toolbar.append(counterControls);
        function refresh() {
            const available = tags();
            const counters = available.length > 0;
            counterControls.hidden = !counters;
            counterControls.replaceChildren();
            if (counters) {
                counterControls.append(element('span', 'Insert progress:'));
                for (const tag of available) button('{{' + tag.key + '}}', 'Insert the ' + tag.key + ' progress tag at the cursor', () => apply('{{' + tag.key + '}}'), counterControls);
            }
            preview.replaceChildren();
            let source = input.value;
            source = source.replace(/\{\{(\w+)\}\}/g, (text, key) => {const tag = available.find(tag => tag.key === key); return tag ? String(tag.sample) : text;});
            if (source.trim()) appendPreview(preview, source);
            else {const empty = element('span', 'Your dialogue will appear here.', 'dialogue-editor-empty'); preview.append(empty);}
            note.textContent = (counters ? 'Preview samples: ' + available.map(tag => '{{' + tag.key + '}} = ' + tag.sample).join(', ') + '. ' : '') +
                'Select a word or phrase, then choose a style. Wave and shake animate in this preview and in the game.';
            for (const control of toolbar.querySelectorAll('button')) control.disabled = controlsDisabled();
            undo.disabled = controlsDisabled() || !history.length;
            remove.disabled = controlsDisabled() || !/<span\b/i.test(input.value);
        }
        input.addEventListener('input', () => {if (!applying) history.length = 0; refresh();});
        wrapper.addEventListener('focusin', event => {if (event.target === input) refresh();});
        const controller = {refresh, reset() {history.length = 0; refresh();}};
        instances.set(input, controller); refresh(); return controller;
    }
    window.ToolboxDialogueEditor = {attach, appendPreview};
})();
