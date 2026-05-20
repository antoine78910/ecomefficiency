import Link from "next/link";

export default function PartnerExternalAppHome({
  saasName,
  marketingUrl,
  colors,
}: {
  saasName: string;
  marketingUrl?: string;
  colors?: { main?: string; accent?: string };
}) {
  const main = String(colors?.main || "#9541e0");
  const accent = String(colors?.accent || main);
  return (
    <div
      className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16"
      style={{ ["--wl-main" as string]: main, ["--wl-accent" as string]: accent } as React.CSSProperties}
    >
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-8 text-center">
        <div className="text-2xl font-semibold">{saasName}</div>
        <p className="mt-3 text-sm text-gray-300">Sign up or sign in to access your account and tools.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110"
          >
            Get started
          </Link>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
          >
            Sign in
          </Link>
        </div>
        {marketingUrl ? (
          <p className="mt-6 text-xs text-gray-500">
            <a href={marketingUrl} className="text-purple-300 hover:text-purple-200">
              Back to website
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
