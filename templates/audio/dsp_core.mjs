// Voidmetric v4.1 Clean-Room Zero-Dependency 48 kHz Audio DSP Kernel
// Pure mathematical DSP primitives: deterministic RNG, stereo buffers, RBJ biquads, time-varying TPT SVF,
// colored noise, Poisson event streams, modal resonator banks, radix-2 FFT overlap-add convolution,
// parametric synthetic room IRs, Bark-band perceptual analyzer, BS.1770-4 LUFS, and 24-bit WAV I/O.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const SR = 48000;
export const TAU = Math.PI * 2;
export const ns = (sec) => Math.max(1, Math.round(sec * SR));
export const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth01 = (t) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (x) => 20 * Math.log10(Math.max(1e-12, Math.abs(x)));
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Deterministic Mulberry32 PRNG with utility distributions
export function createRng(seed = 1337) {
  let s = (Math.floor(seed) >>> 0) || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.log = (lo, hi) => lo * Math.pow(hi / Math.max(1e-9, lo), next());
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.sign = () => (next() < 0.5 ? -1 : 1);
  next.gauss = () => {
    const u1 = Math.max(1e-12, next());
    const u2 = next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  };
  return next;
}

// Non-homogeneous Poisson arrival times on [0, dur] via Lewis-Shedler thinning
export function poissonTimes(rng, dur, rateOrFn, maxRate = null) {
  if (dur <= 0) return [];
  const fn = typeof rateOrFn === "function" ? rateOrFn : () => rateOrFn;
  let lamMax = maxRate;
  if (lamMax == null) {
    lamMax = 0;
    for (let k = 0; k <= 32; k++) lamMax = Math.max(lamMax, fn((k / 32) * dur));
    lamMax = Math.max(1e-4, lamMax * 1.15);
  }
  const out = [];
  let t = 0;
  while (t < dur && out.length < 4000) {
    t += -Math.log(Math.max(1e-12, rng())) / lamMax;
    if (t >= dur) break;
    if (rng() * lamMax <= fn(t)) out.push(t);
  }
  return out;
}

export class StereoBuf {
  constructor(secOrSamples, useFloat32 = false) {
    this.n = typeof secOrSamples === "number" && secOrSamples < 1000 && !Number.isInteger(secOrSamples)
      ? ns(secOrSamples)
      : Math.max(1, Math.round(secOrSamples));
    const Arr = useFloat32 ? Float32Array : Float64Array;
    this.l = new Arr(this.n);
    this.r = new Arr(this.n);
  }
  static fromSeconds(sec, useFloat32 = false) {
    return new StereoBuf(ns(sec), useFloat32);
  }
  gain(g) {
    for (let i = 0; i < this.n; i++) {
      this.l[i] *= g;
      this.r[i] *= g;
    }
    return this;
  }
  peak() {
    let m = 0;
    for (let i = 0; i < this.n; i++) {
      const al = Math.abs(this.l[i]);
      const ar = Math.abs(this.r[i]);
      if (al > m) m = al;
      if (ar > m) m = ar;
    }
    return m;
  }
  addMono(x, { at = 0, g = 1, pan = 0 } = {}) {
    const o = Math.round(at * SR);
    const start = Math.max(0, -o);
    const end = Math.min(x.length, this.n - o);
    if (typeof pan === "function") {
      for (let i = start; i < end; i++) {
        const p = clamp(pan(i / SR), -1, 1);
        const ang = (p + 1) * Math.PI * 0.25;
        const v = x[i] * g;
        this.l[o + i] += v * Math.cos(ang) * 1.41421356;
        this.r[o + i] += v * Math.sin(ang) * 1.41421356;
      }
    } else {
      const ang = (clamp(pan, -1, 1) + 1) * Math.PI * 0.25;
      const gl = g * Math.cos(ang) * 1.41421356;
      const gr = g * Math.sin(ang) * 1.41421356;
      for (let i = start; i < end; i++) {
        this.l[o + i] += x[i] * gl;
        this.r[o + i] += x[i] * gr;
      }
    }
    return this;
  }
  addStereo(src, { at = 0, g = 1 } = {}) {
    const o = Math.round(at * SR);
    const start = Math.max(0, -o);
    const end = Math.min(src.n, this.n - o);
    for (let i = start; i < end; i++) {
      this.l[o + i] += src.l[i] * g;
      this.r[o + i] += src.r[i] * g;
    }
    return this;
  }
  slice(t0, t1) {
    const a = Math.max(0, Math.round(t0 * SR));
    const b = Math.min(this.n, Math.max(a + 1, Math.round(t1 * SR)));
    const out = new StereoBuf(b - a);
    for (let i = 0; i < out.n; i++) {
      out.l[i] = this.l[a + i];
      out.r[i] = this.r[a + i];
    }
    return out;
  }
  clone(useFloat32 = false) {
    const out = new StereoBuf(this.n, useFloat32);
    out.l.set(this.l);
    out.r.set(this.r);
    return out;
  }
}

export function mixInto(dst, src, g = 1, atSec = 0) {
  const o = Math.round(atSec * SR);
  const start = Math.max(0, -o);
  const end = Math.min(src.length, dst.length - o);
  for (let i = start; i < end; i++) dst[o + i] += src[i] * g;
  return dst;
}

export function peakOf(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > m) m = a;
  }
  return m;
}

export function rmsOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

export function normalizePeak(x, target = 1) {
  const pk = peakOf(x);
  if (pk > 1e-12) {
    const g = target / pk;
    for (let i = 0; i < x.length; i++) x[i] *= g;
  }
  return x;
}

export function normalizeRms(x, target = 0.25) {
  const r = rmsOf(x);
  if (r > 1e-12) {
    const g = target / r;
    for (let i = 0; i < x.length; i++) x[i] *= g;
  }
  return x;
}

export function fadeEnds(x, finSec = 0.002, foutSec = 0.01) {
  const n = x.length;
  const ni = Math.min(n, Math.round(finSec * SR));
  const no = Math.min(n, Math.round(foutSec * SR));
  for (let i = 0; i < ni; i++) x[i] *= smooth01(i / Math.max(1, ni));
  for (let i = 0; i < no; i++) x[n - 1 - i] *= smooth01(i / Math.max(1, no));
  return x;
}

// RBJ Audio EQ Cookbook Biquad Coefficients -> [b0, b1, b2, a1, a2]
export function biquadCoef(type, fc, q = 0.7071, gainDb = 0) {
  const f = clamp(fc, 10, SR * 0.48);
  const w0 = (TAU * f) / SR;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * Math.max(0.05, q));
  const A = Math.pow(10, gainDb / 40);
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  if (type === "lp") {
    b0 = (1 - cw) * 0.5; b1 = 1 - cw; b2 = (1 - cw) * 0.5;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === "hp") {
    b0 = (1 + cw) * 0.5; b1 = -(1 + cw); b2 = (1 + cw) * 0.5;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === "bp") {
    b0 = alpha; b1 = 0; b2 = -alpha;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === "pk") {
    b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
  } else if (type === "ls") {
    const s2a = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) - (A - 1) * cw + s2a);
    b1 = 2 * A * ((A - 1) - (A + 1) * cw);
    b2 = A * ((A + 1) - (A - 1) * cw - s2a);
    a0 = (A + 1) + (A - 1) * cw + s2a;
    a1 = -2 * ((A - 1) + (A + 1) * cw);
    a2 = (A + 1) + (A - 1) * cw - s2a;
  } else if (type === "hs") {
    const s2a = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cw + s2a);
    b1 = -2 * A * ((A - 1) + (A + 1) * cw);
    b2 = A * ((A + 1) + (A - 1) * cw - s2a);
    a0 = (A + 1) - (A - 1) * cw + s2a;
    a1 = 2 * ((A - 1) - (A + 1) * cw);
    a2 = (A + 1) - (A - 1) * cw - s2a;
  } else if (type === "notch") {
    b0 = 1; b1 = -2 * cw; b2 = 1;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

export function applyBiquad(x, [b0, b1, b2, a1, a2]) {
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = b0 * v + z1;
    z1 = b1 * v - a1 * y + z2;
    z2 = b2 * v - a2 * y;
    x[i] = y;
  }
  return x;
}

export const lp = (x, fc, q = 0.7071) => applyBiquad(x, biquadCoef("lp", fc, q));
export const hp = (x, fc, q = 0.7071) => applyBiquad(x, biquadCoef("hp", fc, q));
export const bp = (x, fc, q = 1.0) => applyBiquad(x, biquadCoef("bp", fc, q));
export const pk = (x, fc, q, gainDb) => applyBiquad(x, biquadCoef("pk", fc, q, gainDb));
export const lp4 = (x, fc) => lp(lp(x, fc, 0.5412), fc, 1.3066);
export const hp4 = (x, fc) => hp(hp(x, fc, 0.5412), fc, 1.3066);

// Time-varying Topology-Preserving Transform State-Variable Filter (Andrew Simper Cytomic SVF)
export function svf(x, fcOrFn, q = 0.8, mode = "bp") {
  const isFn = typeof fcOrFn === "function";
  const k = 1 / Math.max(0.1, q);
  let ic1 = 0, ic2 = 0;
  let g = Math.tan(Math.PI * clamp(isFn ? fcOrFn(0) : fcOrFn, 15, SR * 0.45) / SR);
  let a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
  for (let i = 0; i < x.length; i++) {
    if (isFn && (i & 7) === 0) {
      g = Math.tan(Math.PI * clamp(fcOrFn(i / SR), 15, SR * 0.45) / SR);
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    }
    const v0 = x[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    x[i] = mode === "lp" ? v2 : mode === "hp" ? v0 - k * v1 - v2 : v1;
  }
  return x;
}

// Noise generators
export function whiteNoise(rng, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

export function pinkNoise(rng, n) {
  const out = new Float64Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

export function brownNoise(rng, n) {
  const out = new Float64Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = (y + (rng() * 2 - 1) * 0.04) * 0.996;
    out[i] = y * 4.5;
  }
  return out;
}

export function bandNoise(rng, n, lo, hi, srcFn = whiteNoise) {
  const x = srcFn(rng, n);
  if (hi < SR * 0.45) lp4(x, hi);
  if (lo > 20) hp4(x, lo);
  return x;
}

// Smooth band-limited random wander in [-1, 1] at rate Hz
export function wander(rng, n, rateHz = 6) {
  const x = whiteNoise(rng, n);
  lp(x, Math.max(0.5, rateHz), 0.707);
  lp(x, Math.max(0.5, rateHz * 1.4), 0.707);
  return normalizePeak(x, 1.0);
}

// Second-order damped modal resonator bank: modes = [[freqHz, t60Sec, amp], ...]
export function modalBank(exc, modes, outLen = exc.length) {
  const y = new Float64Array(outLen);
  const nExc = exc.length;
  for (const [f, t60, amp] of modes) {
    if (f <= 15 || f >= SR * 0.46 || t60 <= 0.0005 || Math.abs(amp) < 1e-6) continue;
    const r = Math.exp(-6.907755 / (t60 * SR));
    const w = (TAU * f) / SR;
    const c1 = 2 * r * Math.cos(w);
    const c2 = -(r * r);
    const g = amp * Math.sin(w) * (1 - r);
    let y1 = 0, y2 = 0;
    for (let i = 0; i < outLen; i++) {
      const inp = i < nExc ? exc[i] : 0;
      const cur = g * inp + c1 * y1 + c2 * y2;
      y2 = y1;
      y1 = cur;
      y[i] += cur;
    }
  }
  return y;
}

// In-place iterative radix-2 Cooley-Tukey FFT (forward if inverse=false)
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  const dir = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (dir * TAU) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const k = i + j + half;
        const vRe = re[k] * curRe - im[k] * curIm;
        const vIm = re[k] * curIm + im[k] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[k] = uRe - vRe;
        im[k] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  if (inverse) {
    const inv = 1 / n;
    for (let i = 0; i < n; i++) {
      re[i] *= inv;
      im[i] *= inv;
    }
  }
}

// Fast overlap-add partitioned FFT convolution for mono signal + mono IR
export function convolveMono(x, h) {
  const nx = x.length, nh = h.length;
  if (nx === 0 || nh === 0) return new Float64Array(nx);
  let blk = 1024;
  while (blk < nh * 2 && blk < 16384) blk <<= 1;
  const hop = Math.max(256, blk - nh + 1);
  if (nh > blk >> 1) {
    // Partitioned overlap-add for long IRs (reverb tails up to 6s)
    const partSize = 4096;
    const fftSize = 8192;
    const numParts = Math.ceil(nh / partSize);
    const hRe = [], hIm = [];
    for (let p = 0; p < numParts; p++) {
      const re = new Float64Array(fftSize);
      const im = new Float64Array(fftSize);
      const off = p * partSize;
      const cnt = Math.min(partSize, nh - off);
      for (let i = 0; i < cnt; i++) re[i] = h[off + i];
      fft(re, im, false);
      hRe.push(re);
      hIm.push(im);
    }
    const out = new Float64Array(nx + nh - 1);
    const xRe = new Float64Array(fftSize);
    const xIm = new Float64Array(fftSize);
    const pRe = new Float64Array(fftSize);
    const pIm = new Float64Array(fftSize);
    for (let pos = 0; pos < nx; pos += partSize) {
      xRe.fill(0); xIm.fill(0);
      const cnt = Math.min(partSize, nx - pos);
      for (let i = 0; i < cnt; i++) xRe[i] = x[pos + i];
      fft(xRe, xIm, false);
      for (let p = 0; p < numParts; p++) {
        const hr = hRe[p], hi = hIm[p];
        for (let k = 0; k < fftSize; k++) {
          pRe[k] = xRe[k] * hr[k] - xIm[k] * hi[k];
          pIm[k] = xRe[k] * hi[k] + xIm[k] * hr[k];
        }
        fft(pRe, pIm, true);
        const outPos = pos + p * partSize;
        const limit = Math.min(fftSize, out.length - outPos);
        for (let i = 0; i < limit; i++) out[outPos + i] += pRe[i];
      }
    }
    return out;
  }
  const hRe = new Float64Array(blk), hIm = new Float64Array(blk);
  for (let i = 0; i < nh; i++) hRe[i] = h[i];
  fft(hRe, hIm, false);
  const out = new Float64Array(nx + nh - 1);
  const xRe = new Float64Array(blk), xIm = new Float64Array(blk);
  for (let pos = 0; pos < nx; pos += hop) {
    xRe.fill(0); xIm.fill(0);
    const cnt = Math.min(hop, nx - pos);
    for (let i = 0; i < cnt; i++) xRe[i] = x[pos + i];
    fft(xRe, xIm, false);
    for (let k = 0; k < blk; k++) {
      const rr = xRe[k] * hRe[k] - xIm[k] * hIm[k];
      const ii = xRe[k] * hIm[k] + xIm[k] * hRe[k];
      xRe[k] = rr; xIm[k] = ii;
    }
    fft(xRe, xIm, true);
    const limit = Math.min(blk, out.length - pos);
    for (let i = 0; i < limit; i++) out[pos + i] += xRe[i];
  }
  return out;
}

export function convolveStereo(sig, ir) {
  const l = convolveMono(sig.l, ir.l);
  const r = convolveMono(sig.r, ir.r);
  const out = new StereoBuf(l.length);
  out.l.set(l);
  out.r.set(r);
  return out;
}

/**
 * Pure Parametric Synthetic Acoustic Space Impulse Response Generator (ZERO Hardcoded Room Dropdowns!).
 * Any episode defines the exact acoustic physics of its physical space:
 *   - t60: diffuse decay time in seconds (e.g. 0.32 tight wooden room, 1.8 stone canyon, 3.2 cathedral)
 *   - bands: optional per-octave decay multipliers ({ 125, 250, 500, 1000, 2000, 4000, 8000 })
 *   - preDelay: diffuse tail onset delay in seconds
 *   - build: diffuse swell rise time in seconds
 *   - earlyTaps: [[delayMs, gain, pan, optionalCutoffHz], ...] representing walls/floor/cliffs
 *   - hiCut / loCut: high/low air-absorption cutoffs in Hz
 *   - tailGain: diffuse tail amplitude relative to early reflections
 */
export function createSpaceIR(opts = {}) {
  const t60 = clamp(opts.t60 ?? 0.65, 0.12, 6.0);
  const preDelay = clamp(opts.preDelay ?? 0.008, 0.0, 0.25);
  const build = clamp(opts.build ?? 0.025, 0.002, 0.6);
  const hiCut = opts.hiCut ?? 4800;
  const loCut = opts.loCut ?? 110;
  const tailGain = opts.tailGain ?? 0.55;
  const bands = opts.bands ?? {};
  const earlyTaps = opts.earlyTaps ?? [
    [6, 0.24, -0.55, 3600],
    [13, 0.18, 0.55, 3200],
    [24, 0.12, -0.25, 2600],
  ];
  const r = createRng(opts.seed ?? Math.round(t60 * 997 + hiCut));
  const dur = Math.min(6.5, preDelay + t60 * 1.15 + 0.15);
  const n = ns(dur);
  const out = new StereoBuf(n);

  // 1. Multi-band exponentially decaying velvet/Gaussian diffuse reverb tail
  const octaveCenters = [125, 250, 500, 1000, 2000, 4000, 8000];
  for (const ch of [0, 1]) {
    const acc = new Float64Array(n);
    for (const fc of octaveCenters) {
      if (fc > hiCut * 1.4 || fc < loCut * 0.7) continue;
      const mult = bands[fc] ?? (fc >= 4000 ? 0.52 : fc <= 125 ? 0.9 : 1.0);
      const bandT60 = Math.max(0.08, t60 * mult);
      const x = whiteNoise(r, n);
      bp(x, fc, 1.35);
      const preN = Math.round(preDelay * SR);
      const bldN = Math.max(1, Math.round(build * SR));
      const decay = -6.907755 / (bandT60 * SR);
      for (let i = preN; i < n; i++) {
        const k = i - preN;
        const env = (k < bldN ? smooth01(k / bldN) : 1) * Math.exp(decay * k);
        acc[i] += x[i] * env;
      }
    }
    lp(acc, hiCut, 0.707);
    hp(acc, loCut, 0.707);
    const e = rmsOf(acc);
    const norm = e > 1e-12 ? (tailGain * 0.08) / e : 0;
    const dst = ch === 0 ? out.l : out.r;
    for (let i = 0; i < n; i++) dst[i] += acc[i] * norm;
  }

  // 2. Discrete directional early reflections from set geometry
  for (const tap of earlyTaps) {
    const [ms, g = 0.2, pan = 0, fc = hiCut] = tap;
    const idx = Math.round((ms / 1000) * SR);
    if (idx < 0 || idx >= n - 64) continue;
    const pulse = new Float64Array(64);
    pulse[0] = 1.0;
    lp(pulse, Math.min(hiCut, fc), 0.707);
    const ang = (clamp(pan, -1, 1) + 1) * Math.PI * 0.25;
    const gl = g * Math.cos(ang) * 1.414;
    const gr = g * Math.sin(ang) * 1.414;
    for (let i = 0; i < 64 && idx + i < n; i++) {
      out.l[idx + i] += pulse[i] * gl;
      out.r[idx + i] += pulse[i] * gr;
    }
  }
  return out;
}

// Bark-scale perceptual spectral masking analysis (25 auditory bands, 43 ms window @ 48 kHz)
const BARK_N = 2048;
const HANN_2048 = Float64Array.from({ length: BARK_N }, (_, i) => 0.5 - 0.5 * Math.cos((TAU * i) / BARK_N));
const hzToBark = (f) => 13 * Math.atan(0.00076 * f) + 3.5 * Math.atan(Math.pow(f / 7500, 2));

export function barkSpectrum(l, r, offset) {
  const re = new Float64Array(BARK_N);
  const im = new Float64Array(BARK_N);
  for (let i = 0; i < BARK_N; i++) {
    const k = offset + i;
    const sl = k >= 0 && k < l.length ? l[k] : 0;
    const sr = k >= 0 && k < r.length ? r[k] : 0;
    re[i] = 0.5 * (sl + sr) * HANN_2048[i];
    im[i] = 0.5 * (sl - sr) * HANN_2048[i];
  }
  fft(re, im, false);
  const bands = new Float64Array(25);
  for (let k = 2; k < BARK_N / 2; k++) {
    const f = (k * SR) / BARK_N;
    if (f > 60 && f < 8000) {
      const b = Math.min(24, Math.floor(hzToBark(f)));
      bands[b] += re[k] * re[k] + im[k] * im[k] + re[BARK_N - k] * re[BARK_N - k] + im[BARK_N - k] * im[BARK_N - k];
    }
  }
  return bands;
}

// Returns how many dB an SFX stands above a reference bed across its second-strongest active Bark band
export function measureStandOutDb(sfxBuf, gainLin, startSample, bedBuf) {
  let bestE = 0, bestOff = 0;
  for (let o = 0; o < sfxBuf.n; o += 512) {
    let e = 0;
    for (let i = o; i < o + 1024 && i < sfxBuf.n; i++) {
      e += sfxBuf.l[i] * sfxBuf.l[i] + sfxBuf.r[i] * sfxBuf.r[i];
    }
    if (e > bestE) { bestE = e; bestOff = o; }
  }
  const sb = barkSpectrum(sfxBuf.l, sfxBuf.r, bestOff);
  const bb = barkSpectrum(bedBuf.l, bedBuf.r, startSample + bestOff);
  let top = 0;
  for (let k = 0; k < 25; k++) if (sb[k] > top) top = sb[k];
  const diffs = [];
  for (let k = 1; k < 22; k++) {
    if (sb[k] > top * 0.025) {
      diffs.push(10 * Math.log10((sb[k] * gainLin * gainLin + 1e-12) / (bb[k] + 2e-7)));
    }
  }
  diffs.sort((a, b) => b - a);
  return diffs[1] ?? diffs[0] ?? 0;
}

// ITU-R BS.1770-4 K-weighted Integrated Loudness (48 kHz exact published biquads)
const K_SHELF_48K = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
const K_HPF_48K = [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621];

function kWeight(x) {
  const y = Float64Array.from(x);
  applyBiquad(y, K_SHELF_48K);
  applyBiquad(y, K_HPF_48K);
  return y;
}

export function measureLUFS(stereo) {
  const n = stereo.n;
  if (n < 480) return -70;
  const kl = kWeight(stereo.l);
  const kr = kWeight(stereo.r);
  const blockLen = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  if (n < blockLen) {
    let e = 0;
    for (let i = 0; i < n; i++) e += kl[i] * kl[i] + kr[i] * kr[i];
    const m = e / Math.max(1, n);
    return m > 1e-12 ? -0.691 + 10 * Math.log10(m) : -70;
  }
  const powers = [];
  for (let o = 0; o + blockLen <= n; o += hop) {
    let e = 0;
    for (let i = o; i < o + blockLen; i++) e += kl[i] * kl[i] + kr[i] * kr[i];
    const z = e / blockLen;
    if (-0.691 + 10 * Math.log10(Math.max(1e-12, z)) > -70) powers.push(z);
  }
  if (!powers.length) return -70;
  const avgAbs = powers.reduce((a, b) => a + b, 0) / powers.length;
  const relGate = avgAbs * 0.1; // -10 LU relative threshold
  let sum = 0, cnt = 0;
  for (const z of powers) {
    if (z >= relGate) { sum += z; cnt++; }
  }
  if (!cnt) return -70;
  return -0.691 + 10 * Math.log10(sum / cnt);
}

// 4x Catmull-Rom cubic true-peak envelope per sample (dBTP safe)
export function truePeakEnvelope(x) {
  const n = x.length;
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x0 = x[i > 0 ? i - 1 : 0];
    const x1 = x[i];
    const x2 = x[i + 1 < n ? i + 1 : n - 1];
    const x3 = x[i + 2 < n ? i + 2 : n - 1];
    let pk = Math.abs(x1);
    for (const t of [0.25, 0.5, 0.75]) {
      const t2 = t * t, t3 = t2 * t;
      const v = 0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3);
      const av = Math.abs(v);
      if (av > pk) pk = av;
    }
    env[i] = pk;
  }
  return env;
}

export function measureTruePeakDb(stereo) {
  const el = truePeakEnvelope(stereo.l);
  const er = truePeakEnvelope(stereo.r);
  let m = 1e-9;
  for (let i = 0; i < stereo.n; i++) {
    if (el[i] > m) m = el[i];
    if (er[i] > m) m = er[i];
  }
  return linToDb(m);
}

// Native WAV writer (16-bit or 24-bit PCM stereo @ 48 kHz)
export function writeWav(filePath, stereo, bits = 24) {
  const n = stereo.n;
  const bytesPerSample = bits === 16 ? 2 : 3;
  const dataBytes = n * 2 * bytesPerSample;
  const buf = Buffer.allocUnsafe(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2 * bytesPerSample, 28);
  buf.writeUInt16LE(2 * bytesPerSample, 32);
  buf.writeUInt16LE(bits, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);
  let off = 44;
  if (bits === 16) {
    for (let i = 0; i < n; i++) {
      for (const s of [stereo.l[i], stereo.r[i]]) {
        const v = Math.round(clamp(s, -1, 1) * 32767);
        buf.writeInt16LE(v, off);
        off += 2;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (const s of [stereo.l[i], stereo.r[i]]) {
        let v = Math.round(clamp(s, -1, 1) * 8388607);
        if (v < 0) v += 0x1000000;
        buf[off] = v & 0xff;
        buf[off + 1] = (v >> 8) & 0xff;
        buf[off + 2] = (v >> 16) & 0xff;
        off += 3;
      }
    }
  }
  fs.writeFileSync(filePath, buf);
}

// Fast native 48 kHz WAV loader with automatic ffmpeg transcode fallback for MP3/M4A/other sample rates
export function readAudio48k(filePath) {
  if (filePath.toLowerCase().endsWith(".wav")) {
    const raw = fs.readFileSync(filePath);
    if (raw.length >= 44 && raw.toString("ascii", 0, 4) === "RIFF" && raw.toString("ascii", 8, 12) === "WAVE") {
      let fmt = 0, ch = 0, sr = 0, bits = 0, dataOff = -1, dataLen = 0;
      let pos = 12;
      while (pos + 8 <= raw.length) {
        const id = raw.toString("ascii", pos, pos + 4);
        const sz = raw.readUInt32LE(pos + 4);
        if (id === "fmt ") {
          fmt = raw.readUInt16LE(pos + 8);
          ch = raw.readUInt16LE(pos + 10);
          sr = raw.readUInt32LE(pos + 12);
          bits = raw.readUInt16LE(pos + 22);
        } else if (id === "data") {
          dataOff = pos + 8;
          dataLen = Math.min(sz, raw.length - dataOff);
          break;
        }
        pos += 8 + sz + (sz & 1);
      }
      if (dataOff >= 0 && sr === SR && (ch === 1 || ch === 2) && ((fmt === 1 && (bits === 16 || bits === 24)) || (fmt === 3 && bits === 32))) {
        const bps = bits >> 3;
        const frames = Math.floor(dataLen / (ch * bps));
        const out = new StereoBuf(frames);
        let p = dataOff;
        for (let i = 0; i < frames; i++) {
          let l = 0, r = 0;
          for (let c = 0; c < ch; c++) {
            let v = 0;
            if (fmt === 3) {
              v = raw.readFloatLE(p);
            } else if (bits === 16) {
              v = raw.readInt16LE(p) / 32768;
            } else {
              let x = raw[p] | (raw[p + 1] << 8) | (raw[p + 2] << 16);
              if (x & 0x800000) x |= 0xff000000;
              v = x / 8388608;
            }
            p += bps;
            if (c === 0) l = v;
            else r = v;
          }
          out.l[i] = l;
          out.r[i] = ch === 1 ? l : r;
        }
        return out;
      }
    }
  }
  const pcm = execFileSync("ffmpeg", [
    "-v", "error", "-i", filePath, "-ar", String(SR), "-ac", "2", "-f", "f32le", "-",
  ], { maxBuffer: 256 * 1024 * 1024 });
  const f32 = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 2);
  const frames = f32.length >> 1;
  const out = new StereoBuf(frames);
  for (let i = 0; i < frames; i++) {
    out.l[i] = f32[i * 2];
    out.r[i] = f32[i * 2 + 1];
  }
  return out;
}
