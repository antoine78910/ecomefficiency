(function() {
    'use strict';

    const emailSourceUrl = 'https://marketizestudio.com/sp/getmail.php';

    fetch(emailSourceUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.emails && data.emails.length > 0) {
                const email = data.emails[data.emails.length - 1];

                const observer = new MutationObserver(() => {
                    const emailField = document.querySelector('input#email');
                    if (emailField) {
                        emailField.value = email.trim();
                        const loginButton = document.querySelector('button.login-btn');
                        if (loginButton) {
                            loginButton.click();
                            observer.disconnect();
                        }
                    }
                });

                observer.observe(document, { childList: true, subtree: true });
            } else {
                console.log("Failed to fetch a valid email.");
            }
        })
        .catch(error => console.error('Error fetching email:', error));
})();
