// Keep one XP write in flight per asset and combine rewards from the same attack.
const pendingSyncs = new WeakMap();

function syncExperience(owner, batchSize, saveExperience, applyExperience) {
    const pending = pendingSyncs.get(owner);
    if (pending) {
        pending.flushRequested = true;
        return pending.promise;
    }

    const state = { flushRequested: true };
    pendingSyncs.set(owner, state);
    state.promise = (async () => {
        // AoE targets are processed synchronously; collect their XP before sending.
        await Promise.resolve();
        while (state.flushRequested || owner.accumulatedExperience > batchSize) {
            state.flushRequested = false;
            const xp = owner.accumulatedExperience;
            if (!Number.isFinite(xp)) {
                throw new Error('Invalid accumulated XP');
            }
            if (xp <= 0) {
                return;
            }

            owner.accumulatedExperience -= xp;
            let updatedExperience;
            try {
                updatedExperience = await saveExperience(xp);
                if (!Number.isFinite(updatedExperience)) {
                    throw new Error('Invalid XP sync response');
                }
            } catch (error) {
                owner.accumulatedExperience += xp;
                throw error;
            }

            // The response covers the submitted batch, not XP earned while awaiting it.
            applyExperience(updatedExperience + owner.accumulatedExperience);
        }
    })().finally(() => pendingSyncs.delete(owner));

    return state.promise;
}

module.exports = syncExperience;
