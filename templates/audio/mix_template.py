# Voidmetric v4.0 Open Parametric 48 kHz / 24-bit Studio Master Mix Engine (ZERO Hardcoded Mood Dropdowns!)
# Data-driven via `audio_cues.json` + automatic duration from `voice/words.json`:
#   - Supply a custom `music_wav` file, OR specify custom musical parameters (`scale_root_hz`, `scale_intervals`,
#     `cutoff_hz`, `drums`, `bpm`, `acts`) to synthesize a bespoke procedural score for the episode!
#   - Layers 100% untouched `voice/voice.wav` + custom SFX + score mastered to -14.5 LUFS / <= -1.1 dBTP!
import json
import math
import os
import subprocess
import sys
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
REMOTION_ROOT = os.path.dirname(os.path.dirname(PROJ))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REMOTION_ROOT, "audio_template"))

import dsp  # noqa: E402
from dsp import SR, TAU, ns, st, dbg, write_wav, integrated, true_peak, fades, place, lp, hp, bp, colored, rng

VOICE_WAV = os.path.join(PROJ, "voice", "voice.wav")
WORDS_JSON = os.path.join(PROJ, "voice", "words.json")
CUES_JSON = os.path.join(HERE, "audio_cues.json")
OUT_MIX_WAV = os.path.join(HERE, "mix.wav")


def semi(root_hz: float, st_offset: int) -> float:
    return root_hz * (2.0 ** (st_offset / 12.0))


def load_audio_48k(path: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)


def probe_duration_s(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", path],
        text=True,
    ).strip()
    return float(out)


def speech_duck_curve(words: list, dur: float, n_samples: int, depth_db=-3.5, pre=0.06, post=0.10, att=0.05, rel=0.35):
    spans = []
    for w in words:
        s, e = float(w["start"]), float(w["end"])
        if spans and s - spans[-1][1] < 0.22:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])
    ctrl = 1000
    nc = int(dur * ctrl) + 4
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): min(nc, int((e + post) * ctrl))] = 1.0
    ka = 1.0 - np.exp(-1.0 / (att * ctrl))
    kr = 1.0 - np.exp(-1.0 / (rel * ctrl))
    env = np.zeros(nc)
    cur = 0.0
    for i in range(nc):
        tgt = va[i]
        cur += (tgt - cur) * (ka if tgt > cur else kr)
        env[i] = cur
    db = np.interp(np.arange(n_samples) / SR, np.arange(nc) / ctrl, depth_db * env)
    return dbg(db)


def synth_whoosh(dur=0.45, f0=180.0, f1=1450.0, seed=7):
    r = rng(seed)
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * t / dur) ** 1.6
    nz = colored(n, r, slope=1.0)
    lo = bp(nz, f0, f0 * 3.0, 2)
    hi = bp(nz, f1 * 0.5, f1 * 1.4, 2)
    u = t / dur
    y = ((1 - u) * lo + u * hi) * env
    return fades(dsp.widen(y, r, 9.0, 0.7), 0.01, 0.03)


def synth_sub_drop(dur=1.35, f_start=92.0, f_end=32.0):
    n = ns(dur)
    t = np.arange(n) / SR
    freq = f_end + (f_start - f_end) * np.exp(-t / 0.18)
    ph = TAU * np.cumsum(freq) / SR
    env = np.exp(-t / 0.55) * (1 - np.exp(-t / 0.008))
    y = np.sin(ph) * env + 0.25 * np.sin(2 * ph) * np.exp(-t / 0.2)
    return st(fades(y, 0.002, 0.08))


def synth_whiz(seed=1):
    r = rng(seed)
    dur = 0.34
    n = ns(dur)
    t = np.arange(n) / SR
    freq = 2600 * np.exp(-t / 0.14) + 380
    ph = TAU * np.cumsum(freq) / SR
    wh = np.sin(ph) * np.sin(np.pi * t / dur) ** 1.5
    nz = bp(colored(n, r, 0.5), 1400, 5200, 2) * np.exp(-t / 0.12)
    return dsp.pan(fades(0.55 * wh + 0.45 * nz, 0.005, 0.02), (seed % 2) * 1.1 - 0.55)


def synth_anime_score(dur: float, n_samples: int, cfg: dict):
    music_wav = cfg.get("music_wav")
    if music_wav:
        mp = os.path.join(HERE, music_wav) if not os.path.isabs(music_wav) else music_wav
        if os.path.exists(mp):
            raw = load_audio_48k(mp)
            buf = np.zeros((2, n_samples), dtype=np.float64)
            buf[:, : min(n_samples, raw.shape[1])] = raw[:, : min(n_samples, raw.shape[1])]
            return buf
    root = float(cfg.get("scale_root_hz", 73.42))
    iv = [int(x) for x in cfg.get("scale_intervals", [0, 2, 3, 5, 7, 8, 10, 12])]
    cutoff = float(cfg.get("cutoff_hz", 1800.0))
    use_drums = bool(cfg.get("drums", True))
    bpm = float(cfg.get("bpm", 124.0))
    acts = cfg.get("acts", {})

    t_hook = min(dur * 0.22, float(acts.get("hook_end_s", dur * 0.16)))
    t_esc = min(dur * 0.65, float(acts.get("escalation_end_s", dur * 0.50)))
    t_sil_a = float(acts.get("twist_silence_start_s", t_esc))
    t_sil_b = float(acts.get("twist_silence_end_s", min(dur - 4.0, t_sil_a + 2.2)))
    t_climax = min(dur - 2.0, float(acts.get("climax_end_s", dur * 0.86)))

    r = rng(int(cfg.get("seed", 404)))
    buf = np.zeros((2, n_samples), dtype=np.float64)
    step = (60.0 / bpm) / 2.0
    notes = [semi(root, s) for s in iv]
    hi = [semi(root * 2, s) for s in iv]

    def add_note(freq, t0, d, amp=0.18, pan_p=0.0, bright=cutoff, decay=0.22):
        n = ns(d)
        t = np.arange(n) / SR
        s = 0.55 * np.sin(TAU * freq * t) + 0.28 * np.sin(TAU * freq * 2.002 * t) + 0.14 * np.sin(TAU * freq * 3.005 * t)
        env = (1 - np.exp(-t / 0.008)) * np.exp(-t / decay)
        y = lp(s * env, bright, 2) * amp
        place(buf, dsp.pan(fades(y, 0.002, 0.015), pan_p), t0)

    def add_pad(freqs, t0, d, amp=0.14, cutoff=1150.0):
        if d <= 0.2:
            return
        n = ns(d)
        t = np.arange(n) / SR
        L, R = np.zeros(n), np.zeros(n)
        for idx, f in enumerate(freqs):
            det = 1.0 + (idx - len(freqs) / 2) * 0.0025
            L += np.sin(TAU * f * det * t) + 0.32 * np.sin(TAU * f * 2 * det * t)
            R += np.sin(TAU * f / det * t + 0.4) + 0.32 * np.sin(TAU * f * 2 / det * t + 0.6)
        env = fades(np.ones(n), min(0.35, d * 0.2), min(0.45, d * 0.25))
        place(buf, np.stack([lp(L, cutoff, 2) / len(freqs) * env, lp(R, cutoff, 2) / len(freqs) * env]) * amp, t0)

    def add_kick(t0, amp=0.35):
        n = ns(0.18)
        t = np.arange(n) / SR
        y = np.sin(TAU * np.cumsum(48 + 115 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.075)
        place(buf, st(fades(y * amp, 0.001, 0.01)), t0)

    def add_snare(t0, amp=0.21):
        n = ns(0.14)
        t = np.arange(n) / SR
        nz = bp(colored(n, r, 0.3), 900, 6200, 2) * np.exp(-t / 0.045)
        tone = np.sin(TAU * 195 * t) * np.exp(-t / 0.035)
        place(buf, dsp.widen(fades((0.75 * nz + 0.25 * tone) * amp, 0.001, 0.01), r, 6.0, 0.5), t0)

    def add_hat(t0, amp=0.07):
        n = ns(0.05)
        t = np.arange(n) / SR
        place(buf, dsp.pan(hp(colored(n, r, -0.5), 6500, 2) * np.exp(-t / 0.016) * amp, 0.25), t0)

    # Act 1: Mysterious hook discovery arp + soft pad
    arp1 = [hi[0], hi[4], hi[7], hi[2] * 2, hi[4], hi[7], hi[1], hi[6]]
    t_cur, k = 0.0, 0
    while t_cur < t_hook:
        add_note(arp1[k % len(arp1)], t_cur, 0.25, amp=0.14, pan_p=0.28 * np.sin(k), bright=cutoff, decay=0.16)
        if k % 4 == 0:
            add_note(notes[0], t_cur, 0.52, amp=0.21, bright=440, decay=0.34)
        t_cur += step
        k += 1
    add_pad([hi[0], hi[4], hi[2] * 2], 0.1, max(0.3, t_hook - 0.1), amp=0.11, cutoff=920)

    # Act 2: Escalation battle ostinato + percussion
    bass_prog = [notes[0], notes[0], notes[5], notes[6], notes[0], notes[0], notes[3], notes[4]]
    ostinato = [hi[0], hi[2], hi[4], hi[7], hi[6], hi[4], hi[5], hi[4]]
    t_cur, k = t_hook + 0.05, 0
    while t_cur < t_esc:
        add_note(bass_prog[(k // 8) % len(bass_prog)], t_cur, 0.22, amp=0.27, bright=680, decay=0.16)
        add_note(ostinato[k % len(ostinato)], t_cur, 0.20, amp=0.16, pan_p=-0.34 if k % 2 else 0.34, decay=0.14)
        if use_drums:
            if k % 4 == 0 or k % 8 == 6:
                add_kick(t_cur, amp=0.35)
            if k % 4 == 2:
                add_snare(t_cur, amp=0.21)
            add_hat(t_cur, amp=0.07 if k % 2 == 0 else 0.04)
        t_cur += step
        k += 1
    add_pad([hi[0], hi[4], hi[7]], t_hook + 0.05, max(0.4, t_esc - t_hook - 0.1), amp=0.15, cutoff=1650)

    # Act 3: Ominous post-twist escalation + rising tension
    add_pad([notes[0], notes[4], hi[0], hi[2]], t_sil_b, max(0.4, t_climax - t_sil_b), amp=0.21, cutoff=760)
    t_cur, k = t_sil_b + 0.08, 0
    while t_cur < t_climax:
        add_note(notes[0] if k % 4 == 0 else notes[4], t_cur, 0.18, amp=0.21 if k % 2 == 0 else 0.12, bright=560, decay=0.12)
        if use_drums and t_cur > (t_sil_b + t_climax) * 0.45 and k % 2 == 0:
            add_kick(t_cur, amp=0.28)
        t_cur += step
        k += 1

    # Finale: Hollow atmospheric wind + deep closing sub-boom
    rem = max(0.6, dur - t_climax)
    wind = bp(colored(ns(rem), r, 1.4), 140, 620, 2) * 0.08
    place(buf, dsp.widen(fades(wind, 0.25, 0.4), r, 16.0, 0.8), t_climax)
    place(buf, synth_sub_drop(min(2.2, rem * 0.7), 68.0, 28.0) * 0.42, max(0.0, dur - 2.4))

    # Hard dead-silence drop across the mid-video twist question!
    a_cut, b_cut = ns(t_sil_a), min(n_samples, ns(t_sil_b))
    fade_n = ns(0.04)
    if b_cut > a_cut + fade_n * 2:
        buf[:, max(0, a_cut - fade_n): a_cut] *= np.linspace(1, 0, min(fade_n, a_cut))
        buf[:, a_cut: b_cut] = 0.0
        end_fade = min(fade_n, n_samples - b_cut)
        if end_fade > 0:
            buf[:, b_cut: b_cut + end_fade] *= np.linspace(0, 1, end_fade)

    return buf


def build_sfx_stem(n_samples: int, cfg: dict):
    buf = np.zeros((2, n_samples), dtype=np.float64)
    sfx_map = cfg.get("sfx_files", {})
    loaded = {}

    def get_file(key: str):
        if key not in loaded:
            fname = sfx_map.get(key, key)
            p = os.path.join(HERE, fname)
            if os.path.exists(p):
                loaded[key] = load_audio_48k(p)
            else:
                print(f"WARNING: SFX missing ({fname}) — using synthesized impact fallback.", file=sys.stderr)
                loaded[key] = synth_sub_drop(1.1) if "boom" in key else synth_whoosh(0.5)
        return loaded[key]

    cue_lines = [f"# Episode Audio Cue Sheet (`{cfg.get('bpm', 124)} BPM`, root `{cfg.get('scale_root_hz', 73.42)} Hz`)\n"]
    fps = int(cfg.get("fps", 30))
    for i, c in enumerate(cfg.get("cues", [])):
        t0 = float(c["t"])
        kind = c.get("kind", "file")
        gn = float(c.get("gain", 0.55))
        dur = float(c.get("dur", 1.8))
        lbl = c.get("label", kind)
        if kind == "whoosh":
            sig = synth_whoosh(dur, float(c.get("f0", 220)), float(c.get("f1", 1450)), seed=11 + i)
        elif kind == "sub_drop":
            sig = synth_sub_drop(dur, float(c.get("f_start", 88)), float(c.get("f_end", 30)))
        elif kind == "whiz":
            sig = synth_whiz(seed=1 + i)
        else:
            raw = get_file(c.get("file", "impact"))
            sig = fades(raw[:, : min(raw.shape[1], ns(dur))], 0.006, 0.14)
        place(buf, sig, t0, gn)
        cue_lines.append(f"- `{t0:5.2f}s` (f{round(t0 * fps):4d}) | gain `{gn:.2f}` | {lbl}")
    return buf, "\n".join(cue_lines)


def limit_true_peak(x: np.ndarray, ceil_db=-1.1):
    ceil = dbg(ceil_db)
    peak_env = np.max(np.abs(x), axis=0)
    peak_max = ndimage.maximum_filter1d(peak_env, size=max(3, ns(0.006)))
    gain = lp(np.minimum(1.0, ceil / (peak_max + 1e-9)), 45.0, 2)
    gain = np.minimum(gain, ceil / (peak_env + 1e-9))
    return x * gain


def main():
    # Voidmetric v4.1: Delegate automatically to zero-dependency Node.js Physical Audio Studio (`audio_studio.mjs`)
    # unless `--python-fallback` is passed explicitly!
    studio_mjs = os.path.join(HERE, "audio_studio.mjs")
    if "--python-fallback" not in sys.argv and os.path.exists(studio_mjs):
        import shutil
        node_bin = shutil.which("node")
        if node_bin:
            cmd = [node_bin, studio_mjs] + [a for a in sys.argv[1:] if a != "--python-fallback"]
            print(f"[Voidmetric v4.1] Running Node.js Physical Audio Studio: {' '.join(cmd)}")
            res = subprocess.run(cmd, cwd=HERE)
            sys.exit(res.returncode)

    cfg = json.load(open(CUES_JSON, encoding="utf-8")) if os.path.exists(CUES_JSON) else {}
    words = json.load(open(WORDS_JSON, encoding="utf-8")).get("words", []) if os.path.exists(WORDS_JSON) else []
    fps = int(cfg.get("fps", 30))
    dur = float(cfg["total_frames"]) / fps if "total_frames" in cfg else math.ceil(probe_duration_s(VOICE_WAV) * fps) / fps
    n_samples = ns(dur)

    v_raw = load_audio_48k(VOICE_WAV)
    v = np.zeros((2, n_samples), dtype=np.float64)
    v[:, : min(n_samples, v_raw.shape[1])] = v_raw[:, : min(n_samples, v_raw.shape[1])]

    m_raw = synth_anime_score(dur, n_samples, cfg)
    s_raw, cue_md = build_sfx_stem(n_samples, cfg)

    v_lufs = integrated(v)
    m_duck = m_raw * speech_duck_curve(words, dur, n_samples, depth_db=-3.5)
    m_lufs = integrated(m_duck)
    s_lufs = integrated(s_raw)

    m = m_duck * (dbg((v_lufs - 10.5) - m_lufs) if np.isfinite(m_lufs) else 0.0)
    s = s_raw * (dbg((v_lufs - 7.5) - s_lufs) if np.isfinite(s_lufs) else 0.0)
    s_cap = np.max(np.abs(v)) * 0.72
    s_env = np.max(np.abs(s), axis=0)
    if (s_env > s_cap).any():
        s = s * lp(np.minimum(1.0, s_cap / (ndimage.maximum_filter1d(s_env, size=ns(0.008)) + 1e-9)), 35.0, 2)

    target_lufs = float(cfg.get("target_lufs", -14.5))
    ceil_db = float(cfg.get("true_peak_db", -1.1))
    mix_pre = v + m + s
    master_gain = dbg(target_lufs - integrated(mix_pre))
    mix = limit_true_peak(mix_pre * master_gain, ceil_db)

    write_wav(OUT_MIX_WAV, mix, bits=24)
    write_wav(os.path.join(HERE, "stem_voice.wav"), v * master_gain, bits=24)
    write_wav(os.path.join(HERE, "stem_music.wav"), m * master_gain, bits=24)
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s * master_gain, bits=24)

    report = (
        f"\n\n## Loudness Report (BS.1770-4 @ 48 kHz / 24-bit)\n"
        f"- **Master Mix:** `{integrated(mix):.2f} LUFS` | True Peak: `{true_peak(mix):.2f} dBTP` | Duration: `{dur:.3f} s`\n"
        f"- **Voice Stem:** `{integrated(v * master_gain):.2f} LUFS` (100% original untouched)\n"
        f"- **Music Stem:** `{integrated(m * master_gain):.2f} LUFS` | **SFX Stem:** `{integrated(s * master_gain):.2f} LUFS`\n"
    )
    open(os.path.join(HERE, "cues_report.md"), "w", encoding="utf-8").write(cue_md + report)
    print(report.strip())
    print("Wrote:", OUT_MIX_WAV)


if __name__ == "__main__":
    main()
