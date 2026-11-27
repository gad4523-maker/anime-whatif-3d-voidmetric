// Voidmetric v4.0 Custom-Only Painted 3D World & Bespoke VFX Starter (ZERO Hardcoded Rooms or VFX Presets!)
// Build EVERY location, painted texture (`makePaintedMat`/`makeEnvTex`/`hash01`), custom lighting mood (`makeLightPreset`),
// and bespoke 3D shader/particle effect (`createCustomVFXMat`/`NOISE_GLSL`/`setNoInkTree`/`getGlowSpriteTex`) uniquely for each episode!
import * as THREE from "three";
import { TONE, CHAR, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { EpisodeLightName, getEpisodeLight } from "./lights";
import { FPS, Z_STAGE_A, Z_STAGE_B, camAt, lightForShot } from "./story";
import { EpisodeCast } from "./cast";
import { ANIME_LIGHT } from "./rig3d_core";
import { hash01, makePaintedMat } from "./env3d_core";

const rad = (d: number) => (d * Math.PI) / 180;

export class EpisodeWorld {
  root = new THREE.Group();
  private cast: EpisodeCast;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private skyU: {
    c0: THREE.IUniform<THREE.Color>;
    c1: THREE.IUniform<THREE.Color>;
    c2: THREE.IUniform<THREE.Color>;
    c3: THREE.IUniform<THREE.Color>;
    c4: THREE.IUniform<THREE.Color>;
    e: THREE.IUniform<number[]>;
    sunDir: THREE.IUniform<THREE.Vector3>;
    sunDisc: THREE.IUniform<THREE.Color>;
  };
  private fog = new THREE.Fog("#d0e6fc", 24, 280);

  constructor() {
    this.cast = new EpisodeCast(this.root);

    this.skyU = {
      c0: { value: new THREE.Color() },
      c1: { value: new THREE.Color() },
      c2: { value: new THREE.Color() },
      c3: { value: new THREE.Color() },
      c4: { value: new THREE.Color() },
      e: { value: [0, 3, 7, 14, 26] },
      sunDir: { value: new THREE.Vector3(0.4, 0.7, 0.5) },
      sunDisc: { value: new THREE.Color("#000000") },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyU,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 c0, c1, c2, c3, c4, sunDir, sunDisc; uniform float e[5]; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float deg = degrees(asin(clamp(d.y, -1.0, 1.0)));
          vec3 col = mix(c0, c1, smoothstep(e[0], e[1], deg));
          col = mix(col, c2, smoothstep(e[1], e[2], deg));
          col = mix(col, c3, smoothstep(e[2], e[3], deg));
          col = mix(col, c4, smoothstep(e[3], e[4], deg));
          float sunLum = dot(sunDisc, vec3(0.299, 0.587, 0.114));
          if (sunLum > 0.01) {
            float mu = max(dot(d, normalize(sunDir)), 0.0);
            float halo = pow(mu, 14.0) * 0.44 + pow(mu, 64.0) * 0.55;
            float disc = smoothstep(0.9964, 0.9986, mu);
            col += sunDisc * halo + sunDisc * disc * 2.15;
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(650, 28, 18), skyMat);
    this.sky.layers.set(NOINK);
    this.root.add(this.sky);

    this.hemi = new THREE.HemisphereLight("#e2f0ff", "#baa282", 0.64);
    this.root.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff4df", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.root.add(this.sun);
    this.root.add(this.sun.target);

    // Minimal painted ground pads for the blank scaffold — replace completely with your episode's custom 3D sets!
    const mStarterGround = makePaintedMat(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = "#dfd7ca";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 420; i++) {
          ctx.fillStyle = i % 2 ? "rgba(255,252,246,0.16)" : "rgba(128,114,98,0.10)";
          ctx.fillRect(hash01(i * 7 + 1) * w, hash01(i * 11 + 3) * h, 18, 10);
        }
      },
      { repeatX: 4, repeatY: 4 }
    );
    for (const zx of [Z_STAGE_A, Z_STAGE_B]) {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 16), mStarterGround);
      ground.position.set(zx, -0.2, 0);
      ground.receiveShadow = true;
      this.root.add(ground);
    }
  }

  private applyLight(name: EpisodeLightName, cam: THREE.PerspectiveCamera, look: THREE.Vector3, scene: THREE.Scene) {
    const L = getEpisodeLight(name);
    TONE.uLitCol.value.set(...L.lit);
    TONE.uShadeCol.value.set(...L.shade);
    TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert;
    TONE.uSideK.value = L.sideK;
    TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...L.bounce);
    TONE.uSat.value = L.sat;
    CHAR.uCharTint.value.set(...L.charTint);
    CHAR.uCharShade.value = L.charShade;
    CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad;
    CHAR.uSideTint.value.set(...L.sideTint);
    untone(L.skyStops.c[0], this.skyU.c0.value);
    untone(L.skyStops.c[1], this.skyU.c1.value);
    untone(L.skyStops.c[2], this.skyU.c2.value);
    untone(L.skyStops.c[3], this.skyU.c3.value);
    untone(L.skyStops.c[4], this.skyU.c4.value);
    this.skyU.e.value = L.skyStops.e;
    untone(L.sunDisc, this.skyU.sunDisc.value);
    untone(L.fog, this.fog.color);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    scene.fog = L.fogFar > 0 ? this.fog : null;

    const fwd = new THREE.Vector3().subVectors(look, cam.position);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const az = rad(L.az), el = rad(L.el);
    const sDir = new THREE.Vector3()
      .addScaledVector(fwd, Math.cos(az) * Math.cos(el))
      .addScaledVector(right, Math.sin(az) * Math.cos(el))
      .setY(Math.sin(el))
      .normalize();
    this.skyU.sunDir.value.copy(sDir);
    this.sun.position.copy(look).addScaledVector(sDir, 36);
    this.sun.target.position.copy(look);
    this.sun.color.set(L.sunCol);
    this.sun.intensity = L.sunI;
    this.hemi.color.set(L.sky);
    this.hemi.groundColor.set(L.ground);
    this.hemi.intensity = L.hemiI;

    const toCam = new THREE.Vector3().subVectors(cam.position, look).normalize();
    const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toCam).normalize();
    const heroLight = toCam.clone().multiplyScalar(0.72).addScaledVector(camRight, 0.46).add(new THREE.Vector3(0, 0.56, 0)).normalize();
    ANIME_LIGHT.uLightDir.value.copy(sDir).lerp(heroLight, 0.72).normalize();
    ANIME_LIGHT.uKeyColor.value.setRGB(...L.charTint);
    ANIME_LIGHT.uAmbientTint.value.setRGB(...L.charAmbient);
    ANIME_LIGHT.uRimTint.value.set(L.charRimTint);
    ANIME_LIGHT.uRimBoost.value = L.charRimBoost;
    return L;
  }

  update(shotId: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const _t = f / FPS;
    const C = camAt(shotId, f);
    cam.position.set(...C.pos);
    cam.up.set(0, 1, 0);
    const look = new THREE.Vector3(...C.look);
    cam.lookAt(look);
    cam.rotateZ(C.roll);
    cam.fov = C.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    this.sky.position.copy(cam.position);
    const L = this.applyLight(lightForShot(shotId, f), cam, look, scene);
    this.cast.update(shotId, f, cam, L.actorShadow);
    this.root.updateMatrixWorld(true);
    return look;
  }
}
