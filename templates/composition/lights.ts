// Voidmetric v3.7 Luminous mromidev-Calibrated 10-Mood 3-Act Lighting Presets
// (Morning, Day, Golden, Golden Sunset, Twilight Indigo, Storm Rain, Warm Lantern, Cosmic Void, Night Room, Space)
// Calibrated to mromidev lighting.md:
//   - Bright pastel-lavender daylight shadows (shade/lit ~ 0.46-0.52, NEVER crushed brown-black mud!)
//   - Vivid azure day/morning sky reaching deep blue by 26 deg elevation (visible inside 40 deg vertical FOV!)
//   - Saturated violet-blue backlit sunset shadows + glowing HDR sun disc & atmospheric halo
//   - Full character-to-world lighting integration (charTint, charAmbient, charRimTint, charRimBoost)
import { GradeParams } from "../bridge/grade";

type C3 = [number, number, number];
export type EpisodeLightName =
  | "morning"
  | "day"
  | "golden"
  | "golden_sunset"
  | "twilight_indigo"
  | "storm_rain"
  | "warm_lantern"
  | "cosmic_void"
  | "night_room"
  | "space";

export type EpisodeLightPreset = {
  az: number; el: number; lit: C3; shade: C3; lift: C3;
  lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  /** Ambient fill tint, backlit rim color, and rim boost synced into ANIME_LIGHT so 3D characters live INSIDE the scene! */
  charAmbient: C3; charRimTint: string; charRimBoost: number;
  blob: C3; actorShadow: boolean;
  fog: string; fogNear: number; fogFar: number;
  sunDisc: string; sunCol: string; sunI: number;
  sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
  skyStops: { c: string[]; e: number[] };
  sat: number; bounce: C3; grade: GradeParams;
};

export const EPISODE_LIGHTS: Record<EpisodeLightName, EpisodeLightPreset> = {
  morning: {
    az: 68, el: 44, lit: [1.56, 1.48, 1.32], shade: [0.68, 0.62, 0.74], lift: [0.05, 0.05, 0.09],
    lambert: 0.34, sideK: 0.86, term: 0.22,
    charTint: [1.0, 0.96, 0.90], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.92, 0.90, 0.98],
    charAmbient: [0.84, 0.80, 0.94], charRimTint: "#fff2d4", charRimBoost: 0.92,
    blob: [0.68, 0.64, 0.70], actorShadow: true,
    fog: "#d4e8fc", fogNear: 26, fogFar: 260, sunDisc: "#fff0c4",
    sunCol: "#fff4df", sunI: 2.8, sky: "#e6f2ff", ground: "#baa282", hemiI: 0.68,
    bias: -0.0003, normalBias: 0.018,
    skyStops: { c: ["#dff0ff", "#a2d4ff", "#54a8ff", "#2484f5", "#1066dc"], e: [0, 3, 7, 14, 26] },
    sat: 1.07, bounce: [0.03, 0.02, 0.01],
    grade: { ky: [0, 0.10, 0.28, 0.60, 0.84, 0.95, 1], sat: [1.0, 1.06, 1.02], tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.005, 0], vig: [0.11, 0.46] },
  },
  day: {
    az: 75, el: 48, lit: [1.58, 1.50, 1.34], shade: [0.74, 0.66, 0.79], lift: [0.04, 0.04, 0.09],
    lambert: 0.35, sideK: 0.85, term: 0.20,
    charTint: [1.0, 0.96, 0.94], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.92, 0.90, 0.96],
    charAmbient: [0.84, 0.80, 0.95], charRimTint: "#ffffff", charRimBoost: 0.88,
    blob: [0.66, 0.62, 0.68], actorShadow: true,
    fog: "#c4defa", fogNear: 24, fogFar: 300, sunDisc: "#fff7dc",
    sunCol: "#fff3e0", sunI: 2.9, sky: "#dcecff", ground: "#b49a78", hemiI: 0.62,
    bias: -0.0003, normalBias: 0.018,
    skyStops: { c: ["#d6ecff", "#8ecaff", "#429eff", "#1b7cf2", "#0b60d8"], e: [0, 3, 7, 14, 26] },
    sat: 1.09, bounce: [0, 0, 0],
    grade: { ky: [0, 0.10, 0.28, 0.60, 0.835, 0.945, 1], sat: [1.0, 1.06, 1.02], tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.006, 0], vig: [0.11, 0.46] },
  },
  golden: {
    az: 14, el: 10, lit: [1.58, 0.80, 0.36], shade: [0.22, 0.23, 0.68], lift: [0.04, 0.035, 0.09],
    lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.02, 0.82, 0.62], charShade: 0.88, charGrad: 0.10, bodyGrad: 0.24, sideTint: [0.85, 0.80, 0.96],
    charAmbient: [0.56, 0.50, 0.86], charRimTint: "#ffc878", charRimBoost: 1.28,
    blob: [0.74, 0.72, 0.90], actorShadow: true,
    fog: "#f2b288", fogNear: 36, fogFar: 320, sunDisc: "#ffe29e",
    sunCol: "#ffab5e", sunI: 4.8, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.54,
    bias: -0.0005, normalBias: 0.025,
    skyStops: { c: ["#ffc67c", "#fba676", "#ec867e", "#be7298", "#6d5294"], e: [0, 4, 9, 18, 36] },
    sat: 1.12, bounce: [0.05, 0.02, 0.01],
    grade: { ky: [0, 0.09, 0.25, 0.55, 0.81, 0.935, 1], sat: [1.0, 1.12, 1.14], tintS: [0.02, 0.003], tintM: [0, 0], tintH: [-0.01, 0.006], vig: [0.17, 0.42] },
  },
  // Rich fiery orange-violet dusk with luminous violet-blue shadows (no muddy brown buildings!)
  golden_sunset: {
    az: 18, el: 8, lit: [1.68, 0.74, 0.32], shade: [0.24, 0.19, 0.64], lift: [0.05, 0.035, 0.10],
    lambert: 0.34, sideK: 0.80, term: 0.10,
    charTint: [1.04, 0.79, 0.58], charShade: 0.86, charGrad: 0.11, bodyGrad: 0.25, sideTint: [0.88, 0.74, 0.98],
    charAmbient: [0.52, 0.44, 0.86], charRimTint: "#ffbc6a", charRimBoost: 1.38,
    blob: [0.68, 0.56, 0.82], actorShadow: true,
    fog: "#ec9068", fogNear: 26, fogFar: 260, sunDisc: "#ffe49e",
    sunCol: "#ff8c42", sunI: 4.6, sky: "#e88672", ground: "#6c4858", hemiI: 0.58,
    bias: -0.0004, normalBias: 0.022,
    skyStops: { c: ["#ffb464", "#f87a58", "#d85674", "#8a4686", "#3d2c6c"], e: [0, 4, 10, 19, 38] },
    sat: 1.15, bounce: [0.07, 0.03, 0.01],
    grade: { ky: [0, 0.085, 0.245, 0.55, 0.82, 0.94, 1], sat: [1.04, 1.15, 1.16], tintS: [0.024, 0.006], tintM: [0, 0], tintH: [-0.012, 0.008], vig: [0.20, 0.40] },
  },
  // Deep cobalt-indigo city twilight so warm windows, lamps & neon signs POP with orange-teal contrast!
  twilight_indigo: {
    az: -42, el: 22, lit: [0.84, 1.02, 1.52], shade: [0.20, 0.26, 0.52], lift: [0.04, 0.06, 0.15],
    lambert: 0.32, sideK: 0.82, term: 0.16,
    charTint: [0.82, 0.91, 1.12], charShade: 0.84, charGrad: 0.10, bodyGrad: 0.22, sideTint: [0.74, 0.84, 1.08],
    charAmbient: [0.46, 0.54, 0.92], charRimTint: "#88c4ff", charRimBoost: 1.28,
    blob: [0.44, 0.48, 0.76], actorShadow: true,
    fog: "#203064", fogNear: 18, fogFar: 200, sunDisc: "#000000",
    sunCol: "#8ab8ff", sunI: 2.5, sky: "#3a4e96", ground: "#182042", hemiI: 0.60,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#64549c", "#32448a", "#1e2e6c", "#121e4c", "#0a102c"], e: [0, 5, 12, 24, 48] },
    sat: 1.12, bounce: [0.02, 0.03, 0.08],
    grade: { ky: [0, 0.085, 0.245, 0.55, 0.82, 0.95, 1], sat: [1.04, 1.10, 1.12], tintS: [0.022, -0.006], tintM: [0.004, 0], tintH: [0, 0], vig: [0.22, 0.40] },
  },
  // Moody overcast storm-rain lighting with readable steel-blue slate shadows (paired with AtmosphericWeather3D rain + practical headlights/neon!)
  storm_rain: {
    az: -28, el: 34, lit: [0.96, 1.06, 1.24], shade: [0.26, 0.32, 0.48], lift: [0.05, 0.06, 0.11],
    lambert: 0.38, sideK: 0.86, term: 0.26,
    charTint: [0.85, 0.92, 1.06], charShade: 0.82, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.80, 0.88, 1.00],
    charAmbient: [0.48, 0.58, 0.80], charRimTint: "#a2d4ff", charRimBoost: 1.24,
    blob: [0.46, 0.50, 0.62], actorShadow: true,
    fog: "#324258", fogNear: 12, fogFar: 135, sunDisc: "#000000",
    sunCol: "#b8cce0", sunI: 2.2, sky: "#4b5c74", ground: "#222b3a", hemiI: 0.64,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#44546c", "#324056", "#243042", "#182232", "#101724"], e: [0, 5, 13, 26, 52] },
    sat: 0.94, bounce: [0.02, 0.03, 0.05],
    grade: { ky: [0, 0.085, 0.25, 0.55, 0.82, 0.94, 1], sat: [0.96, 0.98, 1.00], tintS: [0.016, -0.004], tintM: [0, 0], tintH: [0, 0], vig: [0.24, 0.38] },
  },
  // Warm interior tungsten / lantern / workshop lamp glow against cozy plum shadow walls!
  warm_lantern: {
    az: 44, el: 38, lit: [1.60, 1.20, 0.74], shade: [0.30, 0.25, 0.42], lift: [0.05, 0.04, 0.09],
    lambert: 0.34, sideK: 0.82, term: 0.18,
    charTint: [1.04, 0.90, 0.74], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.86, 0.82, 0.96],
    charAmbient: [0.64, 0.54, 0.76], charRimTint: "#ffd488", charRimBoost: 1.18,
    blob: [0.56, 0.48, 0.54], actorShadow: true,
    fog: "#32263c", fogNear: 18, fogFar: 180, sunDisc: "#000000",
    sunCol: "#ffca7a", sunI: 3.1, sky: "#765458", ground: "#2c201c", hemiI: 0.58,
    bias: -0.0003, normalBias: 0.02,
    skyStops: { c: ["#3c2a42", "#2a1e36", "#1d162a", "#130f20", "#0b0914"], e: [0, 6, 15, 30, 60] },
    sat: 1.10, bounce: [0.06, 0.03, 0.01],
    grade: { ky: [0, 0.09, 0.26, 0.56, 0.82, 0.94, 1], sat: [1.02, 1.10, 1.10], tintS: [0.018, 0.004], tintM: [0, 0], tintH: [-0.008, 0.005], vig: [0.21, 0.40] },
  },
  cosmic_void: {
    az: 35, el: 34, lit: [1.20, 0.86, 1.50], shade: [0.22, 0.17, 0.38], lift: [0.04, 0.025, 0.10],
    lambert: 0.32, sideK: 0.82, term: 0.15,
    charTint: [0.94, 0.84, 1.08], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.88, 0.72, 1.04],
    charAmbient: [0.56, 0.42, 0.86], charRimTint: "#d892ff", charRimBoost: 1.38,
    blob: [0.55, 0.45, 0.75], actorShadow: true,
    fog: "#180c32", fogNear: 18, fogFar: 180, sunDisc: "#000000",
    sunCol: "#d8a8ff", sunI: 2.6, sky: "#5e2ca8", ground: "#180a2e", hemiI: 0.62,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#2a1252", "#1e0c3e", "#14082a", "#0c041c", "#06020e"], e: [0, 6, 16, 30, 60] },
    sat: 1.14, bounce: [0.05, 0.01, 0.09],
    grade: { ky: [0, 0.085, 0.245, 0.55, 0.82, 0.95, 1], sat: [1.05, 1.14, 1.15], tintS: [0.018, 0.008], tintM: [0.004, 0.002], tintH: [0, 0], vig: [0.22, 0.38] },
  },
  night_room: {
    az: -55, el: 36, lit: [0.82, 0.96, 1.42], shade: [0.20, 0.26, 0.46], lift: [0.035, 0.055, 0.13],
    lambert: 0.34, sideK: 0.84, term: 0.18,
    charTint: [0.84, 0.93, 1.10], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.76, 0.84, 1.04],
    charAmbient: [0.46, 0.56, 0.86], charRimTint: "#94c6ff", charRimBoost: 1.22,
    blob: [0.48, 0.52, 0.72], actorShadow: true,
    fog: "#16264a", fogNear: 16, fogFar: 160, sunDisc: "#000000",
    sunCol: "#98c0ff", sunI: 2.4, sky: "#325294", ground: "#141d34", hemiI: 0.56,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#283e72", "#1a2c58", "#122044", "#0b142e", "#060a18"], e: [0, 6, 14, 28, 55] },
    sat: 1.08, bounce: [0.02, 0.03, 0.07],
    grade: { ky: [0, 0.09, 0.25, 0.55, 0.82, 0.95, 1], sat: [1.02, 1.08, 1.08], tintS: [0.02, -0.005], tintM: [0.006, 0], tintH: [0, 0], vig: [0.21, 0.40] },
  },
  space: {
    az: 52, el: 28, lit: [1.44, 1.40, 1.54], shade: [0.18, 0.20, 0.36], lift: [0.02, 0.03, 0.08],
    lambert: 0.35, sideK: 0.82, term: 0.16,
    charTint: [0.96, 0.96, 1.06], charShade: 0.85, charGrad: 0.08, bodyGrad: 0.20, sideTint: [0.82, 0.84, 1.04],
    charAmbient: [0.48, 0.46, 0.78], charRimTint: "#cfe2ff", charRimBoost: 1.32,
    blob: [0.40, 0.40, 0.60], actorShadow: false,
    fog: "#070414", fogNear: 80, fogFar: 500, sunDisc: "#000000",
    sunCol: "#eef4ff", sunI: 2.8, sky: "#423478", ground: "#0a0618", hemiI: 0.52,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#180a34", "#100624", "#090418", "#05020e", "#030108"], e: [0, 8, 20, 38, 70] },
    sat: 1.12, bounce: [0.03, 0.02, 0.06],
    grade: { ky: [0, 0.08, 0.24, 0.55, 0.83, 0.95, 1], sat: [1.05, 1.12, 1.14], tintS: [0.015, 0.004], tintM: [0, 0], tintH: [0, 0], vig: [0.22, 0.42] },
  },
};
