# 48 kHz / 24-bit Studio Master Mix v2 (1-Minute 3D Anime Rigs Edition: 64.33 s = 1930 frames!)
# Uses mromidev's dsp.py (BS.1770-4 loudness + true peak + stereo placement + filters).
# Layers untouched voice_v2.wav + all 5 custom uploaded SFX aligned to the new 1930-frame cues + dynamic anime score!
import json
import os
import subprocess
import sys
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
REMOTION_ROOT = os.path.dirname(os.path.dirname(PROJ))
# Prefer local dsp.py scaffolded right inside projects/<slug>/audio/ (works standalone on Gemini Tasks & Colab!)
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REMOTION_ROOT, "audio_template"))

import dsp  # noqa: E402
from dsp import SR, TAU, ns, st, dbg, write_wav, integrated, true_peak, fades, place, lp, hp, bp, colored, rng

# Episode-specific master settings (update TOTAL_FRAMES & file names for each episode!)
TOTAL_FRAMES = 1800
VOICE_WAV = os.path.join(PROJ, "voice", "voice.wav")
WORDS_JSON = os.path.join(PROJ, "voice", "words.json")
OUT_MIX_WAV = os.path.join(HERE, "mix.wav")
DUR = TOTAL_FRAMES / 30.0
N = ns(DUR)
TARGET_LUFS = -14.5
CEIL_DBTP = -1.1


def load_audio_48k(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)


def load_voice():
    v = load_audio_48k(VOICE_WAV)
    out = np.zeros((2, N), dtype=np.float64)
    L = min(N, v.shape[1])
    out[:, :L] = v[:, :L]
    return out


def speech_duck_curve(words, depth_db=-3.4, pre=0.06, post=0.10, att=0.05, rel=0.35):
    spans = []
    for w in words:
        s, e = float(w["start"]), float(w["end"])
        if spans and s - spans[-1][1] < 0.22:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])
    ctrl = 1000
    nc = int(DUR * ctrl) + 4
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
    db = np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth_db * env)
    return dbg(db)


def synth_whoosh(dur=0.45, f0=180, f1=1450, seed=7):
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


def synth_sub_drop(dur=1.4, f_start=92.0, f_end=34.0):
    n = ns(dur)
    t = np.arange(n) / SR
    freq = f_end + (f_start - f_end) * np.exp(-t / 0.18)
    ph = TAU * np.cumsum(freq) / SR
    env = np.exp(-t / 0.55) * (1 - np.exp(-t / 0.008))
    y = np.sin(ph) * env + 0.25 * np.sin(2 * ph) * np.exp(-t / 0.2)
    return st(fades(y, 0.002, 0.08))


def synth_bullet_whiz(seed=1):
    r = rng(seed)
    dur = 0.34
    n = ns(dur)
    t = np.arange(n) / SR
    freq = 2600 * np.exp(-t / 0.14) + 380
    ph = TAU * np.cumsum(freq) / SR
    wh = np.sin(ph) * np.sin(np.pi * t / dur) ** 1.5
    nz = bp(colored(n, r, 0.5), 1400, 5200, 2) * np.exp(-t / 0.12)
    return dsp.pan(fades(0.55 * wh + 0.45 * nz, 0.005, 0.02), (seed % 2) * 1.1 - 0.55)


def synth_anime_score():
    """Original dynamic DBS-inspired orchestral/synth score timed to 64.33 s voice_v2.wav (D minor, 126 BPM):
    - 0.00-9.85s:  Mysterious morning discovery pulse (Kitchen wake & mug fade to zero)
    - 9.85-31.05s: Driving God-of-Destruction bass + brass/strings + drums (Beerus -> Wall -> Bullets -> Pebble!)
    - 31.05-33.42s: DEAD SILENT TWIST DROP ('Wait, why did a pebble do that?')
    - 33.42-54.05s: Ominous cosmic Destroyer sub-drone + intense ticking + rising dark strings (1->0 -> Burn -> Suns -> Split Earth)
    - 54.05-59.55s: Ethereal Angelic cyan shimmer chord (Whis 3-minute rewind!)
    - 59.55-64.33s: Stark hollow void wind + chilling deep sub-boom under final line ('no angel here to turn back the clock')
    """
    r = rng(404)
    buf = np.zeros((2, N), dtype=np.float64)
    bpm = 126.0
    beat = 60.0 / bpm
    step = beat / 2.0

    D2, F2, G2, A2, Bb2, C3 = 73.42, 87.31, 98.00, 110.00, 116.54, 130.81
    D3, E3, F3, G3, A3, Bb3, C4, D4, F4, A4 = 146.83, 164.81, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 349.23, 440.00

    def add_note(freq, t0, dur, amp=0.18, pan_p=0.0, bright=1400.0, decay=0.22):
        n = ns(dur)
        t = np.arange(n) / SR
        s = (
            0.55 * np.sin(TAU * freq * t)
            + 0.28 * np.sin(TAU * freq * 2.002 * t)
            + 0.14 * np.sin(TAU * freq * 3.005 * t)
            + 0.08 * np.sin(TAU * freq * 0.5 * t)
        )
        env = (1 - np.exp(-t / 0.008)) * np.exp(-t / decay)
        y = lp(s * env, bright, 2) * amp
        place(buf, dsp.pan(fades(y, 0.002, 0.015), pan_p), t0)

    def add_pad(freqs, t0, dur, amp=0.14, cutoff=1100.0):
        n = ns(dur)
        t = np.arange(n) / SR
        L = np.zeros(n)
        R = np.zeros(n)
        for idx, f in enumerate(freqs):
            det = 1.0 + (idx - len(freqs) / 2) * 0.0025
            L += np.sin(TAU * f * det * t) + 0.35 * np.sin(TAU * f * 2 * det * t)
            R += np.sin(TAU * f / det * t + 0.4) + 0.35 * np.sin(TAU * f * 2 / det * t + 0.6)
        L = lp(L, cutoff, 2) / len(freqs)
        R = lp(R, cutoff, 2) / len(freqs)
        env = fades(np.ones(n), min(0.35, dur * 0.2), min(0.45, dur * 0.25))
        place(buf, np.stack([L * env, R * env]) * amp, t0)

    def add_kick(t0, amp=0.35):
        n = ns(0.18)
        t = np.arange(n) / SR
        f = 48 + 115 * np.exp(-t / 0.025)
        y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.075)
        place(buf, st(fades(y * amp, 0.001, 0.01)), t0)

    def add_snare(t0, amp=0.22):
        n = ns(0.14)
        t = np.arange(n) / SR
        nz = bp(colored(n, r, 0.3), 900, 6200, 2) * np.exp(-t / 0.045)
        tone = np.sin(TAU * 195 * t) * np.exp(-t / 0.035)
        place(buf, dsp.widen(fades((0.75 * nz + 0.25 * tone) * amp, 0.001, 0.01), r, 6.0, 0.5), t0)

    def add_hat(t0, amp=0.08):
        n = ns(0.05)
        t = np.arange(n) / SR
        nz = hp(colored(n, r, -0.5), 6500, 2) * np.exp(-t / 0.016)
        place(buf, dsp.pan(nz * amp, 0.25), t0)

    # Act 1 (0.00 - 9.80 s)
    arp1 = [D3, A3, D4, F4, A3, D4, E3, C4]
    k = 0
    t_cur = 0.0
    while t_cur < 9.75:
        add_note(arp1[k % len(arp1)], t_cur, 0.26, amp=0.14, pan_p=0.28 * np.sin(k), bright=1900, decay=0.16)
        if k % 4 == 0:
            add_note(D2, t_cur, 0.55, amp=0.22, bright=420, decay=0.35)
        k += 1
        t_cur += step
    add_pad([D3, A3, F4], 0.1, 9.65, amp=0.11, cutoff=900)

    # Act 2 (9.88 - 31.02 s)
    bass_prog = [D2, D2, Bb2, C3, D2, D2, G2, A2]
    ostinato = [D3, F3, A3, D4, C4, A3, Bb3, A3]
    k = 0
    t_cur = 9.88
    while t_cur < 31.00:
        bar = (k // 8) % len(bass_prog)
        bf = bass_prog[bar]
        add_note(bf, t_cur, 0.22, amp=0.28, bright=680, decay=0.16)
        add_note(ostinato[k % len(ostinato)], t_cur, 0.21, amp=0.16, pan_p=-0.35 if k % 2 else 0.35, bright=2400, decay=0.14)
        if k % 4 == 0 or (k % 8 == 6):
            add_kick(t_cur, amp=0.36)
        if k % 4 == 2:
            add_snare(t_cur, amp=0.22)
        add_hat(t_cur, amp=0.075 if k % 2 == 0 else 0.045)
        k += 1
        t_cur += step
    add_pad([D3, A3, D4, F4], 9.88, 10.1, amp=0.16, cutoff=1650)
    add_pad([Bb2, F3, Bb3, D4], 19.98, 5.5, amp=0.18, cutoff=1850)
    add_pad([A2, E3, A3, C4, D4], 25.48, 5.5, amp=0.21, cutoff=2100)

    # Act 3 (33.42 - 54.05 s): Ominous Dark Cosmic Destroyer Drone + Ticking Pulse
    add_pad([D2, A2, D3, F3], 33.42, 20.6, amp=0.22, cutoff=680)
    add_pad([Bb2, F3, C4], 40.90, 13.1, amp=0.16, cutoff=1150)
    t_cur = 33.55
    k = 0
    while t_cur < 53.95:
        add_note(D2 if k % 4 == 0 else A2, t_cur, 0.18, amp=0.22 if k % 2 == 0 else 0.13, bright=520, decay=0.12)
        if t_cur > 40.8 and k % 2 == 0:
            add_kick(t_cur, amp=0.28)
        if t_cur > 46.9:
            add_note(ostinato[k % len(ostinato)], t_cur, 0.19, amp=0.14, pan_p=0.3 * np.cos(k), bright=1950, decay=0.12)
        k += 1
        t_cur += step

    # Act 4 (54.08 - 59.52 s): Ethereal Angelic Shimmer Chord for Whis Rewind
    add_pad([D3, A3, E3 * 2, F4 * 1.05946, A4], 54.08, 5.45, amp=0.18, cutoff=2800)

    # Finale Void (59.55 - 64.33 s): Stark hollow cosmic wind + chilling sub-boom
    n_end = ns(4.75)
    wind = bp(colored(n_end, r, 1.4), 140, 620, 2) * 0.08
    place(buf, dsp.widen(fades(wind, 0.25, 0.4), r, 16.0, 0.8), 59.55)
    place(buf, synth_sub_drop(2.4, 68.0, 28.0) * 0.44, 61.60)

    # Clean hard mute across "Wait, why did a pebble do that?" (31.06 - 33.42 s)
    a_cut, b_cut = ns(31.06), ns(33.42)
    fade_n = ns(0.04)
    buf[:, a_cut - fade_n: a_cut] *= np.linspace(1, 0, fade_n)
    buf[:, a_cut: b_cut] = 0.0
    buf[:, b_cut: b_cut + fade_n] *= np.linspace(0, 1, fade_n)

    return buf


def load_sfx_safe(filename, fallback_dur=1.0):
    p = os.path.join(HERE, filename)
    if not os.path.exists(p):
        print(f"WARNING: SFX file missing ({filename}) — substituting silence. Drop your custom SFX in {HERE}!", file=sys.stderr)
        return np.zeros((2, ns(fallback_dur)), dtype=np.float64)
    return load_audio_48k(p)


def build_sfx_stem():
    buf = np.zeros((2, N), dtype=np.float64)

    sfx_erase = load_sfx_safe("sfx_power_impact.mp3")
    sfx_charge = load_sfx_safe("sfx_power_hum.mp3")
    sfx_boom = load_sfx_safe("sfx_catastrophe_boom.mp3")
    sfx_tap = load_sfx_safe("sfx_power_trigger.mp3")
    sfx_rewind = load_sfx_safe("sfx_twist_finale.mp3")

    def clip_part(x, dur_s, fin=0.01, fout=0.12):
        sub = x[:, : min(x.shape[1], ns(dur_s))]
        return fades(sub, fin, fout)

    # Exact SFX cues synchronized to every 3D rig action & VFX frame in story.ts (1930 frames = 64.33 s)!
    cues = [
        (0.05,  clip_part(sfx_charge, 2.5, 0.05, 0.35), 0.36, "Kitchen Hakai orb hum above MC palm"),
        (2.58,  clip_part(sfx_erase, 2.75, 0.005, 0.20), 0.72, "MC finger-taps coffee mug -> Hakai dissolve (f80)"),
        (5.70,  synth_whoosh(0.55, 220, 1100, 11), 0.26, "Glide into purple sparks fading to zero"),
        (9.84,  synth_sub_drop(1.3, 85, 32), 0.56, "Lord Beerus 3D cosmic void reveal bass hit (f296)"),
        (9.92,  clip_part(sfx_charge, 5.2, 0.05, 0.45), 0.44, "Beerus roaring 3D Destroyer aura + clawed palm thrust"),
        (16.95, clip_part(sfx_tap, 2.5, 0.003, 0.25), 0.72, "MC snaps finger onto brick wall seam (f514)"),
        (17.28, clip_part(sfx_erase, 2.5, 0.01, 0.25), 0.65, "Half brick wall vanishes in razor-clean line"),
        (20.05, clip_part(sfx_charge, 4.1, 0.06, 0.35), 0.42, "MC wraps himself in 3D purple Hakai aura"),
        (20.72, synth_bullet_whiz(1), 0.42, "Bullet 1 whiz"),
        (21.38, synth_bullet_whiz(2), 0.42, "Bullet 2 whiz"),
        (21.75, clip_part(sfx_erase, 2.1, 0.01, 0.25), 0.55, "Bullets evaporating into purple plasma on aura"),
        (22.05, synth_bullet_whiz(3), 0.40, "Bullet 3 whiz"),
        (22.72, synth_bullet_whiz(4), 0.40, "Bullet 4 whiz"),
        (23.32, synth_bullet_whiz(5), 0.40, "Bullet 5 whiz"),
        (24.65, clip_part(sfx_charge, 3.2, 0.05, 0.20), 0.44, "Tiny pebble charging violent Hakai energy"),
        (28.08, clip_part(sfx_boom, 3.3, 0.003, 0.45), 0.86, "Pebble 1->0 SUPERNOVA CRATER BLAST (f845)"),
        (31.12, synth_whoosh(0.32, 480, 140, 21), 0.28, "Dutch push-in on 'Wait'"),
        (33.42, synth_sub_drop(1.1, 74, 30), 0.46, "'You see' cosmic void entry (f1002)"),
        (40.92, clip_part(sfx_charge, 5.2, 0.05, 0.45), 0.50, "Guilt/panic purple fire eating back into MC's hand"),
        (46.96, synth_whoosh(0.45, 320, 1800, 31), 0.35, "Flash to Deep Space (f1409)"),
        (48.92, clip_part(sfx_erase, 2.5, 0.005, 0.25), 0.64, "Beerus sleep-sneeze erases two 3D suns (f1470)"),
        (51.85, clip_part(sfx_tap, 2.4, 0.003, 0.25), 0.72, "Beerus casual table-tap (f1564)"),
        (52.18, clip_part(sfx_boom, 2.8, 0.01, 0.45), 0.64, "Planet Earth cleanly splits in half!"),
        (54.22, clip_part(sfx_rewind, 3.4, 0.05, 0.35), 0.56, "Whis Temporal Do-Over staff & cyan rewind rings"),
        (60.58, clip_part(sfx_tap, 1.9, 0.003, 0.25), 0.68, "MC finger accidentally slips on midnight bedroom floor"),
        (61.82, clip_part(sfx_rewind, 2.5, 0.005, 0.35), 0.78, "Angelic clock SHATTERS -> no angel here! (f1868)"),
    ]

    cue_lines = ["# Beerus Hakai (1-Minute 3D Rigs Edition) — Audio Cue Sheet\n"]
    for t0, sig, gn, lbl in cues:
        place(buf, sig, t0, gn)
        cue_lines.append(f"- `{t0:5.2f}s` (f{round(t0*30):4d}) | gain `{gn:.2f}` | {lbl}")
    return buf, "\n".join(cue_lines)


def limit_true_peak(x, ceil_db=CEIL_DBTP):
    ceil = dbg(ceil_db)
    peak_env = np.max(np.abs(x), axis=0)
    win = ns(0.006)
    peak_max = ndimage.maximum_filter1d(peak_env, size=max(3, win))
    gain = np.minimum(1.0, ceil / (peak_max + 1e-9))
    gain = lp(gain, 45.0, 2)
    gain = np.minimum(gain, ceil / (peak_env + 1e-9))
    return x * gain


def main():
    data = json.load(open(WORDS_JSON, encoding="utf-8"))
    words = data["words"]
    v = load_voice()
    m_raw = synth_anime_score()
    s_raw, cue_md = build_sfx_stem()

    v_lufs = integrated(v)
    m_duck = m_raw * speech_duck_curve(words, depth_db=-3.5)
    m_lufs = integrated(m_duck)
    s_lufs = integrated(s_raw)

    m_gain = dbg((v_lufs - 10.5) - m_lufs) if np.isfinite(m_lufs) else 0.0
    m = m_duck * m_gain

    s_gain = dbg((v_lufs - 7.5) - s_lufs) if np.isfinite(s_lufs) else 0.0
    s = s_raw * s_gain
    v_peak = np.max(np.abs(v))
    s_cap = v_peak * 0.72
    s_env = np.max(np.abs(s), axis=0)
    over = s_env > s_cap
    if over.any():
        g_cap = np.minimum(1.0, s_cap / (ndimage.maximum_filter1d(s_env, size=ns(0.008)) + 1e-9))
        s = s * lp(g_cap, 35.0, 2)

    mix_pre = v + m + s
    pre_lufs = integrated(mix_pre)
    master_gain = dbg(TARGET_LUFS - pre_lufs)
    mix = limit_true_peak(mix_pre * master_gain, CEIL_DBTP)

    out_mix = OUT_MIX_WAV
    write_wav(out_mix, mix, bits=24)
    write_wav(os.path.join(HERE, "stem_voice.wav"), v * master_gain, bits=24)
    write_wav(os.path.join(HERE, "stem_music.wav"), m * master_gain, bits=24)
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s * master_gain, bits=24)

    fin_lufs = integrated(mix)
    fin_tp = true_peak(mix)
    v_fin = integrated(v * master_gain)
    m_fin = integrated(m * master_gain)
    s_fin = integrated(s * master_gain)

    report = (
        f"\n\n## Loudness Report v2 (BS.1770-4 @ 48 kHz / 24-bit)\n"
        f"- **Master Mix:** `{fin_lufs:.2f} LUFS` | True Peak: `{fin_tp:.2f} dBTP` | Duration: `{DUR:.3f} s` (`{N}` samples)\n"
        f"- **Voice Stem:** `{v_fin:.2f} LUFS` (100% original untouched)\n"
        f"- **Music Stem:** `{m_fin:.2f} LUFS` (`{m_fin - v_fin:+.1f} LU` vs voice, dead-silent 31.06–33.42s)\n"
        f"- **SFX Stem:** `{s_fin:.2f} LUFS` (`{s_fin - v_fin:+.1f} LU` vs voice, peak-capped <= 0.72x voice)\n"
    )
    open(os.path.join(HERE, "cues_v2.md"), "w", encoding="utf-8").write(cue_md + report)
    print(report.strip())
    print("Wrote:", out_mix)


if __name__ == "__main__":
    main()
