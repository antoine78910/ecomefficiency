(function() {
  'use strict';

  if (!location.hostname.includes('fotor.com')) return;

  let popupShownForCurrentPath = false;

  function createPopup() {
    // Remove any existing popup
    const existing = document.getElementById('fotor-videos-warning-popup');
    if (existing) existing.remove();

    // We intentionally avoid adding a full-screen overlay to not interfere with the page.
    // Keep the popup lightweight (toast-like) and non-blocking.

    // Create popup container with Ecom Efficiency branding (black/violet)
    const popup = document.createElement('div');
    popup.id = 'fotor-videos-warning-popup';
    Object.assign(popup.style, {
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 10px 40px rgba(138, 43, 226, 0.4)',
      border: '2px solid #8a2be2',
      position: 'fixed',
      top: '24px',
      right: '24px',
      animation: 'fadeIn 0.3s ease-in',
      pointerEvents: 'auto', // Allow clicks on popup
      zIndex: '2147483648' // Above overlay
    });

    // Add fade-in animation
    const style = document.createElement('style');
    style.setAttribute('data-fotor-videos-warning-style', 'true');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);

    // Ecom Efficiency branding header
    const brandHeader = document.createElement('div');
    brandHeader.textContent = 'Ecom Efficiency';
    Object.assign(brandHeader.style, {
      margin: '0 0 20px 0',
      fontSize: '14px',
      fontWeight: '600',
      color: '#8a2be2',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    });
    popup.appendChild(brandHeader);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Video Generation Recommendation';
    Object.assign(title.style, {
      margin: '0 0 16px 0',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffffff'
    });
    popup.appendChild(title);

    // Message
    const message = document.createElement('p');
    message.innerHTML = 'For better quality, more options, and greater precision when generating AI videos, we recommend using <strong style="color: #8a2be2;">Higgsfield</strong> or <strong style="color: #8a2be2;">Sora</strong> instead.<br><br>Fotor\'s video generation feature is currently in beta, which means it may be less refined and can consume more credits for lower-quality results. Fotor is primarily designed for photos and images.';
    Object.assign(message.style, {
      margin: '0 0 24px 0',
      fontSize: '16px',
      lineHeight: '1.6',
      color: '#e0e0e0'
    });
    popup.appendChild(message);

    // Button container
    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.type = 'button'; // Prevent form submission
    Object.assign(closeBtn.style, {
      padding: '10px 24px',
      fontSize: '16px',
      fontWeight: '500',
      color: '#e0e0e0',
      backgroundColor: '#2a2a2a',
      border: '1px solid #444444',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      pointerEvents: 'auto', // Ensure button is clickable
      zIndex: '2147483649'
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = '#3a3a3a';
      closeBtn.style.borderColor = '#555555';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = '#2a2a2a';
      closeBtn.style.borderColor = '#444444';
    });
    function closePopup() {
      const pathKey = 'fotor_videos_popup_path_' + location.pathname;
      sessionStorage.setItem(pathKey, 'shown');
      // Remove popup
      try { popup.remove(); } catch(_) {}
      // Remove style tag we injected if still present
      try {
        const styleEl = document.querySelector('style[data-fotor-videos-warning-style="true"]');
        if (styleEl) styleEl.remove();
      } catch(_) {}
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
    });

    // Go to Higgsfield button (violet accent)
    const higgsfieldBtn = document.createElement('button');
    higgsfieldBtn.textContent = 'Go to Higgsfield';
    higgsfieldBtn.type = 'button'; // Prevent form submission
    Object.assign(higgsfieldBtn.style, {
      padding: '10px 24px',
      fontSize: '16px',
      fontWeight: '500',
      color: '#ffffff',
      backgroundColor: '#8a2be2',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)',
      pointerEvents: 'auto', // Ensure button is clickable
      zIndex: '2147483649'
    });
    higgsfieldBtn.addEventListener('mouseenter', () => {
      higgsfieldBtn.style.backgroundColor = '#7b1fb8';
      higgsfieldBtn.style.boxShadow = '0 6px 16px rgba(138, 43, 226, 0.4)';
    });
    higgsfieldBtn.addEventListener('mouseleave', () => {
      higgsfieldBtn.style.backgroundColor = '#8a2be2';
      higgsfieldBtn.style.boxShadow = '0 4px 12px rgba(138, 43, 226, 0.3)';
    });
    higgsfieldBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open('https://higgsfield.ai/', '_blank');
      // Keep popup open; do not close or change overflow
    });

    // Go to Sora button
    const soraBtn = document.createElement('button');
    soraBtn.textContent = 'Go to Sora';
    soraBtn.type = 'button';
    Object.assign(soraBtn.style, {
      padding: '10px 24px',
      fontSize: '16px',
      fontWeight: '500',
      color: '#ffffff',
      backgroundColor: '#5a67d8', // indigo tone to differentiate
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(90, 103, 216, 0.3)',
      pointerEvents: 'auto',
      zIndex: '2147483649'
    });
    soraBtn.addEventListener('mouseenter', () => {
      soraBtn.style.backgroundColor = '#4c51bf';
      soraBtn.style.boxShadow = '0 6px 16px rgba(90, 103, 216, 0.4)';
    });
    soraBtn.addEventListener('mouseleave', () => {
      soraBtn.style.backgroundColor = '#5a67d8';
      soraBtn.style.boxShadow = '0 4px 12px rgba(90, 103, 216, 0.3)';
    });
    soraBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open('https://sora.chatgpt.com/explore', '_blank');
      // Keep popup open; do not close or change overflow
    });

    buttonContainer.appendChild(closeBtn);
    buttonContainer.appendChild(higgsfieldBtn);
    buttonContainer.appendChild(soraBtn);
    popup.appendChild(buttonContainer);

    // Prevent clicks on popup from bubbling into underlying app handlers
    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // No overlay click handler (we don't insert any overlay)

    // Close on Escape key
    function handleEscape(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closePopup();
        document.removeEventListener('keydown', handleEscape);
      }
    }
    document.addEventListener('keydown', handleEscape);

    // Append only the popup so the page remains fully interactive
    document.body.appendChild(popup);
  }

  function checkAndShowPopup() {
    // Check if we're on videos page
    if (!location.pathname.includes('/videos')) {
      popupShownForCurrentPath = false;
      return;
    }

    // Check if popup already shown for current path
    const pathKey = 'fotor_videos_popup_path_' + location.pathname;
    if (sessionStorage.getItem(pathKey) === 'shown') {
      return;
    }

    // Wait for body to be ready
    if (!document.body) {
      setTimeout(checkAndShowPopup, 100);
      return;
    }

    // Show popup
    popupShownForCurrentPath = true;
    sessionStorage.setItem(pathKey, 'shown');
    createPopup();
  }

  // Check immediately
  checkAndShowPopup();

  // Also check on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowPopup);
  }

  // Monitor URL changes for SPA navigation
  let lastPath = location.pathname;
  
  // Check on popstate (back/forward)
  window.addEventListener('popstate', () => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      popupShownForCurrentPath = false;
      setTimeout(checkAndShowPopup, 100);
    }
  });

  // Avoid patching history APIs to reduce the risk of breaking the site.

  // Also monitor URL changes periodically
  const urlPollInterval = setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      popupShownForCurrentPath = false;
      checkAndShowPopup();
    }
  }, 400);
})();

