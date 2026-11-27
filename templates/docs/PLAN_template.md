# Shot Plan — {{EPISODE_TITLE}}
**Slug:** `{{EPISODE_SLUG}}` | **Genre Mode:** `[supernatural_combat | grounded_genius | mecha_tech | dark_thriller]` | **Duration:** `~58 s` | **FPS:** `30`

| # | Shot ID | Shot Type | Frames | Time | Narration Beat | Painted 3D Set & Light | 3D Rig Action, Staging, Props/VFX, Camera & SFX |
|---|---|---|---|---|---|---|---|
| 1 | `hook_wake` | `closeup` | `0–90` | `0.00–3.00s` | [Opening hook line] | `buildBedroom` (`morning`) | Tight close-up (`1.9 m`) matching episode genre — NO fantasy aura on grounded anime! |
| 2 | `hook_aftermath` | `medium` | `90–195` | `3.00–6.50s` | [Immediate aftermath] | `buildBedroom` (`morning`) | Medium waist-up (`2.8 m`), off-center staging showing room/prop detail cleanly. |
| 3 | `guest_reveal` | `full_body` | `195–345` | `6.50–11.50s` | [Canon character reveal] | Distinct set (`buildScienceLab` / `buildClassroom` / `buildCosmicRealm`) | Guest Anime 3D Rig reveal in genre-appropriate pose (verify 9:16 margins!). |
| ... | ... | ... | ... | ... | ... | ... | ... |

## 9:16 Multi-Scale & Genre Checklist (Mandatory Before Render)
- [ ] Genre-locked visuals verified (if `grounded_genius`: ZERO magic halo rings, ZERO energy auras, ZERO levitation!)
- [ ] Every distinct story location uses its own painted `env3d_core.ts` set (`buildBedroom`, `buildClassroom`, `buildScienceLab`, `buildSchoolTrackGym`, `buildCityStreet`, `buildForestGrove`)
- [ ] Multi-scale shot rhythm verified (max 2 `full_body` shots in a row; includes `closeup`, `medium`, and `insert` shots!)
- [ ] Rule-of-Thirds staging verified (character torso never blocks chalkboards, blueprints, or key background props!)
- [ ] Ran `whatif_cli.py check-framing` with `PASS` on all shots (with `shot_type` set on close-ups/mediums/inserts)
- [ ] Rendered & visually inspected all 16 tiles of `LookCheck3D` (`0` clipped heads/limbs, `0` Play-Doh untextured rooms, `0` awkward MC cameos)
