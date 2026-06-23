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
  playOnHover?: boolean;
  hidePlayOverlay?: boolean;
  loop?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [autoplayFailed, setAutoplayFailed] = React.useState(false);

  const wantsAutoplay = Boolean(autoPlay || autoPlayOnVisible);

  const play = React.useCallback(() => {
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

  const attemptAutoplay = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayFailed(false);
      })
      .catch(() => setAutoplayFailed(true));
  }, []);

  React.useEffect(() => {
    if (!wantsAutoplay) return;
    const el = wrapperRef.current;
    if (!el) return;

    const tryPlay = () => attemptAutoplay();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = Boolean(entries[0]?.isIntersecting);
        if (visible) tryPlay();
        else if (autoPlayOnVisible && !autoPlay) videoRef.current?.pause();
      },
      { threshold: 0.15, rootMargin: "100px 0px" }
    );
    io.observe(el);

    if (autoPlay) tryPlay();

    return () => io.disconnect();
  }, [wantsAutoplay, autoPlay, autoPlayOnVisible, attemptAutoplay]);

  const pause = React.useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = React.useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const showPlayOverlay =
    !playOnHover && !isPlaying && autoplayFailed && !hidePlayOverlay;

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <video
        ref={videoRef}
        className={className}
        preload={wantsAutoplay ? "auto" : poster ? "metadata" : "auto"}
        poster={poster}
        playsInline
        muted
        defaultMuted
        autoPlay={wantsAutoplay}
        loop={Boolean(loop)}
        controls={false}
        title={title}
        onCanPlay={() => {
          if (wantsAutoplay) attemptAutoplay();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={showPlayOverlay ? toggle : undefined}
      >
        <source src={src} type="video/mp4" />
      </video>

      {showPlayOverlay ? (
        <button
          type="button"
          onClick={play}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label={`Play video: ${title}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          <div className="pointer-events-none flex items-center gap-3 rounded-full border border-white/20 bg-black/50 px-5 py-3 backdrop-blur-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
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
