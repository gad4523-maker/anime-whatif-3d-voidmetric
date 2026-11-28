// Voidmetric v4.1 Clean-Room Physical-Modeling Musical Instrument Primitives (ZERO Hardcoded Mood Dropdowns!)
// Waveguide plucked strings (Karplus-Strong), Helmholtz bowed string ensembles, and Bessel modal drums/taiko
// driven strictly by open episode musical parameters (`scale_root_hz`, `scale_intervals`, `bpm`, `cutoff_hz`, `acts`).
import {
  SR, TAU, ns, clamp, smooth01, createRng, StereoBuf,
  mixInto, normalizePeak, fadeEnds, lp, hp, bp, svf, whiteNoise, pinkNoise, wander, modalBank,
} from "./dsp_core.mjs";

const semi = (rootHz, st) => rootHz * Math.pow(2, st / 12);

// Karplus-Strong physical waveguide plucked string (guitar / bass / koto / shamisen / harp)
export function pluckString(rng, freq, dur, { damp = 0.994, bright = 3800, pickPos = 0.24, drive = 1.0 } = {}) {
  const n = ns(dur);
  const f = clamp(freq, 28, 3200);
  const period = SR / f;
  const N = Math.max(8, Math.floor(period));
  const frac = period - N;
  const apCoef = (1 - frac) / (1 + frac);
  const delay = new Float64Array(N);
  // Comb-filtered pluck excitation matching physical pick position along string
  const exc = whiteNoise(rng, N);
  lp(exc, bright, 0.707);
  const pickOff = Math.max(1, Math.round(N * clamp(pickPos, 0.05, 0.48)));
  for (let i = 0; i < N; i++) {
    delay[i] = exc[i] - 0.65 * exc[(i + pickOff) % N];
  }
  const out = new Float64Array(n);
  let idx = 0, prev = 0, apState = 0;
  for (let i = 0; i < n; i++) {
    const s = delay[idx];
    const lpSample = 0.5 * (s + prev) * damp;
    prev = s;
    const next = apCoef * lpSample + apState;
    apState = lpSample - apCoef * next;
    delay[idx] = next;
    idx = (idx + 1) % N;
    out[i] = drive > 1.01 ? Math.tanh(s * drive) / Math.tanh(drive) : s;
  }
  return normalizePeak(fadeEnds(out, 0.0015, Math.min(0.06, dur * 0.25)), 1);
}

// Physical Helmholtz bowed string ensemble (violin / viola / cello / contrabass section)
export function bowedEnsemble(rng, freqs, dur, { voices = 4, cutoff = 1850, vibHz = 5.2, vibDepth = 0.0045, rosin = 0.08 } = {}) {
  const n = ns(dur);
  const out = new StereoBuf(n);
  for (const f0 of freqs) {
    const maxH = Math.min(14, Math.floor(6200 / Math.max(40, f0)));
    for (let v = 0; v < voices; v++) {
      const det = 1 + (v - (voices - 1) * 0.5) * 0.0032 + rng.range(-0.0012, 0.0012);
      const w = wander(rng, n, rng.range(1.2, 2.8));
      const x = new Float64Array(n);
      let ph = rng() * TAU;
      let vph = rng() * TAU;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const vib = 1 + vibDepth * smooth01(u * 4) * Math.sin(vph) + 0.002 * w[i];
        vph += (TAU * vibHz) / SR;
        ph += (TAU * f0 * det * vib) / SR;
        // Sawtooth-like Helmholtz bowed harmonic decay (1/k^1.18) with natural bridge body shaping
        let s = 0;
        for (let h = 1; h <= maxH; h++) {
          s += Math.sin(h * ph) / Math.pow(h, 1.18);
        }
        x[i] = s * (0.78 + 0.22 * w[i]);
      }
      if (rosin > 0.01) {
        const br = pinkNoise(rng, n);
        bp(br, clamp(f0 * 3.5, 450, 4200), 1.6);
        for (let i = 0; i < n; i++) x[i] += br[i] * rosin * 0.45;
      }
      lp(x, cutoff, 0.72);
      fadeEnds(x, Math.min(0.28, dur * 0.18), Math.min(0.4, dur * 0.25));
      const pan = clamp(((v / Math.max(1, voices - 1)) * 2 - 1) * 0.68, -0.85, 0.85);
      out.addMono(normalizePeak(x, 1), { at: 0, g: 0.42 / (freqs.length * Math.sqrt(voices)), pan });
    }
  }
  return out;
}

// Bessel-membrane physical kick / taiko drum
export function modalKick(rng, { f0 = 152, f1 = 46, dur = 0.24, amp = 1.0, taiko = false } = {}) {
  const n = ns(dur);
  const x = new Float64Array(n);
  let ph = 0;
  const glide = taiko ? 0.048 : 0.024;
  const dec = taiko ? 0.14 : 0.072;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / glide);
    ph += (TAU * f) / SR;
    // Fundamental + J11 circular membrane overtone (1.593x)
    const body = Math.sin(ph) + (taiko ? 0.34 : 0.16) * Math.sin(ph * 1.593 + 0.3);
    x[i] = Math.tanh(body * (taiko ? 2.1 : 1.7)) * Math.min(1, i / 48) * Math.exp(-t / dec);
  }
  const click = whiteNoise(rng, ns(0.012));
  bp(click, taiko ? 750 : 2200, 1.0);
  for (let i = 0; i < click.length && i < n; i++) x[i] += click[i] * Math.exp(-i / 140) * 0.35;
  return normalizePeak(fadeEnds(x, 0.0005, 0.015), amp);
}

// Modal snare with metallic shell + colliding snare wires
export function modalSnare(rng, { dur = 0.18, amp = 1.0 } = {}) {
  const n = ns(dur);
  const exc = whiteNoise(rng, ns(0.004));
  const shell = modalBank(exc, [[192, 0.09, 1.0], [306, 0.06, 0.55], [442, 0.04, 0.3]], n);
  const wires = whiteNoise(rng, n);
  hp(wires, 1400);
  lp(wires, 8600);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const buzz = 0.65 + 0.35 * Math.sin(TAU * 135 * t + rng() * 0.5);
    shell[i] = shell[i] * 0.52 + wires[i] * buzz * Math.exp(-t / 0.048) * 0.68;
  }
  return normalizePeak(fadeEnds(shell, 0.0005, 0.015), amp);
}

// Inharmonic metallic hi-hat / cymbal shimmer
export function modalHat(rng, { dur = 0.065, amp = 1.0 } = {}) {
  const n = ns(dur);
  const x = whiteNoise(rng, n);
  hp(x, 6200);
  svf(x, 9600, 1.4, "bp");
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-i / (dur * 0.28 * SR));
  return normalizePeak(fadeEnds(x, 0.0004, 0.008), amp);
}

/**
 * Renders a bespoke physical-instrument background score strictly from open episode parameters (`audio_cues.json`).
 * Zero hardcoded mood presets — scale, root, BPM, cutoff, drums, and act boundaries are 100% episode-authored!
 */
export function renderParametricScore(cfg, durS) {
  const n = ns(durS);
  const out = new StereoBuf(n);
  const root = Number(cfg.scale_root_hz ?? 73.42);
  const intervals = Array.isArray(cfg.scale_intervals) && cfg.scale_intervals.length
    ? cfg.scale_intervals.map(Number)
    : [0, 2, 3, 5, 7, 8, 10, 12];
  const cutoff = Number(cfg.cutoff_hz ?? 1950);
  const useDrums = cfg.drums !== false;
  const bpm = Number(cfg.bpm ?? 124);
  const acts = cfg.acts ?? {};
  const rng = createRng(Number(cfg.seed ?? 404));

  const tHook = Math.min(durS * 0.24, Number(acts.hook_end_s ?? durS * 0.16));
  const tEsc = Math.min(durS * 0.66, Number(acts.escalation_end_s ?? durS * 0.50));
  const tSilA = Number(acts.twist_silence_start_s ?? tEsc);
  const tSilB = Number(acts.twist_silence_end_s ?? Math.min(durS - 4.0, tSilA + 2.0));
  const tClimax = Math.min(durS - 2.0, Number(acts.climax_end_s ?? durS * 0.86));

  const step = (60 / bpm) / 2; // eighth note
  const loNotes = intervals.map((s) => semi(root, s));
  const hiNotes = intervals.map((s) => semi(root * 2, s));
  const deg = (arr, idx) => arr[((idx % arr.length) + arr.length) % arr.length];

  // Act 1: Delicate Karplus-Strong plucked motif + warm bowed strings
  const arp1 = [0, 4, 7, 2, 4, 7, 1, 6];
  for (let t = 0, k = 0; t < tHook; t += step, k++) {
    const f = deg(hiNotes, arp1[k % arp1.length]) * (k % 8 === 3 ? 2 : 1);
    const p = pluckString(rng, f, 0.42, { damp: 0.992, bright: cutoff * 1.4, pickPos: 0.22 });
    out.addMono(p, { at: t, g: 0.17, pan: 0.34 * Math.sin(k * 0.9) });
    if (k % 4 === 0) {
      const b = pluckString(rng, deg(loNotes, 0), 0.72, { damp: 0.995, bright: 520, pickPos: 0.16 });
      out.addMono(b, { at: t, g: 0.26, pan: 0 });
    }
  }
  if (tHook > 0.35) {
    out.addStereo(
      bowedEnsemble(rng, [deg(hiNotes, 0), deg(hiNotes, 4), deg(hiNotes, 2) * 2], tHook, { cutoff: cutoff * 0.65, voices: 3 }),
      { at: 0.08, g: 0.28 }
    );
  }

  // Act 2: Driving physical bass + plucked ostinato + modal drums/taiko + soaring strings
  const bassProg = [0, 0, 5, 6, 0, 0, 3, 4];
  const ost = [0, 2, 4, 7, 6, 4, 5, 4];
  for (let t = tHook + 0.04, k = 0; t < tEsc; t += step, k++) {
    const bf = deg(loNotes, bassProg[Math.floor(k / 8) % bassProg.length]);
    out.addMono(pluckString(rng, bf, 0.32, { damp: 0.992, bright: 780, drive: 1.5 }), { at: t, g: 0.28, pan: 0 });
    const of = deg(hiNotes, ost[k % ost.length]);
    out.addMono(pluckString(rng, of, 0.26, { damp: 0.99, bright: cutoff * 1.5, pickPos: 0.18 }), {
      at: t, g: 0.16, pan: k % 2 ? 0.38 : -0.38,
    });
    if (useDrums) {
      if (k % 4 === 0 || k % 8 === 6) out.addMono(modalKick(rng, { taiko: k % 8 === 0 }), { at: t, g: 0.36 });
      if (k % 4 === 2) out.addMono(modalSnare(rng), { at: t, g: 0.24, pan: -0.06 });
      out.addMono(modalHat(rng), { at: t, g: k % 2 === 0 ? 0.085 : 0.045, pan: 0.24 });
    }
  }
  if (tEsc - tHook > 0.5) {
    out.addStereo(
      bowedEnsemble(rng, [deg(hiNotes, 0), deg(hiNotes, 4), deg(hiNotes, 7)], tEsc - tHook, { cutoff: cutoff * 0.92, voices: 4 }),
      { at: tHook + 0.04, g: 0.34 }
    );
  }

  // Act 3: Post-twist deep tension bowed ensemble + accelerating taiko/bass pulse
  if (tClimax - tSilB > 0.5) {
    out.addStereo(
      bowedEnsemble(rng, [deg(loNotes, 0), deg(loNotes, 4), deg(hiNotes, 0), deg(hiNotes, 2)], tClimax - tSilB, { cutoff: cutoff * 0.58, voices: 4 }),
      { at: tSilB, g: 0.38 }
    );
    for (let t = tSilB + 0.06, k = 0; t < tClimax; t += step, k++) {
      const f = deg(loNotes, k % 4 === 0 ? 0 : 4);
      out.addMono(pluckString(rng, f, 0.26, { damp: 0.99, bright: 640, drive: 1.8 }), { at: t, g: k % 2 === 0 ? 0.24 : 0.13 });
      if (useDrums && t > (tSilB + tClimax) * 0.42 && k % 2 === 0) {
        out.addMono(modalKick(rng, { taiko: true, dur: 0.32 }), { at: t, g: 0.34 });
      }
    }
  }

  // Finale resolution resonance
  const rem = Math.max(0.5, durS - tClimax);
  out.addStereo(bowedEnsemble(rng, [deg(loNotes, 0), deg(hiNotes, 4)], rem, { cutoff: 760, voices: 3 }), { at: tClimax, g: 0.24 });

  // Clean micro-silence cut across the mid-video twist question (when configured)
  const aCut = Math.max(0, Math.round(tSilA * SR));
  const bCut = Math.min(n, Math.round(tSilB * SR));
  const fadeN = ns(0.04);
  if (bCut > aCut + fadeN * 2) {
    for (let i = Math.max(0, aCut - fadeN); i < aCut; i++) {
      const g = 1 - (i - Math.max(0, aCut - fadeN)) / fadeN;
      out.l[i] *= g; out.r[i] *= g;
    }
    for (let i = aCut; i < bCut; i++) { out.l[i] = 0; out.r[i] = 0; }
    for (let i = bCut; i < Math.min(n, bCut + fadeN); i++) {
      const g = (i - bCut) / fadeN;
      out.l[i] *= g; out.r[i] *= g;
    }
  }
  return out;
}
