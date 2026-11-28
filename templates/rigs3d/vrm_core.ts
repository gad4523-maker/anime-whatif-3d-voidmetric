// Voidmetric v4.3 Optional Studio `.vrm` + `.vrma` Anime Avatar & Motion Loader (`@pixiv/three-vrm` MIT)
// Allows any episode to drop in a VRoid Studio / VRM 0.x / 1.0 character rig + `.vrma` motion clip
// with 100% deterministic Remotion frame stepping (`stepVrmToFrame`) alongside our procedural `rig3d_core.ts`!
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRMAnimation, VRMAnimationLoaderPlugin, createVRMAnimationClip } from "@pixiv/three-vrm-animation";

export type LoadedVRM = {
  vrm: VRM;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  /** Deterministically evaluate animation + spring-bone physics at exact frame `f`! */
  setFrame: (f: number, fps?: number, springSubsteps?: number) => void;
  setExpression: (name: string, weight: number) => void;
  playVrma: (anim: VRMAnimation) => THREE.AnimationAction;
};

/** Load any `.vrm` studio anime rig (from `public/` via Remotion `staticFile(...)`) with MToon + SpringBone support! */
export async function loadVRMCharacter(url: string): Promise<LoadedVRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  vrm.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
    }
  });
  const mixer = new THREE.AnimationMixer(vrm.scene);
  let lastSteppedFrame = -1;

  return {
    vrm,
    root: vrm.scene,
    mixer,
    setExpression(name: string, weight: number) {
      vrm.expressionManager?.setValue(name, Math.max(0, Math.min(1, weight)));
    },
    playVrma(anim: VRMAnimation) {
      const clip = createVRMAnimationClip(anim, vrm);
      const act = mixer.clipAction(clip);
      act.play();
      return act;
    },
    setFrame(f: number, fps = 30, springSubsteps = 12) {
      const targetFrame = Math.max(0, Math.round(f));
      const dt = 1 / fps;
      mixer.setTime(targetFrame * dt);
      // If scrubbing non-sequentially (e.g. Remotion parallel worker jump), reset & warm-step spring bones deterministically!
      if (targetFrame !== lastSteppedFrame + 1) {
        vrm.springBoneManager?.reset();
        const startF = Math.max(0, targetFrame - springSubsteps);
        for (let k = startF; k <= targetFrame; k++) {
          mixer.setTime(k * dt);
          vrm.update(dt);
        }
      } else {
        vrm.update(dt);
      }
      lastSteppedFrame = targetFrame;
    },
  };
}

/** Load any `.vrma` humanoid animation clip compatible with `@pixiv/three-vrm`! */
export async function loadVRMAnimation(url: string): Promise<VRMAnimation | null> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const list = gltf.userData.vrmAnimations as VRMAnimation[] | undefined;
  return list?.[0] ?? null;
}
