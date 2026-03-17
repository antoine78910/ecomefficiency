// remove_11_profile.js
// Hide ElevenLabs profile dropdown button on /app* pages
(function(){
    'use strict';

    // Only proceed on the ElevenLabs app pages
    if(!location.href.startsWith('https://elevenlabs.io/app')) return;

    /**
     * Attempt to locate the profile button and remove it from the DOM.
     * Returns true once the element has been found and removed.
     */
    function removeProfileButton(){
        const btn = document.querySelector('button[aria-label="Your profile"]');
        if(!btn) return false;
        btn.remove();
        return true;
    }

    /**
     * Attempt to remove the low-credits upgrade banner.
     * Returns true once the element has been found and removed.
     */
    function removeLowCreditsBanner(){
        // The banner contains a dismiss button with this aria-label
        const dismissBtn = document.querySelector('button[aria-label="Dismiss low credits warning"]');
        if(!dismissBtn) return false;

        // Remove the top-level container that holds the whole banner
        const container = dismissBtn.closest('div.mb-1') || dismissBtn.closest('div.relative') || dismissBtn.parentElement;
        (container || dismissBtn).remove();
        return true;
    }

    let removedProfile = removeProfileButton();
    let removedBanner  = removeLowCreditsBanner();
    if(removedProfile && removedBanner) return;

    // The UI is client-rendered; observe DOM until the element appears.
    const observer = new MutationObserver(() => {
        if(!removedProfile) removedProfile = removeProfileButton();
        if(!removedBanner)  removedBanner  = removeLowCreditsBanner();

        if(removedProfile && removedBanner){
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
