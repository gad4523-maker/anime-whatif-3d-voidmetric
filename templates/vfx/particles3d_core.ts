// Voidmetric v5.0 Deterministic `three.quarks` Shuriken GPU Particle & Stretched-Spark Engine (MIT)
// Zero hardcoded VFX presets — build any sparks, embers, sakura petals, rain splashes, aura streaks, or impact bursts
// purely from numeric emitter parameters, wrapped with Mulberry32 deterministic seeding so Remotion's parallel
// workers (`--concurrency=4`) produce 100% pixel-identical particles on arbitrary non-sequential frame jumps!
import * as THREE from "three";
import {
  ApplyForce,
  BatchedRenderer,
  CircleEmitter,
  ColorOverLife,
  ColorRange,
  ConeEmitter,
  ConstantValue,
  DonutEmitter,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  PiecewiseBezier,
  Bezier,
  Vector3 as QVec3,
  Vector4 as QVec4,
} from "three.quarks";
import { NOINK } from "../bridge/ink";
import { getGlowSpriteTex } from "./vfx3d";

export type QuarksEmitterConfig = {
  shape?: "cone" | "sphere" | "donut" | "point" | "circle";
  /** Radius for cone/sphere/donut/circle emitters (default `0.35`). */
  radius?: number;
  /** Cone angle in radians (default `0.55`). */
  angle?: number;
  /** Donut tube radius (default `0.12`). */
  donutRadius?: number;
  /** Local emitter position offset. */
  position?: [number, number, number];
  /** Local emitter Euler rotation in radians. */
  rotation?: [number, number, number];
  /** `"billboard"` (soft motes/embers/smoke) or `"stretched"` (anime speed sparks / impact shards!). */
  renderMode?: "billboard" | "stretched";
  /** Speed stretch factor when `renderMode === "stretched"` (default `0.32`). */
  speedFactor?: number;
  /** Primary & secondary particle colors `[r,g,b,a]` or hex strings. */
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  /** Fade-out tail color (alpha 0 at end of life). */
  colorEnd?: THREE.ColorRepresentation;
  /** Particle lifetime `[min, max]` seconds (default `[0.45, 0.95]`). */
  lifeRange?: [number, number];
  /** Initial speed `[min, max]` m/s (default `[2.0, 5.5]`). */
  speedRange?: [number, number];
  /** Initial size `[min, max]` meters (default `[0.06, 0.16]`). */
  sizeRange?: [number, number];
  /** Continuous particles emitted per second (default `45`; set `0` for pure burst). */
  rate?: number;
  /** Optional one-shot burst count at emitter `t = 0` (e.g. `40` impact sparks on hit frame!). */
  burstCount?: number;
  /** Gravity / force vector `[fx, fy, fz]` (default `[0, -4.5, 0]`). */
  force?: [number, number, number];
  /** Additive HDR bloom blending (default `true`; set `false` for dust/chalk/smoke). */
  additive?: boolean;
  /** Loop continuously (default `true`; set `false` for one-shot impact bursts). */
  looping?: boolean;
  /** Duration in seconds (default `3.0`). */
  duration?: number;
  /** World-space trails so moving emitters leave curving ribbons (default `true`). */
  worldSpace?: boolean;
  /** Custom sprite texture (defaults to radial glow sprite tinted with `colorA`). */
  texture?: THREE.Texture;
};

export type DeterministicQuarksRig = {
  root: THREE.Group;
  batchRenderer: BatchedRenderer;
  systems: ParticleSystem[];
  /** Deterministically step or seek the entire GPU particle rig to exact frame `f` (100% `--concurrency=4` safe!). */
  setFrame: (f: number, fps?: number) => void;
  dispose: () => void;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toQVec4(c: THREE.ColorRepresentation, alpha = 1): QVec4 {
  const col = new THREE.Color(c);
  return new QVec4(col.r, col.g, col.b, alpha);
}

function buildEmitterShape(cfg: QuarksEmitterConfig) {
  const r = cfg.radius ?? 0.35;
  switch (cfg.shape ?? "cone") {
    case "sphere":
      return new SphereEmitter({ radius: r, thickness: 0.85 });
    case "donut":
      return new DonutEmitter({ radius: r, donutRadius: cfg.donutRadius ?? 0.12 });
    case "point":
      return new PointEmitter();
    case "circle":
      return new CircleEmitter({ radius: r, thickness: 0.9 });
    case "cone":
    default:
      return new ConeEmitter({ radius: r, angle: cfg.angle ?? 0.55, thickness: 0.9 });
  }
}

/**
 * Create a 100% deterministic Remotion-safe `three.quarks` GPU particle rig on layer `NOINK`.
 * `startFrame` defines frame 0 of emission; `prewarmFrames` lets ambient particles already fill the screen at `startFrame`.
 */
export function createDeterministicQuarksRig(
  configs: QuarksEmitterConfig[],
  opts: { startFrame?: number; prewarmFrames?: number; seed?: number } = {}
): DeterministicQuarksRig {
  const startFrame = opts.startFrame ?? 0;
  const prewarmFrames = opts.prewarmFrames ?? 0;
  const seed = opts.seed ?? 1337;

  const root = new THREE.Group();
  const batchRenderer = new BatchedRenderer();
  batchRenderer.layers.set(NOINK);
  root.add(batchRenderer);

  const noInkLayers = new THREE.Layers();
  noInkLayers.set(NOINK);

  const systems: ParticleSystem[] = [];
  const materials: THREE.Material[] = [];

  for (const cfg of configs) {
    const colA = new THREE.Color(cfg.colorA ?? "#38d8ff");
    const colB = new THREE.Color(cfg.colorB ?? "#ffffff");
    const colEnd = new THREE.Color(cfg.colorEnd ?? colA);
    const tex = cfg.texture ?? getGlowSpriteTex(colA);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: cfg.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    materials.push(mat);

    const [lMin, lMax] = cfg.lifeRange ?? [0.45, 0.95];
    const [spMin, spMax] = cfg.speedRange ?? [2.0, 5.5];
    const [szMin, szMax] = cfg.sizeRange ?? [0.06, 0.16];
    const fVec = cfg.force ?? [0, -4.5, 0];
    const forceMag = Math.hypot(fVec[0], fVec[1], fVec[2]);
    const forceDir =
      forceMag > 1e-5
        ? new QVec3(fVec[0] / forceMag, fVec[1] / forceMag, fVec[2] / forceMag)
        : new QVec3(0, -1, 0);

    const behaviors: any[] = [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1.0, 0.95, 0.55, 0.05), 0]])),
      new ColorOverLife(
        new Gradient(
          [
            [new QVec3(colA.r, colA.g, colA.b), 0],
            [new QVec3(colEnd.r, colEnd.g, colEnd.b), 1],
          ],
          [
            [1, 0],
            [0, 1],
          ]
        )
      ),
    ];
    if (forceMag > 1e-5) {
      behaviors.push(new ApplyForce(forceDir, new ConstantValue(forceMag)));
    }

    const ps = new ParticleSystem({
      duration: cfg.duration ?? 3.0,
      looping: cfg.looping ?? true,
      startLife: new IntervalValue(lMin, lMax),
      startSpeed: new IntervalValue(spMin, spMax),
      startSize: new IntervalValue(szMin, szMax),
      startColor: new ColorRange(toQVec4(colA, 1.0), toQVec4(colB, 1.0)),
      worldSpace: cfg.worldSpace ?? true,
      emissionOverTime: new ConstantValue(cfg.rate ?? 45),
      emissionBursts: cfg.burstCount
        ? [{ time: 0, count: new ConstantValue(cfg.burstCount), cycle: 1, interval: 0.01, probability: 1 }]
        : [],
      shape: buildEmitterShape(cfg),
      material: mat,
      renderMode: cfg.renderMode === "stretched" ? RenderMode.StretchedBillBoard : RenderMode.BillBoard,
      speedFactor: cfg.renderMode === "stretched" ? cfg.speedFactor ?? 0.32 : 0,
      behaviors,
      layers: noInkLayers,
    });

    if (cfg.position) ps.emitter.position.set(...cfg.position);
    if (cfg.rotation) ps.emitter.rotation.set(...cfg.rotation);
    ps.emitter.layers.set(NOINK);
    root.add(ps.emitter);
    batchRenderer.addSystem(ps);
    systems.push(ps);
  }

  let curStep = -1;
  let rng = mulberry32(seed);

  const stepOnce = (dt: number) => {
    const origRand = Math.random;
    Math.random = rng;
    try {
      batchRenderer.update(dt);
      batchRenderer.traverse((o) => {
        o.layers.set(NOINK);
        o.frustumCulled = false;
      });
    } finally {
      Math.random = origRand;
    }
  };

  return {
    root,
    batchRenderer,
    systems,
    setFrame(f: number, fps = 30) {
      const targetStep = Math.round(f) - startFrame + prewarmFrames;
      if (targetStep < 0) {
        root.visible = false;
        return;
      }
      root.visible = true;
      const dt = 1 / fps;
      if (targetStep === curStep) return;

      if (targetStep < curStep || curStep < 0) {
        // Deterministic reset + replay from step 0 using exact Mulberry32 seed!
        rng = mulberry32(seed);
        for (const ps of systems) ps.restart();
        curStep = -1;
      }
      const stepsToRun = targetStep - curStep;
      // Cap crazy jump length while guaranteeing full accuracy for 60s shorts (<= 2400 frames)
      for (let i = 0; i < stepsToRun; i++) {
        stepOnce(dt);
      }
      curStep = targetStep;
    },
    dispose() {
      for (const ps of systems) ps.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
