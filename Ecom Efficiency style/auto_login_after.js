(function() {
  'use strict';

  // === Configuration ===
  const TARGET_LABEL = 'AfterLib';  // Set the target label (name in the first column)
  const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

  /**
   * Function to wait for the element to be present in the DOM
   */
  function waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
          const element = document.querySelector(selector);
          if (element) {
              return resolve(element);
          }

          const observer = new MutationObserver((mutations, me) => {
              const el = document.querySelector(selector);
              if (el) {
                  resolve(el);
                  me.disconnect();
              }
          });

          observer.observe(document.body, {
              childList: true,
              subtree: true
          });

          setTimeout(() => {
              observer.disconnect();
              reject(new Error(`Element with selector "${selector}" not found after ${timeout}ms.`));
          }, timeout);
      });
  }

  /**
   * Function to fetch credentials from the Google Sheets HTML
   */
  async function fetchCredentialsFromHTML() {
      try {
          const response = await fetch(GOOGLE_SHEET_HTML_URL);
          if (!response.ok) {
              throw new Error(`Error fetching data: ${response.statusText}`);
          }
          const htmlData = await response.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlData, 'text/html');
          const table = doc.querySelector('table');

          if (!table) {
              throw new Error('No table found in the HTML.');
          }

          const rows = table.querySelectorAll('tr');

          for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const cells = row.querySelectorAll('td');

              if (cells.length >= 3) {
                  const username = cells[0].textContent.trim();

                  if (username.toLowerCase() === TARGET_LABEL.toLowerCase()) {
                      const emailInnerDiv = cells[1].querySelector('.softmerge-inner');
                      const passwordInnerDiv = cells[2].querySelector('.softmerge-inner');

                      const email = emailInnerDiv ? emailInnerDiv.textContent.trim() : cells[1].textContent.trim();
                      const password = passwordInnerDiv ? passwordInnerDiv.textContent.trim() : cells[2].textContent.trim();

                      console.log(`Credentials found for ${TARGET_LABEL}`);
                      return { email, password };
                  }
              }
          }

          throw new Error(`Credentials for "${TARGET_LABEL}" not found in the table.`);
      } catch (error) {
          console.error('Error fetching credentials:', error);
          throw error;
      }
  }

  /**
   * Main function for auto-login
   */
  async function autoLogin() {
      try {
          console.log("Starting auto-login.");

          // Fetch credentials
          const credentials = await fetchCredentialsFromHTML();
          console.log("Credentials retrieved");

          // Fill the email field
          const emailInput = await waitForElement('input[name="email"]');
          emailInput.value = credentials.email;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log("Email filled");

          // Fill the password field
          const passwordInput = await waitForElement('input[name="password"]');
          passwordInput.value = credentials.password;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log("Password filled");

          // Click the login button
          const loginButton = await waitForElement('button[type="submit"]:not([disabled])');
          loginButton.click();
          console.log("Login initiated");

      } catch (error) {
          console.error("Auto-login failed:", error.message);
      }
  }

  // Start the script when the page is loaded
  window.addEventListener('load', autoLogin);

})();
