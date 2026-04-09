import Link from "next/link";

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/ecomefficiency.com";

function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
      width="15"
      height="15"
      style={{ opacity: filled ? 1 : 0.25, fill: "white" }}
    >
      <path d="M12 17.27l-5.18 3.12 1.4-5.95L3 9.24l6.06-.52L12 3l2.94 5.72 6.06.52-5.22 5.2 1.4 5.95z" />
    </svg>
  );
}

export default function TrustpilotTopBadge() {
  return (
    <>
      <div className="w-full bg-black/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-2">
          <Link
            href={TRUSTPILOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit flex items-center gap-[10px] font-medium no-underline cursor-pointer"
          >
            <span style={{ display: "block" }}>
              <span className="inline-flex items-center gap-1" style={{ zoom: 0.85 } as any} data-rating="4.5">
                <span className="inline-flex items-center justify-center rounded w-[21px] h-[19px] bg-[#00b87e]">
                  <StarSvg filled />
                </span>
                <span className="inline-flex items-center justify-center rounded w-[21px] h-[19px] bg-[#00b87e]">
                  <StarSvg filled />
                </span>
                <span className="inline-flex items-center justify-center rounded w-[21px] h-[19px] bg-[#00b87e]">
                  <StarSvg filled />
                </span>
                <span className="inline-flex items-center justify-center rounded w-[21px] h-[19px] bg-[#00b87e]">
                  <StarSvg filled />
                </span>
                <span className="inline-flex items-center justify-center rounded w-[21px] h-[19px]" style={{ background: "rgba(0,184,126,0.35)" }}>
                  <StarSvg filled={false} />
                </span>
              </span>
            </span>

            <span style={{ color: "#ffffff", fontSize: 15, textUnderlineOffset: "1.5px" }}>
              EXCELLENT <strong>4.8/5</strong> | 1734 Avis
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}

