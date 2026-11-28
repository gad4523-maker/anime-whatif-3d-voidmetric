#!/usr/bin/env python3
"""Voidmetric Anime What-If 3D Short — Unified Cross-Platform Production CLI.

Works identically on:
  - Gemini Tasks Cloud Linux Sandbox (Debian 12, 2 vCPUs, CPU-only swangle, 1080x1920 @ 30 fps) via `python3` or `uv run`
  - Local GPU Workstations (Windows/Linux/macOS, angle GPU, 1440x2560 2K @ 30 fps) via `uv run`

Subcommands:
  init-episode    Scaffold episode workspace (+ optional --bootstrap-remotion for fresh cloud boxes)
  check-framing   Exact 9:16 perspective frustum zero-clipping validator
  sync-subtitles  Generate rock-steady floating karaoke subtitles_data.ts
  render-cloud    OOM-proof, resumable chunked CPU 1080p render + FFmpeg concat + audio mux
  compress-ref    Compress master MP4 into GitHub-safe reference clip (<= max-mb)
  qa-audit        Run short_qa.py & enforce Voidmetric thresholds (cloud-1080p or local-2k)
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import os
import platform
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

PACK_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = PACK_ROOT / "templates"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def default_tmp_dir() -> str:
    return "/tmp/remotion-tmp" if platform.system() != "Windows" else "F:/remotion-tmp"


# ---------------------------------------------------------------------------
# 1. init-episode
# ---------------------------------------------------------------------------
def cmd_init_episode(args: argparse.Namespace) -> None:
    slug = re.sub(r"[^a-z0-9_-]+", "-", args.slug.strip().lower()).strip("-")
    if not slug:
        fail("Slug must contain alphanumeric characters.")

    remotion_root = Path(args.remotion_root).resolve()
    proj_dir = remotion_root / "projects" / slug
    src_dir = remotion_root / "src" / "videos" / slug
    profile = args.profile
    # MSAA MUST be >= 2 when LensBlur is active (MSAA=0 causes WebGL2 shared-depth feedback loop black screen in postprocessing v6!)
    msaa = "2" if profile == "cloud-1080p" else "4"

    created_dirs: list[str] = []
    for sub in ["voice", "audio", "refs", "rigs3d", "stills_3d", "out"]:
        d = proj_dir / sub
        d.mkdir(parents=True, exist_ok=True)
        created_dirs.append(str(d))
    src_dir.mkdir(parents=True, exist_ok=True)
    created_dirs.append(str(src_dir))

    copied_files: list[str] = []

    def copy_if_missing(src: Path, dst: Path) -> None:
        if not src.exists():
            fail(f"Missing pack template: {src}")
        if not dst.exists() or args.force:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied_files.append(str(dst))

    # Optional: bootstrap full Remotion + Three.js project on fresh cloud sandboxes (e.g. Gemini Tasks)
    if args.bootstrap_remotion or not (remotion_root / "package.json").exists():
        starter = TEMPLATES_DIR / "starter-remotion"
        for rel in ["package.json", "remotion.config.ts", "tsconfig.json", "src/index.ts", "src/voidmetric_deps.d.ts"]:
            copy_if_missing(starter / rel, remotion_root / rel)
        root_dst = remotion_root / "src" / "Root.tsx"
        if not root_dst.exists() or args.force:
            root_txt = (starter / "src" / "Root.tsx").read_text(encoding="utf-8")
            root_dst.parent.mkdir(parents=True, exist_ok=True)
            root_dst.write_text(root_txt.replace("{{EPISODE_SLUG}}", slug), encoding="utf-8")
            copied_files.append(str(root_dst))
    else:
        copy_if_missing(
            TEMPLATES_DIR / "starter-remotion" / "src" / "voidmetric_deps.d.ts",
            remotion_root / "src" / "voidmetric_deps.d.ts",
        )

    # Always ensure bundled OFL Montserrat-Black font exists in public/fonts for identical Windows/Linux subtitles!
    copy_if_missing(
        TEMPLATES_DIR / "starter-remotion" / "public" / "fonts" / "Montserrat-Black.ttf",
        remotion_root / "public" / "fonts" / "Montserrat-Black.ttf",
    )

    # Voidmetric v4.3 3D Anime Rig core, IK/Spring Motion, Weapons/Props, Optional VRM Loader, Channel MC & Guest starter
    for rig_file, dst_name in [
        ("rig3d_core.ts", "rig3d_core.ts"),
        ("rig3d_mc.ts", "rig3d_mc.ts"),
        ("rig3d_guest_template.ts", "rig3d_guest.ts"),
        ("anim3d_core.ts", "anim3d_core.ts"),
        ("props3d_core.ts", "props3d_core.ts"),
        ("vrm_core.ts", "vrm_core.ts"),
    ]:
        copy_if_missing(TEMPLATES_DIR / "rigs3d" / rig_file, src_dir / dst_name)

    # Custom 3D GLSL VFX + Destruction/Voronoi/CSG + Sakuga FX + Ghibli/Shinkai World Primitives + Camera + Subtitles + LookCheck
    copy_if_missing(TEMPLATES_DIR / "vfx" / "vfx3d_core.ts", src_dir / "vfx3d.ts")
    copy_if_missing(TEMPLATES_DIR / "vfx" / "destruct3d_core.ts", src_dir / "destruct3d.ts")
    copy_if_missing(TEMPLATES_DIR / "composition" / "world_fx_core.ts", src_dir / "world_fx.ts")
    for comp_file in [
        "Subtitles.tsx",
        "LookCheck3D.tsx",
        "sakuga_fx.tsx",
        "cam3d_core.ts",
        "env3d_core.ts",
        "lights.ts",
        "story.ts",
        "cast.ts",
        "world.ts",
        "subtitles_data.ts",
    ]:
        copy_if_missing(TEMPLATES_DIR / "composition" / comp_file, src_dir / comp_file)

    # Instantiate EpisodeShort.tsx & Stage 4 CastSheet3D.tsx with profile MSAA (2 on cloud CPU swangle, 4 on GPU PC)
    for tpl_name, out_name in [("ShortTemplate.tsx", "EpisodeShort.tsx"), ("CastSheet3D.tsx", "CastSheet3D.tsx")]:
        dst = src_dir / out_name
        if not dst.exists() or args.force:
            txt = (TEMPLATES_DIR / "composition" / tpl_name).read_text(encoding="utf-8")
            dst.write_text(txt.replace("{{MSAA_SAMPLES}}", msaa), encoding="utf-8")
            copied_files.append(str(dst))

    # Voidmetric v4.1 Zero-Dependency Node.js Physical Audio Studio + legacy Python fallback + starter audio_cues.json
    for aud_src, aud_dst in [
        ("dsp_core.mjs", "dsp_core.mjs"),
        ("phys_sfx.mjs", "phys_sfx.mjs"),
        ("phys_inst.mjs", "phys_inst.mjs"),
        ("audio_studio.mjs", "audio_studio.mjs"),
        ("mix_template.py", "mix_episode.py"),
        ("dsp.py", "dsp.py"),
        ("audio_cues_template.json", "audio_cues.json"),
    ]:
        copy_if_missing(TEMPLATES_DIR / "audio" / aud_src, proj_dir / "audio" / aud_dst)

    # Ensure shared bridge post-processing + 35mm FilmOptics + Kuwahara + Chromatic AO + cardshade + WhipBlur exists
    bridge_dir = remotion_root / "src" / "videos" / "bridge"
    bridge_dir.mkdir(parents=True, exist_ok=True)
    for eng_file in ["ink.ts", "lensblur.ts", "whipblur.ts", "grade.ts", "filmoptics.ts", "kuwahara.ts", "ao.ts", "shade.ts", "cardshade.ts"]:
        copy_if_missing(TEMPLATES_DIR / "engine" / eng_file, bridge_dir / eng_file)

    # Instantiate doc templates with episode title & slug
    for tpl_name, dst_name in [
        ("LORE_FACT_SHEET_template.md", "LORE_FACT_SHEET.md"),
        ("SCRIPT_template.md", "SCRIPT.md"),
        ("PLAN_template.md", "PLAN.md"),
    ]:
        src = TEMPLATES_DIR / "docs" / tpl_name
        dst = proj_dir / dst_name
        if not dst.exists() or args.force:
            txt = src.read_text(encoding="utf-8")
            txt = txt.replace("{{EPISODE_TITLE}}", args.title).replace("{{EPISODE_SLUG}}", slug)
            dst.write_text(txt, encoding="utf-8")
            copied_files.append(str(dst))

    out_path = Path(args.output).resolve()
    payload = {
        "status": "ok",
        "slug": slug,
        "title": args.title,
        "profile": profile,
        "msaa_samples": int(msaa),
        "remotion_bootstrapped": bool(args.bootstrap_remotion or (remotion_root / "package.json").exists()),
        "project_dir": str(proj_dir),
        "src_dir": str(src_dir),
        "created_dirs": created_dirs,
        "files_written": copied_files,
        "next_steps": [
            "1. If on a fresh cloud sandbox, run `npm install` in remotion_root and `pip install numpy scipy pillow`.",
            "2. Complete Canon Fact-Check & fill LORE_FACT_SHEET.md (flagging any manga spoilers).",
            "3. Draft SCRIPT.md (~150-175 words, ~52-62 s), classify episode genre, run Adversarial Lore Audit, and get user approval.",
            "4. Build guest 3D anime rig(s) in rig3d_guest.ts, export .glb, and get turnaround approval.",
            "5. Run check-framing & render EpisodeLookCheck3D (16 frames) before full render.",
            "6. Render via `render-cloud` (cloud-1080p) or native EpisodeShort2K (local-2k), then run `qa-audit`.",
        ],
    }
    write_json(out_path, payload)
    print(f"Success! Episode '{slug}' ({profile}, MSAA={msaa}) scaffolded. Manifest written to: {out_path}")


# ---------------------------------------------------------------------------
# 2. check-framing (Exact 9:16 Vertical Perspective Frustum Validator)
# ---------------------------------------------------------------------------
def _vec_sub(a: list[float], b: list[float]) -> list[float]:
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]


def _vec_dot(a: list[float], b: list[float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _vec_cross(a: list[float], b: list[float]) -> list[float]:
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]


def _vec_norm(a: list[float]) -> list[float]:
    mag = math.sqrt(_vec_dot(a, a))
    if mag < 1e-9:
        return [0.0, 0.0, -1.0]
    return [a[0] / mag, a[1] / mag, a[2] / mag]


def cmd_check_framing(args: argparse.Namespace) -> None:
    cfg_path = Path(args.shots_config).resolve()
    if not cfg_path.exists():
        fail(f"Shots framing config not found: {cfg_path}")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    shots = cfg.get("shots", cfg if isinstance(cfg, list) else [])
    if not shots:
        fail("No shots found in shots_config JSON.")

    aspect = float(args.aspect)
    min_margin = float(args.min_margin)
    results: list[dict[str, Any]] = []
    any_fail = False

    for shot in shots:
        sid = shot.get("id", "unknown")
        shot_type = str(shot.get("shot_type", "full_body")).strip().lower()
        shot_bottom_crop = bool(shot.get("allow_bottom_crop", False)) or shot_type in (
            "medium",
            "closeup",
            "close_up",
            "insert",
        )
        pos = [float(v) for v in shot["pos"]]
        look = [float(v) for v in shot["look"]]
        fov_deg = float(shot.get("fov", 41.0))
        tan_half_y = math.tan(math.radians(fov_deg * 0.5))
        tan_half_x = tan_half_y * aspect

        fwd = _vec_norm(_vec_sub(look, pos))
        world_up = [0.0, 1.0, 0.0]
        right = _vec_norm(_vec_cross(fwd, world_up))
        up = _vec_norm(_vec_cross(right, fwd))

        shot_issues: list[dict[str, Any]] = []
        subject_reports: list[dict[str, Any]] = []

        for subj in shot.get("subjects", []):
            name = subj.get("name", "actor")
            center = [float(subj["x"]), float(subj["y"]), float(subj["z"])]
            hw = float(subj.get("half_w", 0.45))
            hh = float(subj.get("half_h", 0.90))
            allow_bottom_crop = bool(subj.get("allow_bottom_crop", shot_bottom_crop))

            rel = _vec_sub(center, pos)
            depth = _vec_dot(rel, fwd)
            if depth <= 0.15:
                any_fail = True
                shot_issues.append({"subject": name, "severity": "ERROR", "reason": f"Subject behind/too close (depth={depth:.2f}m)"})
                continue

            cx = _vec_dot(rel, right)
            cy = _vec_dot(rel, up)
            vis_half_w = depth * tan_half_x
            vis_half_h = depth * tan_half_y

            margin_left = (cx - hw) - (-vis_half_w)
            margin_right = vis_half_w - (cx + hw)
            margin_bottom = (cy - hh) - (-vis_half_h)
            margin_top = vis_half_h - (cy + hh)

            checked_edges: list[tuple[str, float]] = [
                ("LEFT", margin_left),
                ("RIGHT", margin_right),
                ("TOP", margin_top),
            ]
            if not allow_bottom_crop:
                checked_edges.append(("BOTTOM", margin_bottom))

            eff_min_margin = (
                min(min_margin, vis_half_w * 0.16)
                if shot_type in ("closeup", "close_up", "insert")
                else min_margin
            )
            min_edge = min(m for _, m in checked_edges)
            status = "PASS"
            if min_edge < 0.0:
                status = "CLIP_ERROR"
                any_fail = True
                clipped_edges = [edge for edge, m in checked_edges if m < 0.0]
                req_depth_w = (abs(cx) + hw + eff_min_margin) / max(tan_half_x, 1e-6)
                req_depth_h = (
                    max(0.0, (cy + hh + eff_min_margin)) / max(tan_half_y, 1e-6)
                    if allow_bottom_crop
                    else (abs(cy) + hh + eff_min_margin) / max(tan_half_y, 1e-6)
                )
                shot_issues.append(
                    {
                        "subject": name,
                        "severity": "CLIP_ERROR",
                        "clipped_edges": clipped_edges,
                        "recommended_min_depth_m": round(max(req_depth_w, req_depth_h), 2),
                    }
                )
            elif min_edge < eff_min_margin:
                status = "TIGHT_WARNING"
                shot_issues.append({"subject": name, "severity": "TIGHT_WARNING", "min_margin_m": round(min_edge, 3)})

            subject_reports.append(
                {
                    "name": name,
                    "status": status,
                    "bottom_crop_allowed": allow_bottom_crop,
                    "depth_m": round(depth, 3),
                    "visible_half_w_m": round(vis_half_w, 3),
                    "visible_half_h_m": round(vis_half_h, 3),
                    "margins_m": {
                        "left": round(margin_left, 3),
                        "right": round(margin_right, 3),
                        "bottom": round(margin_bottom, 3),
                        "top": round(margin_top, 3),
                    },
                }
            )

        results.append(
            {
                "shot_id": sid,
                "shot_type": shot_type,
                "bottom_crop_allowed": shot_bottom_crop,
                "fov_deg": fov_deg,
                "status": "FAIL" if any(i["severity"] == "CLIP_ERROR" for i in shot_issues) else ("WARN" if shot_issues else "PASS"),
                "subjects": subject_reports,
                "issues": shot_issues,
            }
        )

    out_path = Path(args.output).resolve()
    summary = {
        "aspect": aspect,
        "min_margin_m": min_margin,
        "overall_status": "FAIL" if any_fail else "PASS",
        "total_shots": len(results),
        "failed_shots": [r["shot_id"] for r in results if r["status"] == "FAIL"],
        "shots": results,
    }
    write_json(out_path, summary)
    print(f"Framing check {summary['overall_status']} ({len(summary['failed_shots'])} failed shots). Report written to: {out_path}")
    if any_fail and not args.warn_only:
        sys.exit(1)


# ---------------------------------------------------------------------------
# 3. sync-subtitles (Orphan-Free Karaoke Chunking)
# ---------------------------------------------------------------------------
DANGLING_WORDS = {
    "a", "an", "the", "to", "of", "in", "on", "at", "for", "with", "without",
    "into", "from", "by", "and", "or", "but", "as", "is", "are", "was", "were",
    "my", "your", "his", "her", "its", "our", "their", "this", "that", "these", "those",
}


def _is_dangling_tail(word_text: str) -> bool:
    if word_text.endswith((".", "!", "?", "—", ",")):
        return False
    clean = re.sub(r"[^a-z0-9'-]+", "", word_text.lower())
    return clean in DANGLING_WORDS


def cmd_sync_subtitles(args: argparse.Namespace) -> None:
    words_path = Path(args.words_json).resolve()
    if not words_path.exists():
        fail(f"Words JSON not found: {words_path}")

    raw = json.loads(words_path.read_text(encoding="utf-8"))
    words = raw.get("words", raw if isinstance(raw, list) else [])
    if not words:
        fail("No words array found in words_json.")

    fps = int(args.fps)
    max_words = int(args.max_words)
    if fps <= 0 or max_words <= 0:
        fail("--fps and --max-words must be positive integers.")

    purple_kw = {w.strip().lower() for w in (args.accent_purple or "").split(",") if w.strip()}
    gold_kw = {w.strip().lower() for w in (args.accent_gold or "").split(",") if w.strip()}

    chunks: list[dict[str, Any]] = []
    cur: list[dict[str, Any]] = []

    def flush() -> None:
        nonlocal cur
        if not cur:
            return
        chunks.append({"fStart": cur[0]["fStart"], "fEnd": cur[-1]["fEnd"], "words": cur})
        cur = []

    for item in words:
        text = str(item.get("word", item.get("text", ""))).strip()
        if not text:
            continue
        f_start = int(round(float(item["start"]) * fps))
        f_end = max(f_start + 1, int(round(float(item["end"]) * fps)))
        clean = re.sub(r"[^a-z0-9'-]+", "", text.lower())
        tone = "purple" if clean in purple_kw else ("gold" if clean in gold_kw else "normal")

        if cur and (f_start - cur[-1]["fEnd"]) > int(round(0.35 * fps)):
            flush()
        cur.append({"text": text, "fStart": f_start, "fEnd": f_end, "tone": tone})
        if text.endswith((".", "!", "?", "—", ",")):
            flush()
        elif len(cur) >= max_words:
            # Never strand a dangling preposition/article at the end of a caption chunk!
            if len(cur) > 1 and _is_dangling_tail(cur[-1]["text"]):
                carry = cur.pop()
                flush()
                cur = [carry]
            else:
                flush()
    flush()

    ts_lines = [
        "// Auto-generated clean karaoke subtitle timings (Voidmetric style: steady 60px text, zero box, zero bounce)",
        'export type SubWord = { text: string; fStart: number; fEnd: number; tone?: "normal" | "purple" | "gold" };',
        "export type SubChunk = { fStart: number; fEnd: number; words: SubWord[] };",
        "",
        f"export const SUBTITLE_CHUNKS: SubChunk[] = {json.dumps(chunks, indent=2, ensure_ascii=False)};",
        "",
    ]
    ts_out = Path(args.ts_out).resolve()
    ts_out.parent.mkdir(parents=True, exist_ok=True)
    ts_out.write_text("\n".join(ts_lines), encoding="utf-8")

    report = {
        "status": "ok",
        "fps": fps,
        "word_count": sum(len(c["words"]) for c in chunks),
        "chunk_count": len(chunks),
        "ts_out": str(ts_out),
    }
    out_path = Path(args.output).resolve()
    write_json(out_path, report)
    print(f"Success! Wrote {report['chunk_count']} subtitle chunks to {ts_out} and report to: {out_path}")


# ---------------------------------------------------------------------------
# 4. render-cloud (OOM-Proof Resumable Chunked 1080p CPU Render for Gemini Tasks)
# ---------------------------------------------------------------------------
def _cleanup_remotion_tmp(tmp_dir: Path) -> None:
    for pattern in ["remotion-webpack-bundle-*", "puppeteer_dev_chrome_profile-*"]:
        for match in glob.glob(str(tmp_dir / pattern)):
            shutil.rmtree(match, ignore_errors=True)


def cmd_render_cloud(args: argparse.Namespace) -> None:
    remotion_root = Path(args.remotion_root).resolve()
    out_video = Path(args.out_video).resolve()
    tmp_dir = Path(args.tmp_dir).resolve()
    total_frames = int(args.total_frames)
    chunk_frames = int(args.chunk_frames)

    if total_frames <= 0 or chunk_frames <= 0:
        fail("--total-frames and --chunk-frames must be positive integers.")
    if not args.dry_run and not (remotion_root / "package.json").exists():
        fail(f"Remotion project package.json not found in: {remotion_root}")

    chunk_ranges: list[tuple[int, int]] = []
    f0 = 0
    while f0 < total_frames:
        f1 = min(total_frames - 1, f0 + chunk_frames - 1)
        chunk_ranges.append((f0, f1))
        f0 = f1 + 1

    chunks_dir = out_video.parent / f".{out_video.stem}_chunks"
    chunk_files: list[Path] = []
    for idx, (a, b) in enumerate(chunk_ranges):
        chunk_files.append(chunks_dir / f"chunk_{idx:02d}_{a:04d}_{b:04d}.mp4")

    if args.dry_run:
        plan = {
            "status": "dry_run",
            "composition": args.composition,
            "gl": args.gl,
            "concurrency": int(args.concurrency),
            "crf": int(args.crf),
            "total_frames": total_frames,
            "chunk_frames": chunk_frames,
            "num_chunks": len(chunk_ranges),
            "chunks": [{"index": i, "frames": f"{a}-{b}", "file": str(chunk_files[i])} for i, (a, b) in enumerate(chunk_ranges)],
            "audio": args.audio or None,
            "out_video": str(out_video),
            "tmp_dir": str(tmp_dir),
        }
        write_json(Path(args.output).resolve(), plan)
        print(f"Dry-run OK: {len(chunk_ranges)} chunks planned ({chunk_frames}f each, gl={args.gl}, concurrency={args.concurrency}). Report: {args.output}")
        return

    chunks_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    out_video.parent.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["REMOTION_TMP"] = str(tmp_dir)
    env["TEMP"] = str(tmp_dir)
    env["TMP"] = str(tmp_dir)
    env["REMOTION_GL"] = args.gl

    npx_bin = shutil.which("npx") or "npx"
    rendered_info: list[dict[str, Any]] = []

    for idx, ((a, b), cfile) in enumerate(zip(chunk_ranges, chunk_files)):
        if cfile.exists() and cfile.stat().st_size > 25_000 and not args.force:
            rendered_info.append({"index": idx, "frames": f"{a}-{b}", "status": "resumed_cached", "bytes": cfile.stat().st_size})
            continue

        cmd = [
            npx_bin,
            "remotion",
            "render",
            "src/index.ts",
            args.composition,
            str(cfile),
            f"--frames={a}-{b}",
            "--codec=h264",
            f"--crf={args.crf}",
            "--pixel-format=yuv420p",
            f"--gl={args.gl}",
            f"--concurrency={args.concurrency}",
            "--log=error",
        ]
        proc = subprocess.run(cmd, cwd=str(remotion_root), env=env, capture_output=True, text=True)
        _cleanup_remotion_tmp(tmp_dir)
        if proc.returncode != 0:
            fail(f"Chunk {idx} ({a}-{b}) failed (exit {proc.returncode}): {proc.stderr.strip() or proc.stdout.strip()}")
        rendered_info.append({"index": idx, "frames": f"{a}-{b}", "status": "rendered", "bytes": cfile.stat().st_size})

    concat_list = chunks_dir / "concat.txt"
    concat_lines = [f"file '{cf.resolve().as_posix()}'" for cf in chunk_files]
    concat_list.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

    silent_mp4 = chunks_dir / "joined_silent.mp4"
    c_proc = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(silent_mp4)],
        capture_output=True,
        text=True,
    )
    if c_proc.returncode != 0:
        fail(f"FFmpeg concat failed: {c_proc.stderr.strip()}")

    if args.audio:
        audio_path = Path(args.audio).resolve()
        if not audio_path.exists():
            fail(f"Audio track not found: {audio_path}")
        m_proc = subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-i", str(silent_mp4), "-i", str(audio_path),
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                "-movflags", "+faststart", "-shortest", str(out_video),
            ],
            capture_output=True,
            text=True,
        )
        if m_proc.returncode != 0:
            fail(f"FFmpeg audio mux failed: {m_proc.stderr.strip()}")
    else:
        shutil.copy2(silent_mp4, out_video)

    if not args.keep_chunks:
        shutil.rmtree(chunks_dir, ignore_errors=True)

    size_mb = round(out_video.stat().st_size / (1024 * 1024), 2)
    report = {
        "status": "ok",
        "composition": args.composition,
        "gl": args.gl,
        "concurrency": int(args.concurrency),
        "total_frames": total_frames,
        "chunks": rendered_info,
        "out_video": str(out_video),
        "size_mb": size_mb,
    }
    write_json(Path(args.output).resolve(), report)
    print(f"Success! Rendered {total_frames} frames in {len(chunk_ranges)} chunks ({size_mb} MB) -> {out_video}")


# ---------------------------------------------------------------------------
# 5. compress-ref (GitHub-Safe Reference Video Compressor)
# ---------------------------------------------------------------------------
def cmd_compress_ref(args: argparse.Namespace) -> None:
    inp = Path(args.input).resolve()
    out = Path(args.output).resolve()
    if not inp.exists():
        fail(f"Input video not found: {inp}")
    out.parent.mkdir(parents=True, exist_ok=True)

    height = int(args.height)
    crf = int(args.crf)
    max_mb = float(args.max_mb)

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(inp),
        "-vf", f"scale=-2:{height}:flags=lanczos",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"FFmpeg compression failed: {proc.stderr.strip()}")

    size_mb = out.stat().st_size / (1024 * 1024)
    if size_mb > max_mb:
        fail(f"Compressed file is {size_mb:.2f} MB, exceeding --max-mb {max_mb:.2f}. Increase --crf or reduce --height.")

    if args.report:
        write_json(
            Path(args.report).resolve(),
            {"status": "ok", "input": str(inp), "output": str(out), "height": height, "crf": crf, "size_mb": round(size_mb, 2), "max_mb": max_mb},
        )
    print(f"Success! Compressed reference video ({size_mb:.2f} MB <= {max_mb:.1f} MB) written to: {out}")


# ---------------------------------------------------------------------------
# 6. qa-audit (Wraps short_qa.py & checks Voidmetric Master Thresholds)
# ---------------------------------------------------------------------------
def cmd_qa_audit(args: argparse.Namespace) -> None:
    video = Path(args.video).resolve()
    shots_json = Path(args.shots_json).resolve()
    qa_dir = Path(args.qa_dir).resolve()
    short_qa = PACK_ROOT / "scripts" / "short_qa.py"

    if not video.exists():
        fail(f"Video not found: {video}")
    if not shots_json.exists():
        fail(f"shots.json not found: {shots_json}")
    if not short_qa.exists():
        fail(f"short_qa.py missing at: {short_qa}")

    expected_dims = (1080, 1920) if args.profile == "cloud-1080p" else (1440, 2560)

    uv_bin = shutil.which("uv")
    if uv_bin:
        qa_cmd = [uv_bin, "run", "--with", "numpy", "--with", "pillow", str(short_qa), str(video), str(qa_dir), str(shots_json)]
    else:
        qa_cmd = [sys.executable, str(short_qa), str(video), str(qa_dir), str(shots_json)]

    proc = subprocess.run(qa_cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"short_qa.py failed (exit {proc.returncode}): {proc.stderr.strip() or proc.stdout.strip()}")

    raw_out = proc.stdout
    specs_m = re.search(r"SPECS\s+(\d+)x(\d+)\s+(\d+)/1 fps,\s+(\d+) frames,\s+([\d.]+) s", raw_out)
    lufs_m = re.search(r"LOUDNESS I:\s*([-\d.]+)\s*LUFS\s*\|\s*LRA:\s*([\d.]+)\s*LU\s*\|\s*Peak:\s*([-\d.]+)\s*dBFS", raw_out)
    frames_m = re.search(r"FRAMES\s+(\d+);\s+black\s+(\[[^\]]*\]);\s+unplanned white\s+(\[[^\]]*\]);\s+frozen spans >=12f\s+(\[[^\]]*\])", raw_out)
    motion_m = re.search(r"MOTION mean diff\s+([\d.]+);\s+frames with diff<0\.3 \(held\):\s+(\d+)\s+\((\d+)%\)", raw_out)

    failures: list[str] = []
    parsed: dict[str, Any] = {
        "profile": args.profile,
        "expected_dims": f"{expected_dims[0]}x{expected_dims[1]}",
        "video": str(video),
        "qa_dir": str(qa_dir),
        "size_mb": round(video.stat().st_size / (1024 * 1024), 2),
    }

    if specs_m:
        w, h, fps, nframes, dur = int(specs_m.group(1)), int(specs_m.group(2)), int(specs_m.group(3)), int(specs_m.group(4)), float(specs_m.group(5))
        parsed.update({"width": w, "height": h, "fps": fps, "frames": nframes, "duration_s": dur})
        if (w, h) != expected_dims:
            failures.append(f"Expected {expected_dims[0]}x{expected_dims[1]} ({args.profile}), got {w}x{h}")
        if fps != 30:
            failures.append(f"Expected 30 fps, got {fps}")
    else:
        failures.append("Could not parse SPECS line from short_qa.py output")

    if lufs_m:
        lufs, lra, peak = float(lufs_m.group(1)), float(lufs_m.group(2)), float(lufs_m.group(3))
        parsed.update({"lufs": lufs, "lra_lu": lra, "peak_dbfs": peak})
        if not (-16.5 <= lufs <= -13.0):
            failures.append(f"Loudness {lufs} LUFS outside target [-16.5, -13.0]")
    else:
        failures.append("Could not parse LOUDNESS line from short_qa.py output")

    if frames_m:
        black = frames_m.group(2)
        frozen = frames_m.group(4)
        parsed.update({"black_frames": black, "unplanned_white": frames_m.group(3), "frozen_spans": frozen})
        if black != "[]":
            failures.append(f"Black frames detected: {black}")
        if frozen != "[]":
            failures.append(f"Frozen spans >=12f detected: {frozen}")

    if motion_m:
        mean_diff, held_n, held_pct = float(motion_m.group(1)), int(motion_m.group(2)), int(motion_m.group(3))
        parsed.update({"mean_diff": mean_diff, "held_frames": held_n, "held_pct": held_pct})
        if held_pct > 5:
            failures.append(f"Held frames {held_pct}% exceeds 5% limit")

    parsed["status"] = "PASS" if not failures else "FAIL"
    parsed["failures"] = failures
    parsed["raw_report"] = raw_out.strip()

    out_path = Path(args.output).resolve()
    write_json(out_path, parsed)
    print(f"QA Audit [{args.profile}] {parsed['status']} ({len(failures)} failures). Report written to: {out_path}")
    if failures:
        sys.exit(1)


# ---------------------------------------------------------------------------
# 7. align-voice (Convert voice to 48 kHz stereo WAV + Whisper word timestamps)
# ---------------------------------------------------------------------------
def cmd_align_voice(args: argparse.Namespace) -> None:
    src = Path(args.input).resolve()
    if not src.exists():
        fail(f"Input voiceover not found: {src}")

    wav_out = Path(args.wav_out).resolve()
    words_out = Path(args.words_out).resolve()
    wav_out.parent.mkdir(parents=True, exist_ok=True)
    words_out.parent.mkdir(parents=True, exist_ok=True)

    # 1. Convert untouched voiceover cleanly to 48 kHz 24-bit stereo WAV
    ff = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", str(wav_out)],
        capture_output=True,
        text=True,
    )
    if ff.returncode != 0:
        fail(f"FFmpeg WAV conversion failed: {ff.stderr.strip()}")

    # Probe exact duration
    pr = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(wav_out)],
        capture_output=True,
        text=True,
    )
    if pr.returncode != 0:
        fail(f"ffprobe failed: {pr.stderr.strip()}")
    dur_s = float(pr.stdout.strip())
    fps = int(args.fps)
    total_frames = int(math.ceil(dur_s * fps))

    # 2. Extract word-level timestamps:
    #    Priority 1: `stable-ts` (MIT) — supports exact forced alignment against `--script-text` so anime names
    #                (e.g. Kyoka Suigetsu, Senku, Mahoraga) NEVER misspell or drift!
    #    Priority 2: `faster-whisper` (fallback)
    #    Priority 3: `openai-whisper` (fallback)
    words: list[dict[str, Any]] = []
    engine = "none"
    script_text = ""
    if getattr(args, "script_text", ""):
        sp = Path(args.script_text).resolve()
        if sp.exists():
            raw_txt = sp.read_text(encoding="utf-8")
            # Strip markdown headings/stage brackets if pointing directly at SCRIPT.md
            cleaned_lines = []
            for ln in raw_txt.splitlines():
                s = ln.strip()
                if not s or s.startswith("#") or s.startswith("|") or s.startswith("---") or s.startswith(">"):
                    continue
                s = re.sub(r"\[[^\]]+\]", "", s)
                s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
                if s.strip():
                    cleaned_lines.append(s.strip())
            script_text = " ".join(cleaned_lines)

    pref_engine = getattr(args, "engine", "auto")

    if pref_engine in ("auto", "stable-ts"):
        try:
            import stable_whisper  # type: ignore

            model = stable_whisper.load_model(args.model)
            if script_text:
                engine = f"stable-ts-align:{args.model}"
                res = model.align(str(wav_out), script_text, language=args.language)
            else:
                engine = f"stable-ts:{args.model}"
                res = model.transcribe(str(wav_out), language=args.language, regroup=True)
            for seg in res.segments:
                for w in getattr(seg, "words", []) or []:
                    txt = str(getattr(w, "word", "") or "").strip()
                    if txt:
                        words.append({"word": txt, "start": round(float(w.start), 3), "end": round(float(w.end), 3)})
        except ImportError:
            if pref_engine == "stable-ts":
                fail("`stable-ts` is not installed. Run: pip install stable-ts")

    if not words and pref_engine in ("auto", "faster-whisper"):
        try:
            from faster_whisper import WhisperModel  # type: ignore

            engine = f"faster-whisper:{args.model}"
            model = WhisperModel(args.model, device="cpu", compute_type="int8")
            # Decode cleanly to 16 kHz mono float32 PCM via FFmpeg so newer PyAV (`av`) versions never crash on `metadata_errors`!
            audio_input: Any = str(wav_out)
            try:
                import numpy as np  # type: ignore

                pcm = subprocess.run(
                    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(wav_out), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                    capture_output=True,
                    check=True,
                )
                audio_input = np.frombuffer(pcm.stdout, dtype=np.float32)
            except Exception:
                audio_input = str(wav_out)
            segments, _info = model.transcribe(audio_input, word_timestamps=True, language=args.language)
            for seg in segments:
                for w in getattr(seg, "words", []) or []:
                    txt = (w.word or "").strip()
                    if txt:
                        words.append({"word": txt, "start": round(float(w.start), 3), "end": round(float(w.end), 3)})
        except ImportError:
            if pref_engine == "faster-whisper":
                fail("`faster-whisper` is not installed. Run: pip install faster-whisper")

    if not words:
        try:
            import whisper  # type: ignore

            engine = f"openai-whisper:{args.model}"
            model = whisper.load_model(args.model)
            res = model.transcribe(str(wav_out), word_timestamps=True, language=args.language)
            for seg in res.get("segments", []):
                for w in seg.get("words", []):
                    txt = str(w.get("word", "")).strip()
                    if txt:
                        words.append({"word": txt, "start": round(float(w["start"]), 3), "end": round(float(w["end"]), 3)})
        except ImportError:
            fail(
                "Neither `stable-ts`, `faster-whisper`, nor `openai-whisper` is installed. "
                "Install with: pip install stable-ts (recommended for exact forced alignment) or pip install faster-whisper."
            )

    payload = {
        "source": str(src),
        "wav_48k": str(wav_out),
        "engine": engine,
        "duration_s": round(dur_s, 3),
        "fps": fps,
        "total_frames": total_frames,
        "word_count": len(words),
        "words": words,
    }
    write_json(words_out, payload)
    if args.output:
        write_json(Path(args.output).resolve(), {k: v for k, v in payload.items() if k != "words"})
    print(f"Success! Aligned {len(words)} words ({dur_s:.2f}s = {total_frames}f @ {fps}fps via {engine}) -> {words_out}")


# ---------------------------------------------------------------------------
# 8. package-pc (Pure-Python Zip Exporter for Voidmetric PC Render Studio — Zero External `zip` Binary!)
# ---------------------------------------------------------------------------
def cmd_package_pc(args: argparse.Namespace) -> None:
    remotion_root = Path(args.remotion_root).resolve()
    slug = args.slug.strip()
    out_zip = Path(args.out_zip).resolve()

    if not (remotion_root / "package.json").exists():
        fail(f"package.json not found in remotion_root: {remotion_root}")
    proj_dir = remotion_root / "projects" / slug
    if not proj_dir.exists():
        fail(f"Episode project directory not found: {proj_dir}")

    skip_dirs = {"node_modules", ".git", "remotion-tmp", "__pycache__", ".venv", "stills_3d", "qa_3d", "qa"}
    skip_suffixes = {".pyc", ".pyo", ".tmp"}

    out_zip.parent.mkdir(parents=True, exist_ok=True)
    file_count = 0
    found_mix = False
    found_shots = False

    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for dirpath, dirnames, filenames in os.walk(remotion_root):
            cur = Path(dirpath)
            dirnames[:] = [
                d for d in dirnames
                if d not in skip_dirs and not d.endswith("_chunks") and not d.startswith("remotion-webpack-bundle-")
            ]
            # Only include the requested episode inside projects/ (skip unrelated episodes to keep zip small!)
            if cur == remotion_root / "projects":
                dirnames[:] = [d for d in dirnames if d == slug]

            for fn in filenames:
                fp = cur / fn
                if fp.suffix.lower() in skip_suffixes or fp == out_zip:
                    continue
                if fn.endswith(("_silent.mp4", "2K.mp4", "2k.mp4")) and "references" not in fp.parts:
                    continue
                rel = fp.relative_to(remotion_root)
                arcname = Path(remotion_root.name) / rel
                zf.write(fp, arcname.as_posix())
                file_count += 1
                if re.match(r"mix.*\.wav$", fn):
                    found_mix = True
                if re.match(r"shots.*\.json$", fn):
                    found_shots = True

        # Always bundle short_qa.py into the zip so Voidmetric PC Render Studio can run full QA & contact sheets!
        qa_src = PACK_ROOT / "scripts" / "short_qa.py"
        if qa_src.exists():
            qa_arc = (Path(remotion_root.name) / "scripts" / "short_qa.py").as_posix()
            if qa_arc not in zf.namelist():
                zf.write(qa_src, qa_arc)
                file_count += 1

    size_mb = round(out_zip.stat().st_size / (1024 * 1024), 2)
    report = {
        "status": "ok",
        "slug": slug,
        "out_zip": str(out_zip),
        "file_count": file_count,
        "size_mb": size_mb,
        "contains_mastered_mix_wav": found_mix,
        "contains_shots_json": found_shots,
        "renderer_app": "Voidmetric PC Render Studio (http://127.0.0.1:7860)",
    }
    write_json(Path(args.output).resolve(), report)
    print(f"Success! Packaged {file_count} files ({size_mb} MB, mix_wav={found_mix}, shots_json={found_shots}) -> {out_zip}")


# ---------------------------------------------------------------------------
# 9. export-srt (Clean Platform-Ready .srt Captions for YouTube Shorts & Reels)
# ---------------------------------------------------------------------------
def _fmt_srt_time(sec: float) -> str:
    ms = max(0, int(round(sec * 1000)))
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, rem = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{rem:03d}"


def cmd_export_srt(args: argparse.Namespace) -> None:
    words_path = Path(args.words_json).resolve()
    if not words_path.exists():
        fail(f"Words JSON not found: {words_path}")
    raw = json.loads(words_path.read_text(encoding="utf-8"))
    words = raw.get("words", raw if isinstance(raw, list) else [])
    if not words:
        fail("No words array found in words_json.")

    max_words = int(args.max_words)
    cues: list[tuple[float, float, str]] = []
    buf: list[dict[str, Any]] = []

    def flush() -> None:
        nonlocal buf
        if not buf:
            return
        cues.append((float(buf[0]["start"]), float(buf[-1]["end"]), " ".join(str(x.get("word", x.get("text", ""))).strip() for x in buf)))
        buf = []

    for w in words:
        txt = str(w.get("word", w.get("text", ""))).strip()
        if not txt:
            continue
        if buf and (float(w["start"]) - float(buf[-1]["end"])) > 0.38:
            flush()
        buf.append(w)
        if txt.endswith((".", "!", "?", "—", ",")):
            flush()
        elif len(buf) >= max_words:
            if len(buf) > 1 and _is_dangling_tail(txt):
                carry = buf.pop()
                flush()
                buf = [carry]
            else:
                flush()
    flush()

    lines: list[str] = []
    for idx, (s, e, text) in enumerate(cues, start=1):
        lines.append(f"{idx}\n{_fmt_srt_time(s)} --> {_fmt_srt_time(max(s + 0.08, e))}\n{text}\n")

    srt_out = Path(args.srt_out).resolve()
    srt_out.parent.mkdir(parents=True, exist_ok=True)
    srt_out.write_text("\n".join(lines), encoding="utf-8")

    report = {"status": "ok", "cue_count": len(cues), "srt_out": str(srt_out)}
    write_json(Path(args.output).resolve(), report)
    print(f"Success! Exported {len(cues)} SRT subtitle cues -> {srt_out}")


# ---------------------------------------------------------------------------
# 10. check-beats (Verify Visual Impacts Land 0-4 Frames Before Punch Words!)
# ---------------------------------------------------------------------------
def cmd_check_beats(args: argparse.Namespace) -> None:
    words_path = Path(args.words_json).resolve()
    beats_path = Path(args.beats_json).resolve()
    if not words_path.exists():
        fail(f"Words JSON not found: {words_path}")
    if not beats_path.exists():
        fail(f"Beats JSON not found: {beats_path}")

    fps = int(args.fps)
    words = json.loads(words_path.read_text(encoding="utf-8")).get("words", [])
    beats_raw = json.loads(beats_path.read_text(encoding="utf-8"))
    beats = beats_raw.get("beats", beats_raw if isinstance(beats_raw, list) else [])

    def clean_tok(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", s.lower())

    results: list[dict[str, Any]] = []
    late_count = 0
    for b in beats:
        name = b.get("name", "beat")
        v_frame = int(b.get("frame", b.get("impact_frame", 0)))
        raw_kw = str(b.get("keyword") or b.get("word") or b.get("text") or "")
        kw = clean_tok(raw_kw)
        occ = int(b.get("occurrence", 1))
        matches = [w for w in words if clean_tok(str(w.get("word", w.get("text", "")))) == kw]
        if not kw or len(matches) < occ:
            results.append({"name": name, "keyword": raw_kw, "status": "MISSING_WORD"})
            late_count += 1
            continue
        w = matches[occ - 1]
        w_frame = int(round(float(w["start"]) * fps))
        delta = v_frame - w_frame  # negative = visual lands before word (ideal: -4..+2)
        if -6 <= delta <= 2:
            st = "PASS"
        elif delta > 2:
            st = "LATE_VISUAL"
            late_count += 1
        else:
            st = "EARLY_WARNING"
        results.append(
            {
                "name": name,
                "keyword": raw_kw,
                "visual_frame": v_frame,
                "word_frame": w_frame,
                "delta_frames": delta,
                "status": st,
            }
        )

    report = {
        "fps": fps,
        "overall_status": "PASS" if late_count == 0 else "FAIL",
        "issues_count": late_count,
        "beats": results,
    }
    write_json(Path(args.output).resolve(), report)
    print(f"Beat-sync check {report['overall_status']} ({late_count} late/missing beats). Report written to: {args.output}")
    if late_count > 0 and not args.warn_only:
        sys.exit(1)


# ---------------------------------------------------------------------------
# 11. check-camera (Anti-Tripod Cinema Camera Velocity & Burst Auditor!)
# ---------------------------------------------------------------------------
def _eval_story_cam_samples(story_ts: Path, remotion_root: Path) -> dict[str, Any]:
    """Bundle story.ts in memory with esbuild (from remotion_root/node_modules) and dump per-frame CamState."""
    node_bin = shutil.which("node")
    if not node_bin:
        fail("Node.js not found on PATH (required for `check-camera --story-ts`).")

    js_probe = r"""
const path = require("path");
const { createRequire } = require("module");
const remotionRoot = process.argv[1];
const storyTs = process.argv[2];
const req = createRequire(path.join(remotionRoot, "package.json"));
let esbuild;
try { esbuild = req("esbuild"); } catch (e) {
  const glob = require("fs").readdirSync(path.join(remotionRoot, "node_modules"));
  throw new Error("Could not resolve esbuild from " + remotionRoot + ": " + e.message);
}
const built = esbuild.buildSync({
  entryPoints: [storyTs],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  logLevel: "silent",
});
const code = built.outputFiles[0].text;
const mod = { exports: {} };
const fn = new Function("exports", "require", "module", "__filename", "__dirname", code);
fn(mod.exports, req, mod, storyTs, path.dirname(storyTs));
const exp = mod.exports;
const fps = Number(exp.FPS || 30);
const shots = Array.isArray(exp.SHOTS) ? exp.SHOTS : [];
const total = Number(exp.TOTAL || (shots.length ? shots[shots.length - 1].b : 0));
if (!total || typeof exp.camAt !== "function") {
  throw new Error("story.ts must export TOTAL, SHOTS, and camAt(id, f)");
}
const samples = [];
for (let f = 0; f < total; f++) {
  const s = typeof exp.shotAt === "function"
    ? exp.shotAt(f)
    : (shots.find((q) => f >= q.a && f < q.b) || shots[shots.length - 1]);
  const sid = s ? s.id : 1;
  const c = exp.camAt(sid, f);
  samples.push({ f, sid, pos: c.pos, look: c.look, fov: c.fov ?? 40, roll: c.roll ?? 0 });
}
process.stdout.write(JSON.stringify({ fps, total, shots: shots.map((s) => ({ id: s.id, name: s.name || String(s.id), a: s.a, b: s.b })), samples }));
"""
    proc = subprocess.run([node_bin, "-e", js_probe, str(remotion_root), str(story_ts)], capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"Failed evaluating story.ts cameras:\n{proc.stderr.strip() or proc.stdout.strip()}")
    return json.loads(proc.stdout)


def _cam_proj_px_speed(c0: dict[str, Any], c1: dict[str, Any], h_px: float = 1280.0, w_px: float = 720.0) -> float:
    """Measure combined translation + optical-zoom + roll screen-space pixel speed at 720x1280 (mromidev motion.md method!)."""
    p0, l0, fov0, r0 = c0["pos"], c0["look"], float(c0["fov"]), float(c0["roll"])
    p1, l1, fov1, r1 = c1["pos"], c1["look"], float(c1["fov"]), float(c1["roll"])
    v0 = _vec_sub(l0, p0)
    v1 = _vec_sub(l1, p1)
    d0 = math.sqrt(_vec_dot(v0, v0))
    d1 = math.sqrt(_vec_dot(v1, v1))
    if d0 < 1e-4 or d1 < 1e-4:
        return 0.0
    fwd0 = _vec_norm(v0)
    right0 = _vec_norm(_vec_cross(fwd0, [0.0, 1.0, 0.0]))
    up0 = _vec_norm(_vec_cross(right0, fwd0))
    fwd1 = _vec_norm(v1)

    tan_y0 = math.tan(math.radians(fov0 * 0.5))
    tan_y1 = math.tan(math.radians(fov1 * 0.5))
    # Angular + lateral translation on subject plane (converted to 720p pixels)
    rel_pos = _vec_sub(p1, p0)
    dfwd = _vec_sub(fwd1, fwd0)
    dx_rad = _vec_dot(dfwd, right0) - _vec_dot(rel_pos, right0) / d0
    dy_rad = _vec_dot(dfwd, up0) - _vec_dot(rel_pos, up0) / d0
    px_x = (dx_rad / max(1e-5, tan_y0)) * (h_px * 0.5)
    px_y = (dy_rad / max(1e-5, tan_y0)) * (h_px * 0.5)

    # Effective zoom rate (combining dolly distance change + FOV optical zoom) scaled by frame-corner radius (734 px @ 720x1280!)
    scale0 = d0 * tan_y0
    scale1 = d1 * tan_y1
    zoom_frac = abs(scale1 - scale0) / max(1e-5, scale0)
    px_zoom = zoom_frac * 734.0

    # Roll speed at half-height corner radius
    px_roll = abs(r1 - r0) * 420.0
    return math.hypot(px_x, px_y) + px_zoom + px_roll


def _video_phase_speeds(video_path: Path) -> tuple[list[float], float]:
    """Sub-pixel FFT phase-correlation background camera speed (720p px/f @ 30fps) on a rendered MP4."""
    try:
        import numpy as np  # type: ignore
    except ImportError:
        fail("numpy is required for `check-camera --video`. Run with `uv run --with numpy` or `pip install numpy`.")

    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video_path), "-vf", "fps=15,scale=180:320", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True,
        check=True,
    )
    raw = np.frombuffer(proc.stdout, dtype=np.uint8)
    n = len(raw) // (180 * 320)
    frames = raw[: n * 180 * 320].reshape((n, 320, 180)).astype(np.float32)

    def shift(a, b):
        fa = np.fft.rfft2(a - a.mean())
        fb = np.fft.rfft2(b - b.mean())
        r = fa * np.conj(fb)
        r /= np.abs(r) + 1e-8
        cc = np.fft.irfft2(r, s=a.shape)
        h, w = a.shape
        idx = int(np.argmax(cc))
        py, px = divmod(idx, w)
        dy = py - h if py > h // 2 else py
        dx = px - w if px > w // 2 else px
        def quad(vm, v0, vp):
            dn = vm - 2.0 * v0 + vp
            return 0.5 * (vm - vp) / dn if abs(dn) > 1e-9 else 0.0
        sy = quad(cc[(py - 1) % h, px], cc[py, px], cc[(py + 1) % h, px])
        sx = quad(cc[py, (px - 1) % w], cc[py, px], cc[py, (px + 1) % w])
        return float(dx + sx), float(dy + sy)

    speeds: list[float] = []
    for i in range(n - 1):
        a = frames[i, 16:144, 10:170]
        b = frames[i + 1, 16:144, 10:170]
        if float(np.abs(b - a).mean()) > 32.0:
            speeds.append(-1.0)
            continue
        dx, dy = shift(a, b)
        speeds.append(min(90.0, math.hypot(dx, dy) * 2.0))
    return speeds, n / 15.0


def cmd_check_camera(args: argparse.Namespace) -> None:
    if not args.story_ts and not args.video:
        fail("Pass either --story-ts (+ --remotion-root) OR --video to `check-camera`.")

    min_median = float(args.min_median)
    max_hold = float(args.max_hold_pct)
    min_bursts = float(args.min_bursts_per_10s)

    shot_reports: list[dict[str, Any]] = []
    tripod_shots: list[str] = []

    if args.story_ts:
        story_path = Path(args.story_ts).resolve()
        remotion_root = Path(args.remotion_root).resolve() if args.remotion_root else story_path.parents[3]
        if not story_path.exists():
            fail(f"story.ts not found: {story_path}")
        data = _eval_story_cam_samples(story_path, remotion_root)
        fps = float(data["fps"])
        samples = data["samples"]
        dur_s = len(samples) / max(1.0, fps)
        step_fps = fps

        speeds: list[float] = []
        per_shot: dict[int, list[float]] = {}
        for i in range(len(samples) - 1):
            c0, c1 = samples[i], samples[i + 1]
            if c0["sid"] != c1["sid"]:
                speeds.append(-1.0)  # shot boundary cut
                continue
            sp = _cam_proj_px_speed(c0, c1)
            if sp > 120.0:
                speeds.append(-1.0)  # intra-shot hard cut (`cut: true`)
                continue
            speeds.append(sp)
            per_shot.setdefault(int(c0["sid"]), []).append(sp)

        for sh in data.get("shots", []):
            sid = int(sh["id"])
            s_sp = sorted(per_shot.get(sid, []))
            s_dur = round((int(sh["b"]) - int(sh["a"])) / fps, 2)
            s_med = round(s_sp[len(s_sp) // 2], 2) if s_sp else 0.0
            s_p90 = round(s_sp[int(len(s_sp) * 0.9)], 2) if s_sp else 0.0
            s_hold = round((sum(1 for v in s_sp if v < 0.5) / max(1, len(s_sp))) * 100.0, 1)
            is_tripod = s_dur >= 2.5 and s_med < 0.65 and s_p90 < 3.0
            if is_tripod:
                tripod_shots.append(f"shot {sid} ({sh['name']}, {s_dur}s, med={s_med} px/f)")
            shot_reports.append({
                "id": sid, "name": sh["name"], "dur_s": s_dur,
                "median_px_f": s_med, "p90_px_f": s_p90, "hold_pct": s_hold,
                "status": "TRIPOD_FAIL" if is_tripod else "PASS",
            })
        mode = "story_ts"
    else:
        vid_path = Path(args.video).resolve()
        if not vid_path.exists():
            fail(f"Video not found: {vid_path}")
        speeds, dur_s = _video_phase_speeds(vid_path)
        step_fps = 15.0
        mode = "video_fft"

    valid = sorted([s for s in speeds if s >= 0.0])
    if not valid:
        fail("No valid camera motion samples measured.")

    med = valid[len(valid) // 2]
    p75 = valid[int(len(valid) * 0.75)]
    p90 = valid[int(len(valid) * 0.90)]
    hold_pct = (sum(1 for s in valid if s < 0.5) / len(valid)) * 100.0
    move_pct = (sum(1 for s in valid if s >= 2.0) / len(valid)) * 100.0

    # Count distinct deliberate moves (>= 4.5 px/f lasting >= 4 frames @ 30fps)
    min_run = max(2, int(round(4 * step_fps / 30.0)))
    bursts = 0
    cur = 0
    for s in speeds:
        if s >= 4.5:
            cur += 1
        else:
            if cur >= min_run:
                bursts += 1
            cur = 0
    if cur >= min_run:
        bursts += 1
    bursts_per_10s = bursts / max(0.1, dur_s / 10.0)

    failures: list[str] = []
    if med < min_median:
        failures.append(f"Median camera speed {med:.2f} px/f < {min_median:.2f} px/f (feels like a static tripod! Target 1.5-3.6 px/f)")
    if hold_pct > max_hold:
        failures.append(f"Static tripod hold frames {hold_pct:.1f}% > {max_hold:.1f}% limit (Target < 30%)")
    if bursts_per_10s < min_bursts:
        failures.append(f"Deliberate camera bursts {bursts_per_10s:.2f}/10s < {min_bursts:.2f}/10s (Target 4.5-7.6/10s via multi-keyframe runCamKeys!)")
    if tripod_shots:
        failures.append(f"Static tripod shots detected (>=2.5s): {', '.join(tripod_shots)}")

    report = {
        "mode": mode,
        "duration_s": round(dur_s, 2),
        "median_px_f": round(med, 2),
        "p75_px_f": round(p75, 2),
        "p90_px_f": round(p90, 2),
        "hold_pct": round(hold_pct, 1),
        "move_pct": round(move_pct, 1),
        "bursts_total": bursts,
        "bursts_per_10s": round(bursts_per_10s, 2),
        "overall_status": "PASS" if not failures else "FAIL",
        "failures": failures,
        "shots": shot_reports,
    }
    write_json(Path(args.output).resolve(), report)
    print(
        f"Camera check [{mode}] {report['overall_status']} | med={report['median_px_f']} px/f | p90={report['p90_px_f']} px/f | "
        f"hold={report['hold_pct']}% | bursts={report['bursts_per_10s']}/10s -> {args.output}"
    )
    if failures and not args.warn_only:
        for fmsg in failures:
            print(f"  FAIL: {fmsg}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# 12. extract-events (Picture-to-Sound Frame-Locked Event Extractor!)
# ---------------------------------------------------------------------------
def cmd_extract_events(args: argparse.Namespace) -> None:
    story_path = Path(args.story_ts).resolve()
    remotion_root = Path(args.remotion_root).resolve() if args.remotion_root else story_path.parents[3]
    if not story_path.exists():
        fail(f"story.ts not found: {story_path}")
    node_bin = shutil.which("node")
    if not node_bin:
        fail("Node.js not found on PATH (required for `extract-events`).")

    js_probe = r"""
const path = require("path");
const { createRequire } = require("module");
const remotionRoot = process.argv[1];
const storyTs = process.argv[2];
const req = createRequire(path.join(remotionRoot, "package.json"));
const esbuild = req("esbuild");
const built = esbuild.buildSync({
  entryPoints: [storyTs],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  logLevel: "silent",
});
const mod = { exports: {} };
const fn = new Function("exports", "require", "module", "__filename", "__dirname", built.outputFiles[0].text);
fn(mod.exports, req, mod, storyTs, path.dirname(storyTs));
const exp = mod.exports;
const fps = Number(exp.FPS || 30);
const shots = Array.isArray(exp.SHOTS) ? exp.SHOTS : [];
const total = Number(exp.TOTAL || (shots.length ? shots[shots.length - 1].b : 0));
const shotFor = (f) => {
  const s = shots.find((q) => f >= q.a && f < q.b) || shots[shots.length - 1];
  return s ? (s.name || String(s.id)) : "shot_1";
};
const events = [];
const pushUnique = (ev) => {
  const dup = events.some((e) => Math.abs(e.f - ev.f) <= 2 && e.kind === ev.kind);
  if (!dup) events.push(ev);
};
if (Array.isArray(exp.AUDIO_EVENTS)) {
  for (const e of exp.AUDIO_EVENTS) {
    const f = Number(e.f || 0);
    pushUnique({
      f,
      t: Number((f / fps).toFixed(5)),
      shot: shotFor(f),
      kind: String(e.kind || "whoosh"),
      gain: e.gain,
      pan: e.pan,
      dur: e.dur,
      lane: e.lane || "hits",
      duckDb: e.duckDb,
      riseFrames: e.riseFrames,
      space: e.space,
      params: e.params || {},
      label: e.label || String(e.kind || "event"),
      source: "AUDIO_EVENTS",
    });
  }
}
if (Array.isArray(exp.SHOCKWAVES)) {
  for (const sw of exp.SHOCKWAVES) {
    const f = Number(sw.f || 0);
    if (!events.some((e) => Math.abs(e.f - f) <= 2)) {
      pushUnique({ f, t: Number((f / fps).toFixed(5)), shot: shotFor(f), kind: "shock_ring", lane: "hero", gain: 0.8, duckDb: 4.0, label: "auto shockwave", source: "SHOCKWAVES" });
    }
  }
}
if (Array.isArray(exp.IMPACT_FRAMES)) {
  for (const imp of exp.IMPACT_FRAMES) {
    const f = Number(imp.f || 0);
    if (!events.some((e) => Math.abs(e.f - f) <= 2)) {
      pushUnique({ f, t: Number((f / fps).toFixed(5)), shot: shotFor(f), kind: "boom", lane: "hero", gain: 0.85, duckDb: 5.0, riseFrames: 6, label: "auto impact frame", source: "IMPACT_FRAMES" });
    }
  }
}
events.sort((a, b) => a.f - b.f);
process.stdout.write(JSON.stringify({ fps, total, shots: shots.map((s) => ({ id: s.id, name: s.name || String(s.id), a: s.a, b: s.b })), events }, null, 2));
"""
    proc = subprocess.run([node_bin, "-e", js_probe, str(remotion_root), str(story_path)], capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"Failed extracting picture events from story.ts:\n{proc.stderr.strip() or proc.stdout.strip()}")
    payload = json.loads(proc.stdout)
    out_path = Path(args.output).resolve()
    write_json(out_path, payload)
    print(f"Extracted {len(payload.get('events', []))} picture-locked audio events ({payload.get('fps')} fps) -> {out_path}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="whatif_cli.py", description="Voidmetric Anime What-If 3D Short CLI")
    sub = p.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init-episode", help="Scaffold a new Anime What-If episode workspace")
    p_init.add_argument("--slug", required=True, help="URL-safe episode slug (e.g. gojo-limitless)")
    p_init.add_argument("--title", required=True, help="Full episode title")
    p_init.add_argument("--remotion-root", required=True, help="Path to Remotion workspace root")
    p_init.add_argument("--profile", choices=["cloud-1080p", "local-2k"], default="cloud-1080p", help="Render profile (cloud-1080p sets MSAA=2 for WebGL2-safe swangle, local-2k sets MSAA=4)")
    p_init.add_argument("--bootstrap-remotion", action="store_true", help="Copy starter Remotion package.json/config/Root.tsx for fresh cloud sandboxes")
    p_init.add_argument("--output", required=True, help="Path to write JSON manifest")
    p_init.add_argument("--force", action="store_true", help="Overwrite existing starter files")
    p_init.set_defaults(func=cmd_init_episode)

    p_fr = sub.add_parser("check-framing", help="Mathematically validate 9:16 framing against zero-clipping rules")
    p_fr.add_argument("--shots-config", required=True, help="Path to shot camera & subject bounds JSON")
    p_fr.add_argument("--output", required=True, help="Path to write framing JSON report")
    p_fr.add_argument("--aspect", type=float, default=0.5625, help="Viewport aspect ratio (default 9/16 = 0.5625)")
    p_fr.add_argument("--min-margin", type=float, default=0.15, help="Minimum safe edge margin in meters")
    p_fr.add_argument("--warn-only", action="store_true", help="Return exit code 0 even when clips are detected")
    p_fr.set_defaults(func=cmd_check_framing)

    p_sub = sub.add_parser("sync-subtitles", help="Generate clean steady karaoke subtitles_data.ts from words.json")
    p_sub.add_argument("--words-json", required=True, help="Word timestamp JSON ({words: [{word,start,end}]})")
    p_sub.add_argument("--fps", type=int, required=True, help="Video frame rate (30)")
    p_sub.add_argument("--max-words", type=int, required=True, help="Max words per subtitle chunk (e.g. 3 or 4)")
    p_sub.add_argument("--ts-out", required=True, help="Destination subtitles_data.ts path")
    p_sub.add_argument("--output", required=True, help="Path to write alignment report JSON")
    p_sub.add_argument("--accent-purple", default="", help="Comma-separated purple power keywords")
    p_sub.add_argument("--accent-gold", default="", help="Comma-separated gold twist/emphasis keywords")
    p_sub.set_defaults(func=cmd_sync_subtitles)

    p_rc = sub.add_parser("render-cloud", help="OOM-proof resumable chunked 1080p CPU render + FFmpeg concat/mux for Gemini Tasks")
    p_rc.add_argument("--remotion-root", required=True, help="Path to Remotion workspace root")
    p_rc.add_argument("--composition", default="EpisodeShort1080", help="Remotion composition id (default EpisodeShort1080)")
    p_rc.add_argument("--total-frames", type=int, required=True, help="Total frames to render (e.g. 1800)")
    p_rc.add_argument("--chunk-frames", type=int, default=300, help="Frames per resumable chunk (default 300 = 10s)")
    p_rc.add_argument("--audio", default="", help="Optional path to mastered mix.wav to mux into final MP4")
    p_rc.add_argument("--out-video", required=True, help="Destination final MP4 path")
    p_rc.add_argument("--tmp-dir", default=default_tmp_dir(), help="Temp directory cleaned between chunks")
    p_rc.add_argument("--crf", type=int, default=17, help="H.264 CRF quality (default 17)")
    p_rc.add_argument("--gl", default="swangle", choices=["swangle", "angle", "angle-egl", "egl", "swiftshader"], help="Chromium WebGL renderer (swangle for CPU cloud, angle for Windows/macOS GPU)")
    p_rc.add_argument("--concurrency", type=int, default=1, help="Browser concurrency (MUST be 1 on 6.9 GiB / 0 swap cloud boxes)")
    p_rc.add_argument("--keep-chunks", action="store_true", help="Keep intermediate chunk MP4s after concat")
    p_rc.add_argument("--force", action="store_true", help="Re-render existing cached chunks")
    p_rc.add_argument("--dry-run", action="store_true", help="Output chunk plan JSON without running Chromium")
    p_rc.add_argument("--output", required=True, help="Path to write render report JSON")
    p_rc.set_defaults(func=cmd_render_cloud)

    p_cmp = sub.add_parser("compress-ref", help="Compress a master MP4 into a GitHub-safe showcase MP4")
    p_cmp.add_argument("--input", required=True, help="Source master MP4")
    p_cmp.add_argument("--output", required=True, help="Destination compressed MP4 path")
    p_cmp.add_argument("--max-mb", type=float, required=True, help="Maximum allowed output size in MB (e.g. 25)")
    p_cmp.add_argument("--height", type=int, default=1280, help="Output vertical height in pixels (default 1280)")
    p_cmp.add_argument("--crf", type=int, default=25, help="H.264 CRF quality (default 25)")
    p_cmp.add_argument("--report", default="", help="Optional JSON report output path")
    p_cmp.set_defaults(func=cmd_compress_ref)

    p_qa = sub.add_parser("qa-audit", help="Run short_qa.py and verify Voidmetric master thresholds")
    p_qa.add_argument("--video", required=True, help="Path to final rendered MP4")
    p_qa.add_argument("--shots-json", required=True, help="Path to shots.json timeline file")
    p_qa.add_argument("--qa-dir", required=True, help="Directory to save QA contact sheets")
    p_qa.add_argument("--profile", choices=["cloud-1080p", "local-2k"], required=True, help="Target resolution profile (cloud-1080p=1080x1920, local-2k=1440x2560)")
    p_qa.add_argument("--output", required=True, help="Path to write structured QA JSON report")
    p_qa.set_defaults(func=cmd_qa_audit)

    p_al = sub.add_parser("align-voice", help="Convert voiceover to 48 kHz WAV and extract Whisper word-level timestamps")
    p_al.add_argument("--input", required=True, help="Input voiceover file (.mp3/.wav/.m4a)")
    p_al.add_argument("--wav-out", required=True, help="Output 48 kHz stereo WAV path")
    p_al.add_argument("--words-out", required=True, help="Output words.json path")
    p_al.add_argument("--fps", type=int, required=True, help="Target FPS (30)")
    p_al.add_argument("--model", default="base", help="Whisper model size (tiny/base/small, default base)")
    p_al.add_argument("--language", default="en", help="Spoken language code (default en)")
    p_al.add_argument("--script-text", default="", help="Optional ground-truth narration text/SCRIPT.md for exact `stable-ts` forced alignment (zero misspelled anime names!)")
    p_al.add_argument("--engine", choices=["auto", "stable-ts", "faster-whisper", "whisper"], default="auto", help="Alignment backend (default auto: stable-ts -> faster-whisper -> whisper)")
    p_al.add_argument("--output", default="", help="Optional compact alignment summary JSON path")
    p_al.set_defaults(func=cmd_align_voice)

    p_pkg = sub.add_parser("package-pc", help="Create a clean .zip bundle for Voidmetric PC Render Studio (excludes node_modules/temp caches)")
    p_pkg.add_argument("--remotion-root", required=True, help="Path to Remotion workspace root")
    p_pkg.add_argument("--slug", required=True, help="Episode slug to bundle")
    p_pkg.add_argument("--out-zip", required=True, help="Destination .zip path")
    p_pkg.add_argument("--output", required=True, help="Path to write packaging manifest JSON")
    p_pkg.set_defaults(func=cmd_package_pc)

    p_srt = sub.add_parser("export-srt", help="Export clean platform-ready .srt captions from words.json")
    p_srt.add_argument("--words-json", required=True, help="Word timestamp JSON ({words: [{word,start,end}]})")
    p_srt.add_argument("--max-words", type=int, default=4, help="Max words per SRT cue (default 4)")
    p_srt.add_argument("--srt-out", required=True, help="Destination .srt path")
    p_srt.add_argument("--output", required=True, help="Path to write export summary JSON")
    p_srt.set_defaults(func=cmd_export_srt)

    p_bt = sub.add_parser("check-beats", help="Verify visual impact frames land 0-4 frames before spoken punch words")
    p_bt.add_argument("--words-json", required=True, help="Word timestamp JSON")
    p_bt.add_argument("--beats-json", required=True, help="Beats JSON ({beats: [{name, frame, keyword, occurrence?}]})")
    p_bt.add_argument("--fps", type=int, required=True, help="Video FPS (30)")
    p_bt.add_argument("--warn-only", action="store_true", help="Exit 0 even if beats are late")
    p_bt.add_argument("--output", required=True, help="Path to write beat-sync report JSON")
    p_bt.set_defaults(func=cmd_check_beats)

    p_cam = sub.add_parser("check-camera", help="Anti-tripod camera velocity & burst gate (pre-render --story-ts OR post-render --video)")
    p_cam.add_argument("--story-ts", default="", help="Path to src/videos/<slug>/story.ts for instant pre-render math audit")
    p_cam.add_argument("--remotion-root", default="", help="Path to workspace-remotion root (for resolving esbuild with --story-ts)")
    p_cam.add_argument("--video", default="", help="Optional rendered MP4 for post-render FFT phase-correlation camera audit")
    p_cam.add_argument("--min-median", type=float, default=0.85, help="Minimum median 720p camera speed in px/f (default 0.85; target 1.5-3.6)")
    p_cam.add_argument("--max-hold-pct", type=float, default=45.0, help="Maximum allowed tripod hold % (<0.5 px/f, default 45.0)")
    p_cam.add_argument("--min-bursts-per-10s", type=float, default=2.5, help="Minimum deliberate camera moves (>=4.5 px/f) per 10s (default 2.5; target 4.5-7.6)")
    p_cam.add_argument("--warn-only", action="store_true", help="Return exit code 0 even if tripod thresholds fail")
    p_cam.add_argument("--output", required=True, help="Path to write camera audit JSON report")
    p_cam.set_defaults(func=cmd_check_camera)

    p_ev = sub.add_parser("extract-events", help="Extract picture-locked AUDIO_EVENTS / SHOCKWAVES / IMPACT_FRAMES from story.ts into audio/events.json")
    p_ev.add_argument("--story-ts", required=True, help="Path to src/videos/<slug>/story.ts")
    p_ev.add_argument("--remotion-root", default="", help="Path to workspace-remotion root (for resolving esbuild)")
    p_ev.add_argument("--output", required=True, help="Destination events.json path (e.g. projects/<slug>/audio/events.json)")
    p_ev.set_defaults(func=cmd_extract_events)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
