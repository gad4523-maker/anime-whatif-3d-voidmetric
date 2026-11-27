# `anime-whatif-3d-voidmetric` — 3D Anime "What If" Shorts Workflow Pack

A complete, production-proven workflow pack and AI agent skill for creating **~60-second vertical 30 fps 3D Anime "What If You Woke Up With [Character]'s Power?" Shorts** in Three.js + Remotion — supporting **100% cloud execution inside Gemini Tasks (`1080×1920`, 30 fps, CPU-safe chunked rendering)** AND **local GPU workstations (`1440×2560` 2K, 30 fps)**.

Built from our gold-standard **Beerus Destruction Power 3D Anime Short** combined with the `mromidev` look/post-processing/QA foundation — plus a **mandatory Anime Canon Fact-Checker** so every ability, limit, and twist stays faithful to official manga & databook canon.

---

## Key Features

- **100% Gemini Tasks Cloud-Ready (`cloud-1080p`):** Includes `templates/starter-remotion/` (Node 18+ compatible, auto-`swangle` WebGL detection), `MSAA = 0` CPU profile, and `whatif_cli.py render-cloud` — an **OOM-proof, resumable 300-frame chunked renderer** built specifically for 2-vCPU / 6.9 GiB RAM / 0-swap Linux sandboxes!
- **Full-Canon Lore & Power Fact-Checker Gate (NOT Anime-Only!):** Prioritizes **original source canon** (Manga, Manhwa, Light Novels, Official Databooks, Author Q&As) alongside Canon Anime — explicitly documenting manga-vs-anime differences, excluding non-canon filler/fan myths, flagging unadapted spoilers for user choice, and running an adversarial script audit before rigging or voiceover.
- **Locked Channel Face (`rig3d_mc.ts`):** Permanent 24-bone articulated Channel MC 3D rig (sharp shonen V-jawline, black 3D glasses, 18-lock spiky hair, black zip jacket & white tee) carried across every episode.
- **Dragon Ball FighterZ–Style 3D Cel-Shaded Anime Rigs (`rig3d_core.ts`):** 3-band GLSL cel shading, smooth-normal inverted-hull ink outlines, 1024×1024 painted UV face maps, 5-finger articulated hands, and portable `.glb` export.
- **Bone-Locked 3D GLSL Volumetric VFX (`vfx3d_core.ts`):** Real-time `localToWorld` bone attachment, palm-front offsets, spatial dissolve shaders, aura cylinders, shockwaves, and 6-level HDR Mipmap Bloom.
- **Rock-Steady Floating Karaoke Subtitles (`Subtitles.tsx`):** Clean `60px` baseline typography, crisp dark outline + active-word highlights, zero black box, zero bounce.
- **Zero-Clipping 9:16 Frustum Checker (`whatif_cli.py check-framing`):** Mathematical camera bounds validator + 16-frame `LookCheck3D` pre-render gate.
- **Automated Master QA (`whatif_cli.py qa-audit` & `short_qa.py`):** Verifies `1080×1920` (cloud) or `1440×2560` (local 2K), `30 fps`, `-14.5 LUFS` loudness, 0 black/frozen frames, and continuous motion contact sheets.

---

## Using This Pack 100% Inside Gemini Tasks (`1080×1920`, 30 fps)

Once you push this repo to GitHub, start a new **Gemini Tasks** session and paste this prompt:

```text
Clone my workflow pack from https://github.com/gad4523-maker/anime-whatif-3d-voidmetric.git
Read SKILL.md completely and follow EVERY stage and approval gate strictly using the `cloud-1080p` profile (1080x1920 @ 30 fps, MSAA=0, --gl=swangle, --concurrency=1, chunked render via `python3 scripts/whatif_cli.py render-cloud`).

Topic: "What If You Woke Up With [CHARACTER]'s Power?"

Start at Stage 1 & Stage 2:
1. Ask me for the character/VFX reference images and give me 5 tailored SFX generation prompts.
2. Run the Full-Canon Lore Fact-Checker (original source manga/manhwa/light novels + official databooks + canon anime — NOT limited to anime-only; exclude non-canon filler/fan myths and flag unadapted spoilers) and draft LORE_FACT_SHEET.md + SCRIPT.md + Adversarial Lore Audit.
3. Pause for my approval before building the 3D rigs!
```

---

## Super-Fast Cloud GPU Rendering With Google Colab Pro (`L4` / `T4` GPU)

Want **full 2K (`1440×2560`) or 1080p in ~2–4 minutes** without waiting on Gemini Tasks' 2-vCPU sandbox?
1. Let **Gemini Tasks** finish Stages 1–6 (Fact-Check, Script, 3D Rigs, World, VFX, Audio, Subtitles, 16-frame LookCheck) and zip `workspace-remotion/`.
2. Open [`colab/Voidmetric_GPU_Render.ipynb`](colab/Voidmetric_GPU_Render.ipynb) in **Google Colab Pro**, choose **`L4 GPU`** (best) or **`T4 GPU`** (cheapest fast option) — skip `A100` & `TPUs`.
3. Upload the `.zip` (or pull from GitHub/Drive) and click **Run All** — it auto-tests `--gl=angle-egl`, upgrades `MSAA` to `4`, renders in ~2–4 min, runs `short_qa.py`, displays a preview contact sheet, and saves the finished MP4 directly to Google Drive!

---

## Gold-Standard Reference Included

See [`references/beerus-gold-standard/`](references/beerus-gold-standard/):
- `beerus_3d_ref_compressed.mp4` — Compressed `720×1280` reference cut (~20 MB, GitHub-safe) of our finished Beerus 3D Anime Short.
- `sheet_3d_v4.jpg` — Verified 16-shot zero-clipping contact sheet.
- `rig3d_cast_lineup.jpg`, `rig3d_beerus_sheet.jpg`, `rig3d_mc_sheet.jpg` — 3D cel-shaded rig quality bar.
- `SCRIPT_beerus_example.md` — Proven ~60 s viral beat structure.

---

## Directory Structure

```text
anime-whatif-3d-voidmetric/
├── SKILL.md                           # Master AI agent skill instructions & workflow gates
├── scripts/
│   ├── whatif_cli.py                  # Cross-platform CLI (init, check-framing, sync-subtitles, render-cloud, compress-ref, qa-audit)
│   ├── export_rigs_glb.mjs            # Portable .glb exporter for 3D anime rigs
│   ├── short_qa.py                    # Full video/audio QA & contact sheet generator
│   └── sbs_sheet.py                   # Side-by-side comparison sheet builder
├── templates/
│   ├── starter-remotion/              # Self-contained Remotion + Three.js bootstrap for fresh cloud boxes
│   ├── engine/                        # Shared mromidev post-processing & shader passes (ink, lensblur, grade, shade)
│   ├── rigs3d/                        # rig3d_core.ts, LOCKED rig3d_mc.ts, rig3d_guest_template.ts
│   ├── vfx/                           # vfx3d_core.ts (GLSL 3D orbs, auras, dissolves, shockwaves)
│   ├── composition/                   # Subtitles.tsx, ShortTemplate.tsx, LookCheck3D.tsx
│   ├── audio/                         # mix_template.py + dsp.py (48 kHz / 24-bit BS.1770-4 loudness)
│   └── docs/                          # LORE_FACT_SHEET, SCRIPT, and PLAN Markdown templates
└── references/
    ├── beerus-gold-standard/          # Compressed Beerus reference video, 16-shot sheet & rig showcases
    └── mromidev-look-rules/           # Measured STYLE_BIBLE & quantitative look/camera reports
```

---

## CLI Quick Reference

Use `python3` in Gemini Tasks (Linux cloud) or `uv run` on your local PC:

```bash
# 1. Bootstrap & scaffold a new 1080p cloud episode
python3 scripts/whatif_cli.py init-episode \
  --slug gojo-limitless \
  --title "What If You Woke Up With Gojo's Limitless?" \
  --remotion-root ./workspace-remotion \
  --profile cloud-1080p \
  --bootstrap-remotion \
  --output /tmp/init_gojo.json

# 2. Check 9:16 camera framing math before rendering
python3 scripts/whatif_cli.py check-framing \
  --shots-config shots_framing.json \
  --output /tmp/framing_report.json

# 3. Generate clean floating karaoke subtitles_data.ts
python3 scripts/whatif_cli.py sync-subtitles \
  --words-json words.json \
  --fps 30 \
  --max-words 3 \
  --accent-purple "infinity,hollow,purple" \
  --accent-gold "six,eyes,brain" \
  --ts-out ./workspace-remotion/src/videos/gojo-limitless/subtitles_data.ts \
  --output /tmp/subs_report.json

# 4. OOM-proof resumable 1080p CPU cloud render + audio mux
python3 scripts/whatif_cli.py render-cloud \
  --remotion-root ./workspace-remotion \
  --composition EpisodeShort1080 \
  --total-frames 1860 \
  --chunk-frames 300 \
  --audio ./workspace-remotion/projects/gojo-limitless/audio/mix.wav \
  --out-video ./workspace-remotion/projects/gojo-limitless/out/final_1080p.mp4 \
  --gl swangle --concurrency 1 --crf 17 \
  --output /tmp/render_report.json

# 5. Full QA audit (1080p cloud or 2K local)
python3 scripts/whatif_cli.py qa-audit \
  --video ./workspace-remotion/projects/gojo-limitless/out/final_1080p.mp4 \
  --shots-json ./workspace-remotion/projects/gojo-limitless/out/shots.json \
  --qa-dir ./workspace-remotion/projects/gojo-limitless/out/qa \
  --profile cloud-1080p \
  --output /tmp/qa_report.json
```
