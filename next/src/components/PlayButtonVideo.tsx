"use client";

import * as React from "react";

export default function PlayButtonVideo({
  src,
  poster,
  title,
  className = "absolute inset-0 w-full h-full object-cover",
}: {
  src: string;
  poster?: string;
  title: string;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);

  const play = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // If play fails, retry muted (more permissive on some browsers)
        try {
          v.muted = true;
          v.play().then(() => setIsPlaying(true)).catch(() => {});
        } catch {}
      });
  }, []);

  const pause = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setIsPlaying(false);
  }, []);

  const toggle = React.useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        className={className}
        // If poster is provided, we can avoid downloading video until click.
        // If not, preload enough to display the first frame as the preview.
        preload={poster ? "none" : "auto"}
        poster={poster}
        playsInline
        muted
        controls={false}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        title={title}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={toggle}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Overlay + play button (center). We keep it on top when paused. */}
      {!isPlaying ? (
        <button
          type="button"
          onClick={play}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={`Play video: ${title}`}
          title={`Play: ${title}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          <div className="pointer-events-none flex items-center gap-3 rounded-full border border-white/20 bg-black/50 px-5 py-3 backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 border border-white/20">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="text-white">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-white">Play</span>
          </div>
        </button>
      ) : null}
    </div>
  );
}

