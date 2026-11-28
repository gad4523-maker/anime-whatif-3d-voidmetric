// Voidmetric v4.1 Pure Custom 3D GLSL VFX & Sakuga Action Smear Primitives (ZERO Hardcoded VFX Presets!)
// Author 100% bespoke anime power shaders, weather, steam, sparks, slashes, domain effects,
// 3D swept-limb action smear ribbons, and cel-ink silhouette after-images directly per episode.
// Every VFX object lives strictly on layer NOINK so world InkPass never outlines energy/smoke/particles.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

/** Mark any custom VFX Object3D tree strictly on layer NOINK (no world ink outline, no shadow casting). */
export const setNoInkTree = (root: THREE.Object3D) => {
  root.traverse((o) => {
    o.layers.set(NOINK);
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
};

/** Shared deterministic GLSL 3D Value/FBM Noise Chunk (zero texture fetches, fast on GPU & swangle CPU!) */
export const NOISE_GLSL = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.05 + vec3(13.1, 7.7, 19.3);
    a *= 0.5;
  }
  return v;
}
`;

const glowTexCache = new Map<string, THREE.CanvasTexture>();
/** Cached soft radial sprite texture for custom particles, sparks, steam puffs, snow, embers, or magic motes! */
export function getGlowSpriteTex(col: THREE.Color): THREE.CanvasTexture {
  const key = col.getHexString();
  const cached = glowTexCache.get(key);
  if (cached) return cached;
  const r = Math.round(col.r * 255);
  const g = Math.round(col.g * 255);
  const b = Math.round(col.b * 255);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const gr = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gr.addColorStop(0.0, "rgba(255, 250, 255, 1.0)");
  gr.addColorStop(0.24, `rgba(${r}, ${g}, ${b}, 0.85)`);
  gr.addColorStop(0.56, `rgba(${Math.round(r * 0.6)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.7)}, 0.34)`);
  gr.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  glowTexCache.set(key, t);
  return t;
}

/**
 * One-call custom 3D GLSL VFX ShaderMaterial factory!
 * Supplies `NOISE_GLSL` (`hash31`, `vnoise`, `fbm3`), `uTime`, `uIntensity`, `uColorA`, `uColorB`,
 * `vUv`, `vNormal`, `vViewDir`, and `vWorldPos`. Always call `setNoInkTree(mesh)` after creating your mesh!
 */
export function createCustomVFXMat(opts: {
  fragmentBody: string;
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  extraUniforms?: Record<string, THREE.IUniform>;
  extraDeclarations?: string;
  additive?: boolean;
  doubleSide?: boolean;
  vertexShader?: string;
}): THREE.ShaderMaterial {
  const extra = opts.extraUniforms ?? {};
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uColorA: { value: new THREE.Color(opts.colorA ?? "#38d8ff") },
    uColorB: { value: new THREE.Color(opts.colorB ?? "#ffffff") },
    ...extra,
  };
  // Automatically emit GLSL uniform declarations for every key in `extraUniforms`!
  const autoDecls = Object.entries(extra)
    .map(([name, u]) => {
      const v = u?.value;
      if (v instanceof THREE.Color || v instanceof THREE.Vector3) return `uniform vec3 ${name};`;
      if (v instanceof THREE.Vector2) return `uniform vec2 ${name};`;
      if (v instanceof THREE.Vector4) return `uniform vec4 ${name};`;
      if (v instanceof THREE.Texture) return `uniform sampler2D ${name};`;
      return `uniform float ${name};`;
    })
    .join("\n");
  const defaultVert = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const frag = /* glsl */ `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    ${autoDecls}
    ${opts.extraDeclarations ?? ""}
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    ${NOISE_GLSL}
    void main() {
      ${opts.fragmentBody}
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: opts.vertexShader ?? defaultVert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: opts.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    side: opts.doubleSide === false ? THREE.FrontSide : THREE.DoubleSide,
  });
}

// =========================================================================
// SAKUGA 3D ACTION SMEARS & INK AFTER-IMAGE SILHOUETTES (PURE PRIMITIVES!)
// Gives 30 fps 3D anime combat genuine hand-animated smear frames & motion arcs!
// =========================================================================
export type LimbSmearRibbon = {
  mesh: THREE.Mesh;
  /**
   * Update the 3D swept smear ribbon from an ordered list of `[rootPos, tipPos]` pairs
   * sampled along a fast swing/punch/kick trajectory (`pairs[0]` = trailing tail, `pairs[last]` = leading edge).
   */
  update: (pairs: [THREE.Vector3, THREE.Vector3][], opacity?: number, time?: number) => void;
  setColors: (base: THREE.ColorRepresentation, edge?: THREE.ColorRepresentation, ink?: THREE.ColorRepresentation) => void;
  dispose: () => void;
};

/**
 * Pure 3D Swept-Limb Action Smear Ribbon Primitive:
 * Draws a cel-shaded dry-brush smear arc with tapered bristles & crisp anime ink streak lines
 * swept across any limb (`elbow -> hand`, `knee -> foot`) or held weapon (`hilt -> bladeTip`)!
 */
export function createLimbSmearRibbon(opts: {
  maxSteps?: number;
  baseColor?: THREE.ColorRepresentation;
  edgeColor?: THREE.ColorRepresentation;
  inkColor?: THREE.ColorRepresentation;
  additive?: boolean;
} = {}): LimbSmearRibbon {
  const maxSteps = Math.max(4, opts.maxSteps ?? 18);
  const positions = new Float32Array(maxSteps * 2 * 3);
  const uvs = new Float32Array(maxSteps * 2 * 2);
  const indices: number[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const u = i / (maxSteps - 1);
    uvs[i * 4 + 0] = u; uvs[i * 4 + 1] = 0; // root edge
    uvs[i * 4 + 2] = u; uvs[i * 4 + 3] = 1; // tip edge
    if (i < maxSteps - 1) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.setDrawRange(0, 0);

  const mat = createCustomVFXMat({
    colorA: opts.baseColor ?? "#f4efe8",
    colorB: opts.edgeColor ?? "#ffffff",
    additive: opts.additive ?? false,
    doubleSide: true,
    extraUniforms: {
      uInkColor: { value: new THREE.Color(opts.inkColor ?? "#140a1e") },
    },
    fragmentBody: /* glsl */ `
      // vUv.x = 0 (trailing tail) -> 1 (leading edge); vUv.y = 0 (root/elbow) -> 1 (outer tip/fist)
      float bristle = fbm3(vec3(vUv.y * 18.0, vUv.x * 2.4, uTime * 3.0));
      // Outer tip starts earliest (longest smear arc); inner elbow starts later (shorter arc)
      float tailCut = mix(0.46, 0.04, pow(vUv.y, 1.35)) + (bristle - 0.5) * 0.24;
      float trailMask = smoothstep(tailCut, tailCut + 0.16, vUv.x);
      float leadCap = 1.0 - smoothstep(0.95, 1.0, vUv.x);
      // Crisp cel-ink outer edge streak & mid-limb speed ink lines
      float outerEdge = smoothstep(0.89, 0.96, vUv.y) * smoothstep(0.22, 0.72, vUv.x);
      float streakBand = smoothstep(0.68, 0.78, sin(vUv.y * 31.4159 + bristle * 3.0) * 0.5 + 0.5)
                       * smoothstep(0.28, 0.85, vUv.x) * 0.45;
      vec3 baseCol = mix(uColorA, uColorB, smoothstep(0.45, 0.92, vUv.y) * smoothstep(0.35, 0.95, vUv.x));
      vec3 col = mix(baseCol, uInkColor, clamp(outerEdge * 0.92 + streakBand, 0.0, 1.0));
      float alpha = trailMask * leadCap * smoothstep(0.02, 0.14, vUv.y) * uIntensity;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(col, alpha);
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  setNoInkTree(mesh);

  return {
    mesh,
    update(pairs, opacity = 0.92, time = 0) {
      const count = Math.min(maxSteps, pairs.length);
      if (count < 2 || opacity <= 0.01) {
        mesh.visible = false;
        geo.setDrawRange(0, 0);
        return;
      }
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const [rootP, tipP] = pairs[i];
        const u = i / (count - 1);
        posAttr.setXYZ(i * 2 + 0, rootP.x, rootP.y, rootP.z);
        posAttr.setXYZ(i * 2 + 1, tipP.x, tipP.y, tipP.z);
        uvAttr.setXY(i * 2 + 0, u, 0);
        uvAttr.setXY(i * 2 + 1, u, 1);
      }
      posAttr.needsUpdate = true;
      uvAttr.needsUpdate = true;
      geo.setDrawRange(0, (count - 1) * 6);
      mat.uniforms.uIntensity.value = opacity;
      mat.uniforms.uTime.value = time;
      mesh.visible = true;
    },
    setColors(base, edge, ink) {
      (mat.uniforms.uColorA.value as THREE.Color).set(base);
      if (edge !== undefined) (mat.uniforms.uColorB.value as THREE.Color).set(edge);
      if (ink !== undefined) (mat.uniforms.uInkColor.value as THREE.Color).set(ink);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * Pure 3D Cel-Ink After-Image Ghost Primitive:
 * Creates a lightweight Fresnel rim-ink ghost material for trailing motion after-images (dashes, punches, dodges).
 * Apply to cloned limb or character meshes placed at `t = 0.35` and `t = 0.65` along a fast burst!
 */
export function createAfterImageMat(opts: {
  inkColor?: THREE.ColorRepresentation;
  fillColor?: THREE.ColorRepresentation;
  opacity?: number;
  rimPower?: number;
} = {}): THREE.ShaderMaterial {
  const mat = createCustomVFXMat({
    colorA: opts.inkColor ?? "#171022",
    colorB: opts.fillColor ?? "#6a7cff",
    additive: false,
    doubleSide: false,
    extraUniforms: {
      uRimPower: { value: opts.rimPower ?? 2.2 },
    },
    fragmentBody: /* glsl */ `
      float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uRimPower);
      float rimInk = smoothstep(0.28, 0.56, fresnel);
      vec3 col = mix(uColorB, uColorA, rimInk);
      float alpha = (0.12 + 0.88 * rimInk) * uIntensity;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(col, alpha);
    `,
  });
  mat.uniforms.uIntensity.value = opts.opacity ?? 0.82;
  return mat;
}
