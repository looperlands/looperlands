define(function () {
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
    return ListeningHold;
});
