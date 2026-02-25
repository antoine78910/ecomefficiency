import Script from "next/script";

/**
 * FirstPromoter click + referral tracking.
 *
 * - Loaded globally (ideally in <head>) so affiliate click cookies are always set.
 * - Forces cookie domain to the apex so tracking works across subdomains (www/app/tools/partners).
 * - Sales are NOT tracked client-side (FirstPromoter recommends server-side tracking).
 */
export default function FirstPromoterScript() {
  const cid = String(process.env.NEXT_PUBLIC_FIRSTPROMOTER_CID || "2msleq3h").trim();
  if (!cid) return null;

  // IMPORTANT:
  // - Use runtime detection for cookie domain so localhost works.
  // - Use the official queueing snippet to avoid timing issues.
  const inline = `
(function(w){w.fpr=w.fpr||function(){w.fpr.q=w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
(function(){
  try {
    var host = (window.location && window.location.hostname) ? String(window.location.hostname) : '';
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
    // Share cookies across subdomains in prod.
    var cookieDomain = isLocal ? 'localhost' : '.ecomefficiency.com';
    fpr("init", {cid:${JSON.stringify(cid)}, domain: cookieDomain});
    fpr("click");
  } catch(e) {}
})();
`.trim();

  return (
    <>
      <Script id="firstpromoter-inline" strategy="beforeInteractive">
        {inline}
      </Script>
      <Script
        id="firstpromoter-lib"
        strategy="afterInteractive"
        src="https://cdn.firstpromoter.com/fpr.js"
        async
      />
    </>
  );
}

