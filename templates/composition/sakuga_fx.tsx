// Voidmetric v4.1 Anime Sakuga Impact-Frame, Kanada Radial Wedges, Angular Kite-Bolts & Hit-Stop Engine!
// Pure deterministic React/SVG screen-space primitives: zero hardcoded character attacks, zero extra WebGL passes,
// 100% compatible with both `cloud-1080p` CPU swangle AND `local-2k` GPU renders!
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

export type ImpactFrameCue = {
  /** Frame where impact begins */
  f: number;
  /** Duration in frames (recommended 2..4 frames for authentic anime sakuga!) */
  dur: number;
  /** Visual style: "bw_invert" (classic negative flash), "bw_noir" (high-contrast ink), "accent" (monochrome accent tint) */
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
  /** "kanada_wedges" (default — clumped, unequal straight-sided Kanada impact wedges!) or "classic" */
  style?: "kanada_wedges" | "classic";
  /** Clump probability 0..1 for Kanada wedges (default 0.62) */
  clump?: number;
};

export type KiteBoltCue = {
  /** Start frame (inclusive) */
  a: number;
  /** End frame (exclusive) */
  b: number;
  /** Focal origin in normalized screen coords `[0..1, 0..1]` */
  center: [number, number];
  /** Number of angular radiating kite-bolt trees (default 10) */
  count?: number;
  /** Reach fraction of screen height (default 0.48) */
  reach?: number;
  /** Primary inner core color (e.g. `#08040d` black flash OR `#ffffff` white lightning) */
  coreColor?: string;
  /** Jagged outer rim color (e.g. `#f0142e` crimson OR `#38d8ff` electric cyan) */
  rimColor?: string;
  /** Crisp off-center hairline highlight color (default `#fff8f2`) */
  hairlineColor?: string;
  /** Optional angular flying debris shards count (default 18) */
  shards?: number;
  /** Deterministic seed */
  seed?: number;
};

export type HitStopCue = {
  /** Start frame of impact freeze */
  f: number;
  /** Freeze length in frames (3..5 frames gives classic anime combat hit weight!) */
  dur: number;
};

function detHash(seed: number, a: number, b: number): number {
  const v = Math.sin(seed * 12.9898 + a * 78.233 + b * 37.719) * 43758.5453123;
  return v - Math.floor(v);
}

// Big / medium / small anime size distribution (avoids monotonous uniform shapes!)
function bms(u: number, smallFrac = 0.2, medFrac = 0.34): number {
  if (u < smallFrac) return 0.16 + (u / smallFrac) * 0.24;
  if (u < smallFrac + medFrac) return 0.45 + ((u - smallFrac) / medFrac) * 0.30;
  return 0.78 + ((u - smallFrac - medFrac) / Math.max(0.01, 1 - smallFrac - medFrac)) * 0.42;
}

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
      return idx % 2 === 0
        ? { filter: "grayscale(1) contrast(6.5) invert(1) brightness(1.02)", active: true }
        : { filter: "grayscale(1) contrast(6.5) brightness(1.12)", active: true };
    }
  }
  return { filter: "none", active: false };
}

// Build an asymmetric needle-ended kite polygon from p0 -> p1 with optional elbow overshoot spurs
function buildKitePoly(
  x0: number, y0: number, x1: number, y1: number,
  halfW: number, over0: number, over1: number, seed: number, idx: number
): string {
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) + 1e-5;
  const ux = dx / L, uy = dy / L;
  const nx = -uy, ny = ux;
  const ax = x0 - ux * over0, ay = y0 - uy * over0;
  const ex = x1 + ux * over1, ey = y1 + uy * over1;
  const pk = 0.18 + detHash(seed, idx, 1) * 0.36;
  const pk2 = Math.min(0.9, pk + 0.06 + detHash(seed, idx, 2) * 0.16);
  const asym = 0.22 + detHash(seed, idx, 3) * 0.56;
  const q0x = ax + (ex - ax) * pk, q0y = ay + (ey - ay) * pk;
  const q1x = ax + (ex - ax) * pk2, q1y = ay + (ey - ay) * pk2;
  const wA = halfW * 2 * asym;
  const wB = halfW * 2 * (1 - asym);
  const pts = [
    [ax, ay],
    [q0x + nx * wA, q0y + ny * wA],
    [q1x + nx * wA * 0.68, q1y + ny * wA * 0.68],
    [ex, ey],
    [q1x - nx * wB * 0.62, q1y - ny * wB * 0.62],
    [q0x - nx * wB, q0y - ny * wB],
  ];
  return pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
}

// Build jagged angular polyline with unequal segment lengths and occasional Z-elbow doubleback
function buildAngularBolt(
  x0: number, y0: number, x1: number, y1: number, segs: number, seed: number, idx: number
): [number, number][] {
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) + 1e-5;
  const ux = dx / L, uy = dy / L;
  const nx = -uy, ny = ux;
  const pts: [number, number][] = [[x0, y0]];
  let sg = detHash(seed, idx, 10) < 0.5 ? 1 : -1;
  for (let i = 1; i < segs; i++) {
    let frac = (i / segs) + (detHash(seed, idx * 19 + i, 11) - 0.5) * (0.45 / segs);
    let off = sg * (L / segs) * (0.28 + detHash(seed, idx * 19 + i, 12) * 0.42);
    if (detHash(seed, idx * 19 + i, 13) < 0.20) {
      frac -= (0.4 / segs);
      off *= 1.3;
    }
    pts.push([x0 + ux * (frac * L) + nx * off, y0 + uy * (frac * L) + ny * off]);
    if (detHash(seed, idx * 19 + i, 14) < 0.85) sg = -sg;
  }
  pts.push([x1, y1]);
  return pts;
}

/** Deterministic SVG Sakuga Overlay: Kanada Clumped Wedges + Angular Kite-Bolts + Impact Frames + Flash! */
export const SakugaOverlay: React.FC<{
  frame: number;
  impacts?: ImpactFrameCue[];
  speedlines?: SpeedlineCue[];
  kiteBolts?: KiteBoltCue[];
  flash?: { alpha: number; color: string };
}> = ({ frame: f, impacts = [], speedlines = [], kiteBolts = [], flash }) => {
  const { width, height } = useVideoConfig();
  const imp = impactFilterAt(f, impacts);
  const activeSpeed = speedlines.find((s) => f >= s.a && f < s.b);
  const activeBolts = kiteBolts.filter((b) => f >= b.a && f < b.b);

  // 1. Kanada-Style Clumped Unequal Radial Wedges (or classic speedlines)
  let speedSvg: React.ReactNode = null;
  if (activeSpeed) {
    const cx = (activeSpeed.center?.[0] ?? 0.5) * width;
    const cy = (activeSpeed.center?.[1] ?? 0.48) * height;
    const maxR = Math.hypot(width, height) * 0.78;
    const baseInner = (activeSpeed.innerRadius ?? 0.30) * Math.min(width, height);
    const step = Math.floor(f / 2.5); // crisp 12 fps anime sakuga cadence!
    const col = activeSpeed.color ?? "#ffffff";
    const alpha = Math.max(0, Math.min(1, activeSpeed.intensity ?? 0.78));
    const isKanada = (activeSpeed.style ?? "kanada_wedges") === "kanada_wedges";
    const clumpProb = activeSpeed.clump ?? 0.62;
    const count = isKanada ? 58 : 52;
    const clusterCount = 8;
    const clusters = Array.from({ length: clusterCount }, (_, k) => detHash(step + 13, k, 99) * Math.PI * 2);
    const polys: React.ReactNode[] = [];

    for (let i = 0; i < count; i++) {
      const h1 = detHash(step + 7, i, 1);
      const h2 = detHash(step + 7, i, 2);
      const h3 = detHash(step + 7, i, 3);
      const h4 = detHash(step + 7, i, 4);
      const ang = isKanada && h1 < clumpProb
        ? clusters[i % clusterCount] + (detHash(step + 7, i, 5) - 0.5) * 0.34
        : (i / count) * Math.PI * 2 + (h1 - 0.5) * 0.08;
      const sz = isKanada ? bms(h2, 0.14, 0.32) : (0.5 + h2 * 0.5);
      const rIn = baseInner * (isKanada ? (0.78 + h3 * 0.85) * (1.16 - 0.28 * sz) : (0.84 + h2 * 0.48));
      const halfSpread = isKanada
        ? (0.004 + 0.022 * sz * (0.6 + h4 * 0.9)) * (0.68 + alpha * 0.52)
        : (0.008 + h3 * 0.016) * (0.7 + alpha * 0.5);
      const tipJitter = isKanada ? (h4 - 0.5) * halfSpread * 0.35 : 0;
      const x0 = cx + Math.cos(ang + tipJitter) * rIn;
      const y0 = cy + Math.sin(ang + tipJitter) * rIn;
      const x1 = cx + Math.cos(ang - halfSpread) * maxR;
      const y1 = cy + Math.sin(ang - halfSpread) * maxR;
      const x2 = cx + Math.cos(ang + halfSpread) * maxR;
      const y2 = cy + Math.sin(ang + halfSpread) * maxR;
      polys.push(
        <polygon
          key={i}
          points={`${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`}
          fill={col}
          fillOpacity={(isKanada ? 0.35 + sz * 0.52 : 0.28 + h4 * 0.52) * alpha}
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

  // 2. Thick-Thin-Thick Angular Kite-Bolt Chains + Flying Shards (MAPPA/Kanada Impact Lightning!)
  let boltsSvg: React.ReactNode = null;
  if (activeBolts.length > 0) {
    const rimElems: React.ReactNode[] = [];
    const coreElems: React.ReactNode[] = [];
    const hairElems: React.ReactNode[] = [];
    const scale = height / 1920;

    activeBolts.forEach((b, bi) => {
      const localF = f - b.a;
      const dur = Math.max(1, b.b - b.a);
      const prog = localF / dur;
      // Redrawn on ones for first 4 frames, then crisp twos
      const step = localF < 4 ? localF : Math.floor(localF / 2) * 2;
      const seed = (b.seed ?? 71) + bi * 131 + step * 29;
      const cx = b.center[0] * width;
      const cy = b.center[1] * height;
      const reachPx = (b.reach ?? 0.46) * height;
      const coreCol = b.coreColor ?? "#07040b";
      const rimCol = b.rimColor ?? "#f01836";
      const hairCol = b.hairlineColor ?? "#fff8f2";
      const count = b.count ?? 10;
      const grow = Math.min(1, (localF + 1.2) / 2.2);
      const tear = Math.max(0, (prog - 0.32) / 0.68);
      const fadeOp = Math.max(0, 1 - Math.pow(tear, 1.8));

      for (let i = 0; i < count; i++) {
        const isHero = i < 3;
        const ang = i * 2.39996 + detHash(seed, i, 1) * 0.85;
        const sz = isHero ? 1.15 : bms(detHash(seed, i, 2), 0.22, 0.4);
        const len = reachPx * (0.36 + 0.68 * sz);
        const rStart = len * 0.68 * Math.pow(tear, 1.5);
        const rEnd = len * (grow + 0.08 * tear);
        const x0 = cx + Math.cos(ang) * rStart;
        const y0 = cy + Math.sin(ang) * rStart;
        const x1 = cx + Math.cos(ang) * rEnd;
        const y1 = cy + Math.sin(ang) * rEnd;
        const segs = isHero ? 5 : 3;
        const pts = buildAngularBolt(x0, y0, x1, y1, segs, seed, i);
        const baseW = (isHero ? 26 : 8 + 12 * sz) * scale * (1 - 0.78 * tear);
        const edgePad = (isHero ? 8 : 4.5) * scale * (1 - 0.55 * tear);

        for (let s = 0; s < pts.length - 1; s++) {
          const fat = (s % 2 === 0 ? 1.0 : 0.42) * (1 - (s / pts.length) * 0.45);
          const hw = Math.max(1.2, baseW * fat);
          const ov0 = s === 0 ? 0 : hw * 1.9;
          const ov1 = s < pts.length - 2 ? hw * 1.7 : 0;
          const [px0, py0] = pts[s];
          const [px1, py1] = pts[s + 1];
          const jx = (detHash(seed, i * 11 + s, 21) - 0.5) * edgePad * 0.8;
          const jy = (detHash(seed, i * 11 + s, 22) - 0.5) * edgePad * 0.8;
          rimElems.push(
            <polygon
              key={`r_${bi}_${i}_${s}`}
              points={buildKitePoly(px0 + jx, py0 + jy, px1 + jx, py1 + jy, hw + edgePad, ov0 + edgePad * 2, ov1 + edgePad * 2.4, seed, i * 31 + s)}
              fill={rimCol}
              fillOpacity={0.94 * fadeOp}
            />
          );
          coreElems.push(
            <polygon
              key={`c_${bi}_${i}_${s}`}
              points={buildKitePoly(px0, py0, px1, py1, hw, ov0, ov1, seed, i * 31 + s)}
              fill={coreCol}
              fillOpacity={fadeOp}
            />
          );
        }
        if (detHash(seed, i, 40) < 0.6) {
          const lineStr = pts.map(([px, py]) => `${(px + 2.5 * scale).toFixed(1)},${(py - 2.0 * scale).toFixed(1)}`).join(" ");
          hairElems.push(
            <polyline
              key={`h_${bi}_${i}`}
              points={lineStr}
              fill="none"
              stroke={hairCol}
              strokeWidth={1.8 * scale}
              strokeOpacity={0.85 * fadeOp}
            />
          );
        }
      }

      // Angular flying fragments thrown radially outward with exponential drag
      const shardCount = b.shards ?? 18;
      const tSec = localF / 30;
      const dragK = (1 - Math.exp(-2.4 * tSec)) / 2.4;
      for (let i = 0; i < shardCount; i++) {
        const a = detHash(b.seed ?? 71, i, 51) * Math.PI * 2;
        const sz = bms(detHash(b.seed ?? 71, i, 52), 0.25, 0.35);
        const speed = (680 + 780 * detHash(b.seed ?? 71, i, 53)) * scale;
        const dist = 36 * scale + speed * dragK;
        const sx = cx + Math.cos(a) * dist;
        const sy = cy + Math.sin(a) * dist;
        const rad = (18 * sz * Math.max(0, 1 - tSec * 1.6)) * scale;
        if (rad < 1.5) continue;
        const rot = a + tSec * (detHash(b.seed ?? 71, i, 54) - 0.5) * 9;
        const stretch = 1.4 + detHash(b.seed ?? 71, i, 55) * 1.9;
        const p0x = sx + Math.cos(rot) * rad * stretch;
        const p0y = sy + Math.sin(rot) * rad * stretch;
        const p1x = sx + Math.cos(rot + 2.2) * rad;
        const p1y = sy + Math.sin(rot + 2.2) * rad;
        const p2x = sx + Math.cos(rot - 2.1) * rad * 0.9;
        const p2y = sy + Math.sin(rot - 2.1) * rad * 0.9;
        const sPts = `${p0x.toFixed(1)},${p0y.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`;
        rimElems.push(<polygon key={`sr_${bi}_${i}`} points={sPts} fill={rimCol} stroke={rimCol} strokeWidth={3.2 * scale} fillOpacity={fadeOp} />);
        coreElems.push(<polygon key={`sc_${bi}_${i}`} points={sPts} fill={coreCol} fillOpacity={fadeOp} />);
      }
    });

    boltsSvg = (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 34 }}
      >
        {rimElems}
        {coreElems}
        {hairElems}
      </svg>
    );
  }

  return (
    <>
      {speedSvg}
      {boltsSvg}
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
