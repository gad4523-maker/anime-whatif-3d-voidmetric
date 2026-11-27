// Voidmetric v4.0 Pure Custom 3D GLSL VFX Primitives (ZERO Hardcoded VFX Presets!)
// Author 100% bespoke anime power shaders, weather, steam, sparks, slashes, or domain effects directly per episode.
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
  additive?: boolean;
  doubleSide?: boolean;
  vertexShader?: string;
}): THREE.ShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uColorA: { value: new THREE.Color(opts.colorA ?? "#38d8ff") },
    uColorB: { value: new THREE.Color(opts.colorB ?? "#ffffff") },
    ...(opts.extraUniforms ?? {}),
  };
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
