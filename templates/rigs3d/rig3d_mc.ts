// Detailed 3D Anime Rig: LOCKED RECURRING CHANNEL ANIME MC (Voidmetric Universal v3.0)
// Locked Signature Identity:
//   - Sharp anime V-jawline + jet-black matte 3D glasses frames framing expressive glowing power eyes (any episode color!)
//   - Spiky matte charcoal anime hair with overlapping swept forehead bangs + chin goatee & smirk
//   - Open dark zip hoodie over cream crew-neck tee + cargo trousers + high-top sneakers
//   - 24-bone articulated skeleton + live `setExpr` (normal/power/shock/pain/blink/shout) + color-parameterized `powerColor`!
import * as THREE from "three";
import {
  AnimeRig3D,
  RigJoints,
  RingSpec,
  addPart,
  applyXRayMode,
  attachBoneVisualizer,
  buildHand3D,
  lerp,
  loftRings,
  makeAnimeMat,
  makeCanvasTex,
  sculptCurveTube,
  sculptLimbGeo,
  smStep,
} from "./rig3d_core";

export type MCExpr3D = "normal" | "power" | "shock" | "pain" | "blink" | "shout";

function makeMCFaceTex(expr: MCExpr3D = "normal", powerHex = "#38d8ff"): THREE.CanvasTexture {
  const powerGlow = expr === "power" || expr === "pain" || expr === "shout";
  const wide = expr === "shock" || expr === "pain";
  const isBlink = expr === "blink";
  const pCol = new THREE.Color(powerHex);
  const pCore = pCol.clone().lerp(new THREE.Color("#ffffff"), 0.72).getStyle();
  const pMid = pCol.getStyle();
  const pDeep = pCol.clone().multiplyScalar(0.45).getStyle();
  const pRim = pCol.clone().multiplyScalar(0.18).getStyle();
  return makeCanvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f2c9a2";
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    // Crisp shonen jawline contour shadow accentuating the sharp V-chin!
    const gJaw = ctx.createLinearGradient(0, h * 0.68, 0, h * 0.96);
    gJaw.addColorStop(0, "rgba(210, 152, 114, 0)");
    gJaw.addColorStop(0.55, "rgba(182, 118, 84, 0.25)");
    gJaw.addColorStop(1, "rgba(148, 90, 66, 0.52)");
    ctx.fillStyle = gJaw;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);

    // Subtle sharp cheekbone / jaw edge anime line strokes
    ctx.strokeStyle = "rgba(138, 82, 58, 0.45)";
    ctx.lineWidth = 3.2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 145, h * 0.60);
      ctx.lineTo(cx + s * 98, h * 0.72);
      ctx.lineTo(cx + s * 32, h * 0.80);
      ctx.stroke();
    }

    // ---- Bold Shonen Anime Eyes (UV-aligned cleanly behind 3D glasses lenses!) ----
    const eyeY = h * 0.445;
    const eyeDx = w * 0.074;

    for (const s of [-1, 1]) {
      const ex = cx + s * eyeDx;
      ctx.save();

      if (isBlink) {
        // Natural crisp anime eye-blink behind MC's glasses!
        ctx.strokeStyle = "#140b1c";
        ctx.lineWidth = 9.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ex - s * 50, eyeY + 12);
        ctx.quadraticCurveTo(ex, eyeY + 26, ex + s * 54, eyeY + 8);
        ctx.stroke();
      } else {
      const openH = wide ? 34 : 26;
      ctx.beginPath();
      ctx.moveTo(ex - s * 52, eyeY + 8);
      ctx.quadraticCurveTo(ex, eyeY - openH, ex + s * 55, eyeY - 12);
      ctx.lineTo(ex + s * 44, eyeY + (wide ? 30 : 24));
      ctx.quadraticCurveTo(ex, eyeY + (wide ? 34 : 29), ex - s * 46, eyeY + 20);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.fillStyle = "rgba(130, 118, 160, 0.28)";
      ctx.fillRect(ex - 62, eyeY - 34, 124, 18);

      const ix = ex - s * 3;
      const iy = eyeY + 2;
      const irR = wide ? 17 : 24;
      const iGr = ctx.createRadialGradient(ix, iy + 5, 3, ix, iy, irR + 4);
      if (powerGlow) {
        iGr.addColorStop(0, pCore);
        iGr.addColorStop(0.36, pMid);
        iGr.addColorStop(0.76, pDeep);
        iGr.addColorStop(1, pRim);
      } else {
        iGr.addColorStop(0, "#4c4266");
        iGr.addColorStop(0.65, "#231d32");
        iGr.addColorStop(1, "#120c1a");
      }
      ctx.fillStyle = iGr;
      ctx.beginPath();
      ctx.ellipse(ix, iy, irR * 0.94, irR, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = powerGlow ? pRim : "#0b0712";
      ctx.beginPath();
      ctx.arc(ix, iy, wide ? 6.0 : (powerGlow ? 8.5 : 10.5), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ix - 6, iy - 6, wide ? 4.8 : 6.2, 0, Math.PI * 2);
      ctx.arc(ix + 6, iy + 6, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "#140b1c";
      ctx.lineWidth = 9.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ex - s * 54, eyeY + 8);
      ctx.quadraticCurveTo(ex, eyeY - openH - 1, ex + s * 57, eyeY - 12);
      ctx.stroke();

      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(ex - s * 42, eyeY + 21);
      ctx.quadraticCurveTo(ex, eyeY + (wide ? 32 : 27), ex + s * 42, eyeY + 22);
      ctx.stroke();
      }

      // Dynamic Anime Eyebrows (raised shocked / fierce furrowed / determined!)
      ctx.strokeStyle = "#16111c";
      ctx.lineWidth = 10.5;
      ctx.beginPath();
      if (expr === "shock") {
        ctx.moveTo(ex - s * 50, eyeY - 52);
        ctx.quadraticCurveTo(ex, eyeY - 66, ex + s * 54, eyeY - 46);
      } else if (expr === "pain") {
        ctx.moveTo(ex - s * 50, eyeY - 50);
        ctx.quadraticCurveTo(ex, eyeY - 44, ex + s * 54, eyeY - 30);
      } else {
        ctx.moveTo(ex - s * 52, eyeY - 34);
        ctx.quadraticCurveTo(ex, eyeY - 48, ex + s * 58, eyeY - 44);
      }
      ctx.stroke();

      ctx.restore();
    }

    // ---- Crisp Shonen Nose ----
    const noseY = h * 0.56;
    ctx.fillStyle = "rgba(182, 120, 86, 0.56)";
    ctx.beginPath();
    ctx.moveTo(cx + 3, noseY - 38);
    ctx.lineTo(cx + 15, noseY + 6);
    ctx.lineTo(cx + 3, noseY + 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#22101e";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 2, noseY - 5);
    ctx.lineTo(cx + 6, noseY + 7);
    ctx.lineTo(cx - 7, noseY + 11);
    ctx.stroke();

    // ---- Expressive Shonen Mouth (smirk / shocked gasp / gritted teeth!) ----
    const mY = h * 0.642;
    if (expr === "shock" || expr === "shout") {
      ctx.fillStyle = "#5a1426";
      ctx.strokeStyle = "#160a16";
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      ctx.ellipse(cx, mY + 6, expr === "shout" ? 36 : 28, expr === "shout" ? 26 : 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (expr === "pain") {
      // Gritted white anime teeth in panic/pain!
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#160a16";
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.roundRect(cx - 38, mY - 10, 76, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(cx - 36, mY + 3);
      ctx.lineTo(cx + 36, mY + 3);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#180b18";
      ctx.lineWidth = 5.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 32, mY + 2);
      ctx.quadraticCurveTo(cx + 4, mY + 11, cx + 36, mY - 3);
      ctx.stroke();
    }

    // Subtle trimmed chin goatee cleanly anchored at chin tip!
    ctx.fillStyle = "#281e24";
    ctx.beginPath();
    ctx.moveTo(cx - 30, mY + 32);
    ctx.quadraticCurveTo(cx, mY + 37, cx + 30, mY + 32);
    ctx.quadraticCurveTo(cx + 22, mY + 62, cx, mY + 70);
    ctx.quadraticCurveTo(cx - 22, mY + 62, cx - 30, mY + 32);
    ctx.closePath();
    ctx.fill();
  });
}

function makeMCHoodieTex(): THREE.CanvasTexture {
  return makeCanvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#242733";
    ctx.fillRect(0, 0, w, h);

    // Subtle anime cloth drape lines on dark hoodie
    ctx.strokeStyle = "#131520";
    ctx.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const fx = (i / 6) * w;
      ctx.beginPath();
      ctx.moveTo(fx + 22, h * 0.25);
      ctx.quadraticCurveTo(fx + 35, h * 0.55, fx + 18, h * 0.88);
      ctx.stroke();
    }

    // Center cream inner crew-neck T-shirt visible through open zip hoodie!
    const cx = w * 0.5;
    const gapHalf = w * 0.086;
    ctx.fillStyle = "#f2ece2";
    ctx.fillRect(cx - gapHalf, 0, gapHalf * 2, h);

    // Crew-neck collar shadow arc + tee cloth fold lines
    ctx.strokeStyle = "#bfb5a6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - gapHalf * 0.72, h * 0.42);
    ctx.quadraticCurveTo(cx, h * 0.48, cx + gapHalf * 0.72, h * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - gapHalf * 0.62, h * 0.70);
    ctx.quadraticCurveTo(cx + 12, h * 0.75, cx + gapHalf * 0.55, h * 0.68);
    ctx.stroke();

    // Ribbed dark waistband
    ctx.fillStyle = "#1a1d27";
    ctx.fillRect(0, h * 0.88, cx - gapHalf, h * 0.12);
    ctx.fillRect(cx + gapHalf, h * 0.88, w - (cx + gapHalf), h * 0.12);

    // Silver zipper tracks, drawstrings & pockets
    for (const s of [-1, 1]) {
      const zx = cx + s * gapHalf;
      ctx.fillStyle = "#0e0c14";
      ctx.fillRect(zx - 6, 0, 12, h);
      ctx.fillStyle = "#dfe3ec";
      ctx.fillRect(zx + s * 6 - 5, 0, 10, h * 0.96);
      ctx.fillStyle = "#5c6478";
      for (let zy = 14; zy < h * 0.95; zy += 16) {
        ctx.fillRect(zx + s * 6 - 4, zy, 8, 6);
      }
      // Hoodie drawstrings
      ctx.strokeStyle = "#ebe6dc";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(zx + s * 22, h * 0.08);
      ctx.quadraticCurveTo(zx + s * 26, h * 0.28, zx + s * 20, h * 0.46);
      ctx.stroke();
      ctx.strokeStyle = "#14101c";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Slanted front kangaroo pocket seams
      ctx.strokeStyle = "#11131b";
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(zx + s * 26, h * 0.62);
      ctx.lineTo(zx + s * 86, h * 0.78);
      ctx.lineTo(zx + s * 86, h * 0.88);
      ctx.stroke();
    }
  });
}

export function buildMCRig3D(opts: { powerEyes?: boolean; powerColor?: string } = {}): AnimeRig3D {
  const root = new THREE.Group();
  root.name = "MCRig3D";
  const powerHex = opts.powerColor ?? "#38d8ff";
  const pTint = new THREE.Color(powerHex);
  const pRimLight = pTint.clone().lerp(new THREE.Color("#ffffff"), 0.45).getStyle();
  const pRimHair = pTint.clone().lerp(new THREE.Color("#ffffff"), 0.22).getStyle();
  const pLens = pTint.clone().lerp(new THREE.Color("#ffffff"), 0.58).getStyle();

  const skinMat = makeAnimeMat({
    color: "#f2c9a2",
    shadowColor: "#b88268",
    rimColor: "#ffe4d4",
    rimStrength: 0.32,
    specStrength: 0.08,
  });
  const faceTextures: Record<MCExpr3D, THREE.CanvasTexture> = {
    normal: makeMCFaceTex("normal", powerHex),
    power: makeMCFaceTex("power", powerHex),
    shock: makeMCFaceTex("shock", powerHex),
    pain: makeMCFaceTex("pain", powerHex),
    blink: makeMCFaceTex("blink", powerHex),
    shout: makeMCFaceTex("shout", powerHex),
  };
  const faceMat = makeAnimeMat({
    color: "#ffffff",
    map: faceTextures[opts.powerEyes ? "power" : "normal"],
    shadowColor: "#bd8b72",
    rimColor: opts.powerEyes ? pRimLight : "#ffe4d4",
    rimStrength: opts.powerEyes ? 0.48 : 0.30,
    specStrength: 0.08,
  });
  // Matte anime charcoal hair (sleek soft rim tinted to episode power color, NO shiny plastic hotspots!)
  const hairMat = makeAnimeMat({
    color: "#1b1925",
    shadowColor: "#0c0a12",
    rimColor: opts.powerEyes ? pRimHair : "#6c76a8",
    rimStrength: opts.powerEyes ? 0.54 : 0.34,
    specColor: "#8a96c8",
    specStrength: 0.14,
    specSize: 0.93,
  });
  // Razor-sharp JET BLACK glasses frames (metalness: 0 so they NEVER blow out white!)
  const glassFrameMat = makeAnimeMat({
    color: "#12101a",
    shadowColor: "#08060e",
    rimColor: "#667090",
    rimStrength: 0.18,
    specStrength: 0.22,
    specSize: 0.95,
    metalness: 0.0,
  });
  const glassLensMat = makeAnimeMat({
    color: opts.powerEyes ? pLens : "#c6ebff",
    shadowColor: "#687a99",
    rimColor: "#ffffff",
    rimStrength: 0.45,
    specStrength: 0.65,
    specSize: 0.90,
    transparent: true,
    opacity: 0.18,
  });
  // Matte fabric cel-shading for streetwear hoodie & cargo pants!
  const hoodieTorsoMat = makeAnimeMat({
    color: "#ffffff",
    map: makeMCHoodieTex(),
    shadowColor: "#585b74",
    rimColor: opts.powerEyes ? pRimLight : "#9aa8cc",
    rimStrength: opts.powerEyes ? 0.46 : 0.26,
    specStrength: 0.04,
  });
  const hoodieMat = makeAnimeMat({
    color: "#252834",
    shadowColor: "#12131e",
    rimColor: opts.powerEyes ? pRimLight : "#8896ba",
    rimStrength: opts.powerEyes ? 0.48 : 0.26,
    specStrength: 0.04,
  });
  const pantsMat = makeAnimeMat({
    color: "#1c1f2a",
    shadowColor: "#0d0f17",
    rimColor: opts.powerEyes ? pRimHair : "#707e9e",
    rimStrength: 0.26,
    specStrength: 0.04,
  });
  const shoeWhiteMat = makeAnimeMat({
    color: "#f2f3f8",
    shadowColor: "#9aa0b8",
    rimColor: "#ffffff",
    rimStrength: 0.26,
    specStrength: 0.12,
  });
  const shoeDarkMat = makeAnimeMat({
    color: "#20222d",
    shadowColor: "#0f1018",
    rimColor: "#8c98b4",
    rimStrength: 0.28,
    specStrength: 0.14,
  });

  // ---- Hierarchical 3D Skeleton Joints (~1.74 m tall) ----
  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.set(0, 0.94, 0);
  root.add(hips);

  const spine = new THREE.Group();
  spine.name = "spine";
  spine.position.set(0, 0.09, 0);
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = "chest";
  chest.position.set(0, 0.21, 0);
  spine.add(chest);

  const neck = new THREE.Group();
  neck.name = "neck";
  neck.position.set(0, 0.20, 0);
  chest.add(neck);

  // Shorter natural shonen anime neck!
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 0.062, 0.008);
  neck.add(head);

  // Tucked cleanly inside hoodie shoulder line (zero protruding ball-joint shoulders!)
  const shoulderL = new THREE.Group();
  shoulderL.name = "shoulder_L";
  shoulderL.position.set(0.188, 0.15, 0);
  chest.add(shoulderL);

  const elbowL = new THREE.Group();
  elbowL.name = "elbow_L";
  elbowL.position.set(0, -0.265, 0);
  shoulderL.add(elbowL);

  const wristL = new THREE.Group();
  wristL.name = "wrist_L";
  wristL.position.set(0, -0.25, 0);
  elbowL.add(wristL);

  const shoulderR = new THREE.Group();
  shoulderR.name = "shoulder_R";
  shoulderR.position.set(-0.188, 0.15, 0);
  chest.add(shoulderR);

  const elbowR = new THREE.Group();
  elbowR.name = "elbow_R";
  elbowR.position.set(0, -0.265, 0);
  shoulderR.add(elbowR);

  const wristR = new THREE.Group();
  wristR.name = "wrist_R";
  wristR.position.set(0, -0.25, 0);
  elbowR.add(wristR);

  const thighL = new THREE.Group();
  thighL.name = "thigh_L";
  thighL.position.set(0.096, -0.04, 0);
  hips.add(thighL);

  const kneeL = new THREE.Group();
  kneeL.name = "knee_L";
  kneeL.position.set(0, -0.415, 0);
  thighL.add(kneeL);

  const ankleL = new THREE.Group();
  ankleL.name = "ankle_L";
  ankleL.position.set(0, -0.405, 0);
  kneeL.add(ankleL);

  const thighR = new THREE.Group();
  thighR.name = "thigh_R";
  thighR.position.set(-0.096, -0.04, 0);
  hips.add(thighR);

  const kneeR = new THREE.Group();
  kneeR.name = "knee_R";
  kneeR.position.set(0, -0.415, 0);
  thighR.add(kneeR);

  const ankleR = new THREE.Group();
  ankleR.name = "ankle_R";
  ankleR.position.set(0, -0.405, 0);
  kneeR.add(ankleR);

  // ---- 1. RAZOR-SHARP ANIME SHONEN HEAD (Defined V-Chin, Chiseled Jaw Angle, Cheekbones!) ----
  const headRings: RingSpec[] = [
    // Sharp pointed shonen anime chin tip!
    { y: -0.010, rx: 0.014, rz: 0.020, zOff: 0.042 },
    // Steep chiseled V-taper lower mandible (narrow front point, crisp jaw plane!)
    {
      y: 0.022, rx: 0.046, rz: 0.062, zOff: 0.032,
      mod: (th) => 1 + 0.14 * Math.max(0, Math.sin(th)) ** 3 - 0.10 * Math.abs(Math.sin(th * 2)),
    },
    // Defined angular anime gonial jaw corner (classic Sung Jinwoo / Gojo / DBZ sharp jaw!)
    {
      y: 0.060, rx: 0.084, rz: 0.092, zOff: 0.020,
      mod: (th) => 1 + 0.08 * Math.cos(th * 2) + 0.08 * Math.max(0, Math.sin(th)) ** 3,
    },
    // Angular cheekbone & nose bridge protrusion
    {
      y: 0.098, rx: 0.100, rz: 0.106, zOff: 0.012,
      mod: (th) => 1 + 0.08 * Math.max(0, Math.sin(th)) ** 4 + 0.04 * Math.cos(th * 2),
    },
    { y: 0.136, rx: 0.108, rz: 0.114, zOff: 0.005 },
    { y: 0.176, rx: 0.110, rz: 0.116, zOff: 0.000 },
    { y: 0.214, rx: 0.096, rz: 0.106, zOff: -0.008 },
    { y: 0.242, rx: 0.060, rz: 0.068, zOff: -0.012 },
  ];
  addPart(head, loftRings(headRings, 48), faceMat, { outline: 0.0042, name: "mc_head" });

  for (const s of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.023, 12, 10);
    ear.scale(0.52, 1.35, 0.85);
    addPart(head, ear, skinMat, {
      pos: [s * 0.109, 0.114, -0.005],
      rot: [0, s * -0.18, s * 0.12],
      outline: 0.003,
    });
  }

  // Crisp Jet-Black 3D Rectangular Anime Glasses (centered cleanly around large eyes!)
  const glasses = new THREE.Group();
  glasses.name = "mc_glasses";
  glasses.position.set(0, 0.132, 0.122);
  head.add(glasses);
  for (const s of [-1, 1]) {
    const gx = s * 0.048;
    addPart(glasses, new THREE.BoxGeometry(0.074, 0.0085, 0.010), glassFrameMat, { pos: [gx, 0.024, 0], outline: 0.0014 });
    addPart(glasses, new THREE.BoxGeometry(0.070, 0.0055, 0.009), glassFrameMat, { pos: [gx, -0.021, 0], outline: 0.0014 });
    addPart(glasses, new THREE.BoxGeometry(0.0065, 0.049, 0.010), glassFrameMat, { pos: [gx + s * 0.034, 0.001, 0], outline: 0.0014 });
    addPart(glasses, new THREE.BoxGeometry(0.006, 0.046, 0.009), glassFrameMat, { pos: [gx - s * 0.033, 0.001, 0], outline: 0.0014 });
    addPart(glasses, new THREE.PlaneGeometry(0.064, 0.040), glassLensMat, { pos: [gx, 0.001, 0.001], outline: 0 });
    addPart(glasses, new THREE.BoxGeometry(0.0065, 0.0065, 0.126), glassFrameMat, {
      pos: [s * 0.098, 0.016, -0.062],
      rot: [0.06, s * -0.22, 0],
      outline: 0.0014,
    });
  }
  addPart(glasses, new THREE.BoxGeometry(0.030, 0.007, 0.009), glassFrameMat, { pos: [0, 0.012, 0.002], outline: 0.0014 });

  // Full Sculpted Hair Volume Cap wrapping forehead hairline & back skull cleanly (smooth, non-bumpy!)
  const hairCap = new THREE.SphereGeometry(0.124, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.62);
  addPart(head, hairCap, hairMat, {
    pos: [0, 0.158, -0.010],
    rot: [-0.20, 0, 0],
    outline: 0.0038,
    name: "mc_hair_cap",
  });

  // Back nape hair sweep
  addPart(head, sculptCurveTube(
    [[0, 0.16, -0.09], [0, 0.08, -0.124], [0, 0.012, -0.096]],
    (t) => [0.104 * (1 - t * 0.38), 0.036 * (1 - t * 0.45)],
    { tubularSegs: 12, radialSegs: 14, ridgeSharpness: 0.14 }
  ), hairMat, { outline: 0.0038 });

  // Cohesive Bold Swept Anime Spikes & Wide Overlapping Forehead Bangs!
  const spikes: { pts: [number, number, number][]; r: [number, number] }[] = [
    // Bold signature crown starburst spikes (broader base, natural curve!)
    { pts: [[0.00, 0.21, -0.01], [0.015, 0.29, 0.01], [0.025, 0.375, 0.03]], r: [0.072, 0.056] },
    { pts: [[-0.055, 0.20, -0.01], [-0.125, 0.275, 0.01], [-0.195, 0.34, 0.025]], r: [0.068, 0.052] },
    { pts: [[0.055, 0.20, -0.01], [0.125, 0.275, 0.01], [0.195, 0.34, 0.025]], r: [0.068, 0.052] },
    { pts: [[-0.09, 0.17, -0.01], [-0.165, 0.205, 0.01], [-0.24, 0.23, 0.02]], r: [0.062, 0.048] },
    { pts: [[0.09, 0.17, -0.01], [0.165, 0.205, 0.01], [0.24, 0.23, 0.02]], r: [0.062, 0.048] },
    { pts: [[-0.095, 0.135, -0.02], [-0.155, 0.125, -0.01], [-0.208, 0.11, 0.00]], r: [0.048, 0.038] },
    { pts: [[0.095, 0.135, -0.02], [0.155, 0.125, -0.01], [0.208, 0.11, 0.00]], r: [0.048, 0.038] },
    // Back volume spikes
    { pts: [[0.00, 0.21, -0.06], [0.00, 0.26, -0.145], [0.00, 0.295, -0.23]], r: [0.064, 0.050] },
    { pts: [[-0.06, 0.19, -0.06], [-0.125, 0.22, -0.145], [-0.18, 0.24, -0.21]], r: [0.058, 0.044] },
    { pts: [[0.06, 0.19, -0.06], [0.125, 0.22, -0.145], [0.18, 0.24, -0.21]], r: [0.058, 0.044] },
    { pts: [[-0.06, 0.14, -0.08], [-0.11, 0.13, -0.15], [-0.155, 0.11, -0.20]], r: [0.050, 0.040] },
    { pts: [[0.06, 0.14, -0.08], [0.11, 0.13, -0.15], [0.155, 0.11, -0.20]], r: [0.050, 0.040] },
    { pts: [[0.00, 0.13, -0.09], [0.00, 0.11, -0.16], [0.00, 0.08, -0.215]], r: [0.052, 0.040] },
    // Sharp sleek swept shonen anime bangs flowing cleanly from crown to right above the glasses!
    { pts: [[-0.042, 0.236, 0.042], [-0.062, 0.205, 0.116], [-0.068, 0.162, 0.124]], r: [0.036, 0.016] },
    { pts: [[-0.008, 0.240, 0.045], [-0.012, 0.208, 0.120], [-0.022, 0.158, 0.128]], r: [0.040, 0.017] },
    { pts: [[0.032, 0.240, 0.045], [0.042, 0.206, 0.120], [0.028, 0.160, 0.128]], r: [0.038, 0.016] },
    { pts: [[0.072, 0.225, 0.040], [0.095, 0.192, 0.108], [0.092, 0.150, 0.116]], r: [0.032, 0.015] },
    { pts: [[-0.078, 0.222, 0.040], [-0.098, 0.188, 0.106], [-0.098, 0.146, 0.114]], r: [0.032, 0.015] },
    // Crisp sideburn locks framing ears
    { pts: [[-0.096, 0.155, 0.035], [-0.108, 0.112, 0.048], [-0.098, 0.066, 0.054]], r: [0.022, 0.016] },
    { pts: [[0.096, 0.155, 0.035], [0.108, 0.112, 0.048], [0.098, 0.066, 0.054]], r: [0.022, 0.016] },
  ];

  spikes.forEach((sp, idx) => {
    const geo = sculptCurveTube(
      sp.pts,
      (t) => {
        const taper = Math.pow(Math.max(0, 1 - t), 1.12);
        const swell = 1 + 0.18 * Math.sin(t * Math.PI);
        return [sp.r[0] * taper * swell, sp.r[1] * taper * swell];
      },
      { tubularSegs: 12, radialSegs: 10, ridgeSharpness: 0.20, capStart: true, capEnd: true }
    );
    addPart(head, geo, hairMat, { outline: 0.0036, name: `mc_hair_spike_${idx}` });
  });

  // ---- 2. Neck, Seamless Open Zip Hoodie Torso, Standing Collar/Hood & Matte Sleeves ----
  addPart(neck, sculptLimbGeo(0.10, 0.048, 0.048, 0.056), skinMat, { pos: [0, 0.082, 0], outline: 0.0036 });

  const torsoRings: RingSpec[] = [
    { y: -0.09, rx: 0.156, rz: 0.108, mod: (th) => 1 + 0.025 * Math.sin(th * 6) },
    { y: 0.02, rx: 0.150, rz: 0.104 },
    { y: 0.14, rx: 0.164, rz: 0.110, zOff: 0.004 },
    { y: 0.26, rx: 0.192, rz: 0.115, zOff: 0.006 },
    { y: 0.355, rx: 0.212, rz: 0.108, zOff: 0.002 }, // fuller natural jacket shoulder slope!
    { y: 0.415, rx: 0.142, rz: 0.090 },
  ];
  addPart(spine, loftRings(torsoRings, 40), hoodieTorsoMat, { pos: [0, -0.02, 0], outline: 0.0044 });

  // Resting Hood Drape cleanly behind shoulders & neck (zero clipping across front cream tee collar!)
  const hoodRings: RingSpec[] = [
    { y: 0.06, rx: 0.148, rz: 0.095, zOff: -0.098, mod: (th) => 1 + 0.14 * Math.max(0, -Math.sin(th)) },
    { y: 0.145, rx: 0.158, rz: 0.102, zOff: -0.086, mod: (th) => 1 + 0.10 * Math.sin(th * 4) },
    { y: 0.215, rx: 0.118, rz: 0.082, zOff: -0.062 },
  ];
  addPart(chest, loftRings(hoodRings, 28), hoodieMat, { outline: 0.004 });

  // Seamless Matte Hoodie Arms (NO detached shoulder ball seams or black elbow rings!)
  const buildArm = (side: -1 | 1, sh: THREE.Group, el: THREE.Group, wr: THREE.Group) => {
    const shCap = new THREE.SphereGeometry(0.058, 16, 14);
    shCap.scale(0.96, 1.08, 0.96);
    addPart(sh, shCap, hoodieMat, { pos: [0, -0.01, 0], outline: 0 });
    addPart(sh, sculptLimbGeo(0.275, 0.058, 0.055, 0.050, { muscleBell: 0.05 }), hoodieMat, { outline: 0.004 });
    addPart(el, new THREE.SphereGeometry(0.049, 14, 12), hoodieMat, { outline: 0 });
    addPart(el, sculptLimbGeo(0.245, 0.050, 0.048, 0.040), hoodieMat, { outline: 0.004 });
    addPart(el, new THREE.CylinderGeometry(0.042, 0.036, 0.044, 18), pantsMat, { pos: [0, -0.232, 0], outline: 0.0034 });
    const hand = buildHand3D(side, skinMat, { scale: 0.96, claws: false, outline: 0.0028 });
    wr.add(hand.root);
    return hand;
  };
  const handL = buildArm(1, shoulderL, elbowL, wristL);
  const handR = buildArm(-1, shoulderR, elbowR, wristR);

  // ---- 3. Matte Cargo Trousers & High-Top Sneakers ----
  addPart(hips, loftRings([
    { y: -0.14, rx: 0.150, rz: 0.106 },
    { y: -0.04, rx: 0.152, rz: 0.108 },
    { y: 0.02, rx: 0.146, rz: 0.104 },
  ], 28), pantsMat, { outline: 0.0042 });

  const buildLeg = (side: -1 | 1, th: THREE.Group, kn: THREE.Group, an: THREE.Group) => {
    addPart(th, sculptLimbGeo(0.425, 0.082, 0.078, 0.064, { bulgeAt: 0.32, muscleBell: 0.07 }), pantsMat, { outline: 0.0042 });
    addPart(th, new THREE.BoxGeometry(0.022, 0.115, 0.088), hoodieMat, { pos: [side * 0.076, -0.21, 0], outline: 0.0026 });
    addPart(kn, new THREE.SphereGeometry(0.062, 14, 12), pantsMat, { outline: 0 });
    addPart(kn, sculptLimbGeo(0.415, 0.064, 0.062, 0.052, { bulgeAt: 0.25, muscleBell: -0.05 }), pantsMat, { outline: 0.0042 });

    // High-Top Streetwear Sneakers (tucking snugly into pant cuffs!)
    addPart(an, loftRings([
      { y: -0.080, rx: 0.056, rz: 0.125, zOff: 0.048 },
      { y: -0.050, rx: 0.057, rz: 0.127, zOff: 0.048 },
    ], 24), shoeWhiteMat, { outline: 0.0036 });
    addPart(an, loftRings([
      { y: -0.052, rx: 0.053, rz: 0.116, zOff: 0.042 },
      { y: -0.020, rx: 0.048, rz: 0.088, zOff: 0.022 },
      { y: 0.048, rx: 0.048, rz: 0.056, zOff: -0.004 },
    ], 24), shoeDarkMat, { outline: 0.0036 });
    const toeCap = new THREE.SphereGeometry(0.048, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    toeCap.scale(1.06, 0.72, 1.38);
    addPart(an, toeCap, shoeWhiteMat, { pos: [0, -0.048, 0.105], outline: 0.0028 });
    addPart(an, new THREE.BoxGeometry(0.032, 0.062, 0.024), shoeWhiteMat, {
      pos: [0, 0.004, 0.048],
      rot: [-0.36, 0, 0],
      outline: 0.002,
    });
  };
  buildLeg(1, thighL, kneeL, ankleL);
  buildLeg(-1, thighR, kneeR, ankleR);

  const joints: RigJoints = {
    hips, spine, chest, neck, head,
    shoulderL, elbowL, wristL,
    shoulderR, elbowR, wristR,
    thighL, kneeL, ankleL,
    thighR, kneeR, ankleR,
  };
  const { overlay, boneCount } = attachBoneVisualizer(joints);

  const setPose = (pose: string, t = 0) => {
    const all = [
      hips, spine, chest, neck, head,
      shoulderL, elbowL, wristL, shoulderR, elbowR, wristR,
      thighL, kneeL, ankleL, thighR, kneeR, ankleR,
    ];
    for (const j of all) j.rotation.set(0, 0, 0);
    hips.position.set(0, 0.94, 0);

    const br = Math.sin(t * 2.5) * 0.02;
    if (pose === "a_pose") {
      chest.rotation.set(br * 0.4, 0, 0);
      shoulderL.rotation.set(0.04, 0, 0.34);
      elbowL.rotation.set(-0.15, 0, -0.08);
      shoulderR.rotation.set(0.04, 0, -0.34);
      elbowR.rotation.set(-0.15, 0, 0.08);
      thighL.rotation.set(0, -0.05, 0.04);
      thighR.rotation.set(0, 0.05, -0.04);
      handL.setGesture("open");
      handR.setGesture("open");
    } else if (pose === "wake_orb") {
      spine.rotation.set(0, -0.14, 0);
      chest.rotation.set(-0.02 + br, -0.08, 0);
      head.rotation.set(0.04, 0.16, 0.04);
      shoulderL.rotation.set(-0.68, 0.12, 0.45);
      elbowL.rotation.set(-0.98, 0.12, 0.25);
      wristL.rotation.set(-0.42, 0.35, -0.55);
      handL.setGesture("open");
      shoulderR.rotation.set(0.18, 0.12, -0.26);
      elbowR.rotation.set(-0.55, 0, 0.32);
      handR.setGesture("relaxed");
      thighL.rotation.set(-0.04, -0.1, 0.06);
      thighR.rotation.set(0.06, 0.1, -0.06);
    } else if (pose === "power_aura") {
      hips.position.set(0, 0.91, 0);
      spine.rotation.set(0.06, 0, 0);
      chest.rotation.set(-0.08 + br, 0, 0);
      head.rotation.set(0.12, 0, 0);
      shoulderL.rotation.set(0.12, -0.18, 0.52);
      elbowL.rotation.set(-0.48, 0, -0.18);
      handL.setGesture("fist");
      shoulderR.rotation.set(0.12, 0.18, -0.52);
      elbowR.rotation.set(-0.48, 0, 0.18);
      handR.setGesture("fist");
      thighL.rotation.set(-0.14, -0.16, 0.16);
      kneeL.rotation.set(0.24, 0, 0);
      ankleL.rotation.set(-0.10, 0, -0.14);
      thighR.rotation.set(-0.14, 0.16, -0.16);
      kneeR.rotation.set(0.24, 0, 0);
      ankleR.rotation.set(-0.10, 0, 0.14);
    } else if (pose === "shock_recoil") {
      spine.rotation.set(-0.12, 0, 0);
      head.rotation.set(-0.08, 0, 0.05);
      shoulderL.rotation.set(-0.95, -0.22, 0.55);
      elbowL.rotation.set(-1.12, 0, -0.22);
      handL.setGesture("open");
      shoulderR.rotation.set(-0.95, 0.22, -0.55);
      elbowR.rotation.set(-1.12, 0, 0.22);
      handR.setGesture("open");
      thighL.rotation.set(-0.08, -0.1, 0.10);
      kneeL.rotation.set(0.18, 0, 0);
      thighR.rotation.set(0.08, 0.1, -0.10);
      kneeR.rotation.set(0.12, 0, 0);
    }
  };
  setPose("wake_orb", 0);

  const setExpr = (rawExpr: MCExpr3D | string, t = -1) => {
    let expr: MCExpr3D =
      rawExpr === "power" || rawExpr === "intense" || rawExpr === "snarl"
        ? "power"
        : rawExpr === "shock"
        ? "shock"
        : rawExpr === "pain"
        ? "pain"
        : rawExpr === "shout"
        ? "shout"
        : rawExpr === "blink"
        ? "blink"
        : "normal";
    // Natural deterministic anime eye-blink every ~3.4 s during calm `normal` expression!
    if (expr === "normal" && t >= 0 && ((t + 0.85) % 3.4) < 0.13) {
      expr = "blink";
    }
    faceMat.uniforms.uMap.value = faceTextures[expr];
    const glow = expr === "power" || expr === "pain" || expr === "shout";
    faceMat.uniforms.uRimColor.value.set(glow ? pRimLight : "#ffe4d4");
    faceMat.uniforms.uRimStrength.value = glow ? 0.52 : 0.30;
    hairMat.uniforms.uRimColor.value.set(glow ? pRimHair : "#6c76a8");
    hoodieMat.uniforms.uRimColor.value.set(glow ? pRimLight : "#8896ba");
    hoodieTorsoMat.uniforms.uRimColor.value.set(glow ? pRimLight : "#9aa8cc");
  };

  /** Universal Continuous 3D Bone Animation Library for Voidmetric What-If Episodes! */
  const setAction = (action: string, p: number, t: number) => {
    const all = [
      hips, spine, chest, neck, head,
      shoulderL, elbowL, wristL, shoulderR, elbowR, wristR,
      thighL, kneeL, ankleL, thighR, kneeR, ankleR,
    ];
    for (const j of all) j.rotation.set(0, 0, 0);
    hips.position.set(0, 0.94, 0);

    const br = Math.sin(t * 2.8) * 0.024;
    const sway = Math.sin(t * 1.6) * 0.035;

    if (action === "wake_discover") {
      // p=0..0.38: stares at glowing power above left palm; p=0.38..0.56: reaches right hand to test; p=0.56..1: pulls back in awe!
      setExpr(p > 0.14 ? "power" : "normal", t);
      const reach = smStep(0.32, 0.48, p) * (1 - smStep(0.58, 0.78, p));
      const tapSnap = smStep(0.47, 0.51, p) * (1 - smStep(0.51, 0.56, p));
      const awe = smStep(0.58, 0.76, p);

      hips.position.y = 0.94 + Math.sin(t * 2.4) * 0.008 - reach * 0.025;
      spine.rotation.set(reach * 0.14 - awe * 0.06, lerp(-0.14, 0.22, reach) - awe * 0.10, sway * 0.4);
      chest.rotation.set(br + reach * 0.08, lerp(-0.10, 0.18, reach), 0);
      head.rotation.set(lerp(0.14, 0.28, reach) - awe * 0.12, lerp(0.24, -0.24, reach) + Math.sin(t * 1.9) * 0.04, lerp(0.05, -0.04, reach));

      shoulderL.rotation.set(lerp(-0.72, -0.35, awe) + br, 0.12, lerp(0.46, 0.26, awe));
      elbowL.rotation.set(lerp(-1.02, -0.68, awe), 0.12, 0.22);
      wristL.rotation.set(-0.40, 0.32, -0.52);
      handL.setGesture("open");

      shoulderR.rotation.set(lerp(0.16, -0.96, reach) - awe * 0.24, lerp(0.12, -0.18, reach), lerp(-0.24, -0.12, reach) - awe * 0.16);
      elbowR.rotation.set(lerp(-0.52, -0.32, reach) - tapSnap * 0.24 - awe * 0.48, 0, lerp(0.28, 0.05, reach));
      wristR.rotation.set(tapSnap * 0.42, 0, 0);
      handR.setGesture(reach > 0.2 ? "point_up" : "open");

      thighL.rotation.set(-0.04 - reach * 0.06, -0.10, 0.06);
      kneeL.rotation.set(0.06 + reach * 0.12, 0, 0);
      thighR.rotation.set(0.06 + reach * 0.08, 0.10, -0.06);
      kneeR.rotation.set(0.04 + reach * 0.10, 0, 0);
    } else if (action === "power_awe") {
      // Looks up watching energy sparks/phenomenon, gentle amazed weight shift!
      setExpr("power", t);
      hips.position.y = 0.94 + Math.sin(t * 2.2) * 0.008;
      spine.rotation.set(-0.08 + br * 0.6, Math.sin(t * 1.1) * 0.12, sway * 0.5);
      chest.rotation.set(-0.06 + br, Math.cos(t * 0.9) * 0.08, 0);
      head.rotation.set(-0.26 - p * 0.14 + Math.sin(t * 1.5) * 0.05, Math.sin(t * 1.3) * 0.22, Math.sin(t * 1.1) * 0.06);
      shoulderL.rotation.set(-0.76 + Math.sin(t * 2.1) * 0.08, 0.14, 0.36);
      elbowL.rotation.set(-1.12, 0.12, 0.22);
      wristL.rotation.set(-0.35, 0.28, -0.45);
      handL.setGesture("open");
      shoulderR.rotation.set(-0.42 + Math.cos(t * 1.8) * 0.08, -0.10, -0.28);
      elbowR.rotation.set(-0.88, 0, 0.18);
      handR.setGesture("open");
      thighL.rotation.set(-0.04, -0.08, 0.06);
      thighR.rotation.set(0.04, 0.08, -0.06);
    } else if (action === "power_slash") {
      // Steps in, swings right hand sharply to strike/slice target, recoils slightly!
      setExpr("power", t);
      const prep = smStep(0.0, 0.24, p);
      const strike = smStep(0.24, 0.34, p);
      const recoil = smStep(0.34, 0.55, p);

      hips.position.y = 0.93 - prep * 0.03 + recoil * 0.02;
      spine.rotation.set(prep * 0.10 - recoil * 0.08, lerp(-0.22, 0.28, strike) - recoil * 0.12, 0);
      chest.rotation.set(br, lerp(-0.18, 0.26, strike), 0);
      head.rotation.set(0.02 - recoil * 0.06, lerp(0.18, -0.34, strike), 0);

      const holdSlice = smStep(0.22, 0.34, p) * (1 - smStep(0.70, 0.95, p));
      shoulderR.rotation.set(lerp(0.15, -1.32, holdSlice), lerp(0.22, -0.45, holdSlice), lerp(-0.32, -0.48, holdSlice));
      elbowR.rotation.set(lerp(-0.95, -0.14, holdSlice), 0, 0.12);
      wristR.rotation.set(holdSlice * -0.35, 0, 0);
      handR.setGesture(holdSlice > 0.25 ? "point_up" : "fist");

      shoulderL.rotation.set(0.22, -0.16, 0.34 + recoil * 0.14);
      elbowL.rotation.set(-0.68, 0, -0.22);
      handL.setGesture("fist");

      thighL.rotation.set(-0.14 * prep, -0.14, 0.12);
      kneeL.rotation.set(0.22 * prep, 0, 0);
      thighR.rotation.set(0.14 * prep, 0.14, -0.12);
      kneeR.rotation.set(0.16 * prep, 0, 0);
    } else if (action === "aura_surge") {
      // Explosive anime power-up stance! Fists pump outward, head tracks threats!
      setExpr("power", t);
      const surge = smStep(0.0, 0.24, p);
      const vib = Math.sin(t * 24) * 0.012;
      hips.position.y = 0.90 - surge * 0.03 + Math.sin(t * 6) * 0.008;
      spine.rotation.set(0.08 + vib, Math.sin(t * 2.6) * 0.10, 0);
      chest.rotation.set(-0.12 * surge + br * 1.4, Math.sin(t * 2.6) * 0.08, 0);
      head.rotation.set(0.12 - surge * 0.04, Math.sin(t * 3.4) * 0.26, Math.cos(t * 2.2) * 0.05);

      const armFlare = 0.42 + surge * 0.28 + Math.sin(t * 7) * 0.04;
      shoulderL.rotation.set(0.16 + vib, -0.22, armFlare);
      elbowL.rotation.set(-0.56 - surge * 0.22, 0, -0.18);
      handL.setGesture("fist");
      shoulderR.rotation.set(0.16 - vib, 0.22, -armFlare);
      elbowR.rotation.set(-0.56 - surge * 0.22, 0, 0.18);
      handR.setGesture("fist");

      thighL.rotation.set(-0.18, -0.18, 0.18);
      kneeL.rotation.set(0.32, 0, 0);
      ankleL.rotation.set(-0.14, 0, -0.16);
      thighR.rotation.set(-0.18, 0.18, -0.18);
      kneeR.rotation.set(0.32, 0, 0);
      ankleR.rotation.set(-0.14, 0, 0.16);
    } else if (action === "blast_recoil") {
      // p=0..0.52: crouches & triggers power; p=0.52..1: violent shockwave recoil shielding face!
      const boom = smStep(0.54, 0.66, p);
      setExpr(boom > 0.3 ? "shock" : "power", t);
      hips.position.y = lerp(0.88, 0.92, boom) + Math.sin(t * 16) * 0.01 * boom;
      spine.rotation.set(lerp(0.24, -0.22, boom), lerp(0.12, -0.18, boom), 0);
      chest.rotation.set(lerp(0.16, -0.14, boom), lerp(0.08, -0.16, boom), 0);
      head.rotation.set(lerp(0.32, -0.18, boom), lerp(-0.10, 0.24, boom), boom * 0.08);

      shoulderL.rotation.set(lerp(0.10, -1.45, boom), lerp(0, -0.42, boom), lerp(0.28, 0.35, boom));
      elbowL.rotation.set(lerp(-0.45, -1.42, boom), 0, lerp(0, -0.35, boom));
      handL.setGesture("open");
      shoulderR.rotation.set(lerp(-0.98, -1.38, boom), lerp(-0.12, 0.38, boom), lerp(-0.18, -0.45, boom));
      elbowR.rotation.set(lerp(-0.35, -1.25, boom), 0, lerp(0.10, 0.30, boom));
      handR.setGesture(boom > 0.3 ? "open" : "point_up");

      thighL.rotation.set(lerp(-0.28, -0.18, boom), -0.14, 0.14);
      kneeL.rotation.set(lerp(0.48, 0.32, boom), 0, 0);
      thighR.rotation.set(lerp(-0.16, 0.12, boom), 0.14, -0.14);
      kneeR.rotation.set(lerp(0.28, 0.22, boom), 0, 0);
    } else if (action === "hand_shock") {
      // Stares down at trembling hand in sheer disbelief!
      setExpr("shock", t);
      const shake = Math.sin(t * 18) * 0.016;
      hips.position.y = 0.93 + Math.sin(t * 3.5) * 0.01;
      spine.rotation.set(-0.08 + br, Math.sin(t * 1.4) * 0.08, 0);
      head.rotation.set(0.18 - p * 0.26, Math.sin(t * 2.4) * 0.18, 0.08);
      shoulderL.rotation.set(-0.78 + shake, -0.18, 0.42);
      elbowL.rotation.set(-1.18, 0, -0.24);
      handL.setGesture("open");
      shoulderR.rotation.set(-0.88 - shake, 0.18, -0.36);
      elbowR.rotation.set(-1.26, 0, 0.28);
      handR.setGesture("open");
      thighL.rotation.set(-0.08, -0.10, 0.10);
      kneeL.rotation.set(0.16, 0, 0);
      thighR.rotation.set(0.08, 0.10, -0.10);
      kneeR.rotation.set(0.12, 0, 0);
    } else if (action === "power_backlash") {
      // Power overload / backlash agony! Clutches burning right wrist with left hand, recoiling!
      setExpr("pain", t);
      const throb = Math.sin(t * 22) * 0.025;
      const recoil = smStep(0.15, 0.75, p);
      hips.position.y = 0.92 - recoil * 0.04;
      spine.rotation.set(-0.14 * recoil + throb, -0.24 + Math.sin(t * 3.2) * 0.10, -0.06);
      chest.rotation.set(0.12 - recoil * 0.10, -0.16, 0);
      head.rotation.set(0.16 - recoil * 0.22 + throb, 0.28 + Math.sin(t * 4.5) * 0.12, -0.12);

      shoulderR.rotation.set(-0.85 + throb * 1.5, -0.32, -0.26);
      elbowR.rotation.set(-1.05 + throb * 2.0, 0.15, 0.35);
      wristR.rotation.set(-0.35, 0, 0.25);
      handR.setGesture("power_palm");

      shoulderL.rotation.set(-0.92, 0.48, 0.18);
      elbowL.rotation.set(-1.18, 0.22, -0.45);
      handL.setGesture("fist");

      thighL.rotation.set(-0.16, -0.12, 0.12);
      kneeL.rotation.set(0.28, 0, 0);
      thighR.rotation.set(0.14, 0.12, -0.14);
      kneeR.rotation.set(0.22, 0, 0);
    } else if (action === "midnight_slip") {
      // Half-asleep nodding -> sudden involuntary finger slip downward -> jolts awake in horror!
      const slip = smStep(0.45, 0.68, p);
      const jolt = smStep(0.68, 0.88, p);
      setExpr(jolt > 0.2 ? "shock" : "power", t);
      hips.position.y = 0.92 - slip * 0.04 + jolt * 0.03;
      spine.rotation.set(0.14 + slip * 0.10 - jolt * 0.18, -0.12 + jolt * 0.14, 0.06 - jolt * 0.08);
      head.rotation.set(0.30 - jolt * 0.38, -0.12 + jolt * 0.22, 0.10 - jolt * 0.12);

      // Left hand droops lazily then drops to tap the floor!
      shoulderL.rotation.set(lerp(0.12, -0.45, slip), 0.08, lerp(0.22, 0.38, slip));
      elbowL.rotation.set(lerp(-0.45, -0.15, slip), 0, 0);
      handL.setGesture(slip > 0.3 ? "point_up" : "relaxed");

      shoulderR.rotation.set(0.16 - jolt * 0.55, 0, -0.22 - jolt * 0.22);
      elbowR.rotation.set(-0.42 - jolt * 0.65, 0, 0.18);
      handR.setGesture(jolt > 0.3 ? "open" : "relaxed");
      thighL.rotation.set(-0.08, -0.06, 0.06);
      kneeL.rotation.set(0.16, 0, 0);
      thighR.rotation.set(0.06, 0.06, -0.06);
      kneeR.rotation.set(0.12, 0, 0);
    } else {
      setPose(action, t);
    }
  };

  return {
    name: "Channel MC",
    root,
    joints,
    handL,
    handR,
    setPose,
    setAction,
    setExpr,
    setXRayRig: (on) => applyXRayMode(root, overlay, on),
    getBoneCount: () => boneCount,
  };
}
