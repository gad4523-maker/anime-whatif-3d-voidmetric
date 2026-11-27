// Voidmetric v3.6 Anti-Tripod Multi-Keyframe Cinema Timeline & Pacing Starter!
// Proven Rick's Clips + mromidev camera grammar:
//   - NEVER 1 static keyframe for 4-6 s! Chain 2-4 `CamKey` moves per shot via `runCamKeys(CAMS[id], f)`.
//   - Every hold pushes in exponentially via `dollyPush(..., pushK(f, f0, 0.0026))` (`+25%` real visual growth over 3 s!)
//     and surges with `punch = 0.006` for `32 f` on punch words!
//   - Same-room reframes use symmetric `glide` (`dur: 18-32 f`), big reframes use `cut: true`, fast whips (`dur: 8-12 f`)
//     auto-trigger `WhipBlur`, place jumps use `6-8 f` `XFADE`, emphasis words glide `±4°-8°` roll (`rolledCam`),
//     and impacts fire 7-frame 15 Hz kicks (`applyImpactKicks15Hz`) — zero fake tripod jitter!
import { EpisodeLightName } from "./lights";
import {
  CamKey,
  CamState,
  V3,
  applyImpactKicks15Hz,
  dollyPush,
  glide,
  pushK,
  rolledCam,
  runCamKeys,
} from "./cam3d_core";
import { HitStopCue, ImpactFrameCue, SpeedlineCue } from "./sakuga_fx";

export const FPS = 30;
export const TOTAL = 390; // Update to exact voiceover frame count (`Math.ceil(dur_s * 30)`, ~1650-1860 for ~55-62s!)
export const EPISODE_POWER_COLOR = "#38d8ff";
export const EPISODE_POWER_CORE = "#eefcff";
export { glide };
export type { CamState, V3 };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const Z_HOME = 0;
export const Z_VOID = 120;

export type ShotDef = {
  id: number;
  name: string;
  a: number;
  b: number;
  zone: number;
  light: EpisodeLightName;
  dof: { cInf: number; focusDist?: number };
};

export const SHOTS: ShotDef[] = [
  { id: 1, name: "hook_wake", a: 0, b: 180, zone: Z_HOME, light: "morning", dof: { cInf: 12 } },
  { id: 2, name: "guest_reveal", a: 180, b: TOTAL, zone: Z_VOID, light: "cosmic_void", dof: { cInf: 10 } },
];

export const XFADE: Record<number, number> = { 2: 6 };
export const FLASHES: { f: number; dur: number; tint?: string }[] = [{ f: 186, dur: 4, tint: "#e0f6ff" }];
export const KICKS: [number, number][] = [[184, 1.2]];
export const IMPACT_FRAMES: ImpactFrameCue[] = [{ f: 184, dur: 2, style: "bw_invert" }];
export const SPEEDLINES: SpeedlineCue[] = [{ a: 184, b: 245, intensity: 0.65, color: "#ffffff", innerRadius: 0.32 }];
export const HIT_STOPS: HitStopCue[] = [];

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

export const lightForShot = (id: number, _f: number): EpisodeLightName => SHOTS[id - 1].light;

// Multi-keyframe `CAMS` timeline: 2-4 deliberate camera moves per 3-6 s shot!
const S1a = (f: number) => dollyPush([Z_HOME + 0.55, 1.48, 3.6], [Z_HOME, 1.38, 0], pushK(f, 0, 0.0028), { fov: 42 });
const S1b = (f: number) => dollyPush([Z_HOME - 0.35, 1.54, 2.35], [Z_HOME, 1.46, 0], pushK(f, 52, 0.0024, 0.006, 30), { fov: 39, roll: -0.05 });
const S1c = (f: number) => dollyPush([Z_HOME + 0.25, 1.56, 1.95], [Z_HOME, 1.50, 0], pushK(f, 118, 0.0026), { fov: 37, roll: 0.05 });

const S2a = (f: number) => dollyPush([Z_VOID - 0.85, 0.95, 4.9], [Z_VOID, 1.28, 0], pushK(f, 180, 0.0028, 0.006, 34), { fov: 42, roll: -0.06 });
const S2b = (f: number) => dollyPush([Z_VOID + 0.65, 1.48, 2.75], [Z_VOID, 1.44, 0], pushK(f, 255, 0.0025), { fov: 38, roll: 0.05 });

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

export const dofAt = (id: number, _f: number): { cInf: number; focusDist?: number } => SHOTS[id - 1].dof;
