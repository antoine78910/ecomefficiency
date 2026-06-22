export const SEEDANCE_PROMO_END = new Date("2026-07-17T23:59:59");

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getCountdownParts(ms: number): CountdownParts {
  const total = Math.max(0, ms);
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
  };
}

export function padCountdown(n: number) {
  return String(n).padStart(2, "0");
}
