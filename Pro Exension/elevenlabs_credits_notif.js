(function() {
	'use strict';

	// Log toujours en console pour debug
	function log(...args) {
		console.log('[ElevenLabs Credits]', ...args);
	}

	log('Script started');

	// Refill mensuel: chaque 15 du mois à 12:00 (heure locale)
	function getNextRefillTime() {
		const now = new Date();
		let nextRefillDate = new Date(now.getFullYear(), now.getMonth(), 15, 12, 0, 0, 0);
		if (now >= nextRefillDate) {
			nextRefillDate = new Date(now.getFullYear(), now.getMonth() + 1, 15, 12, 0, 0, 0);
		}
		const timeUntilRefill = nextRefillDate.getTime() - now.getTime();
		const days = Math.floor(timeUntilRefill / (1000 * 60 * 60 * 24));
		const hours = Math.floor((timeUntilRefill % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((timeUntilRefill % (1000 * 60 * 60)) / (1000 * 60));
		return { days, hours, minutes };
	}

	const HIGH_USAGE_PERCENT_THRESHOLD = 100;
	const CONFIRM_SAME_VALUE_TIMES = 2;
	const CONFIRM_WINDOW_MS = 8000;

	let __candidate = null;
	function isConfirmedDetection(value) {
		const t = Date.now();
		const v = Number(value);
		if (!isFinite(v)) return false;
		if (!__candidate || __candidate.value !== v || (t - __candidate.firstAt) > CONFIRM_WINDOW_MS) {
			__candidate = { value: v, firstAt: t, lastAt: t, count: 1 };
			return false;
		}
		__candidate.lastAt = t;
		__candidate.count += 1;
		return __candidate.count >= CONFIRM_SAME_VALUE_TIMES;
	}

	// Cible exacte: button[data-testid="user-menu-button"] (ElevenLabs)
	// À l'intérieur: divs [role="progressbar"][aria-valuenow] — le max = % utilisé. Si >= 100% → plus de crédits.
	// Si un descendant contient juste "!" → indicateur "plus de crédits".
	function getProfileButton() {
		return document.querySelector('button[data-testid="user-menu-button"]') ||
			document.querySelector('button[aria-label="Your profile"]') ||
			document.querySelector('button[aria-label="Votre profil"]');
	}

	// Hover sur le bouton profil pour que les rings soient visibles / hydratés
	function hoverProfileButton(btn) {
		if (!btn || !btn.getBoundingClientRect) return;
		const r = btn.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) return;
		const x = r.left + r.width / 2;
		const y = r.top + r.height / 2;
		const ev = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
		btn.dispatchEvent(new MouseEvent('mouseover', ev));
		btn.dispatchEvent(new MouseEvent('mouseenter', ev));
		btn.dispatchEvent(new PointerEvent('pointerover', { ...ev, pointerType: 'mouse' }));
		btn.dispatchEvent(new PointerEvent('pointerenter', { ...ev, pointerType: 'mouse' }));
		btn.dispatchEvent(new MouseEvent('mousemove', ev));
	}

	// Détecte le "!" = plus de crédits (div avec juste "!" au centre du bouton)
	function hasNoCreditsExclamation(btn) {
		if (!btn) return false;
		// Cible: div.rounded-full... avec contenu texte "!" (avatar remplacé par !)
		const divs = btn.querySelectorAll('div.rounded-full, div[class*="rounded-full"]');
		for (const d of divs) {
			const t = (d.textContent || '').trim();
			if (t === '!') return true;
		}
		// Tout noeud dont le texte complet = "!"
		const all = btn.getElementsByTagName('*');
		for (const el of all) {
			const t = (el.textContent || '').trim();
			if (t === '!' && t.length === 1) return true;
		}
		return false;
	}

	// Lit le % d'usage depuis les [role="progressbar"][aria-valuenow] DANS le bouton profil
	function getUsagePercentFromProfileButton(btn) {
		if (!btn) return null;
		let maxPercent = null;
		const bars = btn.querySelectorAll('[role="progressbar"][aria-valuenow]');
		for (const bar of bars) {
			const now = bar.getAttribute('aria-valuenow');
			if (now === null || now === '') continue;
			const n = Number(now);
			if (isFinite(n) && n >= 0 && n <= 100) {
				maxPercent = maxPercent === null ? n : Math.max(maxPercent, n);
			}
		}
		return maxPercent;
	}

	// Combine: hover sur le bouton puis lire le % (rings dans le DOM)
	function getCreditsPercentFromUserMenuButton() {
		const btn = getProfileButton();
		if (!btn) return null;
		hoverProfileButton(btn);
		// Lecture immédiate: les [role="progressbar"][aria-valuenow] sont dans le bouton
		let percent = getUsagePercentFromProfileButton(btn);
		if (percent !== null) return percent;
		// Certaines UIs mettent à jour les rings après le hover → on relit après un délai
		// (on ne peut pas attendre ici en sync, donc on retourne null et le polling rappellera)
		return null;
	}

	// Retourne true si le bouton profil affiche "!" (plus de crédits)
	function isNoCreditsExclamationVisible() {
		const btn = getProfileButton();
		if (!btn) return false;
		hoverProfileButton(btn);
		return hasNoCreditsExclamation(btn);
	}

	// Lecture du pourcentage depuis le texte "X%" n'importe où dans le header / en-tête
	function getPercentFromText() {
		try {
			const header = document.querySelector('header') || document.querySelector('nav') || document.body;
			const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT, null, false);
			const textNodes = [];
			let n;
			while ((n = walker.nextNode())) textNodes.push(n);
			const fullText = textNodes.map(t => t.textContent).join(' ');
			const m = fullText.match(/(\d+(?:\.\d+)?)\s*%/g);
			if (m) {
				let max = 0;
				for (const s of m) {
					const v = parseFloat(s);
					if (isFinite(v) && v >= 0 && v <= 100) max = Math.max(max, v);
				}
				return max > 0 ? max : null;
			}
		} catch (_) {}
		return null;
	}

	function getCreditsFromPageText() {
		try {
			const bodyText = (document.body && document.body.textContent) || '';
			const m = bodyText.match(/(?:credits?|characters?)\s*[:\s]*([\d,.\s]+)/i) ||
				bodyText.match(/([\d,.\s]+)\s*(?:credits?|characters?)\s*(?:left|remaining)?/i);
			if (m) {
				const num = parseInt(String(m[1]).replace(/[^0-9]/g, ''), 10);
				if (Number.isFinite(num)) return { remainingCredits: num };
			}
		} catch (_) {}
		return null;
	}

	const LOW_OR_NO_CREDITS_PHRASES = [
		'low credits', 'no credits', 'no more credits', 'out of credits',
		'you\'re out of credits', 'you have no credits', '0 credits',
		'not enough credits', 'insufficient credits', 'add more characters', 'out of characters',
		'low characters', 'no characters', '0 characters', '0 character'
	];

	function isLowCreditsBannerVisible() {
		// Disabled to avoid false positives from generic page text.
		// We now rely on strict signals only (profile "!" or confirmed 100% usage).
		return false;
	}

	function createCustomNotification(remainingCredits, remainingPercent) {
		if (document.getElementById('elevenlabs-custom-credits-notif')) return;

		const timeUntilRefill = getNextRefillTime();
		let timerText = timeUntilRefill.days > 0
			? `${timeUntilRefill.days}d ${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`
			: `${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;

		let extraLine = '';
		if (remainingPercent != null || (remainingCredits != null && isFinite(remainingCredits))) {
			const parts = [];
			if (remainingPercent != null) parts.push(`Remaining: ${remainingPercent}%`);
			if (remainingCredits != null && isFinite(remainingCredits)) parts.push(`Credits: ${remainingCredits}`);
			if (parts.length) extraLine = `<div class="extra-line">${parts.join(' · ')}</div>`;
		}

		const notifDiv = document.createElement('div');
		notifDiv.id = 'elevenlabs-custom-credits-notif';
		notifDiv.style.cssText = `
			position: fixed;
			top: 20px;
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
				#elevenlabs-custom-credits-notif .close-btn {
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
				#elevenlabs-custom-credits-notif .close-btn:hover {
					background: rgba(138, 43, 226, 0.15);
					border-color: rgba(138, 43, 226, 0.6);
					color: rgba(138, 43, 226, 1);
				}
				#elevenlabs-custom-credits-notif .timer { font-size: 42px; font-weight: 700; margin: 15px 0; color: #a78bfa; }
				#elevenlabs-custom-credits-notif .label { font-size: 11px; opacity: 0.7; margin-bottom: 8px; letter-spacing: 0.3px; text-transform: uppercase; }
				#elevenlabs-custom-credits-notif .subtext { font-size: 12px; opacity: 0.7; margin-top: -8px; margin-bottom: 8px; text-align: left; }
				#elevenlabs-custom-credits-notif .extra-line { font-size: 12px; opacity: 0.85; margin-bottom: 10px; }
			</style>
			<button class="close-btn" id="close-credits-notif" title="Close">×</button>
			<div style="font-size: 24px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
				<span style="font-size: 28px;">⚠️</span>
				<span>No More Credits</span>
			</div>
			${extraLine}
			<div class="label">Next refill in</div>
			<div class="timer">${timerText}</div>
			<div class="subtext">the 15th</div>
		`;

		document.body.appendChild(notifDiv);
		log('Popup shown');

		const closeBtn = document.getElementById('close-credits-notif');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				notifDiv.style.animation = 'slideIn 0.3s ease-in reverse';
				setTimeout(() => {
					notifDiv.remove();
					_popupAlreadyShownThisSession = false; // permet de réafficher plus tard si besoin
				}, 300);
			});
		}
	}

	function removeCustomNotification() {
		const notif = document.getElementById('elevenlabs-custom-credits-notif');
		if (notif) {
			try { notif.remove(); } catch (_) {}
		}
	}

	let _lastLog = 0;
	let _popupAlreadyShownThisSession = false;

	function detectLowCreditsNotification() {
		const btn = getProfileButton();
		const hasExclamation = btn && isNoCreditsExclamationVisible();

		// 1) Indicateur "!" = plus de crédits
		if (hasExclamation) {
			if (!_popupAlreadyShownThisSession) {
				log('No-credits "!" detected -> showing popup');
				_popupAlreadyShownThisSession = true;
			}
			createCustomNotification(null, 100);
			return true;
		}

		// 2) Pourcentage d'usage dans le bouton profil
		const percent = getCreditsPercentFromUserMenuButton();
		if (percent !== null && isFinite(percent)) {
			if (Date.now() - _lastLog > 6000) {
				log('Profile button usage:', percent + '%');
				_lastLog = Date.now();
			}
			const p = Math.round(Number(percent) * 10) / 10;
			if (p >= HIGH_USAGE_PERCENT_THRESHOLD) {
				if (isConfirmedDetection(p)) {
					let remainingCredits = null;
					try {
						const info = getCreditsFromPageText();
						if (info && isFinite(info.remainingCredits)) remainingCredits = Number(info.remainingCredits);
					} catch (_) {}
					// Strict guard: if we can parse remaining credits, only alert when it's truly zero.
					if (remainingCredits !== null && remainingCredits > 0) {
						_popupAlreadyShownThisSession = false;
						removeCustomNotification();
						return false;
					}
					if (!_popupAlreadyShownThisSession) {
						log('High usage confirmed -> showing popup', p + '%');
						_popupAlreadyShownThisSession = true;
					}
					createCustomNotification(remainingCredits, p);
					return true;
				}
				return false;
			}
			// Crédits OK: on peut retirer le popup et autoriser un nouvel affichage plus tard
			if (p < HIGH_USAGE_PERCENT_THRESHOLD) {
				_popupAlreadyShownThisSession = false;
				removeCustomNotification();
			}
			return false;
		}

		// Ne retirer que si on a la preuve que les crédits sont OK (percent < 100), pas à chaque tour
		// Sinon on laisse le popup affiché (évite le clignotement)
		return false;
	}

	const observer = new MutationObserver(() => {
		setTimeout(detectLowCreditsNotification, 150);
	});

	function startObserving() {
		if (!document.body) {
			setTimeout(startObserving, 100);
			return;
		}
		observer.observe(document.body, { childList: true, subtree: true });
		// Premier check après 2s (laisser l'app charger)
		setTimeout(() => {
			detectLowCreditsNotification();
		}, 2000);
		// Polling rapide au début
		let tries = 0;
		const fast = setInterval(() => {
			tries++;
			detectLowCreditsNotification();
			if (tries >= 60) clearInterval(fast);
		}, 500);
		// Polling long
		setInterval(() => {
			try { detectLowCreditsNotification(); } catch (e) {}
		}, 3000);
		log('Observer + polling started');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', startObserving);
	} else {
		startObserving();
	}

	log('Initialization complete');
})();
