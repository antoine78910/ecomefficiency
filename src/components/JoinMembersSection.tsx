'use client'

import React from 'react';
import styled from 'styled-components';

const JoinMembersSection = () => {
  return (
    <div className="relative py-16 px-6 lg:px-8">
      {/* Gradient bridge that extends upward to blend into FAQ */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(124,58,237,0.25),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-900/20 via-black to-purple-900/10" />

      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-purple-500/30 p-8 md:p-10 bg-gradient-to-br from-purple-950/30 to-black shadow-[0_0_40px_rgba(124,58,237,0.15)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Text Content */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Join <span className="gradient-text">+1000 Members</span>
              </h2>
              <p className="text-lg text-white">
                Join our free Discord community of e‑commerce founders and experts.
              </p>
            </div>
            {/* CTA Button */}
            <div className="flex-shrink-0">
              <StyledWrapper>
                <div className="button-group">
                  <button
                    className="darkmatter-btn"
                    onClick={() => window.open('https://discord.gg/bKg7J625Sm', '_blank')}
                  >
                    Join the Discord
                    <span className="darkmatter-particle" style={{ ['--tx' as any]: '-20px', ['--ty' as any]: '-15px', left: '25%', top: '25%' } as any} />
                    <span className="darkmatter-particle" style={{ ['--tx' as any]: '15px', ['--ty' as any]: '-20px', left: '75%', top: '25%', animationDelay: '0.2s' } as any} />
                    <span className="darkmatter-particle" style={{ ['--tx' as any]: '-15px', ['--ty' as any]: '15px', left: '25%', top: '75%', animationDelay: '0.4s' } as any} />
                    <span className="darkmatter-particle" style={{ ['--tx' as any]: '20px', ['--ty' as any]: '15px', left: '75%', top: '75%', animationDelay: '0.6s' } as any} />
                  </button>
                </div>
              </StyledWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StyledWrapper = styled.div`
  .darkmatter-btn {
    background: #000;
    border: 1px solid #5b21b6;
    color: #b56aff;
    padding: 15px 40px;
    border-radius: 10px;
    font-size: 16px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    z-index: 1;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
    box-shadow: 0 10px 26px rgba(124,58,237,.25), inset 4px 4px 8px rgba(0,0,0,.35), inset -4px -4px 8px rgba(0,0,0,.35);
  }

  .darkmatter-btn:hover {
    box-shadow: 0 0 15px rgba(181, 106, 255, 0.4), 0 10px 26px rgba(124,58,237,.35);
    color: #fff;
  }

  .darkmatter-btn::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(181, 106, 255, 0.12) 0%, transparent 70%);
    transform: scale(0);
    transition: transform 0.6s ease;
    z-index: -1;
  }

  .darkmatter-btn:hover::before { transform: scale(1.5); }

  .darkmatter-particle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #b56aff;
    opacity: 0;
    z-index: -1;
  }
  .darkmatter-btn:hover .darkmatter-particle { animation: darkmatter-float 2s forwards; }

  @keyframes darkmatter-float {
    0% { transform: translate(0, 0) scale(0); opacity: 0; }
    20% { opacity: 0.9; }
    100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
  }
`;

export default JoinMembersSection;