"use client";
import React, { useEffect, useRef } from 'react';

const NewDashboardPreview = () => {
  return (
    <div className="bg-black py-20 relative">
      {/* Continue the purple gradient from hero section */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-purple-900/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
          <AutoplayVideo />
        </div>
      </div>
    </div>
  );
};

export default NewDashboardPreview;

function AutoplayVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!video) return;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full"
        src="/demo.mp4"
        muted
        playsInline
        preload="none"
        controls
      />
    </div>
  );
}
