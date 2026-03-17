function autoLogin() {
    // Check if on the specific page
    if (window.location.href.includes('your-page-url')) {
        // Get email and password input elements
        const emailInput = document.querySelector('input[type="email"].login_input');
        const passwordInput = document.querySelector('input[type="password"].login_input');
        
        // Set email and password
        if (emailInput && passwordInput) {
            emailInput.value = 'geekynerd262@gmail.com';
            passwordInput.value = 'HelloGeeky22234d';

            // Find and click the LOGIN button
            const loginButton = document.querySelector('button[type="submit"]'); // Adjust selector as needed
            if (loginButton) {
                loginButton.click();
            }
        }
    }
}

// Run the function
autoLogin();


