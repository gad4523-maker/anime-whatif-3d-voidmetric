#!/usr/bin/env node
// Voidmetric v4.1 Zero-Dependency Node.js Studio Re-Recording Mixer & Physical Audio Engine
// Usage: node audio_studio.mjs [--cues audio_cues.json] [--events events.json] [--out mix.wav]
// Features:
//   - Keeps narrator `voice/voice.wav` 100% untouched while carving a 1.9-3.0 kHz clarity pocket out of music & SFX
//   - Synthesizes bespoke physical SFX (`phys_sfx.mjs`) + custom uploaded WAV SFX (`sfx_files`)
//   - Places SFX acoustically inside each scene via parametric synthetic Room IR convolution (`createSpaceIR`)
//   - Auto-ingests picture-locked events from `events.json` (extracted from `story.ts` via `whatif_cli.py extract-events`)
//   - Bark-band perceptual stand-out check lifts masked hits so key impacts never vanish under music
//   - Pre-impact silence / draw-down ramps (`rises`) + <170 Hz punch ducking + transient-preserving de-harshing
//   - Bus glue compression + lookahead true-peak limiter + iterative ITU-R BS.1770-4 LUFS master (-14.5 LUFS, <= -1.1 dBTP)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SR, ns, clamp, smooth01, dbToLin, linToDb, StereoBuf, mixInto,
  biquadCoef, hp, createSpaceIR, convolveStereo, measureStandOutDb,
  measureLUFS, measureTruePeakDb, truePeakEnvelope, readAudio48k, writeWav,
} from "./dsp_core.mjs";
import { renderPhysicalSfx } from "./phys_sfx.mjs";
import { renderParametricScore } from "./phys_inst.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.dirname(HERE);
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};

const VOICE_WAV = path.join(PROJ, "voice", "voice.wav");
const WORDS_JSON = path.join(PROJ, "voice", "words.json");
const CUES_JSON = path.resolve(HERE, arg("cues", "audio_cues.json"));
const EVENTS_JSON = path.resolve(HERE, arg("events", "events.json"));
const OUT_MIX = path.resolve(HERE, arg("out", "mix.wav"));

function envelopeFollower(stereo, atkSec = 0.012, relSec = 0.16) {
  const y = new Float32Array(stereo.n);
  const ka = Math.exp(-1 / (atkSec * SR));
  const kr = Math.exp(-1 / (relSec * SR));
  let e = 0;
  for (let i = 0; i < stereo.n; i++) {
    const v = Math.max(Math.abs(stereo.l[i]), Math.abs(stereo.r[i]));
    e = v > e ? ka * e + (1 - ka) * v : kr * e + (1 - kr) * v;
    y[i] = e;
  }
  return y;
}

// Dynamic spectral voice-presence carving (ducks only 1.9-3.0 kHz clarity band when narrator speaks!)
function carveVoicePresence(target, voiceEnv, refLin, maxCutDb = 4.5, freqHz = 2350, q = 0.65) {
  const cutDepth = 1 - dbToLin(-maxCutDb);
  const [b0, b1, b2, a1, a2] = biquadCoef("bp", freqHz, q);
  for (const ch of [target.l, target.r]) {
    let z1 = 0, z2 = 0;
    for (let i = 0; i < target.n; i++) {
      const v = ch[i];
      const bpVal = b0 * v + z1;
      z1 = b1 * v - a1 * bpVal + z2;
      z2 = b2 * v - a2 * bpVal;
      const amt = smooth01(voiceEnv[i] / Math.max(1e-6, refLin));
      if (amt > 0.001) ch[i] = v - bpVal * cutDepth * amt;
    }
  }
}

// Broadband + double-depth low-end (<170 Hz) punch ducking on big impacts
function applyImpactDucks(target, ducks, scale = 1.0, duckLow = true) {
  if (!ducks.length) return;
  const gDb = new Float32Array(target.n);
  for (const [t, depthDb, relSec, holdSec] of ducks) {
    const i0 = Math.max(0, Math.round((t - 0.014) * SR));
    const i1 = Math.min(target.n, Math.round((t + holdSec) * SR));
    const i2 = Math.min(target.n, Math.round((t + holdSec + relSec * 3.0) * SR));
    for (let i = i0; i < i2; i++) {
      const v = scale * (i < i1 ? depthDb * smooth01((i - i0) / Math.max(1, ns(0.014))) : depthDb * Math.exp(-(i - i1) / (relSec * SR)));
      if (v > gDb[i]) gDb[i] = v;
    }
  }
  const [b0, b1, b2, a1, a2] = biquadCoef("lp", 170, 0.6);
  for (const ch of [target.l, target.r]) {
    let z1 = 0, z2 = 0;
    for (let i = 0; i < target.n; i++) {
      const v = ch[i];
      const low = b0 * v + z1;
      z1 = b1 * v - a1 * low + z2;
      z2 = b2 * v - a2 * low;
      if (gDb[i] > 0.01) {
        const lowCut = duckLow ? low * (1 - dbToLin(-Math.min(8, gDb[i]))) : 0;
        ch[i] = (v - lowCut) * dbToLin(-gDb[i]);
      }
    }
  }
}

// Pre-impact silence / draw-down ramp so climactic blows land with theatrical weight!
function applyPreImpactRises(music, sfx, rises, fps) {
  if (!rises.length) return;
  for (const r of rises) {
    const tHit = r.t ?? (r.f / fps);
    const rampSec = (r.rampFrames ?? 10) / fps;
    const shutSec = (r.shutFrames ?? 2.5) / fps;
    const holdDb = r.holdDb ?? -9.5;
    const shutDb = r.shutDb ?? -19.0;
    const liftDb = r.liftDb ?? 2.5;
    const a = Math.max(0, Math.round((tHit - rampSec) * SR));
    const aMid = Math.max(a + 1, Math.round((tHit - rampSec * 0.55) * SR));
    const s0 = Math.max(0, Math.round((tHit - shutSec - 0.015) * SR));
    const s1 = Math.max(s0 + 1, Math.round((tHit - shutSec) * SR));
    const e0 = Math.max(s1 + 1, Math.round((tHit - 0.004) * SR));
    const e1 = Math.min(music.n, Math.round(tHit * SR));
    for (let i = Math.min(a, s0); i < e1; i++) {
      const h = rampSec > 0 ? holdDb * smooth01((i - a) / Math.max(1, aMid - a)) : 0;
      const q = i < s0 ? 0 : i < s1 ? smooth01((i - s0) / Math.max(1, s1 - s0)) : 1;
      const dB = (h + (shutDb - holdDb) * q) * (i < e0 ? 1 : smooth01((e1 - i) / Math.max(1, e1 - e0)));
      const g = dbToLin(dB);
      music.l[i] *= g; music.r[i] *= g;
    }
    if (liftDb > 0.1) {
      const b1 = Math.min(sfx.n, Math.round((tHit + 0.18) * SR));
      const b2 = Math.min(sfx.n, Math.round((tHit + 0.34) * SR));
      for (let i = e1; i < b2; i++) {
        const u = i < b1 ? 1 : smooth01((b2 - i) / Math.max(1, b2 - b1));
        const g = dbToLin(liftDb * u);
        sfx.l[i] *= g; sfx.r[i] *= g;
      }
    }
  }
}

// Transient-preserving sustained 2.2-5.5 kHz harshness control (keeps sharp attacks, softens fatiguing hiss)
function tameSustainHarsh(stereo, maxCutDb = 4.5) {
  const [b0, b1, b2, a1, a2] = biquadCoef("bp", 3200, 0.75);
  let zl1 = 0, zl2 = 0, zr1 = 0, zr2 = 0;
  let fast = 0, slow = 0;
  const kf = 1 - Math.exp(-1 / (0.0018 * SR));
  const ks = 1 - Math.exp(-1 / (0.055 * SR));
  for (let i = 0; i < stereo.n; i++) {
    const ul = stereo.l[i], ur = stereo.r[i];
    const bl = b0 * ul + zl1; zl1 = b1 * ul - a1 * bl + zl2; zl2 = b2 * ul - a2 * bl;
    const br = b0 * ur + zr1; zr1 = b1 * ur - a1 * br + zr2; zr2 = b2 * ur - a2 * br;
    const m = Math.max(Math.abs(bl), Math.abs(br));
    fast += (m - fast) * kf;
    slow += (m - slow) * ks;
    const sustain = clamp((slow / (fast + 1e-6)) * 1.15 - 0.15, 0, 1);
    const k = 1 - dbToLin(-maxCutDb * smooth01(sustain));
    stereo.l[i] = ul - bl * k;
    stereo.r[i] = ur - br * k;
  }
}

// Gentle sidechain-HPF stereo bus glue compressor
function busGlue(stereo, { thrDb = -15, ratio = 1.55, atk = 0.025, rel = 0.2 } = {}) {
  const [b0, b1, b2, a1, a2] = biquadCoef("hp", 110, 0.707);
  let zl1 = 0, zl2 = 0, zr1 = 0, zr2 = 0;
  let p = 0, envDb = 0, maxGr = 0;
  const ka = Math.exp(-1 / (atk * SR));
  const kr = Math.exp(-1 / (rel * SR));
  for (let i = 0; i < stereo.n; i++) {
    const ul = stereo.l[i], ur = stereo.r[i];
    const hl = b0 * ul + zl1; zl1 = b1 * ul - a1 * hl + zl2; zl2 = b2 * ul - a2 * hl;
    const hr = b0 * ur + zr1; zr1 = b1 * ur - a1 * hr + zr2; zr2 = b2 * ur - a2 * hr;
    p += (0.5 * (hl * hl + hr * hr) - p) * 0.0018;
    const lvlDb = 10 * Math.log10(p + 1e-9);
    const over = Math.max(0, lvlDb - thrDb) * (1 - 1 / ratio);
    envDb = over > envDb ? ka * envDb + (1 - ka) * over : kr * envDb + (1 - kr) * over;
    if (envDb > maxGr) maxGr = envDb;
    const g = dbToLin(-envDb);
    stereo.l[i] *= g;
    stereo.r[i] *= g;
  }
  return maxGr;
}

// Lookahead true-peak brickwall limiter (clean, zero distortion)
function lookaheadLimit(stereo, { ceilDb = -1.1, lookSec = 0.005, relSec = 0.1 } = {}) {
  const n = stereo.n;
  const ceil = dbToLin(ceilDb);
  const pl = truePeakEnvelope(stereo.l);
  const pr = truePeakEnvelope(stereo.r);
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) req[i] = Math.min(1, ceil / Math.max(1e-9, pl[i], pr[i]));
  const L = Math.max(1, ns(lookSec));
  const minG = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tail > head && req[dq[tail - 1]] >= req[i]) tail--;
    dq[tail++] = i;
    while (dq[head] > i + L - 1) head++;
    minG[i] = req[dq[head]];
  }
  const kr = 1 - Math.exp(-1 / (relSec * SR));
  let cur = 1, acc = 0, worst = 1;
  for (let i = 0; i < n; i++) {
    cur = Math.min(minG[i], cur + (1 - cur) * kr);
    req[i] = cur;
  }
  for (let i = 0; i < n; i++) {
    acc += req[i];
    if (i >= L) acc -= req[i - L];
    const g = acc / Math.min(L, i + 1);
    if (g < worst) worst = g;
    stereo.l[i] *= g;
    stereo.r[i] *= g;
  }
  return linToDb(worst);
}

function buildSpeechDuckCurve(words, n) {
  const spans = [];
  for (const w of words) {
    const s = Number(w.start), e = Number(w.end);
    if (spans.length && s - spans[spans.length - 1][1] < 0.22) {
      spans[spans.length - 1][1] = Math.max(spans[spans.length - 1][1], e);
    } else {
      spans.push([s, e]);
    }
  }
  const ctrlHz = 500;
  const durS = n / SR;
  const nc = Math.ceil(durS * ctrlHz) + 4;
  const va = new Float32Array(nc);
  for (const [s, e] of spans) {
    const a = Math.max(0, Math.floor((s - 0.06) * ctrlHz));
    const b = Math.min(nc, Math.ceil((e + 0.10) * ctrlHz));
    for (let i = a; i < b; i++) va[i] = 1;
  }
  const ka = 1 - Math.exp(-1 / (0.05 * ctrlHz));
  const kr = 1 - Math.exp(-1 / (0.32 * ctrlHz));
  const env = new Float32Array(nc);
  let cur = 0;
  for (let i = 0; i < nc; i++) {
    cur += (va[i] - cur) * (va[i] > cur ? ka : kr);
    env[i] = cur;
  }
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = (i / SR) * ctrlHz;
    const i0 = Math.min(nc - 1, Math.floor(pos));
    const i1 = Math.min(nc - 1, i0 + 1);
    const e = env[i0] + (env[i1] - env[i0]) * (pos - i0);
    curve[i] = dbToLin(-3.2 * e);
  }
  return curve;
}

function main() {
  const cfg = fs.existsSync(CUES_JSON) ? JSON.parse(fs.readFileSync(CUES_JSON, "utf-8")) : {};
  const words = fs.existsSync(WORDS_JSON) ? (JSON.parse(fs.readFileSync(WORDS_JSON, "utf-8")).words ?? []) : [];
  const picEvents = fs.existsSync(EVENTS_JSON) ? (JSON.parse(fs.readFileSync(EVENTS_JSON, "utf-8")).events ?? []) : [];
  const fps = Number(cfg.fps ?? 30);

  const hasVoice = fs.existsSync(VOICE_WAV);
  const rawVoice = hasVoice ? readAudio48k(VOICE_WAV) : null;
  const durS = cfg.total_frames
    ? Number(cfg.total_frames) / fps
    : rawVoice
      ? Math.ceil((rawVoice.n / SR) * fps) / fps
      : Number(cfg.duration_s ?? 13.0);
  const n = ns(durS);

  const voice = new StereoBuf(n);
  if (rawVoice) voice.addStereo(rawVoice, { at: 0, g: 1.0 });

  // 1. Music stem: custom WAV if supplied, otherwise clean-room physical-instrument score!
  let music = new StereoBuf(n);
  if (cfg.music_wav) {
    const mp = path.isAbsolute(cfg.music_wav) ? cfg.music_wav : path.join(HERE, cfg.music_wav);
    if (fs.existsSync(mp)) {
      music.addStereo(readAudio48k(mp), { at: 0, g: 1.0 });
    } else {
      music = renderParametricScore(cfg, durS);
    }
  } else {
    music = renderParametricScore(cfg, durS);
  }

  // 1b. Pre-level music stem against narrator loudness so Bark-band stand-out measurements compare against final music level!
  const voiceLufs = hasVoice ? measureLUFS(voice) : -18.0;
  if (words.length) {
    const duck = buildSpeechDuckCurve(words, n);
    for (let i = 0; i < n; i++) { music.l[i] *= duck[i]; music.r[i] *= duck[i]; }
  }
  const mLufs = measureLUFS(music);
  if (mLufs > -65) music.gain(dbToLin((voiceLufs - 10.5) - mLufs));

  // 2. Merge explicit audio_cues.json cues + auto-extracted picture events from story.ts!
  const allCues = [];
  for (const c of (cfg.cues ?? [])) allCues.push({ source: "cues_json", ...c });
  for (const ev of picEvents) {
    const t = ev.t ?? (Number(ev.f ?? 0) / fps);
    // Avoid duplicating a manual cue within 2 frames of the same kind
    const dup = allCues.some((c) => Math.abs((c.t ?? 0) - t) < 2.2 / fps && c.kind === ev.kind);
    if (!dup) {
      allCues.push({
        source: "story_event",
        t,
        f: ev.f,
        kind: ev.kind,
        gain: ev.gain ?? 0.72,
        dur: ev.dur,
        pan: ev.pan,
        lane: ev.lane ?? "hits",
        duckDb: ev.duckDb,
        riseFrames: ev.riseFrames,
        space: ev.space,
        params: ev.params ?? {},
        label: ev.label ?? `${ev.kind} (auto f${ev.f})`,
      });
    }
  }
  allCues.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

  // 3. Render SFX cues + optional parametric acoustic room IR convolution + Bark stand-out check!
  const sfx = new StereoBuf(n);
  const sfxMap = cfg.sfx_files ?? {};
  const loadedFiles = new Map();
  const irCache = new Map();
  const defaultSpace = cfg.default_space ?? null;
  const ducks = [];
  const rises = Array.isArray(cfg.rises) ? [...cfg.rises] : [];
  const cueLog = [];

  const getSpaceIR = (spec) => {
    if (!spec) return null;
    const key = JSON.stringify(spec);
    if (!irCache.has(key)) irCache.set(key, createSpaceIR(spec));
    return irCache.get(key);
  };

  for (let idx = 0; idx < allCues.length; idx++) {
    const c = allCues[idx];
    const t0 = Number(c.t ?? (Number(c.f ?? 0) / fps));
    const kind = String(c.kind ?? "whoosh");
    const lane = String(c.lane ?? "hits");
    let gain = Number(c.gain ?? 0.65);

    let sig;
    if (kind === "file" || sfxMap[kind]) {
      const fKey = c.file ?? kind;
      const fname = sfxMap[fKey] ?? fKey;
      const fp = path.isAbsolute(fname) ? fname : path.join(HERE, fname);
      if (fs.existsSync(fp)) {
        if (!loadedFiles.has(fp)) loadedFiles.set(fp, readAudio48k(fp));
        const raw = loadedFiles.get(fp);
        const maxN = Math.min(raw.n, ns(Number(c.dur ?? 2.2)));
        sig = raw.slice(0, maxN / SR);
      } else {
        sig = renderPhysicalSfx(fKey.includes("boom") ? "boom" : "whoosh", { dur: c.dur ?? 1.1, pan: c.pan ?? 0 }, 300 + idx);
      }
    } else {
      sig = renderPhysicalSfx(kind, { dur: c.dur, pan: c.pan ?? 0, ...(c.params ?? {}) }, 500 + idx * 17);
    }

    // Optional parametric synthetic room reverb IR convolution
    const spSpec = c.space === false ? null : (c.space ?? defaultSpace);
    const wet = Number(c.wet ?? (spSpec?.wet ?? 0.24));
    if (spSpec && wet > 0.01 && lane !== "amb") {
      const ir = getSpaceIR(spSpec);
      const conv = convolveStereo(sig, ir);
      const dryWet = new StereoBuf(Math.max(sig.n, conv.n));
      dryWet.addStereo(sig, { at: 0, g: 1.0 });
      dryWet.addStereo(conv, { at: 0, g: wet });
      sig = dryWet;
    }

    // Bark-band perceptual stand-out check against music (lifts buried impacts gently)
    let liftDb = 0;
    if (lane !== "amb" && music.peak() > 1e-4) {
      const needDb = lane === "hero" ? 4.5 : lane === "hits" ? 1.5 : -1.5;
      const so = measureStandOutDb(sig, gain, Math.round(t0 * SR), music);
      liftDb = clamp(needDb - so, 0, lane === "hero" ? 5.5 : 3.5);
      gain *= dbToLin(liftDb);
    }

    // Soft per-cue peak safety
    const pk = sig.peak() * gain;
    if (pk > 0.95) gain *= 0.95 / pk;

    sfx.addStereo(sig, { at: t0, g: gain });
    if (c.duckDb || lane === "hero") {
      const dk = Number(c.duckDb ?? (lane === "hero" ? 4.5 : 0));
      if (dk > 0.2) ducks.push([t0, dk, dk >= 4 ? 0.24 : 0.15, 0.06]);
    }
    if (c.riseFrames && Number(c.riseFrames) > 0) {
      rises.push({ t: t0, rampFrames: Number(c.riseFrames), shutFrames: 2.5, holdDb: -10, shutDb: -19, liftDb: 2.5 });
    }
    cueLog.push(
      `- \`${t0.toFixed(2).padStart(5)}s\` (f${String(Math.round(t0 * fps)).padStart(4)}) | \`${kind.padEnd(14)}\` | lane \`${lane}\` | lift \`+${liftDb.toFixed(1)} dB\` | ${c.label ?? c.source}`
    );
  }

  // 4. Studio Re-Recording Balance, Presence Carving, Impact Ducking & Pre-Impact Rises
  const sLufs = measureLUFS(sfx);
  if (sLufs > -65) sfx.gain(dbToLin((voiceLufs - 7.5) - sLufs));

  if (hasVoice) {
    const vEnv = envelopeFollower(voice, 0.012, 0.16);
    const vRef = dbToLin(voiceLufs + 3.0);
    carveVoicePresence(music, vEnv, vRef, 4.2, 2300, 0.68);
    carveVoicePresence(sfx, vEnv, vRef, 5.0, 2800, 0.58);
  }
  tameSustainHarsh(sfx, 4.5);
  applyImpactDucks(music, ducks, 1.0, true);
  applyPreImpactRises(music, sfx, rises, fps);

  // 5. Master Bus Sum, Subsonic HPF, Glue Compression & Iterative BS.1770-4 LUFS Mastering
  const master = new StereoBuf(n);
  master.addStereo(voice);
  master.addStereo(music);
  master.addStereo(sfx);
  hp(master.l, 24);
  hp(master.r, 24);

  const targetLufs = Number(cfg.target_lufs ?? -14.5);
  const ceilDb = Number(cfg.true_peak_db ?? -1.1);
  const preLufs = measureLUFS(master);
  const preGain = preLufs > -65 ? dbToLin(targetLufs - preLufs) : 1.0;
  master.gain(preGain);
  const glueGr = busGlue(master, { thrDb: targetLufs - 0.5, ratio: 1.5 });

  let trim = 1.0, limWorst = 0;
  const baseCopy = master.clone();
  for (let it = 0; it < 4; it++) {
    master.l.set(baseCopy.l);
    master.r.set(baseCopy.r);
    master.gain(trim);
    limWorst = lookaheadLimit(master, { ceilDb, lookSec: 0.005, relSec: 0.1 });
    const cur = measureLUFS(master);
    if (cur <= -65 || Math.abs(cur - targetLufs) < 0.08) break;
    trim *= dbToLin(targetLufs - cur);
  }
  // Final safety true-peak check
  const tpCheck = measureTruePeakDb(master);
  if (tpCheck > ceilDb) master.gain(dbToLin(ceilDb - 0.02 - tpCheck));

  // Smooth 15ms tail fade-out
  const tailN = Math.min(n, ns(0.02));
  for (let i = 0; i < tailN; i++) {
    const g = i / tailN;
    master.l[n - 1 - i] *= g;
    master.r[n - 1 - i] *= g;
  }

  writeWav(OUT_MIX, master, 24);
  if (hasVoice) writeWav(path.join(HERE, "stem_voice.wav"), voice.clone().gain(preGain * trim), 24);
  writeWav(path.join(HERE, "stem_music.wav"), music.clone().gain(preGain * trim), 24);
  writeWav(path.join(HERE, "stem_sfx.wav"), sfx.clone().gain(preGain * trim), 24);

  const finalLufs = measureLUFS(master);
  const finalTp = measureTruePeakDb(master);
  const report = [
    `# Voidmetric v4.1 Physical Audio Studio Report`,
    ``,
    `- **Master Mix:** \`${finalLufs.toFixed(2)} LUFS\` | True Peak: \`${finalTp.toFixed(2)} dBTP\` | Duration: \`${durS.toFixed(3)} s\``,
    `- **Bus Glue Max GR:** \`-${glueGr.toFixed(2)} dB\` | **Limiter Max GR:** \`${limWorst.toFixed(2)} dB\``,
    `- **Cues Placed:** \`${allCues.length}\` (auto-snapped from \`events.json\`: \`${picEvents.length}\`) | **Pre-Impact Rises:** \`${rises.length}\``,
    `- **Voiceover Stem:** ${hasVoice ? `\`${measureLUFS(voice.clone().gain(preGain * trim)).toFixed(2)} LUFS\` (100% original untouched + 1.9-3.0 kHz clarity carve)` : "*(instrumental / SFX test render — no voice.wav)*"}`,
    ``,
    `## Cue Sheet`,
    ...(cueLog.length ? cueLog : ["- *(no SFX cues configured yet)*"]),
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(HERE, "cues_report.md"), report, "utf-8");
  console.log(`Mastered ${OUT_MIX} | ${finalLufs.toFixed(2)} LUFS | ${finalTp.toFixed(2)} dBTP | cues=${allCues.length}`);
}

main();
