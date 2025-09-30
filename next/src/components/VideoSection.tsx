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
            preload="metadata"
          />
          {/* Overlay headline and mini billing showcase */}
          <div className="absolute inset-0 flex flex-col items-center justify-end p-4 sm:p-6 md:p-8 pointer-events-none">
            <div className="text-center mb-3 md:mb-4">
              <h3 className="text-white text-lg md:text-2xl font-bold">Save Big with Ecom Efficiency</h3>
              <p className="text-gray-300 text-xs md:text-sm">Access 50+ tools for the price of one</p>
            </div>
            <div className="w-full max-w-md grid grid-cols-3 gap-2 text-center text-[10px] md:text-xs text-gray-200 bg-black/40 rounded-lg border border-white/10 p-2">
              <div className="bg-white/5 rounded-md p-2">
                <div className="text-white font-semibold">Starter</div>
                <div className="text-purple-300 font-bold">€11.99</div>
                <div className="text-gray-400">/mo (annual)</div>
              </div>
              <div className="bg-white/5 rounded-md p-2">
                <div className="text-white font-semibold">Pro</div>
                <div className="text-purple-300 font-bold">€17.99</div>
                <div className="text-gray-400">/mo (annual)</div>
              </div>
              <div className="bg-white/5 rounded-md p-2">
                <div className="text-white font-semibold">Monthly</div>
                <div className="text-purple-300 font-bold">€19.99+</div>
                <div className="text-gray-400">flexible</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
