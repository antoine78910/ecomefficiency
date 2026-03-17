// Blocks internal SPA navigation to /fr/user-center/* on Pipiads
(function() {
    'use strict';

    const BLOCKED_PATH_PREFIX = '/fr/user-center/';
    const ORIGIN = 'https://www.pipiads.com';

    function isBlockedUrl(urlLike) {
        try {
            // urlLike can be relative or absolute
            const u = new URL(urlLike, location.origin);
            return u.origin === ORIGIN && u.pathname.startsWith(BLOCKED_PATH_PREFIX);
        } catch (_) {
            return false;
        }
    }

    function isCurrentBlocked() {
        return location.origin === ORIGIN && location.pathname.startsWith(BLOCKED_PATH_PREFIX);
    }

    function preventNavigation(e) {
        if (!e) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        console.warn('[Pipiads Block] Blocked navigation to', BLOCKED_PATH_PREFIX);
    }

    // Intercept link clicks
    document.addEventListener('click', (e) => {
        const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href) return;
        // Ignore external links (target=_blank) — internal block only
        if (a.target === '_blank') return;
        if (isBlockedUrl(href)) {
            preventNavigation(e);
        }
    }, true);

    // Patch history APIs for SPA navigations
    (function patchHistory() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(state, title, url) {
            if (url && isBlockedUrl(url.toString())) {
                console.warn('[Pipiads Block] pushState blocked:', url);
                return; // ignore the navigation
            }
            return originalPushState.apply(this, arguments);
        };
        history.replaceState = function(state, title, url) {
            if (url && isBlockedUrl(url.toString())) {
                console.warn('[Pipiads Block] replaceState blocked:', url);
                return; // ignore the navigation
            }
            return originalReplaceState.apply(this, arguments);
        };

        window.addEventListener('popstate', () => {
            if (isCurrentBlocked()) {
                console.warn('[Pipiads Block] popstate into blocked path, returning to home');
                // Replace with homepage to avoid a back/forward loop
                try {
                    history.replaceState(null, '', '/');
                } catch (_) {
                    location.replace(ORIGIN + '/');
                }
            }
        }, true);
    })();

    // Safety: if page loads already on blocked path, send to home
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isCurrentBlocked()) {
                console.warn('[Pipiads Block] Initial load at blocked path, redirecting to home');
                try {
                    history.replaceState(null, '', '/');
                } catch (_) {
                    location.replace(ORIGIN + '/');
                }
            }
        });
    } else {
        if (isCurrentBlocked()) {
            console.warn('[Pipiads Block] Initial load at blocked path, redirecting to home');
            try {
                history.replaceState(null, '', '/');
            } catch (_) {
                location.replace(ORIGIN + '/');
            }
        }
    }
})();


