// Voidmetric v4.0 Open Custom Lighting Builder (ZERO Closed Mood Dropdowns!)
// Design ANY bespoke lighting mood your episode requires (custom sun angle, lit/shade colors, sky gradient stops,
// atmospheric fog, glowing HDR sun disc, full character-to-world ANIME_LIGHT sync, and color grade) via `makeLightPreset()`.
// Physical craft rules from mromidev lighting.md:
//   - Keep daylight shadows bright & colorful (shade/lit ~ 0.46-0.52, pastel-cool or violet-tinted — NEVER crushed black mud!)
//   - Keep sunset/night/storm shadows chromatic (violet-blue, steel-blue, indigo) so silhouettes & warm practical lights pop!
//   - Always match `charTint`, `charAmbient`, `charRimTint`, `charRimBoost` to the scene so characters live INSIDE the world!
import { GradeParams } from "../bridge/grade";

export type C3 = [number, number, number];
export type EpisodeLightName = string;

export type EpisodeLightPreset = {
  az: number; el: number; lit: C3; shade: C3; lift: C3;
  lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  /** Synced automatically into ANIME_LIGHT (`uAmbientTint`, `uRimTint`, `uRimBoost`) for character-to-world lighting integration! */
  charAmbient: C3; charRimTint: string; charRimBoost: number;
  blob: C3; actorShadow: boolean;
  fog: string; fogNear: number; fogFar: number;
  sunDisc: string; sunCol: string; sunI: number;
  sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
  skyStops: { c: string[]; e: number[] };
  sat: number; bounce: C3; grade: GradeParams;
};

const BASE_LIGHT: EpisodeLightPreset = {
  az: 68, el: 44, lit: [1.56, 1.48, 1.32], shade: [0.68, 0.62, 0.75], lift: [0.05, 0.05, 0.09],
  lambert: 0.34, sideK: 0.85, term: 0.20,
  charTint: [1.0, 0.96, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.92, 0.90, 0.97],
  charAmbient: [0.84, 0.80, 0.94], charRimTint: "#fff4dc", charRimBoost: 0.92,
  blob: [0.66, 0.62, 0.68], actorShadow: true,
  fog: "#d0e6fc", fogNear: 24, fogFar: 280, sunDisc: "#fff2c8",
  sunCol: "#fff4df", sunI: 2.8, sky: "#e2f0ff", ground: "#baa282", hemiI: 0.64,
  bias: -0.0003, normalBias: 0.018,
  skyStops: { c: ["#dceeff", "#98ceff", "#48a2ff", "#1e80f4", "#0e64dc"], e: [0, 3, 7, 14, 26] },
  sat: 1.08, bounce: [0.02, 0.015, 0.01],
  grade: {
    ky: [0, 0.10, 0.28, 0.60, 0.84, 0.95, 1],
    sat: [1.0, 1.06, 1.02],
    tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.005, 0],
    vig: [0.12, 0.46],
  },
};

/** Build ANY bespoke episode lighting mood by overriding only the physical properties you want to customize! */
export function makeLightPreset(overrides: Partial<EpisodeLightPreset> = {}): EpisodeLightPreset {
  return {
    ...BASE_LIGHT,
    ...overrides,
    skyStops: overrides.skyStops ?? BASE_LIGHT.skyStops,
    grade: overrides.grade ? { ...BASE_LIGHT.grade, ...overrides.grade } : BASE_LIGHT.grade,
  };
}

/**
 * Define your episode's custom 3-act lighting moods directly here via `makeLightPreset({ ... })`!
 * (Starter ships one neutral `base` entry so the workspace compiles cleanly before you author episode-specific moods.)
 */
export const EPISODE_LIGHTS: Record<EpisodeLightName, EpisodeLightPreset> = {
  base: makeLightPreset({}),
};

export function getEpisodeLight(name: EpisodeLightName): EpisodeLightPreset {
  return EPISODE_LIGHTS[name] ?? EPISODE_LIGHTS.base ?? BASE_LIGHT;
}
