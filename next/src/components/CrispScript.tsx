import Script from "next/script";

export default function CrispScript() {
  return (
    <Script id="crisp" strategy="lazyOnload">
      {`(function(){
  try {
    var h=(window.location.hostname||"").toLowerCase().replace(/^www\\./,"");
    var ok = (h==="ecomefficiency.com" || h==="localhost" || h==="127.0.0.1" || /\\.vercel\\.app$/.test(h));
    if (!ok) return;
  } catch (e) { return; }

  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = "69577169-0422-43d4-a553-a7d4776fde6f";

  var d=document;
  var s=d.createElement("script");
  s.src="https://client.crisp.chat/l.js";
  s.async=1;
  (d.head||d.getElementsByTagName("head")[0]).appendChild(s);
})();`}
    </Script>
  );
}

