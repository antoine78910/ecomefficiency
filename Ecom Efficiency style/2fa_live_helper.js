/**
 * Helper script for 2fa.live integration
 * This content script is injected into 2fa.live to help automate code generation
 */

(function() {
  'use strict';
  
  console.log('[2FA-LIVE-HELPER] Script loaded');
  
  // Listen for messages from the parent extension
  window.addEventListener('message', function(event) {
    // Only accept messages from trusted origins
    if (event.origin !== window.location.origin) return;
    
    const { type, secret } = event.data;
    
    if (type === 'FILL_SECRET') {
      console.log('[2FA-LIVE-HELPER] Received secret, filling form...');
      fillSecretAndGenerate(secret);
    } else if (type === 'GET_CODE') {
      console.log('[2FA-LIVE-HELPER] Requested code extraction...');
      const code = extractCode();
      window.parent.postMessage({
        type: 'CODE_RESULT',
        code: code
      }, '*');
    }
  });
  
  // Also expose functions globally for direct access from popup
  window.__2fa_helper = {
    fillSecret: fillSecretAndGenerate,
    getCode: extractCode
  };
  
  function fillSecretAndGenerate(secret) {
    try {
      // Find the secret input textarea
      const secretInput = document.querySelector('textarea#listToken');
      if (!secretInput) {
        console.error('[2FA-LIVE-HELPER] Secret input not found');
        return false;
      }
      
      console.log('[2FA-LIVE-HELPER] Found secret input, filling...');
      
      // Fill the secret
      secretInput.value = secret;
      secretInput.dispatchEvent(new Event('input', { bubbles: true }));
      secretInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Try to find and click submit button
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) {
        console.log('[2FA-LIVE-HELPER] Clicking submit button...');
        submitBtn.click();
      } else {
        console.log('[2FA-LIVE-HELPER] No submit button found, code should generate automatically');
      }
      
      // Signal that we're ready
      window.postMessage({ type: 'SECRET_FILLED' }, window.location.origin);
      
      return true;
    } catch (error) {
      console.error('[2FA-LIVE-HELPER] Error filling secret:', error);
      return false;
    }
  }
  
  function extractCode() {
    try {
      // Find the output textarea
      const outputTextarea = document.querySelector('textarea#output');
      if (!outputTextarea || !outputTextarea.value) {
        console.error('[2FA-LIVE-HELPER] Output not found or empty');
        return null;
      }
      
      const outputValue = outputTextarea.value.trim();
      console.log('[2FA-LIVE-HELPER] Raw output:', outputValue);
      
      // Extract code after | character
      let code = '';
      if (outputValue.includes('|')) {
        const parts = outputValue.split('|');
        code = parts[1].trim();
      } else {
        code = outputValue;
      }
      
      // Clean up the code (remove any spaces or special characters)
      code = code.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      
      console.log('[2FA-LIVE-HELPER] Extracted code:', code);
      
      return code;
    } catch (error) {
      console.error('[2FA-LIVE-HELPER] Error extracting code:', error);
      return null;
    }
  }
  
  // Auto-detect when code is generated and notify
  const observer = new MutationObserver(function(mutations) {
    const outputTextarea = document.querySelector('textarea#output');
    if (outputTextarea && outputTextarea.value) {
      const code = extractCode();
      if (code && code.length >= 6) {
        console.log('[2FA-LIVE-HELPER] Code generated:', code);
        window.postMessage({
          type: 'CODE_GENERATED',
          code: code
        }, window.location.origin);
      }
    }
  });
  
  // Start observing the document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  console.log('[2FA-LIVE-HELPER] Helper initialized and monitoring for codes');
})();

