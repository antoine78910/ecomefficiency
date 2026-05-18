/** BlurText timing presets (ms between words; stepDuration in seconds). */
export const BLUR_TEXT_PRESETS = {
  lp: { titleDelay: 70, subtitleDelay: 110, stepDuration: 0.35 },
  home: { titleDelay: 85, subtitleDelay: 260, stepDuration: 0.28 },
} as const;

export type BlurTextPreset = keyof typeof BLUR_TEXT_PRESETS;
