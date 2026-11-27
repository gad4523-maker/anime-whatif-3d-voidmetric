// Voidmetric v4.0.1 26-Bone Character Pose Primitives + Optional Reusable Human Movement Library!
// Author custom shot-specific poses freely via `createPose` + `applyPoseSnapshot` + `blendPoseSnapshots`,
// OR optionally use/blend any of the 18 biomechanically tuned humanoid movement clips below (`applyAnimeMotion`,
// `blendAnimeMotions`, `evaluateAnimeMotion`) + secondary sway physics (`applySecondarySway`)!
import * as THREE from "three";
import { AnimeRig3D, HandGesture3D, clamp01, lerp, smStep } from "./rig3d_core";

export type AnimeMotionClip =
  | "idle_hero"
  | "walk"
  | "run"
  | "run_skirt_safe"
  | "sprint_lean"
  | "hover_float"
  | "power_charge"
  | "finger_snap"
  | "palm_blast"
  | "sword_slash"
  | "punch_combo"
  | "recoil_hit"
  | "kneel_exhausted"
  | "wheeze_knees"
  | "inspect_prop"
  | "write_board"
  | "talk_gesture"
  | "sit_desk";

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

function zeroPose(baseHipsY = 0.96): PoseSnapshot {
  const rot = {} as Record<JointName, Vec3Tuple>;
  for (const j of ALL_JOINTS) rot[j] = [0, 0, 0];
  return { hipsY: baseHipsY, rot, handL: "relaxed", handR: "relaxed" };
}

/** Build ANY custom 26-bone PoseSnapshot directly with partial joint overrides & hand gestures! */
export function createPose(
  baseHipsY = 0.96,
  overrides: Partial<Record<JointName, Vec3Tuple>> = {},
  hands: { handL?: HandGesture3D; handR?: HandGesture3D } = {}
): PoseSnapshot {
  const s = zeroPose(baseHipsY);
  for (const j of ALL_JOINTS) {
    if (overrides[j]) s.rot[j] = [...overrides[j]!];
  }
  if (hands.handL) s.handL = hands.handL;
  if (hands.handR) s.handR = hands.handR;
  return s;
}

/** Evaluate any of the 18 reusable studio anime motion clips (combat + grounded acting!) into a clean PoseSnapshot! */
export function evaluateAnimeMotion(clip: AnimeMotionClip, p: number, t: number, baseHipsY = 0.96): PoseSnapshot {
  const s = zeroPose(baseHipsY);
  const br = Math.sin(t * 2.6) * 0.024;
  const r = s.rot;

  if (clip === "idle_hero") {
    s.hipsY = baseHipsY + Math.sin(t * 2.4) * 0.012;
    r.spine = [0.02, -0.08, Math.sin(t * 1.4) * 0.015];
    r.chest = [br, -0.05, 0];
    r.head = [0.02 - br * 0.5, 0.12 + Math.sin(t * 1.1) * 0.05, 0];
    r.shoulderL = [0.06, -0.06, 0.20];
    r.elbowL = [-0.28, 0, -0.05];
    r.shoulderR = [0.08, 0.06, -0.22];
    r.elbowR = [-0.26, 0, 0.05];
    r.thighL = [-0.04, -0.08, 0.08];
    r.kneeL = [0.06, 0, 0];
    r.thighR = [0.04, 0.08, -0.08];
    r.kneeR = [0.06, 0, 0];
    s.handL = "relaxed";
    s.handR = "fist";
  } else if (clip === "walk") {
    const cyc = t * 5.8;
    const sw = Math.sin(cyc);
    const liftL = Math.max(0, Math.cos(cyc));
    const liftR = Math.max(0, -Math.cos(cyc));
    s.hipsY = baseHipsY + Math.abs(Math.sin(cyc)) * 0.032 - 0.015;
    r.hips = [0, sw * 0.10, -sw * 0.04];
    r.spine = [0.04, -sw * 0.08, sw * 0.03];
    r.chest = [0.02, -sw * 0.08, 0];
    r.head = [-0.02, sw * 0.06, 0];
    r.thighL = [-sw * 0.52, 0, 0.04];
    r.kneeL = [0.12 + liftL * 0.68, 0, 0];
    r.ankleL = [-liftL * 0.25, 0, 0];
    r.thighR = [sw * 0.52, 0, -0.04];
    r.kneeR = [0.12 + liftR * 0.68, 0, 0];
    r.ankleR = [-liftR * 0.25, 0, 0];
    r.shoulderL = [sw * 0.42, 0, 0.14];
    r.elbowL = [-0.32 - Math.max(0, -sw) * 0.35, 0, 0];
    r.shoulderR = [-sw * 0.42, 0, -0.14];
    r.elbowR = [-0.32 - Math.max(0, sw) * 0.35, 0, 0];
  } else if (clip === "run" || clip === "run_skirt_safe" || clip === "sprint_lean") {
    const fast = clip === "sprint_lean";
    const skirtSafe = clip === "run_skirt_safe";
    const cyc = t * (fast ? 12.5 : skirtSafe ? 8.8 : 9.6);
    const sw = Math.sin(cyc);
    const liftL = Math.max(0, Math.cos(cyc));
    const liftR = Math.max(0, -Math.cos(cyc));
    const thighAmp = skirtSafe ? 0.54 : 0.92;
    const kneeAmp = skirtSafe ? 0.82 : 1.18;
    s.hipsY = baseHipsY - (skirtSafe ? 0.03 : 0.05) + Math.abs(Math.sin(cyc)) * (skirtSafe ? 0.045 : 0.065);
    r.hips = [fast ? 0.36 : skirtSafe ? 0.12 : 0.18, sw * 0.14, -sw * 0.05];
    r.spine = [fast ? 0.24 : skirtSafe ? 0.10 : 0.12, -sw * 0.12, sw * 0.04];
    r.head = [fast ? -0.44 : skirtSafe ? -0.14 : -0.22, 0, 0];
    r.thighL = [-sw * thighAmp - (skirtSafe ? 0.08 : 0.15), 0, 0.05];
    r.kneeL = [0.18 + liftL * kneeAmp, 0, 0];
    r.thighR = [sw * thighAmp - (skirtSafe ? 0.08 : 0.15), 0, -0.05];
    r.kneeR = [0.18 + liftR * kneeAmp, 0, 0];
    if (fast) {
      // Classic shinobi / shonen anime aero-sprint arms swept cleanly back!
      r.shoulderL = [1.05, 0.15, 0.32];
      r.elbowL = [-0.18, 0, 0];
      r.shoulderR = [1.05, -0.15, -0.32];
      r.elbowR = [-0.18, 0, 0];
      s.handL = "open";
      s.handR = "open";
    } else {
      r.shoulderL = [sw * 0.85, 0, 0.18];
      r.elbowL = [-1.15, 0, 0];
      r.shoulderR = [-sw * 0.85, 0, -0.18];
      r.elbowR = [-1.15, 0, 0];
      s.handL = "fist";
      s.handR = "fist";
    }
  } else if (clip === "hover_float") {
    // Iconic airborne anime god/sorcerer levitation (Gojo / Goku / Sukuna!)
    const bob = Math.sin(t * 2.2) * 0.085;
    s.hipsY = baseHipsY + 0.32 + bob;
    r.hips = [-0.08, 0.10, Math.sin(t * 1.3) * 0.04];
    r.spine = [-0.06 + br, -0.06, 0];
    r.head = [0.16, -0.04, 0.03];
    r.shoulderL = [0.14, -0.12, 0.42 + Math.sin(t * 2.0) * 0.05];
    r.elbowL = [-0.36, 0, -0.14];
    r.shoulderR = [-0.22, 0.12, -0.38 - Math.sin(t * 2.0) * 0.05];
    r.elbowR = [-0.48, 0, 0.12];
    r.thighL = [-0.34, -0.12, 0.14];
    r.kneeL = [0.62, 0, 0];
    r.ankleL = [0.35, 0, 0];
    r.thighR = [0.14, 0.08, -0.08];
    r.kneeR = [0.22, 0, 0];
    r.ankleR = [0.42, 0, 0];
    s.handL = "open";
    s.handR = "relaxed";
  } else if (clip === "power_charge") {
    const surge = smStep(0.0, 0.35, p);
    const vib = Math.sin(t * 28) * 0.015;
    s.hipsY = baseHipsY - 0.06 * surge + Math.sin(t * 7) * 0.008;
    r.spine = [0.10 + vib, 0, 0];
    r.chest = [-0.14 * surge + br * 1.4, 0, 0];
    r.head = [-0.08 * surge + vib, 0, 0];
    const flare = 0.46 + surge * 0.28;
    r.shoulderL = [0.18 + vib, -0.24, flare];
    r.elbowL = [-0.68 - surge * 0.26, 0, -0.20];
    r.shoulderR = [0.18 - vib, 0.24, -flare];
    r.elbowR = [-0.68 - surge * 0.26, 0, 0.20];
    r.thighL = [-0.22, -0.18, 0.20];
    r.kneeL = [0.38, 0, 0];
    r.thighR = [-0.22, 0.18, -0.20];
    r.kneeR = [0.38, 0, 0];
    s.handL = "fist";
    s.handR = "fist";
  } else if (clip === "finger_snap") {
    const lift = smStep(0.0, 0.35, p);
    const snap = smStep(0.55, 0.65, p);
    s.hipsY = baseHipsY + br * 0.3;
    r.spine = [0, lerp(-0.12, 0.08, lift), 0];
    r.head = [0.02, lerp(0.10, -0.08, lift), 0.04 * snap];
    r.shoulderR = [lerp(0.1, -1.25, lift), lerp(0, -0.16, lift), lerp(-0.2, -0.28, lift) - snap * 0.16];
    r.elbowR = [lerp(-0.3, -0.58, lift) + snap * 0.28, 0, 0.12];
    r.wristR = [-0.25 + snap * 0.38, 0, 0];
    r.shoulderL = [0.12, 0, 0.22];
    r.elbowL = [-0.35, 0, 0];
    r.thighL = [-0.05, -0.08, 0.08];
    r.thighR = [0.05, 0.08, -0.08];
    s.handR = snap > 0.3 ? "point_up" : "finger_gun";
    s.handL = "relaxed";
  } else if (clip === "palm_blast") {
    const thrust = smStep(0.15, 0.40, p);
    const vib = Math.sin(t * 24) * 0.014 * thrust;
    s.hipsY = baseHipsY - 0.04 * thrust;
    r.spine = [0.08 * thrust, lerp(-0.32, 0.24, thrust), 0];
    r.chest = [br, lerp(-0.22, 0.22, thrust), 0];
    r.head = [0.02, lerp(0.24, -0.24, thrust), 0];
    r.shoulderR = [lerp(0.25, -1.46, thrust) + vib, lerp(0.2, -0.08, thrust), lerp(-0.35, -0.16, thrust)];
    r.elbowR = [lerp(-1.25, -0.10, thrust), 0, 0];
    r.wristR = [lerp(0, -0.85, thrust), 0, 0];
    r.shoulderL = [0.18, -0.18, 0.38];
    r.elbowL = [-0.85, 0, -0.22];
    r.thighL = [-0.20, -0.16, 0.16];
    r.kneeL = [0.34, 0, 0];
    r.thighR = [0.18, 0.16, -0.14];
    r.kneeR = [0.22, 0, 0];
    s.handR = "power_palm";
    s.handL = "fist";
  } else if (clip === "sword_slash") {
    // Windup high-right -> explosive diagonal anime slash -> dramatic follow-through!
    const slash = smStep(0.28, 0.46, p);
    const hold = smStep(0.46, 0.88, p);
    s.hipsY = baseHipsY - 0.05 * slash;
    r.spine = [lerp(-0.08, 0.16, slash), lerp(-0.48, 0.56, slash), 0];
    r.chest = [0, lerp(-0.32, 0.36, slash), 0];
    r.head = [0.04, lerp(0.42, -0.44, slash), 0];
    r.shoulderR = [lerp(-2.25, -0.35, slash), lerp(-0.35, 0.52, slash), lerp(-0.55, 0.42, slash)];
    r.elbowR = [lerp(-0.62, -0.18, slash), 0, 0];
    r.wristR = [lerp(-0.35, 0.42, slash), 0, hold * 0.12];
    r.shoulderL = [lerp(-0.65, 0.35, slash), 0.18, lerp(0.28, 0.52, slash)];
    r.elbowL = [-0.72, 0, 0];
    r.thighL = [-0.26, -0.18, 0.18];
    r.kneeL = [0.42, 0, 0];
    r.thighR = [0.22, 0.18, -0.16];
    r.kneeR = [0.24, 0, 0];
    s.handR = "grip_blade";
    s.handL = "fist";
  } else if (clip === "punch_combo") {
    const step = (p * 2.0) % 1.0;
    const isRight = p < 0.5;
    const hit = smStep(0.15, 0.38, step) * (1 - smStep(0.62, 0.92, step));
    const side = isRight ? 1 : -1;
    s.hipsY = baseHipsY - 0.04;
    r.spine = [0.10, side * lerp(-0.35, 0.48, hit), 0];
    r.head = [0.02, -side * lerp(-0.22, 0.32, hit), 0];
    if (isRight) {
      r.shoulderR = [lerp(0.2, -1.48, hit), 0, -0.14];
      r.elbowR = [lerp(-1.25, -0.08, hit), 0, 0];
      r.shoulderL = [-0.32, 0.25, 0.32];
      r.elbowL = [-1.22, 0, -0.25];
    } else {
      r.shoulderL = [lerp(0.2, -1.48, hit), 0, 0.14];
      r.elbowL = [lerp(-1.25, -0.08, hit), 0, 0];
      r.shoulderR = [-0.32, -0.25, -0.32];
      r.elbowR = [-1.22, 0, 0.25];
    }
    r.thighL = [-0.20, -0.15, 0.16];
    r.kneeL = [0.34, 0, 0];
    r.thighR = [0.16, 0.15, -0.16];
    r.kneeR = [0.28, 0, 0];
    s.handL = "fist";
    s.handR = "fist";
  } else if (clip === "recoil_hit") {
    const k = smStep(0.0, 0.32, p);
    const vib = Math.sin(t * 22) * 0.02 * k;
    s.hipsY = baseHipsY - 0.05 * k;
    r.spine = [-0.26 * k + vib, -0.22 * k, 0.08 * k];
    r.chest = [-0.14 * k, -0.16 * k, 0];
    r.head = [-0.28 * k + vib, 0.28 * k, -0.12 * k];
    r.shoulderL = [-1.18 * k, -0.35 * k, 0.42];
    r.elbowL = [-1.28 * k, 0, -0.28 * k];
    r.shoulderR = [-1.12 * k, 0.35 * k, -0.45];
    r.elbowR = [-1.18 * k, 0, 0.25 * k];
    r.thighL = [-0.18 * k, -0.12, 0.14];
    r.kneeL = [0.34 * k, 0, 0];
    r.thighR = [0.16 * k, 0.12, -0.14];
    r.kneeR = [0.24 * k, 0, 0];
    s.handL = "open";
    s.handR = "open";
  } else if (clip === "kneel_exhausted") {
    // Dramatic anime one-knee collapse / catching breath — head tilted UP slightly so wincing face stays readable!
    const gasp = Math.sin(t * 5.2) * 0.032;
    s.hipsY = baseHipsY - 0.34 + gasp * 0.4;
    r.spine = [0.24 + gasp, 0.04, 0];
    r.chest = [0.10 + gasp, 0, 0];
    r.head = [-0.20 - gasp * 0.6, -0.06, 0.04];
    r.shoulderL = [-0.24, 0.12, 0.26];
    r.elbowL = [-0.82, 0, 0];
    r.shoulderR = [-0.48, -0.10, -0.22];
    r.elbowR = [-0.24, 0, 0];
    r.thighL = [-1.12, -0.14, 0.16];
    r.kneeL = [1.32, 0, 0];
    r.thighR = [0.22, 0.12, -0.12];
    r.kneeR = [1.55, 0, 0];
    s.handL = "fist";
    s.handR = "open";
  } else if (clip === "wheeze_knees") {
    // Grounded anime exhaustion: knees deeply bent, elbows flared with hands braced onto thighs/knees, face tilted UP!
    const heave = Math.sin(t * 6.4) * 0.042;
    s.hipsY = baseHipsY - 0.19 + heave * 0.35;
    r.hips = [0.22, 0, 0];
    r.spine = [0.34 + heave, 0, Math.sin(t * 2.1) * 0.02];
    r.chest = [0.16 + heave * 0.8, 0, 0];
    r.neck = [-0.20, 0, 0];
    r.head = [-0.34 - heave * 0.6, Math.sin(t * 1.4) * 0.08, 0.04];
    r.shoulderL = [-0.32, 0.18, 0.34];
    r.elbowL = [-0.52, 0, -0.34];
    r.wristL = [0.28, 0, 0];
    r.shoulderR = [-0.32, -0.18, -0.34];
    r.elbowR = [-0.52, 0, 0.34];
    r.wristR = [0.28, 0, 0];
    r.thighL = [-0.66, -0.16, 0.16];
    r.kneeL = [0.92, 0, 0];
    r.ankleL = [-0.26, 0, 0];
    r.thighR = [-0.60, 0.16, -0.16];
    r.kneeR = [0.86, 0, 0];
    r.ankleR = [-0.26, 0, 0];
    s.handL = "open";
    s.handR = "open";
  } else if (clip === "inspect_prop") {
    // Grounded anime close inspection: holds flask/notebook/tool up at chest height studying it intently!
    const tilt = Math.sin(t * 1.9) * 0.06;
    s.hipsY = baseHipsY + Math.sin(t * 2.2) * 0.008;
    r.spine = [0.06, -0.14, 0];
    r.chest = [br, -0.08, 0];
    r.head = [0.12 - br * 0.4, 0.16 + tilt * 0.5, 0.06 + tilt * 0.4];
    r.shoulderR = [-0.62 + tilt * 0.3, -0.26, -0.18];
    r.elbowR = [-1.18, 0.12, 0.22];
    r.wristR = [-0.18, 0.25 + tilt, 0.10];
    r.shoulderL = [-0.24, 0.20, 0.22];
    r.elbowL = [-0.95, 0, -0.16];
    r.thighL = [-0.04, -0.08, 0.08];
    r.kneeL = [0.06, 0, 0];
    r.thighR = [0.05, 0.08, -0.08];
    r.kneeR = [0.05, 0, 0];
    s.handR = "grip_blade";
    s.handL = "relaxed";
  } else if (clip === "write_board") {
    // Grounded classroom/lab acting: angled slightly toward board sketching equations with smooth right-hand strokes!
    const strokeX = Math.sin(t * 5.6) * 0.14;
    const strokeY = Math.cos(t * 3.8) * 0.09;
    s.hipsY = baseHipsY + Math.sin(t * 2.0) * 0.008;
    r.spine = [0.03, 0.24, 0];
    r.chest = [br, 0.18, 0];
    r.head = [-0.04, -0.22 + Math.sin(t * 1.4) * 0.08, 0.03];
    r.shoulderR = [-1.24 + strokeY, -0.16 + strokeX, -0.22];
    r.elbowR = [-0.46 + strokeY * 0.5, 0, 0.12];
    r.wristR = [0.18 + strokeX * 0.4, 0, 0];
    r.shoulderL = [0.10, 0.08, 0.18];
    r.elbowL = [-0.52, 0, -0.10];
    r.thighL = [-0.05, -0.06, 0.08];
    r.thighR = [0.05, 0.08, -0.08];
    s.handR = "point_up";
    s.handL = "relaxed";
  } else if (clip === "talk_gesture") {
    // Natural expressive anime monologue / explanation pose (zero superhero/magic stiffness!)
    const beat = Math.sin(t * 3.6);
    const beat2 = Math.cos(t * 2.4);
    s.hipsY = baseHipsY + Math.sin(t * 2.2) * 0.010;
    r.spine = [0.02, -0.10 + beat2 * 0.04, beat * 0.02];
    r.chest = [br, -0.06, 0];
    r.head = [0.02 + beat * 0.04, 0.12 + beat2 * 0.08, beat * 0.04];
    r.shoulderR = [-0.42 + beat * 0.12, -0.18, -0.24 - Math.abs(beat) * 0.08];
    r.elbowR = [-1.06 + beat * 0.16, 0, 0.18];
    r.wristR = [-0.15 + beat * 0.22, 0.18, 0];
    r.shoulderL = [0.12, -0.04, 0.18];
    r.elbowL = [-0.48 + beat2 * 0.08, 0, -0.08];
    r.thighL = [-0.04, -0.08, 0.07];
    r.kneeL = [0.06, 0, 0];
    r.thighR = [0.05, 0.08, -0.07];
    r.kneeR = [0.05, 0, 0];
    s.handR = beat > 0.25 ? "point_up" : "open";
    s.handL = "relaxed";
  } else if (clip === "sit_desk") {
    // Seated studying / crafting posture at desk or workbench!
    const write = Math.sin(t * 4.8) * 0.06;
    s.hipsY = baseHipsY - 0.34;
    r.spine = [0.16 + br * 0.5, -0.04, 0];
    r.chest = [0.08, 0, 0];
    r.head = [0.14 - br * 0.4, 0.06 + Math.sin(t * 1.3) * 0.06, 0.03];
    r.shoulderL = [-0.52, 0.14, 0.22];
    r.elbowL = [-1.05, 0, -0.18];
    r.shoulderR = [-0.58 + write, -0.14, -0.22];
    r.elbowR = [-1.02 - write, 0, 0.18];
    r.thighL = [-1.42, -0.10, 0.08];
    r.kneeL = [1.46, 0, 0];
    r.thighR = [-1.42, 0.10, -0.08];
    r.kneeR = [1.46, 0, 0];
    s.handL = "open";
    s.handR = "point_up";
  }

  return s;
}

/** Apply a PoseSnapshot directly onto any `AnimeRig3D`! */
export function applyPoseSnapshot(rig: AnimeRig3D, snap: PoseSnapshot) {
  rig.joints.hips.position.y = snap.hipsY;
  for (const j of ALL_JOINTS) {
    const [x, y, z] = snap.rot[j];
    rig.joints[j].rotation.set(x, y, z);
  }
  rig.handL.setGesture(snap.handL);
  rig.handR.setGesture(snap.handR);
}

/** Smoothly blend between ANY two PoseSnapshots (`u` in `0..1`, quintic ease!) so rigs never snap mid-shot! */
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

/** Convenience: run a single motion clip directly on `rig`! */
export function applyAnimeMotion(rig: AnimeRig3D, clip: AnimeMotionClip, p: number, t: number, baseHipsY = 0.96) {
  applyPoseSnapshot(rig, evaluateAnimeMotion(clip, p, t, baseHipsY));
}

/** Convenience: smoothly transition `rig` from `clipA` -> `clipB` across `blendU` (`0..1`)! */
export function blendAnimeMotions(
  rig: AnimeRig3D,
  clipA: AnimeMotionClip,
  clipB: AnimeMotionClip,
  p: number,
  t: number,
  blendU: number,
  baseHipsY = 0.96
) {
  const a = evaluateAnimeMotion(clipA, p, t, baseHipsY);
  const b = evaluateAnimeMotion(clipB, p, t, baseHipsY);
  applyPoseSnapshot(rig, blendPoseSnapshots(a, b, blendU));
}

/**
 * Deterministic Secondary Motion Physics for Hair Plumes, Capes, Coats, Tails, and Sashes!
 * Adds layered travelling sine wave flutter driven by aura wind or movement speed (zero stateful drift in Remotion!).
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
