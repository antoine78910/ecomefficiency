(function() {
    'use strict';

    const banner = document.getElementById('masthead');
    if (banner) {
        banner.remove();
    }

    const titleSection = document.querySelector('section[data-id="5ac1770"]');
    if (titleSection) {
        titleSection.remove();
    }
})();
