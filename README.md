# `anime-whatif-3d-voidmetric` — Voidmetric `v4.0` Zero-Hardcoding Pure-Primitives 3D Anime Workflow Pack

A 100% zero-hardcoding, end-to-end production workflow pack and AI agent skill for creating **~60-second vertical 30 fps 3D Anime "What If You Woke Up With [Character]'s Power?" Shorts** in Three.js + Remotion — built for the **Gemini Tasks / Codex → Local PC Render Studio (`1440×2560` 2K GPU)** pipeline with **3 Execution Modes** (`INTERACTIVE`, `OVERNIGHT_AUTOPILOT`, and `FAST_REDO`).

---

## `v4.0` 100% Zero-Hardcoding Pure-Primitives Architecture

**Zero hardcoded presets anywhere in the workflow.** No preset rooms, no hardcoded camera angle wrappers, no preset VFX classes, no preset prop builders, no canned animation clips, no closed lighting dropdowns, and no fixed music mood dropdowns. Every episode is directed and crafted 100% bespoke from pure low-level 3D engine primitives:

- **Pure Painted-World Primitives (`env3d_core.ts`):** `hash01`, `makeEnvTex`, `cel`, `celTex`, `makePaintedMat` — build any deterministic painted 3D location & CanvasTexture from scratch with two-tone cel lighting & ink outlines.
- **Open Custom Lighting Factory (`lights.ts` + `world.ts`):** `makeLightPreset(customSpec)` + open `Record<string, EpisodeLightPreset>` with HDR sun disc/halo sky shader and full 5-uniform `ANIME_LIGHT` sync (`uLightDir`, `uKeyColor`, `uAmbientTint`, `uRimTint`, `uRimBoost`) so 3D characters live inside every custom lighting mood.
- **Pure Camera Math & Anti-Tripod Engine (`cam3d_core.ts` + `whipblur.ts` + `whatif_cli.py check-camera`):** `runCamKeys`, `glide`, `flowEase`, `pushK`, `dollyPush`, `zoomPush`, `rolledCam`, `applyImpactKicks15Hz`, `computeWhipVelUV` (16-tap GLSL `WhipBlur`), `focusOnPoint` (razor-sharp hero DOF under `cInf: 10–15` bokeh), `rackFocusPull`, `clampSafe916Dist` — compose any custom `{ pos, look, fov, roll }` trajectory freely per shot.
- **Pure 3D Anime Character Sculpting & Facial Engine (`rig3d_core.ts`, `anim3d_core.ts`, `props3d_core.ts`):** 14-ring shield-head (`buildAnimeHead3D`), `createAnimeFaceController` (10 live expressions, per-character independent organic blinking, live `setGaze`, persistent `customDraw` scars/markings, zero phantom lip-sync), `loftRings`, `sculptCurveTube`, `buildHand3D`, pure 26-bone pose interpolation (`createPose`, `applyPoseSnapshot`, `blendPoseSnapshots`, `applySecondarySway`), and pure hand-bone sockets (`attachToHand`, `attachThroughGrip`).
- **Pure Custom 3D GLSL VFX Factory (`vfx3d_core.ts`):** `createCustomVFXMat`, `NOISE_GLSL`, `getGlowSpriteTex`, `setNoInkTree` — code any bespoke anime shader or physical FX cleanly on layer `NOINK`.
- **Post-Processing Pipeline (`templates/engine/` + `ShortTemplate.tsx`):** `InkPass` → 2-pass `LensBlur` (`maxCoC: 24`) → 6-level HDR `BloomEffect` → 16-tap `WhipBlur` → `ToneMappingEffect(NEUTRAL)` → `GradeEffect` → deterministic `GrainEffect` → `SakugaOverlay` → rock-steady `Subtitles.tsx` (`66px`, bundled `Montserrat-Black.ttf`, no box, no bounce).
- **Strict Named-Character Reference Lock (`SKILL.md`, `SCRIPT_template.md`, `PLAN_template.md`):** Mandatory Stage 3 `On-Screen Named Cast Roster` — zero unreferenced named canon characters ever sculpted from memory.
- **Open Parametric BS.1770-4 Audio Engine (`mix_template.py` + `dsp.py`):** Custom `music_wav` or open custom musical scale/BPM/filter synthesis + custom SFX cues mastered to `-14.5 LUFS` / `<= -1.1 dBTP` @ 48 kHz / 24-bit.
- **Locked Channel Continuity:** Recurring Channel MC (`rig3d_mc.ts`) + `CHANNEL_BIBLE.md` + full-canon lore fact-checker (Manga/Manhwa/LN/Databooks + Canon Anime).

---

## Using This Pack Inside Gemini Tasks / Codex (Choose Your Mode!)

### Mode 1: `OVERNIGHT_AUTOPILOT` (Sleep Mode — Upload Refs + Voiceover & Wake Up to the Ready PC `.zip`)

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: OVERNIGHT_AUTOPILOT using `cloud-1080p` settings for Look-Check stills (EFFECT_MSAA=2, --gl=swangle, --concurrency=1).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Rules:
- ZERO hardcoded presets: author 100% bespoke painted 3D environments (`makePaintedMat`), custom lighting moods (`makeLightPreset`), custom camera angles & trajectories (`runCamKeys` + `focusOnPoint`), bespoke character acting (`createPose`), custom props (`attachToHand`), and bespoke 3D GLSL/physical VFX (`createCustomVFXMat`) tailored strictly to this anime's world and visual reality (zero fantasy magic auras on grounded anime!).
- ZERO UNREFERENCED NAMED CHARACTERS: Strictly cap visible named anime characters ONLY to characters whose reference images I actually provided (plus locked Channel MC and generic unnamed extras) — NEVER invent extra named canon characters from memory!
- If I already uploaded my voiceover & references: run Stages 1 -> 7 completely nonstop with ZERO pauses (if not yet uploaded, pause ONCE after Stage 3 with the tight 52–62 s script + On-Screen Named Cast Roster + 5 SFX prompts, then run Stages 4 -> 7 nonstop!).
- Run autonomous visual self-critique & auto-fix loops (up to 2 iterations) on BOTH Stage 4 `CastSheet3D` (`f0..f5`) AND Stage 6 `EpisodeLookCheck3D` (16 tiles), pass `tsc --noEmit`, `check-framing`, `check-camera --story-ts`, and `check-beats`, and deliver `episode_<slug>_pc_bundle.zip` via `package-pc` (DO NOT CPU-render the video in the cloud!).
```

### Mode 2: `INTERACTIVE` (Hands-On Approval at Script & 3D Character Gates)

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: INTERACTIVE using `cloud-1080p` settings for Look-Check stills (EFFECT_MSAA=2, --gl=swangle, --concurrency=1).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Start at Stage 1 & Stage 2:
1. Run the Full-Canon Lore Fact-Checker (Manga/Manhwa/Light Novels + Official Databooks + Canon Anime — exclude filler/fan myths, flag unadapted spoilers) and draft LORE_FACT_SHEET.md + tight 52–62 s (150–175 words) SCRIPT.md with an explicit On-Screen Named Cast Roster + 5 custom SFX prompts + Adversarial Lore Audit.
2. ZERO UNREFERENCED NAMED CHARACTERS: Explicitly ask me for reference images for EVERY SINGLE named canon character in the roster before Stage 4! PAUSE for my approval + voiceover + references.
3. HARD STOP AT STAGE 4: Build highly accurate 3D anime rigs (`buildAnimeHead3D` + `createAnimeFaceController`) for every approved named character, render turnaround + profile + lineup + live expression plates (`f0..f5`), and SHOW ME before proceeding to Stage 5–7.
4. STAGE 6 ZERO-HARDCODING BESPOKE CRAFT: Author bespoke painted 3D sets (`makePaintedMat`), custom lighting (`makeLightPreset` + full `ANIME_LIGHT` sync), custom multi-keyframe camera trajectories (`runCamKeys` + `focusOnPoint` + `cInf: 10–15` bokeh + `XFADE` + genre-matched Sakuga punctuation), custom 26-bone acting (`createPose`, `talk = false` during off-screen narration), and bespoke VFX (`createCustomVFXMat`). Pass `tsc --noEmit`, `check-framing`, `check-camera`, `check-beats`, and visually verify all 16 Look-Check tiles.
5. STAGE 7 PC EXPORT: Package via `python3 scripts/whatif_cli.py package-pc` for native 2K GPU rendering in Voidmetric PC Render Studio (DO NOT CPU-render in cloud!).
```

### Mode 3: `FAST_REDO` (Re-Direct an Existing Episode Nonstop Into a Fresh PC `.zip`)

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: FAST_REDO.
Reuse the uploaded voiceover, script, and approved 3D character rigs, rebuild the worlds, custom lighting, custom camera directing (`runCamKeys` + `focusOnPoint`), bespoke acting, and bespoke VFX strictly following v4.0 zero-hardcoding craft, pass `tsc --noEmit`, `check-framing`, `check-camera`, `check-beats`, visually inspect all 16 Look-Check tiles, and package `episode_<slug>_pc_bundle.zip` via `package-pc` with ZERO pauses!
```

---

## Fast Native 2K Rendering on Your PC (`Voidmetric PC Render Studio`)

1. Export `episode_<slug>_pc_bundle.zip` via `whatif_cli.py package-pc`.
2. Open **Voidmetric PC Render Studio** (`http://127.0.0.1:7860`), drag & drop the `.zip`, and click **Start PC Render** — renders native **2K (`1440×2560`, 30 fps)** on local GPU (`EFFECT_MSAA = 4`, `--gl=angle`), muxes `mix.wav`, renders `EpisodeThumb`, and runs `short_qa.py`.

---

## CLI Quick Reference

```bash
python3 scripts/whatif_cli.py init-episode --slug <slug> --title "<Title>" --remotion-root ./workspace-remotion --profile cloud-1080p --bootstrap-remotion --output /tmp/init.json
python3 scripts/whatif_cli.py align-voice --input ./raw_voice.mp3 --wav-out ./workspace-remotion/projects/<slug>/voice/voice.wav --words-out ./workspace-remotion/projects/<slug>/voice/words.json
python3 scripts/whatif_cli.py sync-subtitles --words-json ./workspace-remotion/projects/<slug>/voice/words.json --ts-out ./workspace-remotion/src/videos/<slug>/subtitles_data.ts --output /tmp/subs.json
python3 scripts/whatif_cli.py check-framing --shots-config ./shots_framing.json --output /tmp/framing.json
python3 scripts/whatif_cli.py check-camera --story-ts ./workspace-remotion/src/videos/<slug>/story.ts --remotion-root ./workspace-remotion --output /tmp/cam.json
python3 scripts/whatif_cli.py check-beats --words-json ./workspace-remotion/projects/<slug>/voice/words.json --beats-json ./beats.json --output /tmp/beats.json
python3 scripts/whatif_cli.py package-pc --remotion-root ./workspace-remotion --slug <slug> --out-zip ./episode_<slug>_pc_bundle.zip --output /tmp/pkg.json
```
