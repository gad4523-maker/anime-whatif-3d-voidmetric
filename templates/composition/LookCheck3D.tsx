// 16-Frame Full-Short Visual Look-Check Sampler (Zero-Clipping 9:16 Framing & Subtitle Gate)
// Replace LOOK_FRAMES with 16 key frames covering EVERY shot + widest raised-arm/pan extremes before full 2K render!
import React from "react";
import { useCurrentFrame } from "remotion";
import { EpisodeShort } from "./EpisodeShort";

export const LOOK_FRAMES = [
  30, 90, 210, 330,
  450, 570, 690, 810,
  930, 1050, 1170, 1290,
  1410, 1530, 1650, 1770,
];

export const LookCheck3D: React.FC = () => {
  const f = useCurrentFrame();
  const target = LOOK_FRAMES[Math.max(0, Math.min(LOOK_FRAMES.length - 1, f))];
  return <EpisodeShort frameOverride={target} />;
};
