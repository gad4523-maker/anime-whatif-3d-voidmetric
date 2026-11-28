// Voidmetric v4.2 Chromatic Screen-Space Ambient Occlusion Wrapper (`n8ao` CC0 1.0 Public Domain!)
// Grounds anime characters, rooms, alleyways & bespoke 3D props with chromatic plum/violet crevice shadows
// while staying 100% compatible with `pmndrs/postprocessing` EffectComposer & Remotion rendering!
import * as THREE from "three";
import { N8AOPostPass } from "n8ao";

export type ChromaticAOOpts = {
  /** AO sample radius in meters (default 0.85 — crisp architectural crevices & character contact shadows) */
  aoRadius?: number;
  /** AO darkening intensity (default 1.35 — subtle painted anime depth without muddying bright cel shadows!) */
  intensity?: number;
  /** Chromatic AO shadow tint (NEVER flat dead black — deep plum/indigo `#22183a` keeps mromidev colorful shadows!) */
  color?: THREE.ColorRepresentation;
  /** Half-resolution pass for blazing speed on both Cloud CPU swangle & 2K GPU (default true) */
  halfRes?: boolean;
  /** Screen-space denoise radius (default 4) */
  denoiseRadius?: number;
};

/**
 * Creates a deterministic, anime-tinted `N8AOPostPass` ready to insert into `<EffectComposer>`
 * right BEFORE `InkPass` or `LensBlur`!
 */
export function createChromaticAO(
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: ChromaticAOOpts = {}
): N8AOPostPass {
  const pass = new N8AOPostPass(scene, camera, 1080, 1920);
  const cfg = pass.configuration;
  cfg.aoRadius = opts.aoRadius ?? 0.85;
  cfg.distanceFalloff = 1.0;
  cfg.intensity = opts.intensity ?? 1.35;
  cfg.color = new THREE.Color(opts.color ?? "#22183a");
  cfg.halfRes = opts.halfRes ?? true;
  cfg.denoiseSamples = 6;
  cfg.denoiseRadius = opts.denoiseRadius ?? 4;
  cfg.aoSamples = 12;
  return pass;
}
