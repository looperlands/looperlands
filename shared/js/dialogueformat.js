(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else root.DialogueFormat = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const classes = ['dialogue-item', 'dialogue-danger', 'dialogue-wave', 'dialogue-shake'];
    const styles = [
        {label: 'Item', classes: 'dialogue-item', hint: 'Gold emphasis for an item or supply'},
        {label: 'Danger', classes: 'dialogue-danger', hint: 'Red emphasis for a threat'},
        {label: 'Wave', classes: 'dialogue-wave', hint: 'Blue emphasis with a gentle wave in the game'},
        {label: 'Shake', classes: 'dialogue-shake', hint: 'A small shake in the game'},
        {label: 'Danger + shake', classes: 'dialogue-danger dialogue-shake', hint: 'Red emphasis with a small shake'}
    ];
    const progressTags = ['remaining', 'done', 'amount'];
    const fail = message => {throw Object.assign(new Error(message), {status: 400});};

    function validate(value, label, max = 2000, tags = []) {
        if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(label + ' must contain between 1 and ' + max + ' characters.');
        const unresolved = value.replace(/\{\{(\w+)\}\}/g, (tag, key) => tags.includes(key) ? '' : tag);
        if (/\{\{|\}\}/.test(unresolved)) fail(label + (tags.length ? ' supports only ' + tags.map(key => '{{' + key + '}}').join(', ') + ' placeholders.' : ' has no quest-progress counters.'));
        const invalid = () => fail(label + ' allows only balanced <span class="..."> styles: ' + classes.join(', ') + '. Other tags and attributes are not supported.');
        let depth = 0;
        for (const tag of value.match(/<[^>]*>|[<>]/g) || []) {
            if (/^<\/span[ \t\r\n]*>$/i.test(tag)) {if (!depth) invalid(); depth--; continue;}
            const opening = tag.match(/^<span[ \t\r\n]+class[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')[ \t\r\n]*>$/i);
            if (!opening) invalid();
            const names = (opening[1] ?? opening[2]).split(/[ \t\r\n]+/).filter(Boolean);
            if (!names.length || names.some(name => !classes.includes(name))) invalid();
            depth++;
        }
        if (depth) invalid();
        if (!value.replace(/<[^>]*>/g, '').trim()) fail(label + ' needs some dialogue text inside its styles.');
    }

    function isValid(value, max = 240) {
        // Empty optional routine lines have historically been allowed.
        if (value === '') return true;
        try {validate(value, 'Dialogue', max); return true;} catch (_) {return false;}
    }

    function append(parent, source) {
        const document = parent.ownerDocument, parsed = document.createElement('template');
        parsed.innerHTML = String(source ?? '');
        function copy(from, to) {
            for (const child of from.childNodes) {
                if (child.nodeType === 3) {to.append(document.createTextNode(child.textContent)); continue;}
                if (child.nodeType !== 1 || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(child.tagName)) continue;
                if (child.tagName === 'BR') {to.append(document.createTextNode('\n')); continue;}
                if (child.tagName === 'SPAN') {
                    const span = document.createElement('span');
                    span.className = [...child.classList].filter(name => classes.includes(name)).join(' ');
                    if (span.className) {copy(child, span); to.append(span);} else copy(child, to);
                } else {
                    copy(child, to);
                    if (['P', 'DIV'].includes(child.tagName)) to.append(document.createTextNode('\n'));
                }
            }
        }
        copy(parsed.content, parent);
    }

    return {classes, styles, progressTags, validate, isValid, append};
});
