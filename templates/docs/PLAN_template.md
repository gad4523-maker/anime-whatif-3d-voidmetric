# Shot Plan — {{EPISODE_TITLE}}
**Slug:** `{{EPISODE_SLUG}}` | **Duration:** `~64 s` | **FPS:** `30` | **Resolution:** `1440×2560` (Native 2K)

| # | Shot ID | Frames | Time | Narration Beat | 3D Zone & Light | 3D Rig Action, Bone-Locked VFX, Camera & SFX |
|---|---|---|---|---|---|---|
| 1 | `hook_wake` | `0–168` | `0.00–5.60s` | [Opening hook line] | Zone 1 (`morning`) | Locked MC 3D Rig wakes + bone-locked VFX on palm -> object interaction. |
| 2 | `hook_aftermath` | `168–296` | `5.60–9.87s` | [Immediate aftermath] | Zone 1 (`morning`) | MC amazed reaction + dissolving/lingering 3D particles. |
| 3 | `guest_reveal` | `296–480` | `9.87–16.00s` | [Canon character reveal] | Zone 4 (`void`) | Guest Anime 3D Rig hero crane + signature pose (verify 9:16 margins!). |
| ... | ... | ... | ... | ... | ... | ... |

## 9:16 Safe-Framing Checklist (Mandatory Before Render)
- [ ] Ran `uv run scripts/whatif_cli.py check-framing` with `PASS` on all shots (`halfWidth = D * tan(fov/2) * 0.5625`)
- [ ] All hand/weapon VFX attached via `localToWorld` (zero floating static coordinates)
- [ ] Forward palm VFX offset `+0.12 to +0.15 m` toward camera so fingers sit cleanly behind orb
- [ ] Rendered & visually inspected all 16 tiles of `LookCheck3D` (`0` clipped limbs, hair, orbs, kanji, or props)
