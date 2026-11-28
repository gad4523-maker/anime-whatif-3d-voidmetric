// Voidmetric v4.1 Minimal Zero-Hardcoding Episode Timeline Starter
// Replace shots, custom camera trajectories, lighting moods, Sakuga punctuation, shockwaves, and picture-locked audio events!
import { EpisodeLightName } from "./lights";
import { ShockwaveState } from "../bridge/filmoptics";
import {
  CamKey,
  CamState,
  V3,
  applyImpactKicks15Hz,
  dollyPush,
  focusOnPoint,
  glide,
  pushK,
  rolledCam,
  runCamKeys,
} from "./cam3d_core";
import { HitStopCue, ImpactFrameCue, KiteBoltCue, SpeedlineCue } from "./sakuga_fx";

export const FPS = 30;
export const TOTAL = 390; // Set to exact voiceover frame count (`Math.ceil(dur_s * 30)`)
export const EPISODE_POWER_COLOR = "#38d8ff";
export const EPISODE_POWER_CORE = "#eefcff";
export { glide };
export type { CamState, V3 };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const Z_STAGE_A = 0;
export const Z_STAGE_B = 120;

export type ShotDef = {
  id: number;
  name: string;
  a: number;
  b: number;
  zone: number;
  light: EpisodeLightName;
  dof: { cInf: number; focusDist?: number };
};

export type ShockwaveCue = {
  f: number;
  dur: number;
  center?: [number, number];
  r0?: number;
  r1?: number;
  width?: number;
  amp?: number;
  ca?: number;
  rag?: number;
  seed?: number;
};

export type AudioEventCue = {
  f: number;
  kind: string;
  gain?: number;
  pan?: number;
  dur?: number;
  lane?: "hits" | "hero" | "foley" | "amb";
  duckDb?: number;
  riseFrames?: number;
  space?: Record<string, unknown> | false;
  params?: Record<string, unknown>;
  label?: string;
};

export const SHOTS: ShotDef[] = [
  { id: 1, name: "shot_1", a: 0, b: 180, zone: Z_STAGE_A, light: "base", dof: { cInf: 11 } },
  { id: 2, name: "shot_2", a: 180, b: TOTAL, zone: Z_STAGE_B, light: "base", dof: { cInf: 10 } },
];

export const XFADE: Record<number, number> = { 2: 6 };
export const FLASHES: { f: number; dur: number; tint?: string }[] = [{ f: 186, dur: 4, tint: "#e0f6ff" }];
export const KICKS: [number, number][] = [[184, 1.2]];
export const IMPACT_FRAMES: ImpactFrameCue[] = [];
export const SPEEDLINES: SpeedlineCue[] = [];
export const KITE_BOLTS: KiteBoltCue[] = [];
export const HIT_STOPS: HitStopCue[] = [];
export const SHOCKWAVES: ShockwaveCue[] = [];
export const USE_CHROMAO = false; // Set true to enable chromatic N8AO architectural & character contact shadows!
export const KUWAHARA: { a: number; b: number; strength: number; radius?: number }[] = []; // Optional painterly brush pass!

// Picture-locked audio cues extracted automatically via `whatif_cli.py extract-events` into `audio/events.json`!
export const AUDIO_EVENTS: AudioEventCue[] = [
  { f: 184, kind: "shock_ring", lane: "hero", gain: 0.78, duckDb: 4.0, riseFrames: 8, label: "Act transition pulse" },
];

export const kuwaharaAt = (f: number): { strength: number; radius: number } => {
  for (const k of KUWAHARA) {
    if (f >= k.a && f < k.b) return { strength: k.strength, radius: k.radius ?? 3.0 };
  }
  return { strength: 0, radius: 3.0 };
};

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) {
      return [
        { id: s.id - 1, alpha: 1 },
        { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) },
      ];
    }
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const flashAt = (f: number): { alpha: number; color: string } => {
  for (const fl of FLASHES) {
    if (f >= fl.f && f < fl.f + fl.dur) {
      const k = 1 - (f - fl.f) / fl.dur;
      return { alpha: k * k * 0.9, color: fl.tint || "#ffffff" };
    }
  }
  return { alpha: 0, color: "#ffffff" };
};

export const shockwaveAt = (f: number): ShockwaveState | null => {
  for (const sw of SHOCKWAVES) {
    if (f >= sw.f && f < sw.f + sw.dur) {
      const u = clamp01((f - sw.f) / Math.max(1, sw.dur));
      const easeOut = 1 - Math.pow(1 - u, 2.2);
      const env = Math.sin(Math.min(1, u * 5) * Math.PI * 0.5) * Math.pow(1 - u, 1.35);
      return {
        center: sw.center ?? [0.5, 0.5],
        radius: (sw.r0 ?? 0.04) + ((sw.r1 ?? 0.62) - (sw.r0 ?? 0.04)) * easeOut,
        width: sw.width ?? 0.055,
        amp: (sw.amp ?? 0.022) * env,
        ca: sw.ca ?? 3.4,
        rag: sw.rag ?? 0.11,
        seed: (sw.seed ?? 1.0) + (f - sw.f) * 0.18,
      };
    }
  }
  return null;
};

export const lightForShot = (id: number, _f: number): EpisodeLightName => SHOTS[id - 1].light;

// Author 100% custom multi-keyframe camera angles, heights, orbits, cranes & trajectories per shot!
const S1a = (f: number) => dollyPush([Z_STAGE_A + 0.55, 1.48, 3.6], [Z_STAGE_A, 1.38, 0], pushK(f, 0, 0.0028), { fov: 42 });
const S1b = (f: number) => dollyPush([Z_STAGE_A - 0.35, 1.54, 2.35], [Z_STAGE_A, 1.46, 0], pushK(f, 52, 0.0024, 0.006, 30), { fov: 39, roll: -0.05 });
const S1c = (f: number) => dollyPush([Z_STAGE_A + 0.25, 1.56, 1.95], [Z_STAGE_A, 1.50, 0], pushK(f, 118, 0.0026), { fov: 37, roll: 0.05 });

const S2a = (f: number) => dollyPush([Z_STAGE_B - 0.85, 0.95, 4.9], [Z_STAGE_B, 1.28, 0], pushK(f, 180, 0.0028, 0.006, 34), { fov: 42, roll: -0.06 });
const S2b = (f: number) => dollyPush([Z_STAGE_B + 0.65, 1.48, 2.75], [Z_STAGE_B, 1.44, 0], pushK(f, 255, 0.0025), { fov: 38, roll: 0.05 });

const CAMS: Record<number, CamKey[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 52, dur: 26, s: S1b },
    { f: 118, dur: 24, s: S1c },
  ],
  2: [
    { f: 180, s: S2a },
    { f: 255, dur: 28, s: S2b },
    { f: 340, dur: 22, s: rolledCam(S2b, -0.06) },
  ],
};

export const camAt = (id: number, f: number): CamState => {
  const keys = CAMS[id] ?? CAMS[1];
  return applyImpactKicks15Hz(runCamKeys(keys, f), f, KICKS);
};

export const dofAt = (id: number, f: number): { cInf: number; focusDist?: number } => {
  const s = SHOTS[id - 1];
  return {
    cInf: s.dof.cInf,
    focusDist: s.dof.focusDist ?? focusOnPoint(camAt(id, f), [s.zone, 1.42, 0]),
  };
};
