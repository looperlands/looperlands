// Shared saved-quest lookup, independent of startup or world content.
function completed(data, id) {
    return ['COMPLETED', 'FINISHED'].some(status => (data?.quests?.[status] || []).some(q => (q.questKey || q.id) === id));
}
module.exports = {completed};
