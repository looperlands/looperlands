/* The guest never receives the LL session or accesses inventory APIs. */
window.LooperArcadeGuest = (() => {
    const embedded = window.parent !== window;
    const channel = 'looper-arcade-v1';
    document.body.classList.toggle('embedded', embedded);
    function send(type, payload = {}) {
        if (embedded) window.parent.postMessage({channel, type, ...payload}, window.location.origin);
    }
    function close() {
        if (embedded) send('close');
        else window.location.href = '../../arcade-preview/';
    }
    document.querySelector('.back-link').addEventListener('click', event => { event.preventDefault(); close(); });
    function focusableControls() {
        return [...document.querySelectorAll('button, a, input')].filter(node => node.getClientRects().length && !node.disabled);
    }
    window.addEventListener('message', event => {
        if (!embedded || event.origin !== window.location.origin || event.source !== window.parent || event.data?.channel !== channel || event.data.type !== 'focus-entry') return;
        const controls = focusableControls();
        (event.data.last ? controls.at(-1) : controls[0])?.focus();
    });
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
        if (embedded && event.key === 'Tab') {
            const nodes = focusableControls();
            if (event.shiftKey && document.activeElement === nodes[0] || !event.shiftKey && document.activeElement === nodes.at(-1)) {
                event.preventDefault(); send('focus-exit');
            }
        }
    }, true);
    async function connect() {
        if (!embedded) {
            const config = await fetch('../../sprites/clotharmor.json').then(response => response.json());
            return {name: 'Local Looper', avatar: {src: '../../img/1/clotharmor.png', config: {...config, offset_x: 0, offset_y: 0, scale: 1.75}}};
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { window.removeEventListener('message', receive); reject(new Error('Avatar handoff timed out.')); }, 12000);
            function receive(event) {
                if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.channel !== channel || event.data.type !== 'init') return;
                clearTimeout(timer); window.removeEventListener('message', receive); resolve(event.data.context);
            }
            window.addEventListener('message', receive);
            send('ready');
        });
    }
    return {connect, send, close};
})();
