// 16-Frame Full-Short Visual Look-Check Sampler (Zero-Clipping 9:16 Framing & Subtitle Gate)
// Replace LOOK_FRAMES with 16 key frames covering EVERY shot + widest raised-arm/pan extremes before full 2K render!
import React from "react";
import { useCurrentFrame } from "remotion";
import { EpisodeShort } from "./EpisodeShort";

export const LOOK_FRAMES = [
  30, 90, 210, 335,
  430, 570, 655, 865,
  970, 1095, 1315, 1474,
  1580, 1700, 1835, 1885,
];

export const LookCheck3D: React.FC = () => {
  const f = useCurrentFrame();
  const target = LOOK_FRAMES[Math.max(0, Math.min(LOOK_FRAMES.length - 1, f))];
  return <EpisodeShort frameOverride={target} />;
};
