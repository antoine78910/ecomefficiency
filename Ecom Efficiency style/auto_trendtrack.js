(function () {
  // === Loading Bar Logic ===

  function showLoadingBar() {
    if (document.getElementById('login-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    });

    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, {
      width: '80%',
      maxWidth: '600px',
      backgroundColor: '#e5e7eb',
      borderRadius: '10px',
      height: '30px',
      overflow: 'hidden',
      position: 'relative',
      pointerEvents: 'auto',
    });

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#3b82f6',
      borderRadius: '10px',
      transition: 'width 0.5s ease-in-out',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '16px',
    });

    const percentageLabel = document.createElement('span');
    percentageLabel.id = 'percentage-label';
    percentageLabel.innerText = '0%';
    progressBar.appendChild(percentageLabel);

    const textBelow = document.createElement('div');
    textBelow.innerText = 'Ecom Efficiency';
    Object.assign(textBelow.style, {
      marginTop: '20px',
      color: '#fff',
      fontSize: '24px',
      fontWeight: 'bold',
    });

    const checkmarkContainer = document.createElement('div');
    checkmarkContainer.id = 'checkmark-container';
    Object.assign(checkmarkContainer.style, {
      display: 'none',
      opacity: '0',
      transition: 'opacity 2s ease-in-out',
      marginTop: '20px',
      pointerEvents: 'none',
    });

    const svgNS = "http://www.w3.org/2000/svg";
    const checkmarkSVG = document.createElementNS(svgNS, "svg");
    checkmarkSVG.setAttribute("width", "100");
    checkmarkSVG.setAttribute("height", "100");
    checkmarkSVG.setAttribute("viewBox", "0 0 52 52");

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "26");
    circle.setAttribute("cy", "26");
    circle.setAttribute("r", "25");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#fff");
    circle.setAttribute("stroke-width", "2");
    checkmarkSVG.appendChild(circle);

    const checkmark = document.createElementNS(svgNS, "path");
    checkmark.setAttribute("fill", "none");
    checkmark.setAttribute("stroke", "#fff");
    checkmark.setAttribute("stroke-width", "5");
    checkmark.setAttribute("d", "M14 27 l7 7 l16 -16");
    checkmark.setAttribute("stroke-linecap", "round");
    checkmark.setAttribute("stroke-linejoin", "round");
    checkmark.style.strokeDasharray = "48";
    checkmark.style.strokeDashoffset = "48";
    checkmark.style.transition = "stroke-dashoffset 2s ease-in-out";
    checkmarkSVG.appendChild(checkmark);

    checkmarkContainer.appendChild(checkmarkSVG);
    progressContainer.appendChild(progressBar);
    overlay.appendChild(progressContainer);
    overlay.appendChild(textBelow);
    overlay.appendChild(checkmarkContainer);
    document.body.appendChild(overlay);
  }

  function updateLoadingBar(percent) {
    const progressBar = document.getElementById('progress-bar');
    const percentageLabel = document.getElementById('percentage-label');
    if (progressBar && percentageLabel) {
      progressBar.style.width = percent + '%';
      percentageLabel.innerText = percent + '%';
    }
  }

  function startFinalAnimation() {
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = progressBar.parentElement;
    const checkmarkContainer = document.getElementById('checkmark-container');
    const checkmark = checkmarkContainer.querySelector('path');

    if (progressBar && checkmarkContainer && checkmark) {
      progressContainer.style.opacity = '0';
      progressContainer.style.transition = 'opacity 2s ease-in-out';
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 2000);

      checkmarkContainer.style.display = 'block';
      setTimeout(() => {
        checkmarkContainer.style.opacity = '1';
        checkmark.style.strokeDashoffset = '0';
      }, 100);
    }
  }

  function hideLoadingBar() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.remove();
  }

  // === Main Script ===

  function simulateTypingAndSubmit() {
    const emailInput = document.querySelector('input#email');
    const passwordInput = document.querySelector('input#password');
    const loginButton = document.querySelector('button[data-testid="password-login-button"]');
    const form = document.querySelector('form');

    if (emailInput && passwordInput && loginButton) {
      const email = 'gaussens.pro@gmail.com';
      const password = 'Ht!:jeu8gtP-';

      let emailIndex = 0;
      let passwordIndex = 0;

      function focusAndClick(element) {
        element.focus();
        const rect = element.getBoundingClientRect();
        const clickEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 5,
          clientY: rect.top + 5,
          view: window
        });
        element.dispatchEvent(clickEvent);
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      function typeInput(input, text, index, callback, stepStart) {
        const stepSize = Math.floor(text.length / 3); // 3 steps (10% -> 40% for email, 40% -> 70% for password)
        let step = stepStart;

        function nextChar() {
          if (index < text.length) {
            input.value += text.charAt(index);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            index++;
            if (index % stepSize === 0 && step < stepStart + 30) {
              step += 10;
              updateLoadingBar(step);
            }

            setTimeout(nextChar, 100);
          } else {
            updateLoadingBar(stepStart + 30);
            callback();
          }
        }

        nextChar();
      }

      showLoadingBar();
      updateLoadingBar(10);

      focusAndClick(emailInput);
      console.log('Champ Email activé (focus + clic simulés).');

      typeInput(emailInput, email, emailIndex, function () {
        focusAndClick(passwordInput);
        console.log('Champ Password activé (focus + clic simulés).');

        typeInput(passwordInput, password, passwordIndex, function () {
          updateLoadingBar(80);
          if (loginButton && !loginButton.disabled) {
            console.log('Bouton de login actif, tentative de clic...');
            focusAndClick(loginButton);
            loginButton.click();
            console.log('Login button clicked.');
          } else if (form) {
            console.log('Soumission du formulaire...');
            form.submit();
          } else {
            console.log('Aucun bouton de login ou formulaire trouvés.');
          }

          updateLoadingBar(100);
          setTimeout(() => {
            startFinalAnimation();
            setTimeout(hideLoadingBar, 2500);
          }, 1000);
        }, 40);
      }, 10);
    } else {
      console.log('Les éléments du formulaire sont introuvables.');
    }
  }

  window.addEventListener('load', function () {
    simulateTypingAndSubmit();
  });
})();

