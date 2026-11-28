// Voidmetric v4.1 Anime What-If 3D Short — Remotion + Three.js + 35mm Optical Finishing & Sakuga Composition!
// Post-processing chain:
//   InkPass (world layer 0 only) -> LensBlur.pre -> LensBlur.main -> 6-level HDR Mipmap BloomEffect ->
//   WhipBlur (16-tap directional blur on fast whip pans) -> ToneMappingEffect(NEUTRAL) -> GradeEffect ->
//   FilmOpticsEffect (3-scale 35mm halation, corner CA, C1 tanh shoulder, ragged shockwave ring, film grain) ->
//   Sakuga Impact Frames / Kanada Wedges / Angular Kite-Bolts -> Karaoke Subtitles!
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { WhipBlur } from "../bridge/whipblur";
import { GradeEffect } from "../bridge/grade";
import { FilmOpticsEffect } from "../bridge/filmoptics";
import { KuwaharaEffect } from "../bridge/kuwahara";
import { createChromaticAO } from "../bridge/ao";
import { getEpisodeLight } from "./lights";
import { EpisodeWorld } from "./world";
import {
  HIT_STOPS,
  IMPACT_FRAMES,
  KITE_BOLTS,
  SPEEDLINES,
  TOTAL,
  USE_CHROMAO,
  camAt,
  dofAt,
  flashAt,
  kuwaharaAt,
  layersAt,
  lightForShot,
  shockwaveAt,
} from "./story";
import { computeWhipVelUV } from "./cam3d_core";
import { SakugaOverlay, applyHitStop, impactFilterAt } from "./sakuga_fx";
import { SubtitlesOverlay } from "./Subtitles";

export const EPISODE_FRAMES = TOTAL;

// MSAA: MUST be >= 2 when LensBlur is active (postprocessing v6 shares depth buffer at MSAA=0 causing WebGL2 black-screen!).
// Use 2 on CPU-only cloud sandboxes (Gemini Tasks swangle), 4 on Local PC GPU (Voidmetric PC Render Studio)!
const EFFECT_MSAA = {{MSAA_SAMPLES}};

const makeBloom = () => {
  const b = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: 0.62,
    luminanceThreshold: 1.0,
    luminanceSmoothing: 0.18,
    mipmapBlur: true,
    levels: 6,
    radius: 0.64,
  });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3();

const Inner: React.FC<{ id: number; frame: number }> = ({ id, frame: f }) => {
  const { camera, scene } = useThree();
  const world = useMemo(() => new EpisodeWorld(), []);

  const fx = useMemo(
    () => ({
      ao: USE_CHROMAO ? createChromaticAO(scene, camera, { aoRadius: 0.85, intensity: 1.35, color: "#22183a", halfRes: true }) : null,
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {
        color: "#05040a",
        widthNear: 4.6,
        widthFar: 2.9,
        creaseScale: 0.78,
      }),
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
      bloom: makeBloom(),
      whip: new WhipBlur(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(getEpisodeLight("base").grade, 1.0),
      kuwahara: new KuwaharaEffect({ strength: 0.0, radius: 3.0 }),
      optics: new FilmOpticsEffect({
        halationAmount: 0.20,
        halationTint: "#ffdfc2",
        cornerCA: 0.85,
        blackLift: 0.012,
        grainAmount: 0.014,
        grainCellPx: 1.5,
      }),
    }),
    [camera, scene]
  );

  // IMPORTANT: Never put dispose={null} on <primitive object={fx.ink} /> (shadows InkPass.prototype.dispose)!
  useEffect(
    () => () => {
      if (fx.ao && typeof fx.ao.dispose === "function") fx.ao.dispose();
      if (typeof fx.ink.dispose === "function") fx.ink.dispose();
      else InkPass.prototype.dispose.call(fx.ink);
      if (typeof fx.lens.dispose === "function") fx.lens.dispose();
      if (typeof fx.whip.dispose === "function") fx.whip.dispose();
      if (typeof fx.kuwahara.dispose === "function") fx.kuwahara.dispose();
      if (typeof fx.optics.dispose === "function") fx.optics.dispose();
    },
    [fx]
  );

  const cam = camera as THREE.PerspectiveCamera;
  const animF = applyHitStop(f, HIT_STOPS);
  const target = world.update(id, animF, cam, scene);

  const d = dofAt(id, animF);
  cam.getWorldDirection(fwd);
  const focusDist = d.focusDist ?? Math.max(0.4, target.clone().sub(cam.position).dot(fwd));
  fx.lens.focus = focusDist;
  fx.lens.cInf = d.cInf;

  // Automatic 16-tap directional motion blur during fast whip pans (zero cost on normal glides!)
  const [wx, wy] = computeWhipVelUV(camAt(id, animF), camAt(id, animF + 1));
  fx.whip.vel.set(wx, wy);

  const lName = lightForShot(id, animF);
  fx.grade.set(getEpisodeLight(lName).grade);
  const kuw = kuwaharaAt(f);
  fx.kuwahara.strength = kuw.strength;
  fx.kuwahara.radius = kuw.radius;
  fx.optics.seed = f;
  fx.optics.setShockwave(shockwaveAt(f));

  const passes = useMemo(
    () => [
      ...(fx.ao ? [<primitive key="ao" object={fx.ao} />] : []),
      <primitive key="ink" object={fx.ink} />,
      <primitive key="pre" object={fx.lens.pre} />,
      <primitive key="lens" object={fx.lens.main} />,
      <primitive key="bloom" object={fx.bloom} />,
      <primitive key="whip" object={fx.whip} />,
      <primitive key="tone" object={fx.tone} />,
      <primitive key="grade" object={fx.grade} />,
      <primitive key="kuwahara" object={fx.kuwahara} />,
      <primitive key="optics" object={fx.optics} />,
    ],
    [fx]
  );

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={EFFECT_MSAA}>{passes}</EffectComposer>
    </>
  );
};

const ShotView: React.FC<{ id: number; alpha: number; frame: number; filter: string }> = ({ id, alpha, frame, filter }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: alpha, filter }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.12, far: 1200 }}
      >
        <Inner id={id} frame={frame} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const EpisodeShort: React.FC<{ frameOverride?: number; hideSubtitles?: boolean }> = ({
  frameOverride,
  hideSubtitles = false,
}) => {
  const curF = useCurrentFrame();
  const f = frameOverride ?? curF;
  const fl = flashAt(f);
  const imp = impactFilterAt(f, IMPACT_FRAMES);
  return (
    <AbsoluteFill style={{ background: "#0b0618" }}>
      {layersAt(f).map((l, i) => (
        <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} frame={f} filter={imp.filter} />
      ))}
      <SakugaOverlay frame={f} impacts={IMPACT_FRAMES} speedlines={SPEEDLINES} kiteBolts={KITE_BOLTS} flash={fl} />
      {!hideSubtitles && <SubtitlesOverlay frameOverride={f} />}
    </AbsoluteFill>
  );
};

// Clean 1-frame subtitle-free hero cover thumbnail (customize thumbFrame to the peak visual hook frame!)
export const EpisodeThumb: React.FC<{ thumbFrame?: number }> = ({ thumbFrame = 205 }) => (
  <EpisodeShort frameOverride={thumbFrame} hideSubtitles />
);
