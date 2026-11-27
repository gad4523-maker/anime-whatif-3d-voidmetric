// Voidmetric v3.0 Cinematic Anime Camera Choreography Engine (MAPPA / Ufotable 9:16 Safe Primitives!)
export type V3 = [number, number, number];
export type CamState = { pos: V3; look: V3; fov: number; roll: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (u: number) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};

/**
 * Exact 9:16 Safe Camera Distance Guard:
 * Returns minimum Z-distance from a subject of horizontal half-width `subjectHalfW` so it NEVER clips left/right edges!
 */
export function clampSafe916Dist(subjectHalfW: number, fovDeg = 41, marginM = 0.22, aspect = 9 / 16): number {
  const tanHalfX = Math.tan(((fovDeg * Math.PI) / 180) * 0.5) * aspect;
  return (subjectHalfW + marginM) / Math.max(0.05, tanHalfX);
}

/** Smooth 3D cinematic orbit around a focal point `center` */
export function orbitCam(
  center: V3,
  radius: number,
  angStartDeg: number,
  angEndDeg: number,
  heightStart: number,
  heightEnd: number,
  u: number,
  opts: { fov?: number; roll?: number; ease?: boolean } = {}
): CamState {
  const k = opts.ease !== false ? glide(u) : clamp01(u);
  const a = ((angStartDeg + (angEndDeg - angStartDeg) * k) * Math.PI) / 180;
  const h = heightStart + (heightEnd - heightStart) * k;
  return {
    pos: [center[0] + Math.sin(a) * radius, center[1] + h, center[2] + Math.cos(a) * radius],
    look: center,
    fov: opts.fov ?? 41,
    roll: opts.roll ?? 0,
  };
}

/** Tense Dutch-angle dramatic push-in (ideal for mid-video twist question & horror reveals!) */
export function dutchPush(
  target: V3,
  distStart: number,
  distEnd: number,
  u: number,
  opts: { rollDeg?: number; fov?: number; yOff?: number; xOff?: number } = {}
): CamState {
  const k = glide(u);
  const d = distStart + (distEnd - distStart) * k;
  const r = ((opts.rollDeg ?? -7.5) * Math.PI) / 180;
  return {
    pos: [target[0] + (opts.xOff ?? 0), target[1] + (opts.yOff ?? 0.04), target[2] + d],
    look: target,
    fov: opts.fov ?? 39,
    roll: r * (0.45 + 0.55 * k),
  };
}

/** Rapid anime snap crash-zoom into a face or palm VFX right on beat impact! */
export function crashZoom(
  target: V3,
  distStart: number,
  distEnd: number,
  u: number,
  opts: { fovStart?: number; fovEnd?: number; rollDeg?: number; xOff?: number; yOff?: number } = {}
): CamState {
  const k = 1 - Math.pow(1 - clamp01(u), 3.6); // fast explosive snap-in, crisp settle!
  const d = distStart + (distEnd - distStart) * k;
  const fov = (opts.fovStart ?? 44) + ((opts.fovEnd ?? 34) - (opts.fovStart ?? 44)) * k;
  return {
    pos: [target[0] + (opts.xOff ?? 0), target[1] + (opts.yOff ?? 0.02), target[2] + d],
    look: target,
    fov,
    roll: (((opts.rollDeg ?? 0) * Math.PI) / 180) * k,
  };
}

/** Dramatic low-angle heroic shonen reveal looking slightly up at a towering character/aura! */
export function lowAngleHero(
  target: V3,
  dist: number,
  u: number,
  opts: { swayX?: number; fov?: number; rollDeg?: number } = {}
): CamState {
  const k = glide(u);
  const sx = (opts.swayX ?? 0.55) * (k - 0.5);
  return {
    pos: [target[0] + sx, Math.max(0.35, target[1] - 0.52), target[2] + dist],
    look: [target[0], target[1] + 0.14, target[2]],
    fov: opts.fov ?? 42,
    roll: (((opts.rollDeg ?? -2.5) * Math.PI) / 180) * (1 - k * 0.6),
  };
}

/** Over-the-shoulder anime confrontation framing (MC foreground edge -> rival/target!) */
export function overShoulder(
  actorPos: V3,
  targetPos: V3,
  u: number,
  opts: { side?: -1 | 1; backDist?: number; fov?: number } = {}
): CamState {
  const side = opts.side ?? 1;
  const k = glide(u);
  const dx = targetPos[0] - actorPos[0];
  const dz = targetPos[2] - actorPos[2];
  const len = Math.max(0.01, Math.hypot(dx, dz));
  const fx = dx / len, fz = dz / len;
  const rx = -fz, rz = fx;
  const back = (opts.backDist ?? 1.45) - k * 0.25;
  return {
    pos: [actorPos[0] - fx * back + rx * side * 0.52, actorPos[1] + 1.56, actorPos[2] - fz * back + rz * side * 0.52],
    look: [targetPos[0], targetPos[1] + 1.38, targetPos[2]],
    fov: opts.fov ?? 39,
    roll: side * 0.015,
  };
}

/** Subtle organic anime handheld camera breath (eliminates stiff robotic tripod feel!) */
export function handheldBreath(c: CamState, t: number, intensity = 1.0): CamState {
  const bx = Math.sin(t * 1.9) * 0.016 * intensity;
  const by = Math.cos(t * 2.5) * 0.012 * intensity;
  const br = Math.sin(t * 1.3) * 0.004 * intensity;
  return {
    pos: [c.pos[0] + bx, c.pos[1] + by, c.pos[2]],
    look: [c.look[0] + bx * 0.35, c.look[1] + by * 0.35, c.look[2]],
    fov: c.fov,
    roll: c.roll + br,
  };
}

/** Punchy damped impact camera shake (`kicks = [[frame, amplitude], ...]`) */
export function applyCameraKicks(c: CamState, f: number, kicks: [number, number][]): CamState {
  let kx = 0, ky = 0, kr = 0;
  for (const [f0, amp] of kicks) {
    const d = f - f0;
    if (d >= 0 && d < 9) {
      const s = d % 2 === 0 ? 1 : -1;
      const decay = Math.pow(Math.max(0, 1 - d / 9), 1.8) * amp;
      kx += s * decay * 0.42;
      ky += s * decay * 0.26;
      kr += s * decay * 0.045;
    }
  }
  return {
    pos: [c.pos[0] + kx, c.pos[1] + ky, c.pos[2]],
    look: [c.look[0] + kx * 0.4, c.look[1] + ky * 0.4, c.look[2]],
    fov: c.fov,
    roll: c.roll + kr,
  };
}
