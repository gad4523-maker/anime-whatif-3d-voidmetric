# `anime-whatif-3d-voidmetric` — 3D Anime "What If" Shorts Workflow Pack

A complete, production-proven workflow pack and Antigravity agent skill for creating **~60-second vertical 2K (`1440×2560`, 30 fps) 3D Anime "What If You Woke Up With [Character]'s Power?" Shorts** in Three.js + Remotion.

Built from our gold-standard **Beerus Destruction Power 3D Anime Short** combined with the `mromidev` look/post-processing/QA foundation — plus a **mandatory Anime Canon Fact-Checker** so every ability, limit, and twist stays faithful to official manga & databook canon.

---

## Key Features

- **Canon Lore & Power Fact-Checker Gate:** Verifies powers against latest official manga + databooks, explicitly flags manga spoilers for user decision, and runs an adversarial script audit before rigging or voiceover.
- **Locked Channel Face (`rig3d_mc.ts`):** Permanent 24-bone articulated Channel MC 3D rig (sharp shonen V-jawline, black 3D glasses, 18-lock spiky hair, black zip jacket & white tee) carried across every episode.
- **Dragon Ball FighterZ–Style 3D Cel-Shaded Anime Rigs (`rig3d_core.ts`):** 3-band GLSL cel shading, smooth-normal inverted-hull ink outlines, 1024×1024 painted UV face maps, 5-finger articulated hands, and portable `.glb` export.
- **Bone-Locked 3D GLSL Volumetric VFX (`vfx3d_core.ts`):** Real-time `localToWorld` bone attachment, palm-front offsets, spatial dissolve shaders, aura cylinders, shockwaves, and 6-level HDR Mipmap Bloom.
- **Rock-Steady Floating Karaoke Subtitles (`Subtitles.tsx`):** Clean `60px` baseline typography (resolution-scaled to 2K), crisp dark outline + active-word highlights, zero black box, zero bounce.
- **Zero-Clipping 9:16 Frustum Checker (`whatif_cli.py check-framing`):** Mathematical camera bounds validator + 16-frame `LookCheck3D` pre-render gate.
- **Automated 2K Master QA (`whatif_cli.py qa-audit` & `short_qa.py`):** Verifies `1440×2560` 30 fps, `-14.5 LUFS` loudness, 0 black/frozen frames, and continuous motion contact sheets.

---

## Gold-Standard Reference Included

See [`references/beerus-gold-standard/`](references/beerus-gold-standard/):
- `beerus_3d_ref_compressed.mp4` — Compressed `720×1280` reference cut (~20 MB, GitHub-safe) of our finished 2K Beerus 3D Anime Short.
- `sheet_3d_v4.jpg` — Verified 16-shot zero-clipping contact sheet.
- `rig3d_cast_lineup.jpg`, `rig3d_beerus_sheet.jpg`, `rig3d_mc_sheet.jpg` — 3D cel-shaded rig quality bar.
- `SCRIPT_beerus_example.md` — Proven ~60 s viral beat structure.

---

## Directory Structure

```text
anime-whatif-3d-voidmetric/
├── SKILL.md                           # Master Antigravity skill instructions & workflow gates
├── scripts/
│   ├── whatif_cli.py                  # Unified uv-run CLI (init, check-framing, sync-subtitles, compress-ref, qa-audit)
│   ├── export_rigs_glb.mjs            # Portable .glb exporter for 3D anime rigs
│   ├── short_qa.py                    # Full video/audio QA & contact sheet generator
│   └── sbs_sheet.py                   # Side-by-side comparison sheet builder
├── templates/
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

## Installing as an Antigravity Skill

Copy this folder into either:
- **Workspace-local:** `<your-workspace>/.agents/skills/anime-whatif-3d-voidmetric/`
- **Global (all projects):** `~/.gemini/config/skills/anime-whatif-3d-voidmetric/`

Then prompt Antigravity with any anime topic, e.g.:
> *"Using anime-whatif-3d-voidmetric, let's make: What If You Woke Up With Gojo's Limitless?"*

---

## CLI Quick Reference

All commands run via `uv run`:

```bash
# 1. Scaffold a new episode into your Remotion project
uv run scripts/whatif_cli.py init-episode \
  --slug gojo-limitless \
  --title "What If You Woke Up With Gojo's Limitless?" \
  --remotion-root ./remotion-shorts \
  --output /tmp/init_gojo.json

# 2. Check 9:16 camera framing math before rendering
uv run scripts/whatif_cli.py check-framing \
  --shots-config shots_framing.json \
  --output /tmp/framing_report.json

# 3. Generate clean floating karaoke subtitles_data.ts
uv run scripts/whatif_cli.py sync-subtitles \
  --words-json words.json \
  --fps 30 \
  --max-words 3 \
  --accent-purple "infinity,hollow,purple" \
  --accent-gold "six,eyes,brain" \
  --ts-out subtitles_data.ts \
  --output /tmp/subs_report.json

# 4. Run full 2K master QA audit
uv run scripts/whatif_cli.py qa-audit \
  --video final_2k.mp4 \
  --shots-json shots.json \
  --qa-dir out/qa \
  --output /tmp/qa_report.json
```

---

## Prerequisites

- **Node.js 20+** with Remotion 4 + Three.js (`@remotion/three`, `@react-three/postprocessing`, `postprocessing`)
- **FFmpeg** on `PATH`
- **uv** (`https://docs.astral.sh/uv/`) + Python 3.10+ (`numpy`, `scipy` for audio mastering)
- **GPU recommended** (`--gl=angle`) + dedicated temp directory (`REMOTION_TMP`) on a drive with >=20 GB free space
