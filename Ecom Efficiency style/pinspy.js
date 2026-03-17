function autoLogin() {
    // Check if on the specific page
    if (window.location.href === 'https://app.pinspy.com/login') {
        const emailInput = document.querySelector('input[name="username"]');
        const passwordInput = document.querySelector('input[name="password"]');
        const signInButton = document.querySelector('button[type="submit"]');

        if (emailInput && passwordInput && signInButton) {
            // Fill in the login credentials with delays
            typeInField(emailInput, 'corpifyit@skiff.com', () => {
                setTimeout(() => {
                    typeInField(passwordInput, 'ngdur65tg ', () => {
                        setTimeout(() => {
                            // Click the submit button
                            if (signInButton) {
                                signInButton.click();
                            }
                        }, 500); // Adjust delay as needed
                    });
                }, 1000); // Delay between username and password input
            });
        }
    }
}

function typeInField(field, text, callback) {
    field.focus();
    field.value = ''; // Clear any existing value

    let i = 0;
    function typeNextChar() {
        if (i < text.length) {
            field.value += text[i++];
            field.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(typeNextChar, Math.random() * 150 + 50); // Simulate typing speed
        } else if (callback) {
            callback();
        }
    }

    typeNextChar();
}

// Run the function
autoLogin();
