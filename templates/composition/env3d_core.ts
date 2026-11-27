// Voidmetric v4.0 Pure Painted 3D Environment Primitives (ZERO Hardcoded Rooms, Sets, or Textures!)
// Author 100% custom episode-specific 3D locations & deterministic painted CanvasTextures directly inside
// your episode's `world.ts` / `sets.ts` using these 5 pure primitives.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";

/** Deterministic PRNG (use instead of Math.random() so every Remotion worker renders identical pixels!) */
export function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Paint ANY deterministic procedural sRGB CanvasTexture (wood, brick, stone, tatami, asphalt, signs, foliage, fabric, HUDs). */
export function makeEnvTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = repeatX > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Flat inked two-tone cel material (for small trim/hardware; prefer `celTex` / `makePaintedMat` for major surfaces!). */
export const cel = (color: string) => twoTone(new THREE.MeshLambertMaterial({ color }));

/** Textured inked two-tone cel material: integrates ANY CanvasTexture into Voidmetric's two-tone shadow & InkPass pipeline! */
export const celTex = (map: THREE.Texture, tint = "#ffffff") =>
  twoTone(new THREE.MeshLambertMaterial({ color: tint, map }));

/** One-call custom painted cel-shaded material factory for building bespoke textured worlds & props per episode! */
export function makePaintedMat(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeatX?: number; repeatY?: number; tint?: string } = {}
): THREE.MeshLambertMaterial {
  const tex = makeEnvTex(w, h, draw, opts.repeatX ?? 1, opts.repeatY ?? 1);
  return celTex(tex, opts.tint ?? "#ffffff");
}
