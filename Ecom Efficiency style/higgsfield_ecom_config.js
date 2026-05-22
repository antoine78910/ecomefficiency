// Configuration pour la vérification d'abonnement EcomEfficiency (Higgsfield)
window.EE_HIGGSFIELD_ECOM_CONFIG = {
  SIMULATE_CONNECTED: false,
  API_BASE_URL: 'https://www.ecomefficiency.com',
  VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
  USAGE_LOG_PATH: '/api/usage/higgsfield',
  DAILY_CREDIT_LIMIT: 100
};

// Bundled verify popup (email + 4-digit code) — loads before higgsfield_ecom_subscription.js
(function (global) {
  if (global.EE_HiggsfieldVerifyPopup && global.EE_HiggsfieldVerifyPopup.mount) return;

  var CODE_PAGE_URL = 'https://app.ecomefficiency.com/higgsfield';

  function styled(tag, cssText, text) {
    var el = document.createElement(tag);
    if (cssText) el.style.cssText = cssText;
    if (text != null && text !== '') el.textContent = String(text);
    return el;
  }

  function ensureStyles(prefix) {
    var id = prefix + '-verify-popup-style';
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent =
      '@keyframes eeHfVerifyPopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '#' + prefix + '-popup-root{display:flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;}' +
      '#' + prefix + '-popup-card{overflow:visible!important;max-height:none!important;}' +
      '#' + prefix + '-pin-wrap{display:block!important;visibility:visible!important;opacity:1!important;}' +
      '#' + prefix + '-pin{display:block!important;visibility:visible!important;width:100%!important;min-height:48px!important;}' +
      '#' + prefix + '-email{display:block!important;visibility:visible!important;width:100%!important;}' +
      '#' + prefix + '-email:focus,#' + prefix + '-pin:focus{border-color:rgba(149,65,224,0.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,0.15)!important;}' +
      '#' + prefix + '-submit:hover:not(:disabled){filter:brightness(1.15)}' +
      '#' + prefix + '-submit:disabled{opacity:0.6;cursor:wait}';
    (document.head || document.documentElement).appendChild(s);
  }

  function codeHintLink() {
    var wrap = styled(
      'div',
      'font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:14px;text-align:left;line-height:1.45;padding:10px 12px;border-radius:10px;background:rgba(149,65,224,0.12);border:1px solid rgba(149,65,224,0.25);'
    );
    wrap.appendChild(document.createTextNode('Copy your personal 4-digit code from '));
    var a = styled('a', 'color:#d8b4fe;text-decoration:underline;font-weight:700;');
    a.href = CODE_PAGE_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'app.ecomefficiency.com/higgsfield';
    wrap.appendChild(a);
    wrap.appendChild(document.createTextNode(' then paste it below.'));
    return wrap;
  }

  function repairStalePopup(prefix) {
    var rootId = prefix + '-popup-root';
    var root = document.getElementById(rootId);
    if (!root) return;
    if (!document.getElementById(prefix + '-pin')) {
      try {
        root.remove();
      } catch (_) {}
    }
  }

  function mount(opts) {
    opts = opts || {};
    var prefix = String(opts.prefix || 'ee-hf-ecom');
    repairStalePopup(prefix);
    var rootId = prefix + '-popup-root';
    if (document.getElementById(rootId)) return false;

    var z = opts.zIndex != null ? opts.zIndex : 2147483646;
    ensureStyles(prefix);

    var root = styled(
      'div',
      'position:fixed;inset:0;z-index:' +
        z +
        ';display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);animation:eeHfVerifyPopIn 0.2s ease;'
    );
    root.id = rootId;

    var card = styled(
      'div',
      'max-width:400px;width:92%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,0.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;overflow:visible;'
    );
    card.id = prefix + '-popup-card';

    card.appendChild(styled('div', 'font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;', 'Ecom Efficiency'));
    card.appendChild(styled('div', 'font-size:20px;font-weight:700;margin-bottom:8px;', 'Verify Your Subscription'));
    card.appendChild(styled('div', 'font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.5;', 'Two fields are required: your subscription email and your 4-digit access code.'));

    card.appendChild(styled('div', 'font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:6px;text-align:left;', 'Step 1 — Email'));

    var emailLabel = styled('label', 'display:block;text-align:left;font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:6px;', 'Subscription email');
    emailLabel.htmlFor = prefix + '-email';
    card.appendChild(emailLabel);

    var emailInput = styled('input', 'width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;');
    emailInput.type = 'email';
    emailInput.id = prefix + '-email';
    emailInput.placeholder = 'your@email.com';
    card.appendChild(emailInput);

    var pinWrap = styled('div', 'margin-bottom:8px;padding:12px;border-radius:12px;background:rgba(149,65,224,0.18);border:2px solid rgba(181,74,243,0.55);');
    pinWrap.id = prefix + '-pin-wrap';
    pinWrap.appendChild(styled('div', 'font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d8b4fe;margin-bottom:8px;text-align:left;', 'Step 2 — 4-digit access code (required)'));

    var pinLabel = styled('label', 'display:block;text-align:left;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:6px;', 'Paste your code from app.ecomefficiency.com/higgsfield');
    pinLabel.htmlFor = prefix + '-pin';
    pinWrap.appendChild(pinLabel);

    var pinInput = styled('input', 'width:100%;box-sizing:border-box;padding:14px;border:2px solid rgba(181,74,243,0.8);border-radius:12px;background:rgba(0,0,0,0.35);color:#fff;font-size:22px;font-weight:700;outline:none;letter-spacing:0.4em;text-align:center;');
    pinInput.type = 'text';
    pinInput.id = prefix + '-pin';
    pinInput.setAttribute('inputmode', 'numeric');
    pinInput.maxLength = 4;
    pinInput.placeholder = '0000';
    pinWrap.appendChild(pinInput);
    card.appendChild(pinWrap);
    card.appendChild(codeHintLink());

    var msgEl = styled('div', 'min-height:20px;font-size:13px;margin-bottom:14px;');
    msgEl.id = prefix + '-msg';
    card.appendChild(msgEl);

    var submitBtn = styled('button', 'width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;');
    submitBtn.type = 'button';
    submitBtn.id = prefix + '-submit';
    submitBtn.textContent = 'Verify email + code';
    card.appendChild(submitBtn);

    root.appendChild(card);
    (document.body || document.documentElement).appendChild(root);

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    function runVerify() {
      var email = String(emailInput.value || '').trim().toLowerCase();
      var pin = String(pinInput.value || '').replace(/\D/g, '').slice(0, 4);
      if (!email) { setMsg('Please enter your subscription email.', true); return; }
      if (!/^\d{4}$/.test(pin)) { setMsg('Enter the 4-digit code from app.ecomefficiency.com/higgsfield.', true); return; }
      submitBtn.disabled = true;
      setMsg('Verifying subscription…', false);
      Promise.resolve()
        .then(function () { return opts.onSubmit(email, pin); })
        .then(function (result) {
          submitBtn.disabled = false;
          result = result || {};
          setMsg(result.message || '', !!result.isError);
          if (result.ok && typeof opts.onSuccess === 'function') opts.onSuccess(email, pin, result);
        })
        .catch(function () {
          submitBtn.disabled = false;
          setMsg('Network error. Please try again.', true);
        });
    }

    submitBtn.addEventListener('click', runVerify);
    emailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runVerify(); });
    pinInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runVerify(); });
    pinInput.addEventListener('input', function () {
      pinInput.value = String(pinInput.value || '').replace(/\D/g, '').slice(0, 4);
    });

    return true;
  }

  global.EE_HiggsfieldVerifyPopup = {
    CODE_PAGE_URL: CODE_PAGE_URL,
    mount: mount,
    repairStalePopup: repairStalePopup
  };
})(typeof window !== 'undefined' ? window : self);
