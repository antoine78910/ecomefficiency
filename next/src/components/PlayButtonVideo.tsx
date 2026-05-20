"use client";

import * as React from "react";

export default function PlayButtonVideo({
  src,
  poster,
  title,
  className = "absolute inset-0 w-full h-full object-cover",
  autoPlay,
  autoPlayOnVisible,
  playOnHover = false,
  hidePlayOverlay = false,
  loop,
}: {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  autoPlay?: boolean;
  autoPlayOnVisible?: boolean;
  /** Play muted on pointer enter, pause on leave. */
  playOnHover?: boolean;
  /** When true, never show the Play overlay (use with autoPlayOnVisible / playOnHover). */
  hidePlayOverlay?: boolean;
  loop?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [autoplayTried, setAutoplayTried] = React.useState(false);
  const [autoplayFailed, setAutoplayFailed] = React.useState(false);

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

  // Optional: attempt autoplay (muted) once on mount.
  React.useEffect(() => {
    if (!autoPlay) return;
    if (autoplayTried) return;
    setAutoplayTried(true);
    const t = window.setTimeout(() => {
      try {
        const v = videoRef.current;
        if (!v) return;
        v.muted = true;
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => setAutoplayFailed(true));
      } catch {}
    }, 50);
    return () => window.clearTimeout(t);
  }, [autoPlay, autoplayTried]);

  const attemptAutoplay = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayFailed(false);
      })
      .catch(() => setAutoplayFailed(true));
  }, []);

  // Autoplay when scrolled into view (muted).
  React.useEffect(() => {
    if (!autoPlayOnVisible) return;
    const el = wrapperRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        if (autoplayTried) return;
        setAutoplayTried(true);
        attemptAutoplay();
        try {
          io.disconnect();
        } catch {}
      },
      { root: null, rootMargin: "120px", threshold: 0.35 }
    );
    try {
      io.observe(el);
    } catch {}
    return () => {
      try {
        io.disconnect();
      } catch {}
    };
  }, [autoPlayOnVisible, autoplayTried, attemptAutoplay]);

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

  const onWrapperMouseEnter = React.useCallback(() => {
    if (!playOnHover) return;
    attemptAutoplay();
  }, [playOnHover, attemptAutoplay]);

  const onWrapperMouseLeave = React.useCallback(() => {
    if (!playOnHover) return;
    pause();
    const v = videoRef.current;
    if (v) {
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [playOnHover, pause]);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      onMouseEnter={playOnHover ? onWrapperMouseEnter : undefined}
      onMouseLeave={playOnHover ? onWrapperMouseLeave : undefined}
    >
      <video
        ref={videoRef}
        className={className}
        // If poster is provided, we can avoid downloading video until click.
        // If not, preload enough to display the first frame as the preview.
        preload={autoPlayOnVisible || autoPlay || playOnHover ? "auto" : poster ? "none" : "auto"}
        poster={poster}
        playsInline
        muted
        loop={Boolean(loop)}
        controls={false}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        title={title}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={hidePlayOverlay ? undefined : toggle}
      >
        <source src={src} type="video/mp4" />
      </video>

      {!hidePlayOverlay &&
      !playOnHover &&
      !isPlaying &&
      (autoplayFailed || (!autoPlayOnVisible && !playOnHover)) ? (
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

