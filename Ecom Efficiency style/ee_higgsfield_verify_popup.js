/**
 * Higgsfield verify popup: email-only subscription check (no 4-digit PIN).
 */
(function (global) {
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
      return 'Subscription found: Sublaunch / Ecom Agent (legacy).';
    }
    if (stripeAccount === 'ecomefficiency') {
      return 'Subscription found: Ecom Efficiency Pro.';
    }
    return 'Subscription verified.';
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
    card.appendChild(styled('div', 'font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.5;', 'Enter the email you used for your Ecom Efficiency subscription.'));

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

    var msgEl = styled('div', 'min-height:20px;font-size:13px;margin-bottom:14px;');
    msgEl.id = prefix + '-msg';
    card.appendChild(msgEl);

    var actionBtn = styled('button', 'width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;');
    actionBtn.type = 'button';
    actionBtn.id = prefix + '-submit';
    actionBtn.textContent = 'Verify email';
    card.appendChild(actionBtn);

    root.appendChild(card);
    (document.body || document.documentElement).appendChild(root);

    var phase = 'email';

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

    function postVerify(email) {
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email: email })
      }).then(function (r) {
        return r.json().catch(function () {
          return { ok: false };
        });
      });
    }

    function handleSuccess(email, data) {
      if (typeof opts.onSuccess === 'function') {
        opts.onSuccess(email, '', data);
      }
    }

    function runVerify() {
      var email = String(emailInput.value || '')
        .trim()
        .toLowerCase();
      if (!email) {
        setMsg('Please enter your subscription email.', true);
        return;
      }
      actionBtn.disabled = true;
      setMsg('Checking your subscription…', false);
      showAccountInfo('');

      var submitFn = opts.onSubmit;
      var promise = submitFn
        ? Promise.resolve(submitFn(email, ''))
        : postVerify(email).then(function (data) {
            if (data && data.status === 'higgsfield_requires_pro') {
              return {
                ok: false,
                message: 'Pro plan required. Upgrade at ecomefficiency.com/price',
                isError: true,
                requiresUpgrade: true
              };
            }
            if (data && data.ok && data.active && data.hf_access_token) {
              return { ok: true, message: 'Access granted.', isError: false, raw: data };
            }
            return {
              ok: false,
              message: 'No active subscription for this email. Subscribe on ecomefficiency.com.',
              isError: true
            };
          });

      promise
        .then(function (result) {
          actionBtn.disabled = false;
          result = result || {};
          if (result.requiresUpgrade) {
            showAccountInfo('Subscription found: Ecom Efficiency Starter. Higgsfield requires Pro.');
            setMsg(result.message || '', true);
            actionBtn.textContent = 'Upgrade to Pro';
            phase = 'upgrade';
            return;
          }
          if (result.ok) {
            var raw = result.raw || {};
            showAccountInfo(accountLabel(raw.stripe_account || (raw.plan === 'legacy' ? 'legacy' : 'ecomefficiency')));
            setMsg(result.message || 'Access granted.', false);
            handleSuccess(email, raw);
            return;
          }
          setMsg(result.message || 'Verification failed.', !!result.isError);
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
      runVerify();
    });

    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runVerify();
    });

    return true;
  }

  global.EE_HiggsfieldVerifyPopup = {
    VERIFY_URL: VERIFY_URL,
    mount: mount,
    repairStalePopup: repairStalePopup
  };
})(typeof window !== 'undefined' ? window : self);
