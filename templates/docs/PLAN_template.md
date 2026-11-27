# Shot Plan — {{EPISODE_TITLE}}
**Slug:** `{{EPISODE_SLUG}}` | **Genre Mode:** `[supernatural_combat | grounded_genius | mecha_tech | dark_thriller]` | **Duration:** `~58 s` | **FPS:** `30`

| # | Shot ID | Shot Type | Frames | Time | Narration Beat | Painted 3D Set & Light | 3D Rig Action, Staging, Props/VFX, Camera & SFX |
|---|---|---|---|---|---|---|---|
| 1 | `hook_wake` | `closeup` | `0–90` | `0.00–3.00s` | [Opening hook line] | `buildBedroom` (`morning`) | Tight close-up (`1.9 m`) matching episode genre — NO fantasy aura on grounded anime! |
| 2 | `hook_aftermath` | `medium` | `90–195` | `3.00–6.50s` | [Immediate aftermath] | `buildBedroom` (`morning`) | Medium waist-up (`2.8 m`), off-center staging showing room/prop detail cleanly. |
| 3 | `guest_reveal` | `full_body` | `195–345` | `6.50–11.50s` | [Canon character reveal] | Distinct set (`buildScienceLab` / `buildClassroom` / `buildCosmicRealm`) | Guest Anime 3D Rig reveal in genre-appropriate pose (verify 9:16 margins!). |
| ... | ... | ... | ... | ... | ... | ... | ... |

## 9:16 Multi-Scale, Visual Polish & Named-Cast Checklist (Mandatory Before Render)
- [ ] **ZERO Unreferenced Named Characters:** Every named canon anime/manga character appearing on screen had user-supplied reference images AND was showcased in Stage 4 `CastSheet3D` (NO off-model characters sculpted from memory!)
- [ ] Genre-locked visuals verified (if `grounded_genius`: ZERO magic halo rings, ZERO energy auras, ZERO levitation!)
- [ ] Every distinct story location uses painted CanvasTextures (`makePaintedMat` / `makeEnvTex` / `env3d_core.ts`, bright sunlit albedos, colored darks `L* >= 18`, thin tinted seams)
- [ ] Rich Cinema DOF (`cInf: 10–15` on CU/MS/Inserts, `0` on wides) + foreground depth framing (`10–25%` of one edge at `0.35–0.5× focusDist`) + practical lights (lamps/windows/headlights)
- [ ] Anti-tripod camera pacing verified (`runCamKeys`, `2–4` keys/shot, `whatif_cli.py check-camera --story-ts` = `PASS`) + `6–8 f` `XFADE` on major place/act shifts + `IMPACT_FRAMES` / `SPEEDLINES` on peak genre-matched hits!
- [ ] Multi-scale shot rhythm verified (max 2 `full_body` shots in a row; includes `closeup`, `medium`, and `insert` shots!)
- [ ] Rule-of-Thirds staging verified (character torso never blocks chalkboards, blueprints, or key background props!)
- [ ] Ran `whatif_cli.py check-framing` with `PASS` on all shots (with `shot_type` set on close-ups/mediums/inserts)
- [ ] Rendered & visually inspected all 16 tiles of `LookCheck3D` (`0` clipped heads/limbs, `0` Play-Doh untextured rooms, `0` unreferenced named characters, `0` awkward MC cameos)
