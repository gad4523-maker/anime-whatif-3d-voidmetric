---
name: anime-whatif-3d-voidmetric
description: >-
  End-to-end production pipeline for ~60 s vertical 2K (local-2k via Voidmetric
  PC Render Studio) or 1080p (cloud-1080p fallback in Gemini Tasks) 30 fps 3D
  Anime/Manga "What If You Woke Up With [Character]'s Power?" shorts rendered
  in Three.js + Remotion. Enforces a mandatory full-canon lore & power
  fact-checker (original source manga, manhwa, light novels, official databooks,
  author Q&As, and canon anime — excluding non-canon filler/fan myths, with
  unadapted spoilers flagged), reuses the locked Voidmetric Channel MC 3D rig,
  builds cel-shaded 3D anime character rigs with .glb export, custom-first
  painted 3D environments and bespoke 3D GLSL VFX, clean floating karaoke
  subtitles, zero-clipping 9:16 camera frustum verification, PC `.zip` bundle
  export (`package-pc`) for local GPU rendering, and full short_qa.py audits.
---

# Anime What-If 3D Short — Voidmetric Studio Pipeline

## Overview

Produces viral **~60-second vertical 30 fps 3D Anime explainer Shorts** in the proven **Voidmetric Gold-Standard Style** — established by *"What If You Woke Up With Beerus's Destruction Power?"* (`references/beerus-gold-standard/`).

Supports **two verified execution workflows**:
- **`gemini-to-pc` (PRIMARY WORKFLOW — Build in Gemini Tasks, Render Native 2K on Local PC GPU):** Build Stages 1–6 inside Gemini Tasks (`cloud-1080p` profile with `EFFECT_MSAA = 2` & `--gl=swangle --concurrency=1` for fast Look-Check stills), then export a lightweight `.zip` bundle via `whatif_cli.py package-pc` and drag-and-drop it into **Voidmetric PC Render Studio** (`http://127.0.0.1:7860`) on your local Windows PC to render native **2K `1440×2560` @ `30 fps`** (`EFFECT_MSAA = 4`, `--gl=angle --concurrency=4`), mux `mix.wav`, render `EpisodeThumb`, and run `short_qa.py` locally!
- **`cloud-1080p` (Optional Self-Render Fallback — 100% Inside Gemini Tasks CPU Sandbox, `1080×1920` @ `30 fps`):** Only if the user explicitly asks to render in the cloud instead of on their PC — uses `--gl=swangle --concurrency=1`, **`EFFECT_MSAA = 2`**, `/tmp/remotion-tmp`, and resumable 300-frame chunked rendering (`whatif_cli.py render-cloud`).
- **`local-2k` (Direct Local GPU PC CLI — `1440×2560` @ `30 fps`):** Native 2K composition (`EpisodeShort2K`), `--gl=angle --concurrency=4`, `EFFECT_MSAA = 4`, `F:/remotion-tmp`.

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
3. **`check-framing`** — Mathematically checks every shot camera against exact 9:16 vertical frustum bounds (`halfWidth = D * tan(fov/2) * 0.5625`, `halfHeight = D * tan(fov/2)`). Supports `"shot_type": "full_body" | "medium" | "closeup" | "insert"` (plus `allow_bottom_crop: true`) so dramatic close-ups and waist-up shots pass cleanly without forcing 5 m full-body cameras while still strictly protecting head/top and left/right edges!
4. **`sync-subtitles`** — Converts measured word timestamps JSON (`words.json`) into clean steady karaoke `subtitles_data.ts` matching `Subtitles.tsx`, with automatic **orphan-word avoidance** (never ends a caption chunk on a dangling `"A"`, `"THE"`, `"OF"`, `"WITH"`, `"WITHOUT"`, `"AND"`!).
5. **`package-pc`** — Pure-Python `zipfile` packager (no external `zip` binary needed!) that cleanly bundles `workspace-remotion` (including `mix.wav`, `shots.json`, `short_qa.py`, and all source/assets while excluding `node_modules/`, `.git/`, and temp caches) ready to drag-and-drop into **Voidmetric PC Render Studio** on your local PC!
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

## Execution Modes (Select in Prompt or at Stage 1)

Every run operates in one of **3 modes** (default: `MODE: INTERACTIVE` if unspecified):

| Mode | Human Pauses | Autonomous Self-Critique | Best For |
|---|---|---|---|
| **`MODE: INTERACTIVE`** *(default)* | **2 Gates:** pauses at **Stage 3** (Lore/Script approval) AND **Stage 4** (Character 3D turnaround approval) | Standard pre-gate inspection | Brand-new episodes while awake with hands-on approval |
| **`MODE: OVERNIGHT_AUTOPILOT`** *(Sleep Mode)* | **0 pauses** if voiceover + refs are uploaded upfront *(or **1 pause** after Stage 3 ONLY to collect voiceover + refs, then **0 pauses** Stages 4 → 7!)* | **STRICT Autonomous Gate Loops:** runs up to 2 self-critique + fix passes on Stage 4 `CastSheet3D` (`f0..f5`) AND Stage 6 `LookCheck3D` (16 tiles) before zipping! | Overnight / hands-off runs — wake up to the finished `episode_<slug>_pc_bundle.zip` ready for **Voidmetric PC Render Studio**! |
| **`MODE: FAST_REDO`** | **0 pauses** (reuses user's existing voiceover, script, and/or approved 3D rig) | **STRICT Autonomous Stage 6 Look-Check Loop** before zipping | Re-directing an existing episode with upgraded painted worlds, framing, or zero-VFX fixes |

> [!IMPORTANT]
> **Autopilot Quality Guarantee:** `MODE: OVERNIGHT_AUTOPILOT` and `MODE: FAST_REDO` NEVER skip visual verification — they replace waiting on human clicks with mandatory agent visual inspection + auto-fix passes, and save `cast_preview.jpg` + `lookcheck_sheet.jpg` alongside `episode_<slug>_pc_bundle.zip` so the user can review everything in the morning before rendering on PC!

---

## Workflow (7 Mandatory Stages & Mode-Aware Gates)

### Stage 1 — Topic Intake, Mode & Genre Classification, Asset Request & SFX Prompts
1. Confirm the active mode (`MODE: INTERACTIVE`, `MODE: OVERNIGHT_AUTOPILOT`, or `MODE: FAST_REDO`). If the user did not specify a mode, default to `MODE: INTERACTIVE` and mention that they can switch to `MODE: OVERNIGHT_AUTOPILOT` as soon as they drop their voiceover & references.
2. Run `whatif_cli.py init-episode` (`--profile cloud-1080p --bootstrap-remotion` in Gemini Tasks; `--profile local-2k` on local GPU PC).
3. **MANDATORY Genre & Visual-Tone Classification (NEVER mix magic VFX into grounded anime!):**
   Classify the character's source anime into ONE of 4 strict visual modes right at Stage 1 and record it in `LORE_FACT_SHEET.md` + `PLAN.md`:
   - **`supernatural_combat`** (*Dragon Ball*, *JJK*, *Bleach*, *Naruto*, *JoJo*, *Solo Leveling*, *Demon Slayer*) — Full 3D GLSL power VFX (`EnergyOrb3D`, `EnergyAura3D`, beams, lightning, bespoke shaders) + Sakuga Impact Frames + cosmic/battlefield arenas.
   - **`grounded_genius`** (*Dr. STONE*, *Death Note*, *Classroom of the Elite*, *Vinland Saga*, *Blue Lock*, *Monster*, *Haikyu!!*) — **STRICTLY BAN** fantasy energy auras, glowing magic halo rings, levitation (`hover_float`), cosmic purple voids, and Kamehameha/palm-blast poses! Tell the story through **painted realistic sets** (`buildBedroom`, `buildClassroom`, `buildScienceLab`, `buildSchoolTrackGym`, `buildCityStreet`, `buildForestGrove` or custom painted sets via `makePaintedMat`), **physical 3D props** (flasks, notebooks, chalkboards, blueprints, tools), **grounded human acting** (`inspect_prop`, `write_board`, `wheeze_knees`, `talk_gesture`, `sit_desk`), and expressive **face close-ups**!
   - **`mecha_tech`** (*Cyberpunk*, *Code Geass*, *Gundam*, *Iron Man*) — Crisp tactical HUDs, sparks, metallic machinery, clean engineering light; no fantasy flame auras.
   - **`dark_thriller`** (*Attack on Titan*, *Chainsaw Man*, *Tokyo Ghoul*, *Berserk*) — Gritty moody lighting, physical blade/smoke/blood-splash FX, grounded tense framing.
4. Ask the user for (unless ALREADY uploaded upfront in `MODE: OVERNIGHT_AUTOPILOT` / `MODE: FAST_REDO`):
   - **Reference images** of the guest anime character(s), iconic poses, and signature props/VFX.
   - **Voiceover plan** (user-uploaded **~52–62 s** voiceover `.mp3`/`.wav`, target **150–175 words** — keep tightly around ~60 s!).
5. Give the user **5 tailored SFX generation prompts** matched strictly to the episode's genre (e.g., chalk scribbling, glassware clinking, heavy panting, heartbeats for `grounded_genius` — NOT sci-fi laser hums!). If the user runs `MODE: OVERNIGHT_AUTOPILOT` without custom SFX files, synthesize clean genre-matched procedural SFX in `mix_episode.py` automatically!

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

### Stage 3 — ~60s Viral Script, Genre-Matched 3-Second Hook Gate & Adversarial Lore Audit (**APPROVAL GATE 1**)
1. Draft `projects/<slug>/SCRIPT.md` (**150–175 words**, **`52–62 s` target — NEVER exceed `65 s`!**) using the proven Voidmetric beat arc (`references/beerus-gold-standard/SCRIPT_beerus_example.md`). Avoid repetitive gimmick standalone `"Wrong."` drops — earn the twist naturally through an escalating consequence!
2. **Mandatory Genre-Matched First-3-Seconds Retention Hook Check (`f0–f90`):** Confirm that within the first `2.8 seconds` (`<= frame 84`), the viewer immediately sees a punchy visual hook matched to the episode's genre — zero slow fade-ins or static full-body talking intros:
   - For **`supernatural_combat` / `mecha_tech` / `dark_thriller`**: (a) active glowing 3D power/tech/action VFX in frame 0, (b) MC's sharp-jawline reaction, AND (c) immediate physical consequence.
   - For **`grounded_genius`**: (a) dramatic tight face close-up or dynamic physical prop/environment reveal in frame 0 (e.g., wide-eyed waking realization, chalkboard equation burst, real lab experiment), (b) crisp facial acting, AND (c) immediate real-world consequence — **ZERO glowing magic halos or fake fantasy auras!**
3. **Adversarial Lore Audit:** Perform an independent line-by-line audit trying to **disprove every factual claim** in `SCRIPT.md` against `LORE_FACT_SHEET.md` and official canon. Fix any inaccuracy and record `PASS` sign-off in `LORE_FACT_SHEET.md`.
4. **Stage 3 Mode Gate:**
   - In **`MODE: INTERACTIVE`**: Present `LORE_FACT_SHEET.md`, flagged spoilers, `SCRIPT.md`, and the 5 SFX prompts. **STOP and wait for explicit user approval + voiceover.**
   - In **`MODE: OVERNIGHT_AUTOPILOT`**:
     - If the user has **NOT** uploaded the voiceover yet: present `SCRIPT.md` + 5 SFX prompts and pause **ONCE** to collect their voiceover (+ reference images / optional SFX). The moment they upload the voiceover, proceed **nonstop through Stages 4 → 5 → 6 → 7 with ZERO further pauses!**
     - If the user **ALREADY** uploaded the voiceover & references upfront: align `SCRIPT.md` to their actual uploaded voiceover transcript, pass Adversarial Lore Audit, and proceed **immediately nonstop through Stages 4 → 5 → 6 → 7!**

### Stage 4 — 3D Anime Rig Showcase (**HARD STOP IN `INTERACTIVE` | AUTONOMOUS SELF-CRITIQUE IN `OVERNIGHT_AUTOPILOT`**)
> [!CAUTION]
> - **In `MODE: INTERACTIVE`:** **HARD STOP BEFORE VIDEO CREATION** — You MUST create the 3D character rigs, render visual turnaround + close-up + expression showcase plates (`f0..f5`), and **show them directly to the user for explicit visual approval BEFORE building worlds, VFX, scene timelines, or packaging!**
> - **In `MODE: OVERNIGHT_AUTOPILOT`:** **DO NOT PAUSE FOR USER INPUT** — Instead, execute a **strict autonomous visual self-critique loop (up to 2 fix iterations)** comparing EVERY rendered `CastSheet3D` plate (`f0..f5`) directly against the user's reference images, fix every proportion/face/hair/outfit/color flaw, re-render to verify, save the final preview image to `projects/<slug>/out/preview_cast_sheet.jpg`, and **proceed immediately to Stage 5!**

1. **Reuse `rig3d_mc.ts` untouched as the recurring Channel MC** (24 bones, razor-sharp anime V-jawline, glasses, spiky hair, black zip jacket/white tee). Only add episode-specific actions/expressions in `setAction`.
2. **MANDATORY 3D CHARACTER ACCURACY, PROPORTIONS & DETAIL STANDARD:**
   Every newly created anime/manga character rig MUST be as **accurate and detailed to the original character in every proportion** as 3D procedural geometry + 1024×1024 UV painting can achieve — matching the Dragon Ball FighterZ–style cel-shaded quality bar of Beerus & Whis (`references/beerus-gold-standard/rig3d_beerus_sheet.jpg`, `rig3d_cast_lineup.jpg`). **NEVER build generic low-effort capsule/sphere placeholders!**
   - **NO CIRCLE / EGG HEADS + ARCHETYPES + LIVE ANIME EXPRESSIONS & EYE-GAZE (STRICT FACIAL ANATOMY RULE):**
     - **NEVER** sculpt a humanoid anime head out of a plain sphere or simple circular/elliptical `loftRings` (causes ugly round potato faces and tiny squished eyes!).
     - **ALWAYS use `buildAnimeHead3D({ archetype })` + `createAnimeFaceController()` + `makeAnimeMat({ isFace: true })`** from `rig3d_core.ts`! Supports 4 built-in anatomical archetypes (`shonen_male`, `female_anime`, `muscular_boss`, `chibi_kid`), a 14-ring shield-head with flat front plane, sharp V-chin, upswept side-profile jawline, distortion-free planar front UVs, real 3D sculpted nose & ears, **10 live expressions** (`neutral`, `smirk`, `grin`, `serious`, `intense`, `snarl`, `shout`, `shock`, `pain`, `smug_closed`), **automatic eye-blinking** (~every 3.4 s), **talking lip-flap**, and **live iris eye-gaze (`rig.setGaze(gx, gy)`)**, while keeping character-specific `customDraw` scars/markings intact across EVERY state!
     - **Dynamic Facial Acting:** Never leave a character frozen on one face for 60 seconds — call `rig.setExpr?.(expr, t, talk)` & `rig.setGaze?.(gx, gy)` inside `cast.ts` / `setAction()` to match every story beat, and render `EpisodeCastSheet3D` frames `f4` & `f5` in Stage 4 to visually verify expressions!
     - For non-human characters, use sculpted `loftRings` with explicit `shape` + `yMod` + `isFace: true` + 3D snout/ears.
   - **Exact Canonical Proportions, Multi-Lock Hair & Costume Detail:** Inspect every user reference image before writing code. Match canonical ~7-head-tall shonen body proportions & height relative to the Channel MC (`~1.75 m`), slim waist, upturned collars, layered garments, footwear, and signature accessories. Sculpt **curved S-wave multi-lock 3D hair** via `sculptCurveTube` with varied lock widths and swept bangs framing — NEVER covering — the eyes (never stiff straight cones or smooth sphere domes!).
   - **Full Articulated Skeleton (`24–34` bones) & 5-Finger Hands:** Always use `buildHand3D` (with accurate claws/gloves/wraps) so close-up hand poses and bone-locked 3D VFX look faithful to the anime/manga.
3. **Export, Self-Critique & Visual Showcase:**
   - Export portable `.glb` rigs via `scripts/export_rigs_glb.mjs`, and render **clear visual showcase images** (`--gl=swangle --concurrency=1` in cloud, `--gl=angle --concurrency=4` on GPU):
     - Front / 3/4 / Side / Back turnaround sheet for every newly created guest character,
     - Tight face & expression close-up render,
     - Full cast height/proportion/style lineup standing next to the locked Channel MC rig.
   - **Mandatory Agent Self-Critique First:** Visually compare your rendered turnaround & face close-up directly against the user's reference images and fix any proportion, face, hair, costume, or color mismatch BEFORE presenting to the user.
4. **Stage 4 Exit Gate:**
   - **In `MODE: INTERACTIVE`:** Present the rendered character showcase images to the user and **STOP**. Wait for explicit approval (or apply any likeness/proportion/detail fixes requested and re-show) before starting Stages 5–7!
   - **In `MODE: OVERNIGHT_AUTOPILOT`:** After your self-critique pass confirms likeness, proportions, hair, outfit, and all 8 expressions look clean, save the cast turnaround preview and continue **automatically without stopping** into Stages 5 → 6 → 7!

### Stage 5 — Audio Mastering & Rock-Steady Karaoke Subtitle Sync
1. Keep the user's uploaded voiceover **100% untouched** — run `whatif_cli.py align-voice --input <uploaded_voice> --wav-out projects/<slug>/voice/voice.wav --words-out projects/<slug>/voice/words.json --fps 30` to convert to 48 kHz 24-bit WAV and extract exact Whisper word timestamps automatically.
2. Run `whatif_cli.py sync-subtitles` on `words.json` to generate `subtitles_data.ts` + verify exact beat sync (every visual impact in `story.ts` lands `0–3 frames` before its spoken punch word!).
3. Customize `projects/<slug>/audio/audio_cues.json` (pick a procedural anime music mood: `shonen_battle`, `dark_cosmic`, `mystery_science`, `cyber_thriller`, or `tragic_twist`, set BPM, twist-drop silence timestamps, and SFX cues) and run `mix_episode.py` (`-14.5 LUFS`, true peak `<= -1.1 dBTP`, 0 unintended silences).

### Stage 6 — Custom-First Painted 3D Worlds, Bespoke VFX, Multi-Scale Directing & Zero-Clipping Look-Check Gate
1. **Custom-First Painted Textured 3D Worlds (Hardcoded Presets Are OPTIONAL — Build Whatever the Episode Needs!):**
   Build 5–6 **visually distinct**, richly textured spatial 3D zones (`0, 120, 240, 360, 480, 600`) tailored specifically to the anime's world:
   - **Build Custom Painted Environments Freely:** You are **NOT restricted to hardcoded preset rooms!** Whenever the story needs a unique location (e.g., *One Piece* pirate ship deck & ocean, *AoT* brick rooftops & Titan Wall, *JJK* Shibuya subway platform, *Demon Slayer* tatami dojo & wisteria courtyard, *Solo Leveling* stone dungeon hall, *Dr. STONE* straw-hut village & furnace, *Death Note* skyscraper rooftop, *Blue Lock* soccer pitch), **code it directly in `world.ts`** using the exported toolkit from `env3d_core.ts`:
     - **`makePaintedMat(w, h, draw, { repeatX, repeatY })`** / **`makeEnvTex(...)`** + **`celTex(tex)`** + **`hash01(seed)`** — paints ANY deterministic high-res `CanvasTexture` (brick, tatami, weathered planks, stone tiles, ocean waves, shop signs, chalkboard, blueprints, foliage) right into Voidmetric's `twoTone` cel lighting & ink outline pass!
     - **Quality Rule:** Every major custom floor, wall, road, ground, or architectural facade MUST carry a painted `CanvasTexture` via `makePaintedMat` / `makeEnvTex` (NEVER raw untextured Play-Doh boxes, and NEVER `Math.random()` — always use `hash01()` for frame parity!).
   - **Optional Ready-Made Sets:** When a scene already matches one of the 9 painted sets in `env3d_core.ts` (`buildBedroom`, `buildClassroom`, `buildScienceLab`, `buildSchoolTrackGym`, `buildModernRoom`, `buildCityStreet`, `buildForestGrove`, `buildBattlefieldCrater`, `buildCosmicRealm` *(supernatural only!)*) or `buildCelClouds`/`buildStarfield`, feel free to use or customize them — and **NEVER recycle the exact same room for 3 different locations!**
2. **Mandatory Shot-Scale Rhythm & Rule-of-Thirds Staging (NO Monotonous 5 m Full-Body Loops!):**
   - **Never run more than 2 full-body shots in a row!** Alternate deliberately across:
     - **Extreme Face Close-Ups (`1.6–2.1 m`, `shot_type: "closeup"`)** — showcase live expressions (`smirk`, `shock`, `pain`, `intense`), eye-gaze, and sweat/reactions!
     - **Prop / Hand Inserts (`1.1–1.5 m`, `shot_type: "insert"`)** — cut directly onto flasks, chalkboards, notebooks, weapons, or triggers so details read crisply!
     - **Medium Waist-Up (`2.6–3.2 m`, `shot_type: "medium"`)** — primary dialogue, lab work, and reaction beats!
     - **Wide Establishing / Full-Body (`4.4–5.4 m`, `shot_type: "full_body"`)** — locomotion, arena reveals, and full-body action!
   - **Rule-of-Thirds Prop Staging:** When a chalkboard, blueprint board, desk, or key prop sits behind a character, offset the character cleanly into the left or right third (`x = ±0.26..0.38 m` in 9:16 medium shots so the outer shoulder stays inside the frame!) or frame over-the-shoulder (`overShoulder`) so the character's torso NEVER blocks the prop!
3. **18-Clip Animation Library, Custom Poses & Clean MC Cameos:**
   - Use `anim3d_core.ts` (`applyAnimeMotion`, `blendAnimeMotions`, `applySecondarySway`) OR author custom joint poses directly whenever a beat calls for unique acting!
     - **Grounded Acting & Skirt-Safe Motion:** `idle_hero`, `walk`, `run_skirt_safe` *(use whenever character wears a tunic, skirt, or long coat!)*, `wheeze_knees` *(hands-on-knees exhaustion with face visible!)*, `inspect_prop`, `write_board`, `talk_gesture`, `sit_desk`, `kneel_exhausted` *(face readable!)*.
     - **Combat / Supernatural Motion:** `run`, `sprint_lean`, `hover_float` *(ONLY for characters who canonically fly!)*, `power_charge`, `finger_snap`, `palm_blast`, `sword_slash`, `punch_combo`, `recoil_hit`.
   - **MC Cameo Acting Rule:** Never leave MC frozen in `wake_orb` cradling an invisible orb or in `power_aura` unless an actual orb/aura exists in that shot! Use `mc.setPose("idle_casual", t)` or `applyAnimeMotion(mc, "talk_gesture" | "inspect_prop" | "wheeze_knees" | "walk", p, t, 0.94)` for grounded cameos!
4. **Custom-First, Genre-Matched 3D VFX & Sakuga FX (Hardcoded VFX Presets Are OPTIONAL!):**
   - **Create Custom VFX Whenever the Story Needs It:** You are **NOT limited to the 9 preset classes** in `vfx3d.ts`! Use the exported custom VFX toolkit from `vfx3d.ts` — **`createCustomVFXMat({ fragmentBody, colorA, colorB, additive })`**, **`NOISE_GLSL`**, **`getGlowSpriteTex(col)`**, and **`setNoInkTree(mesh)`** — to code **ANY bespoke 3D shader or particle effect** right inside `vfx3d.ts` or `world.ts`:
     - Supernatural examples: JoJo Time-Stop ripple/inversion dome, Sukuna crisscrossing slash cage, Demon Slayer fluid water/flame ribbons, Law's spherical `ROOM`, Solo Leveling shadow-soldier mist, Gojo spatial warp lens, alchemy transmutation sparks.
     - Grounded/physical examples: boiling flask steam wisps, furnace smoke & embers, chalk dust cloud, rain streaks, sweat drops, welding sparks, ocean spray, fluttering pages!
   - **Optional Presets:** The 9 universal presets (`EnergyOrb3D`, `EnergyAura3D`, `EnergyBeam3D`, `LightningArc3D`, `makeDissolveMat3D`, `MoteSwarm3D`, `ShockwaveBlast3D`, `EnergySlice3D`, `DomainBarrier3D`, `KanjiBurst3D`) are available whenever they genuinely fit a `supernatural_combat` power — NEVER force them onto an episode that doesn't have magic!
   - **Grounded Anime Strict Guardrail:** For `grounded_genius` anime, **ZERO** fantasy `EnergyAura3D`, **ZERO** glowing magic halo rings, **ZERO** levitation! Only real physical props & subtle realistic FX (steam, smoke, chalk dust, sparks) if physically earned.
   - **Bone-Locking Rule:** Always call `this.cast.update(...)` + `this.root.updateMatrixWorld(true)` FIRST, place all VFX strictly on layer `NOINK` (`setNoInkTree`), and attach hand/weapon VFX via `bone.localToWorld(...)` (`+0.12..0.15 m` palm-to-camera offset). Add 2–3f `IMPACT_FRAMES` / `SPEEDLINES` (`sakuga_fx.tsx`) only when they match the genre!
5. **Zero-Clipping 9:16 + Beat-Sync Gate:**
   - Run `whatif_cli.py check-framing` (`PASS`, tagging close-up/medium/insert shots with `"shot_type": "closeup" | "medium" | "insert"`) AND `whatif_cli.py check-beats` (confirming every impact lands `0–4 frames` before its punch word!).
   - Render `EpisodeLookCheck3D` (`16` frames at `540×960`, `--gl=swangle --concurrency=1` in cloud / `--gl=angle --concurrency=4` on GPU), tile into `sheet_3d.jpg`, and **visually inspect every tile**. Fix ANY clipped head/limb, blocked prop, flat untextured room, or genre-mismatched VFX before full render!

### Stage 7 — Package `.zip` for Local PC Render Studio (Primary) & Final Delivery
Once all 16 tiles of `EpisodeLookCheck3D` pass visual inspection:

1. **DEFAULT CLOUD DELIVERY (Gemini Tasks → Local PC Render Studio — Native 2K GPU):**
   1. Ensure `projects/<slug>/out/shots.json` exists with exact shot boundaries (`[{"id": 1, "name": "...", "a": 0, "b": ...}, ...]`) AND mastered `projects/<slug>/audio/mix.wav` (`-14.5 LUFS`) exists.
   2. Package the lightweight render bundle immediately with:
      ```bash
      python3 scripts/whatif_cli.py package-pc \
        --remotion-root ./workspace-remotion \
        --slug <slug> \
        --out-zip ./episode_<slug>_pc_bundle.zip \
        --output /tmp/pkg_pc.json
      ```
      Verify `contains_mastered_mix_wav: true` and `contains_shots_json: true` in `/tmp/pkg_pc.json`.
   3. Deliver `./episode_<slug>_pc_bundle.zip` directly to the user (along with the Stage 4 Cast Turnaround + Stage 6 16-Tile Look-Check preview images and a concise QA summary: word count, duration, LUFS, framing `PASS`, beat-sync `PASS`, and self-critique fixes made) so they can upload the `.zip` into **Voidmetric PC Render Studio** (`http://127.0.0.1:7860`) on their PC — which automatically links shared `node_modules`, upgrades `EFFECT_MSAA` to `4`, renders native **2K (`1440×2560`, 30 fps, `--gl=angle`)**, muxes `mix.wav`, renders subtitle-free `EpisodeThumb`, and runs `short_qa.py` locally!
2. **Optional Cloud Self-Render Fallback (ONLY if the user explicitly asks to render in Gemini Tasks instead of on their PC):**
   1. Render the full **`1080×1920` @ `30 fps`** video in safe OOM-proof 300-frame chunks:
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
   2. Run `python3 scripts/whatif_cli.py qa-audit --video <final_1080p.mp4> --shots-json <shots.json> --qa-dir <qa_dir> --profile cloud-1080p --output /tmp/qa_report.json`, visually inspect key contact sheets, and deliver the final 1080p MP4.
3. **Direct Local GPU PC CLI (`local-2k`, `1440×2560` @ `30 fps`):**
   1. Set `REMOTION_TMP=F:/remotion-tmp`, render native `EpisodeShort2K` (`--crf=16 --gl=angle --concurrency=4`), mux with `-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest`, and clean temp caches.
   2. Run `uv run scripts/whatif_cli.py qa-audit --video <final_2k.mp4> --shots-json <shots.json> --qa-dir <qa_dir> --profile local-2k --output <qa_report.json>`, visually inspect key contact sheets, and deliver the final 2K MP4.

---

## Locked Style & Engineering Contracts

| Contract | Locked Value / Rule |
|---|---|
| **Channel MC Rig** | `templates/rigs3d/rig3d_mc.ts` (sharp anime V-jawline, glasses, spiky hair, black zip jacket/white tee) |
| **Subtitles** | `Subtitles.tsx`: `60px` baseline (`height / 1920` scaled), crisp dark outline + karaoke purple/gold highlight, **NO black background box**, **NO pop-up/bounce animation** |
| **9:16 Safe Frustum** | `halfWidth = D * tan(fov/2) * 0.5625`; `0` clipped limbs, hair spikes, orbs, kanji, or staffs |
| **Bone-Locked VFX** | Real-time `localToWorld` attachment; forward palm orbs offset `+0.12..0.15 m` toward camera |
| **Cloud 1080p Spec (Gemini Tasks)** | Native `1080×1920` @ `30 fps`, **`EFFECT_MSAA = 2`** (NEVER 0!), `--gl=swangle --concurrency=1`, 300f resumable chunks (`render-cloud`), CRF 17, AAC 256k, `-14.5 LUFS` |
| **Local 2K Spec (GPU PC)** | Native `1440×2560` @ `30 fps`, `EFFECT_MSAA = 4`, `--gl=angle --concurrency=4`, CRF 16, AAC 256k, `-14.5 LUFS` |
| **Publishing Extras & Memory** | Render subtitle-free `EpisodeThumb` (`1080×1920` PNG), export `.srt` via `whatif_cli.py export-srt`, and log completed episodes in `CHANNEL_BIBLE.md` |

---

## Common Mistakes (Never Repeat!)

1. **NEVER Set `EFFECT_MSAA = 0` With `LensBlur` (100% Black Screen Bug!):** In `postprocessing` v6, `multisampling={0}` shares the depth buffer between `inputBuffer` and `outputBuffer`, causing `GL_INVALID_OPERATION: Feedback loop formed between Framebuffer and active Texture` and rendering a completely black 3D scene. Always use **`EFFECT_MSAA = 2`** on CPU `swangle` and **`EFFECT_MSAA = 4`** on GPU (`angle` / `angle-egl`).
2. **OOM Crash in Gemini Tasks:** Never run `--concurrency=4` or `--gl=angle` on a 2-vCPU / 6.9 GiB RAM / 0-swap CPU cloud box. Always use `cloud-1080p` (`EFFECT_MSAA=2`, `--gl=swangle --concurrency=1`, 300-frame chunks via `render-cloud`).
2. **Floating or Behind-the-Hand VFX:** Always call `root.updateMatrixWorld(true)`, track via `bone.localToWorld(...)`, and apply `+0.12..0.15 m` palm-to-camera offset on forward palm orbs.
3. **9:16 Edge Clipping:** 9:16 vertical video is narrow (`halfWidth ≈ 0.21 × D` at `fov = 41°`). Always pass `check-framing` and visually inspect all 16 tiles of `EpisodeLookCheck3D` before full render.
4. **NaN Bloom Blackout:** Always clamp non-integer powers as `Math.pow(Math.max(0, x), exp)`.
5. **`dispose={null}` on `InkPass`:** Never put `dispose={null}` on `<primitive object={fx.ink} />`; dispose safely in `useEffect`.
6. **Remotion `--scale 1.3333` & Disk Exhaustion:** Always render native `EpisodeShort1080` or `EpisodeShort2K` (never `--scale`), route `REMOTION_TMP` to `/tmp/remotion-tmp` or `F:/remotion-tmp`, and clean bundle caches between chunks.
