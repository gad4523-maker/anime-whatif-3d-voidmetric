---
name: anime-whatif-3d-voidmetric
description: >-
  End-to-end production pipeline for ~60 s vertical 1080p (cloud-1080p for
  Gemini Tasks CPU sandboxes), Colab Pro L4/T4 GPU, or 2K (local-2k GPU) 30 fps
  3D Anime/Manga "What If You Woke Up With [Character]'s Power?" shorts rendered
  in Three.js + Remotion. Enforces a mandatory full-canon lore & power
  fact-checker (original source manga, manhwa, light novels, official databooks,
  author Q&As, and canon anime — excluding non-canon filler/fan myths, with
  unadapted spoilers flagged), reuses the locked Voidmetric Channel MC 3D rig,
  builds cel-shaded 3D anime character rigs with .glb export, bone-locked 3D
  GLSL VFX, clean floating karaoke subtitles, zero-clipping 9:16 camera frustum
  verification, OOM-proof chunked cloud rendering, and full short_qa.py audits.
---

# Anime What-If 3D Short — Voidmetric Studio Pipeline

## Overview

Produces viral **~60-second vertical 30 fps 3D Anime explainer Shorts** in the proven **Voidmetric Gold-Standard Style** — established by *"What If You Woke Up With Beerus's Destruction Power?"* (`references/beerus-gold-standard/`).

Supports **three verified execution profiles**:
- **`cloud-1080p` (100% Gemini Tasks / Linux CPU-only Sandbox — `1080×1920` @ `30 fps`):** Bootstraps a self-contained Remotion + Three.js workspace (`templates/starter-remotion/`), uses `--gl=swangle --concurrency=1`, `EFFECT_MSAA = 0`, `/tmp/remotion-tmp`, and resumable 300-frame chunked rendering (`whatif_cli.py render-cloud`) so 2 vCPUs + 6.9 GiB RAM / 0 swap NEVER crashes or OOMs.
- **`colab-gpu` (Gemini Tasks Stages 1–6 + Google Colab Pro `L4` / `T4` GPU Render — `1080p` or full `2K 1440×2560` in ~2–4 min):** Export the verified Remotion workspace as a `.zip` (or push to GitHub) and open `colab/Voidmetric_GPU_Render.ipynb` on a Colab **L4** or **T4** GPU (`--gl=angle-egl --concurrency=4`, `EFFECT_MSAA = 4`, auto-saves to Google Drive). Avoid A100/TPUs for WebGL rendering.
- **`local-2k` (Local GPU PC — `1440×2560` @ `30 fps`):** Native 2K composition (`EpisodeShort2K`), `--gl=angle --concurrency=4`, `EFFECT_MSAA = 4`, `F:/remotion-tmp`.

> [!IMPORTANT]
> **Gold-Standard Reference Rule:** Only `references/beerus-gold-standard/` (`beerus_3d_ref_compressed.mp4`, `sheet_3d_v4.jpg`, `rig3d_*.jpg`) and `references/mromidev-look-rules/` define the target quality bar. Do **NOT** copy styles, scripts, or visuals from legacy 2D experiments.

---

## Dependencies

- **Built-in Web Search & Research Verification:** Required for Stage 2 (Canon Lore Fact-Check) and Stage 3 (Adversarial Lore Audit).
- **Gemini Tasks Cloud Linux Sandbox (`cloud-1080p`):** Debian 12 Linux, Node.js 18+, Python 3.11+ (`pip install numpy scipy pillow`), FFmpeg 5.1+ (no GPU or `uv` required — `whatif_cli.py` runs cleanly with either `python3` or `uv run`).
- **Local GPU PC (`local-2k`):** Node.js 20+, Remotion + Three.js, FFmpeg, `uv` (`uv run`).
- **`cartoon-3d-short` (`mromidev`):** Upstream origin of `templates/engine/` post-processing passes and `scripts/short_qa.py`. Keep separate from this skill.

---

## Quick Start (100% Inside Gemini Tasks — Cloud `1080×1920` 30 fps)

```bash
# 1. Clone workflow pack & bootstrap a self-contained Remotion workspace
git clone https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
cd anime-whatif-3d-voidmetric

# 2. Scaffold new episode with --bootstrap-remotion & cloud-1080p profile (MSAA=0)
python3 scripts/whatif_cli.py init-episode \
  --slug gojo-limitless \
  --title "What If You Woke Up With Gojo's Limitless?" \
  --remotion-root ./workspace-remotion \
  --profile cloud-1080p \
  --bootstrap-remotion \
  --output /tmp/init_gojo.json

# 3. Install JS & Python audio/QA packages once per cloud sandbox
cd workspace-remotion && npm install && cd ..
pip install -q numpy scipy pillow
```

*(On your local PC with `uv`, swap `python3` for `uv run` and `--profile local-2k`.)*

---

## Utility Scripts (`scripts/whatif_cli.py`)

Run via `uv run scripts/whatif_cli.py ...` (local PC) or `python3 scripts/whatif_cli.py ...` (Gemini Tasks Linux sandbox). All subcommands write structured JSON to `--output` and exit `1` on errors:

1. **`init-episode`** — Scaffolds a **100% immediately compilable (`tsc --noEmit` = 0 errors)** episode workspace (`projects/<slug>/` + `src/videos/<slug>/`) with `rig3d_core.ts`, **locked `rig3d_mc.ts`**, `rig3d_guest.ts`, `vfx3d.ts`, `Subtitles.tsx` (with bundled OFL `Montserrat-Black.ttf`), `CastSheet3D.tsx`, `LookCheck3D.tsx`, `EpisodeShort.tsx`, `lights.ts`, `story.ts`, `cast.ts`, `world.ts`, `subtitles_data.ts`, `mix_episode.py`, `dsp.py`, and doc templates. Pass `--bootstrap-remotion` on fresh cloud sandboxes and `--profile cloud-1080p|local-2k`.
2. **`align-voice`** — Converts uploaded voiceover (`.mp3`/`.wav`/`.m4a`) cleanly to 48 kHz 24-bit stereo `voice.wav` and extracts exact Whisper word-level timestamps (`words.json`) via `faster-whisper` or `openai-whisper`.
3. **`check-framing`** — Mathematically checks every shot camera against exact 9:16 vertical frustum bounds (`halfWidth = D * tan(fov/2) * 0.5625`, `halfHeight = D * tan(fov/2)`) to catch limb/hair/orb/kanji clipping BEFORE rendering.
4. **`sync-subtitles`** — Converts measured word timestamps JSON (`words.json`) into clean steady karaoke `subtitles_data.ts` matching `Subtitles.tsx`.
5. **`package-colab`** — Pure-Python `zipfile` packager (no external `zip` binary needed!) that cleanly bundles `workspace-remotion` for Google Colab Pro while excluding `node_modules/`, `.git/`, and temp caches.
6. **`render-cloud`** — OOM-proof, **resumable chunked 1080p CPU renderer** for Gemini Tasks (`--gl swangle --concurrency 1 --chunk-frames 300`, cleans `/tmp/remotion-tmp` between every chunk, concatenates losslessly via FFmpeg `-c copy`, and muxes `--audio` cleanly).
   ```bash
   python3 scripts/whatif_cli.py render-cloud \
     --remotion-root ./workspace-remotion \
     --composition EpisodeShort1080 \
     --total-frames 1860 \
     --chunk-frames 300 \
     --audio ./workspace-remotion/projects/<slug>/audio/mix.wav \
     --out-video ./workspace-remotion/projects/<slug>/out/final_1080p.mp4 \
     --gl swangle --concurrency 1 --crf 17 \
     --output /tmp/render_report.json
   ```
7. **`compress-ref`** — Compresses a master MP4 into a GitHub-safe showcase MP4 (`<= --max-mb`, default `720×1280` H.264).
8. **`qa-audit`** — Runs `scripts/short_qa.py` and enforces Voidmetric thresholds for `--profile cloud-1080p` (`1080×1920`, `30 fps`) or `--profile local-2k` (`1440×2560`, `30 fps`), `-16.5..-13.0 LUFS`, `0` black/frozen frames, `<= 5%` held frames.
9. **Cross-Platform `.glb` Rig Exporter:**
   ```bash
   node scripts/export_rigs_glb.mjs --remotion-root ./workspace-remotion --slug <slug> --rigs mc:rig3d_mc.ts:buildMCRig3D:wake_orb,guest:rig3d_guest.ts:buildGuestRig3D:power_point
   ```

---

## Workflow (7 Mandatory Stages & Approval Gates)

### Stage 1 — Topic Intake, Asset Request & SFX Prompts
1. Run `whatif_cli.py init-episode` (`--profile cloud-1080p --bootstrap-remotion` in Gemini Tasks; `--profile local-2k` on local GPU PC).
2. Ask the user for:
   - **Reference images** of the guest anime character(s), iconic poses, and signature VFX.
   - **Voiceover plan** (user-uploaded ~60 s voiceover `.mp3`/`.wav`, target ~175–195 words).
3. Give the user **5 tailored SFX generation prompts** customized to that anime power.

### Stage 2 — Mandatory Full-Canon Lore & Power Fact-Checker Gate
> [!CAUTION]
> **NEVER restrict fact-checking to anime-only, and NEVER guess canon power rules.** Inaccurate or outdated ability descriptions destroy viewer trust.

1. **Enforce the Official Canon Authority Hierarchy** (do NOT treat anime-only as the limit — manga, manhwa, light novels, and official databooks are ALL first-class canon!):
   - **Tier 1 (Primary Canon — Always Prioritize):** Original source material (**Manga chapters, Manhwa, Light Novels / Web Novels**), **Official Databooks / Fanbooks**, and **Author Q&As / SBS / Interviews**.
   - **Tier 2 (Canon Adaptation & Continuity):** **Canon Anime episodes & Canon Movies**. When Manga and Anime continuities diverge (e.g., *Dragon Ball Super* Manga vs. Anime), explicitly document BOTH continuities and state which canon feat/rule is used!
   - **Tier 3 (STRICTLY EXCLUDE unless user asks):** Non-canon anime filler arcs, non-canon movies/OVAs, uncited fan wiki edits, and powerscaling/TikTok headcanon myths.
2. **Scope:** Topics are NOT locked strictly to adapted anime — manga-only, manhwa, and light-novel characters/abilities are 100% supported.
3. Use live web search to verify every mechanic, limitation, and feat, then fill `projects/<slug>/LORE_FACT_SHEET.md` with:
   - **Verified Canon Mechanics** (exact mechanism, activation rules, stamina/energy/mindset cost, feats with exact chapter/volume/databook/episode citations).
   - **Stated Canon Limits & Weaknesses** (the real foundation of the What-If twist).
   - **Continuity Notes (Manga vs. Anime Differences)** whenever both exist.
   - **Common Fan Myths & Non-Canon Filler to Avoid**.
   - **Unadapted Manga/Novel Spoilers Flagged:** Explicitly flag manga/novel-only feats not yet animated so the user can choose whether to include them (default: **include full latest official canon** unless user opts out).
   - **What-If Real-World Extrapolations** clearly labeled separately from stated canon.

### Stage 3 — ~60s Viral Script + Adversarial Lore Audit (**APPROVAL GATE 1**)
1. Draft `projects/<slug>/SCRIPT.md` (~175–195 words, ~55–65 s) using the proven Beerus beat arc (`references/beerus-gold-standard/SCRIPT_beerus_example.md`). Avoid repetitive gimmick standalone `"Wrong."` drops — earn the twist naturally through an escalating consequence!
2. **Adversarial Lore Audit:** Perform an independent line-by-line audit trying to **disprove every factual claim** in `SCRIPT.md` against `LORE_FACT_SHEET.md` and official canon. Fix any inaccuracy and record `PASS` sign-off in `LORE_FACT_SHEET.md`.
3. Present `LORE_FACT_SHEET.md`, flagged manga spoilers, `SCRIPT.md`, and the 5 SFX prompts. **Wait for explicit user approval before rigging or audio.**

### Stage 4 — 3D Anime Rig Showcase (**MANDATORY HARD STOP — APPROVAL GATE 2**)
> [!CAUTION]
> **HARD STOP BEFORE VIDEO CREATION:** You MUST create the 3D character rigs, render visual turnaround + close-up showcase images, and **show the rendered characters directly to the user for visual approval BEFORE building worlds, VFX, scene timelines, or rendering any video.** Never proceed straight from rigging into video production without explicit user approval!

1. **Reuse `rig3d_mc.ts` untouched as the recurring Channel MC** (24 bones, razor-sharp anime V-jawline, glasses, spiky hair, black zip jacket/white tee). Only add episode-specific actions/expressions in `setAction`.
2. **MANDATORY 3D CHARACTER ACCURACY, PROPORTIONS & DETAIL STANDARD:**
   Every newly created anime/manga character rig MUST be as **accurate and detailed to the original character in every proportion** as 3D procedural geometry + 1024×1024 UV painting can achieve — matching the Dragon Ball FighterZ–style cel-shaded quality bar of Beerus & Whis (`references/beerus-gold-standard/rig3d_beerus_sheet.jpg`, `rig3d_cast_lineup.jpg`). **NEVER build generic low-effort capsule/sphere placeholders!**
   - **Exact Canonical Proportions & Scale:** Inspect every user reference image before writing code. Match canonical height relative to the Channel MC (`~1.75 m`), head-to-body ratio, shoulder-to-waist taper, torso/limb musculature or slenderness, hand/foot scale, and signature silhouette.
   - **Face, Eyes & Multi-Lock Sculpted Hair:** Sculpt the exact canonical jawline, cheekbones, nose/snout, ears, and head contour via `loftRings` (never a plain sphere!). Paint crisp 1024×1024 UV face textures with accurate eye shape, iris patterns/glows, eyebrows, scars/markings/tattoos, and **at least 2–3 swappable expressions** (neutral/smirk/intense/snarl). Sculpt multi-lock 3D hair with `sculptCurveTube` / layered spikes/flutes/strands matching the original character's exact silhouette — never a smooth helmet dome!
   - **Faithful Outfit, Costume Layers & Signature Accessories:** Build every iconic detail in real 3D geometry + painted UV patterns — collars, armor plates, sashes, folds, robes/cloaks, belts, pouches, cuffs, footwear, earrings/rings, blindfolds/glasses, weapons/staffs, wings/tails/horns/halos — with exact canonical colors and trim lines.
   - **Full Articulated Skeleton (`24–34` bones) & 5-Finger Hands:** Always use `buildHand3D` (with accurate claws/gloves/wraps) so close-up hand poses and bone-locked 3D VFX look faithful to the anime/manga.
3. **Export, Self-Critique & Visual Showcase:**
   - Export portable `.glb` rigs via `scripts/export_rigs_glb.mjs`, and render **clear visual showcase images** (`--gl=swangle --concurrency=1` in cloud, `--gl=angle --concurrency=4` on GPU):
     - Front / 3/4 / Side / Back turnaround sheet for every newly created guest character,
     - Tight face & expression close-up render,
     - Full cast height/proportion/style lineup standing next to the locked Channel MC rig.
   - **Mandatory Agent Self-Critique First:** Visually compare your rendered turnaround & face close-up directly against the user's reference images and fix any proportion, face, hair, costume, or color mismatch BEFORE presenting to the user.
4. **Present the rendered character showcase images to the user and STOP.** Wait for explicit approval (or apply any likeness/proportion/detail fixes requested and re-show) before starting Stages 5–7!

### Stage 5 — Audio Mastering & Rock-Steady Karaoke Subtitle Sync
1. Keep the user's uploaded voiceover **100% untouched** — run `whatif_cli.py align-voice --input <uploaded_voice> --wav-out projects/<slug>/voice/voice.wav --words-out projects/<slug>/voice/words.json --fps 30` to convert to 48 kHz 24-bit WAV and extract exact Whisper word timestamps automatically.
2. Run `whatif_cli.py sync-subtitles` on `words.json` to generate `subtitles_data.ts` + verify exact beat sync (every visual impact in `story.ts` lands `0–3 frames` before its spoken punch word!).
3. Master `mix.wav` via `mix_episode.py` + `dsp.py` (`-14.5 LUFS`, true peak `<= -0.8 dBTP`, 0 unintended silences, hard dead-silence music drop on the mid-video twist question).

### Stage 6 — 3D World, Bone-Locked VFX & Zero-Clipping 9:16 Look-Check Gate
1. Build 5–6 spatial 3D zones (`0, 120, 240, 360, 480, 600`) using `twoTone`, `untone()` sky shader, camera-relative frozen sun, and `EpisodeShort.tsx`.
2. **Bone-Locked VFX Rule:** Call `this.cast.update(...)` + `this.root.updateMatrixWorld(true)` FIRST, then attach hand/weapon 3D GLSL VFX via `bone.localToWorld(...)`. Offset forward-held palm orbs `+0.12 to +0.15 m` toward camera so fingers remain cleanly behind the orb.
3. **Zero-Clipping 9:16 Gate:**
   - Run `whatif_cli.py check-framing` and verify `PASS` (`halfWidth = D * tan(fov/2) * 0.5625`).
   - Render `EpisodeLookCheck3D` (`16` frames at `540×960`, `--gl=swangle --concurrency=1` in cloud / `--gl=angle --concurrency=4` on GPU), tile into `sheet_3d.jpg`, and **visually inspect every tile**. Fix ANY clipped limb, hair spike, orb, kanji, or weapon before full render!

### Stage 7 — Render Choice Gate (Colab GPU vs. Self-Render 1080p), `qa-audit` & Delivery
Once all 16 tiles of `EpisodeLookCheck3D` pass visual inspection:

1. **MANDATORY RENDER CHOICE QUESTION (On Cloud / CPU Sandboxes like Gemini Tasks):**
   Before starting the full render, **always ask the user:**
   > *"All 16 Look-Check frames passed with zero clipping! Do you have **Google Colab Pro (`L4`/`T4` GPU)** to render this in ~2–4 minutes (1080p or 2K), or should I render the full **1080p 30 fps** video myself right here?"*
   - **If user says YES (has Google Colab Pro):**
     1. Run `python3 scripts/whatif_cli.py package-colab --remotion-root ./workspace-remotion --slug <slug> --out-zip ./episode_<slug>_colab_bundle.zip --output /tmp/pkg_colab.json` (pure-Python zip, excludes `node_modules/` & caches, verifies `package.json` + `mix.wav`).
     2. Deliver the `.zip` along with the 1-click Colab Pro link:
        `https://colab.research.google.com/github/gad4523-maker/anime-whatif-3d-voidmetric/blob/main/colab/Voidmetric_GPU_Render.ipynb` (remind them to pick **`L4 GPU`** or **`T4 GPU`**, never A100/TPU).
   - **If user says NO (no Colab — self-render right here in `1080p 30 fps`):**
     1. Immediately render the full **`1080×1920` @ `30 fps`** video in safe OOM-proof 300-frame chunks:
        ```bash
        python3 scripts/whatif_cli.py render-cloud \
          --remotion-root ./workspace-remotion \
          --composition EpisodeShort1080 \
          --total-frames <N> \
          --chunk-frames 300 \
          --audio ./workspace-remotion/projects/<slug>/audio/mix.wav \
          --out-video ./workspace-remotion/projects/<slug>/out/final_1080p.mp4 \
          --gl swangle --concurrency 1 --crf 17 \
          --output /tmp/render_report.json
        ```
     2. Run `python3 scripts/whatif_cli.py qa-audit --video <final_1080p.mp4> --shots-json <shots.json> --qa-dir <qa_dir> --profile cloud-1080p --output /tmp/qa_report.json`.
     3. Visually inspect key contact sheets from `<qa_dir>` confirming 0 clipping, clean subtitles, and crisp renders before delivering the final 1080p MP4.
2. **On Local GPU PC (`local-2k`, `1440×2560` @ `30 fps`):**
   1. Set `REMOTION_TMP=F:/remotion-tmp`, render native `EpisodeShort2K` (`--crf=16 --gl=angle --concurrency=4`), mux with `-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest`, and clean temp caches.
   2. Run `uv run scripts/whatif_cli.py qa-audit --video <final_2k.mp4> --shots-json <shots.json> --qa-dir <qa_dir> --profile local-2k --output <qa_report.json>`.
   3. Visually inspect key contact sheets from `<qa_dir>` and deliver the final 2K MP4.

---

## Locked Style & Engineering Contracts

| Contract | Locked Value / Rule |
|---|---|
| **Channel MC Rig** | `templates/rigs3d/rig3d_mc.ts` (sharp anime V-jawline, glasses, spiky hair, black zip jacket/white tee) |
| **Subtitles** | `Subtitles.tsx`: `60px` baseline (`height / 1920` scaled), crisp dark outline + karaoke purple/gold highlight, **NO black background box**, **NO pop-up/bounce animation** |
| **9:16 Safe Frustum** | `halfWidth = D * tan(fov/2) * 0.5625`; `0` clipped limbs, hair spikes, orbs, kanji, or staffs |
| **Bone-Locked VFX** | Real-time `localToWorld` attachment; forward palm orbs offset `+0.12..0.15 m` toward camera |
| **Cloud 1080p Spec (Gemini Tasks)** | Native `1080×1920` @ `30 fps`, `EFFECT_MSAA = 0`, `--gl=swangle --concurrency=1`, 300f resumable chunks (`render-cloud`), CRF 17, AAC 256k, `-14.5 LUFS` |
| **Local 2K Spec (GPU PC)** | Native `1440×2560` @ `30 fps`, `EFFECT_MSAA = 4`, `--gl=angle --concurrency=4`, CRF 16, AAC 256k, `-14.5 LUFS` |

---

## Common Mistakes (Never Repeat!)

1. **OOM Crash in Gemini Tasks:** Never run `--concurrency=4` or `EFFECT_MSAA=4` or `--gl=angle` on a 2-vCPU / 6.9 GiB RAM / 0-swap CPU cloud box. Always use `cloud-1080p` (`EFFECT_MSAA=0`, `--gl=swangle --concurrency=1`, 300-frame chunks via `render-cloud`).
2. **Floating or Behind-the-Hand VFX:** Always call `root.updateMatrixWorld(true)`, track via `bone.localToWorld(...)`, and apply `+0.12..0.15 m` palm-to-camera offset on forward palm orbs.
3. **9:16 Edge Clipping:** 9:16 vertical video is narrow (`halfWidth ≈ 0.21 × D` at `fov = 41°`). Always pass `check-framing` and visually inspect all 16 tiles of `EpisodeLookCheck3D` before full render.
4. **NaN Bloom Blackout:** Always clamp non-integer powers as `Math.pow(Math.max(0, x), exp)`.
5. **`dispose={null}` on `InkPass`:** Never put `dispose={null}` on `<primitive object={fx.ink} />`; dispose safely in `useEffect`.
6. **Remotion `--scale 1.3333` & Disk Exhaustion:** Always render native `EpisodeShort1080` or `EpisodeShort2K` (never `--scale`), route `REMOTION_TMP` to `/tmp/remotion-tmp` or `F:/remotion-tmp`, and clean bundle caches between chunks.
