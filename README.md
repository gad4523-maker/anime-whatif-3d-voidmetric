# `anime-whatif-3d-voidmetric` — Voidmetric `v3.5` Studio 3D Anime "What If" Workflow Pack

A complete, end-to-end production workflow pack and AI agent skill for creating **~60-second vertical 30 fps 3D Anime "What If You Woke Up With [Character]'s Power?" Shorts** in Three.js + Remotion — built for the **Gemini Tasks / Codex → Local PC Render Studio (`1440×2560` 2K GPU)** pipeline with **3 Execution Modes** (`INTERACTIVE`, `OVERNIGHT_AUTOPILOT`, and `FAST_REDO`).

---

## `v3.5` Studio Cinema, Custom-First Engine & Modes Highlights

- **Viral Shorts Cinema Toolkit (`cam3d_core.ts`, `lights.ts`, `vfx3d_core.ts`):**
  - **12 Cinema Camera Primitives:** Adds shallow-DOF **`rackFocusPull`** (driving live `LensBlur` `focusDist`), **`macroInsertCam`** (`0.6–1.2 m` diegetic prop/eye macros), **`povCam`** (first-person POV), and **`craneRevealPull`** (intimate window/detail pull-back to massive scale) alongside `orbitCam`, `dutchPush`, `crashZoom`, `lowAngleHero`, `overShoulder`, `handheldBreath`, and `flowEase` (`0%` held frames!).
  - **10-Mood 3-Act Lighting Arc (`lights.ts`):** Adds **`golden_sunset`**, **`twilight_indigo`**, **`storm_rain`**, and **`warm_lantern`** alongside `morning`, `day`, `golden`, `cosmic_void`, `night_room`, and `space` so every short transforms color temperature across acts!
  - **Grounded Atmospheric Depth (`vfx3d_core.ts`):** Adds **`SunbeamShaft3D`** (diagonal volumetric window light shafts) and **`AtmosphericWeather3D`** (`"rain"`, `"snow"`, `"sparks"`, `"dust"`, strictly `NOINK`), plus mandatory Act 3 **3D Mechanism Cutaway** & **Diegetic Storytelling Props** rules!

- **3 Execution Modes (`SKILL.md`) — Hands-On OR Sleep Mode!:**
  - **`MODE: INTERACTIVE` (default):** Pauses at Stage 3 (Lore/Script) AND Stage 4 (3D Character Turnaround) for hands-on approval before building worlds & zipping.
  - **`MODE: OVERNIGHT_AUTOPILOT` (Sleep Mode):** Drop your reference images + voiceover (or approve script once before bed and upload the voiceover) → Gemini Tasks runs **Stages 4 → 5 → 6 → 7 completely nonstop** with mandatory autonomous self-critique & auto-fix loops on both the 3D character plates (`f0..f5`) and 16-tile Look-Check, delivering `episode_<slug>_pc_bundle.zip` ready when you wake up!
  - **`MODE: FAST_REDO`:** Reuses your existing voiceover/script/rig from a previous episode to rapidly re-direct worlds, framing, and acting nonstop straight to a fresh PC `.zip`.

- **Custom-First Painted 3D Environment Toolkit (`env3d_core.ts`) — Presets Are Optional!:**
  - Exported primitives (**`makePaintedMat`**, **`makeEnvTex`**, **`celTex`**, **`cel`**, **`hash01`**) let Gemini Tasks build **ANY custom textured 3D anime location from scratch** (pirate ship deck, Shibuya subway, brick rooftops, Stone-World straw village, feudal dojo, dungeon boss hall, soccer pitch) with deterministic `CanvasTexture` detail + `twoTone` cel lighting + ink outlines — never stuck with hardcoded rooms and never flat untextured Play-Doh boxes!
  - Plus **9 Optional Painted Anime Sets** (`buildBedroom`, `buildClassroom`, `buildScienceLab`, `buildSchoolTrackGym`, `buildModernRoom`, `buildCityStreet`, `buildForestGrove`, `buildBattlefieldCrater`, `buildCosmicRealm`) and 10+ reusable procedural textures whenever helpful.
- **Custom-First 3D GLSL VFX Toolkit (`vfx3d_core.ts`) — Presets Are Optional!:**
  - Exported shader & particle toolkit (**`createCustomVFXMat`**, **`NOISE_GLSL`**, **`setNoInkTree`**, **`getGlowSpriteTex`**) lets Gemini Tasks author **ANY bespoke 3D VFX or physical FX on demand** (water/flame ribbons, time-stop bubble, slash cage, shadow mist, flask steam, furnace smoke, chalk dust, rain, sparks) cleanly on layer `NOINK` with HDR bloom — plus 9 optional universal VFX engines (`EnergyOrb3D`, `EnergyAura3D`, `EnergyBeam3D`, `LightningArc3D`, etc.) when they fit!
- **Genre-Aware Visual Direction & Multi-Scale Cinematography (`SKILL.md` + `whatif_cli.py`):**
  - Mandatory 4-mode genre classifier (`supernatural_combat`, `grounded_genius`, `mecha_tech`, `dark_thriller`) that **strictly bans** fantasy magic halos, energy auras, and levitation on grounded anime like *Dr. STONE*, *Death Note*, *Vinland Saga*, or *Blue Lock*.
  - `check-framing` supports `"shot_type": "full_body" | "medium" | "closeup" | "insert"` (`allow_bottom_crop`), enabling expressive close-ups (`1.6–2.1 m`) & prop inserts (`1.1–1.5 m`) with strict headroom/side protection + Rule-of-Thirds staging!
  - Orphan-free karaoke captions in `sync-subtitles` & `export-srt` (never strands dangling `"A"`, `"THE"`, `"OF"`, `"WITHOUT"` at the end of a caption chunk) + tight `150–175 word` (`52–62 s`) pacing!
- **Studio 3D Anime Head, Archetypes & Live Expressions (`rig3d_core.ts`):**
  - 14-ring sculpted anime shield-head (`buildAnimeHead3D`) with 4 anatomical archetypes (`shonen_male`, `female_anime`, `muscular_boss`, `chibi_kid`), razor-sharp V-chin, upswept 3/4 profile jaw, real 3D nose & ears, distortion-free planar front UVs, and DBFZ/Genshin flat-plane `isFace` cel shading (zero circle/egg heads!).
  - **`createAnimeFaceController()`**: **10 live mid-shot expressions** (`neutral`, `smirk`, `grin`, `serious`, `intense`, `snarl`, `shout`, `shock`, `pain`, `smug_closed`), deterministic natural eye-blinking, 3-state dialogue lip-flap, live iris **eye-gaze (`setGaze(gx, gy)`)**, and persistent `customDraw` scars/markings across every expression.
  - **6-Plate Stage 4 Mandatory Approval Studio (`CastSheet3D.tsx`):** Guest Turnaround, Extreme Face & 3/4 Profile, Locked MC Turnaround, Cast Height Lineup, plus **2 Live 8-Expression Facial Matrices (`f4` & `f5`)**, plus portable `.glb` export.
- **Locked Channel MC (`rig3d_mc.ts`) + `CHANNEL_BIBLE.md`:** Permanent 24-bone articulated Channel MC 3D rig (sharp V-jawline, jet-black 3D glasses, spiky charcoal hair, dark zip hoodie / cream tee) with universal `powerColor` eye/rim tinting, relaxed `idle_casual` cameo pose, live expressions & auto-blink.
- **18-Clip 26-Bone Animation, Grounded Acting & Secondary Physics (`anim3d_core.ts`):** 18 reusable anime motion clips (combat: `idle_hero`, `walk`, `run`, `sprint_lean`, `hover_float`, `power_charge`, `finger_snap`, `palm_blast`, `sword_slash`, `punch_combo`, `recoil_hit`, `kneel_exhausted`; grounded & skirt-safe: `run_skirt_safe`, `wheeze_knees`, `inspect_prop`, `write_board`, `talk_gesture`, `sit_desk`), quintic `blendAnimeMotions`, and deterministic hair/cape/coat `applySecondarySway`.
- **9 Universal Color-Parameterized 3D GLSL VFX (`vfx3d_core.ts`) + Bespoke Power Shaders:** `EnergyOrb3D` (with optional `darkCore`), 3-shell `EnergyAura3D` (+ ground vortex, embers & lightning), `EnergyBeam3D`, `LightningArc3D`, `makeDissolveMat3D` + `MoteSwarm3D`, `ShockwaveBlast3D`, `EnergySlice3D`, shatterable `DomainBarrier3D`, and 3D glowing `KanjiBurst3D` (`ゴゴゴ`, custom kanji) — plus full freedom to write custom GLSL shaders per episode.
- **Anime Sakuga Impact-Frame & Motion-FX (`sakuga_fx.tsx`):** 2–4f MAPPA-style B&W/inverted/accent **Impact Frames**, 12 fps stepped **Radial Manga Speedlines**, and deterministic **Hit-Stop** impact freeze-frames.
- **Modular Cel-Shaded 3D Environments, Weapons & Cinematic Cameras (`env3d_core.ts`, `props3d_core.ts`, `cam3d_core.ts`):** Instant inked `twoTone` sets (`buildModernRoom`, `buildCityStreet`, `buildBattlefieldCrater`, `buildForestGrove`, `buildCosmicRealm`, `buildCelClouds`, `buildStarfield`), hand-socketed 3D props (`buildKatana3D`, `buildStaff3D`, `buildEnergyBlade3D`, `buildScienceFlask3D`, `buildCoffeeMug3D`, `buildSmartphone3D`), and MAPPA/Ufotable camera primitives (`orbitCam`, `dutchPush`, `crashZoom`, `lowAngleHero`, `overShoulder`, `handheldBreath`, `clampSafe916Dist`).
- **Full-Canon Lore & Power Fact-Checker Gate (NOT Anime-Only!):** Prioritizes **original source canon** (Manga, Manhwa, Light Novels, Official Databooks, Author Q&As) alongside Canon Anime, excludes non-canon filler/fan myths, flags unadapted spoilers, and runs an adversarial script audit before rigging or audio.
- **Data-Driven 5-Mood Audio Mastering (`mix_template.py` + `audio_cues.json`):** Untouched voiceover + `audio_cues.json` + 5 procedural anime score moods (`shonen_battle`, `dark_cosmic`, `mystery_science`, `cyber_thriller`, `tragic_twist`) mastered to `-14.5 LUFS` / `<= -1.1 dBTP` (BS.1770-4 @ 48 kHz / 24-bit).
- **Gemini Tasks → Local PC GPU Pipeline (`package-pc`) + Publishing Extras:** Build Stages 1–6 in Gemini Tasks (WebGL2-safe `MSAA = 2` swangle Look-Check), export a clean `.zip` via `package-pc` (excluding `node_modules/`), and drag-and-drop into **Voidmetric PC Render Studio** for fast native 2K GPU rendering (`MSAA = 4`, `--gl=angle`) + automatic audio mux + `EpisodeThumb` + `short_qa.py`! Also includes optional `render-cloud` fallback, bundled OFL `Montserrat-Black.ttf` karaoke subtitles, `align-voice`, `export-srt`, `check-beats`, `check-framing`, and `qa-audit`.

---

## Using This Pack Inside Gemini Tasks (Choose Your Mode!)

### Mode 1: `OVERNIGHT_AUTOPILOT` (Sleep Mode — Upload Refs + Voiceover & Wake Up to the Ready PC `.zip`!)

Upload your character reference images + voiceover `.mp3`/`.wav` (+ optional SFX files) into **Gemini Tasks** and paste:

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: OVERNIGHT_AUTOPILOT using `cloud-1080p` settings for Look-Check stills (MSAA=2, --gl=swangle, --concurrency=1).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Rules for MODE: OVERNIGHT_AUTOPILOT:
- If I already uploaded my voiceover & character reference images in this chat: run ALL Stages 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 COMPLETELY NONSTOP with ZERO mid-build pauses! (If I haven't uploaded my voiceover yet, run Stages 1-3, give me the tight 52-62s script + 5 genre-matched SFX prompts, and pause ONCE for my voiceover — then run Stages 4 -> 7 completely nonstop with ZERO further pauses!)
- Classify the anime genre strictly (`supernatural_combat`, `grounded_genius`, `mecha_tech`, or `dark_thriller` — ZERO magic halos, fantasy energy auras, or levitation on grounded anime!).
- DO NOT skip quality checks while running nonstop: run mandatory autonomous visual self-critique & auto-fix loops (up to 2 iterations) on BOTH Stage 4 `CastSheet3D` (`f0..f5`, matching my reference images closely) AND Stage 6 `EpisodeLookCheck3D` (all 16 tiles — custom painted textures via `makePaintedMat`, custom VFX via `createCustomVFXMat` when appropriate, multi-scale close-ups/inserts/mediums/wides, off-center prop staging, zero clipping, `check-framing` PASS, `check-beats` PASS).
- At Stage 7, DO NOT CPU-render the video in the cloud — ensure `projects/<slug>/out/shots.json` and mastered `mix.wav` (`-14.5 LUFS`) are saved, run `python3 scripts/whatif_cli.py package-pc`, and deliver `episode_<slug>_pc_bundle.zip` along with the cast turnaround & 16-tile Look-Check preview images so I can render native 2K in Voidmetric PC Render Studio when I wake up!
```

### Mode 2: `INTERACTIVE` (Hands-On Approval at Script & 3D Character Gates)

Start a new **Gemini Tasks** session and paste:

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: INTERACTIVE using `cloud-1080p` settings for cloud Look-Check stills (MSAA=2, --gl=swangle, --concurrency=1).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Start at Stage 1 & Stage 2:
1. Classify the anime's visual genre (`supernatural_combat`, `grounded_genius`, `mecha_tech`, or `dark_thriller` — strictly NO magic halo rings, fantasy energy auras, or levitation on grounded anime like Dr. STONE/Death Note!). Ask me for reference images and give me 5 genre-matched SFX generation prompts.
2. Run the Full-Canon Lore Fact-Checker (original source manga/manhwa/light novels + official databooks + canon anime — NOT limited to anime-only; exclude non-canon filler/fan myths and flag unadapted spoilers) and draft LORE_FACT_SHEET.md + tight 52–62s (150–175 words) SCRIPT.md + Adversarial Lore Audit.
3. PAUSE for my approval on the fact sheet & script.
4. HARD STOP AT STAGE 4 (CHARACTER APPROVAL): After I approve the script, FIRST create highly accurate, detailed 3D anime character rigs using `buildAnimeHead3D()` + `createAnimeFaceController()` matching EVERY proportion, facial feature, sculpted hair lock, outfit detail, and accessory of the original character from my reference images (never circle heads or generic placeholders!). Render all turnaround, 3/4 profile, cast lineup, AND live expression plates (`f0..f5`) and SHOW ME the created characters. Do NOT proceed further to video/world/VFX creation until I explicitly approve the characters!
5. STAGE 6 CUSTOM-FIRST WORLDS, VFX & CINEMATOGRAPHY: Hardcoded environment & VFX presets are OPTIONAL — freely build ANY custom textured 3D location (`makePaintedMat`/`makeEnvTex`/`celTex`/`hash01`) and ANY bespoke 3D GLSL/physical VFX (`createCustomVFXMat`/`NOISE_GLSL`/`setNoInkTree`/`getGlowSpriteTex`) the episode needs (zero untextured Play-Doh boxes, and zero fantasy magic auras on grounded anime!). Mix close-ups/inserts/mediums/wides (`shot_type` in `check-framing`), stage characters off-center beside chalkboards/blueprints, and never leave MC frozen holding an invisible orb!
6. STAGE 7 PC RENDER EXPORT: Once all 16 Stage 6 Look-Check tiles pass visual inspection (and `projects/<slug>/out/shots.json` + mastered `mix.wav` are ready), DO NOT waste time CPU-rendering in the cloud — immediately package the workspace via `python3 scripts/whatif_cli.py package-pc` and deliver the `.zip` bundle so I can drag-and-drop it into my Voidmetric PC Render Studio app to render native 2K on my PC!
```

### Mode 3: `FAST_REDO` (Re-Direct an Existing Episode Nonstop Into a Fresh PC `.zip`)

Upload your previous episode `.zip` (or voiceover + approved rig) and paste:

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and run in MODE: FAST_REDO.
Reuse the uploaded voiceover, script, and approved 3D character rig(s), rebuild the 3D worlds/cinematography/FX strictly following v3.4 custom-first painted textures, genre-locking, and multi-scale close-up framing, run autonomous Stage 6 self-critique on all 16 Look-Check tiles + `check-framing` + `check-beats`, and deliver the updated `episode_<slug>_pc_bundle.zip` via `package-pc` with ZERO pauses!
```

---

## Fast Native 2K Rendering on Your PC (`Voidmetric PC Render Studio`)

1. Let **Gemini Tasks** finish Stages 1–6 and export `episode_<slug>_pc_bundle.zip` via `whatif_cli.py package-pc`.
2. Open **Voidmetric PC Render Studio** on your Windows PC (`http://127.0.0.1:7860`).
3. Drag & drop the `.zip` file and click **Start PC Render** — it links local `node_modules` in 0 seconds, upgrades `EFFECT_MSAA` to `4`, renders native **2K (`1440×2560`, 30 fps)** on your local GPU (`--gl=angle`), muxes `mix.wav` (AAC 256k), generates the subtitle-free `EpisodeThumb` cover PNG, and runs `short_qa.py` automatically!

---

## Directory Structure

```text
anime-whatif-3d-voidmetric/
├── SKILL.md                           # Master AI agent skill instructions & workflow gates
├── CHANNEL_BIBLE.md                   # Episode registry & locked Voidmetric channel continuity
├── scripts/
│   ├── whatif_cli.py                  # Full CLI (init, align-voice, check-framing, sync-subtitles, export-srt, check-beats, package-pc, render-cloud, qa-audit)
│   ├── export_rigs_glb.mjs            # Cross-platform .glb 3D rig exporter
│   ├── short_qa.py                    # Full video/audio QA & contact sheet generator
│   └── sbs_sheet.py                   # Side-by-side comparison sheet builder
├── templates/
│   ├── starter-remotion/              # Self-contained Remotion + Three.js bootstrap + bundled Montserrat-Black.ttf
│   ├── engine/                        # Shared post-processing & cel passes (ink, lensblur, grade, shade, cardshade)
│   ├── rigs3d/                        # rig3d_core.ts, LOCKED rig3d_mc.ts, rig3d_guest_template.ts, anim3d_core.ts, props3d_core.ts
│   ├── vfx/                           # vfx3d_core.ts (custom GLSL VFX toolkit + 9 optional universal VFX engines)
│   ├── composition/                   # ShortTemplate.tsx, CastSheet3D.tsx, LookCheck3D.tsx, Subtitles.tsx, sakuga_fx.tsx, cam3d_core.ts, env3d_core.ts, cast.ts, world.ts, story.ts, lights.ts
│   ├── audio/                         # mix_template.py, audio_cues_template.json, dsp.py (48 kHz / 24-bit BS.1770-4)
│   └── docs/                          # LORE_FACT_SHEET, SCRIPT, and PLAN Markdown templates
└── references/
    ├── beerus-gold-standard/          # Compressed reference cut, 16-shot sheet & rig quality bar
    └── mromidev-look-rules/           # Measured STYLE_BIBLE & quantitative look/camera reports
```

---

## CLI Quick Reference

Use `python3` in Gemini Tasks (Linux cloud) or `uv run` on your local PC:

```bash
# 1. Bootstrap & scaffold a new cloud-1080p episode (all v3.0 engines included!)
python3 scripts/whatif_cli.py init-episode \
  --slug gojo-limitless \
  --title "What If You Woke Up With Gojo's Limitless?" \
  --remotion-root ./workspace-remotion \
  --profile cloud-1080p \
  --bootstrap-remotion \
  --output /tmp/init_gojo.json

# 2. Convert voiceover to 48 kHz WAV & extract exact Whisper word timestamps
python3 scripts/whatif_cli.py align-voice \
  --input ./raw_voice.mp3 \
  --wav-out ./workspace-remotion/projects/gojo-limitless/voice/voice.wav \
  --words-out ./workspace-remotion/projects/gojo-limitless/voice/words.json

# 3. Generate clean floating karaoke subtitles_data.ts + export .srt + validate beat sync
python3 scripts/whatif_cli.py sync-subtitles \
  --words-json ./workspace-remotion/projects/gojo-limitless/voice/words.json \
  --ts-out ./workspace-remotion/src/videos/gojo-limitless/subtitles_data.ts \
  --output /tmp/subs_report.json
python3 scripts/whatif_cli.py export-srt \
  --words-json ./workspace-remotion/projects/gojo-limitless/voice/words.json \
  --srt-out ./workspace-remotion/projects/gojo-limitless/out/captions.srt
python3 scripts/whatif_cli.py check-beats \
  --words-json ./workspace-remotion/projects/gojo-limitless/voice/words.json \
  --beats-json ./beats.json --output /tmp/beats_report.json

# 4. Validate 9:16 camera framing math before rendering
python3 scripts/whatif_cli.py check-framing \
  --shots-config shots_framing.json \
  --output /tmp/framing_report.json

# 5a. Package lightweight .zip bundle for Voidmetric PC Render Studio (PRIMARY!)
python3 scripts/whatif_cli.py package-pc \
  --remotion-root ./workspace-remotion \
  --slug gojo-limitless \
  --out-zip ./episode_gojo_pc_bundle.zip \
  --output /tmp/pkg_pc.json

# 5b. OR OOM-proof resumable 1080p CPU cloud render + audio mux right in Gemini Tasks
python3 scripts/whatif_cli.py render-cloud \
  --remotion-root ./workspace-remotion \
  --composition EpisodeShort1080 \
  --total-frames 1800 \
  --chunk-frames 300 \
  --audio ./workspace-remotion/projects/gojo-limitless/audio/mix.wav \
  --out-video ./workspace-remotion/projects/gojo-limitless/out/final_1080p.mp4 \
  --gl swangle --concurrency 1 --crf 17 \
  --output /tmp/render_report.json

# 6. Full QA audit (1080p cloud or 2K local)
python3 scripts/whatif_cli.py qa-audit \
  --video ./workspace-remotion/projects/gojo-limitless/out/final_1080p.mp4 \
  --shots-json ./workspace-remotion/projects/gojo-limitless/out/shots.json \
  --qa-dir ./workspace-remotion/projects/gojo-limitless/out/qa \
  --profile cloud-1080p \
  --output /tmp/qa_report.json
```
