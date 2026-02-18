export type SublaunchCredits = {
  updatedAtIso: string;
  elevenLabs: { includedCredits: number; currentCredits: number | null };
  pipiads: { includedCredits: number; currentCredits: number | null };
};

function parseOptionalInt(v: string | undefined | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

export function getSublaunchCreditsSnapshot(): SublaunchCredits {
  const elevenLabsCurrent = parseOptionalInt(process.env.SUBLAUNCH_ELEVENLABS_CREDITS_CURRENT);
  const pipiadsCurrent = parseOptionalInt(process.env.SUBLAUNCH_PIPIADS_CREDITS_CURRENT);

  return {
    updatedAtIso: new Date().toISOString(),
    elevenLabs: { includedCredits: 500_000, currentCredits: elevenLabsCurrent },
    pipiads: { includedCredits: 200_000, currentCredits: pipiadsCurrent },
  };
}

