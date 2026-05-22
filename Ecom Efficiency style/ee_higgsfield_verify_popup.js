/**
 * Higgsfield verify popup: Step 1 email → detect Stripe account → Step 2 PIN if Ecom Efficiency Pro.
 */
(function (global) {
  var CODE_PAGE_URL = 'https://app.ecomefficiency.com/higgsfield';
  var VERIFY_URL = 'https://www.ecomefficiency.com/api/stripe/verify';
  var UPGRADE_URL = 'https://www.ecomefficiency.com/price';

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
      '#' + prefix + '-popup-root{display:flex!important;align-items:center!important;justify-content:center!important;}' +
      '#' + prefix + '-pin-wrap{display:block!important;visibility:visible!important;}' +
      '#' + prefix + '-pin{display:block!important;width:100%!important;min-height:48px!important;box-sizing:border-box!important;}' +
      '#' + prefix + '-email{display:block!important;width:100%!important;box-sizing:border-box!important;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function repairStalePopup(prefix) {
    var root = document.getElementById(prefix + '-popup-root');
    if (!root) return;
    if (!document.getElementById(prefix + '-email')) {
      try {
        root.remove();
      } catch (_) {}
    }
  }

  function accountLabel(stripeAccount) {
    if (stripeAccount === 'legacy') {
      return 'Subscription found: Sublaunch / Ecom Agent (legacy Stripe). No access code required.';
    }
    if (stripeAccount === 'ecomefficiency') {
      return 'Subscription found: Ecom Efficiency (Pro). Enter your 4-digit code below.';
    }
    return '';
  }

  function mount(opts) {
    opts = opts || {};
    var prefix = String(opts.prefix || 'ee-hf-ecom');
    repairStalePopup(prefix);
    var rootId = prefix + '-popup-root';
    if (document.getElementById(rootId)) return false;

    var z = opts.zIndex != null ? opts.zIndex : 2147483646;
    var verifyUrl = opts.verifyUrl || VERIFY_URL;
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

    card.appendChild(styled('div', 'font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;', 'Ecom Efficiency'));
    card.appendChild(styled('div', 'font-size:20px;font-weight:700;margin-bottom:8px;', 'Verify Your Subscription'));
    card.appendChild(styled('div', 'font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.5;', 'Enter your Ecom Efficiency subscription email and 4-digit access code.'));

    var emailLabel = styled('label', 'display:block;text-align:left;font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:6px;', 'Subscription email');
    emailLabel.htmlFor = prefix + '-email';
    card.appendChild(emailLabel);

    var emailInput = styled('input', 'width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);color:#fff;margin-bottom:12px;font-size:14px;outline:none;');
    emailInput.type = 'email';
    emailInput.id = prefix + '-email';
    emailInput.placeholder = 'your@email.com';
    emailInput.autocomplete = 'email';
    card.appendChild(emailInput);

    var accountInfo = styled('div', 'display:none;font-size:12px;color:#d8b4fe;margin-bottom:12px;text-align:left;line-height:1.45;padding:10px 12px;border-radius:10px;background:rgba(149,65,224,0.15);border:1px solid rgba(149,65,224,0.3);');
    accountInfo.id = prefix + '-account-info';
    card.appendChild(accountInfo);

    var pinWrap = styled('div', 'display:none;margin-bottom:8px;padding:12px;border-radius:12px;background:rgba(149,65,224,0.18);border:2px solid rgba(181,74,243,0.55);');
    pinWrap.id = prefix + '-pin-wrap';

    pinWrap.appendChild(styled('div', 'font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d8b4fe;margin-bottom:8px;text-align:left;', 'Step 2 — 4-digit access code'));

    var pinHint = styled('div', 'font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:8px;text-align:left;line-height:1.4;');
    pinHint.id = prefix + '-pin-hint';
    var hintLink = styled('a', 'color:#d8b4fe;font-weight:700;');
    hintLink.href = CODE_PAGE_URL;
    hintLink.target = '_blank';
    hintLink.rel = 'noopener noreferrer';
    hintLink.textContent = 'app.ecomefficiency.com/higgsfield';
    pinHint.appendChild(document.createTextNode('Get your code on '));
    pinHint.appendChild(hintLink);
    pinWrap.appendChild(pinHint);

    var pinInput = styled('input', 'width:100%;box-sizing:border-box;padding:14px;border:2px solid rgba(181,74,243,0.8);border-radius:12px;background:rgba(0,0,0,0.35);color:#fff;font-size:22px;font-weight:700;outline:none;letter-spacing:0.4em;text-align:center;');
    pinInput.type = 'text';
    pinInput.id = prefix + '-pin';
    pinInput.setAttribute('inputmode', 'numeric');
    pinInput.maxLength = 4;
    pinInput.placeholder = '0000';
    pinWrap.appendChild(pinInput);
    card.appendChild(pinWrap);

    var msgEl = styled('div', 'min-height:20px;font-size:13px;margin-bottom:14px;');
    msgEl.id = prefix + '-msg';
    card.appendChild(msgEl);

    var actionBtn = styled('button', 'width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;');
    actionBtn.type = 'button';
    actionBtn.id = prefix + '-submit';
    actionBtn.textContent = 'Continue with email';
    card.appendChild(actionBtn);

    root.appendChild(card);
    (document.body || document.documentElement).appendChild(root);

    var phase = 'email';
    var lastEmail = '';

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    function showAccountInfo(text) {
      if (!text) {
        accountInfo.style.display = 'none';
        accountInfo.textContent = '';
        return;
      }
      accountInfo.style.display = 'block';
      accountInfo.textContent = text;
    }

    function showPinStep(show) {
      pinWrap.style.display = show ? 'block' : 'none';
      if (!show) pinInput.value = '';
    }

    function postVerify(email, pin) {
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email: email, pin: pin != null ? pin : '' })
      }).then(function (r) {
        return r.json().catch(function () {
          return { ok: false };
        });
      });
    }

    function handleSuccess(email, pin, data) {
      if (typeof opts.onSuccess === 'function') {
        opts.onSuccess(email, pin, data);
      }
    }

    function runEmailStep() {
      var email = String(emailInput.value || '')
        .trim()
        .toLowerCase();
      if (!email) {
        setMsg('Please enter your subscription email.', true);
        return;
      }
      lastEmail = email;
      actionBtn.disabled = true;
      setMsg('Checking your subscription…', false);
      showAccountInfo('');
      showPinStep(false);

      postVerify(email, '')
        .then(function (data) {
          actionBtn.disabled = false;
          if (!data) {
            setMsg('Server error. Please try again.', true);
            return;
          }

          if (data.status === 'higgsfield_requires_pro') {
            showAccountInfo('Subscription found: Ecom Efficiency Starter plan. Higgsfield requires Pro.');
            setMsg('Upgrade to Pro to use Higgsfield. Open ecomefficiency.com/price', true);
            actionBtn.textContent = 'Upgrade to Pro';
            actionBtn.onclick = function () {
              window.open(UPGRADE_URL, '_blank', 'noopener,noreferrer');
            };
            phase = 'upgrade';
            return;
          }

          if (data.ok && data.active && data.hf_access_token && !data.pin_required) {
            var legacyLabel = accountLabel(data.stripe_account || (data.plan === 'legacy' ? 'legacy' : ''));
            showAccountInfo(legacyLabel || accountLabel('legacy'));
            setMsg('Access granted. No code required for your subscription.', false);
            handleSuccess(email, '', { ok: true, legacy: true, raw: data });
            return;
          }

          if (
            data.ok &&
            data.active &&
            (data.pin_required || data.status === 'pin_required')
          ) {
            phase = 'pin';
            showAccountInfo(accountLabel('ecomefficiency'));
            showPinStep(true);
            setMsg('Enter your 4-digit code from app.ecomefficiency.com/higgsfield', false);
            actionBtn.textContent = 'Verify email + code';
            emailInput.disabled = true;
            setTimeout(function () {
              pinInput.focus();
            }, 80);
            return;
          }

          if (data.status === 'invalid_pin') {
            showPinStep(true);
            setMsg('Incorrect code. Check app.ecomefficiency.com/higgsfield', true);
            phase = 'pin';
            return;
          }

          setMsg('No active subscription for this email. Subscribe on ecomefficiency.com.', true);
        })
        .catch(function () {
          actionBtn.disabled = false;
          setMsg('Network error. Please try again.', true);
        });
    }

    function runPinStep() {
      var email = lastEmail || String(emailInput.value || '').trim().toLowerCase();
      var pin = String(pinInput.value || '')
        .replace(/\D/g, '')
        .slice(0, 4);
      if (!email) {
        setMsg('Enter your email first.', true);
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        setMsg('Enter your 4-digit code from app.ecomefficiency.com/higgsfield', true);
        return;
      }
      actionBtn.disabled = true;
      setMsg('Verifying…', false);

      var submitFn = opts.onSubmit;
      var promise = submitFn
        ? Promise.resolve(submitFn(email, pin))
        : postVerify(email, pin).then(function (data) {
            if (data && data.ok && data.active && data.hf_access_token) {
              return { ok: true, message: 'Access granted.', isError: false, raw: data };
            }
            if (data && data.status === 'invalid_pin') {
              return { ok: false, message: 'Incorrect code. Check app.ecomefficiency.com/higgsfield', isError: true };
            }
            return { ok: false, message: 'Verification failed. Try again.', isError: true };
          });

      promise
        .then(function (result) {
          actionBtn.disabled = false;
          result = result || {};
          setMsg(result.message || '', !!result.isError);
          if (result.ok) {
            handleSuccess(email, pin, result);
          }
        })
        .catch(function () {
          actionBtn.disabled = false;
          setMsg('Network error. Please try again.', true);
        });
    }

    actionBtn.addEventListener('click', function () {
      if (phase === 'upgrade') {
        window.open(UPGRADE_URL, '_blank', 'noopener,noreferrer');
        return;
      }
      if (phase === 'pin') runPinStep();
      else runEmailStep();
    });

    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && phase !== 'pin') runEmailStep();
    });
    pinInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && phase === 'pin') runPinStep();
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
    VERIFY_URL: VERIFY_URL,
    mount: mount,
    repairStalePopup: repairStalePopup
  };
})(typeof window !== 'undefined' ? window : self);
