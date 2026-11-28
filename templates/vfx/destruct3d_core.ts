// Voidmetric v4.3 Deterministic 3D Anime Destruction, Voronoi Shatter, Sword Plane Slicing & CSG Primitives!
// Powered by `@dgreenheck/three-pinata` (MIT), `three-bvh-csg` (MIT), and `@dimforge/rapier3d-compat` (Apache 2.0).
// 100% deterministic under Remotion parallel workers (`--concurrency=4`): pre-fractures once in `useMemo`
// with seeded Voronoi cells and evaluates piece trajectories purely from frame `f`!
import * as THREE from "three";
import { DestructibleMesh, FractureOptions, SliceOptions } from "@dgreenheck/three-pinata";
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from "three-bvh-csg";
import RAPIER from "@dimforge/rapier3d-compat";

function hashDet(seed: number, k: number): number {
  const s = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export type FracturePieceData = {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  baseRot: THREE.Euler;
};

export type VoronoiFractureRig = {
  group: THREE.Group;
  intact: THREE.Mesh;
  pieces: FracturePieceData[];
  /** Call every frame `f` (at `fps = 30`) — intact before `impactFrame`, ballistic shattering rubble from `impactFrame` onward! */
  update: (f: number, fps?: number) => void;
  dispose: () => void;
};

/**
 * Pre-fractures ANY bespoke 3D BufferGeometry (wall, pillar, boulder, table, glass, blade target) using seeded
 * 3D or 2.5D Voronoi tessellation (`@dgreenheck/three-pinata`) with automatic interior UV capping!
 */
export function createVoronoiFracture(
  geometry: THREE.BufferGeometry,
  outerMat: THREE.Material,
  innerMat: THREE.Material,
  opts: {
    impactFrame: number;
    fragmentCount?: number;
    mode?: "3D" | "2.5D";
    impactPoint?: [number, number, number];
    impactRadius?: number;
    blastSpeed?: number;
    blastDir?: [number, number, number];
    gravity?: number;
    floorY?: number;
    seed?: number;
  }
): VoronoiFractureRig {
  const seed = opts.seed ?? 42;
  const group = new THREE.Group();
  const intact = new THREE.Mesh(geometry, outerMat);
  intact.castShadow = true;
  intact.receiveShadow = true;
  group.add(intact);

  const src = new DestructibleMesh(geometry, outerMat, innerMat);
  const impLocal = opts.impactPoint ? new THREE.Vector3(...opts.impactPoint) : new THREE.Vector3(0, 0, 0);
  const fOpts = new FractureOptions({
    fractureMethod: "voronoi",
    fragmentCount: opts.fragmentCount ?? 18,
    seed,
    voronoiOptions: {
      mode: opts.mode ?? "3D",
      impactPoint: impLocal,
      impactRadius: opts.impactRadius ?? 0.65,
    },
  });

  const rawFrags = src.fracture(fOpts);
  const blastSpeed = opts.blastSpeed ?? 5.5;
  const blastDir = opts.blastDir ? new THREE.Vector3(...opts.blastDir).normalize() : new THREE.Vector3(0, 0.35, 1).normalize();
  const gravity = opts.gravity ?? -14.5;
  const floorY = opts.floorY ?? -100;
  const pieces: FracturePieceData[] = [];

  rawFrags.forEach((frag, i) => {
    frag.castShadow = true;
    frag.receiveShadow = true;
    frag.visible = false;
    group.add(frag);

    const origin = frag.position.clone();
    const outVec = origin.clone().sub(impLocal);
    if (outVec.lengthSq() < 1e-4) outVec.set(hashDet(seed, i * 3) - 0.5, 0.5, hashDet(seed, i * 3 + 1) - 0.5);
    outVec.normalize();
    const spd = blastSpeed * (0.45 + 0.95 * hashDet(seed, i * 7 + 1));
    const vel = outVec.multiplyScalar(spd * 0.72).addScaledVector(blastDir, spd * 0.55);
    vel.y += 1.2 + 2.4 * hashDet(seed, i * 7 + 2);
    const angVel = new THREE.Vector3(
      (hashDet(seed, i * 7 + 3) - 0.5) * 9.5,
      (hashDet(seed, i * 7 + 4) - 0.5) * 9.5,
      (hashDet(seed, i * 7 + 5) - 0.5) * 9.5
    );
    pieces.push({ mesh: frag, origin, vel, angVel, baseRot: frag.rotation.clone() });
  });

  return {
    group,
    intact,
    pieces,
    update(f: number, fps = 30) {
      if (f < opts.impactFrame) {
        intact.visible = true;
        for (const p of pieces) p.mesh.visible = false;
        return;
      }
      intact.visible = false;
      const t = (f - opts.impactFrame) / fps;
      // Exponential air drag integrated analytically -> 100% deterministic at any frame `f`!
      const drag = 0.55;
      const dtDrag = (1 - Math.exp(-drag * t)) / drag;
      for (const p of pieces) {
        p.mesh.visible = true;
        const x = p.origin.x + p.vel.x * dtDrag;
        const z = p.origin.z + p.vel.z * dtDrag;
        let y = p.origin.y + p.vel.y * dtDrag + 0.5 * gravity * t * t;
        let bounceDamp = 1.0;
        if (y < floorY) {
          y = floorY;
          bounceDamp = 0.35;
        }
        p.mesh.position.set(x, y, z);
        p.mesh.rotation.set(
          p.baseRot.x + p.angVel.x * dtDrag * bounceDamp,
          p.baseRot.y + p.angVel.y * dtDrag * bounceDamp,
          p.baseRot.z + p.angVel.z * dtDrag * bounceDamp
        );
      }
    },
    dispose() {
      for (const p of pieces) p.mesh.geometry.dispose();
    },
  };
}

export type PlaneSliceRig = {
  group: THREE.Group;
  intact: THREE.Mesh;
  topHalf: THREE.Mesh | null;
  bottomHalf: THREE.Mesh | null;
  /** Call every frame `f` — cleanly slices mesh along sword/beam plane at `sliceFrame`, sliding & toppling the severed half! */
  update: (f: number, fps?: number) => void;
  dispose: () => void;
};

/**
 * Anime Sword / Beam Clean Plane Slice Primitive (`@dgreenheck/three-pinata`):
 * Slices ANY bespoke 3D object into two cleanly capped halves along `(sliceNormal, sliceOrigin)`!
 */
export function createPlaneSlice(
  geometry: THREE.BufferGeometry,
  outerMat: THREE.Material,
  innerMat: THREE.Material,
  opts: {
    sliceFrame: number;
    sliceNormal: [number, number, number];
    sliceOrigin?: [number, number, number];
    /** Frames of dramatic anime pause after the blade passes before the top half begins sliding (default 6 frames!) */
    delayFrames?: number;
    slideSpeed?: number;
    fallGravity?: number;
  }
): PlaneSliceRig {
  const group = new THREE.Group();
  const intact = new THREE.Mesh(geometry, outerMat);
  intact.castShadow = true;
  intact.receiveShadow = true;
  group.add(intact);

  const nrm = new THREE.Vector3(...opts.sliceNormal).normalize();
  const org = new THREE.Vector3(...(opts.sliceOrigin ?? [0, 0, 0]));
  const src = new DestructibleMesh(geometry, outerMat, innerMat);
  const sliced = src.slice(nrm, org, new SliceOptions());
  const topHalf = sliced[0] ?? null;
  const bottomHalf = sliced[1] ?? null;
  const topOrig = topHalf ? topHalf.position.clone() : new THREE.Vector3();
  const topRot = topHalf ? topHalf.rotation.clone() : new THREE.Euler();

  for (const h of [topHalf, bottomHalf]) {
    if (!h) continue;
    h.castShadow = true;
    h.receiveShadow = true;
    h.visible = false;
    group.add(h);
  }

  // Slide direction perpendicular to slice normal pointing slightly downward along the cut plane
  const slideDir = new THREE.Vector3(0, -1, 0).addScaledVector(nrm, -new THREE.Vector3(0, -1, 0).dot(nrm));
  if (slideDir.lengthSq() < 1e-4) slideDir.set(1, 0, 0);
  slideDir.normalize();
  const tiltAxis = new THREE.Vector3().crossVectors(nrm, slideDir).normalize();

  return {
    group,
    intact,
    topHalf,
    bottomHalf,
    update(f: number, fps = 30) {
      if (f < opts.sliceFrame || !topHalf || !bottomHalf) {
        intact.visible = true;
        if (topHalf) topHalf.visible = false;
        if (bottomHalf) bottomHalf.visible = false;
        return;
      }
      intact.visible = false;
      topHalf.visible = true;
      bottomHalf.visible = true;
      const delay = opts.delayFrames ?? 6;
      const moveF = Math.max(0, f - opts.sliceFrame - delay);
      const t = moveF / fps;
      const spd = opts.slideSpeed ?? 1.4;
      const grav = opts.fallGravity ?? -7.5;
      const slide = spd * t * t * 1.8;
      topHalf.position
        .copy(topOrig)
        .addScaledVector(slideDir, slide)
        .addScaledVector(nrm, Math.min(0.025, (f - opts.sliceFrame) * 0.004));
      topHalf.position.y += 0.5 * grav * Math.max(0, t - 0.22) * Math.max(0, t - 0.22);
      topHalf.rotation.copy(topRot);
      topHalf.rotateOnAxis(tiltAxis, Math.min(1.4, t * t * 1.5));
    },
    dispose() {
      topHalf?.geometry.dispose();
      bottomHalf?.geometry.dispose();
    },
  };
}

/** Robust `three-bvh-csg` Boolean Primitive (`subtract` | `union` | `intersect`) for carving craters, arches, & battle damage! */
export function runMeshCSG(
  geoA: THREE.BufferGeometry,
  geoB: THREE.BufferGeometry,
  op: "subtract" | "union" | "intersect",
  bTransform?: { pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number] }
): THREE.BufferGeometry {
  const bA = new Brush(geoA);
  bA.updateMatrixWorld();
  const bB = new Brush(geoB);
  if (bTransform?.pos) bB.position.set(...bTransform.pos);
  if (bTransform?.rot) bB.rotation.set(...bTransform.rot);
  if (bTransform?.scale) bB.scale.set(...bTransform.scale);
  bB.updateMatrixWorld();
  const evaluator = new Evaluator();
  const mode = op === "union" ? ADDITION : op === "intersect" ? INTERSECTION : SUBTRACTION;
  const res = evaluator.evaluate(bA, bB, mode);
  return res.geometry;
}

export type StaticColliderBox = {
  /** World center `[x, y, z]` of static collider box (floor, wall, table, pillar). */
  center: [number, number, number];
  /** Half-extents `[hx, hy, hz]` of static collider box. */
  halfExtents: [number, number, number];
  restitution?: number;
  friction?: number;
};

export type RapierDestructionRig = {
  group: THREE.Group;
  intact: THREE.Mesh;
  pieces: THREE.Mesh[];
  simFrames: number;
  /** O(1) playback of pre-baked deterministic Rapier3D rigid-body rubble trajectories at exact frame `f`! */
  update: (f: number) => void;
  dispose: () => void;
};

let rapierInitPromise: Promise<void> | null = null;
function ensureRapierInit(): Promise<void> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init();
  }
  return rapierInitPromise;
}

/**
 * Voidmetric v5.0 Bit-Deterministic Rust/WASM Rigid-Body Voronoi Destruction Baker (`@dimforge/rapier3d-compat`)!
 * Pre-fractures ANY 3D geometry via `@dgreenheck/three-pinata`, runs real 3D rigid-body collisions (shards colliding
 * against floor, walls, props, AND each other!) at fixed `dt = 1/fps` ONCE into compact `Float32Array` tracks,
 * then frees the WASM world so Remotion's parallel workers (`--concurrency=4`) play back identical rubble in O(1)!
 */
export async function bakeRapierDestruction(
  geometry: THREE.BufferGeometry,
  outerMat: THREE.Material,
  innerMat: THREE.Material,
  opts: {
    impactFrame: number;
    simFrames?: number;
    fps?: number;
    fragmentCount?: number;
    mode?: "3D" | "2.5D";
    impactPoint?: [number, number, number];
    impactRadius?: number;
    blastSpeed?: number;
    blastDir?: [number, number, number];
    gravity?: number;
    floorY?: number;
    /** Optional extra static colliders (walls, desks, crates, pillars) for shards to bounce & stack against! */
    colliders?: StaticColliderBox[];
    restitution?: number;
    friction?: number;
    seed?: number;
    /** World offset of the destructible mesh (default `[0,0,0]`) so colliders align cleanly in world space. */
    worldOffset?: [number, number, number];
  }
): Promise<RapierDestructionRig> {
  await ensureRapierInit();

  const seed = opts.seed ?? 42;
  const fps = opts.fps ?? 30;
  const simFrames = Math.max(15, opts.simFrames ?? 90);
  const wOff = new THREE.Vector3(...(opts.worldOffset ?? [0, 0, 0]));

  const group = new THREE.Group();
  const intact = new THREE.Mesh(geometry, outerMat);
  intact.castShadow = true;
  intact.receiveShadow = true;
  group.add(intact);

  const src = new DestructibleMesh(geometry, outerMat, innerMat);
  const impLocal = opts.impactPoint ? new THREE.Vector3(...opts.impactPoint) : new THREE.Vector3(0, 0, 0);
  const rawFrags = src.fracture(
    new FractureOptions({
      fractureMethod: "voronoi",
      fragmentCount: opts.fragmentCount ?? 18,
      seed,
      voronoiOptions: {
        mode: opts.mode ?? "3D",
        impactPoint: impLocal,
        impactRadius: opts.impactRadius ?? 0.65,
      },
    })
  );

  const world = new RAPIER.World({ x: 0.0, y: opts.gravity ?? -14.5, z: 0.0 });
  world.timestep = 1 / fps;

  // 1. Add floor plane + any user-specified static world colliders
  const floorY = opts.floorY ?? 0.0;
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorY - 0.5, 0));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(100, 0.5, 100)
      .setRestitution(opts.restitution ?? 0.36)
      .setFriction(opts.friction ?? 0.68),
    floorBody
  );
  for (const c of opts.colliders ?? []) {
    const rb = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(c.center[0] - wOff.x, c.center[1] - wOff.y, c.center[2] - wOff.z)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(c.halfExtents[0], c.halfExtents[1], c.halfExtents[2])
        .setRestitution(c.restitution ?? 0.35)
        .setFriction(c.friction ?? 0.65),
      rb
    );
  }

  // 2. Create dynamic rigid bodies for every Voronoi shard with seeded outward + directional impulse
  const blastSpeed = opts.blastSpeed ?? 6.0;
  const blastDir = opts.blastDir ? new THREE.Vector3(...opts.blastDir).normalize() : new THREE.Vector3(0, 0.35, 1).normalize();
  const bodies: RAPIER.RigidBody[] = [];
  const pieces: THREE.Mesh[] = [];
  const box = new THREE.Box3();
  const half = new THREE.Vector3();

  rawFrags.forEach((frag, i) => {
    frag.castShadow = true;
    frag.receiveShadow = true;
    frag.visible = false;
    group.add(frag);
    pieces.push(frag);

    frag.geometry.computeBoundingBox();
    box.copy(frag.geometry.boundingBox ?? new THREE.Box3(new THREE.Vector3(-0.1, -0.1, -0.1), new THREE.Vector3(0.1, 0.1, 0.1)));
    box.getSize(half).multiplyScalar(0.5);
    const hx = Math.max(0.03, half.x);
    const hy = Math.max(0.03, half.y);
    const hz = Math.max(0.03, half.z);

    const outVec = frag.position.clone().sub(impLocal);
    if (outVec.lengthSq() < 1e-4) outVec.set(hashDet(seed, i * 3) - 0.5, 0.5, hashDet(seed, i * 3 + 1) - 0.5);
    outVec.normalize();
    const spd = blastSpeed * (0.45 + 0.95 * hashDet(seed, i * 7 + 1));
    const vel = outVec.multiplyScalar(spd * 0.72).addScaledVector(blastDir, spd * 0.55);
    vel.y += 1.2 + 2.5 * hashDet(seed, i * 7 + 2);

    const rbDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(frag.position.x, frag.position.y, frag.position.z)
      .setLinvel(vel.x, vel.y, vel.z)
      .setAngvel({
        x: (hashDet(seed, i * 7 + 3) - 0.5) * 11.0,
        y: (hashDet(seed, i * 7 + 4) - 0.5) * 11.0,
        z: (hashDet(seed, i * 7 + 5) - 0.5) * 11.0,
      })
      .setLinearDamping(0.22)
      .setAngularDamping(0.28);
    const rb = world.createRigidBody(rbDesc);

    const verts = frag.geometry.attributes.position?.array as Float32Array | undefined;
    const colDesc =
      (verts && verts.length >= 12 ? RAPIER.ColliderDesc.convexHull(verts) : null) ??
      RAPIER.ColliderDesc.cuboid(hx, hy, hz);
    colDesc.setRestitution(opts.restitution ?? 0.34).setFriction(opts.friction ?? 0.68).setDensity(2.2);
    world.createCollider(colDesc, rb);
    bodies.push(rb);
  });

  // 3. Pre-bake deterministic simulation tracks `[simFrames x pieces]` then free WASM memory immediately!
  const nP = pieces.length;
  const posTrack = new Float32Array(simFrames * nP * 3);
  const quatTrack = new Float32Array(simFrames * nP * 4);

  for (let s = 0; s < simFrames; s++) {
    for (let p = 0; p < nP; p++) {
      const tr = bodies[p].translation();
      const rt = bodies[p].rotation();
      const pi = (s * nP + p) * 3;
      const qi = (s * nP + p) * 4;
      posTrack[pi] = tr.x;
      posTrack[pi + 1] = tr.y;
      posTrack[pi + 2] = tr.z;
      quatTrack[qi] = rt.x;
      quatTrack[qi + 1] = rt.y;
      quatTrack[qi + 2] = rt.z;
      quatTrack[qi + 3] = rt.w;
    }
    world.step();
  }
  world.free();

  return {
    group,
    intact,
    pieces,
    simFrames,
    update(f: number) {
      if (f < opts.impactFrame) {
        intact.visible = true;
        for (const p of pieces) p.visible = false;
        return;
      }
      intact.visible = false;
      const s = Math.max(0, Math.min(simFrames - 1, Math.round(f - opts.impactFrame)));
      for (let p = 0; p < nP; p++) {
        const mesh = pieces[p];
        mesh.visible = true;
        const pi = (s * nP + p) * 3;
        const qi = (s * nP + p) * 4;
        mesh.position.set(posTrack[pi], posTrack[pi + 1], posTrack[pi + 2]);
        mesh.quaternion.set(quatTrack[qi], quatTrack[qi + 1], quatTrack[qi + 2], quatTrack[qi + 3]);
      }
    },
    dispose() {
      for (const p of pieces) p.geometry.dispose();
    },
  };
}
