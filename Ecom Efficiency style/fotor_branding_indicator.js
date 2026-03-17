(function() {
  'use strict';

  if (!location.hostname.includes('fotor.com')) return;

  function createBrandingIndicator() {
    // Remove existing indicator if any
    const existing = document.getElementById('ecom-efficiency-fotor-indicator');
    if (existing) existing.remove();

    // Create the circle indicator
    const indicator = document.createElement('div');
    indicator.id = 'ecom-efficiency-fotor-indicator';
    
    Object.assign(indicator.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: '#8a2be2',
      border: '2px solid #ffffff',
      boxShadow: '0 2px 8px rgba(138, 43, 226, 0.5)',
      zIndex: '2147483647',
      pointerEvents: 'none', // Not clickable
      cursor: 'default',
      transition: 'opacity 0.3s ease'
    });

    // Add to document
    if (document.body) {
      document.body.appendChild(indicator);
    } else {
      // Wait for body to be available
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          document.body.appendChild(indicator);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  // Create indicator with multiple attempts
  function ensureIndicator() {
    if (!document.getElementById('ecom-efficiency-fotor-indicator')) {
      createBrandingIndicator();
    }
  }

  // Try immediately
  ensureIndicator();

  // Try on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureIndicator);
  } else {
    ensureIndicator();
  }

  // Periodic check to ensure it's always there
  setInterval(ensureIndicator, 500);

  // Recreate if body is replaced (SPA navigation)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('ecom-efficiency-fotor-indicator') && document.body) {
      createBrandingIndicator();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();


