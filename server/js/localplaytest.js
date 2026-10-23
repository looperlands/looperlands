function isLocalPlaytest() {
    return process.env.NODE_ENV === 'development' && process.env.LOOPERLANDS_LOCAL_PLAYTEST === '1';
}

module.exports = {isLocalPlaytest};
