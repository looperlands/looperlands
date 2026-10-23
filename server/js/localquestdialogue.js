// Quest authors may use the four presentation classes implemented by the game.
// Validate this small grammar without rewriting or silently stripping markup.
const styles = ['dialogue-item', 'dialogue-danger', 'dialogue-wave', 'dialogue-shake'];
const fail = message => {throw Object.assign(new Error(message), {status: 400});};
function counters(value, label) {
    if (/\{\{|\}\}/.test(value.replace(/\{\{(?:remaining|done|amount)\}\}/g, ''))) fail(label + ' supports only {{remaining}}, {{done}} and {{amount}} placeholders.');
}
function validateDialogue(value, label, max = 2000, optional = false) {
    if (optional && value === undefined) return;
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(label + ' must contain between 1 and ' + max + ' characters.');
    counters(value, label);
    const invalidStyle = () => fail(label + ' allows only balanced <span class="..."> styles: ' + styles.join(', ') + '. Other tags and attributes are not supported.');
    let depth = 0;
    const tags = value.match(/<[^>]*>|[<>]/g) || [];
    for (const tag of tags) {
        if (/^<\/span[ \t\r\n]*>$/i.test(tag)) {
            if (!depth) invalidStyle();
            depth--;
            continue;
        }
        const opening = tag.match(/^<span[ \t\r\n]+class[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')[ \t\r\n]*>$/i);
        if (!opening) invalidStyle();
        const classes = (opening[1] ?? opening[2]).split(/[ \t\r\n]+/).filter(Boolean);
        if (!classes.length || classes.some(style => !styles.includes(style))) invalidStyle();
        depth++;
    }
    if (depth) invalidStyle();
    if (!value.replace(/<[^>]*>/g, '').trim()) fail(label + ' needs some dialogue text inside its styles.');
}
module.exports = {styles, counters, validateDialogue};
