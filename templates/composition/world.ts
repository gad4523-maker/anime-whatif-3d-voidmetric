// Starter 3D World + Bone-Locked GLSL VFX Orchestrator (customize zones, props & shaders per episode!)
import * as THREE from "three";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { EPISODE_LIGHTS, EpisodeLightName } from "./lights";
import { FPS, Z_HOME, Z_VOID, camAt, lightForShot } from "./story";
import { EpisodeCast } from "./cast";
import { ANIME_LIGHT } from "./rig3d_core";
import { HakaiOrb3D } from "./vfx3d";

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
  private fog = new THREE.Fog("#b8d0ec", 26, 320);
  private handOrb: HakaiOrb3D;

  constructor() {
    this.cast = new EpisodeCast(this.root);

    this.skyU = {
      c0: { value: new THREE.Color() },
      c1: { value: new THREE.Color() },
      c2: { value: new THREE.Color() },
      c3: { value: new THREE.Color() },
      c4: { value: new THREE.Color() },
      e: { value: [0, 4, 10, 22, 45] },
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
          float deg = degrees(asin(clamp(vDir.y, -1.0, 1.0)));
          vec3 col = mix(c0, c1, smoothstep(e[0], e[1], deg));
          col = mix(col, c2, smoothstep(e[1], e[2], deg));
          col = mix(col, c3, smoothstep(e[2], e[3], deg));
          col = mix(col, c4, smoothstep(e[3], e[4], deg));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(650, 28, 18), skyMat);
    this.sky.layers.set(NOINK);
    this.root.add(this.sky);

    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.6);
    this.root.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.root.add(this.sun);
    this.root.add(this.sun.target);

    const floorHome = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 16), twoTone(new THREE.MeshLambertMaterial({ color: "#caa47a" })));
    floorHome.position.set(Z_HOME, -0.2, 0);
    floorHome.receiveShadow = true;
    this.root.add(floorHome);

    const floorVoid = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 24), twoTone(new THREE.MeshLambertMaterial({ color: "#1c1032" })));
    floorVoid.position.set(Z_VOID, -0.2, 0);
    floorVoid.receiveShadow = true;
    this.root.add(floorVoid);

    // Bone-locked 3D GLSL energy orb (tracks MC/Guest hand bones in real time!)
    this.handOrb = new HakaiOrb3D(0.18);
    this.root.add(this.handOrb.group);
  }

  private applyLight(name: EpisodeLightName, cam: THREE.PerspectiveCamera, look: THREE.Vector3, scene: THREE.Scene) {
    const L = EPISODE_LIGHTS[name];
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
    scene.fog = name === "space" ? null : this.fog;

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
    return L;
  }

  update(shotId: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS;
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

    // 1) Update 3D rigs FIRST & refresh world matrices so VFX lock onto REAL 3D hand bones!
    this.cast.update(shotId, f, cam, L.actorShadow);
    this.root.updateMatrixWorld(true);

    // 2) Bone-locked VFX attachment example (tracks MC left wrist in shot 1, Guest right fingertip in shot 2!)
    const targetBone = shotId === 1 ? this.cast.mc.joints.wristL : this.cast.guest.handR.fingers[1][1];
    const worldPos = new THREE.Vector3(0, -0.05, 0);
    targetBone.localToWorld(worldPos);
    const toCam = new THREE.Vector3().subVectors(cam.position, worldPos).normalize();
    worldPos.addScaledVector(toCam, 0.13);
    worldPos.y += 0.16;
    this.handOrb.group.position.copy(worldPos);
    this.handOrb.update(t, 1.0, 0.65);

    return look;
  }
}
