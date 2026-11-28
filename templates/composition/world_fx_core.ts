// Voidmetric v4.3 Pure Ghibli / Makoto Shinkai World, Parametric Tree, 3D Manga Text & MeshLine Primitives
// ZERO hardcoded locations or sets — pure procedural shaders & parametric builders driven deterministically by `t = f / FPS`!
// Wraps: `@dgreenheck/ez-tree` (MIT), `troika-three-text` (MIT), `meshline` (MIT) + clean-room anime water/grass/cloud GLSL.
import * as THREE from "three";
import { Tree } from "@dgreenheck/ez-tree";
import { Text as TroikaText } from "troika-three-text";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { NOINK } from "../bridge/ink";
import { hash01 } from "./env3d_core";

// =========================================================================
// 1. Voronoi Cel-Shaded Anime Water Material (Stepped Caustics + Ripple Rings + Foam!)
// =========================================================================
export function createAnimeWaterMat(opts: {
  shallowColor?: THREE.ColorRepresentation;
  deepColor?: THREE.ColorRepresentation;
  foamColor?: THREE.ColorRepresentation;
  sunColor?: THREE.ColorRepresentation;
  scale?: number;
  opacity?: number;
} = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(opts.shallowColor ?? "#36c6e8") },
      uDeep: { value: new THREE.Color(opts.deepColor ?? "#135a9c") },
      uFoam: { value: new THREE.Color(opts.foamColor ?? "#f4fcff") },
      uSun: { value: new THREE.Color(opts.sunColor ?? "#fff6d8") },
      uScale: { value: opts.scale ?? 6.5 },
      uOpacity: { value: opts.opacity ?? 0.92 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * 2.2 + uTime * 2.0) * 0.03 + cos(p.z * 1.9 - uTime * 1.6) * 0.025;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform vec3 uSun;
      uniform float uScale;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      vec2 hash22(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      float voronoi(vec2 x, float t) {
        vec2 n = floor(x), f = fract(x);
        float md = 8.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.45 * sin(t + 6.2831 * o);
            vec2 r = g + o - f;
            md = min(md, dot(r, r));
          }
        }
        return sqrt(md);
      }

      void main() {
        vec2 p = vUv * uScale;
        float v1 = voronoi(p + vec2(uTime * 0.14, uTime * 0.09), uTime * 1.4);
        float v2 = voronoi(p * 1.8 - vec2(uTime * 0.11, -uTime * 0.16), uTime * 1.9);
        float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        // Stepped 3-band anime depth gradient
        float shallowMask = smoothstep(0.06, 0.28, edgeDist);
        vec3 col = mix(uShallow, uDeep, smoothstep(0.18, 0.58, shallowMask + v1 * 0.22));
        // Crisp cel-stepped Voronoi caustic webbing
        float caustic = smoothstep(0.62, 0.68, v1 * 0.72 + v2 * 0.35);
        col = mix(col, uFoam, caustic * 0.45);
        // Hard-edged shoreline foam band
        float shoreFoam = 1.0 - smoothstep(0.025, 0.06 + 0.02 * sin(v1 * 9.0 + uTime * 2.6), edgeDist);
        col = mix(col, uFoam, shoreFoam * 0.92);
        // Sparkling Makoto Shinkai water glints
        float glint = smoothstep(0.84, 0.89, v1 * v2 * 1.9);
        col += uSun * glint * 0.85;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
}

// =========================================================================
// 2. GPU-Instanced Wind-Swept Backlit Anime Grass Field (Deterministic `t`!)
// =========================================================================
export type WindGrassField = {
  mesh: THREE.InstancedMesh;
  update: (t: number) => void;
  dispose: () => void;
};

export function createWindGrassField(opts: {
  count?: number;
  width?: number;
  depth?: number;
  bladeHeight?: number;
  baseColor?: THREE.ColorRepresentation;
  tipColor?: THREE.ColorRepresentation;
  windStrength?: number;
  seed?: number;
} = {}): WindGrassField {
  const count = opts.count ?? 1400;
  const W = opts.width ?? 10;
  const D = opts.depth ?? 10;
  const H = opts.bladeHeight ?? 0.52;
  const seed = opts.seed ?? 17;

  // Tapered 3-segment anime grass blade geometry
  const geo = new THREE.PlaneGeometry(0.085, H, 1, 3);
  geo.translate(0, H * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const hFrac = pos.getY(i) / H;
    pos.setX(i, pos.getX(i) * (1 - hFrac * 0.88));
    pos.setZ(i, Math.pow(hFrac, 2.0) * 0.08);
  }
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(opts.baseColor ?? "#2f6e38") },
      uTipColor: { value: new THREE.Color(opts.tipColor ?? "#9ee45a") },
      uWind: { value: opts.windStrength ?? 0.24 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWind;
      varying float vH;
      varying float vGust;
      void main() {
        vH = clamp(uv.y, 0.0, 1.0);
        vec4 instWorld = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float gust = sin(instWorld.x * 0.65 + instWorld.z * 0.45 + uTime * 2.6) * 0.65
                   + cos(instWorld.x * 1.4 - uTime * 3.8) * 0.35;
        vGust = gust * 0.5 + 0.5;
        vec3 p = position;
        float bend = pow(vH, 1.8) * uWind * (0.45 + 0.55 * gust);
        p.x += bend;
        p.z += bend * 0.42;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      varying float vH;
      varying float vGust;
      void main() {
        // Crisp 3-step Ghibli grass cel ramp + bright backlit wind wave shimmer
        float stepH = smoothstep(0.18, 0.52, vH) * 0.6 + smoothstep(0.65, 0.85, vH) * 0.4;
        vec3 col = mix(uBaseColor, uTipColor, stepH);
        col += uTipColor * smoothstep(0.62, 0.92, vGust) * vH * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.layers.set(NOINK);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set((hash01(seed + i * 7 + 1) - 0.5) * W, 0, (hash01(seed + i * 7 + 2) - 0.5) * D);
    dummy.rotation.set(0, hash01(seed + i * 7 + 3) * Math.PI * 2, (hash01(seed + i * 7 + 4) - 0.5) * 0.22);
    const sc = 0.65 + hash01(seed + i * 7 + 5) * 0.72;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return {
    mesh,
    update(t: number) {
      mat.uniforms.uTime.value = t;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

// =========================================================================
// 3. Painterly 3-Tone Makoto Shinkai Volumetric Cumulus Cloud Sky Deck
// =========================================================================
export type ShinkaiCloudDeck = {
  mesh: THREE.Mesh;
  update: (t: number, sunDir?: THREE.Vector3) => void;
  dispose: () => void;
};

export function createShinkaiCloudDeck(opts: {
  altitude?: number;
  size?: number;
  litColor?: THREE.ColorRepresentation;
  midColor?: THREE.ColorRepresentation;
  shadowColor?: THREE.ColorRepresentation;
  coverage?: number;
} = {}): ShinkaiCloudDeck {
  const geo = new THREE.PlaneGeometry(opts.size ?? 420, opts.size ?? 420);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.6, -0.7).normalize() },
      uLit: { value: new THREE.Color(opts.litColor ?? "#fffaf4") },
      uMid: { value: new THREE.Color(opts.midColor ?? "#d9e4f8") },
      uShadow: { value: new THREE.Color(opts.shadowColor ?? "#7a82b4") },
      uCoverage: { value: opts.coverage ?? 0.52 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uLit;
      uniform vec3 uMid;
      uniform vec3 uShadow;
      uniform float uCoverage;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.52;
        for (int i = 0; i < 5; i++) { v += a * vn(p); p = p * 2.04 + vec2(7.3, 13.1); a *= 0.5; }
        return v;
      }

      void main() {
        vec2 q = (vUv - 0.5) * 7.5 + vec2(uTime * 0.025, uTime * 0.012);
        float d = fbm(q);
        float dSun = fbm(q + normalize(uSunDir.xz + vec2(1e-4)) * 0.24);
        float edgeFade = smoothstep(0.5, 0.14, length(vUv - 0.5));
        float alpha = smoothstep(1.0 - uCoverage, 1.0 - uCoverage + 0.14, d) * edgeFade;
        if (alpha < 0.01) discard;
        // Directional 3-tone cumulus shading (bright crown, crisp mid transition, cool lavender underside!)
        float lightBand = clamp((d - dSun) * 3.8 + 0.52, 0.0, 1.0);
        vec3 col = mix(uShadow, uMid, smoothstep(0.24, 0.42, lightBand));
        col = mix(col, uLit, smoothstep(0.56, 0.72, lightBand));
        // Silver-lining sunlit rim boost
        float rim = smoothstep(0.0, 0.28, alpha) * (1.0 - smoothstep(0.28, 0.85, alpha));
        col += uLit * rim * 0.28;
        gl_FragColor = vec4(col, alpha * 0.94);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI * 0.5;
  mesh.position.y = opts.altitude ?? 68;
  mesh.layers.set(NOINK);

  return {
    mesh,
    update(t: number, sunDir?: THREE.Vector3) {
      mat.uniforms.uTime.value = t;
      if (sunDir) (mat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir).normalize();
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

// =========================================================================
// 4. Parametric 3D Procedural Tree Wrapper (`@dgreenheck/ez-tree` MIT)
// =========================================================================
export function createParametricTree(opts: {
  seed?: number;
  trunkLength?: number;
  trunkRadius?: number;
  levels?: number;
  leafCount?: number;
  leafSize?: number;
  leafTint?: number;
  barkTint?: number;
  scale?: number;
} = {}): Tree {
  const tree = new Tree();
  tree.options.seed = opts.seed ?? 101;
  tree.options.branch.levels = opts.levels ?? 3;
  tree.options.branch.length[0] = opts.trunkLength ?? 14;
  tree.options.branch.radius[0] = opts.trunkRadius ?? 1.15;
  tree.options.leaves.count = opts.leafCount ?? 10;
  tree.options.leaves.size = opts.leafSize ?? 3.8;
  tree.options.leaves.tint = opts.leafTint ?? 0x66c45a;
  tree.options.bark.tint = opts.barkTint ?? 0x7c5a46;
  tree.generate();
  tree.scale.setScalar(opts.scale ?? 0.28);
  // Keep solid trunk on layer 0 for crisp InkPass silhouettes; put alpha-card foliage on NOINK + lift brightness for sunlit anime canopies!
  if (tree.branchesMesh) {
    tree.branchesMesh.castShadow = true;
    tree.branchesMesh.receiveShadow = true;
  }
  if (tree.leavesMesh) {
    tree.leavesMesh.layers.set(NOINK);
    const lMat = tree.leavesMesh.material as THREE.MeshPhongMaterial;
    if (lMat && lMat.color) {
      lMat.color.setHex(opts.leafTint ?? 0x66c45a).multiplyScalar(1.35);
      if ("emissive" in lMat && lMat.emissive) {
        lMat.emissive.setHex(opts.leafTint ?? 0x66c45a).multiplyScalar(0.28);
      }
      lMat.needsUpdate = true;
    }
  }
  return tree;
}

// =========================================================================
// 5. Crisp 3D In-World Manga SFX & Diegetic Typography (`troika-three-text` MIT + Remotion-safe sync!)
// =========================================================================
export function createMangaText3D(opts: {
  text: string;
  fontSize?: number;
  color?: THREE.ColorRepresentation;
  outlineColor?: THREE.ColorRepresentation;
  outlineWidth?: number;
  font?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Optional callback fired once Troika's Web Worker finishes building the SDF glyph atlas (pair with Remotion `continueRender`!) */
  onReady?: () => void;
}): TroikaText {
  const txt = new TroikaText();
  txt.text = opts.text;
  txt.fontSize = opts.fontSize ?? 0.42;
  txt.color = opts.color ?? "#ffffff";
  txt.outlineColor = opts.outlineColor ?? "#12081c";
  txt.outlineWidth = opts.outlineWidth ?? 0.032;
  txt.anchorX = "center";
  txt.anchorY = "middle";
  if (opts.font) txt.font = opts.font;
  if (opts.position) txt.position.set(...opts.position);
  if (opts.rotation) txt.rotation.set(...opts.rotation);
  txt.layers.set(NOINK);
  txt.sync(opts.onReady);
  return txt;
}

/**
 * Instant Zero-Latency 3D Manga SFX / Signboard Plane (100% Synchronous — NEVER misses frame 0 in Remotion stills!).
 * Draws crisp outlined anime/manga lettering onto a high-res transparent CanvasTexture placed cleanly in 3D space.
 */
export function createMangaTextPlane3D(opts: {
  text: string;
  width?: number;
  height?: number;
  color?: string;
  outlineColor?: string;
  font?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}): THREE.Mesh {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 384;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.font = opts.font ?? "900 180px 'Montserrat', 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 28;
  ctx.strokeStyle = opts.outlineColor ?? "#10061a";
  ctx.strokeText(opts.text, cv.width / 2, cv.height / 2);
  ctx.fillStyle = opts.color ?? "#ff2e55";
  ctx.fillText(opts.text, cv.width / 2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.width ?? 2.4, opts.height ?? 0.9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  if (opts.position) mesh.position.set(...opts.position);
  if (opts.rotation) mesh.rotation.set(...opts.rotation);
  mesh.layers.set(NOINK);
  return mesh;
}

// =========================================================================
// 6. Thick Tapered 3D Anime Energy / Lightning Lines (`meshline` MIT)
// =========================================================================
export function createAnimeMeshLine(
  points: THREE.Vector3[],
  opts: {
    color?: THREE.ColorRepresentation;
    lineWidth?: number;
    opacity?: number;
    taper?: (p: number) => number;
  } = {}
): THREE.Mesh {
  const geo = new MeshLineGeometry();
  geo.setPoints(points, opts.taper ?? ((p: number) => Math.sin(Math.PI * p)));
  const mat = new MeshLineMaterial({
    color: new THREE.Color(opts.color ?? "#44e0ff"),
    lineWidth: opts.lineWidth ?? 0.06,
    opacity: opts.opacity ?? 0.95,
    resolution: new THREE.Vector2(1080, 1920),
  });
  mat.transparent = true;
  mat.depthWrite = false;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(NOINK);
  mesh.frustumCulled = false;
  return mesh;
}
