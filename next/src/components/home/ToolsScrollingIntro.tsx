type ToolsScrollingIntroProps = {
  variant: "mobile-title" | "desktop" | "mobile-body";
};

export default function ToolsScrollingIntro({ variant }: ToolsScrollingIntroProps) {
  if (variant === "mobile-title") {
    return (
      <h2 className="text-3xl font-bold text-white mb-2">
        The only subscription You&apos;ll ever need
      </h2>
    );
  }

  if (variant === "mobile-body") {
    return (
      <p className="text-base text-gray-400">
        Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO
        &amp; Spy tools without paying for them individually.
      </p>
    );
  }

  return (
    <>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
        The only subscription You&apos;ll ever need
      </h2>
      <p className="text-xl text-gray-400 max-w-2xl">
        Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO
        &amp; Spy tools without paying for them individually.
      </p>
    </>
  );
}
