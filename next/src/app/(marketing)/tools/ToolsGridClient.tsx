"use client";

import React from "react";
import styles from "./tools.module.css";

export type ToolCard = {
  href: string;
  img: string;
  fallbackImg?: string;
  title: string;
  description: string;
  includesLabel?: string;
  includes?: Array<{ img: string; fallbackImg?: string; alt: string }>;
  afterIncludesText?: string;
  group?: boolean;
  showElevenlabsPopup?: boolean;
};

function ImgWithFallback({ src, fallback, alt, className }: { src: string; fallback?: string; alt: string; className?: string }) {
  const primarySrc =
    src.startsWith("/tools-images/") ? src : src.startsWith("/tools-logos/") ? src.replace("/tools-logos/", "/tools-images/") : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={primarySrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        const fb = fallback || "/placeholder.svg";
        if ((img as any).dataset.fallback !== "1" && img.src !== fb) {
          (img as any).dataset.fallback = "1";
          img.src = fb;
        } else if (img.src.indexOf("/placeholder.svg") === -1) {
          img.src = "/placeholder.svg";
        }
      }}
    />
  );
}

export default function ToolsGridClient({ tools }: { tools: ToolCard[] }) {
  return (
    <div className={styles.toolsGrid}>
      {tools.map((t) => (
        <a
          key={t.href + t.title}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.toolCard} ${t.group ? styles.group : ""}`}
        >
          <div className={styles.toolIcon}>
            <ImgWithFallback src={t.img} fallback={t.fallbackImg} alt={t.title} />
          </div>
          <div className={styles.toolName}>{t.title}</div>
          <div className={styles.toolDescription}>{t.description}</div>

          {t.includes?.length ? (
            <>
              <div className={styles.toolDescription}>{t.includesLabel || "Includes:"}</div>
              <div className={styles.toolIncludes}>
                {t.includes.map((inc) => (
                  <ImgWithFallback
                    key={inc.alt + inc.img}
                    src={inc.img}
                    fallback={inc.fallbackImg}
                    alt={inc.alt}
                    className={styles.toolIncludesImg}
                  />
                ))}
              </div>
              {t.afterIncludesText ? <div className={styles.toolDescription}>{t.afterIncludesText}</div> : null}
            </>
          ) : null}

          {t.showElevenlabsPopup ? (
            <div className={styles.elevenlabsPopup}>
              <div className={styles.elevenlabsHeader}>
                <div className={styles.elevenlabsIcon} aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm1 14h-2v-2h2v2zm0-4h-2V6h2v6z"
                    />
                  </svg>
                </div>
                <div className={styles.elevenlabsTitle}>Info</div>
              </div>
              <div className={styles.elevenlabsContent}>
                <div className={styles.elevenlabsInfoLine}>
                  <span>Access:</span> <strong>Pro</strong>
                </div>
                <div className={styles.elevenlabsInfoLine}>
                  <span>Credits:</span> <strong>500k</strong>
                </div>
              </div>
              <div className={styles.elevenlabsProgressContainer}>
                <div className={styles.elevenlabsProgressBg}>
                  <div className={styles.elevenlabsProgressBar} style={{ width: "70%" }} />
                </div>
                <div className={styles.elevenlabsProgressText}>Usage resets monthly</div>
              </div>
            </div>
          ) : null}
        </a>
      ))}
    </div>
  );
}

