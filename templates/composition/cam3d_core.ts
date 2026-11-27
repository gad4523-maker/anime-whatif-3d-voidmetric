// Voidmetric v4.0 Pure Camera Math & Multi-Keyframe Interpolation Engine (ZERO Hardcoded Camera Angles!)
// Every shot's camera position, angle, height, lens FOV, roll, and path is authored 100% custom per episode
// as `{ pos, look, fov, roll }`. This module provides ONLY pure math/timing/DOF/whip-blur utilities.
export type V3 = [number, number, number];
export type CamState = { pos: V3; look: V3; fov: number; roll: number };
export type CamShotPartial = Partial<CamState> & { pos: V3; look: V3 };
export type CamKey = {
  /** Frame at which this camera keyframe begins */
  f: number;
  /** Symmetric smootherstep glide duration in frames (e.g. 18-36f smooth glide, 8-14f fast blurred whip) */
  dur?: number;
  /** Instant hard cut to this custom camera framing */
  cut?: boolean;
  /** Evaluates ANY custom camera state `{ pos, look, fov, roll }` at frame `f` */
  s: (f: number) => CamShotPartial;
};
export type DofState = { cInf: number; focusDist: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Symmetric C2 smootherstep curve (0 -> 1) */
export const glide = (u: number) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};

/** Continuous non-stalling blend curve (keeps velocity non-zero at endpoints) */
export const flowEase = (u: number) => {
  const x = clamp01(u);
  return 0.45 * x + 0.55 * glide(x);
};

/**
 * 9:16 Vertical Safe Distance Math:
 * Returns minimum Z-distance for a subject of horizontal half-width `subjectHalfW` at a given `fovDeg`.
 */
export function clampSafe916Dist(subjectHalfW: number, fovDeg = 41, marginM = 0.22, aspect = 9 / 16): number {
  const tanHalfX = Math.tan(((fovDeg * Math.PI) / 180) * 0.5) * aspect;
  return (subjectHalfW + marginM) / Math.max(0.05, tanHalfX);
}

/**
 * Evaluates a multi-keyframe camera timeline for a shot (`runCamKeys(keys, f)`).
 * Chains ANY custom camera functions through smooth symmetric `glide()` transitions or hard cuts (`cut: true`).
 */
const fillCam = (c: CamShotPartial): CamState => ({ fov: 40, roll: 0, ...c });

const mixCam = (a: CamState, b: CamState, k: number): CamState => ({
  pos: [
    a.pos[0] + (b.pos[0] - a.pos[0]) * k,
    a.pos[1] + (b.pos[1] - a.pos[1]) * k,
    a.pos[2] + (b.pos[2] - a.pos[2]) * k,
  ],
  look: [
    a.look[0] + (b.look[0] - a.look[0]) * k,
    a.look[1] + (b.look[1] - a.look[1]) * k,
    a.look[2] + (b.look[2] - a.look[2]) * k,
  ],
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});

export function runCamKeys(keys: CamKey[], f: number): CamState {
  let cur = fillCam(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? fillCam(k.s(f)) : mixCam(cur, fillCam(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
}

/**
 * Exponential push/pull factor since frame `f0` with optional soft-ramped surge (`punch` over `punchFrames`).
 */
export function pushK(f: number, f0: number, rate = 0.0026, punch = 0, punchFrames = 32): number {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) {
    const steps = Math.min(Math.floor(x), punchFrames);
    for (let i = 0; i < steps; i++) {
      const env = Math.max(0, Math.min(1, (i + 0.5) / 8, (punchFrames - i - 0.5) / 8));
      s += (punch - rate) * env;
    }
  }
  return Math.exp(-s);
}

/** Scales camera-to-look distance by factor `k` (pure vector math for physical dolly push/pull). */
export function dollyPush(pos: V3, look: V3, k: number, rest: Partial<CamState> = {}): CamShotPartial {
  return {
    pos: [
      look[0] + (pos[0] - look[0]) * k,
      look[1] + (pos[1] - look[1]) * k,
      look[2] + (pos[2] - look[2]) * k,
    ],
    look,
    ...rest,
  };
}

/** Scales lens `fov` by factor `k` (pure optical zoom push/pull). */
export function zoomPush(pos: V3, look: V3, fov: number, k: number, rest: Partial<CamState> = {}): CamShotPartial {
  return { pos, look, fov: Math.max(16, Math.min(72, fov * k)), ...rest };
}

/** Wraps any custom camera state generator with an additive roll offset (radians). */
export function rolledCam(base: (f: number) => CamShotPartial, roll: number): (f: number) => CamShotPartial {
  return (f: number) => {
    const c = base(f);
    return { ...c, roll: (c.roll ?? 0) + roll };
  };
}

/**
 * Crisp 7-frame sign-alternating 15 Hz impact recoil displacement on `[frame, strength]` hit cues.
 */
export function applyImpactKicks15Hz(cam: CamState, f: number, kicks: [number, number][]): CamState {
  let dx = 0;
  let dy = 0;
  let dr = 0;
  for (const [kf, strength] of kicks) {
    const j = Math.floor(f) - kf;
    if (j >= 0 && j < 7) {
      const sign = j % 2 === 0 ? 1 : -1;
      const amp = Math.exp(-j * 0.44) * strength;
      dx += sign * amp * 0.042;
      dy += sign * amp * 0.036;
      dr += sign * amp * 0.018;
    }
  }
  if (dx === 0 && dy === 0 && dr === 0) return cam;
  return {
    pos: [cam.pos[0] + dx, cam.pos[1] + dy, cam.pos[2]],
    look: [cam.look[0] + dx * 0.72, cam.look[1] + dy * 0.72, cam.look[2]],
    fov: cam.fov,
    roll: cam.roll + dr,
  };
}

/**
 * Smoothly shifts DOF `focusDist` between two depths (`u` in `0..1`) for rack-focus pulls.
 */
export function rackFocusPull(
  distFrom: number,
  distTo: number,
  u: number,
  opts: { pullStart?: number; pullEnd?: number; cInf?: number } = {}
): DofState {
  const a = opts.pullStart ?? 0.25;
  const b = opts.pullEnd ?? 0.65;
  const k = glide((clamp01(u) - a) / Math.max(1e-4, b - a));
  return {
    focusDist: distFrom + (distTo - distFrom) * k,
    cInf: opts.cInf ?? 12.5,
  };
}

/**
 * Exact view-axis DOF focus distance from `cam` onto any 3D world point `subjectPos`.
 * Keeps the hero subject razor-sharp under shallow cinema DOF even when `cam.look` aims past/above it.
 */
export function focusOnPoint(cam: CamState, subjectPos: V3): number {
  const fx = cam.look[0] - cam.pos[0];
  const fy = cam.look[1] - cam.pos[1];
  const fz = cam.look[2] - cam.pos[2];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  const rx = subjectPos[0] - cam.pos[0];
  const ry = subjectPos[1] - cam.pos[1];
  const rz = subjectPos[2] - cam.pos[2];
  return Math.max(0.4, (rx * fx + ry * fy + rz * fz) / fLen);
}

/**
 * Computes per-frame screen-space velocity `[vx, vy]` in UV units for the 16-tap GLSL `WhipBlur` pass.
 * Returns `[0, 0]` on normal glides and hard cuts; activates automatically on genuine fast whip pans.
 */
export function computeWhipVelUV(now: CamState, next: CamState, aspect = 9 / 16): [number, number] {
  const f1x = now.look[0] - now.pos[0];
  const f1y = now.look[1] - now.pos[1];
  const f1z = now.look[2] - now.pos[2];
  const len1 = Math.hypot(f1x, f1y, f1z) || 1;
  const d1x = f1x / len1, d1y = f1y / len1, d1z = f1z / len1;

  const f2x = next.look[0] - next.pos[0];
  const f2y = next.look[1] - next.pos[1];
  const f2z = next.look[2] - next.pos[2];
  const len2 = Math.hypot(f2x, f2y, f2z) || 1;
  const d2x = f2x / len2, d2y = f2y / len2, d2z = f2z / len2;

  const posJump = Math.hypot(next.pos[0] - now.pos[0], next.pos[1] - now.pos[1], next.pos[2] - now.pos[2]);
  const dotFwd = Math.max(-1, Math.min(1, d1x * d2x + d1y * d2y + d1z * d2z));
  if (posJump > 6.0 || dotFwd < 0.75) return [0, 0];

  const rx = -d1z, rz = d1x;
  const rLen = Math.hypot(rx, rz) || 1;
  const rnx = rx / rLen, rnz = rz / rLen;
  const ux = d1y * rnz, uy = d1z * rnx - d1x * rnz, uz = -d1y * rnx;

  const tanHalfY = Math.tan(((now.fov * Math.PI) / 180) * 0.5);
  const tanHalfX = tanHalfY * aspect;
  const dAngX = (d2x - d1x) * rnx + (d2z - d1z) * rnz;
  const dAngY = (d2x - d1x) * ux + (d2y - d1y) * uy + (d2z - d1z) * uz;
  const dLatX = ((next.pos[0] - now.pos[0]) * rnx + (next.pos[2] - now.pos[2]) * rnz) / Math.max(0.5, len1);
  const dLatY = ((next.pos[0] - now.pos[0]) * ux + (next.pos[1] - now.pos[1]) * uy + (next.pos[2] - now.pos[2]) * uz) / Math.max(0.5, len1);

  const uvX = (dAngX - dLatX) / Math.max(0.1, 2 * tanHalfX);
  const uvY = (dAngY - dLatY) / Math.max(0.1, 2 * tanHalfY);
  const mag = Math.hypot(uvX, uvY);
  if (mag < 0.062) return [0, 0];
  const scale = Math.min(0.15, mag * 0.5) / mag;
  return [uvX * scale, uvY * scale];
}
