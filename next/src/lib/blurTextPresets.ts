/** BlurText timing presets (ms between words; stepDuration in seconds). */
export const BLUR_TEXT_PRESETS = {
  lp: { titleDelay: 70, subtitleDelay: 110, stepDuration: 0.35 },
  home: { titleDelay: 180, subtitleDelay: 260, stepDuration: 0.55 },
} as const;

export type BlurTextPreset = keyof typeof BLUR_TEXT_PRESETS;
