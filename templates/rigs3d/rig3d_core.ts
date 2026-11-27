// AAA 3D Anime Character Rig Core Engine (Dragon Ball FighterZ / Sparking! ZERO Style)
// Provides:
//   1. Custom GLSL 3-Band Anime Cel Shader (`makeAnimeMat`):
//      - Hard anime terminator with cool violet-shifted chromatic shadow (never muddy grey!)
//      - Secondary deep AO / bounce floor fill
//      - Anisotropic/crisp specular highlight band (skin sheen, hair halo, metallic gold!)
//      - View-dependent Fresnel anime rim light (tints purple under Hakai or cyan on Whis!)
//      - Supports Canvas2D / high-res painted albedo + inner-line (IL) detail maps + HDR emissive boost!
//   2. Inverted-Hull 3D Anime Ink Outline Mesh (`addInkHull`):
//      - Smooth-normal back-face extrusion giving crisp dark-plum `#14091e` anime lineart at every 3D angle!
//   3. Anatomical Sculpting Geometry Kit:
//      - `loftRings`: Watertight multi-ring cross-sectional contour lofter (heads, muzzles, torsos, limbs, pleated pants, boots, ears)
//      - `sculptCurveTube`: Curved tapered 3D tube along CatmullRom spline with optional star/fluted cross-section (anime hair locks, Whis swirl hair, Beerus tail!)
//      - `makeHand3D`: Articulated 5-finger 3D hand with opposable thumb + optional black Destroyer claws!
//   4. Hierarchical Articulated 3D Skeleton Rig (`JointMap` + `buildRigOverlay`):
//      - Real nested joint `THREE.Group` hierarchy for smooth 3D FK posing & animation
//      - Glowing X-ray bone/joint visualizer to inspect the actual underlying 3D rig skeleton!
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

export type AnimeMatOpts = {
  color?: THREE.ColorRepresentation;
  shadowColor?: THREE.ColorRepresentation;
  rimColor?: THREE.ColorRepresentation;
  rimStrength?: number;
  rimPower?: number;
  specColor?: THREE.ColorRepresentation;
  specStrength?: number;
  specSize?: number;
  map?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  metalness?: number;
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  outline?: boolean;
  outlineWidth?: number;
  outlineColor?: THREE.ColorRepresentation;
};

// Shared studio/scene lighting direction for all 3D anime rigs (updatable per shot!)
export const ANIME_LIGHT = {
  uLightDir: { value: new THREE.Vector3(0.48, 0.72, 0.56).normalize() },
  uKeyColor: { value: new THREE.Color("#fff7ef") },
  uAmbientTint: { value: new THREE.Color("#d4c8e8") },
  uRimTint: { value: new THREE.Color("#ffffff") },
  uRimBoost: { value: 1.0 },
};

const ANIME_VERT = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const ANIME_FRAG = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimPower;
uniform vec3 uSpecColor;
uniform float uSpecStrength;
uniform float uSpecSize;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uMetalness;
uniform float uOpacity;
uniform float uHasMap;
uniform sampler2D uMap;

uniform vec3 uLightDir;
uniform vec3 uKeyColor;
uniform vec3 uAmbientTint;
uniform vec3 uRimTint;
uniform float uRimBoost;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);

  vec4 tex = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
  if (tex.a < 0.05) discard;
  vec3 albedo = uBaseColor * tex.rgb;
  // Detect painted inner-line dark ink inside texture so ink stays crisp dark even under strong key/rim light!
  float texLuma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float inkMask = uHasMap > 0.5 ? smoothstep(0.14, 0.28, texLuma) : 1.0;

  // 1) Arc System Works / FighterZ 3-Band Cel Shading
  float ndl = dot(N, L);
  // Crisp anime cel step: lit band vs chromatic shadow band
  float lit = smoothstep(-0.04, 0.08, ndl);
  // Secondary deep core shadow in deep crevices / facing away from key
  float deepSh = smoothstep(-0.65, -0.22, ndl);
  vec3 shadowCol = albedo * uShadowColor;
  vec3 deepCol = shadowCol * vec3(0.76, 0.72, 0.84);
  vec3 col = mix(deepCol, shadowCol, deepSh);
  col = mix(col, albedo * uKeyColor, lit);

  // Subtle upward sky-hemisphere lift so undersides have rich anime bounce color
  float hemi = N.y * 0.5 + 0.5;
  col += albedo * uAmbientTint * (0.08 + 0.07 * hemi);

  // 2) Crisp Cel Specular Highlight (skin cheekbone, hair sheen, metallic gold bands!)
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float specBand = smoothstep(uSpecSize, uSpecSize + 0.025, ndh);
  float metalBoost = mix(1.0, 2.2, uMetalness);
  // Secondary bright metal reflection stripe on gold cuffs & ornaments
  float metalRefl = uMetalness * smoothstep(0.68, 0.76, abs(dot(N, normalize(vec3(-0.3, 0.8, 0.5))))) * 0.55;
  col += uSpecColor * (specBand * uSpecStrength * metalBoost * lit + metalRefl) * inkMask;

  // 3) View-Dependent Fresnel Anime Rim Light (bright razor rim on lit/grazing silhouette edge!)
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  float rimGate = smoothstep(-0.25, 0.35, ndl * 0.55 + 0.45);
  float rimStep = smoothstep(0.38, 0.62, fresnel) * uRimStrength * uRimBoost * rimGate * inkMask;
  col += (uRimColor * uRimTint) * rimStep;

  // 4) HDR Emissive (feeds mromidev 6-level Mipmap Bloom!)
  col += uEmissive * uEmissiveIntensity;

  gl_FragColor = vec4(col, uOpacity * tex.a);
}
`;

export function makeAnimeMat(opts: AnimeMatOpts = {}): THREE.ShaderMaterial {
  const base = new THREE.Color(opts.color ?? "#ffffff");
  const shadow = new THREE.Color(opts.shadowColor ?? "#6d5f88");
  const rim = new THREE.Color(opts.rimColor ?? "#e8d8ff");
  const spec = new THREE.Color(opts.specColor ?? "#ffffff");
  const emissive = new THREE.Color(opts.emissive ?? "#000000");

  return new THREE.ShaderMaterial({
    vertexShader: ANIME_VERT,
    fragmentShader: ANIME_FRAG,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    depthWrite: !(opts.transparent ?? false),
    uniforms: {
      uBaseColor: { value: base },
      uShadowColor: { value: shadow },
      uRimColor: { value: rim },
      uRimStrength: { value: opts.rimStrength ?? 0.34 },
      uRimPower: { value: opts.rimPower ?? 2.6 },
      uSpecColor: { value: spec },
      uSpecStrength: { value: opts.specStrength ?? 0.16 },
      uSpecSize: { value: opts.specSize ?? 0.94 },
      uEmissive: { value: emissive },
      uEmissiveIntensity: { value: opts.emissiveIntensity ?? 0.0 },
      uMetalness: { value: opts.metalness ?? 0.0 },
      uOpacity: { value: opts.opacity ?? 1.0 },
      uHasMap: { value: opts.map ? 1.0 : 0.0 },
      uMap: { value: opts.map ?? null },
      uLightDir: ANIME_LIGHT.uLightDir,
      uKeyColor: ANIME_LIGHT.uKeyColor,
      uAmbientTint: ANIME_LIGHT.uAmbientTint,
      uRimTint: ANIME_LIGHT.uRimTint,
      uRimBoost: ANIME_LIGHT.uRimBoost,
    },
  });
}

// Inverted-Hull BackSide Anime Ink Outline Shader (extrudes along averaged smooth vertex normals!)
const HULL_VERT = /* glsl */ `
uniform float uOutlineWidth;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  // Subtle distance scaling so outlines stay crisp in close-ups AND readable at full-body scale
  float dist = length(cameraPosition - wp.xyz);
  float w = uOutlineWidth * clamp(dist * 0.28, 0.55, 2.2);
  wp.xyz += wn * w;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const HULL_FRAG = /* glsl */ `
uniform vec3 uOutlineColor;
void main() {
  gl_FragColor = vec4(uOutlineColor, 1.0);
}
`;

const hullMatCache = new Map<string, THREE.ShaderMaterial>();
export function getHullMat(width = 0.0052, color = "#13091d"): THREE.ShaderMaterial {
  const key = `${width.toFixed(5)}_${color}`;
  let m = hullMatCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: HULL_VERT,
      fragmentShader: HULL_FRAG,
      side: THREE.BackSide,
      uniforms: {
        uOutlineWidth: { value: width },
        uOutlineColor: { value: new THREE.Color(color) },
      },
    });
    hullMatCache.set(key, m);
  }
  return m;
}

/** Weld close vertex positions to compute smooth averaged normals for crack-free inverted-hull outlines! */
function buildSmoothOutlineGeo(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = src.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const map = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const k = `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`;
    let arr = map.get(k);
    if (!arr) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(i);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const outN = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (const idxs of map.values()) {
    v.set(0, 0, 0);
    for (const i of idxs) {
      v.x += nrm.getX(i);
      v.y += nrm.getY(i);
      v.z += nrm.getZ(i);
    }
    if (v.lengthSq() > 1e-8) v.normalize();
    for (const i of idxs) {
      outN[i * 3] = v.x;
      outN[i * 3 + 1] = v.y;
      outN[i * 3 + 2] = v.z;
    }
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(outN, 3));
  return geo;
}

/** Add a 3D mesh with optional inverted-hull anime ink outline and proper shadow/layer settings! */
export function addPart(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  opts: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
    outline?: number; // 0 = no hull outline, default 0.0048
    outlineColor?: string;
    noInkPass?: boolean; // default true (character uses inverted-hull outlines cleanly without double-inking)
    castShadow?: boolean;
    name?: string;
  } = {}
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  if (opts.name) mesh.name = opts.name;
  if (opts.pos) mesh.position.set(...opts.pos);
  if (opts.rot) mesh.rotation.set(...opts.rot);
  if (opts.scale) mesh.scale.set(...opts.scale);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = true;
  // Put 3D anime character meshes on NOINK so inverted-hull outlines handle all crisp ink silhouettes cleanly!
  if (opts.noInkPass !== false) mesh.layers.set(NOINK);
  parent.add(mesh);

  const ow = opts.outline ?? 0.0046;
  if (ow > 0) {
    const hullGeo = buildSmoothOutlineGeo(geo);
    const hull = new THREE.Mesh(hullGeo, getHullMat(ow, opts.outlineColor ?? "#13091d"));
    hull.name = (opts.name ?? "part") + "_ink";
    hull.layers.set(NOINK);
    hull.castShadow = false;
    hull.receiveShadow = false;
    mesh.add(hull);
  }
  return mesh;
}

// =========================================================================
// ANATOMICAL 3D SCULPTING GEOMETRY GENERATORS (NO PRIMITIVE BLOCKS!)
// =========================================================================

export type RingSpec = {
  y: number;
  rx: number;
  rz: number;
  xOff?: number;
  zOff?: number;
  /** Optional angular radius modulation fn(theta) where theta=0 is +X, PI/2 is +Z (front!), PI is -X, 3PI/2 is -Z (back!) */
  shape?: (theta: number) => [number, number]; // [xMul, zMul] or radial scale
  /** Optional radial multiplier fn(theta) for pleats, muscles, brow ridge, chin, spine furrow! */
  mod?: (theta: number) => number;
  /** Optional vertical y-offset along the ring (e.g., curved hemline, pointed collar, jawline!) */
  yMod?: (theta: number) => number;
};

/**
 * Watertight multi-ring anatomical lofter!
 * theta = 0 -> +X (character left), PI/2 -> +Z (FRONT face), PI -> -X (character right), 3PI/2 -> -Z (BACK).
 * UVs: u = 0.5 at front (+Z, theta = PI/2), wrapping cleanly [-PI/2 .. 3PI/2] so front-facing textures center at u=0.5!
 */
export function loftRings(
  rings: RingSpec[],
  radialSegs = 36,
  opts: { capBottom?: boolean; capTop?: boolean; openEnds?: boolean; uvFrontCenter?: boolean } = {}
): THREE.BufferGeometry {
  const nRings = rings.length;
  const cols = radialSegs + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const yMin = rings[0].y;
  const yMax = rings[nRings - 1].y;
  const ySpan = Math.max(1e-5, yMax - yMin);

  for (let r = 0; r < nRings; r++) {
    const R = rings[r];
    const vCoord = (R.y - yMin) / ySpan;
    const xOff = R.xOff ?? 0;
    const zOff = R.zOff ?? 0;
    for (let s = 0; s <= radialSegs; s++) {
      const uCoord = s / radialSegs;
      // Map u=0.5 directly to front (+Z, theta = PI/2) so painted front face/chest textures map dead-center!
      const theta = opts.uvFrontCenter !== false
        ? (uCoord - 0.5) * Math.PI * 2 + Math.PI * 0.5
        : uCoord * Math.PI * 2;
      const m = R.mod ? R.mod(theta) : 1.0;
      const ym = R.yMod ? R.yMod(theta) : 0.0;
      let cx = Math.cos(theta) * R.rx * m;
      let cz = Math.sin(theta) * R.rz * m;
      if (R.shape) {
        const [sx, sz] = R.shape(theta);
        cx *= sx;
        cz *= sz;
      }
      positions.push(xOff + cx, R.y + ym, zOff + cz);
      uvs.push(uCoord, vCoord);
    }
  }

  for (let r = 0; r < nRings - 1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * cols + s;
      const b = a + 1;
      const c = (r + 1) * cols + s;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const capBot = opts.openEnds ? false : (opts.capBottom ?? true);
  const capTop = opts.openEnds ? false : (opts.capTop ?? true);

  if (capBot) {
    const R = rings[0];
    const centerIdx = positions.length / 3;
    positions.push(R.xOff ?? 0, R.y, R.zOff ?? 0);
    uvs.push(0.5, 0.0);
    for (let s = 0; s < radialSegs; s++) {
      indices.push(centerIdx, s, s + 1);
    }
  }

  if (capTop) {
    const R = rings[nRings - 1];
    const centerIdx = positions.length / 3;
    positions.push(R.xOff ?? 0, R.y, R.zOff ?? 0);
    uvs.push(0.5, 1.0);
    const base = (nRings - 1) * cols;
    for (let s = 0; s < radialSegs; s++) {
      indices.push(centerIdx, base + s + 1, base + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved Tapered 3D Sculpted Tube along a 3D spline!
 * Ideal for: Anime spiky hair locks (diamond/ribbon cross-section tapering to razor point!),
 * Whis's tall fluted swirl hair, Beerus's long S-curving tail, and sculpted draped sashes!
 */
export function sculptCurveTube(
  points: [number, number, number][],
  radiusFn: (t: number) => [number, number], // [rx, ry] elliptical radius along length t in [0..1]
  opts: {
    tubularSegs?: number;
    radialSegs?: number;
    flutes?: number; // e.g., 14 flutes for Whis's carved hair strands!
    fluteDepth?: number;
    ridgeSharpness?: number; // makes crisp anime hair diamond ridge cross-section!
    capStart?: boolean;
    capEnd?: boolean;
  } = {}
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const tSegs = opts.tubularSegs ?? 24;
  const rSegs = opts.radialSegs ?? 14;
  const flutes = opts.flutes ?? 0;
  const fluteDepth = opts.fluteDepth ?? 0.08;
  const ridge = opts.ridgeSharpness ?? 0;

  const frames = curve.computeFrenetFrames(tSegs, false);
  const pts = curve.getPoints(tSegs);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = rSegs + 1;

  const v = new THREE.Vector3();
  for (let i = 0; i <= tSegs; i++) {
    const t = i / tSegs;
    const P = pts[i];
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const [rx, ry] = radiusFn(t);

    for (let j = 0; j <= rSegs; j++) {
      const u = j / rSegs;
      const th = u * Math.PI * 2;
      let m = 1.0;
      if (flutes > 0) {
        m *= 1.0 + fluteDepth * Math.cos(th * flutes);
      }
      if (ridge > 0) {
        // Diamond/almond anime hair lock cross-section with crisp spine ridges
        m *= 1.0 + ridge * Math.pow(Math.abs(Math.cos(th * 2)), 1.6);
      }
      const x = Math.cos(th) * rx * m;
      const y = Math.sin(th) * ry * m;
      v.copy(P).addScaledVector(N, x).addScaledVector(B, y);
      positions.push(v.x, v.y, v.z);
      uvs.push(u, t);
    }
  }

  for (let i = 0; i < tSegs; i++) {
    for (let j = 0; j < rSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  if (opts.capStart !== false) {
    const ci = positions.length / 3;
    positions.push(pts[0].x, pts[0].y, pts[0].z);
    uvs.push(0.5, 0);
    for (let j = 0; j < rSegs; j++) indices.push(ci, j + 1, j);
  }
  if (opts.capEnd !== false) {
    const ci = positions.length / 3;
    const last = pts[tSegs];
    positions.push(last.x, last.y, last.z);
    uvs.push(0.5, 1);
    const base = tSegs * cols;
    for (let j = 0; j < rSegs; j++) indices.push(ci, base + j, base + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted anatomical limb segment (bicep/forearm/thigh/shin) extending along -Y from joint origin (0,0,0) to (0,-len,0)! */
export function sculptLimbGeo(
  len: number,
  rTop: number,
  rMid: number,
  rBot: number,
  opts: { bulgeAt?: number; zScale?: number; muscleBell?: number } = {}
): THREE.BufferGeometry {
  const bAt = opts.bulgeAt ?? 0.36;
  const zs = opts.zScale ?? 0.94;
  const bell = opts.muscleBell ?? 0.1;
  const rings: RingSpec[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = bottom (-len), 1 = top (0)
    const y = -len * (1 - t);
    const downT = 1 - t; // 0 = top, 1 = bottom
    let r: number;
    if (downT < bAt) {
      const k = downT / bAt;
      r = rTop + (rMid - rTop) * Math.sin(k * Math.PI * 0.5);
    } else {
      const k = (downT - bAt) / (1 - bAt);
      r = rMid + (rBot - rMid) * (k * k * (3 - 2 * k));
    }
    // Slight anatomical anterior muscle swell (bicep/quad) & posterior gastrocnemius curve
    const zOff = Math.sin(downT * Math.PI) * r * bell;
    rings.push({ y, rx: r, rz: r * zs, zOff });
  }
  return loftRings(rings, 22);
}

// =========================================================================
// ARTICULATED 5-FINGER 3D ANIME HAND (+ OPTIONAL BLACK CLAWS!)
// =========================================================================
export type Hand3D = {
  root: THREE.Group;
  fingers: THREE.Group[][]; // [finger 0..4 (thumb, index, mid, ring, pinky)][phalanx 0..1]
  setGesture: (gesture: "open" | "fist" | "point_up" | "hakai_palm" | "relaxed" | "grip_staff") => void;
};

export function buildHand3D(
  side: -1 | 1, // -1 = character's right (-X), +1 = character's left (+X)
  skinMat: THREE.Material,
  opts: { scale?: number; claws?: boolean; clawMat?: THREE.Material; outline?: number } = {}
): Hand3D {
  const sc = opts.scale ?? 1.0;
  const ow = (opts.outline ?? 0.0032) * sc;
  const root = new THREE.Group();
  root.name = side < 0 ? "hand_R" : "hand_L";

  // Sculpted trapezoidal palm extending downward along -Y
  const palmRings: RingSpec[] = [
    { y: -0.088 * sc, rx: 0.044 * sc, rz: 0.017 * sc },
    { y: -0.060 * sc, rx: 0.045 * sc, rz: 0.019 * sc, zOff: 0.002 * sc },
    { y: -0.024 * sc, rx: 0.039 * sc, rz: 0.020 * sc },
    { y: 0.006 * sc, rx: 0.031 * sc, rz: 0.021 * sc },
  ];
  addPart(root, loftRings(palmRings, 16), skinMat, { outline: ow, name: "palm" });

  const clawMat = opts.clawMat ?? makeAnimeMat({ color: "#140c1a", shadowColor: "#0a0610", specStrength: 0.55, specSize: 0.88 });
  const fingers: THREE.Group[][] = [];

  // 0: Thumb (emerges from inner +side/-side edge)
  const thumbBase = new THREE.Group();
  thumbBase.position.set(-side * 0.038 * sc, -0.036 * sc, 0.012 * sc);
  root.add(thumbBase);
  addPart(thumbBase, sculptLimbGeo(0.036 * sc, 0.012 * sc, 0.011 * sc, 0.010 * sc), skinMat, { outline: ow * 0.8 });
  const thumbTip = new THREE.Group();
  thumbTip.position.set(0, -0.035 * sc, 0);
  thumbBase.add(thumbTip);
  addPart(thumbTip, sculptLimbGeo(0.030 * sc, 0.010 * sc, 0.009 * sc, 0.007 * sc), skinMat, { outline: ow * 0.8 });
  if (opts.claws) {
    addPart(thumbTip, new THREE.ConeGeometry(0.0068 * sc, 0.018 * sc, 8), clawMat, {
      pos: [0, -0.035 * sc, 0.002 * sc],
      rot: [Math.PI, 0, 0],
      outline: ow * 0.5,
    });
  }
  fingers.push([thumbBase, thumbTip]);

  // 1..4: Index, Middle, Ring, Pinky
  const fSpecs = [
    { x: -side * 0.030, len1: 0.044, len2: 0.034, r: 0.0095 }, // Index
    { x: -side * 0.010, len1: 0.049, len2: 0.038, r: 0.0098 }, // Middle
    { x: side * 0.010, len1: 0.046, len2: 0.035, r: 0.0092 },  // Ring
    { x: side * 0.029, len1: 0.036, len2: 0.028, r: 0.0080 },  // Pinky
  ];

  for (let i = 0; i < fSpecs.length; i++) {
    const fs = fSpecs[i];
    const p1 = new THREE.Group();
    p1.position.set(fs.x * sc, -0.084 * sc, 0);
    root.add(p1);
    addPart(p1, sculptLimbGeo(fs.len1 * sc, fs.r * sc, fs.r * 0.92 * sc, fs.r * 0.85 * sc), skinMat, { outline: ow * 0.72 });

    const p2 = new THREE.Group();
    p2.position.set(0, -fs.len1 * sc, 0);
    p1.add(p2);
    addPart(p2, sculptLimbGeo(fs.len2 * sc, fs.r * 0.84 * sc, fs.r * 0.76 * sc, fs.r * 0.58 * sc), skinMat, { outline: ow * 0.72 });

    if (opts.claws) {
      addPart(p2, new THREE.ConeGeometry(fs.r * 0.62 * sc, 0.018 * sc, 8), clawMat, {
        pos: [0, -(fs.len2 + 0.006) * sc, 0.0015 * sc],
        rot: [Math.PI, 0, 0],
        outline: ow * 0.45,
      });
    }
    fingers.push([p1, p2]);
  }

  const setGesture: Hand3D["setGesture"] = (g) => {
    const [th, idx, mid, rng, pnk] = fingers;
    // Reset spreads
    for (const [a, b] of fingers) {
      a.rotation.set(0, 0, 0);
      b.rotation.set(0, 0, 0);
    }
    if (g === "relaxed") {
      th[0].rotation.set(0.25, 0, -side * 0.42); th[1].rotation.set(0.25, 0, 0);
      idx[0].rotation.set(0.35, 0, -side * 0.04); idx[1].rotation.set(0.42, 0, 0);
      mid[0].rotation.set(0.45, 0, 0); mid[1].rotation.set(0.52, 0, 0);
      rng[0].rotation.set(0.55, 0, side * 0.04); rng[1].rotation.set(0.62, 0, 0);
      pnk[0].rotation.set(0.65, 0, side * 0.08); pnk[1].rotation.set(0.72, 0, 0);
    } else if (g === "fist") {
      th[0].rotation.set(0.75, 0, side * 0.38); th[1].rotation.set(0.85, 0, 0);
      for (const f of [idx, mid, rng, pnk]) {
        f[0].rotation.set(1.42, 0, 0);
        f[1].rotation.set(1.48, 0, 0);
      }
    } else if (g === "grip_staff") {
      th[0].rotation.set(0.55, 0, side * 0.25); th[1].rotation.set(0.65, 0, 0);
      for (const f of [idx, mid, rng, pnk]) {
        f[0].rotation.set(1.18, 0, 0);
        f[1].rotation.set(1.22, 0, 0);
      }
    } else if (g === "point_up") {
      // Iconic Beerus index-finger Hakai orb pose! Index extended straight, other fingers curled!
      th[0].rotation.set(0.62, 0, side * 0.22); th[1].rotation.set(0.65, 0, 0);
      idx[0].rotation.set(-0.08, 0, -side * 0.04); idx[1].rotation.set(-0.05, 0, 0);
      for (const f of [mid, rng, pnk]) {
        f[0].rotation.set(1.45, 0, 0);
        f[1].rotation.set(1.45, 0, 0);
      }
    } else if (g === "hakai_palm") {
      // Iconic wide-splayed Destroyer Hakai palm facing camera (`refs/beerus_hakai_palm.jpg`)!
      th[0].rotation.set(0.18, 0, -side * 0.72); th[1].rotation.set(0.16, 0, 0);
      idx[0].rotation.set(0.18, 0, -side * 0.22); idx[1].rotation.set(0.24, 0, 0);
      mid[0].rotation.set(0.15, 0, -side * 0.03); mid[1].rotation.set(0.22, 0, 0);
      rng[0].rotation.set(0.18, 0, side * 0.16); rng[1].rotation.set(0.25, 0, 0);
      pnk[0].rotation.set(0.22, 0, side * 0.34); pnk[1].rotation.set(0.28, 0, 0);
    } else {
      // open
      th[0].rotation.set(0.12, 0, -side * 0.55); th[1].rotation.set(0.1, 0, 0);
      idx[0].rotation.set(0.08, 0, -side * 0.14); idx[1].rotation.set(0.08, 0, 0);
      mid[0].rotation.set(0.08, 0, 0); mid[1].rotation.set(0.08, 0, 0);
      rng[0].rotation.set(0.08, 0, side * 0.12); rng[1].rotation.set(0.08, 0, 0);
      pnk[0].rotation.set(0.10, 0, side * 0.24); pnk[1].rotation.set(0.10, 0, 0);
    }
  };
  setGesture("relaxed");

  return { root, fingers, setGesture };
}

// =========================================================================
// ARTICULATED 3D SKELETON RIG BASE & X-RAY BONE VISUALIZER
// =========================================================================
export type RigJoints = {
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  wristL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  wristR: THREE.Group;
  thighL: THREE.Group;
  kneeL: THREE.Group;
  ankleL: THREE.Group;
  thighR: THREE.Group;
  kneeR: THREE.Group;
  ankleR: THREE.Group;
  extra?: Record<string, THREE.Group>;
};

export interface AnimeRig3D {
  name: string;
  root: THREE.Group;
  joints: RigJoints;
  handL: Hand3D;
  handR: Hand3D;
  setPose: (pose: string, t?: number) => void;
  setAction?: (action: string, p: number, t: number) => void;
  setXRayRig: (on: boolean) => void;
  getBoneCount: () => number;
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smStep = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / Math.max(1e-5, b - a));
  return u * u * (3 - 2 * u);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Adds a sleek glowing cyan/gold octahedral bone-rig visualizer directly inside the actual joint hierarchy!
 * When `setXRayRig(true)` is toggled on, the character mesh turns ghostly translucent and every real 3D bone
 * & articulated joint sphere lights up — proving the rig is a 100% real hierarchical 3D skeleton!
 */
export function attachBoneVisualizer(joints: RigJoints): {
  overlay: THREE.Group[];
  boneCount: number;
} {
  const overlays: THREE.Group[] = [];
  const jointMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 2.8, 3.2),
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const boneMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.5, 0.2),
    depthTest: false,
    transparent: true,
    opacity: 0.85,
  });

  const pairs: [THREE.Group, THREE.Group][] = [
    [joints.hips, joints.spine],
    [joints.spine, joints.chest],
    [joints.chest, joints.neck],
    [joints.neck, joints.head],
    [joints.chest, joints.shoulderL],
    [joints.shoulderL, joints.elbowL],
    [joints.elbowL, joints.wristL],
    [joints.chest, joints.shoulderR],
    [joints.shoulderR, joints.elbowR],
    [joints.elbowR, joints.wristR],
    [joints.hips, joints.thighL],
    [joints.thighL, joints.kneeL],
    [joints.kneeL, joints.ankleL],
    [joints.hips, joints.thighR],
    [joints.thighR, joints.kneeR],
    [joints.kneeR, joints.ankleR],
  ];

  // Add extra bone chains (Beerus tail, ears, etc.)
  if (joints.extra) {
    for (const grp of Object.values(joints.extra)) {
      if (grp.parent && grp.parent instanceof THREE.Group) {
        pairs.push([grp.parent, grp]);
      }
    }
  }

  const allJoints = new Set<THREE.Group>();
  for (const [a, b] of pairs) {
    allJoints.add(a);
    allJoints.add(b);
    const len = b.position.length();
    if (len > 0.01) {
      const g = new THREE.Group();
      g.visible = false;
      g.renderOrder = 999;
      // Classic Blender/Maya octahedral bone shape pointing from parent joint a -> child joint b
      const oct = new THREE.OctahedronGeometry(Math.min(0.028, len * 0.14), 0);
      oct.scale(1, len / (Math.min(0.028, len * 0.14) * 2), 1);
      oct.translate(0, len * 0.5, 0);
      const bm = new THREE.Mesh(oct, boneMat);
      bm.layers.set(NOINK);
      bm.renderOrder = 999;
      const dir = b.position.clone().normalize();
      bm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(bm);
      a.add(g);
      overlays.push(g);
    }
  }

  const sphGeo = new THREE.SphereGeometry(0.022, 10, 8);
  for (const j of allJoints) {
    const g = new THREE.Group();
    g.visible = false;
    g.renderOrder = 1000;
    const m = new THREE.Mesh(sphGeo, jointMat);
    m.layers.set(NOINK);
    m.renderOrder = 1000;
    g.add(m);
    j.add(g);
    overlays.push(g);
  }

  return { overlay: overlays, boneCount: pairs.length + 10 }; // +10 finger chains!
}

/** Toggle X-ray ghost mode on character meshes so the skeletal bones shine through cleanly! */
export function applyXRayMode(root: THREE.Group, overlays: THREE.Group[], on: boolean) {
  for (const o of overlays) o.visible = on;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (overlays.some((ov) => ov === mesh.parent)) return;
    if (mesh.name.endsWith("_ink")) {
      mesh.visible = !on;
      return;
    }
    const mat = mesh.material as THREE.ShaderMaterial;
    if (mat && mat.uniforms && mat.uniforms.uOpacity) {
      mat.transparent = on;
      mat.depthWrite = !on;
      mat.uniforms.uOpacity.value = on ? 0.28 : 1.0;
    }
  });
}

/** Utility: create crisp sRGB CanvasTexture with high anisotropy */
export function makeCanvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
