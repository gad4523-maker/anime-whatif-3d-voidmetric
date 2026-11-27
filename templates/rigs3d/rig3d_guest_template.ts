// Voidmetric 3D Anime Guest Character Rig Template (Dragon Ball FighterZ Cel-Shaded 3D Style)
// Duplicate & customize this file for each episode's iconic anime character (e.g. Gojo, Sukuna, Goku, Madara).
// Mandatory style rules:
// - Always use `rig3d_core.ts` (`makeAnimeMat`, `addPart`, `loftRings`, `sculptCurveTube`, `buildHand3D`).
// - Include a painted 1024x1024 anime face texture with crisp eyes/brows/mouth (support 2+ expressions!).
// - Articulated 5-finger hands (`buildHand3D`) so bone-locked 3D GLSL VFX can attach cleanly to `handR.fingers[1][1]` or `joints.wristR`.
// - Clamp any `Math.pow(base, exp)` calls with `Math.max(0, base)` to prevent NaN bloom blackouts!
import * as THREE from "three";
import {
  AnimeRig3D,
  addPart,
  buildHand3D,
  loftRings,
  makeAnimeMat,
  makeRigCanvas,
} from "./rig3d_core";

function paintGuestFaceTex(intense = false): THREE.CanvasTexture {
  const { c, g, toTex } = makeRigCanvas(1024, 1024);
  g.fillStyle = "#f2cfb6";
  g.fillRect(0, 0, 1024, 1024);

  // Subtle nose bridge & cheekbones
  g.fillStyle = "#d9a98b";
  g.beginPath();
  g.moveTo(512, 470);
  g.lineTo(500, 560);
  g.lineTo(526, 558);
  g.closePath();
  g.fill();

  // Sharp anime eyes (customize iris color & brow angle to match reference images!)
  const drawEye = (cx: number, flip: number) => {
    g.save();
    g.translate(cx, 445);
    g.scale(flip, 1);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(-64, -8);
    g.quadraticCurveTo(-8, -32, 66, -4);
    g.quadraticCurveTo(10, 26, -64, 14);
    g.closePath();
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = "#16101c";
    g.stroke();

    // Iris
    g.fillStyle = intense ? "#c64aff" : "#3a8dff";
    g.beginPath();
    g.ellipse(4, 2, 22, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#120c18";
    g.beginPath();
    g.ellipse(4, 2, 9, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(-6, -6, 6, 0, Math.PI * 2);
    g.fill();

    // Sharp eyebrow
    g.strokeStyle = "#181020";
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(-72, intense ? -32 : -42);
    g.lineTo(68, intense ? -56 : -44);
    g.stroke();
    g.restore();
  };
  drawEye(385, 1);
  drawEye(639, -1);

  // Confident anime smirk / snarl
  g.strokeStyle = "#1a1020";
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(458, 646);
  g.quadraticCurveTo(512, intense ? 672 : 656, 574, 636);
  g.stroke();

  return toTex();
}

export function buildGuestRig3D(opts?: { intense?: boolean }): AnimeRig3D {
  const root = new THREE.Group();
  root.name = "GuestAnimeRig3D";

  const ink = "#16101c";
  const mSkin = makeAnimeMat({ base: "#f2cfb6", shade: "#cfa084", deep: "#a3745b", rim: "#ffe7d6", rimPow: 3.4, rimStr: 0.45 });
  const mFace = makeAnimeMat({ base: "#ffffff", shade: "#e0c2b0", deep: "#b5917e", map: paintGuestFaceTex(!!opts?.intense), rim: "#ffe7d6", rimPow: 3.8, rimStr: 0.35 });
  const mSuit = makeAnimeMat({ base: "#242838", shade: "#141826", deep: "#0b0d16", rim: "#7c8cff", rimPow: 3.0, rimStr: 0.55 });
  const mHair = makeAnimeMat({ base: "#eaeef8", shade: "#b8c4de", deep: "#7e8eb0", rim: "#ffffff", rimPow: 2.8, rimStr: 0.72 });

  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.02, 0);
  root.add(pelvis);

  const spine = new THREE.Group();
  spine.position.set(0, 0.08, 0);
  pelvis.add(spine);

  const chest = new THREE.Group();
  chest.position.set(0, 0.32, 0);
  spine.add(chest);

  const neck = new THREE.Group();
  neck.position.set(0, 0.28, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.12, 0);
  neck.add(head);

  // Sculpted torso (replace rings/colors to match reference character!)
  const torsoGeo = loftRings(
    [
      { y: -0.02, rx: 0.14, rz: 0.10 },
      { y: 0.24, rx: 0.13, rz: 0.095 },
      { y: 0.54, rx: 0.22, rz: 0.13 },
      { y: 0.62, rx: 0.17, rz: 0.11 },
    ],
    22
  );
  addPart(spine, torsoGeo, mSuit, { ink, outline: 0.0085 });

  // Head with sharp shonen V-jawline
  const headGeo = loftRings(
    [
      { y: 0.0, rx: 0.028, rz: 0.032, zOff: 0.03 },
      { y: 0.06, rx: 0.088, rz: 0.096, zOff: 0.015 },
      { y: 0.15, rx: 0.118, rz: 0.124 },
      { y: 0.24, rx: 0.112, rz: 0.118 },
      { y: 0.31, rx: 0.064, rz: 0.072 },
    ],
    24
  );
  addPart(head, headGeo, mFace, { ink, outline: 0.0075 });
  addPart(head, new THREE.SphereGeometry(0.124, 18, 14), mHair, { pos: [0, 0.22, -0.02], ink, outline: 0.008 });

  // Arms + 5-finger articulated hands
  const makeArm = (side: 1 | -1) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.23, 0.22, 0);
    chest.add(sh);
    addPart(sh, new THREE.CapsuleGeometry(0.052, 0.24, 8, 14), mSuit, { pos: [0, -0.14, 0], ink, outline: 0.007 });
    const el = new THREE.Group();
    el.position.set(0, -0.29, 0);
    sh.add(el);
    addPart(el, new THREE.CapsuleGeometry(0.044, 0.23, 8, 14), mSuit, { pos: [0, -0.13, 0], ink, outline: 0.0065 });
    const wr = new THREE.Group();
    wr.position.set(0, -0.27, 0);
    el.add(wr);
    const hand = buildHand3D(wr, side, mSkin, ink, 1.0);
    return { sh, el, wr, hand };
  };
  const armR = makeArm(-1);
  const armL = makeArm(1);

  // Legs
  const makeLeg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.105, -0.04, 0);
    pelvis.add(hip);
    addPart(hip, new THREE.CapsuleGeometry(0.068, 0.36, 8, 14), mSuit, { pos: [0, -0.22, 0], ink, outline: 0.008 });
    const knee = new THREE.Group();
    knee.position.set(0, -0.45, 0);
    hip.add(knee);
    addPart(knee, new THREE.CapsuleGeometry(0.056, 0.36, 8, 14), mSuit, { pos: [0, -0.22, 0], ink, outline: 0.0075 });
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.46, 0);
    knee.add(ankle);
    addPart(ankle, new THREE.BoxGeometry(0.095, 0.08, 0.22), mSuit, { pos: [0, -0.04, 0.045], ink, outline: 0.007 });
    return { hip, knee, ankle };
  };
  const legR = makeLeg(-1);
  const legL = makeLeg(1);

  const joints: Record<string, THREE.Object3D> = {
    pelvis,
    spine,
    chest,
    neck,
    head,
    shoulderR: armR.sh,
    elbowR: armR.el,
    wristR: armR.wr,
    shoulderL: armL.sh,
    elbowL: armL.el,
    wristL: armL.wr,
    hipR: legR.hip,
    kneeR: legR.knee,
    ankleR: legR.ankle,
    hipL: legL.hip,
    kneeL: legL.knee,
    ankleL: legL.ankle,
  };

  const setPose = (pose: string, t = 0) => {
    const breath = Math.sin(t * 2.4) * 0.02;
    pelvis.position.set(0, 1.02 + breath, 0);
    pelvis.rotation.set(0, 0, 0);
    chest.rotation.set(0, 0, 0);
    head.rotation.set(0, Math.sin(t * 1.1) * 0.05, 0);

    if (pose === "power_point") {
      armR.sh.rotation.set(-1.35, 0.15, -0.25);
      armR.el.rotation.set(-0.32, 0, 0);
      armR.hand.setGrip("point");
      armL.sh.rotation.set(0.1, 0, 0.28);
      armL.el.rotation.set(-0.4, 0, 0);
      armL.hand.setGrip("fist");
    } else {
      armR.sh.rotation.set(0.06, 0, -0.16);
      armR.el.rotation.set(-0.22, 0, 0);
      armR.hand.setGrip("open");
      armL.sh.rotation.set(0.06, 0, 0.16);
      armL.el.rotation.set(-0.22, 0, 0);
      armL.hand.setGrip("open");
    }
  };

  const setAction = (clip: string, _progress: number, t: number) => {
    setPose(clip, t);
  };

  setPose("idle", 0);
  return { root, joints, handR: armR.hand, handL: armL.hand, setPose, setAction };
}
