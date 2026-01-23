"use client";

import Image from "next/image";
import * as React from "react";

export default function PlayButtonVideo({
  src,
  poster,
  title,
  className = "absolute inset-0 w-full h-full object-cover",
}: {
  src: string;
  poster: string;
  title: string;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (!isPlaying) return;
    const v = videoRef.current;
    if (!v) return;
    // Best-effort: start playback after user intent
    v.play().catch(() => {});
  }, [isPlaying]);

  if (!isPlaying) {
    return (
      <button
        type="button"
        onClick={() => setIsPlaying(true)}
        className="absolute inset-0 w-full h-full"
        aria-label={`Play video: ${title}`}
        title={`Play: ${title}`}
      >
        <Image src={poster} alt={title} fill priority={false} sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />

        {/* Overlay + play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/50 px-5 py-3 backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:bg-black/60 transition-colors">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 border border-white/20">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-white">Play</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      playsInline
      controls
      preload="metadata"
      title={title}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

