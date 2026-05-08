(function() {
	'use strict';

	console.log('[Pipiads Credits] Script started');

	// Refill mensuel: chaque 15 du mois à 12:00 (heure locale)
	function getNextRefillTime() {
		const now = new Date();
		let nextRefillDate = new Date(
			now.getFullYear(),
			now.getMonth(),
			15,
			12, 0, 0, 0
		);
		if (now >= nextRefillDate) {
			nextRefillDate = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				15,
				12, 0, 0, 0
			);
		}
		const timeUntilRefill = nextRefillDate.getTime() - now.getTime();
		const days = Math.floor(timeUntilRefill / (1000 * 60 * 60 * 24));
		const hours = Math.floor((timeUntilRefill % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((timeUntilRefill % (1000 * 60 * 60)) / (1000 * 60));
		return { days, hours, minutes };
	}

	function createCustomNotification() {
		if (document.getElementById('pipiads-custom-credits-notif')) {
			console.log('[Pipiads Credits] Custom notification already exists');
			return;
		}

		const timeUntilRefill = getNextRefillTime();
		console.log('[Pipiads Credits] Time until next refill:', timeUntilRefill);

		let timerText = '';
		if (timeUntilRefill.days > 0) {
			timerText = `${timeUntilRefill.days}d ${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
		} else {
			timerText = `${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
		}

		const notifDiv = document.createElement('div');
		notifDiv.id = 'pipiads-custom-credits-notif';
		notifDiv.style.cssText = `
			position: fixed;
			top: 100px;
			right: 20px;
			width: 360px;
			background: #1a1a2e;
			border-radius: 12px;
			padding: 24px;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
			border: 1px solid rgba(138, 43, 226, 0.4);
			z-index: 999999;
			color: white;
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			animation: slideIn 0.3s ease-out;
		`;

		notifDiv.innerHTML = `
			<style>
				@keyframes slideIn {
					from { transform: translateX(100px); opacity: 0; }
					to { transform: translateX(0); opacity: 1; }
				}
				#pipiads-custom-credits-notif .close-btn {
					position: absolute;
					top: 12px;
					right: 12px;
					background: transparent;
					border: 1px solid rgba(138, 43, 226, 0.3);
					color: rgba(138, 43, 226, 0.8);
					width: 28px;
					height: 28px;
					border-radius: 6px;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: all 0.2s ease;
					font-size: 18px;
					font-weight: 600;
				}
				#pipiads-custom-credits-notif .close-btn:hover {
					background: rgba(138, 43, 226, 0.15);
					border-color: rgba(138, 43, 226, 0.6);
					color: rgba(138, 43, 226, 1);
				}
				#pipiads-custom-credits-notif .timer {
					font-size: 42px;
					font-weight: 700;
					margin: 15px 0;
					color: #a78bfa;
				}
				#pipiads-custom-credits-notif .label {
					font-size: 13px;
					opacity: 0.7;
					margin-bottom: 8px;
					letter-spacing: 0.3px;
					text-transform: uppercase;
					font-size: 11px;
				}
				#pipiads-custom-credits-notif .subtext {
					font-size: 12px;
					opacity: 0.7;
					margin-top: -8px;
					margin-bottom: 8px;
					text-align: left;
				}

			</style>

			<button class="close-btn" id="close-pipiads-credits-notif" title="Close">×</button>

			<div style="font-size: 24px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
				<span style="font-size: 28px;">⚠️</span>
				<span>No More Credits</span>
			</div>

			<div class="label">Next refill in</div>
			<div class="timer">${timerText}</div>
			<div class="subtext">the 15th</div>


		`;

		document.body.appendChild(notifDiv);
		console.log('[Pipiads Credits] Custom notification created');

		const closeBtn = document.getElementById('close-pipiads-credits-notif');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				console.log('[Pipiads Credits] Notification dismissed');
				notifDiv.style.animation = 'slideIn 0.3s ease-in reverse';
				setTimeout(() => {
					notifDiv.remove();
					console.log('[Pipiads Credits] Notification closed');
				}, 300);
			});
		}
	}

	function removeCustomNotification() {
		const notif = document.getElementById('pipiads-custom-credits-notif');
		if (notif) {
			try { notif.remove(); } catch (_) {}
			console.log('[Pipiads Credits] Existing notification removed (sufficient credits)');
		}
	}

	function findCreditElement() {
		// 1) Cibles directes connues
		let el = document.querySelector('a.link-credit[href*="/user-center/subscription"]');
		if (el) return el;
		el = document.querySelector('a.link-credit');
		if (el) return el;
		el = document.querySelector('[class*="link-credit"]');
		if (el) return el;

		// 2) Liens/subscription génériques
		el = document.querySelector('a[href*="/user-center/subscription"], a[href*="/subscription"]');
		if (el) return el;

		// 3) Eléments avec classe contenant "credit"
		el = document.querySelector('[class*="credit"], [class*="Credit"]');
		if (el) return el;

		// 4) Fallback: scanner des noeuds texte pour "credit|crédit" + chiffres
		const candidates = Array.from(document.querySelectorAll('a, span, div')).slice(0, 400);
		for (const node of candidates) {
			const text = (node.textContent || '').trim();
			if (!text) continue;
			if (/\d/.test(text) && /cr[eé]dit/i.test(text)) {
				return node;
			}
		}
		return null;
	}

	function extractCreditsFromText(text) {
		const digitsOnly = text.replace(/[^0-9]/g, '');
		if (!digitsOnly) return null;
		const credits = parseInt(digitsOnly, 10);
		return Number.isFinite(credits) ? credits : null;
	}

	function checkCredits() {
		const creditEl = findCreditElement();
		if (!creditEl) {
			console.log('[Pipiads Credits] Credit element not found (yet)');
			return false;
		}
		const creditText = (creditEl.textContent || '').trim();
		console.log('[Pipiads Credits] Credit text found:', creditText);
		const digitsOnly = creditText.replace(/[^0-9]/g, '');
		if (!digitsOnly) {
			console.log('[Pipiads Credits] Could not parse credit number');
			return false;
		}
		const credits = parseInt(digitsOnly, 10);
		if (!isFinite(credits)) {
			console.log('[Pipiads Credits] Parsed credits is not a finite number');
			return false;
		}
		console.log('[Pipiads Credits] Current credits (parsed):', credits);
		if (credits < 100) {
			console.log('[Pipiads Credits] Low credits detected (<100)!');
			createCustomNotification();
			return true;
		} else {
			console.log('[Pipiads Credits] Credits are sufficient (>=100), ensuring no popup');
			removeCustomNotification();
		}
		return false;
	}

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.addedNodes.length > 0) {
				setTimeout(() => {
					checkCredits();
				}, 500);
				break;
			}
		}
	});

	function startObserving() {
		if (document.body) {
			observer.observe(document.body, { childList: true, subtree: true });
			console.log('[Pipiads Credits] Observer started');
			setTimeout(() => { checkCredits(); }, 2000);
			setInterval(() => { checkCredits(); }, 3000);
		} else {
			setTimeout(startObserving, 100);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', startObserving);
	} else {
		startObserving();
	}

	console.log('[Pipiads Credits] Initialization complete');
})();


