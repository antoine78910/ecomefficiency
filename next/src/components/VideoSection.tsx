'use client';

import React from 'react';

const VideoSection = () => {
  return (
    <section className="relative bg-black -mt-px">
      {/* Violet bridge gradient, lifted into header; combines radial + linear for smooth blend */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-96 w-[90%] sm:w-[48rem] md:w-[60rem] lg:w-[72rem] xl:w-[80rem] bg-gradient-to-b from-purple-600/15 to-transparent blur-3xl rounded-full"
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="relative mx-auto w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/demo.mp4"
            poster="/ecomefficiency.png"
            loop
            playsInline
            muted
            autoPlay
            preload="auto"
            controls={false}
          />
          {/* Overlay intentionally removed as requested */}
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
