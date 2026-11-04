/* Only fixed categories leave the game. Session IDs, names and quest text stay here. */
define(function () {
    const sources = new Set(['direct', 'search', 'discord', 'youtube', 'x', 'reddit', 'instagram', 'tiktok', 'creator', 'other']);
    const started = Date.now();
    let loaded = false, questCompleted = false, characterType = 'unknown';

    function source() {
        const value = new URLSearchParams(window.location.search).get('ll_source');
        return sources.has(value) ? value : 'other';
    }
    function emit(event) {
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({event, schema_version: 1, page: 'game', source: source(),
                character_type: characterType, duration_ms: Math.min(Math.max(0, Date.now() - started), 86400000),
                // Never let a tag's default page URL include the game's session query.
                page_location: 'https://looperlands.io/', page_referrer: '',
                method: null, stage: null, reason: null, availability: null, action: null, character_count: null});
        } catch (_) { /* Analytics cannot interrupt a frame or a quest reward. */ }
    }
    function loadContainer() {
        try {
            const id = document.querySelector('meta[name="looperlands-gtm"]')?.content;
            const host = window.location.hostname;
            if (window.location.protocol !== 'https:' || /^(localhost|0\.0\.0\.0|\[?::1\]?)$|^127\./.test(host) || !/^GTM-[A-Z0-9]+$/.test(id || '')) return;
            window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtm.js?id=' + id;
            document.head.append(script);
        } catch (_) { /* A missing tag does not prevent playing. */ }
    }
    return {
        worldLoaded(freeToPlay) {
            if (loaded) return;
            loaded = true;
            characterType = freeToPlay === true ? 'free' : freeToPlay === false ? 'premium' : 'unknown';
            emit('ll_world_loaded');
            loadContainer();
        },
        firstQuestCompleted() {
            if (!loaded || questCompleted) return;
            questCompleted = true;
            emit('ll_first_quest_completed');
        },
    };
});
