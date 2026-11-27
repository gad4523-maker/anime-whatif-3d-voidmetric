// Voidmetric Anime What-If 3D Short — Remotion + Three.js Composition Template
// Exact mromidev post-processing chain:
//   InkPass (world layer 0 only) -> LensBlur.pre -> LensBlur.main -> 6-level HDR Mipmap BloomEffect ->
//   ToneMappingEffect(NEUTRAL) -> GradeEffect (MSAA 4, resolution-scaled for 540p LookCheck, 1080p, AND native 2K 1440x2560!).
//
// Register BOTH compositions in src/Root.tsx:
//   - `<EpisodeShort>`   at 1080x1920 @ 30 fps (preview)
//   - `<EpisodeShort2K>` at 1440x2560 @ 30 fps (NATIVE 2K master — NEVER use --scale 1.3333!)
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect } from "../bridge/grade";
import { EPISODE_LIGHTS } from "./lights";
import { EpisodeWorld } from "./world";
import { TOTAL, layersAt, flashAt, dofAt, lightForShot } from "./story";
import { SubtitlesOverlay } from "./Subtitles";

export const EPISODE_FRAMES = TOTAL;

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
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {
        color: "#08060e",
        widthNear: 4.2,
        widthFar: 2.8,
        creaseScale: 0.78,
      }),
      lens: new LensBlur({ maxCoC: 20, nearScale: 1.15 }),
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(EPISODE_LIGHTS.morning.grade, 1.0),
    }),
    [camera, scene]
  );

  // IMPORTANT: Never put dispose={null} on <primitive object={fx.ink} /> (shadows InkPass.prototype.dispose)!
  useEffect(
    () => () => {
      if (typeof fx.ink.dispose === "function") fx.ink.dispose();
      else InkPass.prototype.dispose.call(fx.ink);
      if (typeof fx.lens.dispose === "function") fx.lens.dispose();
    },
    [fx]
  );

  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);

  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  const focusDist = d.focusDist ?? Math.max(0.4, target.clone().sub(cam.position).dot(fwd));
  fx.lens.focus = focusDist;
  fx.lens.cInf = d.cInf;

  const lName = lightForShot(id, f);
  fx.grade.set(EPISODE_LIGHTS[lName].grade);

  const passes = useMemo(
    () => [
      <primitive key="ink" object={fx.ink} />,
      <primitive key="pre" object={fx.lens.pre} />,
      <primitive key="lens" object={fx.lens.main} />,
      <primitive key="bloom" object={fx.bloom} />,
      <primitive key="tone" object={fx.tone} />,
      <primitive key="grade" object={fx.grade} />,
    ],
    [fx]
  );

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>{passes}</EffectComposer>
    </>
  );
};

const ShotView: React.FC<{ id: number; alpha: number; frame: number }> = ({ id, alpha, frame }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: alpha }}>
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

export const EpisodeShort: React.FC<{ frameOverride?: number }> = ({ frameOverride }) => {
  const curF = useCurrentFrame();
  const f = frameOverride ?? curF;
  const fl = flashAt(f);
  return (
    <AbsoluteFill style={{ background: "#0b0618" }}>
      {layersAt(f).map((l, i) => (
        <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} frame={f} />
      ))}
      {fl.alpha > 0.01 && <AbsoluteFill style={{ background: fl.color, opacity: fl.alpha }} />}
      <SubtitlesOverlay frameOverride={f} />
    </AbsoluteFill>
  );
};
