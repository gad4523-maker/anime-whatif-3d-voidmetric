// Voidmetric v3.0 Starter Episode Timeline, Cinematic Camera & Sakuga Impact Choreography!
import { EpisodeLightName } from "./lights";
import { CamState, V3, applyCameraKicks, glide, handheldBreath, lowAngleHero, orbitCam } from "./cam3d_core";
import { HitStopCue, ImpactFrameCue, SpeedlineCue } from "./sakuga_fx";

export const FPS = 30;
export const TOTAL = 1800; // Update to exact voiceover frame count (`Math.ceil(dur_s * 30)`)
export const EPISODE_POWER_COLOR = "#38d8ff"; // Customize to the anime character's canonical power color!
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
  { id: 1, name: "hook_wake", a: 0, b: 900, zone: Z_HOME, light: "morning", dof: { cInf: 8 } },
  { id: 2, name: "guest_reveal", a: 900, b: TOTAL, zone: Z_VOID, light: "cosmic_void", dof: { cInf: 6 } },
];

export const XFADE: Record<number, number> = { 2: 6 };
export const FLASHES: { f: number; dur: number; tint?: string }[] = [{ f: 906, dur: 4, tint: "#e0f6ff" }];
export const KICKS: [number, number][] = [[904, 0.16]];
export const IMPACT_FRAMES: ImpactFrameCue[] = [{ f: 904, dur: 2, style: "bw_invert" }];
export const SPEEDLINES: SpeedlineCue[] = [{ a: 904, b: 965, intensity: 0.65, color: "#ffffff", innerRadius: 0.32 }];
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

export const camAt = (id: number, f: number): CamState => {
  const s = SHOTS[id - 1];
  const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
  const t = f / FPS;
  const ox = s.zone;
  const base: CamState =
    id === 1
      ? orbitCam([ox, 1.26, 0], 4.45 - u * 0.35, -8, 10, 0.16, 0.12, u, { fov: 41 })
      : lowAngleHero([ox, 1.24, 0], 4.85 - glide(u) * 0.35, u, { swayX: 0.65, fov: 41 });
  return applyCameraKicks(handheldBreath(base, t, 0.7), f, KICKS);
};

export const dofAt = (id: number, _f: number): { cInf: number; focusDist?: number } => SHOTS[id - 1].dof;
