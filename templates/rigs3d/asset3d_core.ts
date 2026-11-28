// Voidmetric v5.0 Universal Cel-Shaded .glb / AI-Mesh / Multi-Part Loader (Zero Hardcoding!)
// Loads ANY `.glb` forged by local RTX 4060 `TripoSG`, `PartCrafter`, `UniRig + Blender 4.5 LTS`, or external 3D tools
// and automatically converts materials into Voidmetric's `ANIME_LIGHT`-synced cel-shaded anime look:
//   - Rigid meshes: `makeAnimeMat` (3-band chromatic cel + Fresnel rim + crisp specular) + optional smooth-normal ink hull
//   - SkinnedMesh rigs: `three-custom-shader-material` extending `MeshStandardMaterial` so skeletal bone skinning,
//     morph targets, embedded PBR albedo textures, AND Three.js shadows work 100% natively!
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { NOINK } from "../bridge/ink";
import { ANIME_LIGHT, getHullMat, makeAnimeMat } from "./rig3d_core";

export type AnimeGLBOpts = {
  /** Normalize uniform scale so model bounding box height equals `targetHeight` (meters). Omit to preserve native scale. */
  targetHeight?: number;
  /** Shift root children so lowest vertex sits cleanly at `y = 0` (default true when `targetHeight` is set). */
  groundToZero?: boolean;
  /** Center X/Z bounding box horizontally around origin (default true when `targetHeight` is set). */
  centerXZ?: boolean;
  /** Base cel color multiplier / override (defaults to source material color or `#eef0f8`). */
  color?: THREE.ColorRepresentation;
  /** Cool/chromatic shadow tint multiplier (default `#6d5f88`). */
  shadowColor?: THREE.ColorRepresentation;
  /** Rim highlight color (default `#e8d8ff`). */
  rimColor?: THREE.ColorRepresentation;
  rimStrength?: number;
  specStrength?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  /** Add inverted-hull smooth-normal ink outlines on rigid meshes (default `0.0045`; set `0` to disable). */
  outlineWidth?: number;
  outlineColor?: string;
  /** Put cel meshes on layer NOINK when inverted-hull outlines are enabled (default true so InkPass doesn't double-ink). */
  noInkPass?: boolean;
  /** Optional clip index or name to auto-bind to `setFrame(f)` if the GLB contains animations. */
  clipNameOrIndex?: string | number;
};

export type LoadedAnimeGLB = {
  root: THREE.Group;
  scene: THREE.Group;
  meshes: THREE.Mesh[];
  skinnedMeshes: THREE.SkinnedMesh[];
  bones: Record<string, THREE.Bone>;
  animations: THREE.AnimationClip[];
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  bounds: THREE.Box3;
  /** Deterministically evaluate embedded GLB skeletal/node animation at exact frame `f` (safe across `--concurrency=4`!). */
  setFrame: (f: number, fps?: number, loop?: boolean) => void;
  dispose: () => void;
};

function buildSkinnedAnimeCSM(srcMat: THREE.Material | undefined, opts: AnimeGLBOpts): CustomShaderMaterial {
  const std = srcMat as THREE.MeshStandardMaterial | undefined;
  const baseCol = opts.color ? new THREE.Color(opts.color) : std?.color ? std.color.clone() : new THREE.Color("#eceff6");
  const shadowCol = new THREE.Color(opts.shadowColor ?? "#6d5f88");
  const rimCol = new THREE.Color(opts.rimColor ?? "#e8d8ff");
  const emiCol = opts.emissive ? new THREE.Color(opts.emissive) : std?.emissive ? std.emissive.clone() : new THREE.Color("#000000");

  return new CustomShaderMaterial({
    baseMaterial: THREE.MeshStandardMaterial,
    color: baseCol,
    map: std?.map ?? null,
    roughness: 0.92,
    metalness: 0.0,
    side: std?.side ?? THREE.FrontSide,
    transparent: std?.transparent ?? false,
    opacity: std?.opacity ?? 1.0,
    uniforms: {
      uLightDir: ANIME_LIGHT.uLightDir,
      uKeyColor: ANIME_LIGHT.uKeyColor,
      uAmbientTint: ANIME_LIGHT.uAmbientTint,
      uRimTint: ANIME_LIGHT.uRimTint,
      uRimBoost: ANIME_LIGHT.uRimBoost,
      uShadowColor: { value: shadowCol },
      uRimColor: { value: rimCol },
      uRimStrength: { value: opts.rimStrength ?? 0.34 },
      uSpecStrength: { value: opts.specStrength ?? 0.16 },
      uMetalBoost: { value: opts.metalness ?? 0.0 },
      uEmiColor: { value: emiCol },
      uEmiIntensity: { value: opts.emissiveIntensity ?? 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vVoidWorldN;
      varying vec3 vVoidWorldP;
      void main() {
        vec4 wp = modelMatrix * vec4(csm_Position, 1.0);
        vVoidWorldP = wp.xyz;
        vVoidWorldN = normalize(mat3(modelMatrix) * csm_Normal);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir;
      uniform vec3 uKeyColor;
      uniform vec3 uAmbientTint;
      uniform vec3 uRimTint;
      uniform float uRimBoost;
      uniform vec3 uShadowColor;
      uniform vec3 uRimColor;
      uniform float uRimStrength;
      uniform float uSpecStrength;
      uniform float uMetalBoost;
      uniform vec3 uEmiColor;
      uniform float uEmiIntensity;
      varying vec3 vVoidWorldN;
      varying vec3 vVoidWorldP;
      void main() {
        vec3 N = normalize(vVoidWorldN);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vVoidWorldP);
        vec3 L = normalize(uLightDir);
        vec3 albedo = csm_DiffuseColor.rgb;
        float ndl = dot(N, L);
        float lit = smoothstep(-0.04, 0.08, ndl);
        float deepSh = smoothstep(-0.65, -0.22, ndl);
        vec3 sh = albedo * uShadowColor;
        vec3 col = mix(sh * vec3(0.76, 0.72, 0.84), sh, deepSh);
        col = mix(col, albedo * uKeyColor, lit);
        col += albedo * uAmbientTint * (0.08 + 0.07 * (N.y * 0.5 + 0.5));
        vec3 H = normalize(L + V);
        float spec = smoothstep(0.92, 0.95, max(dot(N, H), 0.0)) * uSpecStrength * mix(1.0, 2.1, uMetalBoost) * lit;
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        float rim = smoothstep(0.40, 0.64, fresnel) * uRimStrength * uRimBoost * smoothstep(-0.25, 0.35, ndl * 0.55 + 0.45);
        col += vec3(spec) + (uRimColor * uRimTint) * rim + uEmiColor * uEmiIntensity;
        csm_FragColor = vec4(col, csm_DiffuseColor.a);
      }
    `,
  });
}

function buildWeldedHullGeo(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = src.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  if (!pos) return geo;
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const count = pos.count;
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const k = `${Math.round(pos.getX(i) * 1500)},${Math.round(pos.getY(i) * 1500)},${Math.round(pos.getZ(i) * 1500)}`;
    let arr = buckets.get(k);
    if (!arr) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push(i);
  }
  const outN = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (const idxs of buckets.values()) {
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

/** Convert all meshes in any loaded Object3D into Voidmetric's cel-shaded `ANIME_LIGHT`-synced materials. */
export function applyAnimeCelToObject(
  obj: THREE.Object3D,
  opts: AnimeGLBOpts = {}
): { meshes: THREE.Mesh[]; skinnedMeshes: THREE.SkinnedMesh[]; bones: Record<string, THREE.Bone> } {
  const meshes: THREE.Mesh[] = [];
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const bones: Record<string, THREE.Bone> = {};
  const outlineW = opts.outlineWidth ?? 0.0045;
  const outlineCol = opts.outlineColor ?? "#13091d";
  const hullList: Array<{ parent: THREE.Mesh; geo: THREE.BufferGeometry }> = [];

  obj.traverse((node) => {
    if ((node as THREE.Bone).isBone) {
      bones[node.name] = node as THREE.Bone;
    }
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const std = srcMat as THREE.MeshStandardMaterial | undefined;

    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      mesh.material = buildSkinnedAnimeCSM(srcMat, opts);
      skinnedMeshes.push(mesh as THREE.SkinnedMesh);
      meshes.push(mesh);
      return;
    }

    const baseCol = opts.color ?? (std?.color ? std.color.clone() : "#eceff6");
    mesh.material = makeAnimeMat({
      color: baseCol,
      map: std?.map ?? null,
      shadowColor: opts.shadowColor ?? "#6d5f88",
      rimColor: opts.rimColor ?? "#e8d8ff",
      rimStrength: opts.rimStrength ?? 0.34,
      specStrength: opts.specStrength ?? 0.16,
      metalness: opts.metalness ?? (std?.metalness ?? 0.0),
      emissive: opts.emissive ?? (std?.emissive ? std.emissive.clone() : "#000000"),
      emissiveIntensity: opts.emissiveIntensity ?? 0.0,
      side: std?.side ?? THREE.FrontSide,
      transparent: std?.transparent ?? false,
      opacity: std?.opacity ?? 1.0,
    });
    if (opts.noInkPass !== false && outlineW > 0) {
      mesh.layers.set(NOINK);
    }
    if (outlineW > 0 && mesh.geometry) {
      hullList.push({ parent: mesh, geo: mesh.geometry });
    }
    meshes.push(mesh);
  });

  for (const { parent, geo } of hullList) {
    const hull = new THREE.Mesh(buildWeldedHullGeo(geo), getHullMat(outlineW, outlineCol));
    hull.layers.set(NOINK);
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.frustumCulled = false;
    parent.add(hull);
  }

  return { meshes, skinnedMeshes, bones };
}

/**
 * Load any local/static `.glb` (from `TripoSG`, `PartCrafter`, `UniRig + Blender 4.5`, or Blender)
 * with automatic Voidmetric cel-shading, optional scale/grounding normalization, and deterministic frame stepping!
 * NOTE for Remotion `delayRender`: ALWAYS call `delayRender()` and await `loadAnimeGLB` / `bakeRapierDestruction`
 * in the OUTER Remotion React component BEFORE mounting `<ThreeCanvas>` (only mount `<ThreeCanvas>` once assets
 * are non-null, then call `continueRender(handle)`), so frame 0 renders 100% populated on the very first draw pass!
 */
export async function loadAnimeGLB(url: string, opts: AnimeGLBOpts = {}): Promise<LoadedAnimeGLB> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = new THREE.Group();
  const scene = gltf.scene;
  root.add(scene);

  const { meshes, skinnedMeshes, bones } = applyAnimeCelToObject(scene, opts);

  scene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  rawBox.getSize(size);
  rawBox.getCenter(center);

  if (opts.targetHeight && size.y > 1e-5) {
    const s = opts.targetHeight / size.y;
    scene.scale.multiplyScalar(s);
    scene.updateMatrixWorld(true);
    rawBox.setFromObject(scene);
    rawBox.getCenter(center);
  }
  const doGround = opts.groundToZero ?? Boolean(opts.targetHeight);
  const doCenter = opts.centerXZ ?? Boolean(opts.targetHeight);
  if (doCenter) {
    scene.position.x -= center.x;
    scene.position.z -= center.z;
  }
  if (doGround && Number.isFinite(rawBox.min.y)) {
    scene.position.y -= rawBox.min.y;
  }
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);

  let mixer: THREE.AnimationMixer | null = null;
  let action: THREE.AnimationAction | null = null;
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(scene);
    let clip = gltf.animations[0];
    if (typeof opts.clipNameOrIndex === "number" && gltf.animations[opts.clipNameOrIndex]) {
      clip = gltf.animations[opts.clipNameOrIndex];
    } else if (typeof opts.clipNameOrIndex === "string") {
      const found = gltf.animations.find((c) => c.name === opts.clipNameOrIndex);
      if (found) clip = found;
    }
    action = mixer.clipAction(clip);
    action.play();
  }

  return {
    root,
    scene,
    meshes,
    skinnedMeshes,
    bones,
    animations: gltf.animations ?? [],
    mixer,
    action,
    bounds,
    setFrame(f: number, fps = 30, loop = true) {
      if (!mixer || !action) return;
      const dur = Math.max(1e-4, action.getClip().duration);
      const t = Math.max(0, f) / fps;
      mixer.setTime(loop ? t % dur : Math.min(t, dur - 1e-4));
      root.updateMatrixWorld(true);
    },
    dispose() {
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt) => mt?.dispose());
        }
      });
    },
  };
}

export type MultiPartGLBRig = {
  root: THREE.Group;
  parts: LoadedAnimeGLB[];
  /** Optionally explode/separate all `PartCrafter` sub-parts radially outward starting at `explodeFrame`! */
  setExplode: (f: number, explodeFrame: number, strength?: number, fps?: number) => void;
  dispose: () => void;
};

/**
 * Load a `PartCrafter` multi-part `.glb` set (`part_00.glb`, `part_01.glb`, ...) into one aligned cel-shaded group
 * where every semantic sub-part can be individually animated, highlighted, or exploded cleanly on impact!
 */
export async function loadMultiPartGLB(urls: string[], opts: AnimeGLBOpts = {}): Promise<MultiPartGLBRig> {
  const root = new THREE.Group();
  const baseOpts: AnimeGLBOpts = { ...opts, targetHeight: undefined, groundToZero: false, centerXZ: false };
  const parts = await Promise.all(urls.map((u) => loadAnimeGLB(u, baseOpts)));
  const origPos: THREE.Vector3[] = [];
  const dirVecs: THREE.Vector3[] = [];

  for (const p of parts) root.add(p.root);
  root.updateMatrixWorld(true);
  const fullBox = new THREE.Box3().setFromObject(root);
  const fullSize = new THREE.Vector3();
  const fullCenter = new THREE.Vector3();
  fullBox.getSize(fullSize);
  fullBox.getCenter(fullCenter);

  if (opts.targetHeight && fullSize.y > 1e-5) {
    const s = opts.targetHeight / fullSize.y;
    root.scale.multiplyScalar(s);
    root.updateMatrixWorld(true);
    fullBox.setFromObject(root);
    fullBox.getCenter(fullCenter);
  }
  const doGround = opts.groundToZero ?? Boolean(opts.targetHeight);
  const doCenter = opts.centerXZ ?? Boolean(opts.targetHeight);
  for (const p of parts) {
    if (doCenter) {
      p.root.position.x -= fullCenter.x / Math.max(1e-5, root.scale.x);
      p.root.position.z -= fullCenter.z / Math.max(1e-5, root.scale.z);
    }
    if (doGround && Number.isFinite(fullBox.min.y)) {
      p.root.position.y -= fullBox.min.y / Math.max(1e-5, root.scale.y);
    }
    origPos.push(p.root.position.clone());
    const pBox = new THREE.Box3().setFromObject(p.root);
    const pCenter = new THREE.Vector3();
    pBox.getCenter(pCenter);
    const dir = pCenter.sub(fullCenter);
    if (dir.lengthSq() < 1e-5) dir.set(0, 1, 0);
    dirVecs.push(dir.normalize());
  }

  return {
    root,
    parts,
    setExplode(f: number, explodeFrame: number, strength = 1.6, fps = 30) {
      const dt = Math.max(0, (f - explodeFrame) / fps);
      const ease = 1 - Math.exp(-3.2 * dt);
      for (let i = 0; i < parts.length; i++) {
        parts[i].root.position.copy(origPos[i]).addScaledVector(dirVecs[i], ease * strength);
        parts[i].root.rotation.set(ease * (i % 2 ? 0.55 : -0.42), ease * 0.38 * ((i % 3) - 1), ease * 0.25);
      }
    },
    dispose() {
      parts.forEach((p) => p.dispose());
    },
  };
}
