// Voidmetric v3.0 Anime Sakuga Impact-Frame, Radial Speedlines, Chromatic Shock & Hit-Stop Engine!
// Pure deterministic React/SVG screen-space layer: zero extra WebGL passes, 100% compatible with both
// `cloud-1080p` CPU swangle AND `local-2k` GPU renders!
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

export type ImpactFrameCue = {
  /** Frame where impact begins */
  f: number;
  /** Duration in frames (recommended 2..4 frames for authentic anime sakuga!) */
  dur: number;
  /** Visual style: "bw_invert" (classic MAPPA/DBZ negative flash), "bw_noir" (high-contrast ink), "accent" (monochrome accent tint) */
  style?: "bw_invert" | "bw_noir" | "accent";
  accentColor?: string;
};

export type SpeedlineCue = {
  /** Start frame (inclusive) */
  a: number;
  /** End frame (exclusive) */
  b: number;
  /** Intensity 0..1 */
  intensity?: number;
  /** Line color (default crisp anime white `#ffffff` or dark ink `#0c0618`) */
  color?: string;
  /** Focal center in normalized screen coords (default `[0.5, 0.48]`) */
  center?: [number, number];
  /** Inner clear radius fraction so character face stays 100% unobstructed (default 0.30) */
  innerRadius?: number;
};

export type HitStopCue = {
  /** Start frame of impact freeze */
  f: number;
  /** Freeze length in frames (3..5 frames gives classic anime combat hit weight!) */
  dur: number;
};

/**
 * Deterministic Anime Hit-Stop Freeze Helper:
 * Returns a remapped animation frame `animFrame` that holds character/VFX motion cleanly for `dur` frames
 * right on impact while camera shake & Sakuga Impact Frames still fire at full 30 fps!
 */
export function applyHitStop(f: number, stops: HitStopCue[]): number {
  let shift = 0;
  for (const st of stops) {
    if (f >= st.f && f < st.f + st.dur) {
      return st.f - shift;
    }
    if (f >= st.f + st.dur) {
      shift += st.dur;
    }
  }
  return Math.max(0, f - shift);
}

/** Returns active CSS filter for true 2-4 frame anime B&W / inverted Sakuga Impact Frames! */
export function impactFilterAt(f: number, cues: ImpactFrameCue[]): { filter: string; tint?: string; active: boolean } {
  for (const c of cues) {
    if (f >= c.f && f < c.f + c.dur) {
      const idx = f - c.f;
      if (c.style === "bw_noir") {
        return { filter: "grayscale(1) contrast(4.2) brightness(1.15)", active: true };
      }
      if (c.style === "accent") {
        return { filter: "grayscale(1) contrast(3.6) brightness(1.08)", tint: c.accentColor ?? "#ff2e63", active: true };
      }
      // Classic alternating MAPPA/DBZ sakuga: frame 0 stark high-contrast B&W invert -> frame 1 stark B&W ink!
      return idx % 2 === 0
        ? { filter: "grayscale(1) contrast(6.5) invert(1) brightness(1.02)", active: true }
        : { filter: "grayscale(1) contrast(6.5) brightness(1.12)", active: true };
    }
  }
  return { filter: "none", active: false };
}

/** Deterministic SVG Radial Manga/Anime Speedlines Overlay (12 fps stepped sakuga jitter, clear center face zone!) */
export const SakugaOverlay: React.FC<{
  frame: number;
  impacts?: ImpactFrameCue[];
  speedlines?: SpeedlineCue[];
  flash?: { alpha: number; color: string };
}> = ({ frame: f, impacts = [], speedlines = [], flash }) => {
  const { width, height } = useVideoConfig();
  const imp = impactFilterAt(f, impacts);
  const activeSpeed = speedlines.find((s) => f >= s.a && f < s.b);

  // Build deterministic 12 fps stepped radial manga speedlines when active
  let speedSvg: React.ReactNode = null;
  if (activeSpeed) {
    const cx = (activeSpeed.center?.[0] ?? 0.5) * width;
    const cy = (activeSpeed.center?.[1] ?? 0.48) * height;
    const maxR = Math.hypot(width, height) * 0.72;
    const baseInner = (activeSpeed.innerRadius ?? 0.30) * Math.min(width, height);
    const step = Math.floor(f / 2.5); // crisp 12 fps anime sakuga cadence!
    const col = activeSpeed.color ?? "#ffffff";
    const alpha = Math.max(0, Math.min(1, activeSpeed.intensity ?? 0.72));
    const count = 52;
    const polys: React.ReactNode[] = [];

    for (let i = 0; i < count; i++) {
      const h = (k: number) => {
        const v = Math.sin((i + 1) * 91.3 + step * 37.7 + k * 173.1) * 43758.5453;
        return v - Math.floor(v);
      };
      const ang = (i / count) * Math.PI * 2 + (h(1) - 0.5) * 0.055;
      const rIn = baseInner * (0.84 + h(2) * 0.48);
      const halfSpread = (0.008 + h(3) * 0.016) * (0.7 + alpha * 0.5);
      const x0 = cx + Math.cos(ang) * rIn;
      const y0 = cy + Math.sin(ang) * rIn;
      const x1 = cx + Math.cos(ang - halfSpread) * maxR;
      const y1 = cy + Math.sin(ang - halfSpread) * maxR;
      const x2 = cx + Math.cos(ang + halfSpread) * maxR;
      const y2 = cy + Math.sin(ang + halfSpread) * maxR;
      polys.push(
        <polygon
          key={i}
          points={`${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`}
          fill={col}
          fillOpacity={(0.28 + h(4) * 0.52) * alpha}
        />
      );
    }

    speedSvg = (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 32 }}
      >
        {polys}
      </svg>
    );
  }

  return (
    <>
      {speedSvg}
      {imp.active && imp.tint && (
        <AbsoluteFill
          style={{
            background: imp.tint,
            mixBlendMode: "multiply",
            opacity: 0.45,
            pointerEvents: "none",
            zIndex: 35,
          }}
        />
      )}
      {!imp.active && flash && flash.alpha > 0.01 && (
        <AbsoluteFill
          style={{
            background: flash.color,
            opacity: flash.alpha,
            pointerEvents: "none",
            zIndex: 38,
          }}
        />
      )}
    </>
  );
};
