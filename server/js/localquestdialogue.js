// Quest counters and general dialogue share the same style grammar.
const format = require('../../shared/js/dialogueformat');
const styles = format.classes;
const fail = message => {throw Object.assign(new Error(message), {status: 400});};
function counters(value, label) {
    if (/\{\{|\}\}/.test(value.replace(/\{\{(?:remaining|done|amount)\}\}/g, ''))) fail(label + ' supports only {{remaining}}, {{done}} and {{amount}} placeholders.');
}
function validateDialogue(value, label, max = 2000, optional = false) {
    if (optional && value === undefined) return;
    format.validate(value, label, max, format.progressTags);
}
module.exports = {styles, counters, validateDialogue};
