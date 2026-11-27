---
name: anime-whatif-3d-voidmetric
description: >-
  End-to-end production pipeline for ~60 s vertical 2K (1440x2560, 30 fps) 3D
  Anime "What If You Woke Up With [Character]'s Power?" shorts rendered in
  Three.js + Remotion. Enforces a mandatory canon lore & power fact-checker
  (manga + official databooks with explicit spoiler flags), reuses the locked
  Voidmetric Channel MC 3D rig, builds cel-shaded 3D anime character rigs with
  .glb export, bone-locked 3D GLSL VFX, clean floating karaoke subtitles,
  zero-clipping 9:16 camera frustum verification, and full short_qa.py audits.
  Use when the user asks to create a new anime What-If 3D short, build anime 3D
  rigs in the Beerus Voidmetric style, or fact-check an anime power script.
---

# Anime What-If 3D Short — Voidmetric Studio Pipeline

## Overview

Produces viral **~60-second vertical 2K (`1440×2560`, 30 fps)** 3D Anime explainer Shorts in the proven **Voidmetric Gold-Standard Style** — established by *"What If You Woke Up With Beerus's Destruction Power?"* (`references/beerus-gold-standard/`).

Combines:
1. **Mandatory Canon Lore & Power Fact-Checker** (latest official manga + databooks, manga spoilers explicitly flagged for user decision + independent adversarial script audit).
2. **Locked Channel Face — Recurring MC 3D Rig** (`templates/rigs3d/rig3d_mc.ts`, 24 bones, razor-sharp anime V-jawline, jet-black 3D glasses, spiky hair, black zip jacket & white tee) reused across every episode.
3. **Articulated 3D Cel-Shaded Anime Guest Rigs** (`templates/rigs3d/rig3d_core.ts`, Dragon Ball FighterZ–style 3-band GLSL cel shading + smooth-normal inverted-hull ink outlines + 1024×1024 UV faces + 5-finger hands + `.glb` export).
4. **Bone-Locked 3D GLSL Volumetric VFX** (`templates/vfx/vfx3d_core.ts`, real-time `localToWorld` hand/finger tracking, palm-front offsets, 6-level HDR Mipmap Bloom).
5. **Proven `mromidev` Look & Camera Engine** (`templates/engine/{ink,lensblur,grade,shade}.ts`, 7-frame sign-flipping impact kicks, 0% held frames, `scripts/short_qa.py`).
6. **Locked Subtitle & Zero-Clipping 9:16 Framing Contracts** (clean steady `60px` floating karaoke subtitles with zero dark box and zero pop-up bounce; mathematical 9:16 frustum validation + 16-frame `LookCheck3D` gate before full 2K render).

> [!IMPORTANT]
> **Gold-Standard Reference Rule:** Only `references/beerus-gold-standard/` (`beerus_3d_ref_compressed.mp4`, `sheet_3d_v4.jpg`, `rig3d_*.jpg`) and `references/mromidev-look-rules/` define the target quality bar. Do **NOT** copy styles, scripts, or visuals from legacy 2D experiments (Mahoraga/Toji/Gyro).

---

## Dependencies

- **Built-in `search_web` & `research` subagent:** Required for Step 2 (Canon Lore Verification) and Step 3 (Adversarial Lore Audit).
- **Local Toolchain:** Node.js + Remotion + Three.js (`@remotion/three`, `@react-three/postprocessing`), FFmpeg, `uv` (Python 3), and `numpy`/`scipy` (for `mix_template.py` / `dsp.py`).
- **`cartoon-3d-short` (`mromidev`):** Upstream origin of `templates/engine/` post-processing passes and `scripts/short_qa.py`. Keep `cartoon-3d-short` separate — never merge its 2D bean-head or no-caption rules into this skill.

---

## Quick Start

Scaffold a new episode into your Remotion workspace (always invoke Python scripts via `uv run`):

```bash
uv run scripts/whatif_cli.py init-episode \
  --slug gojo-limitless \
  --title "What If You Woke Up With Gojo's Limitless?" \
  --remotion-root F:/burgess/remotion-shorts \
  --output F:/remotion-tmp/init_gojo.json
```

---

## Utility Scripts

All automation lives in `scripts/whatif_cli.py` and writes structured JSON to `--output` (short status line to stdout; exit code `1` on error):

1. **`init-episode`** — Scaffolds `projects/<slug>/` + `src/videos/<slug>/` pre-wired with `rig3d_core.ts`, **locked `rig3d_mc.ts`**, `rig3d_guest.ts`, `vfx3d.ts`, `Subtitles.tsx`, `LookCheck3D.tsx`, `EpisodeShort.tsx`, `mix_episode.py`, and Markdown doc templates.
   ```bash
   uv run scripts/whatif_cli.py init-episode --slug <slug> --title "<Title>" --remotion-root <path> --output <json>
   ```
2. **`check-framing`** — Mathematically checks every shot camera against exact 9:16 vertical frustum bounds (`halfWidth = D * tan(fov/2) * 0.5625`, `halfHeight = D * tan(fov/2)`) to catch limb/hair/orb/kanji clipping BEFORE rendering.
   ```bash
   uv run scripts/whatif_cli.py check-framing --shots-config shots_framing.json --output framing_report.json
   ```
3. **`sync-subtitles`** — Converts measured word timestamps JSON (`{words: [{word, start, end}]}`) into clean steady karaoke `subtitles_data.ts` matching `Subtitles.tsx`.
   ```bash
   uv run scripts/whatif_cli.py sync-subtitles --words-json words.json --fps 30 --max-words 3 --accent-purple "hakai,destruction" --accent-gold "zero,angel" --ts-out subtitles_data.ts --output subs_report.json
   ```
4. **`compress-ref`** — Compresses a 2K master MP4 into a GitHub-safe showcase MP4 (`<= --max-mb`, default `720×1280` H.264).
   ```bash
   uv run scripts/whatif_cli.py compress-ref --input master_2k.mp4 --output ref_720p.mp4 --max-mb 25
   ```
5. **`qa-audit`** — Runs `scripts/short_qa.py`, checks Voidmetric 2K master thresholds (`1440×2560`, `30 fps`, `-16.5..-13.0 LUFS`, `0` black frames, `0` frozen spans, `<= 5%` held frames), and outputs a JSON pass/fail report.
   ```bash
   uv run scripts/whatif_cli.py qa-audit --video master_2k.mp4 --shots-json shots.json --qa-dir out/qa --output qa_report.json
   ```
6. **Portable `.glb` Export & QA Helpers:**
   - `node scripts/export_rigs_glb.mjs` — Exports episode 3D anime rigs to `.glb` files.
   - `python scripts/short_qa.py <video> <qa_dir> <shots.json>` — Generates contact sheets and frame/audio metrics.
   - `python scripts/sbs_sheet.py <out.jpg> --ours ... --ref ...` — Side-by-side visual comparison sheet.

---

## Workflow (7 Mandatory Stages & Approval Gates)

### Stage 1 — Topic Intake, Asset Request & SFX Prompts
When the user gives a topic (e.g. *"What If You Woke Up With [Character]'s Power?"*):
1. Run `whatif_cli.py init-episode` to scaffold the workspace.
2. Ask the user for:
   - **Reference images** of the guest anime character(s), iconic poses, and signature VFX.
   - **Voiceover plan** (user-uploaded ~60 s voiceover `.mp3`/`.wav`, target pacing ~175–195 words).
3. Give the user **5 tailored SFX generation prompts** customized to that anime ability (hum/charge, crisp trigger, signature effect, catastrophe shockwave, twist/finale hit).

### Stage 2 — Mandatory Canon Lore & Power Fact-Checker Gate
> [!CAUTION]
> **NEVER skip or guess canon anime power rules.** Inaccurate ability descriptions destroy viewer trust.

1. Use `search_web` to verify the character's powers against **latest official canon (manga chapters + official databooks + anime episodes)**.
2. Fill `projects/<slug>/LORE_FACT_SHEET.md` with:
   - **Verified Canon Mechanics** (exact mechanism, activation rules, stamina/energy/mindset cost, feats with chapter/episode citations).
   - **Stated Canon Limits & Weaknesses** (the real foundation of the What-If twist).
   - **Common Fan Myths to Avoid** (explicit misconceptions never to repeat).
   - **Manga Spoilers Flagged:** Explicitly list any manga-only rules/feats not yet animated and **ask the user** whether to include them or stay anime-only.
   - **What-If Extrapolations:** Clearly separate real-world Earth consequences from stated canon facts.

### Stage 3 — ~60s Viral Script + Adversarial Lore Audit (**APPROVAL GATE 1**)
1. Draft `projects/<slug>/SCRIPT.md` (~175–195 words, ~55–65 s) following the proven Beerus beat arc (`references/beerus-gold-standard/SCRIPT_beerus_example.md`):
   - *Hook (everyday object)* → *Iconic character & exact rule reveal* → *3 escalating tests* → *Natural dead-silence shock question* (avoid repetitive gimmick `"Wrong."` drops unless earned!) → *Canon drawback/backlash* → *Canon proof + missing safeguard* → *Haunting callback ending*.
2. **Adversarial Lore Audit:** Invoke an independent `research` subagent with `LORE_FACT_SHEET.md` + `SCRIPT.md` and instruct it to try to **disprove every factual claim** in the script against official canon. Fix every discrepancy and log the `PASS` sign-off in `LORE_FACT_SHEET.md`.
3. Present `LORE_FACT_SHEET.md`, flagged manga spoilers, `SCRIPT.md`, and the 5 SFX prompts to the user. **Wait for explicit user approval before building rigs or audio.**

### Stage 4 — 3D Anime Rig Showcase (**APPROVAL GATE 2**)
1. **Reuse `rig3d_mc.ts` untouched as the recurring Channel MC** (only add episode-specific actions/expressions via `setAction` — never soften the sharp V-jawline or alter his core identity).
2. Build each guest anime character rig using `rig3d_core.ts` (`makeAnimeMat`, `addPart`, `loftRings`, `sculptCurveTube`, `buildHand3D`) matching the user's reference images and Beerus gold-standard detail (`references/beerus-gold-standard/rig3d_beerus_sheet.jpg`).
3. Export portable `.glb` rigs via `scripts/export_rigs_glb.mjs`, render turnaround + hero action pose showcase sheets, and present an artifact to the user. **Wait for explicit user approval before moving to full video production.**

### Stage 5 — Audio Mastering & Rock-Steady Karaoke Subtitle Sync
1. Keep the user's uploaded voiceover **100% untouched** (convert cleanly to 48 kHz stereo WAV).
2. Measure exact word/clause timestamps (`words.json`) and run `uv run scripts/whatif_cli.py sync-subtitles` to generate `subtitles_data.ts` + `shots.json`.
3. Build `projects/<slug>/audio/mix_episode.py` (from `templates/audio/mix_template.py` + `dsp.py`):
   - Target **`-14.5 LUFS`**, true peak **`<= -0.8 dBTP`**, **0 unintended silences**.
   - Layer the user's uploaded SFX on exact visual impact frames (`0–3` frames early).
   - Hard-mute music to **dead silence** during the mid-video twist question beat.
   - Lock `shots.json` timings before finalizing the audio mix.

### Stage 6 — 3D World, Bone-Locked VFX & Zero-Clipping 9:16 Look-Check Gate
1. Build 5–6 spatial 3D zones (`Z_ZONE1 = 0, 120, 240, 360, 480, 600`) with `twoTone` materials, `untone()` sky shader, camera-relative frozen sun, and `mromidev` post-processing (`EpisodeShort.tsx`).
2. **Bone-Locked VFX Rule:** Always call `this.cast.update(...)` + `this.root.updateMatrixWorld(true)` FIRST, then attach hand/finger/weapon 3D GLSL VFX via `bone.localToWorld(...)`. For forward-held palm VFX, offset `+0.12 to +0.15 m` along the normalized `palm → camera` vector so fingers/claws stay clearly visible behind the orb.
3. **Continuous Skeletal & Camera Motion:** Every shot has smooth gliding cameras (`smootherstep`/`glide`), 7-frame sign-flipping `KICKS` on impacts, and continuous 3D skeletal motion (`0%` held frames).
4. **Zero-Clipping 9:16 Gate:**
   - Run `uv run scripts/whatif_cli.py check-framing` on all shot cameras and verify `PASS` (`halfWidth = D * tan(fov/2) * 0.5625`).
   - Update `LookCheck3D.tsx` (`16` key frames covering every shot + widest arm/pan extremes), render `sheet_3d.jpg` at `540×960` (`--gl=angle --concurrency=4`), and **visually inspect every tile with `read_file`**. Fix ANY clipped arm, hand, hair spike, orb, kanji, or weapon before full render.

### Stage 7 — Native 2K Master Render, `qa-audit` & Delivery
1. Register a **native `1440×2560` @ 30 fps** composition (`<EpisodeShort2K>`) in `src/Root.tsx` (**never** use `--scale 1.3333`).
2. Always route temp caches to a large data drive so the OS drive never runs out of space:
   ```powershell
   $env:REMOTION_TMP='F:/remotion-tmp'; $env:TEMP='F:/remotion-tmp'; $env:TMP='F:/remotion-tmp'
   npx remotion render src/index.ts EpisodeShort2K silent.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --gl=angle --concurrency=4 --log=error
   ```
3. Mux mastered audio cleanly:
   ```powershell
   ffmpeg -y -i silent.mp4 -i projects/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest final_2k.mp4
   ```
4. Clean `F:/remotion-tmp/remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*`.
5. Run `uv run scripts/whatif_cli.py qa-audit`, visually inspect key QA contact sheets from the actual rendered 2K MP4 with `read_file`, and deliver clickable `file:///` links!

---

## Locked Style & Engineering Contracts

| Contract | Locked Value / Rule |
|---|---|
| **Channel MC Rig** | `templates/rigs3d/rig3d_mc.ts` (sharp anime V-jawline, glasses, spiky hair, black zip jacket/white tee) |
| **Subtitles** | `Subtitles.tsx`: `60px` baseline (`height / 1920` scaled), crisp dark outline + karaoke purple/gold highlight, **NO black background box**, **NO pop-up/bounce animation** |
| **9:16 Safe Frustum** | `halfWidth = D * tan(fov/2) * 0.5625`; `0` clipped limbs, hair spikes, orbs, kanji, or staffs |
| **Bone-Locked VFX** | Real-time `localToWorld` attachment; forward palm orbs offset `+0.12..0.15 m` toward camera |
| **Post-Processing Order** | `InkPass` (layer 0) → `LensBlur.pre` → `LensBlur.main` → 6-level HDR Bloom (`thr 1.0`) → `NEUTRAL` ToneMapping → `GradeEffect` (MSAA 4, film grain OFF) |
| **2K Export Spec** | Native `1440×2560` @ `30 fps`, H.264 CRF 16, `yuv420p`, AAC `48 kHz` 256k, `-14.5 LUFS`, `0` black/frozen frames |

---

## Common Mistakes (Never Repeat!)

1. **Floating or Behind-the-Hand VFX:** Placing an orb at static world `(x, y, z)` or on the wrist bone without a `palm → camera` offset makes VFX float away or render behind the character's hand. Always track the animated bone via `localToWorld` after `root.updateMatrixWorld(true)` and add the camera-facing palm offset.
2. **9:16 Edge Clipping on Wide Poses/Pans:** 9:16 vertical video is extremely narrow (`halfWidth ≈ 0.21 × D` at `fov = 41°`). Always run `check-framing` and inspect late-pan & raised-arm frames in `LookCheck3D` before rendering 2K.
3. **NaN Bloom Blackout in Shaders/Rigs:** Calling `Math.pow(x, 1.35)` on a negative `x` produces `NaN` vertex coordinates that corrupt the HDR bloom buffer into a solid black screen. Always wrap non-integer powers as `Math.pow(Math.max(0, x), exp)`.
4. **`dispose={null}` on `InkPass`:** Putting `dispose={null}` on `<primitive object={fx.ink} />` shadows `InkPass.prototype.dispose` in R3F and crashes crossfades. Omit `dispose={null}` on post passes and dispose safely in `useEffect`.
5. **Coplanar Window/Wall Z-Fighting:** Never place window frames, panes, and mullions at the same Z coordinate; step them by `>= 0.04 m`.
6. **Remotion `--scale 1.3333` & `C:` Disk Exhaustion:** Never use `--scale 1.3333` (produces odd heights / codec failure on Windows); render a native `1440×2560` composition and always route `REMOTION_TMP`/`TEMP`/`TMP` to `F:/remotion-tmp`.
