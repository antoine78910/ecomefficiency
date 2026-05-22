/**
 * Shared Higgsfield subscription verify popup (email + 4-digit code).
 * Built with DOM APIs so inputs are always visible (no innerHTML).
 */
(function (global) {
  var CODE_PAGE_URL = 'https://app.ecomefficiency.com/higgsfield';

  function styled(tag, cssText, text) {
    var el = document.createElement(tag);
    if (cssText) el.style.cssText = cssText;
    if (text != null && text !== '') el.textContent = String(text);
    return el;
  }

  function ensureStyles(prefix, zIndex) {
    var id = prefix + '-verify-popup-style';
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent =
      '@keyframes eeHfVerifyPopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '#' + prefix + '-popup-root{display:flex!important;align-items:center!important;justify-content:center!important;}' +
      '#' + prefix + '-email:focus,#' + prefix + '-pin:focus{border-color:rgba(149,65,224,0.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,0.15)!important;}' +
      '#' + prefix + '-submit:hover:not(:disabled){filter:brightness(1.15)}' +
      '#' + prefix + '-submit:disabled{opacity:0.6;cursor:wait}';
    (document.head || document.documentElement).appendChild(s);
  }

  function codeHintLink() {
    var wrap = styled(
      'div',
      'font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:14px;text-align:left;line-height:1.45;'
    );
    wrap.appendChild(document.createTextNode('Get your personal 4-digit code on '));
    var a = styled('a', 'color:#b54af3;text-decoration:underline;font-weight:600;');
    a.href = CODE_PAGE_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'app.ecomefficiency.com/higgsfield';
    wrap.appendChild(a);
    wrap.appendChild(document.createTextNode(' (open this page before verifying on Higgsfield).'));
    return wrap;
  }

  /**
   * @param {object} opts
   * @param {string} opts.prefix
   * @param {number} [opts.zIndex]
   * @param {function(string,string):Promise<{ok:boolean,message:string,isError?:boolean}>} opts.onSubmit
   * @param {function():void} [opts.onSuccess]
   * @returns {boolean} mounted
   */
  function mount(opts) {
    opts = opts || {};
    var prefix = String(opts.prefix || 'ee-hf-ecom');
    var rootId = prefix + '-popup-root';
    if (document.getElementById(rootId)) return false;

    var z = opts.zIndex != null ? opts.zIndex : 2147483646;
    ensureStyles(prefix, z);

    var root = styled(
      'div',
      'position:fixed;inset:0;z-index:' +
        z +
        ';display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);animation:eeHfVerifyPopIn 0.2s ease;'
    );
    root.id = rootId;

    var card = styled(
      'div',
      'max-width:400px;width:92%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);' +
        'border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,0.2);' +
        'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;'
    );

    card.appendChild(
      styled(
        'div',
        'position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;' +
          'background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;'
      )
    );
    card.appendChild(
      styled(
        'div',
        'font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;',
        'Ecom Efficiency'
      )
    );
    card.appendChild(
      styled('div', 'font-size:20px;font-weight:700;margin-bottom:8px;', 'Verify Your Subscription')
    );
    card.appendChild(
      styled(
        'div',
        'font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.5;',
        'Enter your subscription email and your 4-digit access code from app.ecomefficiency.com/higgsfield.'
      )
    );

    var emailLabel = styled(
      'label',
      'display:block;text-align:left;font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:6px;',
      'Subscription email'
    );
    emailLabel.htmlFor = prefix + '-email';
    card.appendChild(emailLabel);

    var emailInput = styled(
      'input',
      'width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;' +
        'background:rgba(255,255,255,0.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;'
    );
    emailInput.type = 'email';
    emailInput.id = prefix + '-email';
    emailInput.placeholder = 'your@email.com';
    emailInput.autocomplete = 'email';
    card.appendChild(emailInput);

    var pinLabel = styled(
      'label',
      'display:block;text-align:left;font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:6px;',
      '4-digit access code'
    );
    pinLabel.htmlFor = prefix + '-pin';
    card.appendChild(pinLabel);

    var pinInput = styled(
      'input',
      'width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(149,65,224,0.35);border-radius:12px;' +
        'background:rgba(149,65,224,0.12);color:#fff;margin-bottom:8px;font-size:20px;font-weight:700;outline:none;' +
        'letter-spacing:0.35em;text-align:center;'
    );
    pinInput.type = 'text';
    pinInput.id = prefix + '-pin';
    pinInput.setAttribute('inputmode', 'numeric');
    pinInput.setAttribute('pattern', '[0-9]*');
    pinInput.maxLength = 4;
    pinInput.autocomplete = 'one-time-code';
    pinInput.placeholder = '••••';
    card.appendChild(pinInput);

    card.appendChild(codeHintLink());

    var msgEl = styled('div', 'min-height:20px;font-size:13px;margin-bottom:14px;');
    msgEl.id = prefix + '-msg';
    card.appendChild(msgEl);

    var submitBtn = styled(
      'button',
      'width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;' +
        'background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,0.35);'
    );
    submitBtn.type = 'button';
    submitBtn.id = prefix + '-submit';
    submitBtn.textContent = 'Verify';
    card.appendChild(submitBtn);

    root.appendChild(card);
    (document.body || document.documentElement).appendChild(root);

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    function runVerify() {
      var email = String(emailInput.value || '')
        .trim()
        .toLowerCase();
      var pin = String(pinInput.value || '')
        .replace(/\D/g, '')
        .slice(0, 4);
      if (!email) {
        setMsg('Please enter your subscription email.', true);
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        setMsg(
          'Enter your 4-digit code from app.ecomefficiency.com/higgsfield.',
          true
        );
        return;
      }
      submitBtn.disabled = true;
      setMsg('Verifying subscription…', false);
      Promise.resolve()
        .then(function () {
          return opts.onSubmit(email, pin);
        })
        .then(function (result) {
          submitBtn.disabled = false;
          result = result || {};
          setMsg(result.message || '', !!result.isError);
          if (result.ok) {
            if (typeof opts.onSuccess === 'function') opts.onSuccess(email, pin, result);
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          setMsg('Network error. Please try again.', true);
        });
    }

    submitBtn.addEventListener('click', runVerify);
    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runVerify();
    });
    pinInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runVerify();
    });
    pinInput.addEventListener('input', function () {
      pinInput.value = String(pinInput.value || '')
        .replace(/\D/g, '')
        .slice(0, 4);
    });

    return true;
  }

  global.EE_HiggsfieldVerifyPopup = {
    CODE_PAGE_URL: CODE_PAGE_URL,
    mount: mount,
  };
})(typeof window !== 'undefined' ? window : self);
