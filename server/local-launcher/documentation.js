(() => {
    'use strict';
    const guides = ['mapmaker-toolbox', 'mapmaker-sessions', 'mapmaker-building', 'mapmaker-quest-builder', 'mapmaker-mobs', 'mapmaker-npcs', 'mapmaker-live-assets', 'mapmaker-items', 'mapmaker-doors'];
    const content = document.getElementById('guide-content');
    let active, loadingSlug, sequence = 0;
    function inline(parent, text) {
        // Build text nodes rather than interpreting HTML from a guide.
        const tokens = /(`[^`]+`|\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
        let position = 0;
        for (const match of text.matchAll(tokens)) {
            parent.append(document.createTextNode(text.slice(position, match.index)));
            const token = match[0];
            let element;
            if (token.startsWith('`')) {element = document.createElement('code'); element.textContent = token.slice(1, -1);}
            else if (token.startsWith('**')) {element = document.createElement('strong'); element.textContent = token.slice(2, -2);}
            else {
                const [file, anchor] = match[3].split('#'), slug = file.replace(/\.md$/, '');
                const url = guides.includes(slug) ? '#documentation/' + slug : /^https?:\/\//.test(match[3]) ? match[3] : null;
                if (url) {element = document.createElement('a'); element.href = url; inline(element, match[2]);}
                else {element = document.createElement('span'); element.textContent = match[2] + (anchor ? ' (' + anchor.replaceAll('-', ' ') + ')' : '');}
            }
            parent.append(element); position = match.index + token.length;
        }
        parent.append(document.createTextNode(text.slice(position)));
    }
    function markdown(source) {
        const fragment = document.createDocumentFragment(), lines = source.replace(/\r/g, '').split('\n');
        let paragraph = [], list, fence, code = [];
        const flush = () => {if (paragraph.length) {const p = document.createElement('p'); inline(p, paragraph.join(' ')); fragment.append(p); paragraph = [];} list = undefined;};
        for (const line of lines) {
            if (line.startsWith('```')) {
                flush();
                if (fence) {const pre = document.createElement('pre'), element = document.createElement('code'); element.textContent = code.join('\n'); pre.append(element); fragment.append(pre); fence = false; code = [];}
                else fence = true;
                continue;
            }
            if (fence) {code.push(line); continue;}
            const heading = /^(#{1,3})\s+(.+)$/.exec(line), item = /^\s*(?:([-*])|\d+\.)\s+(.+)$/.exec(line);
            if (heading) {flush(); const element = document.createElement('h' + Math.min(4, heading[1].length + 1)); inline(element, heading[2]); fragment.append(element);}
            else if (item) {
                if (paragraph.length) flush();
                const tag = item[1] ? 'ul' : 'ol';
                if (!list || list.tagName.toLowerCase() !== tag) {list = document.createElement(tag); fragment.append(list);}
                const li = document.createElement('li'); inline(li, item[2]); list.append(li);
            } else if (!line.trim()) flush();
            else {list = undefined; paragraph.push(line.trim());}
        }
        flush(); return fragment;
    }
    async function loadGuide() {
        if (location.hash.split('/')[0] !== '#documentation') return;
        const slug = location.hash.split('/')[1] || guides[0];
        if (!guides.includes(slug)) {location.replace('#documentation/' + guides[0]); return;}
        if ((slug === active && !loadingSlug) || slug === loadingSlug) return;
        const token = ++sequence;
        loadingSlug = slug;
        active = undefined;
        content.setAttribute('aria-busy', 'true'); content.textContent = 'Loading guide…';
        for (const link of document.querySelectorAll('.guide-nav a')) {
            if (link.hash === '#documentation/' + slug) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        try {
            const response = await fetch('./guides/' + slug + '.md', {signal: AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error('This guide could not load. Try again.');
            const source = await response.text();
            if (token !== sequence) return;
            content.replaceChildren(markdown(source)); active = slug;
            if (location.hash.split('/')[0] === '#documentation') window.scrollTo(0, 0);
        } catch (failure) {
            if (token !== sequence) return;
            const p = document.createElement('p'); p.textContent = failure.name === 'TimeoutError' ? 'The guide took too long to load. Try again.' : failure.message;
            const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again'; retry.addEventListener('click', loadGuide);
            content.replaceChildren(p, retry);
        } finally {if (token === sequence) {loadingSlug = undefined; content.setAttribute('aria-busy', 'false');}}
    }
    window.addEventListener('hashchange', loadGuide);
    document.addEventListener('toolbox:pane', event => {if (event.detail === 'documentation') loadGuide();});
    loadGuide();
})();
