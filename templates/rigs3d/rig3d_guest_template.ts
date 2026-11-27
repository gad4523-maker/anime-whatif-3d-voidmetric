// Voidmetric 3D Anime Guest Character Rig Template (Dragon Ball FighterZ / Modern Shonen 3D Style)
// Duplicate & customize this file for each episode's iconic anime/manga character (e.g. Senku, Gojo, Sukuna, Goku, Madara).
//
// MANDATORY ANIME ACCURACY, FACE, EXPRESSION & PROPORTION RULES:
// 1. ALWAYS use `buildAnimeHead3D()` + `createAnimeFaceController()` + `makeAnimeMat({ isFace: true })` from `rig3d_core.ts`
//    for humanoid anime characters! NEVER sculpt a head with plain circular/elliptical rings or a sphere!
// 2. Use `customDraw` inside `createAnimeFaceController()` for signature facial markings (Senku's stone cracks, Sukuna's markings, scars)
//    so markings persist automatically across ALL 10 live expressions (`neutral`, `smirk`, `grin`, `serious`, `intense`, `snarl`,
//    `shout`, `shock`, `pain`, `smug_closed`) + natural eye-blinking + talking lip-flap!
// 3. Sculpt curved S-wave multi-lock 3D anime hair via `sculptCurveTube` with varied widths & bangs framing (NOT covering!) the eyes.
// 4. Match exact canonical 7-head-tall shonen body proportions, flared collars, layered garments, footwear & signature accessories!
// 5. Clamp any `Math.pow(base, exp)` calls with `Math.max(0, base)` to prevent NaN bloom blackouts!
import * as THREE from "three";
import {
  AnimeExpr,
  AnimeRig3D,
  RigJoints,
  RingSpec,
  addPart,
  applyXRayMode,
  attachBoneVisualizer,
  buildAnimeHead3D,
  buildHand3D,
  createAnimeFaceController,
  loftRings,
  makeAnimeMat,
  sculptCurveTube,
  sculptLimbGeo,
} from "./rig3d_core";

export function buildGuestRig3D(opts?: { intense?: boolean; claws?: boolean; expr?: AnimeExpr }): AnimeRig3D {
  const root = new THREE.Group();
  root.name = "GuestAnimeRig3D";

  const mSkin = makeAnimeMat({
    color: "#f5d0b5",
    shadowColor: "#c89074",
    rimColor: "#ffe8d6",
    rimPower: 3.4,
    rimStrength: 0.40,
    specStrength: 0.06,
    isFace: true,
  });
  const defaultExpr: AnimeExpr = opts?.expr ?? (opts?.intense ? "snarl" : "smirk");
  const faceCtrl = createAnimeFaceController({
    skinColor: "#f5d0b5",
    skinShade: "#d49a7c",
    irisColor: opts?.intense ? "#d62cff" : "#2278ff",
    irisInnerColor: opts?.intense ? "#ff9eff" : "#8ee6ff",
    irisDarkColor: opts?.intense ? "#3b0652" : "#0b2458",
    browColor: "#1d1a26",
    expr: defaultExpr,
    eyeShape: "sharp_shonen",
    eyeScale: 1.0,
  });
  const mFace = makeAnimeMat({
    color: "#ffffff",
    shadowColor: "#cfa088",
    map: faceCtrl.initialTex,
    rimColor: "#ffe8d6",
    rimPower: 3.6,
    rimStrength: 0.30,
    specStrength: 0.04,
    isFace: true,
  });
  faceCtrl.attachMaterial(mFace);
  const mSuit = makeAnimeMat({
    color: "#222636",
    shadowColor: "#0f121e",
    rimColor: "#8c9eff",
    rimPower: 3.0,
    rimStrength: 0.44,
    specStrength: 0.0, // matte anime cloth — zero plastic sheen!
  });
  const mCollar = makeAnimeMat({
    color: "#2e344a",
    shadowColor: "#141826",
    rimColor: "#a6b6ff",
    rimPower: 3.0,
    rimStrength: 0.46,
    specStrength: 0.0,
  });
  const mHair = makeAnimeMat({
    color: "#eef2fc",
    shadowColor: "#98a8cc",
    rimColor: "#ffffff",
    rimPower: 2.6,
    rimStrength: 0.68,
    specStrength: 0.22,
    specSize: 0.90,
  });

  // ---- Sleek 7-Head-Tall Shonen Skeleton Hierarchy (~1.78 m) ----
  const hips = new THREE.Group();
  hips.position.set(0, 0.99, 0);
  root.add(hips);

  const spine = new THREE.Group();
  spine.position.set(0, 0.07, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.position.set(0, 0.27, 0);
  spine.add(chest);

  const neck = new THREE.Group();
  neck.position.set(0, 0.23, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.095, 0);
  neck.add(head);

  // Connected Pelvis + Slim Athletic Shonen Torso + Upturned Anime Collar
  const pelvisRings: RingSpec[] = [
    { y: -0.07, rx: 0.132, rz: 0.096 },
    { y: 0.01, rx: 0.138, rz: 0.100 },
    { y: 0.09, rx: 0.128, rz: 0.092 },
  ];
  addPart(hips, loftRings(pelvisRings, 22), mSuit, { outline: 0.0048, name: "pelvis" });

  const torsoRings: RingSpec[] = [
    { y: -0.02, rx: 0.124, rz: 0.088 },
    { y: 0.18, rx: 0.118, rz: 0.084 }, // athletic tapered waist
    { y: 0.42, rx: 0.198, rz: 0.112 }, // crisp shonen chest/shoulders
    { y: 0.51, rx: 0.148, rz: 0.096 },
  ];
  addPart(spine, loftRings(torsoRings, 26), mSuit, { outline: 0.005, name: "torso" });

  // Flared upturned anime high collar framing neck & jaw cleanly!
  const collarRings: RingSpec[] = [
    { y: 0.20, rx: 0.074, rz: 0.074 },
    { y: 0.26, rx: 0.088, rz: 0.086, yMod: (th) => (Math.sin(th) > 0.35 ? -0.024 * Math.sin(th) : 0.012) },
  ];
  addPart(chest, loftRings(collarRings, 24, { openEnds: true }), mCollar, { outline: 0.0038, name: "collar" });

  // Slender anatomical anime neck extending cleanly into skull base (ZERO gap under upswept profile jaw!)
  addPart(neck, sculptLimbGeo(0.165, 0.044, 0.043, 0.052), mSkin, { pos: [0, 0.148, -0.014], outline: 0.0036, name: "neck" });

  // ---- STUDIO 3D ANIME HEAD (Sharp V-Chin + Upswept Profile Jaw + 3D Nose + 3D Ears + Planar Eyes!) ----
  buildAnimeHead3D(head, mFace, mSkin, {
    scale: 1.0,
    widthScale: 0.95,
    jawSharpness: 1.04,
    noseScale: 1.0,
    earScale: 1.0,
    outline: 0.0040,
  });

  // ---- Sculpted Curved S-Wave Multi-Lock 3D Anime Hair (Zero Forehead Scalp Poke-Through + Full Back Coverage!) ----
  // Full top-skull hair cap seated cleanly along the upper hairline so scalp NEVER peeks between front spikes!
  const hairBase = new THREE.SphereGeometry(0.104, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
  hairBase.scale(0.99, 1.04, 1.09);
  addPart(head, hairBase, mHair, { pos: [0, 0.168, -0.008], rot: [-0.10, 0, 0], outline: 0.0040, name: "hair_crown" });
  // Back-of-skull hair cover (zero bald patch from rear 3/4 turnaround!)
  const hairBack = new THREE.SphereGeometry(0.103, 22, 14, Math.PI * 0.06, Math.PI * 0.88, Math.PI * 0.18, Math.PI * 0.64);
  addPart(head, hairBack, mHair, { pos: [0, 0.148, -0.012], rot: [0, Math.PI, 0], outline: 0.0038, name: "hair_back" });

  // Back/Crown sweeping anime hair spikes (curved organic S-arcs, varied widths!)
  const crownSpecs: [number, number, number, number][] = [
    [-0.08, 0.25, -0.06, 0.036],
    [-0.04, 0.27, -0.08, 0.040],
    [0.00, 0.28, -0.09, 0.042],
    [0.04, 0.27, -0.08, 0.040],
    [0.08, 0.25, -0.06, 0.036],
    [-0.10, 0.21, -0.02, 0.032],
    [0.10, 0.21, -0.02, 0.032],
    [-0.08, 0.16, -0.07, 0.034],
    [0.08, 0.16, -0.07, 0.034],
    [0.00, 0.15, -0.09, 0.038],
    // Nape hair locks tapering cleanly down back of neck
    [-0.048, 0.09, -0.085, 0.024],
    [0.00, 0.08, -0.092, 0.026],
    [0.048, 0.09, -0.085, 0.024],
  ];
  crownSpecs.forEach(([x, y, z, r], i) => {
    const isNape = i >= 10;
    const pts: [number, number, number][] = isNape
      ? [[x * 0.8, y + 0.04, z], [x * 1.0, y - 0.01, z - 0.012], [x * 0.85, y - 0.065, z - 0.006]]
      : [[x * 0.55, y - 0.02, z * 0.7], [x * 1.45, y + 0.065, z * 1.25], [x * 2.15, y + 0.115, z * 1.55]];
    const lock = sculptCurveTube(pts, (t) => [r * (1 - t * 0.88), r * 0.62 * (1 - t * 0.88)], {
      tubularSegs: 14,
      radialSegs: 10,
      ridgeSharpness: 0.28,
    });
    addPart(head, lock, mHair, { outline: 0.0036, name: `hair_spike_${i}` });
  });

  // Front framing swept bangs & slim temple side-locks (delicate anime strands framing forehead & eyes cleanly!)
  const bangSpecs: [number, number, number][][] = [
    [[-0.062, 0.238, 0.042], [-0.088, 0.195, 0.082], [-0.096, 0.135, 0.076]],
    [[-0.022, 0.244, 0.048], [-0.032, 0.206, 0.094], [-0.012, 0.156, 0.094]],
    [[0.024, 0.244, 0.048], [0.038, 0.204, 0.094], [0.056, 0.158, 0.090]],
    [[0.062, 0.236, 0.042], [0.088, 0.192, 0.082], [0.096, 0.134, 0.074]],
    // Slim tapered temple side-locks curving gently past cheekbones (leave ears clearly visible!)
    [[-0.086, 0.205, 0.026], [-0.098, 0.136, 0.056], [-0.078, 0.064, 0.062]],
    [[0.086, 0.205, 0.026], [0.098, 0.136, 0.056], [0.078, 0.064, 0.062]],
  ];
  bangSpecs.forEach((pts, i) => {
    const bang = sculptCurveTube(pts, (t) => [0.019 * (1 - t * 0.84), 0.011 * (1 - t * 0.84)], {
      tubularSegs: 12,
      radialSegs: 8,
      ridgeSharpness: 0.30,
    });
    addPart(head, bang, mHair, { outline: 0.0030, name: `hair_bang_${i}` });
  });

  // ---- Arms + Articulated 5-Finger Hands (`side: -1 = Right, +1 = Left`) ----
  const makeArm = (side: -1 | 1) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.205, 0.195, 0);
    chest.add(sh);
    addPart(sh, new THREE.SphereGeometry(0.052, 14, 12), mSuit, { outline: 0.0042 });
    addPart(sh, sculptLimbGeo(0.275, 0.048, 0.044, 0.038), mSuit, { outline: 0.0042 });
    const el = new THREE.Group();
    el.position.set(0, -0.275, 0);
    sh.add(el);
    addPart(el, sculptLimbGeo(0.255, 0.039, 0.036, 0.029), mSuit, { outline: 0.0040 });
    const wr = new THREE.Group();
    wr.position.set(0, -0.255, 0);
    el.add(wr);
    const hand = buildHand3D(side, mSkin, { scale: 0.96, claws: !!opts?.claws });
    wr.add(hand.root);
    return { sh, el, wr, hand };
  };
  const armR = makeArm(-1);
  const armL = makeArm(1);

  // ---- Sleek Long Shonen Legs + Sculpted Footwear ----
  const makeLeg = (side: -1 | 1) => {
    const th = new THREE.Group();
    th.position.set(side * 0.096, -0.02, 0);
    hips.add(th);
    addPart(th, sculptLimbGeo(0.45, 0.070, 0.062, 0.048), mSuit, { outline: 0.0046 });
    const kn = new THREE.Group();
    kn.position.set(0, -0.45, 0);
    th.add(kn);
    addPart(kn, sculptLimbGeo(0.45, 0.050, 0.047, 0.036), mSuit, { outline: 0.0044 });
    const an = new THREE.Group();
    an.position.set(0, -0.45, 0);
    kn.add(an);
    const bootRings: RingSpec[] = [
      { y: -0.072, rx: 0.048, rz: 0.112, zOff: 0.038 },
      { y: -0.032, rx: 0.045, rz: 0.096, zOff: 0.026 },
      { y: 0.030, rx: 0.041, rz: 0.046, zOff: 0.002 },
    ];
    addPart(an, loftRings(bootRings, 18), mCollar, { outline: 0.0042 });
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

  const setExpr = (expr: AnimeExpr | string, t = -1, talk = false) => {
    faceCtrl.setExpr(expr, t, talk, true);
  };

  const setPose = (pose: string, t = 0) => {
    const breath = Math.sin(t * 2.4) * 0.016;
    hips.position.set(0, 0.99 + breath, 0);
    hips.rotation.set(0, 0, 0);
    spine.rotation.set(0, 0, 0);
    chest.rotation.set(0, 0, 0);
    head.rotation.set(0, Math.sin(t * 1.1) * 0.05, 0);
    legL.th.rotation.set(0, 0, 0.045);
    legR.th.rotation.set(0, 0, -0.045);
    legL.kn.rotation.set(0, 0, 0);
    legR.kn.rotation.set(0, 0, 0);

    if (pose === "power_point") {
      setExpr(opts?.intense ? "shout" : "grin", t);
      armR.sh.rotation.set(-1.35, 0.12, -0.22);
      armR.el.rotation.set(-0.26, 0, 0);
      armR.hand.setGesture("point_up");
      armL.sh.rotation.set(0.12, 0, 0.24);
      armL.el.rotation.set(-0.38, 0, 0);
      armL.hand.setGesture("fist");
    } else if (pose === "a_pose") {
      setExpr("neutral", -1);
      armR.sh.rotation.set(0, 0, -0.45);
      armR.el.rotation.set(0, 0, 0);
      armR.hand.setGesture("open");
      armL.sh.rotation.set(0, 0, 0.45);
      armL.el.rotation.set(0, 0, 0);
      armL.hand.setGesture("open");
    } else {
      setExpr(defaultExpr, t);
      armR.sh.rotation.set(0.06, 0, -0.15);
      armR.el.rotation.set(-0.20, 0, 0);
      armR.hand.setGesture("relaxed");
      armL.sh.rotation.set(0.06, 0, 0.15);
      armL.el.rotation.set(-0.20, 0, 0);
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
    setExpr,
    setXRayRig: (on: boolean) => applyXRayMode(root, overlay, on),
    getBoneCount: () => boneCount,
  };
}
