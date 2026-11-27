# Shot Plan — {{EPISODE_TITLE}}
**Slug:** `{{EPISODE_SLUG}}` | **Visual Tone:** `[Describe episode-specific visual & genre tone]` | **Duration:** `~58 s` | **FPS:** `30`

| # | Shot ID | Shot Type | Frames | Time | Narration Beat | Custom 3D Set & Custom Light | Custom 3D Rig Acting, Custom Props/VFX, Custom Camera & SFX |
|---|---|---|---|---|---|---|---|
| 1 | `shot_1` | `closeup` | `0–90` | `0.00–3.00s` | [Opening hook line] | [Bespoke painted 3D set + custom `makeLightPreset`] | [Bespoke camera trajectory + custom pose + genre-matched visuals] |
| ... | ... | ... | ... | ... | ... | ... | ... |

## 9:16 Zero-Hardcoding, Visual Polish & Named-Cast Checklist (Mandatory Before Render)
- [ ] **ZERO Unreferenced Named Characters:** Every named canon anime/manga character appearing on screen had user-supplied reference images AND was showcased in Stage 4 `CastSheet3D` (NO off-model characters sculpted from memory!)
- [ ] **100% Bespoke Episode Art (ZERO Hardcoded Presets):** Every environment, texture, lighting mood, camera angle, character pose, prop, and VFX was authored specifically for this episode's story & genre (zero fantasy magic auras on grounded anime!)
- [ ] Bright sunlit albedos, chromatic shadows (never crushed black mud), colored darks (`L* >= 18`), thin tinted texture seams, and synced 5-uniform `ANIME_LIGHT` so characters live inside every lighting mood
- [ ] Rich Cinema DOF (`cInf: 10–15` on CU/MS/Inserts with `focusOnPoint`, `0` on wides) + foreground edge parallax + practical lights
- [ ] Anti-tripod camera pacing verified (`runCamKeys`, `2–4` custom keyframes/shot, `whatif_cli.py check-camera --story-ts` = `PASS`) + `6–8 f` `XFADE` on major place/act shifts + genre-matched Sakuga punctuation
- [ ] Multi-scale shot rhythm & Rule-of-Thirds staging verified (character torso never blocks key background visuals!)
- [ ] Ran `whatif_cli.py check-framing` with `PASS` on all shots (with `shot_type` set on close-ups/mediums/inserts)
- [ ] Rendered & visually inspected all 16 tiles of `LookCheck3D` (`0` clipped heads/limbs, `0` untextured boxes, `0` out-of-focus heroes, `0` unreferenced named characters)
