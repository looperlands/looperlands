define(function () {
    function graphemes(text) {
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            return Array.from(new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(text), part => part.segment);
        }
        const result = [];
        for (const character of Array.from(text)) {
            const code = character.codePointAt(0);
            const previous = result[result.length - 1] || '';
            const modifier = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe00-\ufe0f\ufe20-\ufe2f]/.test(character)
                || (code >= 0x1f3fb && code <= 0x1f3ff);
            const flagPair = code >= 0x1f1e6 && code <= 0x1f1ff && Array.from(previous).length === 1
                && previous.codePointAt(0) >= 0x1f1e6 && previous.codePointAt(0) <= 0x1f1ff;
            if (previous && (modifier || character === '\u200d' || previous.endsWith('\u200d') || flagPair)) result[result.length - 1] += character;
            else result.push(character);
        }
        return result;
    }

    function delayAfter(character, next) {
        if (character === '…') return 350;
        if (/[.!?]/.test(character) && !/[.!?]/.test(next || '')) return 300;
        if (/[,;:]/.test(character)) return 140;
        return 30;
    }

    class DialogueText {
        constructor(root, options = {}) {
            this.root = root;
            this.options = options;
            this.timer = null;
            this.index = 0;
            this.isTyping = true;
            this.isSpeaking = false;
            this.cancelled = false;
            this.motion = typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
            this.motionChanged = event => { if (event.matches) this.finish(); };
            this.motion?.addEventListener?.('change', this.motionChanged);
            this.root.classList.remove('dialogue-instant');
            this.root.classList.add('dialogue-text');
            this.glyphs = this.motion?.matches ? [] : this.prepare();
            if (!this.glyphs.length) this.finish();
            else {
                this.root.classList.add('dialogue-typing');
                this.revealNext();
            }
        }

        prepare() {
            const doc = this.root.ownerDocument;
            const walker = doc.createTreeWalker(this.root, 4); // Text nodes only; keep existing HTML and links.
            const textNodes = [];
            let textNode;
            while ((textNode = walker.nextNode())) {
                if (!textNode.parentElement.closest('script, style')) textNodes.push(textNode);
            }
            const glyphs = [];
            textNodes.forEach(node => {
                const fragment = doc.createDocumentFragment();
                const accessible = doc.createElement('span');
                accessible.className = 'dialogue-accessible';
                accessible.textContent = node.textContent;
                fragment.appendChild(accessible);
                (node.textContent.match(/\s+|\S+/gu) || []).forEach(token => {
                    const word = doc.createElement('span');
                    word.className = /^\s+$/.test(token) ? 'dialogue-space' : 'dialogue-word';
                    word.setAttribute('aria-hidden', 'true');
                    graphemes(token).forEach(character => {
                        const glyph = doc.createElement('span');
                        glyph.className = 'dialogue-glyph';
                        glyph.textContent = character;
                        glyph.style.setProperty('--dialogue-index', glyphs.length);
                        word.appendChild(glyph);
                        glyphs.push(glyph);
                    });
                    fragment.appendChild(word);
                });
                node.parentNode.replaceChild(fragment, node);
            });
            return glyphs;
        }

        speak(active) {
            if (active === this.isSpeaking) return;
            this.isSpeaking = active;
            this.options.onSpeaking?.(active);
        }

        revealNext() {
            if (this.cancelled || !this.isTyping) return;
            this.speak(true);
            const glyph = this.glyphs[this.index++];
            glyph.classList.add('revealed');
            if (this.index === this.glyphs.length) { this.finish(false); return; }
            const delay = delayAfter(glyph.textContent, this.glyphs[this.index].textContent);
            if (delay > 30) this.speak(false);
            this.timer = setTimeout(() => this.revealNext(), delay);
        }

        finish(instant = true) {
            if (this.cancelled || !this.isTyping) return;
            clearTimeout(this.timer);
            this.timer = null;
            if (instant) this.root.classList.add('dialogue-instant');
            this.glyphs.forEach(glyph => glyph.classList.add('revealed'));
            this.isTyping = false;
            this.root.classList.remove('dialogue-typing');
            this.speak(false);
            this.motion?.removeEventListener?.('change', this.motionChanged);
            this.options.onComplete?.();
        }

        cancel() {
            clearTimeout(this.timer);
            this.timer = null;
            this.cancelled = true;
            this.isTyping = false;
            this.root.classList.remove('dialogue-typing');
            this.speak(false);
            this.motion?.removeEventListener?.('change', this.motionChanged);
        }
    }

    DialogueText.graphemes = graphemes;
    DialogueText.delayAfter = delayAfter;
    return DialogueText;
});
