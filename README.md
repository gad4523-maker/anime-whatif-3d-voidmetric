# `anime-whatif-3d-voidmetric` — Voidmetric `v3.0` Studio 3D Anime "What If" Workflow Pack

A complete, end-to-end production workflow pack and AI agent skill for creating **~60-second vertical 30 fps 3D Anime "What If You Woke Up With [Character]'s Power?" Shorts** in Three.js + Remotion — supporting **100% cloud execution inside Gemini Tasks (`1080×1920`, 30 fps, CPU-safe chunked rendering)**, **1-click Google Colab Pro (`L4`/`T4` GPU)**, and **local GPU workstations (`1440×2560` 2K, 30 fps)**.

---

## `v3.0` Studio Engine Highlights

- **Studio 3D Anime Head, Archetypes & Live Expressions (`rig3d_core.ts`):**
  - 14-ring sculpted anime shield-head (`buildAnimeHead3D`) with 4 anatomical archetypes (`shonen_male`, `female_anime`, `muscular_boss`, `chibi_kid`), razor-sharp V-chin, upswept 3/4 profile jaw, real 3D nose & ears, distortion-free planar front UVs, and DBFZ/Genshin flat-plane `isFace` cel shading (zero circle/egg heads!).
  - **`createAnimeFaceController()`**: **10 live mid-shot expressions** (`neutral`, `smirk`, `grin`, `serious`, `intense`, `snarl`, `shout`, `shock`, `pain`, `smug_closed`), deterministic natural eye-blinking, 3-state dialogue lip-flap, live iris **eye-gaze (`setGaze(gx, gy)`)**, and persistent `customDraw` scars/markings across every expression.
  - **6-Plate Stage 4 Mandatory Approval Studio (`CastSheet3D.tsx`):** Guest Turnaround, Extreme Face & 3/4 Profile, Locked MC Turnaround, Cast Height Lineup, plus **2 Live 8-Expression Facial Matrices (`f4` & `f5`)**, plus portable `.glb` export.
- **Locked Channel MC (`rig3d_mc.ts`) + `CHANNEL_BIBLE.md`:** Permanent 24-bone articulated Channel MC 3D rig (sharp V-jawline, jet-black 3D glasses, spiky charcoal hair, dark zip hoodie / cream tee) with universal `powerColor` eye/rim tinting + live expressions & auto-blink.
- **26-Bone Animation, Blending & Secondary Physics (`anim3d_core.ts`):** 12 reusable anime motion clips (`idle_hero`, `walk`, `run`, `sprint_lean`, `hover_float`, `power_charge`, `finger_snap`, `palm_blast`, `sword_slash`, `punch_combo`, `recoil_hit`, `kneel_exhausted`), quintic `blendAnimeMotions`, and deterministic hair/cape/coat `applySecondarySway`.
- **9 Universal Color-Parameterized 3D GLSL VFX (`vfx3d_core.ts`) + Bespoke Power Shaders:** `EnergyOrb3D` (with optional `darkCore`), 3-shell `EnergyAura3D` (+ ground vortex, embers & lightning), `EnergyBeam3D`, `LightningArc3D`, `makeDissolveMat3D` + `MoteSwarm3D`, `ShockwaveBlast3D`, `EnergySlice3D`, shatterable `DomainBarrier3D`, and 3D glowing `KanjiBurst3D` (`ゴゴゴ`, custom kanji) — plus full freedom to write custom GLSL shaders per episode.
- **Anime Sakuga Impact-Frame & Motion-FX (`sakuga_fx.tsx`):** 2–4f MAPPA-style B&W/inverted/accent **Impact Frames**, 12 fps stepped **Radial Manga Speedlines**, and deterministic **Hit-Stop** impact freeze-frames.
- **Modular Cel-Shaded 3D Environments, Weapons & Cinematic Cameras (`env3d_core.ts`, `props3d_core.ts`, `cam3d_core.ts`):** Instant inked `twoTone` sets (`buildModernRoom`, `buildCityStreet`, `buildBattlefieldCrater`, `buildForestGrove`, `buildCosmicRealm`, `buildCelClouds`, `buildStarfield`), hand-socketed 3D props (`buildKatana3D`, `buildStaff3D`, `buildEnergyBlade3D`, `buildScienceFlask3D`, `buildCoffeeMug3D`, `buildSmartphone3D`), and MAPPA/Ufotable camera primitives (`orbitCam`, `dutchPush`, `crashZoom`, `lowAngleHero`, `overShoulder`, `handheldBreath`, `clampSafe916Dist`).
- **Full-Canon Lore & Power Fact-Checker Gate (NOT Anime-Only!):** Prioritizes **original source canon** (Manga, Manhwa, Light Novels, Official Databooks, Author Q&As) alongside Canon Anime, excludes non-canon filler/fan myths, flags unadapted spoilers, and runs an adversarial script audit before rigging or audio.
- **Data-Driven 5-Mood Audio Mastering (`mix_template.py` + `audio_cues.json`):** Untouched voiceover + `audio_cues.json` + 5 procedural anime score moods (`shonen_battle`, `dark_cosmic`, `mystery_science`, `cyber_thriller`, `tragic_twist`) mastered to `-14.5 LUFS` / `<= -1.1 dBTP` (BS.1770-4 @ 48 kHz / 24-bit).
- **100% Cloud-Ready (`cloud-1080p`) + Colab Pro GPU + Publishing Extras:** WebGL2-safe `MSAA = 2` swangle profile, resumable 300f chunked renderer (`render-cloud`), 1-click Colab Pro `L4`/`T4` notebook (`package-colab`), bundled OFL `Montserrat-Black.ttf` karaoke subtitles, subtitle-free `EpisodeThumb`, `align-voice`, `export-srt`, `check-beats`, `check-framing`, and `qa-audit`.

---

## Using This Pack 100% Inside Gemini Tasks (`1080×1920`, 30 fps)

Start a new **Gemini Tasks** session and paste this prompt:

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and follow EVERY stage and approval gate strictly using the `cloud-1080p` profile (1080x1920 @ 30 fps, MSAA=2, --gl=swangle, --concurrency=1, chunked render via `python3 scripts/whatif_cli.py render-cloud`).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Start at Stage 1 & Stage 2:
1. Ask me for the character/VFX reference images and give me 5 tailored SFX generation prompts.
2. Run the Full-Canon Lore Fact-Checker (original source manga/manhwa/light novels + official databooks + canon anime — NOT limited to anime-only; exclude non-canon filler/fan myths and flag unadapted spoilers) and draft LORE_FACT_SHEET.md + SCRIPT.md + Adversarial Lore Audit.
3. PAUSE for my approval on the fact sheet & script.
4. HARD STOP AT STAGE 4 (CHARACTER APPROVAL): After I approve the script, FIRST create highly accurate, detailed 3D anime character rigs using `buildAnimeHead3D()` + `createAnimeFaceController()` matching EVERY proportion, facial feature, sculpted hair lock, outfit detail, and accessory of the original character from my reference images (never circle heads or generic placeholders!). Render all turnaround, 3/4 profile, cast lineup, AND live expression plates (`f0..f5`) and SHOW ME the created characters. Do NOT proceed further to video/world/VFX creation until I explicitly approve the characters!
5. STAGE 7 RENDER CHOICE: Once Stage 6 Look-Check passes, ASK ME whether I have Google Colab Pro (if YES, zip `workspace-remotion` excluding `node_modules` via `package-colab` for my Colab L4/T4 notebook; if NO, immediately render the full 1080p 30 fps video yourself via `python3 scripts/whatif_cli.py render-cloud` + run `qa-audit`).
```

---

## Super-Fast Cloud GPU Rendering With Google Colab Pro (`L4` / `T4` GPU)

Want **full 2K (`1440×2560`) or 1080p in ~2–4 minutes** without waiting on Gemini Tasks' 2-vCPU sandbox?
1. Let **Gemini Tasks** finish Stages 1–6 and run `whatif_cli.py package-colab` to create the `.zip` bundle.
2. Open [`colab/Voidmetric_GPU_Render.ipynb`](colab/Voidmetric_GPU_Render.ipynb) in **Google Colab Pro**, choose **`L4 GPU`** (best) or **`T4 GPU`** (cheapest fast option) — skip `A100` & `TPUs`.
3. Upload the `.zip` (or pull from GitHub/Drive) and click **Run All** — it auto-tests `--gl=angle-egl`, upgrades `MSAA` to `4`, renders in ~2–4 min, runs `short_qa.py`, displays a preview contact sheet, and saves the finished MP4 directly to Google Drive.

---

## Directory Structure

```text
anime-whatif-3d-voidmetric/
├── SKILL.md                           # Master AI agent skill instructions & workflow gates
├── CHANNEL_BIBLE.md                   # Episode registry & locked Voidmetric channel continuity
├── colab/
│   └── Voidmetric_GPU_Render.ipynb    # 1-click Google Colab Pro L4/T4 GPU renderer
├── scripts/
│   ├── whatif_cli.py                  # Full CLI (init, align-voice, check-framing, sync-subtitles, export-srt, check-beats, render-cloud, package-colab, qa-audit)
│   ├── export_rigs_glb.mjs            # Cross-platform .glb 3D rig exporter
│   ├── short_qa.py                    # Full video/audio QA & contact sheet generator
│   └── sbs_sheet.py                   # Side-by-side comparison sheet builder
├── templates/
│   ├── starter-remotion/              # Self-contained Remotion + Three.js bootstrap + bundled Montserrat-Black.ttf
│   ├── engine/                        # Shared post-processing & cel passes (ink, lensblur, grade, shade, cardshade)
│   ├── rigs3d/                        # rig3d_core.ts, LOCKED rig3d_mc.ts, rig3d_guest_template.ts, anim3d_core.ts, props3d_core.ts
│   ├── vfx/                           # vfx3d_core.ts (9 universal color-parameterized 3D GLSL VFX engines)
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

# 5a. Package for 1-click Google Colab Pro GPU render
python3 scripts/whatif_cli.py package-colab \
  --remotion-root ./workspace-remotion \
  --slug gojo-limitless \
  --out-zip ./episode_gojo_colab.zip \
  --output /tmp/pkg_colab.json

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
