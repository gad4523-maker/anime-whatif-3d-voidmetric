// Voidmetric v4.0 Pure 26-Bone Pose Math, Quintic Blending & Secondary Physics (ZERO Hardcoded Canned Motion Clips!)
// Author 100% custom, shot-specific body acting directly on any `AnimeRig3D` skeleton using these pure primitives.
import * as THREE from "three";
import { AnimeRig3D, HandGesture3D, clamp01, lerp } from "./rig3d_core";

export type Vec3Tuple = [number, number, number];
export type JointName =
  | "hips" | "spine" | "chest" | "neck" | "head"
  | "shoulderL" | "elbowL" | "wristL"
  | "shoulderR" | "elbowR" | "wristR"
  | "thighL" | "kneeL" | "ankleL"
  | "thighR" | "kneeR" | "ankleR";

export type PoseSnapshot = {
  hipsY: number;
  rot: Record<JointName, Vec3Tuple>;
  handL: HandGesture3D;
  handR: HandGesture3D;
};

export const ALL_JOINTS: JointName[] = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "elbowL", "wristL",
  "shoulderR", "elbowR", "wristR",
  "thighL", "kneeL", "ankleL",
  "thighR", "kneeR", "ankleR",
];

/** Create a clean neutral PoseSnapshot with optional partial joint overrides for custom episode acting! */
export function createPose(
  baseHipsY = 0.96,
  overrides: Partial<Record<JointName, Vec3Tuple>> = {},
  hands: { handL?: HandGesture3D; handR?: HandGesture3D } = {}
): PoseSnapshot {
  const rot = {} as Record<JointName, Vec3Tuple>;
  for (const j of ALL_JOINTS) {
    rot[j] = overrides[j] ? [...overrides[j]!] : [0, 0, 0];
  }
  return {
    hipsY: baseHipsY,
    rot,
    handL: hands.handL ?? "relaxed",
    handR: hands.handR ?? "relaxed",
  };
}

/** Apply a custom PoseSnapshot directly onto any `AnimeRig3D`. */
export function applyPoseSnapshot(rig: AnimeRig3D, snap: PoseSnapshot) {
  rig.joints.hips.position.y = snap.hipsY;
  for (const j of ALL_JOINTS) {
    const [x, y, z] = snap.rot[j];
    rig.joints[j].rotation.set(x, y, z);
  }
  rig.handL.setGesture(snap.handL);
  rig.handR.setGesture(snap.handR);
}

/** Smoothly blend between ANY two custom PoseSnapshots (`u` in `0..1`, symmetric quintic ease). */
export function blendPoseSnapshots(a: PoseSnapshot, b: PoseSnapshot, u: number): PoseSnapshot {
  const x = clamp01(u);
  const k = x * x * x * (x * (6 * x - 15) + 10);
  const rot = {} as Record<JointName, Vec3Tuple>;
  for (const j of ALL_JOINTS) {
    rot[j] = [
      lerp(a.rot[j][0], b.rot[j][0], k),
      lerp(a.rot[j][1], b.rot[j][1], k),
      lerp(a.rot[j][2], b.rot[j][2], k),
    ];
  }
  return {
    hipsY: lerp(a.hipsY, b.hipsY, k),
    rot,
    handL: k < 0.5 ? a.handL : b.handL,
    handR: k < 0.5 ? a.handR : b.handR,
  };
}

/**
 * Deterministic secondary motion sway for hair plumes, capes, coats, tails, and sashes (zero stateful drift in Remotion!).
 */
export function applySecondarySway(
  nodes: THREE.Object3D[],
  t: number,
  opts: { amplitude?: number; freq?: number; phaseLag?: number; windBiasX?: number; axis?: "x" | "z" | "both" } = {}
) {
  const amp = opts.amplitude ?? 0.08;
  const freq = opts.freq ?? 4.8;
  const lag = opts.phaseLag ?? 0.65;
  const bias = opts.windBiasX ?? 0.0;
  const axis = opts.axis ?? "both";
  for (let i = 0; i < nodes.length; i++) {
    const wave1 = Math.sin(t * freq - i * lag) * amp;
    const wave2 = Math.cos(t * freq * 1.65 - i * lag * 1.3) * amp * 0.42;
    if (axis === "x" || axis === "both") {
      nodes[i].rotation.x = bias + wave1;
    }
    if (axis === "z" || axis === "both") {
      nodes[i].rotation.z = wave2;
    }
  }
}
