(function() {
    'use strict';

    var bannerElement = document.querySelector('.headerContainer');
    if (bannerElement) {
        bannerElement.remove();
    }

    var descriptionElements = document.querySelectorAll('.product-deceription');
    descriptionElements.forEach(function(element) {
        element.textContent = 'sublaunch.com/EcomEfficiency';
    });
})();
