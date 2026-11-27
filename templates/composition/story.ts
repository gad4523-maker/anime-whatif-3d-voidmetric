// Starter Episode Timeline & 9:16 Safe-Framing Camera Choreography (replace SHOTS/camAt with episode beats!)
import { EpisodeLightName } from "./lights";

export const FPS = 30;
export const TOTAL = 1800; // Update to exact voiceover frame count (`Math.ceil(dur_s * 30)`)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (u: number) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};

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
export const FLASHES: { f: number; dur: number; tint?: string }[] = [{ f: 900, dur: 5, tint: "#f0dcff" }];
export const KICKS: [number, number][] = [[902, 0.14]];

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

export type CamState = { pos: V3; look: V3; fov: number; roll: number };

const addKick = (c: CamState, f: number): CamState => {
  let kx = 0, ky = 0, kr = 0;
  for (const [f0, amp] of KICKS) {
    const d = f - f0;
    if (d >= 0 && d < 8) {
      const s = d % 2 === 0 ? 1 : -1;
      const decay = Math.pow(1 - d / 8, 1.8) * amp;
      kx += s * decay * 0.4;
      ky += s * decay * 0.25;
      kr += s * decay * 0.04;
    }
  }
  return {
    pos: [c.pos[0] + kx, c.pos[1] + ky, c.pos[2]],
    look: [c.look[0] + kx * 0.4, c.look[1] + ky * 0.4, c.look[2]],
    fov: c.fov,
    roll: c.roll + kr,
  };
};

export const camAt = (id: number, f: number): CamState => {
  const s = SHOTS[id - 1];
  const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
  const ox = s.zone;
  const c: CamState =
    id === 1
      ? { pos: [ox - 0.15 + u * 0.3, 1.42, 4.6 - u * 0.35], look: [ox, 1.25, 0], fov: 41, roll: 0.01 * u }
      : { pos: [ox - 0.35 + glide(u) * 0.7, 1.25, 5.2 - glide(u) * 0.4], look: [ox, 1.25, 0], fov: 41, roll: -0.02 + 0.04 * u };
  return addKick(c, f);
};

export const dofAt = (id: number, _f: number): { cInf: number; focusDist?: number } => SHOTS[id - 1].dof;
