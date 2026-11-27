// AAA Game-Engine 3D GLSL VFX Arsenal for "What If You Woke Up With Beerus's Destruction Power?"
// Built natively for Three.js + mromidev's Post Chain (InkPass -> 2-pass LensBlur -> 6-level HDR Bloom -> NEUTRAL -> Grade).
// Every VFX mesh lives strictly on layer NOINK so world InkPass never outlines energy, and shaders push HDR linear
// luminance > 1.0..5.0 directly into the 6-level mipmap BloomEffect for true cinematic game-engine energy glow.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

const setNoInkTree = (root: THREE.Object3D) => {
  root.traverse((o) => {
    o.layers.set(NOINK);
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
};

// Shared GLSL 3D Simplex-like Value/FBM Noise Chunk (deterministic, zero texture fetches, GPU fast!)
const NOISE_GLSL = /* glsl */ `
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

const makeGlowSpriteTex = (r: number, g: number, b: number) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const gr = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gr.addColorStop(0.0, `rgba(255, 240, 255, 1.0)`);
  gr.addColorStop(0.22, `rgba(${r}, ${g}, ${b}, 0.85)`);
  gr.addColorStop(0.55, `rgba(${Math.round(r * 0.55)}, ${Math.round(g * 0.25)}, ${Math.round(b * 0.85)}, 0.35)`);
  gr.addColorStop(1.0, `rgba(0, 0, 0, 0.0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

let _hakaiGlowTex: THREE.CanvasTexture | null = null;
let _cyanGlowTex: THREE.CanvasTexture | null = null;
const hakaiGlowTex = () => (_hakaiGlowTex ??= makeGlowSpriteTex(235, 48, 255));
const cyanGlowTex = () => (_cyanGlowTex ??= makeGlowSpriteTex(82, 238, 255));

// ============================================================================
// 1. AAA 3D VOLUMETRIC HAKAI ORB (FBM Void Core + HDR Fresnel + 3D Ribbons + Shards)
// ============================================================================
export class HakaiOrb3D {
  group = new THREE.Group();
  private coreU: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number> };
  private coronaU: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number> };
  private ribbonU: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number> };
  private ribbons = new THREE.Group();
  private shards: THREE.InstancedMesh;
  private shardData: { r: number; spd: number; ph: number; tiltX: number; tiltZ: number; s: number }[] = [];
  private glowSprite: THREE.Sprite;
  private dummy = new THREE.Object3D();

  constructor(radius = 0.24) {
    this.coreU = { uTime: { value: 0 }, uPower: { value: 1 } };
    this.coronaU = { uTime: { value: 0 }, uPower: { value: 1 } };
    this.ribbonU = { uTime: { value: 0 }, uPower: { value: 1 } };

    // Inner displaced dark-matter void core with blistering HDR magenta plasma veins & Fresnel rim
    const coreMat = new THREE.ShaderMaterial({
      uniforms: this.coreU,
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
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          float ndv = clamp(dot(normalize(vNorm), normalize(vView)), 0.0, 1.0);
          float fres = pow(1.0 - ndv, 3.1);
          float n1 = fbm3(vLocal * 4.4 + vec3(uTime * 1.8, -uTime * 1.3, uTime * 0.7));
          float n2 = fbm3(vLocal * 8.6 - vec3(uTime * 2.4, uTime * 1.9, -uTime * 1.2));
          // Razor-sharp electric plasma veins over a deep dark-void core (matches refs/hakai_sphere.jpg!)
          float vein = pow(clamp(1.0 - abs(n1 * 2.0 - 1.0), 0.0, 1.0), 6.2);
          float vein2 = pow(clamp(1.0 - abs(n2 * 2.0 - 1.0), 0.0, 1.0), 7.5);

          vec3 voidCol = vec3(0.012, 0.001, 0.032);
          vec3 midViolet = vec3(0.38, 0.02, 0.95);
          vec3 hotMagenta = vec3(2.4, 0.22, 3.6);
          vec3 whiteCore = vec3(4.2, 2.2, 4.8);

          vec3 col = mix(voidCol, midViolet, smoothstep(0.45, 0.88, n1) * (0.28 + 0.72 * fres));
          col += hotMagenta * vein * 1.75;
          col += whiteCore * vein2 * 0.75;
          // Blistering HDR Fresnel destruction corona strictly on rim so center stays menacingly dark!
          col += mix(hotMagenta, whiteCore, pow(fres, 1.8)) * fres * 3.4;
          gl_FragColor = vec4(col * uPower, 1.0);
        }
      `,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 4), coreMat);
    this.group.add(core);

    // Outer swirling additive plasma corona shell
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: this.coronaU,
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
          float w = (fbm3(n * 2.8 - vec3(0.0, uTime * 2.4, uTime * 1.1)) - 0.5) * 0.24;
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
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          float ndv = abs(dot(normalize(vNorm), normalize(vView)));
          float rim = pow(1.0 - ndv, 1.8) * smoothstep(0.0, 0.22, ndv);
          float f = fbm3(vLocal * 5.0 + vec3(uTime * 2.2, -uTime * 2.8, uTime));
          float alpha = rim * smoothstep(0.32, 0.82, f) * 0.85 * uPower;
          vec3 col = mix(vec3(1.1, 0.1, 2.6), vec3(3.6, 0.85, 4.4), smoothstep(0.45, 0.85, f));
          gl_FragColor = vec4(col * alpha, alpha);
        }
      `,
    });
    const corona = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.24, 3), coronaMat);
    this.group.add(corona);

    // 3 sculpted 3D orbital plasma ribbons (TubeGeometry with scrolling HDR energy flow!)
    const ribbonMat = new THREE.ShaderMaterial({
      uniforms: this.ribbonU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uPower;
        varying vec2 vUv;
        void main() {
          float endFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
          float pulse = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 9.0);
          float core = 1.0 - abs(vUv.y * 2.0 - 1.0);
          core = pow(clamp(core, 0.0, 1.0), 1.6);
          vec3 col = mix(vec3(1.2, 0.12, 2.8), vec3(4.2, 1.9, 4.8), core * pulse);
          float a = endFade * core * (0.45 + 0.55 * pulse) * uPower;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    for (let k = 0; k < 3; k++) {
      const pts: THREE.Vector3[] = [];
      const segs = 36;
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 1.75;
        const rr = radius * (1.36 + 0.18 * Math.sin(t * 2 + k));
        pts.push(new THREE.Vector3(Math.cos(t) * rr, Math.sin(t * 2) * radius * 0.24, Math.sin(t) * rr));
      }
      const curve3 = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve3, 44, radius * 0.048, 6, false);
      const m = new THREE.Mesh(geo, ribbonMat);
      m.rotation.set(k * 1.05 + 0.4, k * 2.1, k * 0.72);
      this.ribbons.add(m);
    }
    this.group.add(this.ribbons);

    // 32 orbiting glowing violet crystalline destruction shards (InstancedMesh)
    const shardGeo = new THREE.OctahedronGeometry(radius * 0.11, 0);
    shardGeo.scale(0.65, 1.85, 0.65);
    const shardMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 0.55, 3.4), // HDR linear magenta-violet triggers crisp Bloom!
      transparent: true,
      opacity: 0.92,
    });
    this.shards = new THREE.InstancedMesh(shardGeo, shardMat, 32);
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

    // Soft additive outer atmospheric scatter sprite (low center opacity so void core stays pitch-dark!)
    const spMat = new THREE.SpriteMaterial({
      map: hakaiGlowTex(),
      color: new THREE.Color(1.05, 0.16, 1.55),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowSprite = new THREE.Sprite(spMat);
    this.glowSprite.scale.setScalar(radius * 4.6);
    this.glowSprite.renderOrder = -1;
    this.group.add(this.glowSprite);

    setNoInkTree(this.group);
  }

  update(t: number, power = 1, scale = 1) {
    this.group.visible = power > 0.01 && scale > 0.01;
    if (!this.group.visible) return;
    this.group.scale.setScalar(scale);
    this.coreU.uTime.value = t;
    this.coreU.uPower.value = power;
    this.coronaU.uTime.value = t;
    this.coronaU.uPower.value = power;
    this.ribbonU.uTime.value = t;
    this.ribbonU.uPower.value = power;
    this.ribbons.rotation.set(t * 1.4, t * 2.2, t * 0.8);
    (this.glowSprite.material as THREE.SpriteMaterial).opacity = Math.min(0.9, 0.78 * power);

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
// 2. AAA 3D VOLUMETRIC DRAGON BALL HAKAI AURA COLUMN (3 Shells + Ground Vortex + 64 Embers + 3D Lightning!)
// ============================================================================
export class HakaiAura3D {
  group = new THREE.Group();
  private shellUniforms: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number>; uColorA: THREE.IUniform<THREE.Color>; uColorB: THREE.IUniform<THREE.Color>; uSeed: THREE.IUniform<number> }[] = [];
  private vortexU: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number> };
  private embers: THREE.InstancedMesh;
  private emberData: { r: number; ang: number; spd: number; yOff: number; s: number }[] = [];
  private bolts: THREE.Mesh[] = [];
  private boltMat: THREE.MeshBasicMaterial;
  private dummy = new THREE.Object3D();

  constructor(height = 2.65, radius = 0.82) {
    // 3 nested curved open-ended volumetric flame shells (outer deep violet, mid neon magenta, inner white-hot rim)
    const configs: [number, number, number, THREE.Color, THREE.Color, number][] = [
      [radius * 1.15, radius * 0.72, height * 1.08, new THREE.Color(0.55, 0.04, 1.5), new THREE.Color(1.8, 0.14, 2.9), 1.0],
      [radius * 0.90, radius * 0.56, height * 0.98, new THREE.Color(1.4, 0.10, 2.8), new THREE.Color(3.2, 0.52, 4.2), 2.7],
      [radius * 0.66, radius * 0.42, height * 0.86, new THREE.Color(2.4, 0.65, 3.8), new THREE.Color(4.4, 2.6, 5.0), 4.9],
    ];

    for (const [rBot, rTop, h, colA, colB, seed] of configs) {
      const geo = new THREE.CylinderGeometry(rTop, rBot, h, 36, 24, true);
      geo.translate(0, h * 0.5, 0);
      // Organic pear/flame taper profile
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / h;
        const bulge = 1.0 + 0.24 * Math.sin(y * Math.PI) - 0.35 * y * y;
        pos.setX(i, pos.getX(i) * bulge);
        pos.setZ(i, pos.getZ(i) * bulge);
      }
      geo.computeVertexNormals();

      const u = {
        uTime: { value: 0 },
        uPower: { value: 1 },
        uColorA: { value: colA },
        uColorB: { value: colB },
        uSeed: { value: seed },
      };
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
            // Seamless cylindrical angle wrapping (ZERO seam line!)
            float ang = vUv.x * 6.2831853;
            vec3 coord = vec3(cos(ang) * 1.6, vUv.y * 3.6 - uTime * 3.4, sin(ang) * 1.6 + uSeed);
            float n1 = fbm3(coord);
            float n2 = fbm3(coord * 2.1 - vec3(0.0, uTime * 2.6, 0.0));
            float fire = n1 * 0.65 + n2 * 0.45;
            // Dissolve upward into crisp anime fire tongues!
            float cutoff = mix(0.24, 0.88, pow(vUv.y, 1.15));
            float mask = smoothstep(cutoff - 0.14, cutoff + 0.12, fire);
            // Smooth bottom & Fresnel silhouette edge fade so it reads as volumetric fire, NOT a cylinder!
            float botFade = smoothstep(0.0, 0.16, vUv.y);
            float topFade = smoothstep(1.0, 0.78, vUv.y);
            float ndv = abs(dot(normalize(vNorm), normalize(vView)));
            float rimBoost = mix(0.32, 1.25, pow(1.0 - ndv, 1.35)) * smoothstep(0.02, 0.24, ndv);
            float a = mask * botFade * topFade * rimBoost * 0.75 * uPower;
            vec3 col = mix(uColorA, uColorB, smoothstep(cutoff, cutoff + 0.35, fire));
            gl_FragColor = vec4(col * a, a);
          }
        `,
      });
      this.group.add(new THREE.Mesh(geo, mat));
    }

    // Ground swirling Hakai pressure vortex ring under feet
    this.vortexU = { uTime: { value: 0 }, uPower: { value: 1 } };
    const vGeo = new THREE.RingGeometry(0.18, radius * 2.15, 48);
    vGeo.rotateX(-Math.PI / 2);
    const vMat = new THREE.ShaderMaterial({
      uniforms: this.vortexU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        varying vec2 vPos;
        void main() {
          float r = length(vPos);
          float a = atan(vPos.y, vPos.x);
          float spiral = sin(a * 6.0 - r * 7.5 + uTime * 6.0) * 0.5 + 0.5;
          float n = fbm3(vec3(cos(a) * 2.0, sin(a) * 2.0, r * 2.5 - uTime * 3.0));
          float ring = smoothstep(0.15, 0.45, r) * smoothstep(1.75, 0.55, r);
          float energy = ring * smoothstep(0.28, 0.85, spiral * 0.55 + n * 0.65);
          vec3 col = mix(vec3(1.1, 0.08, 2.5), vec3(3.8, 1.4, 4.6), pow(energy, 1.8));
          gl_FragColor = vec4(col * energy * 0.85 * uPower, energy * 0.85 * uPower);
        }
      `,
    });
    const vortex = new THREE.Mesh(vGeo, vMat);
    vortex.position.y = 0.04;
    this.group.add(vortex);

    // 64 instanced 3D rising glowing Hakai ember sparks
    const eGeo = new THREE.OctahedronGeometry(0.036, 0);
    eGeo.scale(0.55, 2.2, 0.55);
    const eMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.6, 1.2, 4.4),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.embers = new THREE.InstancedMesh(eGeo, eMat, 64);
    for (let i = 0; i < 64; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 91.7 + k * 241.3) * 43758.5453;
        return v - Math.floor(v);
      };
      this.emberData.push({
        r: radius * (0.48 + h(1) * 1.1),
        ang: h(2) * Math.PI * 2,
        spd: 0.8 + h(3) * 1.6,
        yOff: h(4),
        s: 0.5 + h(5) * 1.15,
      });
    }
    this.group.add(this.embers);

    // 6 real jagged branching 3D anime lightning bolts (crisp DBZ zig-zag vertices, NOT straight rods!)
    this.boltMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.2, 1.8, 5.2),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 6; i++) {
      const pts: THREE.Vector3[] = [];
      let bx = 0, bz = 0;
      for (let j = 0; j < 9; j++) {
        const s1 = Math.sin((i + 1) * 43.7 + j * 17.3);
        const s2 = Math.cos((i + 1) * 29.1 + j * 23.7);
        bx += s1 * 0.14;
        bz += s2 * 0.12;
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
      const life = Math.sin(prog * Math.PI);
      this.dummy.scale.setScalar(d.s * life * power);
      this.dummy.updateMatrix();
      this.embers.setMatrixAt(i, this.dummy.matrix);
    }
    this.embers.instanceMatrix.needsUpdate = true;

    // Snappy frame-stepped anime lightning bolts (re-orient every ~2 frames for crisp DBZ sakuga crackle!)
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
        // Keep jagged lightning bolts strictly on left/right flanks behind character plane so they NEVER cross faces!
        const side = i % 2 === 0 ? -1 : 1;
        const rx = side * (0.58 + h(2) * 0.42);
        const rz = -0.15 - h(1) * 0.45;
        b.position.set(rx, 0.15 + h(3) * 0.55, rz);
        b.rotation.set((h(4) - 0.5) * 0.45, h(5) * 3.14, side * (0.08 + h(6) * 0.28));
        b.scale.set(0.75 + h(7) * 0.55, 0.72 + h(8) * 0.55, 0.75 + h(7) * 0.55);
      }
    }
  }
}

// ============================================================================
// 3. AAA 3D SPATIAL HAKAI DISSOLVE SHADER + 180-MOTE CURL-FLOW ERASURE SWARM
// ============================================================================
export type DissolveUniforms = {
  uDissolve: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uDir: THREE.IUniform<THREE.Vector3>;
  uMinMax: THREE.IUniform<THREE.Vector2>;
};

/** Patches any MeshLambertMaterial/MeshToonMaterial with real-time 3D Hakai spatial erosion & HDR 4.5 glowing edge! */
export function makeHakaiDissolveMat<T extends THREE.MeshLambertMaterial | THREE.MeshToonMaterial>(
  mat: T,
  dir = new THREE.Vector3(0, 1, 0),
  minVal = -0.5,
  maxVal = 0.5
): { mat: T; uniforms: DissolveUniforms } {
  const uniforms: DissolveUniforms = {
    uDissolve: { value: 0 },
    uTime: { value: 0 },
    uDir: { value: dir.clone().normalize() },
    uMinMax: { value: new THREE.Vector2(minVal, maxVal) },
  };
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vHakaiLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHakaiLocal = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDissolve;
        uniform float uTime;
        uniform vec3 uDir;
        uniform vec2 uMinMax;
        varying vec3 vHakaiLocal;
        ${NOISE_GLSL}`
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        if (uDissolve > 0.001) {
          float proj = (dot(vHakaiLocal, uDir) - uMinMax.x) / max(uMinMax.y - uMinMax.x, 1e-4);
          float n = fbm3(vHakaiLocal * 7.5 + vec3(0.0, uTime * 1.4, 0.0));
          float field = clamp(proj * 0.72 + n * 0.38, 0.0, 1.15);
          float thresh = uDissolve * 1.22;
          if (field < thresh) discard;
          float band = 1.0 - smoothstep(0.0, 0.13, field - thresh);
          float core = 1.0 - smoothstep(0.0, 0.045, field - thresh);
          vec3 burn = mix(vec3(1.8, 0.14, 3.4), vec3(5.2, 2.6, 5.8), core);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, burn, band);
        }`
      );
  };
  mat.customProgramCacheKey = () => "hakai_dissolve_v1";
  return { mat, uniforms };
}

/** 180 instanced 3D glowing violet-magenta Hakai erasure motes peeling off an erased volume (1 -> 0) */
export class HakaiMoteSwarm3D {
  mesh: THREE.InstancedMesh;
  private data: { base: THREE.Vector3; vel: THREE.Vector3; delay: number; s: number; rot: THREE.Vector3 }[] = [];
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();

  constructor(count = 180, boxSize = new THREE.Vector3(0.4, 0.4, 0.4), driftUp = 1.2, moteSize = 0.022) {
    const geo = new THREE.OctahedronGeometry(moteSize, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
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
        const curlX = Math.sin(t * 4.5 + i * 0.7) * 0.16 * u;
        const curlZ = Math.cos(t * 3.8 + i * 0.9) * 0.16 * u;
        this.dummy.position.set(
          d.base.x + d.vel.x * u + curlX,
          d.base.y + d.vel.y * u * u + d.vel.y * 0.35 * u,
          d.base.z + d.vel.z * u + curlZ
        );
        this.dummy.rotation.set(d.rot.x * u, d.rot.y * u, d.rot.z * u);
        // Pop in bright white-magenta then shrink cleanly to 0!
        const sc = d.s * Math.sin(u * Math.PI) * (1.25 - 0.5 * u);
        this.dummy.scale.setScalar(Math.max(0, sc));
        // HDR color shift: blazing white-pink -> neon magenta -> deep electric violet
        this.col.setRGB(
          4.2 * (1 - u) + 0.9 * u,
          2.2 * (1 - u) * (1 - u) + 0.08 * u,
          4.8 * (1 - u * 0.35)
        );
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
// 4. AAA 3D PEBBLE "1 -> 0" SUPERNOVA SHOCKWAVE & CRATER DETONATION
// ============================================================================
export class ShockwaveBlast3D {
  group = new THREE.Group();
  private domeU: { uTime: THREE.IUniform<number>; uProg: THREE.IUniform<number> };
  private dome: THREE.Mesh;
  private ringA: THREE.Mesh;
  private ringB: THREE.Mesh;
  private pillar: THREE.Mesh;
  private pillarU: { uTime: THREE.IUniform<number>; uProg: THREE.IUniform<number> };
  private crater: THREE.Mesh;
  private debris: THREE.InstancedMesh;
  private debrisData: { base: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private spikes: THREE.Mesh[] = [];
  private dummy = new THREE.Object3D();

  constructor() {
    this.domeU = { uTime: { value: 0 }, uProg: { value: 0 } };
    const domeMat = new THREE.ShaderMaterial({
      uniforms: this.domeU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          vLocal = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNorm = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uProg;
        varying vec3 vNorm;
        varying vec3 vView;
        varying vec3 vLocal;
        void main() {
          float ndv = abs(dot(normalize(vNorm), normalize(vView)));
          float fres = pow(1.0 - ndv, 2.0);
          float n = fbm3(vLocal * 5.0 + vec3(0.0, -uTime * 3.0, uTime * 2.0));
          float fade = smoothstep(0.0, 0.08, uProg) * smoothstep(1.0, 0.25, uProg);
          vec3 col = mix(vec3(1.5, 0.14, 3.2), vec3(4.8, 2.4, 5.4), pow(fres, 1.5) * (0.6 + 0.4 * n));
          float a = (0.18 + fres * 0.92) * (0.55 + 0.45 * n) * fade;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
    this.group.add(this.dome);

    const ringMatA = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.2, 1.4, 4.8),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ringA = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.055, 12, 64), ringMatA);
    this.ringA.rotation.x = Math.PI / 2;
    this.ringA.position.y = 0.18;
    this.group.add(this.ringA);

    const ringMatB = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 0.3, 3.8),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ringB = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 10, 64), ringMatB);
    this.ringB.rotation.x = Math.PI / 2;
    this.ringB.position.y = 0.45;
    this.group.add(this.ringB);

    // Sky-piercing vertical Hakai beam pillar
    this.pillarU = { uTime: { value: 0 }, uProg: { value: 0 } };
    const pilMat = new THREE.ShaderMaterial({
      uniforms: this.pillarU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNorm;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNorm = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uProg;
        varying vec2 vUv;
        varying vec3 vNorm;
        varying vec3 vView;
        void main() {
          float ndv = abs(dot(normalize(vNorm), normalize(vView)));
          float core = pow(ndv, 1.4);
          float streak = fbm3(vec3(vUv.x * 10.0, vUv.y * 2.5 - uTime * 8.0, 1.0));
          float fade = smoothstep(0.0, 0.05, uProg) * smoothstep(1.0, 0.18, uProg);
          vec3 col = mix(vec3(1.8, 0.15, 3.5), vec3(5.0, 3.2, 5.5), core * streak);
          float a = core * (0.45 + 0.55 * streak) * fade * smoothstep(1.0, 0.7, vUv.y);
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    const pilGeo = new THREE.CylinderGeometry(0.45, 0.85, 16, 24, 1, true);
    pilGeo.translate(0, 8, 0);
    this.pillar = new THREE.Mesh(pilGeo, pilMat);
    this.group.add(this.pillar);

    // Glowing violet impact crater scorch disc on the street
    const crMat = new THREE.ShaderMaterial({
      uniforms: this.domeU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uProg;
        varying vec2 vP;
        void main() {
          float r = length(vP) / 3.2;
          float ang = atan(vP.y, vP.x);
          float crack = pow(abs(sin(ang * 9.0 + fbm3(vec3(vP * 1.4, 0.0)) * 4.5)), 8.0);
          float disc = smoothstep(1.0, 0.55, r);
          vec3 darkHole = vec3(0.03, 0.015, 0.05);
          vec3 glowCrack = vec3(2.8, 0.35, 3.9) * crack * smoothstep(1.0, 0.15, r);
          vec3 rimGlow = vec3(1.8, 0.18, 2.8) * smoothstep(0.55, 0.82, r) * smoothstep(1.0, 0.82, r);
          float a = disc * smoothstep(0.0, 0.12, uProg);
          gl_FragColor = vec4(darkHole + glowCrack + rimGlow, a);
        }
      `,
    });
    const crGeo = new THREE.CircleGeometry(3.2, 48);
    crGeo.rotateX(-Math.PI / 2);
    this.crater = new THREE.Mesh(crGeo, crMat);
    this.crater.position.y = 0.03;
    this.group.add(this.crater);

    // 72 tumbling 3D asphalt & concrete debris chunks erupting ballistically!
    const debGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const debMat = new THREE.MeshLambertMaterial({ color: "#4a4e5a", emissive: "#580c88", emissiveIntensity: 0.45 });
    this.debris = new THREE.InstancedMesh(debGeo, debMat, 72);
    for (let i = 0; i < 72; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 193.1 + k * 371.9) * 43758.5453;
        return v - Math.floor(v);
      };
      const ang = h(1) * Math.PI * 2;
      const spd = 1.8 + h(2) * 5.2;
      this.debrisData.push({
        base: new THREE.Vector3(Math.cos(ang) * (0.3 + h(3) * 1.2), 0.1, Math.sin(ang) * (0.3 + h(3) * 1.2)),
        vel: new THREE.Vector3(Math.cos(ang) * spd, 2.8 + h(4) * 5.5, Math.sin(ang) * spd),
        rot: new THREE.Vector3((h(5) - 0.5) * 10, (h(6) - 0.5) * 10, (h(7) - 0.5) * 10),
        s: new THREE.Vector3(0.5 + h(8) * 1.2, 0.35 + h(9) * 0.7, 0.5 + h(10) * 1.1),
      });
    }
    this.group.add(this.debris);

    // 18 radial anime speed/impact spike cones snapping outward
    const spkGeo = new THREE.ConeGeometry(0.06, 2.2, 5);
    spkGeo.translate(0, 1.1, 0);
    const spkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.4, 2.0, 5.2),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(spkGeo, spkMat);
      const a = (i / 18) * Math.PI * 2;
      const elev = 0.22 + (i % 3) * 0.32;
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a) * Math.cos(elev), Math.sin(elev), Math.sin(a) * Math.cos(elev)).normalize());
      this.spikes.push(m);
      this.group.add(m);
    }

    setNoInkTree(this.group);
  }

  update(prog: number, t: number) {
    this.group.visible = prog > 0.005;
    if (!this.group.visible) return;
    const p = Math.max(0, Math.min(1, prog));
    const ease = 1 - Math.pow(1 - p, 3);
    this.domeU.uTime.value = t;
    this.domeU.uProg.value = p;
    this.pillarU.uTime.value = t;
    this.pillarU.uProg.value = p;

    this.dome.scale.setScalar(0.35 + ease * 5.8);
    this.ringA.scale.setScalar(0.4 + ease * 8.2);
    (this.ringA.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.95);
    this.ringB.scale.setScalar(0.3 + Math.pow(ease, 1.25) * 6.4);
    (this.ringB.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.85);
    this.pillar.scale.set(0.3 + (1 - p) * 1.4, 0.2 + ease * 1.1, 0.3 + (1 - p) * 1.4);
    this.crater.scale.setScalar(0.2 + Math.min(1, p * 2.5) * 0.95);

    const spkFade = p < 0.38 ? Math.sin((p / 0.38) * Math.PI) : 0;
    for (let i = 0; i < this.spikes.length; i++) {
      this.spikes[i].visible = spkFade > 0.02;
      this.spikes[i].scale.set(1, 0.5 + p * 3.8, 1);
    }

    for (let i = 0; i < this.debrisData.length; i++) {
      const d = this.debrisData[i];
      const dt = p * 1.35;
      const y = Math.max(0.08, d.base.y + d.vel.y * dt - 4.8 * dt * dt);
      this.dummy.position.set(d.base.x + d.vel.x * dt, y, d.base.z + d.vel.z * dt);
      this.dummy.rotation.set(d.rot.x * dt, d.rot.y * dt, d.rot.z * dt);
      this.dummy.scale.copy(d.s).multiplyScalar(Math.min(1, p * 5));
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================================
// 5. AAA 3D SPLIT PLANET EARTH + HAKAI EQUATORIAL SHEAR + EXPLODING SUNS (SPACE!)
// ============================================================================
const paintEarthTex = () => {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 512;
  const g = cv.getContext("2d")!;
  // Rich deep sapphire ocean
  const oGr = g.createLinearGradient(0, 0, 0, 512);
  oGr.addColorStop(0, "#1d60b8");
  oGr.addColorStop(0.5, "#114899");
  oGr.addColorStop(1, "#1855a8");
  g.fillStyle = oGr;
  g.fillRect(0, 0, 1024, 512);

  // Stylized vivid anime continents
  const blobs: [number, number, number, number, string][] = [
    [220, 165, 115, 72, "#3ea84f"], [265, 295, 68, 95, "#45b254"],
    [520, 155, 92, 60, "#4ab852"], [540, 265, 78, 92, "#7ab84c"],
    [710, 165, 145, 78, "#40a64c"], [810, 325, 62, 46, "#b8a052"],
    [350, 105, 58, 35, "#d8e8f2"],
  ];
  for (const [x, y, rx, ry, col] of blobs) {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const jit = 0.78 + 0.3 * Math.sin(a * 5 + x) + 0.14 * Math.cos(a * 9 + y);
      const px = x + Math.cos(a) * rx * jit;
      const py = y + Math.sin(a) * ry * jit;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }
  // Polar ice caps
  g.fillStyle = "#e8f4ff";
  g.fillRect(0, 0, 1024, 28);
  g.fillRect(0, 484, 1024, 28);

  // Swirling white atmospheric clouds
  g.fillStyle = "rgba(255, 255, 255, 0.42)";
  for (let i = 0; i < 42; i++) {
    const cx = (i * 173) % 1024;
    const cy = 48 + ((i * 89) % 416);
    g.beginPath();
    g.ellipse(cx, cy, 42 + (i % 5) * 18, 9 + (i % 3) * 5, (i % 7 - 3) * 0.08, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export class SplitPlanet3D {
  group = new THREE.Group();
  private topHalf = new THREE.Group();
  private botHalf = new THREE.Group();
  private shearRing: THREE.Mesh;
  private coreU: { uTime: THREE.IUniform<number>; uSplit: THREE.IUniform<number> };
  private topDissolveU: DissolveUniforms;
  private motes: HakaiMoteSwarm3D;
  private chunks: THREE.InstancedMesh;
  private chunkData: { ang: number; r: number; spd: number; yDir: number; s: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(radius = 2.65) {
    const earthTex = paintEarthTex();
    this.coreU = { uTime: { value: 0 }, uSplit: { value: 0 } };

    // Bottom intact hemisphere
    const botMat = new THREE.MeshLambertMaterial({ map: earthTex });
    const botSphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), botMat);
    this.botHalf.add(botSphere);

    // Top hemisphere with real-time 3D Hakai dissolve shader so the sliced half literally vaporizes into violet dust!
    const topBase = new THREE.MeshLambertMaterial({ map: earthTex });
    const { mat: topMat, uniforms: topU } = makeHakaiDissolveMat(topBase, new THREE.Vector3(0, 1, 0), 0.0, radius);
    this.topDissolveU = topU;
    const topSphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), topMat);
    this.topHalf.add(topSphere);

    // Blistering HDR violet-magenta Hakai magma/plasma cut-face discs capping BOTH hemispheres!
    const cutMat = new THREE.ShaderMaterial({
      uniforms: this.coreU,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uSplit;
        varying vec2 vP;
        void main() {
          float r = length(vP) / ${radius.toFixed(2)};
          float n = fbm3(vec3(vP * 1.4, uTime * 1.2));
          vec3 core = vec3(4.8, 2.2, 5.2);
          vec3 magma = vec3(2.4, 0.25, 3.6);
          vec3 crust = vec3(0.45, 0.06, 0.85);
          vec3 col = mix(core, magma, smoothstep(0.18, 0.65, r + (n - 0.5) * 0.22));
          col = mix(col, crust, smoothstep(0.78, 0.98, r));
          col += vec3(3.6, 1.2, 4.4) * smoothstep(0.86, 0.99, r); // glowing cut-rim edge!
          gl_FragColor = vec4(col * (0.4 + 0.8 * smoothstep(0.0, 0.15, uSplit)), 1.0);
        }
      `,
    });
    const capGeo = new THREE.CircleGeometry(radius * 0.996, 48);
    const botCap = new THREE.Mesh(capGeo, cutMat);
    botCap.rotation.x = -Math.PI / 2;
    this.botHalf.add(botCap);
    const topCap = new THREE.Mesh(capGeo, cutMat);
    topCap.rotation.x = Math.PI / 2;
    this.topHalf.add(topCap);

    // Glowing blue Rayleigh atmosphere Fresnel shell on intact hemisphere
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float fres = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.6);
          gl_FragColor = vec4(vec3(0.35, 1.25, 2.8) * fres, fres * 0.85);
        }
      `,
    });
    this.botHalf.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.07, 40, 20, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52), atmoMat));

    this.group.add(this.botHalf);
    this.group.add(this.topHalf);

    // Razor-thin HDR magenta equatorial Hakai slash ring (sleek thin torus, never blocks Earth!)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.6, 0.85, 4.4),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shearRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.04, 0.042, 12, 72), ringMat);
    this.shearRing.rotation.x = Math.PI / 2;
    this.group.add(this.shearRing);

    // 100 dark charred volcanic planetary fragments glowing with violet magma veins!
    const cGeo = new THREE.DodecahedronGeometry(0.075, 0);
    const cMat = new THREE.MeshLambertMaterial({ color: "#1d152a", emissive: "#9a18ff", emissiveIntensity: 0.85 });
    this.chunks = new THREE.InstancedMesh(cGeo, cMat, 100);
    for (let i = 0; i < 100; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 113.7 + k * 271.3) * 43758.5453;
        return v - Math.floor(v);
      };
      this.chunkData.push({
        ang: h(1) * Math.PI * 2,
        r: radius * (0.75 + h(2) * 0.35),
        spd: 0.8 + h(3) * 2.8,
        yDir: (h(4) - 0.3) * 1.4,
        s: 0.4 + h(5) * 1.3,
      });
    }
    this.group.add(this.chunks);

    this.motes = new HakaiMoteSwarm3D(180, new THREE.Vector3(radius * 1.9, radius * 0.85, radius * 1.9), 2.2, 0.055);
    this.motes.mesh.position.y = radius * 0.45;
    this.group.add(this.motes.mesh);

    setNoInkTree(this.group);
  }

  update(split: number, dissolveTop: number, t: number) {
    const s = Math.max(0, Math.min(1, split));
    this.coreU.uTime.value = t;
    this.coreU.uSplit.value = s;
    this.topDissolveU.uDissolve.value = Math.max(0, Math.min(1, dissolveTop));
    this.topDissolveU.uTime.value = t;

    this.botHalf.rotation.y = t * 0.14;
    this.topHalf.rotation.y = t * 0.14 + s * 0.12;
    this.topHalf.position.set(s * 0.35, s * 1.25, -s * 0.15);
    this.topHalf.rotation.z = -s * 0.16;

    this.shearRing.visible = s > 0.01;
    this.shearRing.scale.setScalar(0.85 + s * 1.65);
    (this.shearRing.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.min(1, s) * Math.PI) * 0.95;

    this.chunks.visible = s > 0.02;
    for (let i = 0; i < this.chunkData.length; i++) {
      const d = this.chunkData[i];
      const rr = d.r + s * d.spd * 1.6;
      this.dummy.position.set(Math.cos(d.ang) * rr, s * d.yDir * 1.35, Math.sin(d.ang) * rr);
      this.dummy.rotation.set(t * 2 + i, t * 1.5 + i, i);
      this.dummy.scale.setScalar(d.s * Math.min(1, s * 3));
      this.dummy.updateMatrix();
      this.chunks.setMatrixAt(i, this.dummy.matrix);
    }
    this.chunks.instanceMatrix.needsUpdate = true;

    this.motes.update(dissolveTop * 1.15, t);
  }
}

// ============================================================================
// 6. AAA 3D WHIS TEMPORAL DO-OVER REWIND RINGS + SHATTERING 3D ANGELIC CLOCK
// ============================================================================
export class TemporalRewind3D {
  group = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private ringU: { uTime: THREE.IUniform<number>; uAlpha: THREE.IUniform<number> };
  private clockGroup = new THREE.Group();
  private handMin: THREE.Mesh;
  private handHr: THREE.Mesh;
  private shards: THREE.InstancedMesh;
  private shardData: { base: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private glow: THREE.Sprite;
  private dummy = new THREE.Object3D();

  constructor(radius = 1.65) {
    this.ringU = { uTime: { value: 0 }, uAlpha: { value: 1 } };

    // 5 tilted concentric holographic cyan-gold time-rewind orbital rings with scrolling clock-tick shader!
    const ringMat = new THREE.ShaderMaterial({
      uniforms: this.ringU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uAlpha;
        varying vec2 vUv;
        void main() {
          float ang = vUv.x * 6.2831853;
          // Scrolling counter-clockwise runic clock dashes!
          float ticks = step(0.32, fract(vUv.x * 24.0 + uTime * 1.8));
          float band = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
          float pulse = 0.65 + 0.35 * sin(ang * 3.0 + uTime * 5.0);
          vec3 col = mix(vec3(0.45, 2.4, 3.8), vec3(2.8, 3.6, 4.4), ticks * pulse);
          float a = band * (0.28 + 0.72 * ticks) * uAlpha;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    for (let i = 0; i < 5; i++) {
      const r0 = radius * (0.72 + i * 0.22);
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 0.065, 64), ringMat);
      m.rotation.set(0.35 * (i - 2), 0.28 * (i % 2 ? 1 : -1), i * 0.5);
      this.rings.push(m);
      this.group.add(m);
    }

    // Intact 3D holographic clock dial + metallic-cyan rotating hands
    const dialRim = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.62, 0.032, 12, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 3.4, 4.4), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 })
    );
    this.clockGroup.add(dialRim);
    const dialFace = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.6, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.45, 0.75), transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
    );
    this.clockGroup.add(dialFace);

    const hMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 4.2, 4.8) });
    const mGeo = new THREE.BoxGeometry(0.045, radius * 0.46, 0.03);
    mGeo.translate(0, radius * 0.23, 0.04);
    this.handMin = new THREE.Mesh(mGeo, hMat);
    this.clockGroup.add(this.handMin);

    const hGeo = new THREE.BoxGeometry(0.06, radius * 0.31, 0.03);
    hGeo.translate(0, radius * 0.155, 0.06);
    this.handHr = new THREE.Mesh(hGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 3.2, 4.2) }));
    this.clockGroup.add(this.handHr);
    this.group.add(this.clockGroup);

    // 36 exploding 3D translucent crystal clock shards when "NO ANGEL" hits!
    const shGeo = new THREE.TetrahedronGeometry(0.16, 0);
    shGeo.scale(1.2, 1.8, 0.22);
    const shMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.2, 3.2, 4.4),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shards = new THREE.InstancedMesh(shGeo, shMat, 36);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const rr = radius * (0.18 + (i % 4) * 0.14);
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

    const gMat = new THREE.SpriteMaterial({
      map: cyanGlowTex(),
      color: new THREE.Color(0.55, 1.9, 2.6),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Sprite(gMat);
    this.glow.scale.setScalar(radius * 3.4);
    this.group.add(this.glow);

    setNoInkTree(this.group);
  }

  update(t: number, alpha = 1, shatter = 0) {
    this.group.visible = alpha > 0.01;
    if (!this.group.visible) return;
    const sh = Math.max(0, Math.min(1, shatter));
    this.ringU.uTime.value = t;
    this.ringU.uAlpha.value = alpha * (1 - sh * 0.88);
    (this.glow.material as THREE.SpriteMaterial).opacity = 0.65 * alpha * (1 - sh * 0.75);

    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].rotation.z = t * (i % 2 ? 1.4 : -1.8) + i * 0.6;
      this.rings[i].scale.setScalar(1.0 + sh * (0.45 + i * 0.15));
    }

    this.clockGroup.visible = sh < 0.06;
    if (this.clockGroup.visible) {
      // Spinning rapidly COUNTER-CLOCKWISE (rewinding time!)
      this.handMin.rotation.z = t * 5.2;
      this.handHr.rotation.z = t * 1.1;
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
// 7. AAA 3D EXPLODING SUNS (For Beerus's Sleep-Sneeze Beat!)
// ============================================================================
export class SunOrb3D {
  group = new THREE.Group();
  private u: { uTime: THREE.IUniform<number>; uErase: THREE.IUniform<number> };
  private ring: THREE.Mesh;
  private motes: HakaiMoteSwarm3D;

  constructor(radius = 1.15) {
    this.u = { uTime: { value: 0 }, uErase: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vL;
        void main() {
          vL = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uErase;
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vL;
        void main() {
          float n = fbm3(vL * 4.5 + vec3(uTime * 1.2, -uTime * 0.9, uTime * 0.6));
          if (uErase > 0.01 && n < uErase * 1.08) discard;
          float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.0);
          vec3 solar = mix(vec3(3.4, 0.95, 0.14), vec3(4.8, 3.4, 1.2), smoothstep(0.35, 0.85, n));
          // Turns scorching purple-magenta right as Beerus's Hakai sneeze erases the star!
          float edge = uErase > 0.01 ? (1.0 - smoothstep(0.0, 0.16, n - uErase * 1.08)) : 0.0;
          vec3 col = mix(solar, vec3(4.6, 0.8, 5.2), max(edge, uErase * 0.45));
          col += vec3(3.2, 1.4, 0.4) * fres * (1.0 - uErase);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), mat));

    const rMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.8, 0.85, 4.6),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.05, 0.045, 10, 56), rMat);
    this.group.add(this.ring);

    this.motes = new HakaiMoteSwarm3D(90, new THREE.Vector3(radius * 1.8, radius * 1.8, radius * 1.8), 0.35, 0.05);
    this.group.add(this.motes.mesh);
    setNoInkTree(this.group);
  }

  update(erase: number, t: number, cam?: THREE.Camera) {
    this.u.uTime.value = t;
    this.u.uErase.value = Math.max(0, Math.min(1, erase));
    this.ring.visible = erase > 0.05;
    if (this.ring.visible) {
      if (cam) this.ring.quaternion.copy(cam.quaternion);
      this.ring.scale.setScalar(0.8 + erase * 2.4);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.min(1, erase) * Math.PI) * 0.95;
    }
    this.motes.update(erase * 1.2, t);
  }
}

// ============================================================================
// 8. AAA 3D HAKAI ENERGY SLICE SHEET (For Razor-Clean Brick Wall Cut!)
// ============================================================================
export class HakaiSlice3D {
  mesh: THREE.Mesh;
  private u: { uTime: THREE.IUniform<number>; uPower: THREE.IUniform<number> };

  constructor(width = 3.2, height = 3.6) {
    this.u = { uTime: { value: 0 }, uPower: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        varying vec2 vUv;
        void main() {
          float dx = abs(vUv.x - 0.5) * 2.0;
          float razor = pow(clamp(1.0 - dx, 0.0, 1.0), 4.2);
          float n = fbm3(vec3(vUv.x * 6.0, vUv.y * 8.0 - uTime * 9.0, 1.0));
          float vFade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          vec3 col = mix(vec3(1.9, 0.14, 3.6), vec3(5.2, 3.0, 5.6), pow(razor, 1.8));
          float a = razor * (0.55 + 0.45 * n) * vFade * uPower;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    this.mesh.layers.set(NOINK);
  }

  update(power: number, t: number) {
    this.mesh.visible = power > 0.01;
    this.u.uPower.value = power;
    this.u.uTime.value = t;
  }
}

// ============================================================================
// 9. UNIVERSAL COLOR-PARAMETERIZED 3D ANIME VFX (1-Line Any Anime Power!)
//    Examples:
//      Gojo Hollow Purple: new EnergyOrb3D(0.24, "#b828ff", "#ffddff")
//      Gojo Limitless Blue: new EnergyOrb3D(0.22, "#1e88ff", "#d4f4ff")
//      Gojo Reversal Red:   new EnergyOrb3D(0.20, "#ff2438", "#ffe0d8")
//      Sukuna Crimson Slash: new EnergySlice3D(2.8, 3.6, "#ff1e3a", "#fff0e8")
//      Goku Ultra Instinct:  new EnergyAura3D(2.5, 0.85, "#b8dcff", "#ffffff")
// ============================================================================
export class EnergyOrb3D {
  group = new THREE.Group();
  private coreU: {
    uTime: THREE.IUniform<number>;
    uPower: THREE.IUniform<number>;
    uPrimary: THREE.IUniform<THREE.Color>;
    uCore: THREE.IUniform<THREE.Color>;
  };
  private rings = new THREE.Group();
  private glow: THREE.Sprite;

  constructor(radius = 0.24, primaryHex: THREE.ColorRepresentation = "#b828ff", coreHex: THREE.ColorRepresentation = "#ffe4ff") {
    const pCol = new THREE.Color(primaryHex);
    const cCol = new THREE.Color(coreHex);
    this.coreU = {
      uTime: { value: 0 },
      uPower: { value: 1 },
      uPrimary: { value: pCol },
      uCore: { value: cCol },
    };

    const coreMat = new THREE.ShaderMaterial({
      uniforms: this.coreU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vObj;
        void main() {
          float d = (fbm3(position * 5.2 + vec3(uTime * 2.4, -uTime * 1.9, uTime * 1.3)) - 0.5) * 0.14 * uPower;
          vec3 p = position + normal * d;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          vObj = p;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uPower;
        uniform vec3 uPrimary;
        uniform vec3 uCore;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vObj;
        void main() {
          float n = fbm3(vObj * 6.5 - vec3(0.0, uTime * 3.8, uTime * 2.2));
          float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.1);
          vec3 col = mix(uPrimary * 0.55, uPrimary * 2.6, smoothstep(0.28, 0.72, n));
          col += uCore * (pow(smoothstep(0.58, 0.94, n), 1.6) * 2.6 + fres * 2.4);
          gl_FragColor = vec4(col * uPower, clamp(0.78 + fres * 0.22, 0.0, 1.0) * min(1.0, uPower));
        }
      `,
    });
    this.group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 4), coreMat));

    const ringMat = new THREE.MeshBasicMaterial({
      color: pCol.clone().multiplyScalar(2.8),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.26 + i * 0.14), radius * 0.045, 8, 44), ringMat);
      r.rotation.set(i === 0 ? 0.65 : -0.75, i * 1.1, 0.4);
      this.rings.add(r);
    }
    this.group.add(this.rings);

    const tex = makeGlowSpriteTex(Math.round(pCol.r * 255), Math.round(pCol.g * 255), Math.round(pCol.b * 255));
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.72 })
    );
    this.glow.scale.setScalar(radius * 4.4);
    this.group.add(this.glow);
    setNoInkTree(this.group);
  }

  update(t: number, power = 1.0, scale = 1.0) {
    this.group.visible = power > 0.01;
    this.coreU.uTime.value = t;
    this.coreU.uPower.value = power;
    this.group.scale.setScalar(scale);
    this.rings.rotation.y = t * 2.4;
    this.rings.rotation.x = Math.sin(t * 1.6) * 0.5;
  }
}

export class EnergyAura3D {
  group = new THREE.Group();
  private u: {
    uTime: THREE.IUniform<number>;
    uPower: THREE.IUniform<number>;
    uPrimary: THREE.IUniform<THREE.Color>;
    uCore: THREE.IUniform<THREE.Color>;
  };

  constructor(
    height = 2.45,
    radius = 0.82,
    primaryHex: THREE.ColorRepresentation = "#b828ff",
    coreHex: THREE.ColorRepresentation = "#ffe4ff"
  ) {
    this.u = {
      uTime: { value: 0 },
      uPower: { value: 1 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uCore: { value: new THREE.Color(coreHex) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
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
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float n = fbm3(vec3(vUv.x * 10.0, vUv.y * 5.0 - uTime * 4.4, uTime * 0.6));
          float vFade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 1.35);
          float flame = smoothstep(0.32, 0.82, n) * vFade * (0.45 + rim * 1.15);
          vec3 col = mix(uPrimary * 1.9, uCore * 2.8, pow(clamp(flame, 0.0, 1.0), 1.8));
          gl_FragColor = vec4(col * flame * uPower, flame * 0.85 * uPower);
        }
      `,
    });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 1.08, height, 32, 16, true), mat);
    cyl.position.y = height * 0.5;
    this.group.add(cyl);
    setNoInkTree(this.group);
  }

  update(t: number, power = 1.0, scale = 1.0) {
    this.group.visible = power > 0.01;
    this.u.uTime.value = t;
    this.u.uPower.value = power;
    this.group.scale.setScalar(scale);
  }
}

export class EnergySlice3D {
  mesh: THREE.Mesh;
  private u: {
    uTime: THREE.IUniform<number>;
    uPower: THREE.IUniform<number>;
    uPrimary: THREE.IUniform<THREE.Color>;
    uCore: THREE.IUniform<THREE.Color>;
  };

  constructor(
    width = 3.2,
    height = 3.6,
    primaryHex: THREE.ColorRepresentation = "#ff1e3a",
    coreHex: THREE.ColorRepresentation = "#fff0e8"
  ) {
    this.u = {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uCore: { value: new THREE.Color(coreHex) },
    };
    const mat = new THREE.ShaderMaterial({
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
          vec3 col = mix(uPrimary * 2.4, uCore * 4.4, pow(razor, 1.8));
          float a = razor * (0.55 + 0.45 * n) * vFade * uPower;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    this.mesh.layers.set(NOINK);
  }

  update(power: number, t: number) {
    this.mesh.visible = power > 0.01;
    this.u.uPower.value = power;
    this.u.uTime.value = t;
  }
}
