// Voidmetric v3.6 Multi-Keyframe Cinema Camera Engine (Rick's Clips + mromidev motion.md Anti-Tripod Grammar!)
// Core proven targets:
//   - Median camera speed 1.7-3.6 px/f (720p), 5-7.5 deliberate moves per 10 seconds, ZERO tripod holds!
//   - Every hold uses exponential `pushK` (`rate = 0.0022-0.0035/f` base; `punch = 0.006/f` for ~35f on punch words!)
//   - Same-set reframes <= 0.5 frame width / <= 40% zoom: symmetric `glide()` over 18-36f via `runCamKeys(keys, f)`
//   - Larger reframes: crisp hard cut (`cut: true`) or directional-blurred whip (`dur: 8-14`, auto `WhipBlur`!)
//   - Emphasis beats: glided roll `±4°-8°` (`0.07-0.14 rad`) over 18-24f; hits: 7-frame 15Hz sign-flipping kicks!
export type V3 = [number, number, number];
export type CamState = { pos: V3; look: V3; fov: number; roll: number };
export type CamShotPartial = Partial<CamState> & { pos: V3; look: V3 };
export type CamKey = {
  /** Frame at which this camera keyframe begins (for glides, start ~dur/2 before the spoken beat!) */
  f: number;
  /** Symmetric smootherstep glide duration in frames (18-36f normal glide; 8-14f blurred whip-pan!) */
  dur?: number;
  /** Instant hard cut to this framing (use for reframes > 0.5 frame width or > 40% zoom!) */
  cut?: boolean;
  /** Evaluates the target camera state (usually `dollyPush(...)` or `zoomPush(...)` with `pushK(...)`!) */
  s: (f: number) => CamShotPartial;
};
export type DofState = { cInf: number; focusDist: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (u: number) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};
/** Continuous non-stalling cinema curve: silky ease without freezing camera velocity to 0 at u=0 / u=1 (0% held frames!) */
export const flowEase = (u: number) => {
  const x = clamp01(u);
  return 0.45 * x + 0.55 * glide(x);
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
  const k = opts.ease !== false ? flowEase(u) : clamp01(u);
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
  const k = flowEase(u);
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
  const k = flowEase(u);
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

/**
 * Shallow-DOF Rack-Focus Pull (drives `LensBlur` `focusDist` & `cInf` directly inside `dofAt(id, f)`!).
 * Holds crisp focus on a foreground prop (`focusA`, e.g. 0.85 m) while blurring the background actor,
 * then snaps focus smoothly to the background subject (`focusB`, e.g. 2.6 m) between `pullStart` and `pullEnd`!
 */
export function rackFocusPull(
  focusA: number,
  focusB: number,
  u: number,
  opts: { pullStart?: number; pullEnd?: number; cInf?: number } = {}
): DofState {
  const s0 = opts.pullStart ?? 0.35;
  const s1 = opts.pullEnd ?? 0.68;
  const raw = (clamp01(u) - s0) / Math.max(0.01, s1 - s0);
  const k = glide(clamp01(raw));
  return {
    focusDist: focusA + (focusB - focusA) * k,
    cInf: opts.cInf ?? 13.5,
  };
}

/**
 * Extreme Macro Prop / Eye / Dial Insert Camera (`0.55–1.25 m`, narrow cinema telephoto FOV 34–38°).
 * Ideal for diegetic storytelling props (alarm clocks, flasks, phone alerts, exam scores, eye reflections)!
 */
export function macroInsertCam(
  target: V3,
  distStart: number,
  distEnd: number,
  u: number,
  opts: { angleDeg?: number; yOff?: number; fov?: number; rollDeg?: number } = {}
): CamState {
  const k = flowEase(u);
  const d = distStart + (distEnd - distStart) * k;
  const a = ((opts.angleDeg ?? 10) * Math.PI) / 180;
  return {
    pos: [target[0] + Math.sin(a) * d, target[1] + (opts.yOff ?? 0.05), target[2] + Math.cos(a) * d],
    look: target,
    fov: opts.fov ?? 36,
    roll: ((opts.rollDeg ?? -1.5) * Math.PI) / 180,
  };
}

/**
 * First-Person POV Camera looking out over hands, a workbench, notebook, smartphone, or steering wheel!
 * Uses wide immersive FOV (`48–54°`) and subtle organic head sway so the viewer feels INSIDE the character's eyes.
 */
export function povCam(
  eyePos: V3,
  lookTarget: V3,
  u: number,
  opts: { swayX?: number; bobY?: number; fov?: number; rollDeg?: number } = {}
): CamState {
  const k = flowEase(u);
  const sx = Math.sin(k * Math.PI * 2) * (opts.swayX ?? 0.05);
  const by = Math.sin(k * Math.PI * 3) * (opts.bobY ?? 0.02);
  return {
    pos: [eyePos[0] + sx, eyePos[1] + by, eyePos[2]],
    look: [lookTarget[0] + sx * 0.4, lookTarget[1] + by * 0.3, lookTarget[2]],
    fov: opts.fov ?? 50,
    roll: ((opts.rollDeg ?? 0) * Math.PI) / 180 + sx * 0.18,
  };
}

/**
 * Dramatic Pull-Back Crane Reveal (starts intimate on a window/clue/face, then pulls & lifts out to reveal massive scale!).
 */
export function craneRevealPull(
  target: V3,
  nearDist: number,
  farDist: number,
  liftY: number,
  u: number,
  opts: { driftX?: number; fovStart?: number; fovEnd?: number } = {}
): CamState {
  const k = flowEase(u);
  const d = nearDist + (farDist - nearDist) * k;
  const x = (opts.driftX ?? 0.35) * k;
  const f0 = opts.fovStart ?? 38;
  const f1 = opts.fovEnd ?? 46;
  return {
    pos: [target[0] + x, target[1] + liftY * k, target[2] + d],
    look: [target[0], target[1] + liftY * 0.28 * k, target[2]],
    fov: f0 + (f1 - f0) * k,
    roll: 0,
  };
}

// ---------------------------------------------------------------------------
// v3.6 Anti-Tripod Multi-Keyframe Timeline Engine (`mromidev` + Rick's Clips!)
// ---------------------------------------------------------------------------

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

/**
 * Evaluates a multi-keyframe camera timeline for a shot (`2-4` keys per 3-6 s shot!).
 * Chains continuous exponential push-ins (`dollyPush`/`zoomPush`) through symmetric `glide()` transitions
 * (`dur: 18-36` f) or crisp hard cuts (`cut: true`) so the camera NEVER feels bolted to a tripod!
 */
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
 * Exponential push-in scale factor since frame `f0` (matches mromidev motion.md 5.1b!):
 * - Quiet holds: `rate = 0.0022..0.0035` (+22%..35% real visual growth over 3 s!)
 * - Punch words: pass `punch = 0.006, punchFrames = 32` (+22% visceral surge over 1.1 s with 8f soft ramps!)
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

/** Exponential dolly toward `look` by factor `k` (from `pushK`). Moves the camera physically for rich 3D parallax! */
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

/** Exponential optical lens zoom (camera stays put — ideal inside tight walls/corridors so lens never clips walls!). */
export function zoomPush(pos: V3, look: V3, baseFov: number, k: number, rest: Partial<CamState> = {}): CamShotPartial {
  return {
    pos,
    look,
    fov: (360 / Math.PI) * Math.atan(Math.tan((baseFov * Math.PI) / 360) * k),
    ...rest,
  };
}

/** Convenience wrapper to add a glided emphasis roll (`±0.07..0.14 rad` = `±4°..8°`) on top of an existing framing! */
export function rolledCam(s: (f: number) => CamShotPartial, rollRad: number): (f: number) => CamShotPartial {
  return (f: number) => ({ ...s(f), roll: rollRad });
}

/**
 * Exact 7-frame 15 Hz sign-alternating cinema impact kick (`kicks = [[impactFrame, strength], ...]`).
 * Calibrated by distance & FOV (`~3 px` at 720p per unit + `±0.23°` roll per unit, zero slow wobble!).
 */
export function applyImpactKicks15Hz(c: CamState, f: number, kicks: [number, number][]): CamState {
  let a = 0;
  for (const [f0, g] of kicks) {
    const n = Math.floor(f - f0 + 1e-6);
    if (n >= 0 && n < 7) {
      a += g * (n % 2 ? -1 : 1) * Math.pow(1 - n / 7, 1.5);
    }
  }
  if (!a) return c;
  const dx = c.look[0] - c.pos[0];
  const dy = c.look[1] - c.pos[1];
  const dz = c.look[2] - c.pos[2];
  const L = Math.hypot(dx, dy, dz);
  const h = Math.hypot(dx, dz) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return {
    ...c,
    look: [c.look[0] - (dz / h) * m, c.look[1] + 0.6 * m, c.look[2] + (dx / h) * m],
    roll: c.roll + a * 0.004,
  };
}

/**
 * Computes screen-space UV camera velocity between frame `f` and `f+1` for automatic `WhipBlur` post-processing!
 * Returns `[0, 0]` for normal smooth glides (`< 0.042 UV/f` ≈ `30 px/f` at 720p) so shots stay razor-sharp,
 * and returns a clamped directional blur vector for true high-speed whip pans (`45-95 px/f`, shutter = 0.5)!
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

  // Skip hard cuts (huge sudden position jump or angle jump > 40 deg in 1 frame!)
  const posJump = Math.hypot(next.pos[0] - now.pos[0], next.pos[1] - now.pos[1], next.pos[2] - now.pos[2]);
  const dotFwd = Math.max(-1, Math.min(1, d1x * d2x + d1y * d2y + d1z * d2z));
  if (posJump > 6.0 || dotFwd < 0.75) return [0, 0];

  // Camera right & up basis
  const rx = -d1z, rz = d1x;
  const rLen = Math.hypot(rx, rz) || 1;
  const rnx = rx / rLen, rnz = rz / rLen;
  const ux = d1y * rnz, uy = d1z * rnx - d1x * rnz, uz = -d1y * rnx;

  // Angular shift + lateral camera shift projected onto viewport UV
  const tanHalfY = Math.tan(((now.fov * Math.PI) / 180) * 0.5);
  const tanHalfX = tanHalfY * aspect;
  const dAngX = (d2x - d1x) * rnx + (d2z - d1z) * rnz;
  const dAngY = (d2x - d1x) * ux + (d2y - d1y) * uy + (d2z - d1z) * uz;
  const dLatX = ((next.pos[0] - now.pos[0]) * rnx + (next.pos[2] - now.pos[2]) * rnz) / Math.max(0.5, len1);
  const dLatY = ((next.pos[0] - now.pos[0]) * ux + (next.pos[1] - now.pos[1]) * uy + (next.pos[2] - now.pos[2]) * uz) / Math.max(0.5, len1);

  const uvX = (dAngX - dLatX) / Math.max(0.1, 2 * tanHalfX);
  const uvY = (dAngY - dLatY) / Math.max(0.1, 2 * tanHalfY);
  const mag = Math.hypot(uvX, uvY);
  // Only activate directional WhipBlur on genuine fast whip-pans (>= ~45 px/f @ 720p, matching mromidev motion.md 5.4!)
  if (mag < 0.062) return [0, 0];
  const scale = Math.min(0.15, mag * 0.5) / mag;
  return [uvX * scale, uvY * scale];
}
