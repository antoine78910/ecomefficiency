(function() {
	'use strict';

	if (!location.hostname.includes('midjourney.com')) return;

	function shouldBlockPath(pathname) {
		if (typeof pathname !== 'string') return false;
		return pathname.startsWith('/profile-settings') || pathname.startsWith('/account');
	}

	function redirectToSafe() {
		try {
			if (window.stop) window.stop();
		} catch (_) {}
		const safeUrl = 'https://www.midjourney.com/explore';
		try {
			window.location.replace(safeUrl);
		} catch (_) {
			window.location.href = safeUrl;
		}
	}

	function handleRoute() {
		try {
			const path = location.pathname || '';
			if (shouldBlockPath(path)) {
				redirectToSafe();
				return true;
			}
		} catch(_) {}
		return false;
	}

	// Block immediately at start
	if (handleRoute()) return;

	// Intercept clicks on links that would navigate to blocked paths
	document.addEventListener('click', function(e) {
		try {
			const link = e.target && e.target.closest && e.target.closest('a[href]');
			if (!link) return;
			const href = link.getAttribute('href') || '';
			if (!href) return;
			// Support relative and absolute URLs
			let path = '';
			try {
				const urlObj = new URL(href, location.origin);
				if (urlObj.hostname && !urlObj.hostname.includes('midjourney.com')) return;
				path = urlObj.pathname || '';
			} catch (_) {
				path = href;
			}
			if (shouldBlockPath(path)) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				redirectToSafe();
				return false;
			}
		} catch(_) {}
	}, true);

	// Observe popstate and hash changes
	window.addEventListener('popstate', handleRoute, true);
	window.addEventListener('hashchange', handleRoute, true);

	// Periodic check for SPA changes
	setInterval(handleRoute, 300);

	// Grey-out and disable the account button
	function disableAccountButton(root) {
		try {
			// Ensure a strong CSS override against Tailwind classes
			const styleId = 'midjourney-account-disable-style';
			if (!document.getElementById(styleId)) {
				const style = document.createElement('style');
				style.id = styleId;
				style.textContent = `
					/* Button itself */
					#accountButton,
					button#accountButton,
					button[title="Account"],
					/* HeadlessUI dynamic menu button and wrappers */
					[id^="headlessui-menu-button-"].dropdownButton {
						pointer-events: none !important;
						cursor: not-allowed !important;
						filter: grayscale(1) !important;
						opacity: 0.6 !important;
						user-select: none !important;
					}
				`;
				document.head.appendChild(style);
			}

			const candidates = (root || document).querySelectorAll(
				'#accountButton, button#accountButton, button[title="Account"], ' +
				'[id^="headlessui-menu-button-"].dropdownButton'
			);
			for (let i = 0; i < candidates.length; i++) {
				const btn = candidates[i];
				btn.setAttribute('aria-disabled', 'true');
				btn.style.pointerEvents = 'none';
				btn.style.cursor = 'not-allowed';
				btn.style.filter = 'grayscale(1)';
				btn.style.opacity = '0.6';
				btn.style.userSelect = 'none';
				// Also disable the nearest visual wrapper if present
				const wrap = btn.closest('.buttonActiveRing') || btn.closest('.dropdownButton');
				if (wrap && wrap !== btn) {
					try {
						wrap.style.pointerEvents = 'none';
						wrap.style.cursor = 'not-allowed';
						wrap.style.filter = 'grayscale(1)';
						wrap.style.opacity = '0.6';
						wrap.style.userSelect = 'none';
					} catch(_) {}
				}
				// Defensive: block events
				const block = function(ev) {
					ev.preventDefault();
					ev.stopPropagation();
					ev.stopImmediatePropagation();
					return false;
				};
				btn.addEventListener('click', block, true);
				btn.addEventListener('mousedown', block, true);
				btn.addEventListener('keydown', block, true);
				if (wrap) {
					wrap.addEventListener('click', block, true);
					wrap.addEventListener('mousedown', block, true);
					wrap.addEventListener('keydown', block, true);
				}
			}
		} catch(_) {}
	}

	function initDisable() {
		disableAccountButton(document);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initDisable);
	} else {
		initDisable();
	}

	// Mutation observer to keep it disabled in SPA updates
	try {
		const mo = new MutationObserver(function(mutations) {
			for (let i = 0; i < mutations.length; i++) {
				const m = mutations[i];
				for (let j = 0; j < m.addedNodes.length; j++) {
					const n = m.addedNodes[j];
					if (n && n.querySelectorAll) {
						disableAccountButton(n);
					}
				}
			}
			disableAccountButton(document);
		});
		mo.observe(document.documentElement, { childList: true, subtree: true });
	} catch(_) {}
})();


