(function() {
    'use strict';

    function removeCrispChat() {
        var crispChatScript = document.querySelector('script[src*="client.crisp.chat"]');
        if (crispChatScript) {
            crispChatScript.remove();
        }

        var crispChatIframes = document.querySelectorAll('iframe[src*="client.crisp.chat"]');
        crispChatIframes.forEach(function(iframe) {
            iframe.remove();
        });

        var crispChatDivs = document.querySelectorAll('div.crisp-client');
        crispChatDivs.forEach(function(div) {
            div.remove();
        });

        var crispChatStyles = document.querySelectorAll('style[data-crisp-styles]');
        crispChatStyles.forEach(function(style) {
            style.remove();
        });
    }

    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                removeCrispChat();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', function() {
        removeCrispChat();
    });

    setInterval(removeCrispChat, 1000);
})();
