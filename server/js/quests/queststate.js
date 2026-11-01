// Shared saved-quest lookup, independent of startup or world content.
function completed(data, id) {
    return ['COMPLETED', 'FINISHED'].some(status => (data?.quests?.[status] || []).some(q => (q.questKey || q.id) === id));
}
function hasChoices(data, requiredChoices = []) {
    return requiredChoices.every(choice => (data?.choices || []).includes(choice));
}
function validateRequiredChoices(requiredChoices) {
    if (requiredChoices === undefined) return;
    if (!Array.isArray(requiredChoices) || requiredChoices.length > 20 || new Set(requiredChoices).size !== requiredChoices.length ||
        requiredChoices.some(choice => typeof choice !== 'string' || !/^[A-Za-z0-9:_-]{1,100}$/.test(choice))) {
        throw new Error('Required quest choices must contain at most 20 unique choice IDs.');
    }
}
module.exports = {completed, hasChoices, validateRequiredChoices};
