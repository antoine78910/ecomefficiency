// Greys out and disables interaction with selected Pipiads header items:
// - user dropdown/menu block
// - pricing link (/pricing)
// - collections link (/my-collections)
// - external API link (https://www.pipispy.com/)
// - credits link (/user-center/subscription)
(function() {
    'use strict';

    function applyGrey(el) {
        if (!el || el.dataset._pipiadsGrey === '1') return;
        el.style.filter = 'grayscale(100%)';
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none'; // fully disable interaction
        el.style.userSelect = 'none';
        try { el.setAttribute('aria-disabled', 'true'); } catch (_) {}
        try { el.setAttribute('tabindex', '-1'); } catch (_) {}
        el.dataset._pipiadsGrey = '1';
    }

    const DISABLED_LINK_SELECTORS = [
        'a[href="/pricing"]',
        'a[href="/my-collections"]',
        'a[href="https://www.pipispy.com/"]',
        // Credits link (both EN + FR variants)
        'a[href="/user-center/subscription"]',
        'a[href="/fr/user-center/subscription"]',
        // Fallback by class
        'a.link-credit',
        'a[class*="link-credit"]'
    ];

    function disableHeaderLinks() {
        let changed = false;
        for (const sel of DISABLED_LINK_SELECTORS) {
            const nodes = Array.from(document.querySelectorAll(sel));
            for (const n of nodes) {
                if (!n) continue;
                applyGrey(n);
                changed = true;
            }
        }
        return changed;
    }

    function installCaptureBlockerOnce() {
        if (window.__eePipiadsNavBlockInstalled) return;
        window.__eePipiadsNavBlockInstalled = true;

        const shouldBlock = (target) => {
            try {
                if (!target || !target.closest) return false;
                // Block profile dropdown + the selected nav links (even if site re-enables handlers)
                if (target.closest('div.pp-dropdown.user-box')) return true;
                for (const sel of DISABLED_LINK_SELECTORS) {
                    if (target.closest(sel)) return true;
                }
            } catch (_) {}
            return false;
        };

        const block = (e) => {
            try {
                if (!shouldBlock(e && e.target)) return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            } catch (_) {}
        };

        ['click','mousedown','mouseup','pointerdown','pointerup','touchstart','touchend','contextmenu','keydown']
            .forEach((evt) => document.addEventListener(evt, block, true));
    }

    function greyTargets() {
        let changed = false;

        // Grey the whole user box if present
        const userBox = document.querySelector('div.pp-dropdown.user-box');
        if (userBox) {
            applyGrey(userBox);
            changed = true;
        }

        // Grey the dropdown content block as a fallback
        const dropdown = document.querySelector('div.menu-dropdown.user-info-drop');
        if (dropdown) {
            applyGrey(dropdown);
            changed = true;
        }

        // Grey the inner menu list if present
        const mainList = document.querySelector('ul.menu-dropdown__main.userCenterDrop');
        if (mainList) {
            applyGrey(mainList);
            changed = true;
        }

        // Disable the pricing/collections/api/credits links in the header/menu
        if (disableHeaderLinks()) changed = true;

        return changed;
    }

    function start() {
        installCaptureBlockerOnce();
        greyTargets();
        const obs = new MutationObserver(() => {
            greyTargets();
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();


