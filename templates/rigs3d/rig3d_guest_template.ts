// Voidmetric 3D Anime Guest Character Rig Template (Dragon Ball FighterZ Cel-Shaded 3D Style)
// Duplicate & customize this file for each episode's iconic anime/manga character (e.g. Gojo, Sukuna, Goku, Madara).
// MANDATORY ACCURACY, PROPORTION & DETAIL RULES:
// - NEVER ship the placeholder starter geometry below as-is! Study every user reference image first.
// - Match EXACT canonical proportions (height vs MC 1.75m, head-to-body ratio, shoulder/waist taper, limb ratios).
// - Sculpt exact face/jawline/ears/nose via `loftRings` and multi-lock 3D hair via `sculptCurveTube` (never a smooth sphere hair dome!).
// - Paint 1024x1024 UV face textures with accurate anime eye shape, iris details, markings/scars, and 2-3 swappable expressions.
// - Model every signature costume layer & accessory in 3D (collars, robes, sashes, armor, cuffs, boots, weapons, halos, tails).
// - Always use `rig3d_core.ts` (`makeAnimeMat`, `addPart`, `loftRings`, `sculptCurveTube`, `sculptLimbGeo`, `buildHand3D`).
// - Clamp any `Math.pow(base, exp)` calls with `Math.max(0, base)` to prevent NaN bloom blackouts!
import * as THREE from "three";
import {
  AnimeRig3D,
  RigJoints,
  RingSpec,
  addPart,
  applyXRayMode,
  attachBoneVisualizer,
  buildHand3D,
  loftRings,
  makeAnimeMat,
  makeCanvasTex,
  sculptCurveTube,
  sculptLimbGeo,
} from "./rig3d_core";

export type GuestExpr3D = "neutral" | "intense";

function makeGuestFaceTex(expr: GuestExpr3D = "neutral"): THREE.CanvasTexture {
  const intense = expr === "intense";
  return makeCanvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f2cfb6";
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    // Subtle nose bridge shadow
    ctx.fillStyle = "#d9a98b";
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.47);
    ctx.lineTo(cx - 12, h * 0.56);
    ctx.lineTo(cx + 14, h * 0.558);
    ctx.closePath();
    ctx.fill();

    // Sharp anime eyes (replace colors/shapes to match reference character!)
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + s * 112, h * 0.445);
      ctx.scale(s, 1);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-58, -6);
      ctx.quadraticCurveTo(-6, -30, 62, -4);
      ctx.quadraticCurveTo(8, 26, -58, 14);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#16101c";
      ctx.stroke();

      ctx.fillStyle = intense ? "#c64aff" : "#3a8dff";
      ctx.beginPath();
      ctx.ellipse(2, 2, 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#120c18";
      ctx.beginPath();
      ctx.ellipse(2, 2, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-6, -5, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#181020";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-66, intense ? -28 : -38);
      ctx.lineTo(64, intense ? -52 : -40);
      ctx.stroke();
      ctx.restore();
    }

    // Confident smirk / battle snarl
    ctx.strokeStyle = "#1a1020";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx - 48, h * 0.65);
    ctx.quadraticCurveTo(cx, intense ? h * 0.675 : h * 0.658, cx + 56, h * 0.638);
    ctx.stroke();
  });
}

export function buildGuestRig3D(opts?: { intense?: boolean; claws?: boolean }): AnimeRig3D {
  const root = new THREE.Group();
  root.name = "GuestAnimeRig3D";

  const mSkin = makeAnimeMat({ color: "#f2cfb6", shadowColor: "#c8967c", rimColor: "#ffe7d6", rimPower: 3.4, rimStrength: 0.45 });
  const mFace = makeAnimeMat({
    color: "#ffffff",
    shadowColor: "#d9b4a0",
    map: makeGuestFaceTex(opts?.intense ? "intense" : "neutral"),
    rimColor: "#ffe7d6",
    rimPower: 3.8,
    rimStrength: 0.35,
  });
  const mSuit = makeAnimeMat({ color: "#242838", shadowColor: "#111420", rimColor: "#8c9eff", rimPower: 3.0, rimStrength: 0.55 });
  const mHair = makeAnimeMat({ color: "#eaeef8", shadowColor: "#9aa8c8", rimColor: "#ffffff", rimPower: 2.8, rimStrength: 0.72 });

  const hips = new THREE.Group();
  hips.position.set(0, 0.98, 0);
  root.add(hips);

  const spine = new THREE.Group();
  spine.position.set(0, 0.08, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.position.set(0, 0.28, 0);
  spine.add(chest);

  const neck = new THREE.Group();
  neck.position.set(0, 0.26, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.11, 0);
  neck.add(head);

  // Sculpted pelvis + torso (replace rings/costume layers to match reference character!)
  const pelvisRings: RingSpec[] = [
    { y: -0.08, rx: 0.145, rz: 0.105 },
    { y: 0.02, rx: 0.15, rz: 0.108 },
    { y: 0.10, rx: 0.142, rz: 0.102 },
  ];
  addPart(hips, loftRings(pelvisRings, 20), mSuit, { outline: 0.005, name: "pelvis" });
  const torsoRings: RingSpec[] = [
    { y: -0.02, rx: 0.14, rz: 0.10 },
    { y: 0.22, rx: 0.13, rz: 0.095 },
    { y: 0.48, rx: 0.22, rz: 0.125 },
    { y: 0.56, rx: 0.16, rz: 0.105 },
  ];
  addPart(spine, loftRings(torsoRings, 22), mSuit, { outline: 0.0052, name: "torso" });
  addPart(neck, sculptLimbGeo(0.12, 0.055, 0.052, 0.058), mSkin, { pos: [0, 0.12, 0], outline: 0.004, name: "neck" });

  // Head with sharp shonen V-jawline
  const headRings: RingSpec[] = [
    { y: 0.0, rx: 0.026, rz: 0.030, zOff: 0.032 },
    { y: 0.06, rx: 0.086, rz: 0.094, zOff: 0.014 },
    { y: 0.145, rx: 0.114, rz: 0.122 },
    { y: 0.23, rx: 0.108, rz: 0.116 },
    { y: 0.30, rx: 0.060, rz: 0.070 },
  ];
  addPart(head, loftRings(headRings, 24), mFace, { outline: 0.0048, name: "head" });

  // Sculpted multi-lock 3D anime hair (replace curves & lock count to match reference!)
  const hairCap = new THREE.SphereGeometry(0.124, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  addPart(head, hairCap, mHair, { pos: [0, 0.19, -0.015], outline: 0.0046, name: "hair_cap" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lock = sculptCurveTube(
      [
        [Math.cos(a) * 0.07, 0.26, Math.sin(a) * 0.07 - 0.01],
        [Math.cos(a) * 0.14, 0.31, Math.sin(a) * 0.13 - 0.01],
        [Math.cos(a) * 0.18, 0.23, Math.sin(a) * 0.16],
      ],
      (t) => [0.034 * (1 - t * 0.85), 0.024 * (1 - t * 0.85)],
      { tubularSegs: 12, radialSegs: 10, ridgeSharpness: 0.22 }
    );
    addPart(head, lock, mHair, { outline: 0.0042, name: `hair_lock_${i}` });
  }

  // Arms + articulated 5-finger hands (`side: -1 = Right, +1 = Left`)
  const makeArm = (side: -1 | 1) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.225, 0.22, 0);
    chest.add(sh);
    addPart(sh, sculptLimbGeo(0.28, 0.056, 0.052, 0.044), mSuit, { outline: 0.0044 });
    const el = new THREE.Group();
    el.position.set(0, -0.28, 0);
    sh.add(el);
    addPart(el, sculptLimbGeo(0.26, 0.045, 0.042, 0.034), mSuit, { outline: 0.0042 });
    const wr = new THREE.Group();
    wr.position.set(0, -0.26, 0);
    el.add(wr);
    const hand = buildHand3D(side, mSkin, { scale: 1.0, claws: !!opts?.claws });
    wr.add(hand.root);
    return { sh, el, wr, hand };
  };
  const armR = makeArm(-1);
  const armL = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1) => {
    const th = new THREE.Group();
    th.position.set(side * 0.105, -0.02, 0);
    hips.add(th);
    addPart(th, sculptLimbGeo(0.44, 0.078, 0.072, 0.056), mSuit, { outline: 0.0048 });
    const kn = new THREE.Group();
    kn.position.set(0, -0.44, 0);
    th.add(kn);
    addPart(kn, sculptLimbGeo(0.44, 0.058, 0.054, 0.042), mSuit, { outline: 0.0046 });
    const an = new THREE.Group();
    an.position.set(0, -0.44, 0);
    kn.add(an);
    addPart(an, new THREE.BoxGeometry(0.095, 0.08, 0.22), mSuit, { pos: [0, -0.04, 0.045], outline: 0.0044 });
    return { th, kn, an };
  };
  const legR = makeLeg(-1);
  const legL = makeLeg(1);

  const joints: RigJoints = {
    hips,
    spine,
    chest,
    neck,
    head,
    shoulderL: armL.sh,
    elbowL: armL.el,
    wristL: armL.wr,
    shoulderR: armR.sh,
    elbowR: armR.el,
    wristR: armR.wr,
    thighL: legL.th,
    kneeL: legL.kn,
    ankleL: legL.an,
    thighR: legR.th,
    kneeR: legR.kn,
    ankleR: legR.an,
  };

  const { overlay, boneCount } = attachBoneVisualizer(joints);

  const setPose = (pose: string, t = 0) => {
    const breath = Math.sin(t * 2.4) * 0.018;
    hips.position.set(0, 0.98 + breath, 0);
    hips.rotation.set(0, 0, 0);
    spine.rotation.set(0, 0, 0);
    chest.rotation.set(0, 0, 0);
    head.rotation.set(0, Math.sin(t * 1.1) * 0.05, 0);
    legL.th.rotation.set(0, 0, 0.04);
    legR.th.rotation.set(0, 0, -0.04);
    legL.kn.rotation.set(0, 0, 0);
    legR.kn.rotation.set(0, 0, 0);

    if (pose === "power_point") {
      armR.sh.rotation.set(-1.35, 0.12, -0.24);
      armR.el.rotation.set(-0.28, 0, 0);
      armR.hand.setGesture("point_up");
      armL.sh.rotation.set(0.12, 0, 0.26);
      armL.el.rotation.set(-0.42, 0, 0);
      armL.hand.setGesture("fist");
    } else if (pose === "a_pose") {
      armR.sh.rotation.set(0, 0, -0.45);
      armR.el.rotation.set(0, 0, 0);
      armR.hand.setGesture("open");
      armL.sh.rotation.set(0, 0, 0.45);
      armL.el.rotation.set(0, 0, 0);
      armL.hand.setGesture("open");
    } else {
      armR.sh.rotation.set(0.06, 0, -0.16);
      armR.el.rotation.set(-0.22, 0, 0);
      armR.hand.setGesture("relaxed");
      armL.sh.rotation.set(0.06, 0, 0.16);
      armL.el.rotation.set(-0.22, 0, 0);
      armL.hand.setGesture("relaxed");
    }
  };

  const setAction = (action: string, _p: number, t: number) => {
    setPose(action, t);
  };

  setPose("idle", 0);
  return {
    name: "GuestAnimeRig3D",
    root,
    joints,
    handL: armL.hand,
    handR: armR.hand,
    setPose,
    setAction,
    setXRayRig: (on: boolean) => applyXRayMode(root, overlay, on),
    getBoneCount: () => boneCount,
  };
}
