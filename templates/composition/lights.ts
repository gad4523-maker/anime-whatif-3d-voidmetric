// Voidmetric 6-Mood Dynamic Lighting Presets (Morning, Day, Golden, Cosmic Void, Night Room, Space)
import { GradeParams } from "../bridge/grade";

type C3 = [number, number, number];
export type EpisodeLightName = "morning" | "day" | "golden" | "cosmic_void" | "night_room" | "space";

export type EpisodeLightPreset = {
  az: number; el: number; lit: C3; shade: C3; lift: C3;
  lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
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
    az: 68, el: 44, lit: [1.55, 1.46, 1.28], shade: [0.36, 0.34, 0.44], lift: [0.06, 0.06, 0.11],
    lambert: 0.34, sideK: 0.86, term: 0.22,
    charTint: [1.0, 0.96, 0.91], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.92, 0.9, 0.98],
    blob: [0.64, 0.60, 0.62], actorShadow: true,
    fog: "#d8e6f6", fogNear: 28, fogFar: 260, sunDisc: "#fff0c8",
    sunCol: "#fff4df", sunI: 2.8, sky: "#e6f2ff", ground: "#baa282", hemiI: 0.65,
    bias: -0.0003, normalBias: 0.018,
    skyStops: { c: ["#d8e6f6", "#b6d6f6", "#7eb4ea", "#5292dc", "#3874cc"], e: [0, 4, 10, 22, 45] },
    sat: 1.06, bounce: [0.03, 0.02, 0.01],
    grade: { ky: [0, 0.1, 0.28, 0.60, 0.84, 0.95, 1], sat: [1.0, 1.06, 1.02], tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.005, 0], vig: [0.12, 0.46] },
  },
  day: {
    az: 75, el: 48, lit: [1.58, 1.5, 1.33], shade: [0.30, 0.29, 0.38], lift: [0.05, 0.06, 0.12],
    lambert: 0.35, sideK: 0.84, term: 0.20,
    charTint: [1.0, 0.95, 0.93], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.20, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.60], actorShadow: true,
    fog: "#b8d0ec", fogNear: 26, fogFar: 320, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.9, sky: "#dcecff", ground: "#b49a78", hemiI: 0.58,
    bias: -0.0003, normalBias: 0.018,
    skyStops: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    sat: 1.08, bounce: [0, 0, 0],
    grade: { ky: [0, 0.1, 0.28, 0.60, 0.835, 0.945, 1], sat: [1.0, 1.06, 1.02], tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.006, 0], vig: [0.12, 0.45] },
  },
  golden: {
    az: 12, el: 10, lit: [1.54, 0.78, 0.34], shade: [0.18, 0.17, 0.35], lift: [0.05, 0.06, 0.18],
    lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.0, 0.80, 0.60], charShade: 0.88, charGrad: 0.10, bodyGrad: 0.24, sideTint: [0.85, 0.80, 0.96],
    blob: [0.74, 0.72, 0.90], actorShadow: true,
    fog: "#f0b48a", fogNear: 40, fogFar: 340, sunDisc: "#ffd29e",
    sunCol: "#ffab5e", sunI: 4.8, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.52,
    bias: -0.0005, normalBias: 0.025,
    skyStops: { c: ["#ffc47c", "#f7ae78", "#e8927c", "#be7c8e", "#765c8c"], e: [0, 4, 10, 20, 42] },
    sat: 1.12, bounce: [0.05, 0.02, 0.01],
    grade: { ky: [0, 0.09, 0.25, 0.55, 0.81, 0.935, 1], sat: [1.0, 1.12, 1.14], tintS: [0.02, 0.003], tintM: [0, 0], tintH: [-0.01, 0.006], vig: [0.18, 0.42] },
  },
  cosmic_void: {
    az: 35, el: 34, lit: [1.18, 0.84, 1.48], shade: [0.16, 0.12, 0.28], lift: [0.04, 0.02, 0.09],
    lambert: 0.32, sideK: 0.82, term: 0.15,
    charTint: [0.98, 0.86, 1.06], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.88, 0.72, 1.04],
    blob: [0.55, 0.45, 0.75], actorShadow: true,
    fog: "#160a2c", fogNear: 18, fogFar: 180, sunDisc: "#000000",
    sunCol: "#d8a8ff", sunI: 2.6, sky: "#5e2ca8", ground: "#180a2e", hemiI: 0.62,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#26104a", "#1c0b38", "#120726", "#0b0418", "#06020e"], e: [0, 6, 16, 30, 60] },
    sat: 1.14, bounce: [0.05, 0.01, 0.09],
    grade: { ky: [0, 0.085, 0.24, 0.54, 0.82, 0.95, 1], sat: [1.05, 1.14, 1.15], tintS: [0.018, 0.008], tintM: [0.004, 0.002], tintH: [0, 0], vig: [0.24, 0.38] },
  },
  night_room: {
    az: -55, el: 36, lit: [0.76, 0.92, 1.38], shade: [0.14, 0.18, 0.34], lift: [0.03, 0.05, 0.12],
    lambert: 0.34, sideK: 0.84, term: 0.18,
    charTint: [0.86, 0.94, 1.10], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.76, 0.84, 1.04],
    blob: [0.48, 0.52, 0.72], actorShadow: true,
    fog: "#12203e", fogNear: 16, fogFar: 160, sunDisc: "#000000",
    sunCol: "#98c0ff", sunI: 2.3, sky: "#325294", ground: "#141d34", hemiI: 0.55,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#243868", "#182850", "#101c3c", "#0a1228", "#060a18"], e: [0, 6, 14, 28, 55] },
    sat: 1.08, bounce: [0.02, 0.03, 0.07],
    grade: { ky: [0, 0.09, 0.25, 0.54, 0.82, 0.95, 1], sat: [1.02, 1.08, 1.08], tintS: [0.02, -0.005], tintM: [0.006, 0], tintH: [0, 0], vig: [0.22, 0.4] },
  },
  space: {
    az: 52, el: 28, lit: [1.42, 1.38, 1.52], shade: [0.14, 0.15, 0.28], lift: [0.02, 0.03, 0.07],
    lambert: 0.35, sideK: 0.82, term: 0.16,
    charTint: [0.96, 0.96, 1.06], charShade: 0.85, charGrad: 0.08, bodyGrad: 0.20, sideTint: [0.82, 0.84, 1.04],
    blob: [0.4, 0.4, 0.6], actorShadow: false,
    fog: "#070414", fogNear: 80, fogFar: 500, sunDisc: "#000000",
    sunCol: "#eef4ff", sunI: 2.8, sky: "#423478", ground: "#0a0618", hemiI: 0.5,
    bias: -0.0004, normalBias: 0.02,
    skyStops: { c: ["#180a34", "#100624", "#090418", "#05020e", "#030108"], e: [0, 8, 20, 38, 70] },
    sat: 1.12, bounce: [0.03, 0.02, 0.06],
    grade: { ky: [0, 0.08, 0.24, 0.55, 0.83, 0.95, 1], sat: [1.05, 1.12, 1.14], tintS: [0.015, 0.004], tintM: [0, 0], tintH: [0, 0], vig: [0.22, 0.42] },
  },
};
