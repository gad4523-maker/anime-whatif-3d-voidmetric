---
name: anime-whatif-3d-voidmetric
description: >-
  Zero-hardcoding pure-primitives production pipeline for ~60 s vertical 2K
  (local-2k via Voidmetric PC Render Studio) or 1080p (cloud-1080p fallback in
  Gemini Tasks) 30 fps 3D Anime/Manga "What If You Woke Up With [Character]'s
  Power?" shorts rendered in Three.js + Remotion. Zero hardcoded environments,
  camera angle presets, VFX classes, lighting dropdowns, prop builders, or
  music mood dropdowns — every world, shot, lighting, prop, and VFX is authored
  bespoke from pure low-level 3D primitives, while keeping optional reusable
  facial expressions and 26-bone humanoid character movements alongside custom
  posing. Enforces full-canon lore fact-checking, strict zero unreferenced
  named characters, locked Channel MC 3D rig, cel-shaded 3D anime rigs with
  .glb export, clean floating karaoke subtitles, anti-tripod camera
  verification, 9:16 frustum verification, PC `.zip` bundle export
  (`package-pc`), and full short_qa.py audits.
---

# Anime What-If 3D Short — Voidmetric `v5.0` Zero-Hardcoding Pure-Primitives & Local RTX GPU Studio Pipeline

## Overview

Produces viral **~60-second vertical 30 fps 3D Anime explainer Shorts** with **ZERO hardcoded presets** — every environment, texture, lighting mood, camera angle/path, character pose, prop, VFX shader, rigid-body destruction shatter, GPU particle burst, acoustic space, and physical audio score is authored uniquely for the episode using pure low-level 3D & DSP primitives, backed by **Voidmetric PC Render Studio `v5.0`** (2K GPU Renderer + Local RTX AI 3D Asset Forge).

**ONLY two channel-identity elements stay locked across episodes:**
1. **Recurring Channel MC 3D Rig** (`rig3d_mc.ts`)
2. **Clean Floating Karaoke Subtitle Renderer** (`Subtitles.tsx` — bundled OFL `Montserrat-Black.ttf`, crisp dark outline, karaoke highlight, NO black box, NO pop-up/bounce animation)

**Supported execution workflows:**
- **`gemini-to-pc` (PRIMARY — Build in Gemini Tasks / Codex, Render Native 2K on Local PC GPU):** Build Stages 1–6 in cloud (`cloud-1080p` profile: `EFFECT_MSAA = 2`, `--gl=swangle --concurrency=1` for fast Look-Check stills), package via `whatif_cli.py package-pc`, and drag-and-drop into **Voidmetric PC Render Studio** (`http://127.0.0.1:7860`) to render native **2K `1440×2560` @ `30 fps`** (`EFFECT_MSAA = 4`, `--gl=angle --concurrency=4`), mux `mix.wav`, render `EpisodeThumb`, and run `short_qa.py` locally.
- **`cloud-1080p` (Optional Cloud Self-Render Fallback):** Only if explicitly requested — uses `--gl=swangle --concurrency=1`, `EFFECT_MSAA = 2`, `/tmp/remotion-tmp`, and 300-frame resumable chunks (`whatif_cli.py render-cloud`).
- **`local-2k` (Direct Local GPU PC CLI):** Native `EpisodeShort2K` (`1440×2560`, `30 fps`), `--gl=angle --concurrency=4`, `EFFECT_MSAA = 4`, `F:/remotion-tmp`.

> [!IMPORTANT]
> **Zero-Hardcoding Pure-Primitives Architecture (`v5.0`):**
> This pack ships **NO** hardcoded rooms/environments, **NO** hardcoded camera angle presets, **NO** hardcoded VFX classes, **NO** hardcoded prop builders, **NO** closed lighting dropdowns, **NO** hardcoded reverb room dropdowns, and **NO** fixed music mood dropdowns. Every world, lighting mood, camera angle/path, prop, VFX, rigid-body shatter, acoustic space, and score is authored bespoke for the episode using pure primitives — while keeping **optional reusable facial expressions** (`rig3d_core.ts`) and **optional reusable 26-bone humanoid movements** (`anim3d_core.ts`) alongside custom posing (`createPose`):
> - **Painted Worlds & Ghibli/Shinkai Primitives (`env3d_core.ts`, `world_fx.ts`):** `hash01`, `makeEnvTex`, `cel`, `celTex`, `makePaintedMat` + **`createAnimeWaterMat`** (Voronoi cel water/caustics/foam), **`createWindGrassField`** (GPU-instanced wind-swept grass), **`createShinkaiCloudDeck`** (3-tone cumulus sky deck), **`createParametricTree`** (`@dgreenheck/ez-tree`), **`createMangaText3D`** & frame-0-safe **`createMangaTextPlane3D`** (`troika-three-text`), **`createAnimeMeshLine`** (`meshline`), plus `three-custom-shader-material`
> - **Lighting (`lights.ts`):** Open `makeLightPreset(customSpec)` + `Record<string, EpisodeLightPreset>`
> - **Camera Math (`cam3d_core.ts`):** `runCamKeys`, `glide`, `flowEase`, `pushK`, `dollyPush`, `zoomPush`, `rolledCam`, `applyImpactKicks15Hz`, `computeWhipVelUV`, `focusOnPoint`, `rackFocusPull`, `clampSafe916Dist`
> - **3D Anime Sculpting, SDF Face Shadows, Angel-Ring Hair, Optional VRM & Cel `.glb` Loader (`rig3d_core.ts`, `vrm_core.ts`, `asset3d.ts`):** `makeAnimeMat` (2D SDF Face Shadow Threshold Map when `isFace: true` + Kajiya-Kay "Angel Ring" anisotropic hair sheen when `isHair: true`), `addPart`, `loftRings`, `sculptCurveTube`, `sculptLimbGeo`, `buildHand3D`, `buildAnimeHead3D`, `createAnimeFaceController`, **`loadVRMCharacter` / `loadVRMAnimation`** (`@pixiv/three-vrm`), plus **`v5.0` `loadAnimeGLB` / `loadMultiPartGLB`** (auto-converts ANY rigid or skinned `.glb` from local RTX `TripoSG`, `PartCrafter`, `UniRig`, or `Blender 4.5 LTS` into `ANIME_LIGHT`-synced cel-shaded anime meshes with smooth-normal outlines & deterministic `setFrame(f)`!)
> - **Custom Pose Math, Closed-Form Two-Bone IK, Deterministic Spring-Bones & Optional 18 Movements (`anim3d_core.ts`, `props3d_core.ts`):** `createPose`, `applyPoseSnapshot`, `blendPoseSnapshots`, **`applyTwoBoneIK` / `applyFootLockIK` / `applyHandReachIK`** (zero foot-sliding!), **`bakeSpringChain`** (deterministic pre-baked hair/cape/coat physics with body colliders!), `applySecondarySway` + optional reusable clips (`evaluateAnimeMotion`, `applyAnimeMotion`, `blendAnimeMotions`) + `attachToHand`, `attachThroughGrip`
> - **3D Destruction, Rapier3D Rigid-Body Physics, Deterministic Quarks GPU Particles & Sakuga Smears (`destruct3d.ts`, `particles3d.ts`, `vfx3d.ts`, `sakuga_fx.tsx`):** **`createVoronoiFracture`** & **`createPlaneSlice`** (`@dgreenheck/three-pinata`), **`v5.0` `bakeRapierDestruction`** (bit-deterministic `@dimforge/rapier3d-compat` Rust/WASM rigid-body rubble colliding against floors, walls & each other in O(1)!), **`runMeshCSG`** (`three-bvh-csg`), **`v5.0` `createDeterministicQuarksRig`** (Mulberry32-seeded `three.quarks` GPU stretched sparks/embers on `NOINK` layer!), `createCustomVFXMat`, `createLimbSmearRibbon`, `createAfterImageMat`, Kanada clumped radial wedges (`SpeedlineCue`), and angular `KiteBoltCue` + flying shards
> - **35mm Optical Finishing, Chromatic AO & Painterly Pass (`templates/engine/`):** Optional **`createChromaticAO`** (`n8ao` CC0 chromatic plum/indigo crevice AO via `USE_CHROMAO`), `InkPass`, 2-pass `LensBlur`, 6-level HDR `BloomEffect`, 16-tap `WhipBlur`, `ToneMappingEffect(NEUTRAL)`, `GradeEffect`, optional **`KuwaharaEffect`** (`KUWAHARA` anisotropic brushstroke pass), **`FilmOpticsEffect`** (3-scale warm 35mm halation, radial corner CA, C1 `tanh` highlight shoulder, ragged `SHOCKWAVES` refraction rings, luminance-enveloped film grain)
> - **Zero-Dependency Node.js Physical Audio Studio + `stable-ts` Forced Alignment (`templates/audio/*.mjs` + `align-voice --script-text` + `extract-events`):** 24 physical SFX primitives, Karplus-Strong/Helmholtz/modal physical scoring, `createSpaceIR` parametric room convolution, `1.9–3.0 kHz` voice-presence carving, Bark stand-out lift, pre-impact silence dips, `-14.5 LUFS / -1.1 dBTP` mastering, and `stable-ts` forced alignment against `SCRIPT.md`
> - **Local RTX GPU Asset Forge (`whatif_cli.py forge-asset` + Voidmetric PC Render Studio `v5.0`):** Forge 3D `.glb` props/characters (`TripoSG`), multi-part destructible `.glb` sets (`PartCrafter`), or AI-rigged + headless **Blender 4.5 LTS** auto-skinned `.glb` characters (`UniRig`) directly on your local GPU, preview in an offline Three.js cel-shaded 3D turntable, and inject into any episode's `public/assets/` in 1 click!

---

## Dependencies

- **Built-in Web Search & Research Verification:** Required for Stage 2 (Canon Lore Fact-Check) and Stage 3 (Adversarial Lore Audit).
- **Cloud Linux Sandbox (`cloud-1080p`):** Debian 12 Linux, Node.js 18+, Python 3.11+ (`pip install numpy scipy pillow`), FFmpeg 5.1+.
- **Local GPU PC (`local-2k`):** Node.js 20+, Remotion + Three.js, FFmpeg, `uv` (`uv run`).

---

## Quick Start

```bash
git clone https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
cd anime-whatif-3d-voidmetric

python3 scripts/whatif_cli.py init-episode \
  --slug <episode-slug> \
  --title "What If You Woke Up With <Character>'s Power?" \
  --remotion-root ./workspace-remotion \
  --profile cloud-1080p \
  --bootstrap-remotion \
  --output /tmp/init_ep.json

cd workspace-remotion && npm install && cd ..
pip install -q numpy scipy pillow
```

*(On local PC with `uv`, use `uv run` and `--profile local-2k`.)*

---

## Utility Scripts (`scripts/whatif_cli.py`)

All subcommands write structured JSON to `--output` and exit `1` on errors:

1. **`init-episode`** — Scaffolds an immediately compilable (`tsc --noEmit` = 0 errors, `check-camera` = `PASS`) zero-hardcoding episode workspace with all pure engine primitives, `filmoptics.ts`, locked `rig3d_mc.ts`, `Subtitles.tsx`, `CastSheet3D.tsx`, `LookCheck3D.tsx`, `EpisodeShort.tsx`, the zero-dependency Node.js Physical Audio Studio (`audio_studio.mjs`, `dsp_core.mjs`, `phys_sfx.mjs`, `phys_inst.mjs`, plus `mix_episode.py`), and doc templates.
2. **`align-voice`** — Converts uploaded voiceover (`.mp3`/`.wav`/`.m4a`) cleanly to 48 kHz 24-bit stereo `voice.wav` and extracts exact Whisper word-level timestamps (`words.json`).
3. **`check-framing`** — Mathematically checks every shot camera against exact 9:16 vertical frustum bounds (`halfWidth = D * tan(fov/2) * 0.5625`). Supports `"shot_type": "full_body" | "medium" | "closeup" | "insert"` (`allow_bottom_crop`).
4. **`check-camera`** — **Anti-Tripod Cinema Camera Gate** (`--story-ts` pre-render OR `--video` post-render). Enforces dynamic pacing (`median >= 0.85 px/f`, target `1.5–3.6 px/f`; `hold_pct <= 45%`; `bursts_per_10s >= 2.5`, target `4.5–7.6`) and flags any shot `>= 2.5 s` parked on a static tripod.
5. **`extract-events`** — Auto-extracts picture-locked `AUDIO_EVENTS`, `SHOCKWAVES`, and `IMPACT_FRAMES` directly from `story.ts` into `projects/<slug>/audio/events.json` so physical SFX and pre-impact silence dips lock cleanly to exact 30 fps animation frames with zero manual drift.
6. **`sync-subtitles`** & **`export-srt`** — Converts `words.json` into steady 1–3 word karaoke `subtitles_data.ts` & `.srt` with automatic orphan-word avoidance.
7. **`check-beats`** — Verifies visual impact cues land `0–4 frames` before their spoken punch word.
8. **`package-pc`** — Pure-Python `.zip` packager bundling `workspace-remotion` (including `mix.wav`, `shots.json`, `short_qa.py`, excluding `node_modules/` and caches) for **Voidmetric PC Render Studio**.
9. **`render-cloud`** — OOM-proof resumable 300-frame chunked 1080p CPU renderer (`--gl swangle --concurrency 1`) + lossless FFmpeg concat & audio mux.
10. **`qa-audit`** — Runs `scripts/short_qa.py` enforcing resolution/fps, `-16.5..-13.0 LUFS`, `0` black/frozen frames, `<= 5%` held frames.
11. **`forge-asset`** — Local RTX GPU Asset Forge bridge (`--mode triposg|partcrafter|unirig|full-rig --input <img_or_mesh> --out-glb <dest.glb> --optimize`) invoking local `TripoSG`, `PartCrafter`, `UniRig`, `Blender 4.5 LTS`, and `gltf-transform` and returning a ready-to-paste `loadAnimeGLB` snippet.
12. **`.glb` Rig Exporter:** `node scripts/export_rigs_glb.mjs --remotion-root ./workspace-remotion --slug <slug> --rigs mc:rig3d_mc.ts:buildMCRig3D:idle_casual,guest:rig3d_guest.ts:buildGuestRig3D:idle`

---

## Execution Modes

Every run operates in one of **3 modes** (default: `MODE: INTERACTIVE`):

| Mode | Human Pauses | Autonomous Self-Critique | Best For |
|---|---|---|---|
| **`MODE: INTERACTIVE`** *(default)* | **2 Gates:** pauses at **Stage 3** (Lore/Script/Cast Roster approval) AND **Stage 4** (3D Character approval) | Standard pre-gate inspection | Hands-on approval at script & character stages |
| **`MODE: OVERNIGHT_AUTOPILOT`** *(Sleep Mode)* | **0 pauses** if voiceover + refs are uploaded upfront *(or **1 pause** after Stage 3 ONLY to collect voiceover + refs for all listed named characters, then **0 pauses** Stages 4 → 7!)* | **STRICT Autonomous Gate Loops:** up to 2 visual self-critique + auto-fix passes on Stage 4 `CastSheet3D` (`f0..f5`) AND Stage 6 `LookCheck3D` (16 tiles) before zipping | Overnight hands-off runs — wake up to the finished PC `.zip` |
| **`MODE: FAST_REDO`** | **0 pauses** (reuses existing voiceover, script, and/or approved rigs) | **STRICT Autonomous Stage 6 Look-Check Loop** before zipping | Re-directing an existing episode nonstop into a fresh PC `.zip` |

> [!IMPORTANT]
> `MODE: OVERNIGHT_AUTOPILOT` and `MODE: FAST_REDO` NEVER skip visual verification — they save `preview_cast_sheet.jpg` + `preview_lookcheck_sheet.jpg` alongside `episode_<slug>_pc_bundle.zip`.

---

## Workflow (7 Mandatory Stages & Mode-Aware Gates)

### Stage 1 — Topic Intake, Mode, Tone Alignment & Asset Request
1. Confirm active mode (`INTERACTIVE`, `OVERNIGHT_AUTOPILOT`, or `FAST_REDO`).
2. Run `whatif_cli.py init-episode` (`--profile cloud-1080p --bootstrap-remotion` in cloud; `--profile local-2k` on local GPU PC).
3. **Strict Visual-Tone Integrity (Match the Source Anime's Reality!):** Record the source anime's exact visual reality in `LORE_FACT_SHEET.md` & `PLAN.md`. **NEVER** add fantasy magic halos, glowing energy auras, levitation, or sci-fi beams to grounded/non-supernatural anime (like *Dr. STONE*, *Death Note*, *Vinland Saga*, *Blue Lock*, *Haikyu!!*) — tell grounded stories through bespoke physical environments, realistic props, expressive character acting, and physical micro-FX (steam, chalk dust, rain, sparks) only when physically earned!
4. Ask the user for (unless ALREADY uploaded upfront):
   - **Reference images** for the title character (front, 3/4, outfit, iconic props/VFX) — noting clearly that if Stage 3's script features ANY additional named canon character on screen, you **MUST** ask for reference images for EVERY additional named character before Stage 4!
   - **Voiceover plan** (~52–62 s `.mp3`/`.wav`, target 150–175 words).
5. Give the user **5 custom SFX generation prompts** tailored strictly to this specific episode's world and story beats.

### Stage 2 — Mandatory Full-Canon Lore & Power Fact-Checker Gate
> [!CAUTION]
> **NEVER restrict fact-checking to anime-only, and NEVER guess canon rules.**

1. **Official Canon Authority Hierarchy:**
   - **Tier 1 (Primary Canon):** Original source material (**Manga, Manhwa, Light Novels / Web Novels**), **Official Databooks / Fanbooks**, and **Author Q&As / Interviews**.
   - **Tier 2 (Canon Adaptation):** Canon Anime & Canon Movies (document both continuities whenever Manga and Anime diverge).
   - **Tier 3 (STRICTLY EXCLUDE unless requested):** Non-canon filler arcs, non-canon movies/OVAs, uncited fan wiki claims, and powerscaling myths.
2. Use live web search to verify every mechanic, cost, limitation, and feat, and fill `projects/<slug>/LORE_FACT_SHEET.md` (with chapter/databook/episode citations, unadapted manga/novel spoilers flagged, and What-If real-world extrapolations labeled separately from canon).

### Stage 3 — ~60s Viral Script, Retention Hook, Adversarial Lore Audit & Named-Cast Reference Lock (**GATE 1**)
1. Draft `projects/<slug>/SCRIPT.md` (**150–175 words**, **`52–62 s` target — NEVER exceed `65 s`!**). Design a fresh, natural viral beat arc tailored to the specific power and twist — avoid robotic gimmicks like forced standalone `"Wrong."` drops.
2. **First-3-Seconds Retention Hook Check (`f0–f90`):** Confirm that within the first `2.8 s`, the viewer immediately sees **2+ kinetic visual beats** (never a static medium standing shot or slow fade-in!) using physical macro detail, shallow-DOF rack focus, or immediate physical consequence matched to the anime's genre.
3. **Adversarial Lore Audit & Mandatory `On-Screen Named Cast Roster` Reference Gate (ZERO Unreferenced Named Characters!):**
   - Independently try to **disprove every factual claim** in `SCRIPT.md` against `LORE_FACT_SHEET.md` and official canon. Record `PASS` sign-off.
   - Fill out **`## On-Screen Named Cast Roster`** in `SCRIPT.md` listing **EVERY** named canon anime/manga character appearing on screen (excluding ONLY the locked Channel MC and generic unnamed background humans like a random guard/teller/passerby):
     - **If ANY extra named canon character appears beyond the title character**, you **MUST explicitly ask the user for reference images for EVERY SINGLE ONE of them at Stage 3 BEFORE Stage 4** (or let them opt to depict those beats via props, cutaways, POV, silhouettes, or the title character alone).
     - **If the user ONLY supplied references for the title character** (including in `MODE: OVERNIGHT_AUTOPILOT`!), **STRICTLY DO NOT sculpt or show extra named canon anime characters from memory!**
4. **Stage 3 Mode Gate:**
   - **`MODE: INTERACTIVE`:** Present `LORE_FACT_SHEET.md`, flagged spoilers, `SCRIPT.md` (with `On-Screen Named Cast Roster` & explicit reference requests for ALL listed named characters), and the 5 SFX prompts. **STOP and wait for approval + voiceover + references.**
   - **`MODE: OVERNIGHT_AUTOPILOT`:** If voiceover/refs are not yet uploaded, pause **ONCE** to collect them, then run **Stages 4 → 7 nonstop with ZERO further pauses**. If already uploaded upfront, align `SCRIPT.md`, lock the visible named cast strictly to uploaded references, and proceed nonstop through Stages 4 → 7.

### Stage 4 — 3D Anime Rig Showcase (**HARD STOP IN `INTERACTIVE` | AUTONOMOUS SELF-CRITIQUE IN `OVERNIGHT_AUTOPILOT`**)
> [!CAUTION]
> - **`MODE: INTERACTIVE`:** **HARD STOP BEFORE VIDEO CREATION** — Build all named character rigs, render turnaround + close-up + expression plates (`f0..f5`), and get explicit user approval before Stage 5–7.
> - **`MODE: OVERNIGHT_AUTOPILOT`:** Execute a **strict autonomous visual self-critique loop (up to 2 fix iterations)** comparing EVERY rendered `CastSheet3D` plate against the user's reference images, save `projects/<slug>/out/preview_cast_sheet.jpg`, and proceed straight to Stage 5.

1. **Reuse `rig3d_mc.ts` untouched as the recurring Channel MC.**
2. **100% Named-Cast Reference & Showcase Coverage:** EVERY named canon character appearing in Stages 5–6 MUST be built from user-supplied references AND showcased in Stage 4 turnaround + face close-up plates — NEVER sneak unreferenced named characters into Stage 6!
3. **3D Character Anatomy, Hair, Proportions & Acting Craft (`rig3d_core.ts`):**
   - **NEVER** sculpt humanoid anime heads from plain spheres or circular rings — always use `buildAnimeHead3D({ archetype })` + `createAnimeFaceController()` + `makeAnimeMat({ isFace: true })` (sharp V-chin, upswept 3/4 jawline, planar front UVs, real 3D nose & ears, 10 live expressions, per-character independent organic blinking `1.9–2.8 s`, and live iris `setGaze(gx, gy)` with persistent `customDraw` scars/markings!).
   - **NO Phantom Lip-Sync + 2-Frame Reaction Lead:** Voidmetric Shorts use an off-screen narrator — **ALWAYS leave `talk = false`** (omit the 3rd arg: `rig.setExpr?.(expr, t)`) during narration! Only pass `talk = true` if that specific character directly speaks a voiced line or battle cry. Trigger expression/gaze swaps **`2 frames` before** spoken punch words!
   - Match canonical proportions, curved S-wave multi-lock 3D hair (`sculptCurveTube`, bangs framing — never covering — eyes), detailed costumes, and 5-finger articulated hands (`buildHand3D`).
4. Export `.glb` rigs via `scripts/export_rigs_glb.mjs`, visually compare all rendered plates directly against the user's reference images, fix every flaw, then exit Stage 4 per the active mode gate.

### Stage 5 — Physical Audio Studio Mastering & Rock-Steady Karaoke Subtitle Sync
1. Keep the user's voiceover **100% untouched** — run `whatif_cli.py align-voice` to create 48 kHz 24-bit `voice.wav` and exact Whisper timestamps (`words.json`).
2. Run `whatif_cli.py sync-subtitles --max-words 3` (orphan-free 1–3 word steady karaoke `subtitles_data.ts`) + `export-srt`.
3. Once `story.ts` timing is finalized (or updated in Stage 6), run `whatif_cli.py extract-events --story-ts src/videos/<slug>/story.ts --remotion-root ./workspace-remotion --output projects/<slug>/audio/events.json` so picture-locked `AUDIO_EVENTS`, `SHOCKWAVES`, and `IMPACT_FRAMES` snap cleanly to exact 30 fps frames!
4. Configure `projects/<slug>/audio/audio_cues.json` (custom `music_wav` OR bespoke physical-instrument synthesis via `scale_root_hz`, `scale_intervals`, `cutoff_hz`, `drums`, `bpm`, `acts`, `default_space` parametric room IR, `rises`, custom `sfx_files`, and physical SFX primitives in `cues`) and run `node projects/<slug>/audio/audio_studio.mjs` (or `python3 mix_episode.py`, which automatically delegates to `audio_studio.mjs`) to master `mix.wav` (`-14.5 LUFS`, true peak `<= -1.1 dBTP`) with automatic `1.9–3.0 kHz` voice-presence carving, Bark-band SFX stand-out lift, and pre-impact silence dips!

### Stage 6 — 100% Bespoke Painted 3D Worlds, Custom Lighting, Custom Camera Directing, Bespoke Acting & Zero-Clipping Look-Check Gate
1. **100% Bespoke Painted 3D Worlds & Props (`env3d_core.ts`, `props3d_core.ts`):**
   - Author **every spatial location & hero prop uniquely for this episode** using `makePaintedMat` / `makeEnvTex` / `celTex` / `hash01` and socket held props via `attachToHand` / `attachThroughGrip`.
   - **Painted Texture Craft (`mromidev` `textures.md` Principles):**
     - Every major floor, wall, road, ground, or architectural facade MUST carry a deterministic painted `CanvasTexture` (`hash01()`, NEVER `Math.random()` and NEVER flat untextured Play-Doh boxes!).
     - Use bright sunlit albedos, **colored darks** (`L* >= 18` — deep navy, plum, slate blue-grey, NEVER flat crushed `#000000` blobs!), and thin warm-tinted texture seams (`~0.4×` albedo) so surface lines never fight `InkPass` silhouettes.
     - Build outdoor skies with layered 3-tone clouds (lit crown, mid transition, cool lavender/violet underside) and rain/night streets with glossy wet reflections + warm contrasting practical lights (windows, lamps, headlights).
2. **Bespoke 3-Act Custom Lighting & Full Character-to-World Integration (`lights.ts`, `world.ts`):**
   - Define custom episode lighting moods directly in `lights.ts` via `makeLightPreset({ ... })` shifting color temperature across acts!
   - **Physical Lighting Craft (`mromidev` `lighting.md` Principles):** Keep sunlit daylight shadows bright & colorful (`shade/lit ≈ 0.46–0.52`, cool/pastel-lavender — NEVER muddy dark brown!), keep sunset/twilight/storm shadows richly chromatic (violet-blue, indigo, steel-blue), compress vivid sky gradient stops into `0°–26°` elevation so deep sky color shows inside a `40°` vertical FOV, drive `sunDisc` for glowing backlit HDR sun halos, AND always sync ALL 5 `ANIME_LIGHT` uniforms (`uLightDir`, `uKeyColor`, `uAmbientTint`, `uRimTint`, `uRimBoost`) so 3D characters live INSIDE the shot's lighting instead of looking pasted-on paper-white!
   - Keep **`FilmOpticsEffect`** enabled at the end of `EffectComposer` (3-scale warm 35mm halation, radial corner CA leaving faces tack-sharp in center, C1 `tanh` highlight shoulder roll-off, ragged `SHOCKWAVES` refraction rings, and luminance-enveloped film grain).
3. **100% Custom Multi-Keyframe Camera Directing, Cinema DOF & Pacing (`cam3d_core.ts`, `WhipBlur`, `sakuga_fx.tsx`):**
   - **Custom Angles Every Shot — ZERO Static Tripods:** Compose bespoke `{ pos, look, fov, roll }` camera trajectories tailored to every shot (tight close-ups, macro prop inserts, 1st-person POV, high/low angles, orbits, tracking arcs, cranes, over-the-shoulder, Rule-of-Thirds mediums, and at least 1 dedicated visual mechanism cutaway/cross-section when explaining the canon catch!).
   - **Anti-Tripod Motion Grammar:** Chain `2–4` custom `CamKey` keyframes per 3–6 s shot via `runCamKeys(CAMS[id], f)` (targeting `4.5–7.5` real camera moves per 10 s, median `1.5–3.6 px/f`). Use exponential push-ins (`dollyPush`/`zoomPush` + `pushK`), symmetric `glide` (`18–36 f`) for same-room reframes, `cut: true` for large reframes, fast `8–13 f` whips (auto-blurred by 16-tap `WhipBlur`), `±4°–8°` rolled emphasis beats (`rolledCam`), 7-frame `applyImpactKicks15Hz` on hits, and **`6–8 f` `XFADE`** crossfades on major act/location jumps!
   - **True Cinema DOF + `focusOnPoint` + Foreground Parallax:** Use `cInf: 0` on wides and rich bokeh **`cInf: 10–15`** on close-ups/mediums/inserts (NEVER weak `cInf: 2–3`!). Whenever `cInf >= 8`, lock sharp focus onto the hero via **`focusDist: focusOnPoint(camAt(id, f), heroPos)`** so tilted cameras NEVER accidentally blur the character! Place foreground framing edges at `0.35–0.5× focusDist` (`10–25%` of one edge) for 3D parallax.
   - **Genre-Matched Sakuga Punctuation:** On supernatural/action/thriller shorts, place `2–4` crisp `2–3 f` `IMPACT_FRAMES` / `HIT_STOPS` / Kanada clumped `SPEEDLINES` / angular `KITE_BOLTS` / `SHOCKWAVES` refraction rings on peak power/reveal hits (`0–2 f` before the punch word), and sweep fast punches/slashes with `createLimbSmearRibbon` or `createAfterImageMat`!
4. **Custom 26-Bone Character Acting (+ Optional Reusable Movements) & Custom 3D GLSL VFX (`anim3d_core.ts`, `vfx3d.ts`):**
   - Author custom shot-specific poses directly on the character's 26-bone skeleton via `createPose` + `applyPoseSnapshot` + `blendPoseSnapshots` + `applySecondarySway`, **OR** optionally use/blend any of the 18 reusable humanoid movements in `anim3d_core.ts` (`applyAnimeMotion` / `blendAnimeMotions` — `idle_hero`, `walk`, `run`, `run_skirt_safe`, `sprint_lean`, `hover_float` *(only if canonically flying!)*, `power_charge`, `finger_snap`, `palm_blast`, `sword_slash`, `punch_combo`, `recoil_hit`, `kneel_exhausted`, `wheeze_knees`, `inspect_prop`, `write_board`, `talk_gesture`, `sit_desk`)! Use held anticipation → crisp impact timing on punch words, skirt/coat-safe leg arcs, and never leave MC frozen holding an invisible orb!
   - Author bespoke episode-specific 3D VFX, physical FX, and 3D action smears directly via `createCustomVFXMat` + `NOISE_GLSL` + `getGlowSpriteTex` + `createLimbSmearRibbon` + `createAfterImageMat` + `setNoInkTree`. Always call `cast.update` + `root.updateMatrixWorld(true)` BEFORE bone-locking VFX or smear ribbons via `bone.localToWorld(...)`.
5. **Mandatory Automated Gates + 16-Tile Visual Look-Check:**
   - Pass ALL 4 checks BEFORE packaging: `npx tsc --noEmit` (`0` errors), `whatif_cli.py check-framing` (`PASS`), `whatif_cli.py check-camera --story-ts` (`PASS`), and `whatif_cli.py check-beats` (`PASS`).
   - Render all 16 frames of `EpisodeLookCheck3D` (`540×960`), tile into `preview_lookcheck_sheet.jpg`, and **visually inspect EVERY tile** — fix any clipped limb, out-of-focus hero, untextured surface, or off-model detail!

### Stage 7 — Package `.zip` for Local PC Render Studio (Primary) & Final Delivery
1. **DEFAULT CLOUD DELIVERY (Gemini Tasks / Codex → Local PC Render Studio — Native 2K GPU):**
   - Confirm `projects/<slug>/out/shots.json` and mastered `projects/<slug>/audio/mix.wav` (`-14.5 LUFS`) exist.
   - Package cleanly via:
     ```bash
     python3 scripts/whatif_cli.py package-pc \
       --remotion-root ./workspace-remotion \
       --slug <slug> \
       --out-zip ./episode_<slug>_pc_bundle.zip \
       --output /tmp/pkg_pc.json
     ```
   - Deliver `./episode_<slug>_pc_bundle.zip` + `preview_cast_sheet.jpg` + `preview_lookcheck_sheet.jpg` + concise QA summary for drag-and-drop native 2K rendering in **Voidmetric PC Render Studio** (`http://127.0.0.1:7860`).
2. **Optional Cloud Self-Render Fallback:** Only if user explicitly requests cloud MP4 render — run `whatif_cli.py render-cloud` (`300`-frame chunks, `--gl swangle --concurrency 1`) + `qa-audit --profile cloud-1080p`.
3. **Direct Local GPU PC CLI (`local-2k`):** `REMOTION_TMP=F:/remotion-tmp`, render `EpisodeShort2K` (`--crf=16 --gl=angle --concurrency=4`), mux AAC 256k, clean temp caches, run `qa-audit --profile local-2k`.

---

## Locked Technical & Channel Contracts

| Contract | Locked Rule |
|---|---|
| **Zero Hardcoding** | Every set, texture, lighting mood, camera angle/path, character pose, prop, VFX shader, and score is authored bespoke per episode from pure primitives |
| **Channel MC Rig** | `templates/rigs3d/rig3d_mc.ts` (locked recurring host) |
| **Subtitles** | `Subtitles.tsx`: `66px` baseline (`height / 1920` scaled), bundled `Montserrat-Black.ttf`, crisp dark outline + karaoke highlight, **NO black box**, **NO bounce** |
| **9:16 Safe Frustum** | `halfWidth = D * tan(fov/2) * 0.5625`; `0` clipped heads/limbs/props (`check-framing` PASS) |
| **Anti-Tripod Camera** | `check-camera` PASS (`median >= 0.85 px/f`, `hold <= 45%`, `bursts >= 2.5/10s`, `0` static tripod shots) |
| **Cloud 1080p / Local 2K** | Cloud: `1080×1920`, `30 fps`, `EFFECT_MSAA = 2` (NEVER 0!), `--gl=swangle --concurrency=1`; Local PC: `1440×2560`, `30 fps`, `EFFECT_MSAA = 4`, `--gl=angle --concurrency=4`, `-14.5 LUFS` |

---

## Common Mistakes (Never Repeat!)

1. **NEVER Set `EFFECT_MSAA = 0` With `LensBlur` (100% Black Screen Bug!):** Always use `EFFECT_MSAA = 2` on CPU `swangle` and `EFFECT_MSAA = 4` on GPU.
2. **OOM Crash on CPU Cloud Sandboxes:** Always use `--gl=swangle --concurrency=1` and 300-frame chunks (`render-cloud`) if cloud-rendering.
3. **Floating or Behind-the-Hand VFX:** Call `root.updateMatrixWorld(true)` first, attach via `bone.localToWorld(...)`, and place VFX strictly on layer `NOINK`.
4. **9:16 Edge Clipping:** Always pass `check-framing` and visually inspect all 16 tiles of `EpisodeLookCheck3D`.
5. **NaN Bloom Blackout:** Always clamp non-integer powers as `Math.pow(Math.max(0, x), exp)`.
6. **`dispose={null}` on `InkPass`:** Never put `dispose={null}` on `<primitive object={fx.ink} />`; dispose safely in `useEffect`.
7. **Phantom Lip-Sync During Narrator Voiceover:** Keep `talk = false` (omit 3rd arg in `rig.setExpr?.(expr, t)`) unless that specific character directly speaks in the audio.
8. **Static Tripod Cameras:** Never park 1 slow camera keyframe for 3–6 s; chain `2–4` custom `CamKey` moves via `runCamKeys` and pass `check-camera`.
9. **Inventing Unreferenced Named Anime Characters From Memory:** ALWAYS list EVERY named canon character in Stage 3's `On-Screen Named Cast Roster`, ask for reference images for ALL of them before Stage 4, and showcase ALL of them in Stage 4 `CastSheet3D` — OR keep the visible named cast strictly limited to characters whose reference images were supplied!
10. **Paper-White Pasted-On Characters, Weak `cInf: 2–3` DOF, or Out-Of-Focus Heroes:** Always sync all 5 `ANIME_LIGHT` uniforms (`uLightDir`, `uKeyColor`, `uAmbientTint`, `uRimTint`, `uRimBoost`) in `world.ts`, use `cInf: 10–15` on CU/MS/Inserts (`0` on wides), and pass `focusDist: focusOnPoint(camAt(id, f), heroPos)` whenever `cInf >= 8`!
