(() => {
    'use strict';
    const styles = [
        {label: 'Item', classes: 'dialogue-item', hint: 'Gold emphasis for an item or supply'},
        {label: 'Danger', classes: 'dialogue-danger', hint: 'Red emphasis for a threat'},
        {label: 'Wave', classes: 'dialogue-wave', hint: 'Blue emphasis with a gentle wave in the game'},
        {label: 'Shake', classes: 'dialogue-shake', hint: 'A small shake in the game'},
        {label: 'Danger + shake', classes: 'dialogue-danger dialogue-shake', hint: 'Red emphasis with a small shake'}
    ];
    const allowed = new Set(['dialogue-item', 'dialogue-danger', 'dialogue-wave', 'dialogue-shake']);
    const editors = [];
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function appendPreview(parent, source) {
        // Copy only text and known styling spans into the live document.
        const parsed = document.createElement('template');
        parsed.innerHTML = source;
        function copy(from, to) {
            for (const child of from.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {to.append(document.createTextNode(child.textContent)); continue;}
                if (child.nodeType !== Node.ELEMENT_NODE || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(child.tagName)) continue;
                if (child.tagName === 'BR') {to.append(document.createTextNode('\n')); continue;}
                if (child.tagName === 'SPAN') {
                    const span = element('span');
                    span.className = [...child.classList].filter(name => allowed.has(name)).join(' ');
                    copy(child, span); to.append(span);
                } else {
                    copy(child, to);
                    if (['P', 'DIV'].includes(child.tagName)) to.append(document.createTextNode('\n'));
                }
            }
        }
        copy(parsed.content, parent);
    }
    for (const id of ['quest-start', 'quest-progress', 'quest-end', 'quest-long-text', 'quest-log-text', 'quest-npc-text']) {
        const input = document.getElementById(id);
        const label = document.querySelector(`label[for="${id}"]`).textContent;
        const wrapper = element('div', undefined, 'dialogue-editor');
        input.before(wrapper);
        const toolbar = element('div', undefined, 'dialogue-editor-toolbar');
        toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', label + ' editor controls');
        const counterControls = element('div', undefined, 'dialogue-editor-counters');
        const previewHeading = element('div', 'Dialogue preview', 'dialogue-editor-preview-label');
        const preview = element('div', undefined, 'dialogue-editor-preview');
        preview.setAttribute('aria-label', label + ' preview');
        const note = element('p', undefined, 'dialogue-editor-note');
        note.id = id + '-editor-note';
        wrapper.append(toolbar, input, previewHeading, preview, note);
        const history = [];
        let applying = false;
        function apply(replacement, start = input.selectionStart, end = input.selectionEnd, selection) {
            const value = input.value.slice(0, start) + replacement + input.value.slice(end);
            if (input.maxLength > 0 && value.length > input.maxLength) {
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
            control.addEventListener('click', callback); parent.append(control); return control;
        }
        for (const style of styles) {
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
        if (id === 'quest-progress') {
            counterControls.append(element('span', 'Insert progress:'));
            for (const tag of ['remaining', 'done', 'amount']) button('{{' + tag + '}}', 'Insert the ' + tag + ' progress tag at the cursor', () => apply('{{' + tag + '}}'), counterControls);
            toolbar.append(counterControls);
        }
        function refresh(resetHistory = false) {
            if (resetHistory) history.length = 0;
            const progress = id === 'quest-progress';
            const counters = progress && !document.getElementById('quest-progress-tags').hidden;
            counterControls.hidden = !counters;
            preview.replaceChildren();
            let source = input.value;
            if (counters) source = source.replace(/\{\{(remaining|done|amount)\}\}/g, (_, key) => ({remaining: 7, done: 3, amount: 10})[key]);
            if (source.trim()) appendPreview(preview, source);
            else {const empty = element('span', 'Your dialogue will appear here.', 'dialogue-editor-empty'); preview.append(empty);}
            note.textContent = (counters ? 'Preview uses sample progress: 7 remaining, 3 done, 10 total. ' : '') +
                'Select a word or phrase, then choose a style. Wave and shake animate in the game.';
            for (const control of toolbar.querySelectorAll('button')) control.disabled = input.disabled;
            undo.disabled = input.disabled || !history.length;
            remove.disabled = input.disabled || !/<span\b/i.test(input.value);
        }
        input.addEventListener('input', () => {if (!applying) history.length = 0; refresh();});
        editors.push(refresh); refresh();
    }
    document.addEventListener('toolbox:dialogue', () => editors.forEach(refresh => refresh(true)));
})();
