"use client";

import React from "react";
import styled from "styled-components";

export type BillingPeriod = "monthly" | "yearly";

const idMonthly = "ee-billing-monthly";
const idYearly = "ee-billing-yearly";

export function BillingCyberSwitch({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
}) {
  return (
    <StyledWrapper>
      <div className="cyber-signboard">
        <div className="cyber-switch" role="radiogroup" aria-label="Billing period">
          <input
            type="radio"
            id={idMonthly}
            name="ee-billing"
            checked={value === "monthly"}
            onChange={() => onChange("monthly")}
          />
          <label htmlFor={idMonthly} className="cyber-label">
            <span className="label-text">Monthly</span>
            <span className="glare" aria-hidden />
          </label>
          <input
            type="radio"
            id={idYearly}
            name="ee-billing"
            checked={value === "yearly"}
            onChange={() => onChange("yearly")}
          />
          <label htmlFor={idYearly} className="cyber-label cyber-label--annual">
            <span className="savings-badge savings-badge--tag" aria-hidden>
              −40%
            </span>
            <span className="label-text">Annual</span>
            <span className="glare" aria-hidden />
          </label>
          <div className="cyber-highlight" aria-hidden>
            <div className="highlight-inner" />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .cyber-signboard {
    --primary-glow: #ab63ff;
    --secondary-glow: #9541e0;
    --inactive-color: #6b7280;
    --bg-dark: #0d0e12;
    --switch-width: min(100%, 448px);
    --switch-height: 54px;
    --padding: 7px;

    --item-width: calc((100% - (var(--padding) * 2)) / 2);

    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 448px;
    margin-left: auto;
    margin-right: auto;
    padding-top: 10px;
    font-family: inherit;
  }

  .cyber-switch {
    position: relative;
    width: var(--switch-width);
    height: var(--switch-height);
    background: var(--bg-dark);
    border-radius: 16px;
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.75),
      inset 0 -1px 2px rgba(255, 255, 255, 0.04),
      0 12px 28px -8px rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: stretch;
    padding: var(--padding);
    box-sizing: border-box;
    overflow: visible;
    border: 1px solid rgba(139, 92, 246, 0.22);
  }

  .cyber-switch input[type="radio"] {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .cyber-label {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    z-index: 2;
    position: relative;
    border-radius: 12px;
    transition: color 0.25s ease;
    -webkit-tap-highlight-color: transparent;
    padding: 0 18px;
    text-align: center;
  }

  .cyber-label--annual {
    overflow: visible;
    padding-right: 14px;
  }

  .label-text {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--inactive-color);
    transition:
      color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      filter 0.35s ease,
      transform 0.35s ease;
    line-height: 1.2;
  }

  .savings-badge--tag {
    position: absolute;
    top: -8px;
    right: -2px;
    z-index: 4;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: rgba(237, 233, 254, 0.95);
    background: rgba(24, 24, 32, 0.92);
    border: 1px solid rgba(139, 92, 246, 0.45);
    border-radius: 6px;
    padding: 2px 6px;
    line-height: 1.2;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
  }

  .cyber-highlight {
    position: absolute;
    top: var(--padding);
    left: var(--padding);
    width: var(--item-width);
    height: calc(var(--switch-height) - (var(--padding) * 2));
    background: transparent;
    z-index: 1;
    transition: transform 0.45s cubic-bezier(0.34, 1.15, 0.64, 1);
    pointer-events: none;
  }

  .highlight-inner {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: linear-gradient(
      145deg,
      rgba(149, 65, 224, 0.22) 0%,
      rgba(149, 65, 224, 0.06) 100%
    );
    border: 1px solid rgba(171, 99, 255, 0.35);
    box-shadow:
      0 0 18px rgba(171, 99, 255, 0.2),
      inset 0 0 12px rgba(171, 99, 255, 0.08);
    backdrop-filter: blur(4px);
    position: relative;
  }

  .highlight-inner::after {
    content: "";
    position: absolute;
    top: 0;
    left: 12%;
    width: 76%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.35),
      transparent
    );
    opacity: 0.7;
  }

  #${idMonthly}:checked ~ .cyber-highlight {
    transform: translateX(0);
  }
  #${idMonthly}:checked ~ label[for="${idMonthly}"] .label-text {
    color: #f5f3ff;
    filter: drop-shadow(0 0 10px rgba(171, 99, 255, 0.45));
  }
  #${idMonthly}:checked ~ label[for="${idYearly}"] .label-text {
    color: var(--inactive-color);
    filter: none;
  }
  #${idMonthly}:checked ~ label[for="${idYearly}"] .savings-badge--tag {
    color: rgba(156, 163, 175, 0.92);
    border-color: rgba(75, 85, 99, 0.45);
    background: rgba(18, 18, 22, 0.9);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }

  #${idYearly}:checked ~ .cyber-highlight {
    transform: translateX(100%);
  }
  #${idYearly}:checked ~ label[for="${idYearly}"] .label-text {
    color: #f5f3ff;
    filter: drop-shadow(0 0 10px rgba(171, 99, 255, 0.45));
  }
  #${idYearly}:checked ~ label[for="${idYearly}"] .savings-badge--tag {
    color: rgba(245, 243, 255, 0.98);
    border-color: rgba(171, 99, 255, 0.55);
    background: rgba(149, 65, 224, 0.25);
    box-shadow:
      0 0 12px rgba(171, 99, 255, 0.25),
      0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .cyber-switch:focus-within .highlight-inner {
    box-shadow:
      0 0 22px rgba(171, 99, 255, 0.28),
      inset 0 0 12px rgba(171, 99, 255, 0.1);
  }

  .cyber-label:hover .label-text {
    color: #9ca3af;
  }
  #${idMonthly}:checked ~ label[for="${idMonthly}"]:hover .label-text,
  #${idYearly}:checked ~ label[for="${idYearly}"]:hover .label-text {
    color: #faf5ff;
  }

  .cyber-label:active .label-text {
    transform: scale(0.98);
  }

  .glare {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: radial-gradient(
      circle at 50% -20%,
      rgba(255, 255, 255, 0.08),
      transparent 55%
    );
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }
  .cyber-label:hover .glare {
    opacity: 1;
  }
`;
