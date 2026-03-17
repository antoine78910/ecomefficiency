(function(){
    'use strict';

    // Atria changes DOM often; we detect the avatar trigger by structure instead of a single selector.
    const MAX_WAIT_MS = 15000;
    const CHECK_INTERVAL = 300;

    /**
     * Try to locate the dropdown trigger and disable it.
     */
    function disableAvatarButton(){
        // Strategy 1: New avatar container (observed)
        // <div class="relative group"> <span class="ant-avatar ..."><img alt="avatar" ... /></span> ... </div>
        const groups = Array.from(document.querySelectorAll('div.relative.group, div.group.relative, div.relative.group *')).map(n => {
            try { return n.closest && n.closest('div.relative.group, div.group.relative'); } catch { return null; }
        }).filter(Boolean);

        const candidates = [
            ...groups,
            ...Array.from(document.querySelectorAll('div.relative.group, div.group.relative'))
        ];

        // De-dup
        const uniq = [];
        for (const c of candidates) {
            if (c && !uniq.includes(c)) uniq.push(c);
        }

        let disabledAny = false;
        for (const el of uniq) {
            try {
                const hasAvatar = !!el.querySelector('span.ant-avatar img[alt="avatar"], span.ant-avatar img, span.ant-avatar');
                if (!hasAvatar) continue;
                // Heuristic: usually clickable (cursor-pointer / role=button / has hover overlay)
                const looksInteractive =
                    (el.className || '').toString().includes('cursor-pointer') ||
                    !!el.querySelector('[role="img"].anticon, span.anticon') ||
                    !!el.querySelector('div.absolute.inset-0');

                if (!looksInteractive) continue;

                el.setAttribute('aria-disabled', 'true');
                el.style.pointerEvents = 'none';
                el.style.cursor = 'not-allowed';
                el.style.filter = 'grayscale(1)';
                el.style.opacity = '0.5';

                // Also disable children (sometimes events are on inner spans)
                const inner = el.querySelectorAll('*');
                inner.forEach(ch => {
                    try {
                        ch.style.pointerEvents = 'none';
                    } catch {}
                });

                disabledAny = true;
            } catch {}
        }

        // Strategy 2 (fallback): old selector variants
        const old = document.querySelector('div.ant-dropdown-trigger.cursor-pointer, div.ant-dropdown-trigger');
        if (old) {
            old.setAttribute('aria-disabled', 'true');
            old.style.pointerEvents = 'none';
            old.style.cursor = 'not-allowed';
            old.style.filter = 'grayscale(1)';
            old.style.opacity = '0.5';
            disabledAny = true;
        }

        return disabledAny;
    }

    /**
     * Add a fixed violet square bottom-right, purely decorative / non-interactive.
     */
    function addPurpleSquare(){
        if(document.getElementById('atria-purple-square')) return;
        const box = document.createElement('div');
        box.id = 'atria-purple-square';
        Object.assign(box.style, {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '80px',
            height: '80px',
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
            zIndex: '2147483647',
            borderRadius: '4px'
        });
        document.body.appendChild(box);
    }

    function run(){
        addPurpleSquare();
        if(disableAvatarButton()) return;

        // Poll until element exists or timeout.
        const start = Date.now();
        const interval = setInterval(()=>{
            if(disableAvatarButton()){
                clearInterval(interval);
            } else if(Date.now()-start > MAX_WAIT_MS){
                clearInterval(interval);
            }
        }, CHECK_INTERVAL);
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', run);
    }else{
        run();
    }
})();
