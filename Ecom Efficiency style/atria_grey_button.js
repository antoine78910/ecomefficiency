(function() {
    'use strict';

    if (!location.hostname.endsWith('tryatria.com')) return;

    function isTargetCard(el) {
        try {
            if (!el || el.tagName !== 'DIV') return false;
            const cl = el.classList;
            // Match key Tailwind classes from the snippet
            const needed = [
                'rounded-md', 'border', 'border-solid', 'bg-white/10',
                'flex', 'flex-col', 'items-center', 'justify-center', 'py-1.5', 'cursor-pointer'
            ];
            for (let i = 0; i < needed.length; i++) {
                if (!cl.contains(needed[i])) return false;
            }
            // Heuristic: contains an icon span and a numeric counter span
            const hasIcon = !!el.querySelector('span.anticon, [role="img"].anticon');
            const hasCount = Array.from(el.querySelectorAll('span')).some(function(s){
                const t = (s.textContent || '').trim();
                return /\d[\d,.\s]*/.test(t) && (s.className || '').includes('text');
            });
            // Also target the Invite card (user-add icon or "Invite" text)
            const hasUserAddIcon = !!el.querySelector('.anticon-user-add');
            const hasInviteText = Array.from(el.querySelectorAll('span,div')).some(function(s){
                const tx = (s.textContent || '').trim().toLowerCase();
                return tx === 'invite';
            });
            const isInvite = hasUserAddIcon || hasInviteText;
            return (hasIcon && hasCount) || isInvite;
        } catch(_) { return false; }
    }

    function greyOut(el) {
        try {
            el.setAttribute('aria-disabled', 'true');
            el.style.pointerEvents = 'none';
            el.style.cursor = 'not-allowed';
            el.style.filter = 'grayscale(1)';
            el.style.opacity = '0.5';
        } catch(_) {}
    }

    function processOnce(root) {
        const candidates = (root || document).querySelectorAll('div');
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            if (isTargetCard(el)) greyOut(el);
        }
    }

    // Initial pass
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ processOnce(document); });
    } else {
        processOnce(document);
    }

    // Observe DOM changes (SPA)
    const mo = new MutationObserver(function(muts){
        for (let i = 0; i < muts.length; i++) {
            const m = muts[i];
            for (let j = 0; j < m.addedNodes.length; j++) {
                const n = m.addedNodes[j];
                if (!(n instanceof Element)) continue;
                if (isTargetCard(n)) greyOut(n);
                processOnce(n);
            }
        }
    });
    try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(_) {}
})();


