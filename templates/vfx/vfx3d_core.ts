// Voidmetric v3.2 Custom-First 3D GLSL Anime VFX Toolkit & Optional Presets (Zero Episode Hardcoding!)
// Built natively for Three.js + InkPass -> 2-pass LensBlur -> 6-level HDR Mipmap Bloom -> NEUTRAL -> Grade.
//
// CUSTOM-FIRST DESIGN: Hardcoded presets below are OPTIONAL — never mandatory!
// Use the exported toolkit (`setNoInkTree`, `NOISE_GLSL`, `getGlowSpriteTex`, `createCustomVFXMat`) to author
// ANY bespoke 3D anime or physical effect on demand (water/flame ribbons, steam/smoke, chalk dust, rain,
// ODM gas trails, time-stop bubble, Stand projection, Room dome, sparks, shadow army, slashes — anything!).
// Every VFX mesh lives strictly on layer NOINK so world InkPass never outlines energy/smoke/particles.
//
// 9 Optional Ready-Made 3D VFX Engines also included if helpful:
//   1. `EnergyOrb3D`      — Volumetric FBM plasma orb + optional dark-void core + corona + 3 orbital ribbons + 32 shards
//   2. `EnergyAura3D`     — 3-shell nested volumetric anime flame/ki column + ground vortex + 64 embers + 6 jagged 3D lightning bolts
//   3. `EnergyBeam3D`     — Kamehameha / laser / blast beam cannon (pulsing core + helical sheath + muzzle shock rings + sparks)
//   4. `LightningArc3D`   — Multi-strand jagged frame-stepped 3D anime electric arcs between ANY two 3D points
//   5. `makeDissolveMat3D` & `MoteSwarm3D` — Spatial erosion / disintegration / petrification / burn shader + curl-flow HDR motes
//   6. `ShockwaveBlast3D` — Expanding supernova dome + twin shock rings + sky pillar + scorch crater + radial spikes + debris
//   7. `EnergySlice3D`    — Razor-sharp anime energy slash sheet (crescent/linear blade cuts & spatial slices)
//   8. `DomainBarrier3D`  — Rotating 3D anime magic circle / alchemy array / Domain Expansion rings + optional 36-shard shatter
//   9. `KanjiBurst3D`     — 3D floating glowing Japanese anime SFX / technique kanji billboard (`ゴゴゴ`, `ドゴォン`, custom text)
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
 * Automatically supplies `NOISE_GLSL` (`hash31`, `vnoise`, `fbm3`), `uTime`, `uIntensity`, `uColorA`, `uColorB`,
 * `vUv`, `vNormal`, `vViewDir`, and `vWorldPos` so agents can author ANY custom effect on demand without boilerplate.
 * Always call `setNoInkTree(mesh)` after creating your mesh!
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

export type VFXPaletteOpts = {
  primary?: THREE.ColorRepresentation;
  core?: THREE.ColorRepresentation;
  /** Enable dark menacing void center with electric Fresnel plasma rim (ideal for dark/void/gravity powers!) */
  darkCore?: boolean;
};

// ============================================================================
// 1. UNIVERSAL 3D VOLUMETRIC ENERGY ORB (FBM Core + Corona + 3 Orbital Ribbons + 32 Shards)
// ============================================================================
export class EnergyOrb3D {
  group = new THREE.Group();
  private u: {
    uTime: THREE.IUniform<number>;
    uPower: THREE.IUniform<number>;
    uPrimary: THREE.IUniform<THREE.Color>;
    uCore: THREE.IUniform<THREE.Color>;
    uDarkCore: THREE.IUniform<number>;
  };
  private ribbons = new THREE.Group();
  private shards: THREE.InstancedMesh;
  private shardData: { r: number; spd: number; ph: number; tiltX: number; tiltZ: number; s: number }[] = [];
  private glowSprite: THREE.Sprite;
  private dummy = new THREE.Object3D();

  constructor(
    radius = 0.24,
    primaryOrOpts: THREE.ColorRepresentation | VFXPaletteOpts = "#38d8ff",
    coreHex: THREE.ColorRepresentation = "#e8fbff"
  ) {
    const opts: VFXPaletteOpts =
      typeof primaryOrOpts === "object" && !(primaryOrOpts instanceof THREE.Color)
        ? primaryOrOpts
        : { primary: primaryOrOpts, core: coreHex };
    const pCol = new THREE.Color(opts.primary ?? "#38d8ff");
    const cCol = new THREE.Color(opts.core ?? "#e8fbff");
    this.u = {
      uTime: { value: 0 },
      uPower: { value: 1 },
      uPrimary: { value: pCol },
      uCore: { value: cCol },
      uDarkCore: { value: opts.darkCore ? 1.0 : 0.0 },
    };

    const coreMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          vec3 p = position;
          float disp = (fbm3(normalize(p) * 3.2 + vec3(uTime * 1.6, -uTime * 1.1, uTime * 0.9)) - 0.5) * 0.11 * uPower;
          p += normal * disp * length(position);
          vLocal = normalize(p);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vNorm = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        uniform vec3 uPrimary;
        uniform vec3 uCore;
        uniform float uDarkCore;
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          float ndv = clamp(dot(normalize(vNorm), normalize(vView)), 0.0, 1.0);
          float fres = pow(max(0.0, 1.0 - ndv), 2.8);
          float n1 = fbm3(vLocal * 4.4 + vec3(uTime * 1.8, -uTime * 1.3, uTime * 0.7));
          float n2 = fbm3(vLocal * 8.6 - vec3(uTime * 2.4, uTime * 1.9, -uTime * 1.2));
          float vein = pow(clamp(1.0 - abs(n1 * 2.0 - 1.0), 0.0, 1.0), 6.0);
          float vein2 = pow(clamp(1.0 - abs(n2 * 2.0 - 1.0), 0.0, 1.0), 7.2);

          vec3 baseDark = uPrimary * 0.03;
          vec3 baseBright = mix(uPrimary * 0.65, uPrimary * 2.2, smoothstep(0.25, 0.78, n1));
          vec3 col = mix(baseBright, baseDark, uDarkCore);
          col = mix(col, uPrimary * 1.4, smoothstep(0.42, 0.88, n1) * (0.28 + 0.72 * fres) * uDarkCore);
          col += uPrimary * 2.8 * vein * 1.4;
          col += uCore * 3.8 * vein2 * 0.72;
          col += mix(uPrimary * 2.8, uCore * 4.2, pow(max(0.0, fres), 1.6)) * fres * 2.9;
          gl_FragColor = vec4(col * uPower, 1.0);
        }
      `,
    });
    this.group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 4), coreMat));

    const coronaMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          vec3 n = normalize(position);
          float w = (fbm3(n * 2.8 - vec3(0.0, uTime * 2.4, uTime * 1.1)) - 0.5) * 0.22;
          vec3 p = position * (1.0 + w);
          vLocal = n;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vNorm = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        uniform vec3 uPrimary;
        uniform vec3 uCore;
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          float ndv = abs(dot(normalize(vNorm), normalize(vView)));
          float rim = pow(max(0.0, 1.0 - ndv), 1.8) * smoothstep(0.0, 0.22, ndv);
          float f = fbm3(vLocal * 5.0 + vec3(uTime * 2.2, -uTime * 2.8, uTime));
          float alpha = rim * smoothstep(0.32, 0.82, f) * 0.82 * uPower;
          vec3 col = mix(uPrimary * 2.2, uCore * 3.8, smoothstep(0.45, 0.85, f));
          gl_FragColor = vec4(col * alpha, alpha);
        }
      `,
    });
    this.group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.24, 3), coronaMat));

    const ribbonMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uPower;
        uniform vec3 uPrimary;
        uniform vec3 uCore;
        varying vec2 vUv;
        void main() {
          float endFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
          float pulse = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 9.0);
          float core = pow(clamp(1.0 - abs(vUv.y * 2.0 - 1.0), 0.0, 1.0), 1.6);
          vec3 col = mix(uPrimary * 2.4, uCore * 4.2, core * pulse);
          float a = endFade * core * (0.45 + 0.55 * pulse) * uPower;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    for (let k = 0; k < 3; k++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = (i / 36) * Math.PI * 1.75;
        const rr = radius * (1.36 + 0.18 * Math.sin(t * 2 + k));
        pts.push(new THREE.Vector3(Math.cos(t) * rr, Math.sin(t * 2) * radius * 0.24, Math.sin(t) * rr));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, radius * 0.046, 6, false), ribbonMat);
      m.rotation.set(k * 1.05 + 0.4, k * 2.1, k * 0.72);
      this.ribbons.add(m);
    }
    this.group.add(this.ribbons);

    const shardGeo = new THREE.OctahedronGeometry(radius * 0.11, 0);
    shardGeo.scale(0.65, 1.85, 0.65);
    this.shards = new THREE.InstancedMesh(
      shardGeo,
      new THREE.MeshBasicMaterial({ color: pCol.clone().multiplyScalar(2.9), transparent: true, opacity: 0.92 }),
      32
    );
    for (let i = 0; i < 32; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      this.shardData.push({
        r: radius * (1.35 + h(1) * 0.95),
        spd: (1.2 + h(2) * 1.8) * (i % 2 ? 1 : -1),
        ph: h(3) * Math.PI * 2,
        tiltX: (h(4) - 0.5) * 1.7,
        tiltZ: (h(5) - 0.5) * 1.7,
        s: 0.45 + h(6) * 1.0,
      });
    }
    this.group.add(this.shards);

    this.glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowSpriteTex(pCol),
        color: pCol.clone().multiplyScalar(1.35),
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.glowSprite.scale.setScalar(radius * 4.5);
    this.glowSprite.renderOrder = -1;
    this.group.add(this.glowSprite);
    setNoInkTree(this.group);
  }

  update(t: number, power = 1, scale = 1) {
    this.group.visible = power > 0.01 && scale > 0.01;
    if (!this.group.visible) return;
    this.group.scale.setScalar(scale);
    this.u.uTime.value = t;
    this.u.uPower.value = power;
    this.ribbons.rotation.set(t * 1.4, t * 2.2, t * 0.8);
    (this.glowSprite.material as THREE.SpriteMaterial).opacity = Math.min(0.85, 0.58 * power);
    for (let i = 0; i < this.shardData.length; i++) {
      const d = this.shardData[i];
      const a = d.ph + t * d.spd;
      const v = new THREE.Vector3(Math.cos(a) * d.r, Math.sin(a * 1.5) * d.r * 0.22, Math.sin(a) * d.r);
      v.applyEuler(new THREE.Euler(d.tiltX, 0, d.tiltZ));
      this.dummy.position.copy(v);
      this.dummy.rotation.set(a * 2.1, a * 1.3, d.tiltZ);
      this.dummy.scale.setScalar(d.s * (0.7 + 0.3 * Math.sin(t * 6 + i)));
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================================
// 2. UNIVERSAL 3-SHELL VOLUMETRIC ANIME AURA (Flames + Ground Vortex + 64 Embers + 6 Lightning Bolts!)
// ============================================================================
export class EnergyAura3D {
  group = new THREE.Group();
  private shellUniforms: {
    uTime: THREE.IUniform<number>;
    uPower: THREE.IUniform<number>;
    uColorA: THREE.IUniform<THREE.Color>;
    uColorB: THREE.IUniform<THREE.Color>;
    uSeed: THREE.IUniform<number>;
  }[] = [];
  private vortexU: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number>; uPrimary: THREE.IUniform<THREE.Color>; uCore: THREE.IUniform<THREE.Color> };
  private embers: THREE.InstancedMesh;
  private emberData: { r: number; ang: number; spd: number; yOff: number; s: number }[] = [];
  private bolts: THREE.Mesh[] = [];
  private boltMat: THREE.MeshBasicMaterial;
  private dummy = new THREE.Object3D();

  constructor(
    height = 2.55,
    radius = 0.82,
    primaryHex: THREE.ColorRepresentation = "#38d8ff",
    coreHex: THREE.ColorRepresentation = "#e8fbff"
  ) {
    const pCol = new THREE.Color(primaryHex);
    const cCol = new THREE.Color(coreHex);
    const configs: [number, number, number, THREE.Color, THREE.Color, number][] = [
      [radius * 1.14, radius * 0.72, height * 1.08, pCol.clone().multiplyScalar(1.3), pCol.clone().multiplyScalar(2.6), 1.0],
      [radius * 0.90, radius * 0.56, height * 0.98, pCol.clone().multiplyScalar(2.2), pCol.clone().lerp(cCol, 0.45).multiplyScalar(3.4), 2.7],
      [radius * 0.66, radius * 0.42, height * 0.86, pCol.clone().lerp(cCol, 0.6).multiplyScalar(3.2), cCol.clone().multiplyScalar(4.4), 4.9],
    ];

    for (const [rBot, rTop, h, colA, colB, seed] of configs) {
      const geo = new THREE.CylinderGeometry(rTop, rBot, h, 34, 22, true);
      geo.translate(0, h * 0.5, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / h;
        const bulge = 1.0 + 0.24 * Math.sin(y * Math.PI) - 0.35 * y * y;
        pos.setX(i, pos.getX(i) * bulge);
        pos.setZ(i, pos.getZ(i) * bulge);
      }
      geo.computeVertexNormals();
      const u = { uTime: { value: 0 }, uPower: { value: 1 }, uColorA: { value: colA }, uColorB: { value: colB }, uSeed: { value: seed } };
      this.shellUniforms.push(u);
      const mat = new THREE.ShaderMaterial({
        uniforms: u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uSeed;
          varying vec2 vUv;
          varying vec3 vNorm;
          varying vec3 vView;
          void main() {
            vUv = uv;
            vec3 p = position;
            float n = fbm3(vec3(p.x * 2.2, p.y * 1.4 - uTime * 3.8, p.z * 2.2 + uSeed));
            p.xz += normal.xz * (n - 0.45) * 0.28 * (0.25 + uv.y);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vNorm = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uPower;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform float uSeed;
          varying vec2 vUv;
          varying vec3 vNorm;
          varying vec3 vView;
          void main() {
            float ang = vUv.x * 6.2831853;
            vec3 coord = vec3(cos(ang) * 1.6, vUv.y * 3.6 - uTime * 3.4, sin(ang) * 1.6 + uSeed);
            float fire = fbm3(coord) * 0.65 + fbm3(coord * 2.1 - vec3(0.0, uTime * 2.6, 0.0)) * 0.45;
            float cutoff = mix(0.24, 0.88, pow(max(0.0, vUv.y), 1.15));
            float mask = smoothstep(cutoff - 0.14, cutoff + 0.12, fire);
            float botFade = smoothstep(0.0, 0.16, vUv.y);
            float topFade = smoothstep(1.0, 0.78, vUv.y);
            float ndv = abs(dot(normalize(vNorm), normalize(vView)));
            float rimBoost = mix(0.32, 1.25, pow(max(0.0, 1.0 - ndv), 1.35)) * smoothstep(0.02, 0.24, ndv);
            float a = mask * botFade * topFade * rimBoost * 0.72 * uPower;
            vec3 col = mix(uColorA, uColorB, smoothstep(cutoff, cutoff + 0.35, fire));
            gl_FragColor = vec4(col * a, a);
          }
        `,
      });
      this.group.add(new THREE.Mesh(geo, mat));
    }

    this.vortexU = { uTime: { value: 0 }, uPower: { value: 1 }, uPrimary: { value: pCol }, uCore: { value: cCol } };
    const vGeo = new THREE.RingGeometry(0.18, radius * 2.1, 48);
    vGeo.rotateX(-Math.PI / 2);
    const vortex = new THREE.Mesh(
      vGeo,
      new THREE.ShaderMaterial({
        uniforms: this.vortexU,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vPos; void main() { vPos = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uPower;
          uniform vec3 uPrimary;
          uniform vec3 uCore;
          varying vec2 vPos;
          void main() {
            float r = length(vPos);
            float a = atan(vPos.y, vPos.x);
            float spiral = sin(a * 6.0 - r * 7.5 + uTime * 6.0) * 0.5 + 0.5;
            float n = fbm3(vec3(cos(a) * 2.0, sin(a) * 2.0, r * 2.5 - uTime * 3.0));
            float ring = smoothstep(0.15, 0.45, r) * smoothstep(1.75, 0.55, r);
            float energy = ring * smoothstep(0.28, 0.85, spiral * 0.55 + n * 0.65);
            vec3 col = mix(uPrimary * 2.2, uCore * 4.2, pow(max(0.0, energy), 1.8));
            gl_FragColor = vec4(col * energy * 0.82 * uPower, energy * 0.82 * uPower);
          }
        `,
      })
    );
    vortex.position.y = 0.04;
    this.group.add(vortex);

    const eGeo = new THREE.OctahedronGeometry(0.036, 0);
    eGeo.scale(0.55, 2.2, 0.55);
    this.embers = new THREE.InstancedMesh(
      eGeo,
      new THREE.MeshBasicMaterial({ color: pCol.clone().lerp(cCol, 0.45).multiplyScalar(3.8), transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
      64
    );
    for (let i = 0; i < 64; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 91.7 + k * 241.3) * 43758.5453;
        return v - Math.floor(v);
      };
      this.emberData.push({ r: radius * (0.48 + h(1) * 1.1), ang: h(2) * Math.PI * 2, spd: 0.8 + h(3) * 1.6, yOff: h(4), s: 0.5 + h(5) * 1.15 });
    }
    this.group.add(this.embers);

    this.boltMat = new THREE.MeshBasicMaterial({
      color: cCol.clone().lerp(pCol, 0.35).multiplyScalar(4.4),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 6; i++) {
      const pts: THREE.Vector3[] = [];
      let bx = 0, bz = 0;
      for (let j = 0; j < 9; j++) {
        bx += Math.sin((i + 1) * 43.7 + j * 17.3) * 0.14;
        bz += Math.cos((i + 1) * 29.1 + j * 23.7) * 0.12;
        pts.push(new THREE.Vector3(bx, j * 0.24, bz));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.08), 18, 0.011, 4, false), this.boltMat);
      this.bolts.push(m);
      this.group.add(m);
    }
    setNoInkTree(this.group);
  }

  update(t: number, power = 1, scale = 1) {
    this.group.visible = power > 0.01;
    if (!this.group.visible) return;
    this.group.scale.setScalar(scale);
    for (const u of this.shellUniforms) {
      u.uTime.value = t;
      u.uPower.value = power;
    }
    this.vortexU.uTime.value = t;
    this.vortexU.uPower.value = power;

    for (let i = 0; i < this.emberData.length; i++) {
      const d = this.emberData[i];
      const prog = (d.yOff + t * 0.55 * d.spd) % 1;
      const a = d.ang + t * 1.6 * (i % 2 ? 1 : -1);
      const rr = d.r * (1.0 - prog * 0.28);
      this.dummy.position.set(Math.cos(a) * rr, prog * 2.85, Math.sin(a) * rr);
      this.dummy.rotation.set(0, -a, 0.15 * Math.sin(t * 5 + i));
      this.dummy.scale.setScalar(d.s * Math.sin(prog * Math.PI) * power);
      this.dummy.updateMatrix();
      this.embers.setMatrixAt(i, this.dummy.matrix);
    }
    this.embers.instanceMatrix.needsUpdate = true;

    const step = Math.floor(t * 15);
    this.boltMat.opacity = Math.min(0.95, power);
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      const h = (k: number) => {
        const v = Math.sin((step + i * 17) * 73.1 + k * 197.3) * 43758.5453;
        return v - Math.floor(v);
      };
      b.visible = power > 0.25 && h(0) > 0.22;
      if (b.visible) {
        const side = i % 2 === 0 ? -1 : 1;
        b.position.set(side * (0.58 + h(2) * 0.42), 0.15 + h(3) * 0.55, -0.15 - h(1) * 0.45);
        b.rotation.set((h(4) - 0.5) * 0.45, h(5) * 3.14, side * (0.08 + h(6) * 0.28));
        b.scale.set(0.75 + h(7) * 0.55, 0.72 + h(8) * 0.55, 0.75 + h(7) * 0.55);
      }
    }
  }
}

// ============================================================================
// 3. UNIVERSAL ANIME ENERGY BEAM CANNON (Kamehameha / Cero / Hollow Beam / Laser!)
//    Extends along +Z from origin (0,0,0) -> (0,0,length) so `group.lookAt(target)` aims it cleanly!
// ============================================================================
export class EnergyBeam3D {
  group = new THREE.Group();
  private u: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number>; uPrimary: THREE.IUniform<THREE.Color>; uCore: THREE.IUniform<THREE.Color> };
  private rings: THREE.Mesh[] = [];
  private coreMesh: THREE.Mesh;
  private sheathMesh: THREE.Mesh;
  private muzzleOrb: THREE.Mesh;
  private length: number;

  constructor(
    length = 12.0,
    radius = 0.32,
    primaryHex: THREE.ColorRepresentation = "#22a8ff",
    coreHex: THREE.ColorRepresentation = "#ffffff"
  ) {
    this.length = length;
    const pCol = new THREE.Color(primaryHex);
    const cCol = new THREE.Color(coreHex);
    this.u = { uTime: { value: 0 }, uPower: { value: 1 }, uPrimary: { value: pCol }, uCore: { value: cCol } };

    // Blistering white-hot inner plasma cylinder
    const coreGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.48, length, 20, 1, true);
    coreGeo.rotateX(Math.PI / 2);
    coreGeo.translate(0, 0, length * 0.5);
    this.coreMesh = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color: cCol.clone().multiplyScalar(4.4), transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    this.group.add(this.coreMesh);

    // Swirling outer helical GLSL energy jacket
    const shGeo = new THREE.CylinderGeometry(radius * 1.18, radius * 0.85, length, 28, 16, true);
    shGeo.rotateX(Math.PI / 2);
    shGeo.translate(0, 0, length * 0.5);
    this.sheathMesh = new THREE.Mesh(
      shGeo,
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uPower;
          uniform vec3 uPrimary;
          uniform vec3 uCore;
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float helix = sin(vUv.x * 18.8495 - vUv.y * 22.0 + uTime * 22.0) * 0.5 + 0.5;
            float n = fbm3(vec3(vUv.x * 6.0, vUv.y * 8.0 - uTime * 14.0, 1.0));
            float ndv = abs(dot(normalize(vN), normalize(vV)));
            float edge = smoothstep(0.05, 0.42, ndv);
            float ends = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            vec3 col = mix(uPrimary * 2.6, uCore * 4.2, helix * n);
            float a = edge * ends * (0.45 + 0.55 * (helix * 0.6 + n * 0.4)) * uPower;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      })
    );
    this.group.add(this.sheathMesh);

    // Blazing muzzle flare sphere at origin
    this.muzzleOrb = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.35, 18, 14),
      new THREE.MeshBasicMaterial({ color: cCol.clone().lerp(pCol, 0.35).multiplyScalar(4.0), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.group.add(this.muzzleOrb);

    // 5 rushing shock rings surging down the beam
    const rMat = new THREE.MeshBasicMaterial({ color: pCol.clone().multiplyScalar(3.4), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.45, radius * 0.11, 8, 32), rMat);
      this.rings.push(r);
      this.group.add(r);
    }
    setNoInkTree(this.group);
  }

  update(t: number, power = 1, reach = 1) {
    this.group.visible = power > 0.01 && reach > 0.01;
    if (!this.group.visible) return;
    this.u.uTime.value = t;
    this.u.uPower.value = power;
    const pulse = 1.0 + Math.sin(t * 36) * 0.08;
    const rScale = Math.max(0.05, power * pulse);
    this.coreMesh.scale.set(rScale, rScale, Math.max(0.02, reach));
    this.sheathMesh.scale.set(rScale, rScale, Math.max(0.02, reach));
    this.muzzleOrb.scale.setScalar(rScale * (0.95 + Math.sin(t * 28) * 0.12));
    for (let i = 0; i < this.rings.length; i++) {
      const prog = ((t * 2.8 + i / this.rings.length) % 1) * reach;
      this.rings[i].position.z = prog * this.length;
      this.rings[i].scale.setScalar((0.75 + prog * 0.85) * rScale);
    }
  }
}

// ============================================================================
// 4. UNIVERSAL 3D JAGGED LIGHTNING ARCS (Chidori / Black Flash / Godspeed / Static!)
// ============================================================================
export class LightningArc3D {
  group = new THREE.Group();
  private lines: THREE.Line[] = [];
  private segs: number;

  constructor(
    strands = 4,
    primaryHex: THREE.ColorRepresentation = "#5ae8ff",
    coreHex: THREE.ColorRepresentation = "#ffffff",
    segs = 14
  ) {
    this.segs = segs;
    const pCol = new THREE.Color(primaryHex).multiplyScalar(4.0);
    const cCol = new THREE.Color(coreHex).multiplyScalar(4.8);
    for (let i = 0; i < strands; i++) {
      const pos = new Float32Array((segs + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({
        color: i === 0 ? cCol : pCol,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      this.lines.push(line);
      this.group.add(line);
    }
    setNoInkTree(this.group);
  }

  updateEndpoints(a: THREE.Vector3, b: THREE.Vector3, t: number, power = 1, jitter = 0.24) {
    this.group.visible = power > 0.01;
    if (!this.group.visible) return;
    const step = Math.floor(t * 18); // crisp 18 fps anime lightning crackle!
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = Math.max(0.05, dir.length());
    const up = Math.abs(dir.y / len) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u1 = new THREE.Vector3().crossVectors(dir, up).normalize();
    const u2 = new THREE.Vector3().crossVectors(dir, u1).normalize();
    const tmp = new THREE.Vector3();

    for (let s = 0; s < this.lines.length; s++) {
      const attr = this.lines[s].geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j <= this.segs; j++) {
        const f = j / this.segs;
        tmp.lerpVectors(a, b, f);
        if (j > 0 && j < this.segs) {
          const env = Math.sin(f * Math.PI);
          const h1 = Math.sin((step + s * 31) * 67.3 + j * 19.7) * 43758.5453;
          const h2 = Math.cos((step + s * 47) * 89.1 + j * 23.3) * 43758.5453;
          const o1 = ((h1 - Math.floor(h1)) * 2 - 1) * jitter * len * 0.22 * env;
          const o2 = ((h2 - Math.floor(h2)) * 2 - 1) * jitter * len * 0.22 * env;
          tmp.addScaledVector(u1, o1).addScaledVector(u2, o2);
        }
        attr.setXYZ(j, tmp.x, tmp.y, tmp.z);
      }
      attr.needsUpdate = true;
      (this.lines[s].material as THREE.LineBasicMaterial).opacity = Math.min(1, power);
    }
  }
}

// ============================================================================
// 5. UNIVERSAL 3D SPATIAL DISSOLVE SHADER + CURL-FLOW MOTE SWARM
//    (Works for Erasure, Ash, Decay, Fire Burn, Stone Petrification, Ice Shatter!)
// ============================================================================
export type DissolveUniforms = {
  uDissolve: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uDir: THREE.IUniform<THREE.Vector3>;
  uMinMax: THREE.IUniform<THREE.Vector2>;
  uEdgeA: THREE.IUniform<THREE.Color>;
  uEdgeB: THREE.IUniform<THREE.Color>;
};

export function makeDissolveMat3D<T extends THREE.MeshLambertMaterial | THREE.MeshToonMaterial>(
  mat: T,
  opts: {
    dir?: THREE.Vector3;
    minVal?: number;
    maxVal?: number;
    primary?: THREE.ColorRepresentation;
    core?: THREE.ColorRepresentation;
  } = {}
): { mat: T; uniforms: DissolveUniforms } {
  const uniforms: DissolveUniforms = {
    uDissolve: { value: 0 },
    uTime: { value: 0 },
    uDir: { value: (opts.dir ?? new THREE.Vector3(0, 1, 0)).clone().normalize() },
    uMinMax: { value: new THREE.Vector2(opts.minVal ?? -0.5, opts.maxVal ?? 0.5) },
    uEdgeA: { value: new THREE.Color(opts.primary ?? "#ff4422").multiplyScalar(2.6) },
    uEdgeB: { value: new THREE.Color(opts.core ?? "#fff2cc").multiplyScalar(4.8) },
  };
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDissLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDissLocal = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDissolve;
        uniform float uTime;
        uniform vec3 uDir;
        uniform vec2 uMinMax;
        uniform vec3 uEdgeA;
        uniform vec3 uEdgeB;
        varying vec3 vDissLocal;
        ${NOISE_GLSL}`
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        if (uDissolve > 0.001) {
          float proj = (dot(vDissLocal, uDir) - uMinMax.x) / max(uMinMax.y - uMinMax.x, 1e-4);
          float n = fbm3(vDissLocal * 7.5 + vec3(0.0, uTime * 1.4, 0.0));
          float field = clamp(proj * 0.72 + n * 0.38, 0.0, 1.15);
          float thresh = uDissolve * 1.22;
          if (field < thresh) discard;
          float band = 1.0 - smoothstep(0.0, 0.13, field - thresh);
          float core = 1.0 - smoothstep(0.0, 0.045, field - thresh);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uEdgeA, uEdgeB, core), band);
        }`
      );
  };
  mat.customProgramCacheKey = () => "voidmetric_dissolve_v3";
  return { mat, uniforms };
}

export class MoteSwarm3D {
  mesh: THREE.InstancedMesh;
  private data: { base: THREE.Vector3; vel: THREE.Vector3; delay: number; s: number; rot: THREE.Vector3 }[] = [];
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();
  private pCol: THREE.Color;
  private cCol: THREE.Color;

  constructor(
    count = 160,
    boxSize = new THREE.Vector3(0.45, 0.45, 0.45),
    opts: { driftUp?: number; moteSize?: number; primary?: THREE.ColorRepresentation; core?: THREE.ColorRepresentation } = {}
  ) {
    this.pCol = new THREE.Color(opts.primary ?? "#38d8ff");
    this.cCol = new THREE.Color(opts.core ?? "#ffffff");
    const driftUp = opts.driftUp ?? 1.2;
    const geo = new THREE.OctahedronGeometry(opts.moteSize ?? 0.022, 0);
    const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.layers.set(NOINK);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 157.3 + k * 283.7) * 43758.5453;
        return v - Math.floor(v);
      };
      this.data.push({
        base: new THREE.Vector3((h(1) - 0.5) * boxSize.x, (h(2) - 0.5) * boxSize.y, (h(3) - 0.5) * boxSize.z),
        vel: new THREE.Vector3((h(4) - 0.5) * 0.75, driftUp * (0.45 + h(5) * 0.85), (h(6) - 0.5) * 0.75),
        delay: h(7) * 0.52,
        s: 0.45 + h(8) * 1.15,
        rot: new THREE.Vector3(h(9) * 8, h(10) * 8, h(11) * 8),
      });
    }
  }

  update(progress: number, t: number) {
    this.mesh.visible = progress > 0.01 && progress < 1.35;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const u = Math.max(0, Math.min(1, (progress - d.delay) / (1.0 - d.delay * 0.65)));
      if (u <= 0.001 || u >= 0.999) {
        this.dummy.scale.setScalar(0);
      } else {
        this.dummy.position.set(
          d.base.x + d.vel.x * u + Math.sin(t * 4.5 + i * 0.7) * 0.16 * u,
          d.base.y + d.vel.y * (u * u + 0.35 * u),
          d.base.z + d.vel.z * u + Math.cos(t * 3.8 + i * 0.9) * 0.16 * u
        );
        this.dummy.rotation.set(d.rot.x * u, d.rot.y * u, d.rot.z * u);
        this.dummy.scale.setScalar(Math.max(0, d.s * Math.sin(u * Math.PI) * (1.25 - 0.5 * u)));
        this.col.copy(this.cCol).lerp(this.pCol, u).multiplyScalar(4.4 - u * 2.2);
        this.mesh.setColorAt(i, this.col);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ============================================================================
// 6. UNIVERSAL 3D SHOCKWAVE DETONATION (Dome + Twin Rings + Pillar + Crater + Debris!)
// ============================================================================
export class ShockwaveBlast3D {
  group = new THREE.Group();
  private u: { uTime: THREE.IUniform<number>; uProg: THREE.IUniform<number>; uPrimary: THREE.IUniform<THREE.Color>; uCore: THREE.IUniform<THREE.Color> };
  private dome: THREE.Mesh;
  private ringA: THREE.Mesh;
  private ringB: THREE.Mesh;
  private pillar: THREE.Mesh;
  private crater: THREE.Mesh;
  private debris: THREE.InstancedMesh;
  private debrisData: { base: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private dummy = new THREE.Object3D();

  constructor(primaryHex: THREE.ColorRepresentation = "#ff5e22", coreHex: THREE.ColorRepresentation = "#fff2cc") {
    const pCol = new THREE.Color(primaryHex);
    const cCol = new THREE.Color(coreHex);
    this.u = { uTime: { value: 0 }, uProg: { value: 0 }, uPrimary: { value: pCol }, uCore: { value: cCol } };

    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vL; void main() { vL = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uProg;
          uniform vec3 uPrimary;
          uniform vec3 uCore;
          varying vec3 vN;
          varying vec3 vV;
          varying vec3 vL;
          void main() {
            float fres = pow(max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV)))), 2.0);
            float n = fbm3(vL * 5.0 + vec3(0.0, -uTime * 3.0, uTime * 2.0));
            float fade = smoothstep(0.0, 0.08, uProg) * smoothstep(1.0, 0.25, uProg);
            vec3 col = mix(uPrimary * 2.4, uCore * 4.8, pow(max(0.0, fres), 1.5) * (0.6 + 0.4 * n));
            float a = (0.18 + fres * 0.92) * (0.55 + 0.45 * n) * fade;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      })
    );
    this.group.add(this.dome);

    this.ringA = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.055, 12, 64),
      new THREE.MeshBasicMaterial({ color: cCol.clone().lerp(pCol, 0.35).multiplyScalar(4.0), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.ringA.rotation.x = Math.PI / 2;
    this.ringA.position.y = 0.18;
    this.group.add(this.ringA);

    this.ringB = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.09, 10, 64),
      new THREE.MeshBasicMaterial({ color: pCol.clone().multiplyScalar(3.0), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.ringB.rotation.x = Math.PI / 2;
    this.ringB.position.y = 0.45;
    this.group.add(this.ringB);

    const pilGeo = new THREE.CylinderGeometry(0.45, 0.85, 16, 24, 1, true);
    pilGeo.translate(0, 8, 0);
    this.pillar = new THREE.Mesh(
      pilGeo,
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uProg;
          uniform vec3 uPrimary;
          uniform vec3 uCore;
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float core = pow(max(0.0, abs(dot(normalize(vN), normalize(vV)))), 1.4);
            float streak = fbm3(vec3(vUv.x * 10.0, vUv.y * 2.5 - uTime * 8.0, 1.0));
            float fade = smoothstep(0.0, 0.05, uProg) * smoothstep(1.0, 0.18, uProg);
            vec3 col = mix(uPrimary * 2.5, uCore * 5.0, core * streak);
            float a = core * (0.45 + 0.55 * streak) * fade * smoothstep(1.0, 0.7, vUv.y);
            gl_FragColor = vec4(col * a, a);
          }
        `,
      })
    );
    this.group.add(this.pillar);

    const crGeo = new THREE.CircleGeometry(3.4, 36);
    crGeo.rotateX(-Math.PI / 2);
    this.crater = new THREE.Mesh(
      crGeo,
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uProg;
          uniform vec3 uPrimary;
          varying vec2 vUv;
          void main() {
            float r = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(1.0, 0.4, r) * smoothstep(0.0, 0.15, uProg);
            float crack = smoothstep(0.75, 0.92, sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 14.0 + r * 6.0));
            vec3 col = mix(vec3(0.04, 0.03, 0.05), uPrimary * 2.2, crack * (1.0 - r) * (1.0 - uProg * 0.5));
            gl_FragColor = vec4(col, ring * 0.85);
          }
        `,
      })
    );
    this.crater.position.y = 0.03;
    this.group.add(this.crater);

    this.debris = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: "#3a3542", roughness: 0.88 }),
      36
    );
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const spd = 2.4 + (i % 5) * 0.85;
      this.debrisData.push({
        base: new THREE.Vector3(Math.cos(a) * 0.25, 0.12, Math.sin(a) * 0.25),
        vel: new THREE.Vector3(Math.cos(a) * spd, 2.8 + (i % 4) * 1.1, Math.sin(a) * spd),
        rot: new THREE.Vector3((i % 3) * 4, (i % 5) * 3, (i % 4) * 4),
        s: new THREE.Vector3(0.7 + (i % 3) * 0.35, 0.5 + (i % 4) * 0.28, 0.7 + (i % 2) * 0.35),
      });
    }
    this.group.add(this.debris);
    setNoInkTree(this.group);
  }

  update(prog: number, t: number, maxScale = 5.5) {
    this.group.visible = prog > 0.005 && prog < 1.2;
    if (!this.group.visible) return;
    const p = Math.max(0, Math.min(1, prog));
    this.u.uTime.value = t;
    this.u.uProg.value = p;
    const ease = 1 - Math.pow(1 - p, 3);
    this.dome.scale.setScalar(0.35 + ease * maxScale);
    this.ringA.scale.setScalar(0.4 + ease * maxScale * 1.35);
    this.ringB.scale.setScalar(0.3 + Math.pow(p, 0.7) * maxScale * 1.05);
    (this.ringA.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.92;
    (this.ringB.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.78;
    this.pillar.scale.set(1.2 - p * 0.6, 1, 1.2 - p * 0.6);

    for (let i = 0; i < this.debrisData.length; i++) {
      const d = this.debrisData[i];
      const y = Math.max(0.06, d.base.y + d.vel.y * p - 4.4 * p * p);
      this.dummy.position.set(d.base.x + d.vel.x * p, y, d.base.z + d.vel.z * p);
      this.dummy.rotation.set(d.rot.x * p, d.rot.y * p, d.rot.z * p);
      this.dummy.scale.copy(d.s).multiplyScalar(1 - p * 0.35);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================================
// 7. UNIVERSAL RAZOR ENERGY SLICE SHEET (Sword Slash / Spatial Cut!)
// ============================================================================
export class EnergySlice3D {
  mesh: THREE.Mesh;
  private u: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number>; uPrimary: THREE.IUniform<THREE.Color>; uCore: THREE.IUniform<THREE.Color> };

  constructor(
    width = 3.2,
    height = 3.6,
    primaryHex: THREE.ColorRepresentation = "#ff1e3a",
    coreHex: THREE.ColorRepresentation = "#fff0e8"
  ) {
    this.u = { uTime: { value: 0 }, uPower: { value: 0 }, uPrimary: { value: new THREE.Color(primaryHex) }, uCore: { value: new THREE.Color(coreHex) } };
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE_GLSL}
          uniform float uTime;
          uniform float uPower;
          uniform vec3 uPrimary;
          uniform vec3 uCore;
          varying vec2 vUv;
          void main() {
            float dx = abs(vUv.x - 0.5) * 2.0;
            float razor = pow(clamp(1.0 - dx, 0.0, 1.0), 4.2);
            float n = fbm3(vec3(vUv.x * 6.0, vUv.y * 8.0 - uTime * 9.0, 1.0));
            float vFade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
            vec3 col = mix(uPrimary * 2.4, uCore * 4.4, pow(max(0.0, razor), 1.8));
            float a = razor * (0.55 + 0.45 * n) * vFade * uPower;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      })
    );
    this.mesh.layers.set(NOINK);
  }

  update(power: number, t: number) {
    this.mesh.visible = power > 0.01;
    this.u.uPower.value = power;
    this.u.uTime.value = t;
  }
}

// ============================================================================
// 8. UNIVERSAL 3D MAGIC CIRCLE / DOMAIN BARRIER / SHATTERABLE RUNE ARRAY
//    (Domain Expansion, Alchemy Transmutation Circle, Forcefield, Time Ring!)
// ============================================================================
export class DomainBarrier3D {
  group = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private ringU: { uTime: THREE.IUniform<number>; uAlpha: THREE.IUniform<number>; uPrimary: THREE.IUniform<THREE.Color>; uCore: THREE.IUniform<THREE.Color> };
  private shards: THREE.InstancedMesh;
  private shardData: { base: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private glow: THREE.Sprite;
  private dummy = new THREE.Object3D();

  constructor(
    radius = 1.85,
    primaryHex: THREE.ColorRepresentation = "#46e4ff",
    coreHex: THREE.ColorRepresentation = "#ffffff"
  ) {
    const pCol = new THREE.Color(primaryHex);
    const cCol = new THREE.Color(coreHex);
    this.ringU = { uTime: { value: 0 }, uAlpha: { value: 1 }, uPrimary: { value: pCol }, uCore: { value: cCol } };

    const ringMat = new THREE.ShaderMaterial({
      uniforms: this.ringU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uAlpha;
        uniform vec3 uPrimary;
        uniform vec3 uCore;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float outer = smoothstep(0.04, 0.0, abs(r - 0.92));
          float inner = smoothstep(0.03, 0.0, abs(r - 0.68));
          float ticks = smoothstep(0.65, 0.95, sin(a * 24.0 + uTime * 2.0)) * smoothstep(0.66, 0.72, r) * smoothstep(0.92, 0.86, r);
          float geom = smoothstep(0.035, 0.0, abs(r - (0.45 + 0.14 * cos(a * 6.0 - uTime * 1.4))));
          float mask = clamp(outer + inner + ticks * 0.85 + geom * 0.9, 0.0, 1.0);
          vec3 col = mix(uPrimary * 2.6, uCore * 4.2, outer + geom * 0.5);
          gl_FragColor = vec4(col * mask * uAlpha, mask * uAlpha);
        }
      `,
    });

    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * (2.0 - i * 0.34), radius * (2.0 - i * 0.34)), ringMat);
      m.position.z = (i - 1) * 0.08;
      this.rings.push(m);
      this.group.add(m);
    }

    const shGeo = new THREE.TetrahedronGeometry(0.14, 0);
    shGeo.scale(1.2, 1.8, 0.22);
    this.shards = new THREE.InstancedMesh(
      shGeo,
      new THREE.MeshBasicMaterial({ color: pCol.clone().lerp(cCol, 0.4).multiplyScalar(3.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      36
    );
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const rr = radius * (0.18 + (i % 4) * 0.18);
      const h = (k: number) => {
        const v = Math.sin(i * 131.7 + k * 211.9) * 43758.5453;
        return v - Math.floor(v);
      };
      this.shardData.push({
        base: new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0),
        vel: new THREE.Vector3(Math.cos(a) * (1.2 + h(1) * 2.6), Math.sin(a) * (1.2 + h(2) * 2.6) - 0.4, (h(3) - 0.5) * 2.5),
        rot: new THREE.Vector3((h(4) - 0.5) * 12, (h(5) - 0.5) * 12, (h(6) - 0.5) * 12),
        s: new THREE.Vector3(0.6 + h(7) * 0.9, 0.6 + h(8) * 1.1, 0.8),
      });
    }
    this.group.add(this.shards);

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: getGlowSpriteTex(pCol), color: pCol.clone().multiplyScalar(1.8), transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.glow.scale.setScalar(radius * 3.0);
    this.group.add(this.glow);
    setNoInkTree(this.group);
  }

  update(t: number, alpha = 1, shatter = 0) {
    this.group.visible = alpha > 0.01;
    if (!this.group.visible) return;
    const sh = Math.max(0, Math.min(1, shatter));
    this.ringU.uTime.value = t;
    this.ringU.uAlpha.value = alpha * (1 - sh * 0.88);
    (this.glow.material as THREE.SpriteMaterial).opacity = 0.58 * alpha * (1 - sh * 0.75);
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].rotation.z = t * (i % 2 ? 1.4 : -1.8) + i * 0.6;
      this.rings[i].scale.setScalar(1.0 + sh * (0.45 + i * 0.15));
    }
    this.shards.visible = sh >= 0.06;
    if (this.shards.visible) {
      const k = (sh - 0.06) / 0.94;
      for (let i = 0; i < this.shardData.length; i++) {
        const d = this.shardData[i];
        this.dummy.position.copy(d.base).addScaledVector(d.vel, k * 1.35);
        this.dummy.rotation.set(d.rot.x * k, d.rot.y * k, d.rot.z * k);
        this.dummy.scale.copy(d.s).multiplyScalar(Math.max(0.01, 1 - k * 0.65));
        this.dummy.updateMatrix();
        this.shards.setMatrixAt(i, this.dummy.matrix);
      }
      this.shards.instanceMatrix.needsUpdate = true;
    }
  }
}

// ============================================================================
// 9. UNIVERSAL 3D GLOWING ANIME KANJI / SFX ONOMATOPOEIA BURST (`ゴゴゴ`, `ドゴォン`, Custom!)
// ============================================================================
export class KanjiBurst3D {
  group = new THREE.Group();
  private mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  private baseScale: number;

  constructor(
    text = "ゴゴゴ",
    opts: { primary?: string; stroke?: string; size?: number; tiltZ?: number } = {}
  ) {
    const primary = opts.primary ?? "#ff44cc";
    const stroke = opts.stroke ?? "#12061c";
    this.baseScale = opts.size ?? 1.25;

    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(opts.tiltZ ?? -0.14);
    const fontSize = text.length <= 2 ? 210 : text.length === 3 ? 148 : 112;
    ctx.font = `900 ${fontSize}px "Yu Gothic", "Meiryo", "Noto Sans JP", "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.shadowColor = primary;
    ctx.shadowBlur = 28;
    ctx.lineWidth = 24;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = primary;
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(text, 0, 0);
    ctx.restore();

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.baseScale, this.baseScale), this.mat);
    this.group.add(this.mesh);
    setNoInkTree(this.group);
  }

  update(t: number, pop = 1, cam?: THREE.Camera) {
    this.group.visible = pop > 0.01;
    if (!this.group.visible) return;
    if (cam) this.mesh.quaternion.copy(cam.quaternion);
    const p = Math.max(0, Math.min(1, pop));
    const punch = p < 0.25 ? (p / 0.25) * 1.18 : 1.18 - 0.18 * Math.min(1, (p - 0.25) / 0.25);
    const jitter = Math.sin(Math.floor(t * 20) * 17.3) * 0.03;
    this.mesh.scale.setScalar(Math.max(0.01, punch));
    this.mesh.position.set(jitter, Math.sin(t * 6) * 0.04, 0);
    this.mat.opacity = p < 0.85 ? 1.0 : Math.max(0, (1.0 - p) / 0.15);
  }
}
