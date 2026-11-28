// Voidmetric v4.3 Deterministic 3D Anime Destruction, Voronoi Shatter, Sword Plane Slicing & CSG Primitives!
// Powered by `@dgreenheck/three-pinata` (MIT), `three-bvh-csg` (MIT), and `@dimforge/rapier3d-compat` (Apache 2.0).
// 100% deterministic under Remotion parallel workers (`--concurrency=4`): pre-fractures once in `useMemo`
// with seeded Voronoi cells and evaluates piece trajectories purely from frame `f`!
import * as THREE from "three";
import { DestructibleMesh, FractureOptions, SliceOptions } from "@dgreenheck/three-pinata";
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from "three-bvh-csg";

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
