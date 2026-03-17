function autoLogin() {
    // Check if on the specific page
    if (window.location.href === 'https://app.fomoclips.com/auth/login') {
        const emailInput = document.querySelector('#login-form_email');
        const passwordInput = document.querySelector('#login-form_password');
        const signInButton = document.querySelector('.ant-btn-primary');

        if (emailInput && passwordInput && signInButton) {
            // Fill in the login credentials with delays
            typeInField(emailInput, 'sheikhezaz10@gmail.com', () => {
                setTimeout(() => {
                    typeInField(passwordInput, '4Tg6AUqHvShJThg', () => {
                        setTimeout(() => {
                            // Ensure the button is enabled and click it
                            if (signInButton) {
                                signInButton.disabled = false; // Ensure the button is enabled
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
