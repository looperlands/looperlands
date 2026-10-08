// In-world conversation pacing, separate from the UI that renders each speaker.
(function (factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else define(factory);
})(function () {
    function lines(text) {
        return (Array.isArray(text) ? text : [text]).filter(Boolean).flatMap(part =>
            String(part).replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').split('\n'))
            .filter(part => part.trim()).flatMap(part => {
                const chunks = []; let line = '';
                for (const word of part.trim().split(/\s+/)) {
                    if (line.length + word.length > 170) {chunks.push(line); line = '';}
                    line += (line ? ' ' : '') + word;
                }
                if (line) chunks.push(line);
                return chunks;
            });
    }
    class Conversation {
        constructor(view) {this.view = view; this.current = null;}
        start(npc, node) {
            this.cancel();
            const beats = [...lines(node.playerLine).map(text => ({speaker: 'player', text})),
                ...lines(node.text).map(text => ({speaker: 'npc', text}))];
            this.current = {npc, node, beats, index: 0, selected: 0, replying: false};
            this.advance();
        }
        active(npc) {
            if (!this.current || (npc && this.current.npc !== npc)) return false;
            if (!this.view.nearby(this.current.npc)) {this.cancel(); return false;}
            return true;
        }
        advance(npc) {
            if (!this.active(npc)) return false;
            const current = this.current;
            if (current.replying) return true;
            this.view.listen?.(current.npc);
            const beat = current.beats[current.index++];
            if (beat) {
                this.view.speech(current.npc, beat, () => {if (this.current === current) this.advance();});
                return true;
            }
            const options = current.node.options || [];
            if (current.node.decision && options.length > 1) {
                this.cancel();
                this.view.decision(current.npc, current.node);
            } else if (options.length) {
                current.replying = true;
                const last = [...current.beats].reverse().find(beat => beat.speaker === 'npc');
                this.view.replies(current.npc, last?.text || 'What would you like to ask?', options, choice => {
                    if (this.current !== current || !this.active()) return;
                    this.cancel(); this.view.choose(current.npc, choice);
                });
                this.view.highlight?.(current.selected);
                // E does not choose a reply for the player or reopen the conversation.
                current.index = current.beats.length + 1;
            } else {
                this.cancel();
                if (current.node.goto) this.view.choose(current.npc, current.node.goto);
            }
            return true;
        }
        handleKey(key) {
            if (!this.active()) return false;
            const current = this.current;
            if (key === 'Escape') {this.cancel(); return true;}
            if (current.replying) {
                const options = current.node.options;
                const backwards = ['ArrowUp', 'ArrowLeft', 'w'].includes(key);
                if (backwards || ['ArrowDown', 'ArrowRight', 's'].includes(key)) {
                    current.selected = (current.selected + (backwards ? -1 : 1) + options.length) % options.length;
                    this.view.highlight?.(current.selected);
                    return true;
                }
                if (key === 'Enter') {
                    const choice = options[current.selected].goto;
                    this.cancel(); this.view.choose(current.npc, choice);
                    return true;
                }
                return key === 'e';
            }
            if (key === 'Enter' || key === 'e') return this.advance();
            return false;
        }
        cancel() {
            if (this.current) this.view.close(this.current.npc);
            this.current = null;
        }
    }
    // Heartbeats stop on close, death or walking away; the server also expires
    // abandoned readers, so a disconnected browser cannot freeze a shared NPC.
    class ListeningHold {
        constructor(view) {this.view = view; this.npc = null; this.timer = null;}
        start(npc) {
            if (this.npc !== npc) {this.stop(); this.npc = npc;}
            this.view.listen(npc, true);
            if (!this.timer) this.timer = setInterval(() => {
                if (!this.view.nearby(this.npc)) {const id = this.npc; this.stop(); this.view.leave(id);}
                else this.view.listen(this.npc, true);
            }, 4000);
        }
        stop() {
            if (this.timer) clearInterval(this.timer);
            this.timer = null;
            if (this.npc !== null) this.view.listen(this.npc, false);
            this.npc = null;
        }
    }
    return {Conversation, ListeningHold, lines};
});
