// Voidmetric v4.1 Clean-Room Physical-Modeling Anime SFX Primitives (ZERO Canned Character Presets!)
// Synthesizes studio-grade anime combat, environmental, elemental, and foley sounds from acoustic physics:
//   friedlanderBlast, supersonicNWave, layeredBoom, shockRing, seismicWave, debrisGrit, turbulentFlame,
//   movingAirEnergy, electricArcs, inwardGather, waterSplash, waterDrops, rockFracture, materialCrunch,
//   stoneGrind, earthDust, bodyImpact, modalWood, modalCeramic, modalMetal, clothFlap, airWind,
//   dopplerWhoosh, subDrop
import {
  SR, TAU, ns, clamp, lerp, smooth01, createRng, poissonTimes, StereoBuf,
  mixInto, normalizePeak, normalizeRms, fadeEnds, rmsOf,
  lp, hp, lp4, hp4, pk, svf, whiteNoise, pinkNoise, brownNoise, bandNoise, wander, modalBank,
} from "./dsp_core.mjs";

function noiseBurst(st, rng, at, lo, hi, atk, dec, amp, { pan = 0, wide = 0.4, src = whiteNoise } = {}) {
  const dur = atk + dec * 4.5 + 0.01;
  const n = ns(dur);
  const mk = () => {
    const x = bandNoise(rng, n, lo, hi, src);
    const na = Math.max(2, atk * SR);
    const kd = Math.max(1e-4, dec * SR);
    for (let i = 0; i < n; i++) {
      const e = (i < na ? i / na : 1) * Math.exp(-Math.max(0, i - na) / kd);
      x[i] *= e;
    }
    return normalizePeak(fadeEnds(x, 0.0002, 0.004), 1);
  };
  const c = mk();
  st.addMono(c, { at, g: amp * (1 - wide * 0.4), pan });
  if (wide > 0.05) {
    mixInto(st.l, mk(), amp * wide * 0.55, at);
    mixInto(st.r, mk(), amp * wide * 0.55, at);
  }
}

function pitchThud(st, at, f0, f1, dur, amp, { glide = 0.035, atk = 0.002, drive = 1.8, h2 = 0.25, pan = 0 } = {}) {
  const n = ns(dur);
  const x = new Float64Array(n);
  let ph = 0;
  const na = Math.max(4, atk * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / Math.max(0.004, glide));
    ph += (TAU * f) / SR;
    const e = (i < na ? i / na : 1) * Math.exp(-t / Math.max(0.02, dur * 0.36));
    const s = Math.sin(ph) + h2 * Math.sin(2 * ph + 0.4);
    x[i] = Math.tanh(s * drive) * e;
  }
  st.addMono(normalizePeak(fadeEnds(x, 0.0005, 0.015), 1), { at, g: amp, pan });
}

function microGrain(st, rng, at, f, q, ms, amp, pan = 0) {
  const n = Math.max(16, ns((ms / 1000) * 3.5));
  const x = whiteNoise(rng, n);
  svf(x, f, q, "bp");
  const k = Math.exp(-1 / Math.max(1, (ms / 1000) * SR));
  let e = 1;
  for (let i = 0; i < n; i++) {
    x[i] *= e * Math.min(1, i / 5);
    e *= k;
  }
  st.addMono(normalizePeak(x, 1), { at, g: amp, pan });
}

// 1. Friedlander air-pressure blast wave (instant positive overpressure + negative suction tail)
export function friedlanderBlast(st, at, { tp = 0.024, amp = 1, rise = 0.0006, decay = 1.15, pan = 0 } = {}) {
  const n = ns(tp * 4.2);
  const x = new Float64Array(n);
  const nr = Math.max(6, rise * SR);
  for (let i = 0; i < n; i++) {
    const u = i / SR / tp;
    const ramp = i < nr ? 0.5 - 0.5 * Math.cos((Math.PI * i) / nr) : 1;
    x[i] = (1 - u) * Math.exp(-decay * u) * ramp;
  }
  fadeEnds(x, 0.0001, tp * 1.1);
  st.addMono(normalizePeak(x, 1), { at, g: amp, pan });
}

// 2. Supersonic N-wave (double compression/rarefaction step — crisp whip crack & shock front)
export function supersonicNWave(st, at, { len = 0.009, amp = 1, rise = 0.0004, pan = 0 } = {}) {
  const n = ns(len);
  const x = new Float64Array(n);
  const k = Math.max(4, rise * SR);
  for (let i = 0; i < n; i++) {
    x[i] = (1 - (2 * i) / n) * Math.min(1, i / k, (n - i) / k);
  }
  st.addMono(x, { at, g: amp, pan });
}

// 3. Poisson flying-debris micro-impacts (4-14 kHz tactile crunch without static hiss)
export function debrisGrit(st, rng, { at = 0, dur = 0.45, amp = 0.35, rate = 220, lo = 4000, hi = 12800, fall = 3.0, spread = 0.85, pan = 0 } = {}) {
  for (const t of poissonTimes(rng, dur, (u) => rate * Math.exp((-fall * u) / Math.max(0.05, dur)))) {
    const f = rng.log(lo, hi);
    const ms = rng.range(0.18, 0.65);
    const g = amp * (0.16 + 0.84 * Math.pow(rng(), 2.1)) * Math.exp((-0.38 * fall * t) / dur);
    microGrain(st, rng, at + t, f, 0.85, ms, g, clamp(pan + rng.range(-spread, spread), -1, 1));
  }
}

// 4. Outward compressed-air shockwave ring (matches visual shockwave ripple!)
export function shockRing(st, rng, { at = 0, size = 1, amp = 0.9, pan = 0 } = {}) {
  supersonicNWave(st, at, { len: 0.0065 * size, amp: amp * 0.55, pan });
  const dur = 0.34 * size;
  const n = ns(dur);
  for (const ch of [0, 1]) {
    const x = pinkNoise(rng, n);
    const w = wander(rng, n, 24);
    svf(x, (t) => (1450 / size) * Math.exp((-t * 6.2) / size) + 140, 0.95, "bp");
    for (let i = 0; i < n; i++) {
      const u = i / n;
      x[i] *= Math.min(1, i / 110) * Math.pow(1 - u, 1.65) * (0.8 + 0.2 * w[i]);
    }
    const ang = (clamp(pan, -1, 1) + 1) * Math.PI * 0.25;
    mixInto(ch ? st.r : st.l, normalizePeak(x, 1), amp * 0.55 * (ch ? Math.sin(ang) : Math.cos(ang)) * 1.414, at + 0.0014 * ch);
  }
}

// 5. Rolling multi-hump thunder / blast tail
export function rollingRumble(st, rng, { at = 0, dur = 1.6, f0 = 460, f1 = 72, amp = 0.8, humps = 6, wide = 0.8 } = {}) {
  const n = ns(dur);
  const arrivals = Array.from({ length: humps }, (_, k) => [
    k === 0 ? 0 : Math.pow(rng(), 1.25) * dur * 0.68,
    k === 0 ? 1 : rng.range(0.3, 0.82),
    rng.range(0.09, 0.28) * (0.65 + dur * 0.2),
    rng.range(-1, 1),
  ]);
  for (const ch of [0, 1]) {
    const b = brownNoise(rng, n);
    const p = pinkNoise(rng, n);
    for (let i = 0; i < n; i++) b[i] = b[i] * 1.15 + p[i] * 0.45;
    svf(b, (t) => f1 + (f0 - f1) * Math.exp((-2.6 * t) / dur), 0.65, "lp");
    hp(b, 30);
    const w = wander(rng, n, 10);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let env = 0;
      for (const [t0, g, d, pn] of arrivals) {
        if (t > t0) {
          const u = t - t0;
          env += g * Math.min(1, u / Math.max(0.012, 0.04 * d)) * Math.exp(-u / d) * (1 + (ch ? pn : -pn) * 0.45 * wide);
        }
      }
      b[i] *= env * (0.8 + 0.2 * w[i]) * smooth01((dur - t) / (dur * 0.28));
    }
    mixInto(ch ? st.r : st.l, normalizePeak(b, 1), amp * 0.72, at);
  }
}

// 6. Full layered cinematic anime boom / explosion
export function layeredBoom(st, rng, { at = 0, size = 1, amp = 1, pan = 0, echo = 0.35 } = {}) {
  const s = Math.sqrt(Math.max(0.25, size));
  [0, 0.0028, 0.0065].forEach((d, k) => {
    supersonicNWave(st, at + d, { len: 0.0016 * (1 + 0.55 * k), rise: 0.00018, amp: amp * [1.3, 0.7, 0.45][k], pan });
  });
  noiseBurst(st, rng, at, 1200, 6200, 0.0002, 0.03 * s, amp * 0.95, { pan, wide: 0.45 });
  noiseBurst(st, rng, at, 4800, 14000, 0.00015, 0.036 * s, amp * 1.15, { pan, wide: 0.6 });
  debrisGrit(st, rng, { at: at + 0.012, dur: 0.35 + 0.32 * s, amp: amp * 0.55, rate: 190 + 70 * s, pan });
  friedlanderBlast(st, at, { tp: 0.012 * s, amp: amp * 0.85, pan });
  pitchThud(st, at + 0.001, 138 / Math.pow(size, 0.16), 44 / Math.pow(size, 0.18), 0.28 * s + 0.12, amp * 1.15, { glide: 0.032 * s, drive: 2.6, pan });
  shockRing(st, rng, { at: at + 0.012, size: 1.25 * s, amp: amp * 0.45, pan });
  rollingRumble(st, rng, { at: at + 0.04, dur: 0.55 + 0.85 * s, f0: 780, f1: 105, amp: amp * 0.58, humps: Math.round(4 + 2 * s) });
  if (echo > 0.05) {
    [[0.16, 0.36, -0.7], [0.29, 0.26, 0.7], [0.47, 0.18, -0.35]].forEach(([d, g, p]) => {
      noiseBurst(st, rng, at + d, 120, 1100, 0.01, 0.16 * s, amp * g * echo, { pan: p, src: pinkNoise, wide: 0.7 });
    });
  }
}

// 7. Seismic groundwave (Rayleigh sub-chirp + rattling stones)
export function seismicWave(st, rng, { at = 0, dur = 1.0, f0 = 24, f1 = 48, amp = 0.9, pebbles = 24 } = {}) {
  const n = ns(dur);
  const x = new Float64Array(n);
  const w = wander(rng, n, 7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    ph += (TAU * (f0 + (f1 - f0) * u * u) * (1 + 0.05 * w[i])) / SR;
    x[i] = (Math.sin(ph) + 0.4 * Math.sin(2 * ph + 0.6)) * Math.pow(u, 1.4) * smooth01((1 - u) * 5);
  }
  st.addMono(fadeEnds(x, 0.03, 0.04), { at, g: amp * 0.55 });
  for (const ch of [0, 1]) {
    const y = bandNoise(rng, n, 42, 185, brownNoise);
    const z = wander(rng, n, 15);
    for (let i = 0; i < n; i++) y[i] *= Math.pow(i / n, 1.4) * (0.72 + 0.28 * z[i]) * smooth01((1 - i / n) * 5);
    mixInto(ch ? st.r : st.l, normalizePeak(y, 1), amp * 0.45, at);
  }
  for (const t of poissonTimes(rng, dur, (u) => pebbles * Math.pow(u / dur, 1.3))) {
    const f = rng.log(850, 2600);
    microGrain(st, rng, at + t, f, 0.9, 2.2, amp * 0.14 * rng.range(0.3, 1), rng.range(-0.85, 0.85));
  }
}

// 8. Turbulent vortex-chopped flame (roar + puff modulation + rising licks + sparks)
export function turbulentFlame(st, rng, { at = 0, dur = 1.2, amp = 0.85, size = 1, licks = 12, pan = 0 } = {}) {
  const n = ns(dur);
  const q = Math.sqrt(Math.max(0.25, size));
  const vortex = new Float64Array(n);
  for (const t of poissonTimes(rng, dur, 28 / q)) {
    const o = Math.round(t * SR);
    const len = ns(rng.range(0.018, 0.055) * q);
    const g = rng.range(0.35, 1.0);
    for (let i = 0; i < len && o + i < n; i++) {
      vortex[o + i] += g * Math.min(1, i / 160) * Math.exp((-4 * i) / len);
    }
  }
  for (const ch of [0, 1]) {
    const mid = pinkNoise(rng, n);
    const low = bandNoise(rng, n, 35, 110, brownNoise);
    const w = wander(rng, n, 8 / q);
    svf(mid, (t) => (420 + 210 * Math.min(1.5, vortex[Math.min(n - 1, Math.floor(t * SR))])) / q, 0.65, "bp");
    lp4(mid, 2500);
    for (let i = 0; i < n; i++) {
      const env = smooth01(i / ns(0.06)) * smooth01((n - i) / ns(0.14));
      const fv = vortex[Math.max(0, i - (ch ? 180 : 0))];
      mid[i] *= env * (0.24 + 0.38 * Math.max(0, 0.5 + 0.5 * w[i]) + 0.52 * fv);
      low[i] *= env * (0.35 + 0.45 * fv);
    }
    pk(mid, 220, 0.8, -4.5);
    mixInto(ch ? st.r : st.l, normalizeRms(mid, 0.22), amp * 0.72, at);
    mixInto(ch ? st.r : st.l, normalizeRms(low, 0.2), amp * 0.52, at);
  }
  for (const t of poissonTimes(rng, dur, licks)) {
    const L = rng.range(0.08, 0.17) * q;
    const m = ns(L);
    const f = rng.log(190, 440) / q;
    const x = pinkNoise(rng, m);
    svf(x, (u) => f * Math.pow(2.1, Math.pow(u / L, 0.7)), 1.15, "bp");
    for (let i = 0; i < m; i++) x[i] *= Math.pow(Math.sin(Math.PI * Math.pow(i / m, 0.5)), 1.2);
    const p = clamp(pan + rng.range(-0.65, 0.65), -1, 1);
    st.addMono(normalizePeak(x, 1), { at: at + t, g: amp * 0.32 * rng.range(0.4, 1), pan: p });
    if (rng() < 0.35) microGrain(st, rng, at + t + L * 0.75, rng.log(1400, 3200), 0.9, 1.8, amp * 0.16, p);
  }
}

// 9. Moving-air resonant energy / aura (narrowband filtered air + subtle beating harmonics — never flat synth!)
export function movingAirEnergy(st, rng, { at = 0, dur = 1.4, freqs = [110, 165, 220], amp = 0.8, bright = 1.0, growl = 0.2, width = 0.75, pitchEnd = 1.0, pan = 0 } = {}) {
  const n = ns(dur);
  const fList = Array.isArray(freqs) && freqs.length ? freqs : [110, 165, 220];
  for (let idx = 0; idx < fList.length; idx++) {
    const f0 = fList[idx];
    for (let h = 1; h <= 5; h++) {
      const f = f0 * h;
      if (f > 4800) break;
      const g = (amp * 0.24 * Math.pow(h, -1.15 + 0.4 * (bright - 1))) / Math.sqrt(fList.length);
      const Q = clamp(f / (22 + f * 0.02), 5, 32);
      const gw = growl > 0.02 ? wander(rng, n, 30 + h * 7) : null;
      for (const ch of [0, 1]) {
        const x = whiteNoise(rng, n);
        svf(x, (t) => f * lerp(1, pitchEnd, smooth01(t / dur)) * (ch ? 1.0035 : 0.9965), Q, "bp");
        const r = Math.max(1e-9, rmsOf(x));
        for (let i = 0; i < n; i++) {
          const u = i / n;
          const env = smooth01(u * 12) * smooth01((1 - u) * 8) * (gw ? 1 - growl * 0.45 * (1 + gw[i]) : 1);
          x[i] = (x[i] / r) * 0.22 * env;
        }
        const p = clamp(pan + (ch ? 1 : -1) * width * 0.65 * Math.sin(h * 1.9 + idx), -1, 1);
        st.addMono(x, { at, g: g * 0.72, pan: p });
      }
    }
  }
}

// 10. Electric leader & return-stroke lightning arcs
export function electricArcs(st, rng, { at = 0, dur = 1.0, rate = 6, amp = 0.85, lo = 1200, hi = 5800, pan = 0, spread = 0.85 } = {}) {
  for (const t of poissonTimes(rng, dur, rate)) {
    const L = rng.range(0.03, 0.11);
    const n = ns(L + 0.015);
    const x = new Float64Array(n);
    const f = rng.log(lo, hi);
    for (const q of poissonTimes(rng, L, (u) => 380 * (0.45 + u / L))) {
      const o = Math.round(q * SR);
      const m = rng.int(10, 32);
      const s = rng.sign() * (0.25 + 0.75 * Math.pow(q / L, 1.2));
      for (let i = 0; i < m && o + i < n; i++) {
        x[o + i] += s * (1 - i / m) * (0.45 + 0.55 * rng());
      }
    }
    svf(x, (u) => f * (1.2 + 0.35 * Math.sin(u * 180)), 0.65, "bp");
    hp(x, 420);
    lp4(x, 12000);
    const p0 = clamp(pan + rng.range(-spread, spread), -1, 1);
    const p1 = clamp(p0 + rng.range(-0.35, 0.35), -1, 1);
    st.addMono(normalizePeak(fadeEnds(x, 0.0004, 0.006), 1), {
      at: at + t,
      g: amp * 0.52 * rng.range(0.45, 1),
      pan: (u) => lerp(p0, p1, clamp(u / L)),
    });
    // Crisp return-stroke crack + low arc body
    microGrain(st, rng, at + t + L * 0.9, f * 0.75, 0.7, 3.8, amp * 0.55, p1);
    microGrain(st, rng, at + t + L * 0.9, rng.range(240, 480), 0.8, 11, amp * 0.36, p1);
  }
}

// 11. Converging power charge / inward gather (ends sharply at `at + dur`!)
export function inwardGather(st, rng, { at = 0, dur = 1.2, freqs = [110, 165], amp = 0.85, lo = 280, hi = 2800 } = {}) {
  for (const t of poissonTimes(rng, dur, (u) => 10 + 110 * Math.pow(u / dur, 2))) {
    const u = t / dur;
    const L = rng.range(0.05, 0.14) * (1.2 - 0.65 * u);
    const m = ns(L);
    const f = lo * Math.pow(hi / lo, 0.35 * u + 0.5 * rng());
    const x = bandNoise(rng, m, f * 0.6, Math.min(6000, f * 1.9));
    svf(x, (v) => f * (1 + 0.35 * (v / L)), 2.8, "bp");
    for (let i = 0; i < m; i++) {
      const v = i / m;
      x[i] *= Math.pow(v, 1.65) * Math.min(1, (1 - v) * 9);
    }
    const p0 = rng.sign() * rng.range(0.35, 0.95);
    st.addMono(normalizePeak(x, 1), { at: at + t, g: amp * 0.28 * (0.2 + 0.8 * u), pan: (v) => p0 * (1 - v / L) });
  }
  movingAirEnergy(st, rng, { at, dur, freqs, amp: amp * 0.55, pitchEnd: 1.95, bright: 1.25 });
  for (const ch of [0, 1]) {
    const n = ns(dur);
    const x = pinkNoise(rng, n);
    svf(x, (t) => 160 + 1250 * Math.pow(t / dur, 1.7), 1.1, "bp");
    for (let i = 0; i < n; i++) {
      const u = i / n;
      x[i] *= Math.pow(u, 1.75) * (u > 0.97 ? (1 - u) / 0.03 : 1);
    }
    mixInto(ch ? st.r : st.l, normalizePeak(x, 1), amp * 0.45, at);
  }
}

// 12. Water drops & full splash (cavity resonance + rising Minnaert bubble chirps + spray)
export function waterDrops(st, rng, { at = 0, dur = 1.0, rate = 20, amp = 0.35, wet = 1, pan = 0, spread = 0.75 } = {}) {
  for (const t of poissonTimes(rng, dur, rate)) {
    const p = clamp(pan + rng.range(-spread, spread), -1, 1);
    const sz = Math.pow(rng(), 1.8);
    const f = 3260 / lerp(1.6, 5.0, sz);
    const g = amp * (0.25 + 0.75 * sz);
    microGrain(st, rng, at + t, f * 1.35, 1.1, 1.6, g * 0.7, p);
    if (wet) {
      const m = ns(0.065);
      const x = new Float64Array(m);
      let ph = 0;
      for (let i = 0; i < m; i++) {
        const u = i / m;
        ph += (TAU * f * (1 + 0.45 * u)) / SR;
        x[i] = Math.sin(ph) * Math.min(1, i / 40) * Math.exp(-u * 5.2);
      }
      st.addMono(x, { at: at + t + 0.004, g: g * 0.45, pan: p });
    }
  }
}

export function waterSplash(st, rng, { at = 0, size = 1, amp = 0.9, pan = 0 } = {}) {
  const s = Math.sqrt(Math.max(0.25, size));
  noiseBurst(st, rng, at, 220 / s, 2300, 0.0018 * s, 0.11 * s, amp * 0.85, { pan, wide: 0.45 });
  noiseBurst(st, rng, at + 0.006, 70 / s, 420 / s, 0.008 * s, 0.19 * s, amp * 0.8, { pan, src: pinkNoise });
  for (let k = 0; k < Math.round(5 * s); k++) {
    const t0 = at + 0.02 + rng() * 0.09 * s;
    const f = rng.log(150, 420) / s;
    const L = rng.range(0.06, 0.13) * s;
    const m = ns(L);
    const x = bandNoise(rng, m, f * 0.5, f * 4.5, pinkNoise);
    svf(x, (u) => f * (1 + 1.15 * (u / L)), 3.8, "bp");
    for (let i = 0; i < m; i++) x[i] *= Math.sin((Math.PI * i) / m);
    st.addMono(normalizePeak(x, 1), { at: t0, g: amp * 0.34, pan: clamp(pan + rng.range(-0.35, 0.35), -1, 1) });
  }
  waterDrops(st, rng, { at: at + 0.15 * s, dur: 0.75 * s, rate: 42 * size, amp: amp * 0.25, pan, spread: 0.5 * s });
}

// 13. Fracture crunch, breaking rock, stone grind & falling dust
export function materialCrunch(st, rng, { at = 0, f = 520, dur = 0.13, amp = 0.9, pan = 0, sharp = 0.7 } = {}) {
  const n = ns(dur * 1.5);
  const x = whiteNoise(rng, n);
  const w1 = wander(rng, n, 310);
  const w2 = wander(rng, n, 92);
  svf(x, (t) => f * (1 + 1.15 * Math.exp((-t / dur) * 4)), 0.58, "bp");
  lp4(x, Math.min(5400, f * 6));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] *= Math.min(1, i / 70) * Math.exp((-t / dur) * 4.2) * (0.28 + 0.72 * Math.pow(Math.abs(w1[i]), 1.4)) * (0.55 + 0.45 * Math.abs(w2[i]));
  }
  st.addMono(normalizePeak(fadeEnds(x, 0.0004, 0.01), 1), { at, g: amp, pan });
  if (sharp > 0.05) {
    noiseBurst(st, rng, at, f * 1.6, Math.min(5400, f * 7), 0.0004, 0.02, amp * 0.65 * sharp, { pan });
    debrisGrit(st, rng, { at, dur: dur * 1.25, amp: amp * 0.45 * sharp, rate: 170, pan, spread: 0.4 });
  }
  noiseBurst(st, rng, at, f * 0.22, f * 0.78, 0.002, dur * 0.85, amp * 0.6, { pan, src: pinkNoise });
}

export function rockFracture(st, rng, { at = 0, size = 1, amp = 0.95, dur = 0.5, pan = 0 } = {}) {
  const s = Math.sqrt(Math.max(0.25, size));
  materialCrunch(st, rng, { at, f: 520 / s, dur: 0.19 * s, amp: amp * 1.1, pan, sharp: 1.0 });
  const blocks = Math.round(4 + 3 * s);
  for (let k = 0; k < blocks; k++) {
    const t = at + 0.065 + dur * s * Math.pow((k + rng()) / blocks, 1.3);
    materialCrunch(st, rng, {
      at: t,
      f: rng.log(230, 760) / s,
      dur: rng.range(0.065, 0.16) * s,
      amp: amp * (1 - (0.72 * k) / blocks) * rng.range(0.42, 0.85),
      pan: clamp(pan + rng.range(-0.55, 0.55), -1, 1),
      sharp: 0.45,
    });
  }
}

export function stoneGrind(st, rng, { at = 0, dur = 0.65, amp = 0.85, lo = 75, hi = 1350, pan = 0 } = {}) {
  const n = ns(dur);
  const x = bandNoise(rng, n, lo, hi, whiteNoise);
  const w1 = wander(rng, n, 24);
  const w2 = wander(rng, n, 105);
  for (let i = 0; i < n; i++) {
    x[i] *= Math.sin((Math.PI * i) / n) * (0.16 + 0.84 * Math.pow(0.5 + 0.5 * w1[i], 2.2)) * (0.55 + 0.45 * w2[i]);
  }
  const modes = Array.from({ length: 22 }, (_, k) => [
    lo * Math.pow(hi / lo, k / 21) * rng.range(0.95, 1.05),
    0.055 * Math.pow(1 - k / 25, 0.5),
    rng.sign() * rng.range(0.3, 1.0),
  ]);
  const res = modalBank(x, modes, ns(dur + 0.1));
  st.addMono(normalizePeak(fadeEnds(res, 0.006, 0.025), 1), { at, g: amp * 0.82, pan });
}

export function earthDust(st, rng, { at = 0, dur = 0.85, amp = 0.75, pan = 0, spread = 0.7 } = {}) {
  const n = ns(dur);
  for (const ch of [0, 1]) {
    const x = bandNoise(rng, n, 95, 1750, pinkNoise);
    const w = wander(rng, n, 14);
    svf(x, (t) => 920 * Math.exp((-t * 3.3) / dur) + 175, 0.65, "lp");
    for (let i = 0; i < n; i++) {
      const u = i / n;
      x[i] *= smooth01(u / 0.07) * Math.pow(1 - u, 1.8) * (0.75 + 0.25 * w[i]);
    }
    mixInto(ch ? st.r : st.l, normalizePeak(x, 1), amp * 0.48, at);
  }
  for (const t of poissonTimes(rng, dur, (u) => 110 * Math.sin(Math.PI * Math.pow(u / dur, 0.7)))) {
    microGrain(st, rng, at + t, rng.log(320, 1400), 1.0, rng.range(2, 5.5), amp * 0.08 * rng.range(0.25, 1), clamp(pan + rng.range(-spread, spread), -1, 1));
  }
}

// 14. Physical non-ringing body punch / hit (skin slap + chest cavity + mass thump + optional bone crunch + cloth snap)
export function bodyImpact(st, rng, { at = 0, amp = 1.0, mass = 1.0, bone = 0.45, skin = 1.0, cloth = 0.5, pan = 0 } = {}) {
  const q = StereoBuf.fromSeconds(0.55);
  noiseBurst(q, rng, 0, 880, 5200, 0.0015, 0.065, amp * 0.9 * skin, { wide: 0.5, src: pinkNoise });
  noiseBurst(q, rng, 0.012, 680, 4100, 0.0025, 0.075, amp * 0.55 * skin, { wide: 0.75, src: pinkNoise });
  noiseBurst(q, rng, 0, 75, 250, 0.003, 0.14 * (0.7 + 0.3 * mass), amp * 1.15 * mass, { src: pinkNoise });
  pitchThud(q, 0, 148, 58, 0.22 + 0.1 * mass, amp * 0.9 * mass, { glide: 0.038, atk: 0.0035, drive: 2.0 });
  if (bone > 0.4) materialCrunch(q, rng, { at: 0.002, f: 980, dur: 0.055, amp: amp * bone * 0.55, sharp: 0.55 });
  if (cloth > 0.1) noiseBurst(q, rng, 0.007, 720, 3200, 0.003, 0.05, amp * cloth * 0.42, { src: pinkNoise, wide: 0.5 });
  st.addStereo(q, { at, g: 1.0 });
  // Tight near-room reflections for visceral weight
  const mono = Float64Array.from(q.l, (v, i) => 0.5 * (v + q.r[i]));
  lp(mono, 3400); hp(mono, 150);
  [[0.014, 0.24, -0.55], [0.025, 0.18, 0.55], [0.042, 0.12, -0.3]].forEach(([d, g, p]) => {
    st.addMono(mono, { at: at + d, g, pan: clamp(pan * 0.4 + p, -1, 1) });
  });
}

// 15. Dense modal wood, ceramic, metal & cloth/wind/whoosh/sub-drop
export function modalWood(st, rng, { at = 0, f = 1.0, amp = 0.9, dur = 0.24, pan = 0 } = {}) {
  const exc = bandNoise(rng, ns(0.006), 140, 3400, whiteNoise);
  fadeEnds(exc, 0.0003, 0.004);
  const modes = Array.from({ length: 24 }, (_, k) => [
    165 * f * Math.pow(18, k / 23) * rng.range(0.95, 1.05),
    0.075 * Math.pow(1 / (1 + k * 0.18), 0.7),
    rng.sign() * rng.range(0.3, 1.0),
  ]);
  const y = modalBank(exc, modes, ns(dur));
  st.addMono(normalizePeak(fadeEnds(y, 0.0003, 0.015), 1), { at, g: amp * 0.85, pan });
  noiseBurst(st, rng, at, 120 * f, 420 * f, 0.0012, 0.045, amp * 0.48, { pan, src: pinkNoise });
}

export function modalCeramic(st, rng, { at = 0, f = 1.0, amp = 0.85, ring = 0.22, pan = 0 } = {}) {
  const exc = bandNoise(rng, ns(0.004), 400, 7000, whiteNoise);
  fadeEnds(exc, 0.0002, 0.002);
  const ratios = [1, 1.52, 1.94, 2.33, 2.76, 3.21, 3.88, 4.42];
  const modes = ratios.map((k, i) => [1180 * f * k * rng.range(0.985, 1.015), ring / (1 + 0.4 * i), (1 / (1 + i * 0.45)) * rng.sign()]);
  const y = modalBank(exc, modes, ns(ring * 1.4 + 0.04));
  st.addMono(normalizePeak(fadeEnds(y, 0.0002, 0.012), 1), { at, g: amp * 0.8, pan });
  noiseBurst(st, rng, at, 1500, 4800, 0.0003, 0.009, amp * 0.45, { pan });
}

export function modalMetal(st, rng, { at = 0, f = 180, amp = 0.9, t60 = 1.1, pan = 0 } = {}) {
  const exc = bandNoise(rng, ns(0.005), 300, 9500, whiteNoise);
  fadeEnds(exc, 0.00015, 0.003);
  const modes = Array.from({ length: 36 }, (_, k) => {
    const freq = f * Math.pow(24, Math.pow(k / 35, 0.82)) * rng.range(0.97, 1.03);
    return [freq, t60 * Math.pow(f / freq, 0.52) * rng.range(0.65, 1.35), Math.pow(f / freq, 0.28) * rng.sign()];
  });
  const y = modalBank(exc, modes, ns(Math.min(2.5, t60 * 1.15)));
  st.addMono(normalizePeak(fadeEnds(y, 0.0002, 0.06), 1), { at, g: amp * 0.85, pan });
}

export function clothFlap(st, rng, { at = 0, dur = 0.8, rate = 9, amp = 0.7, pan = 0 } = {}) {
  for (const t of poissonTimes(rng, dur, rate)) {
    const L = rng.range(0.035, 0.08);
    const m = ns(L);
    const x = bandNoise(rng, m, 180, 1900, pinkNoise);
    for (let i = 0; i < m; i++) {
      const u = i / m;
      x[i] *= Math.pow(u, 1.6) * Math.min(1, (1 - u) * 5);
    }
    const p = clamp(pan + rng.range(-0.3, 0.3), -1, 1);
    st.addMono(normalizePeak(x, 1), { at: at + t, g: amp * 0.42, pan: p });
    noiseBurst(st, rng, at + t + L * 0.84, 140, 820, 0.0012, 0.028, amp * 0.36, { pan: p, src: pinkNoise });
  }
}

export function airWind(st, rng, { at = 0, dur = 2.0, amp = 0.55, f = 680, gusty = 1.0 } = {}) {
  const n = ns(dur);
  const g1 = wander(rng, n, 1.6);
  const g2 = wander(rng, n, 4.2);
  for (const ch of [0, 1]) {
    const x = pinkNoise(rng, n);
    const b = bandNoise(rng, n, 28, 125, brownNoise);
    svf(x, (t) => {
      const i = Math.min(n - 1, Math.floor(t * SR));
      return f * clamp(1 + gusty * (0.28 * g1[i] + 0.16 * g2[i]), 0.35, 1.8);
    }, 0.85, "bp");
    lp4(x, 3400);
    for (let i = 0; i < n; i++) {
      const env = smooth01(i / ns(0.12)) * smooth01((n - i) / ns(0.18));
      const sp = clamp(1 + gusty * (0.28 * g1[i] + 0.16 * g2[i]), 0.25, 1.7);
      x[i] *= env * sp * sp;
      b[i] *= env * Math.pow(sp, 2.2);
    }
    mixInto(ch ? st.r : st.l, normalizeRms(x, 0.18), amp * 0.62, at);
    mixInto(ch ? st.r : st.l, normalizeRms(b, 0.18), amp * 0.45, at);
  }
}

export function dopplerWhoosh(st, rng, { at = 0, dur = 0.45, f0 = 200, f1 = 1650, amp = 0.85, pan0 = -0.65, pan1 = 0.65 } = {}) {
  const n = ns(dur);
  const x = pinkNoise(rng, n);
  svf(x, (t) => {
    const u = t / dur;
    return f0 + (f1 - f0) * Math.sin(Math.PI * u);
  }, 1.35, "bp");
  for (let i = 0; i < n; i++) x[i] *= Math.pow(Math.sin((Math.PI * i) / n), 1.5);
  st.addMono(normalizePeak(fadeEnds(x, 0.008, 0.02), 1), {
    at, g: amp, pan: (u) => lerp(pan0, pan1, clamp(u / dur)),
  });
}

export function subDrop(st, _rng, { at = 0, dur = 1.25, f0 = 92, f1 = 30, amp = 0.95, pan = 0 } = {}) {
  pitchThud(st, at, f0, f1, dur, amp, { glide: 0.18, atk: 0.006, drive: 1.5, h2: 0.22, pan });
}

// Declarative physical SFX dispatcher (zero hardcoded character presets!)
export function renderPhysicalSfx(kind, params = {}, seed = 101) {
  const rng = createRng(seed);
  const dur = Math.max(0.35, Number(params.dur ?? 1.4));
  const pad = Math.min(2.4, dur + 0.9);
  const st = StereoBuf.fromSeconds(pad);
  const o = { at: 0, ...params };
  switch (kind) {
    case "blast":
    case "friedlander_blast": friedlanderBlast(st, 0, o); break;
    case "nwave":
    case "sonic_crack": supersonicNWave(st, 0, o); break;
    case "boom":
    case "explosion": layeredBoom(st, rng, o); break;
    case "shock_ring":
    case "shockwave": shockRing(st, rng, o); break;
    case "rumble":
    case "thunder": rollingRumble(st, rng, o); break;
    case "seismic":
    case "groundwave": seismicWave(st, rng, o); break;
    case "grit":
    case "debris": debrisGrit(st, rng, o); break;
    case "flame":
    case "fire": turbulentFlame(st, rng, o); break;
    case "energy":
    case "aura":
    case "ki": movingAirEnergy(st, rng, o); break;
    case "arcs":
    case "lightning": electricArcs(st, rng, o); break;
    case "gather":
    case "charge": inwardGather(st, rng, o); break;
    case "splash": waterSplash(st, rng, o); break;
    case "drops":
    case "rain_drops": waterDrops(st, rng, o); break;
    case "rock":
    case "rock_fracture": rockFracture(st, rng, o); break;
    case "crunch": materialCrunch(st, rng, o); break;
    case "grind": stoneGrind(st, rng, o); break;
    case "dust": earthDust(st, rng, o); break;
    case "body":
    case "punch":
    case "hit": bodyImpact(st, rng, o); break;
    case "wood": modalWood(st, rng, o); break;
    case "ceramic":
    case "glass": modalCeramic(st, rng, o); break;
    case "metal":
    case "blade":
    case "clang": modalMetal(st, rng, o); break;
    case "cloth":
    case "flap": clothFlap(st, rng, o); break;
    case "wind": airWind(st, rng, o); break;
    case "sub_drop": subDrop(st, rng, o); break;
    case "whiz":
    case "whoosh":
    default:
      dopplerWhoosh(st, rng, o);
      break;
  }
  return st;
}
