(() => {
    'use strict';
    function params() {return new URLSearchParams(location.hash.split('?')[1] || '');}
    function screen() {return location.hash.slice(1).split('/')[0].split('?')[0];}
    function route(tool, handler) {
        let last = '', running = false, queued = false;
        async function apply() {
            if(screen() !== tool) {last='';return;}
            if(running) {queued=true;return;}
            const hash=location.hash;if(hash===last)return;last=hash;running=true;
            try {await handler(params());} catch(error) {console.error('Toolbox navigation failed:',error.message);}
            finally {running=false;if(queued){queued=false;queueMicrotask(apply);}}
        }
        document.addEventListener('toolbox:pane',()=>queueMicrotask(apply));window.addEventListener('hashchange',()=>queueMicrotask(apply));queueMicrotask(apply);
    }
    window.ToolboxNavigation={params,screen,route};
})();
