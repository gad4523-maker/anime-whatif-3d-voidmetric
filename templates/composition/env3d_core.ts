// Voidmetric v3.2 Custom-First Painted Cel-Shaded 3D Anime Environment Toolkit & Optional Sets!
//
// CUSTOM-FIRST DESIGN: Hardcoded preset rooms are OPTIONAL — never mandatory!
// Use the exported primitives below (`hash01`, `makeEnvTex`, `cel`, `celTex`, `makePaintedMat`) to build
// ANY custom textured 3D anime location the episode needs (pirate ship deck, Shibuya subway, Stone-World
// village, brick rooftops, tatami dojo, dungeon boss hall, lab, stadium, spacecraft) with rich painted
// CanvasTextures + `twoTone` cel lighting + ink outlines — NEVER flat untextured Play-Doh boxes!
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";

/** Deterministic PRNG (zero Math.random() so every Remotion frame renders identically across parallel workers!) */
export function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Paint ANY deterministic high-res procedural anime CanvasTexture (brick, tatami, wood, ocean, signs, stone, tile)! */
export function makeEnvTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = repeatX > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Flat inked cel-shaded material (for small trim/metal accents; prefer `celTex` / `makePaintedMat` for walls/floors!). */
export const cel = (color: string) => twoTone(new THREE.MeshLambertMaterial({ color }));

/** Textured inked cel-shaded material: multiplies ANY CanvasTexture into Voidmetric's two-tone shadow & ink pipeline! */
export const celTex = (map: THREE.Texture, tint = "#ffffff") =>
  twoTone(new THREE.MeshLambertMaterial({ color: tint, map }));

/** One-call custom painted cel-shaded material factory for building brand-new textured worlds & props on demand! */
export function makePaintedMat(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeatX?: number; repeatY?: number; tint?: string } = {}
): THREE.MeshLambertMaterial {
  const tex = makeEnvTex(w, h, draw, opts.repeatX ?? 1, opts.repeatY ?? 1);
  return celTex(tex, opts.tint ?? "#ffffff");
}

// ---------------------------------------------------------------------------
// Painted Cel-Anime Procedural Texture Library (Exported for custom episode props!)
// ---------------------------------------------------------------------------

/** Luminous mromidev-calibrated honey-oak wood planks (staggered boards, lit/shaded bevel lips, nail dots, thin tinted seams!). */
export function texWoodPlanks(
  baseHex = "#e8bc80",
  darkHex = "#c69256",
  seamHex = "#63361a",
  repeatX = 3,
  repeatY = 3
): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    const baseCol = new THREE.Color(baseHex);
    const darkCol = new THREE.Color(darkHex);

    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      const offset = (r % 2) * (w * 0.48) + ((r * 73) % 90);
      const splits = [0, offset % w, (offset + w * 0.52) % w, w].sort((a, b) => a - b);

      for (let s = 0; s < splits.length - 1; s++) {
        const x0 = splits[s];
        const x1 = splits[s + 1];
        const bw = x1 - x0;
        const tone = hash01(r * 19 + s * 7);
        const c = baseCol.clone().lerp(darkCol, tone * 0.34);
        ctx.fillStyle = `#${c.getHexString()}`;
        ctx.fillRect(x0, y, bw, rh);

        // Soft sunlit top bevel highlight + delicate shaded bottom bevel (mromidev textures.md 3.10)
        ctx.fillStyle = "rgba(255, 246, 224, 0.24)";
        ctx.fillRect(x0 + 2, y + 2, Math.max(0, bw - 4), 4);
        ctx.fillStyle = "rgba(116, 62, 26, 0.14)";
        ctx.fillRect(x0 + 2, y + rh - 5, Math.max(0, bw - 4), 3);

        // Subtle warm wood grain strokes (low contrast so they never fight board seams!)
        ctx.strokeStyle = `rgba(128, 74, 36, ${0.10 + tone * 0.08})`;
        ctx.lineWidth = 1.4;
        for (let g = 0; g < 4; g++) {
          const gy = y + 10 + g * ((rh - 18) / 3);
          const wave = (hash01(r * 31 + s * 13 + g) - 0.5) * 5;
          ctx.beginPath();
          ctx.moveTo(x0 + 3, gy);
          ctx.bezierCurveTo(x0 + bw * 0.33, gy + wave, x0 + bw * 0.66, gy - wave, x1 - 3, gy);
          ctx.stroke();
        }
        // Subtle knot on occasional planks
        if (hash01(r * 41 + s * 17) > 0.76 && bw > 90) {
          const kx = x0 + bw * (0.25 + hash01(r * 7 + s) * 0.5);
          const ky = y + rh * 0.52;
          ctx.strokeStyle = "rgba(104, 58, 28, 0.22)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(kx, ky, 13, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Crisp end-butt nail pegs (gives authentic illustrated wooden floor/deck craft!)
        if (bw > 44) {
          ctx.fillStyle = "rgba(92, 50, 24, 0.55)";
          for (const nx of [x0 + 9, x1 - 9]) {
            ctx.beginPath();
            ctx.arc(nx, y + rh * 0.28, 2.0, 0, Math.PI * 2);
            ctx.arc(nx, y + rh * 0.72, 2.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Crisp thin tinted horizontal & vertical plank seams (half the contrast of silhouette ink!)
      ctx.fillStyle = seamHex;
      ctx.fillRect(0, y, w, 2.0);
      for (let s = 1; s < splits.length - 1; s++) {
        ctx.fillRect(splits[s] - 0.9, y, 1.8, rh);
      }
    }
  }, repeatX, repeatY);
}

/** Anime interior plaster wall + horizontal chair-rail trim + vertical wood wainscoting paneling! */
export function texPlasterWall(
  wallHex = "#f1e8da",
  wainscotHex = "#b38458",
  trimHex = "#634530"
): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    // Upper painted plaster with warm sunlit gradient
    const gr = ctx.createLinearGradient(0, 0, 0, h * 0.70);
    gr.addColorStop(0, "#e5dac8");
    gr.addColorStop(0.16, wallHex);
    gr.addColorStop(0.88, wallHex);
    gr.addColorStop(1, "#dfd2be");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);

    // Subtle painterly anime wall brushstroke washes
    for (let i = 0; i < 48; i++) {
      const px = hash01(i * 11 + 1) * w;
      const py = hash01(i * 17 + 3) * h * 0.66;
      const pw = 40 + hash01(i * 23) * 90;
      const ph = 18 + hash01(i * 29) * 34;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,252,245,0.16)" : "rgba(168,144,118,0.08)";
      ctx.fillRect(px, py, pw, ph);
    }

    // Lower wood wainscoting paneling (bottom 30%)
    const wy = Math.floor(h * 0.70);
    ctx.fillStyle = wainscotHex;
    ctx.fillRect(0, wy, w, h - wy);
    const slats = 12;
    const sw = w / slats;
    for (let i = 0; i < slats; i++) {
      const sx = i * sw;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,235,205,0.08)" : "rgba(60,36,18,0.08)";
      ctx.fillRect(sx, wy, sw, h - wy);
      ctx.fillStyle = "rgba(68,42,24,0.38)";
      ctx.fillRect(sx, wy, 2, h - wy);
    }

    // Chair-rail molding + floor baseboard shadow
    ctx.fillStyle = trimHex;
    ctx.fillRect(0, wy - 7, w, 12);
    ctx.fillStyle = "rgba(255,238,215,0.22)";
    ctx.fillRect(0, wy - 7, w, 3);
    ctx.fillStyle = "rgba(48,30,18,0.28)";
    ctx.fillRect(0, wy + 5, w, 6);
    ctx.fillStyle = trimHex;
    ctx.fillRect(0, h - 18, w, 18);
  });
}

/** Authentic Japanese classroom green chalkboard with chalk dust smears + crisp math/science notation! */
export function texChalkboard(): THREE.CanvasTexture {
  return makeEnvTex(1024, 512, (ctx, w, h) => {
    // Deep forest-slate anime chalkboard gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1d3d2f");
    g.addColorStop(0.5, "#234a39");
    g.addColorStop(1, "#193629");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Eraser dust smudges (authentic anime school atmosphere!)
    for (let i = 0; i < 36; i++) {
      const sx = hash01(i * 13 + 2) * w;
      const sy = hash01(i * 19 + 5) * h;
      const rx = 45 + hash01(i * 7) * 110;
      const ry = 18 + hash01(i * 23) * 40;
      const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, rx);
      sg.addColorStop(0, "rgba(230,242,234,0.07)");
      sg.addColorStop(1, "rgba(230,242,234,0)");
      ctx.fillStyle = sg;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Subtle chalk divider line + clean equations & diagrams centered inside 9:16-friendly core band!
    ctx.strokeStyle = "rgba(244, 248, 242, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.56, 34);
    ctx.lineTo(w * 0.56, h - 34);
    ctx.stroke();

    ctx.fillStyle = "rgba(248, 250, 245, 0.90)";
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText("E = mc²", 230, 102);
    ctx.fillStyle = "rgba(255, 236, 152, 0.88)";
    ctx.font = "bold 30px monospace";
    ctx.fillText("PV = nRT  |  F = ma", 230, 166);
    ctx.fillStyle = "rgba(240, 248, 244, 0.84)";
    ctx.font = "26px monospace";
    ctx.fillText("2H₂ + O₂ → 2H₂O + ΔH", 230, 226);
    ctx.fillText("v² = v₀² + 2aΔx", 230, 284);
    ctx.fillStyle = "rgba(255, 198, 206, 0.86)";
    ctx.fillText("∫ f(x) dx = F(b) - F(a)", 230, 344);

    // Chalk graph & benzene ring sketch inside readable 9:16 right-center band
    ctx.strokeStyle = "rgba(242, 248, 244, 0.84)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(610, 224);
    ctx.lineTo(610, 76);
    ctx.moveTo(600, 214);
    ctx.lineTo(808, 214);
    ctx.stroke();
    ctx.strokeStyle = "rgba(154, 232, 255, 0.90)";
    ctx.beginPath();
    ctx.moveTo(614, 208);
    ctx.quadraticCurveTo(688, 66, 796, 152);
    ctx.stroke();

    // Hexagonal molecular ring sketch below graph
    const hx = 706;
    const hy = 350;
    const hr = 52;
    ctx.strokeStyle = "rgba(255, 236, 152, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
      const x = hx + Math.cos(a) * hr;
      const y = hy + Math.sin(a) * hr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, hr * 0.56, 0, Math.PI * 2);
    ctx.stroke();

    // Chalkboard wooden inner lip shadow
    ctx.strokeStyle = "rgba(10, 22, 16, 0.55)";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
  });
}

/** Pinned workshop/lab corkboard with technical blueprints, schematics & red pushpins! */
export function texBlueprintBoard(): THREE.CanvasTexture {
  return makeEnvTex(1024, 640, (ctx, w, h) => {
    // Cork texture background
    ctx.fillStyle = "#b98653";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = i % 3 === 0 ? "rgba(92,58,28,0.22)" : "rgba(232,192,140,0.22)";
      ctx.fillRect(hash01(i * 7 + 1) * w, hash01(i * 11 + 2) * h, 4 + hash01(i * 5) * 6, 3 + hash01(i * 9) * 5);
    }

    // Sheet 1: Classic Prussian-blue technical blueprint (left)
    ctx.save();
    ctx.translate(48, 52);
    ctx.rotate(-0.02);
    ctx.fillStyle = "rgba(35,20,10,0.28)";
    ctx.fillRect(8, 10, 430, 510);
    ctx.fillStyle = "#1c4a82";
    ctx.fillRect(0, 0, 430, 510);
    ctx.strokeStyle = "rgba(195,228,255,0.24)";
    ctx.lineWidth = 1;
    for (let gx = 20; gx < 430; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 510); ctx.stroke(); }
    for (let gy = 20; gy < 510; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(430, gy); ctx.stroke(); }
    ctx.strokeStyle = "#eaf6ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 402, 482);
    // Technical turbine / mechanical schematic
    ctx.beginPath();
    ctx.arc(215, 200, 96, 0, Math.PI * 2);
    ctx.arc(215, 200, 48, 0, Math.PI * 2);
    ctx.moveTo(95, 200); ctx.lineTo(335, 200);
    ctx.moveTo(215, 80); ctx.lineTo(215, 320);
    ctx.stroke();
    ctx.fillStyle = "#eaf6ff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("SPEC SHEET // REV 04", 30, 448);
    ctx.fillStyle = "#e03846";
    ctx.beginPath(); ctx.arc(215, 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Sheet 2: Cream chemistry notes (top-right)
    ctx.save();
    ctx.translate(524, 46);
    ctx.rotate(0.025);
    ctx.fillStyle = "rgba(35,20,10,0.25)";
    ctx.fillRect(8, 10, 440, 270);
    ctx.fillStyle = "#f7f1e1";
    ctx.fillRect(0, 0, 440, 270);
    ctx.strokeStyle = "#36465c";
    ctx.lineWidth = 3;
    // Flask & condenser sketch
    ctx.beginPath();
    ctx.moveTo(86, 60); ctx.lineTo(86, 118); ctx.lineTo(44, 210); ctx.lineTo(148, 210); ctx.lineTo(106, 118); ctx.lineTo(106, 60);
    ctx.stroke();
    ctx.fillStyle = "#2b3848";
    ctx.font = "bold 24px monospace";
    ctx.fillText("1. DISTILLATION", 180, 92);
    ctx.font = "20px monospace";
    ctx.fillText("2. ELECTROLYSIS", 180, 140);
    ctx.fillText("3. ALLOY SMELT", 180, 188);
    ctx.fillStyle = "#3486e8";
    ctx.beginPath(); ctx.arc(220, 18, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Sheet 3: Warm yellow memo graph (bottom-right)
    ctx.save();
    ctx.translate(534, 344);
    ctx.rotate(-0.018);
    ctx.fillStyle = "rgba(35,20,10,0.24)";
    ctx.fillRect(8, 10, 425, 240);
    ctx.fillStyle = "#fff5d2";
    ctx.fillRect(0, 0, 425, 240);
    ctx.strokeStyle = "#d44b4b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(36, 194);
    ctx.lineTo(120, 150);
    ctx.lineTo(220, 166);
    ctx.lineTo(310, 82);
    ctx.lineTo(390, 46);
    ctx.stroke();
    ctx.fillStyle = "#282828";
    ctx.font = "bold 20px monospace";
    ctx.fillText("OUTPUT CURVE (+10B%)", 36, 224);
    ctx.fillStyle = "#32b864";
    ctx.beginPath(); ctx.arc(210, 16, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

/** Painted sky + distant roofline + sunlit glass gleam for interior anime windows! */
export function texWindowSky(topHex = "#5ea8ef", botHex = "#d8f0ff", isNight = false): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, topHex);
    g.addColorStop(0.75, botHex);
    g.addColorStop(1, isNight ? "#1a223c" : "#eef6ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (isNight) {
      ctx.fillStyle = "#fff9dc";
      for (let i = 0; i < 42; i++) {
        ctx.beginPath();
        ctx.arc(hash01(i * 11) * w, hash01(i * 17) * h * 0.68, 1.5 + hash01(i * 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Soft cumulus anime clouds
      ctx.fillStyle = "rgba(255, 254, 250, 0.92)";
      for (const [cx, cy, r] of [[120, 190, 56], [175, 175, 72], [235, 192, 52], [360, 130, 54], [418, 122, 64]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(165, 198, 232, 0.35)";
      ctx.fillRect(60, 212, 230, 28);
    }

    // Distant anime neighborhood rooftops silhouette at window base
    ctx.fillStyle = isNight ? "#12182b" : "#6c87a8";
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    for (let i = 0; i < 6; i++) {
      const bx = i * 92 - 10;
      const bh = 60 + (i % 3) * 32;
      ctx.fillRect(bx, h - bh - 34, 78, bh + 34);
    }

    // Crisp diagonal anime glass reflection bands
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.moveTo(60, 0); ctx.lineTo(135, 0); ctx.lineTo(0, 240); ctx.lineTo(0, 140);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(290, 0); ctx.lineTo(332, 0); ctx.lineTo(80, h); ctx.lineTo(34, h);
    ctx.closePath();
    ctx.fill();
  });
}

/** Textured dark anime asphalt road with aggregate grain & dashed centerline! */
export function texAsphaltRoad(baseHex = "#393e4c", repeatX = 2, repeatY = 4): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    // Asphalt speckle grain
    for (let i = 0; i < 2400; i++) {
      const lum = hash01(i * 19 + 3);
      ctx.fillStyle = lum > 0.5 ? "rgba(220,226,240,0.08)" : "rgba(12,14,20,0.16)";
      ctx.fillRect(hash01(i * 7 + 1) * w, hash01(i * 13 + 2) * h, 2 + (i % 3), 2 + (i % 2));
    }
    // Subtle dark tire tracks
    ctx.fillStyle = "rgba(18, 20, 28, 0.16)";
    ctx.fillRect(w * 0.26, 0, w * 0.11, h);
    ctx.fillRect(w * 0.63, 0, w * 0.11, h);
    // Side white gutter stripes
    ctx.fillStyle = "rgba(236, 236, 230, 0.72)";
    ctx.fillRect(14, 0, 10, h);
    ctx.fillRect(w - 24, 0, 10, h);
    // Dashed center yellow/cream lane markings
    ctx.fillStyle = "rgba(244, 212, 114, 0.82)";
    for (let y = 24; y < h; y += 128) {
      ctx.fillRect(w * 0.5 - 6, y, 12, 72);
    }
  }, repeatX, repeatY);
}

/** Rain-slicked anime highway/street asphalt with wet specular streaks, subtle puddle glare & double yellow centerlines! */
export function texWetAsphaltRoad(
  baseHex = "#344156",
  reflectHex = "#8ec0f6",
  repeatX = 2,
  repeatY = 4
): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    // Broad glossy rain-sheen longitudinal bands (reads immediately as wet asphalt under storm_rain/twilight_indigo!)
    const sheen = ctx.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0.0, "rgba(18, 24, 38, 0.26)");
    sheen.addColorStop(0.24, "rgba(165, 204, 248, 0.16)");
    sheen.addColorStop(0.50, "rgba(28, 36, 52, 0.10)");
    sheen.addColorStop(0.76, "rgba(165, 204, 248, 0.18)");
    sheen.addColorStop(1.0, "rgba(18, 24, 38, 0.26)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    // Fine wet aggregate + soft reflective puddle ovals
    for (let i = 0; i < 1600; i++) {
      const lum = hash01(i * 19 + 3);
      ctx.fillStyle = lum > 0.55 ? "rgba(210,230,255,0.10)" : "rgba(16,22,34,0.16)";
      ctx.fillRect(hash01(i * 7 + 1) * w, hash01(i * 13 + 2) * h, 2 + (i % 3), 2 + (i % 2));
    }
    const rCol = new THREE.Color(reflectHex);
    for (let i = 0; i < 12; i++) {
      const px = w * (0.14 + hash01(i * 11 + 5) * 0.72);
      const py = hash01(i * 17 + 9) * h;
      const rx = 24 + hash01(i * 23) * 44;
      const ry = 46 + hash01(i * 29) * 86;
      const pg = ctx.createRadialGradient(px, py, 3, px, py, ry);
      pg.addColorStop(0, `rgba(${Math.round(rCol.r * 255)},${Math.round(rCol.g * 255)},${Math.round(rCol.b * 255)},0.22)`);
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(rx / ry, 1);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(0, 0, ry, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crisp side edge lines + glowing double-yellow rain highway centerline (Rick's Clips Ref-3!)
    ctx.fillStyle = "rgba(238, 244, 250, 0.80)";
    ctx.fillRect(14, 0, 10, h);
    ctx.fillRect(w - 24, 0, 10, h);
    ctx.fillStyle = "rgba(255, 222, 112, 0.90)";
    ctx.fillRect(w * 0.5 - 12, 0, 7, h);
    ctx.fillRect(w * 0.5 + 5, 0, 7, h);
  }, repeatX, repeatY);
}

/** Japanese tiled concrete sidewalk slabs with joints & subtle stone grain! */
export function texSidewalkTiles(repeatX = 2, repeatY = 10): THREE.CanvasTexture {
  return makeEnvTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#a3a7b2";
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const shade = (hash01(r * 13 + c * 7) - 0.5) * 18;
        ctx.fillStyle = `rgb(${164 + shade}, ${168 + shade}, ${178 + shade})`;
        ctx.fillRect(c * 64 + 2, r * 64 + 2, 60, 60);
      }
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(45,48,58,0.09)";
      ctx.fillRect(hash01(i * 11) * w, hash01(i * 17) * h, 2, 2);
    }
    ctx.strokeStyle = "#626672";
    ctx.lineWidth = 3;
    for (let k = 0; k <= 4; k++) {
      ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, k * 64); ctx.lineTo(w, k * 64); ctx.stroke();
    }
  }, repeatX, repeatY);
}

/** Detailed multi-story anime city building facade (panel joints, recessed glass panes, mullions & glow)! */
export function texBuildingFacade(
  wallHex = "#c2bab0",
  night = false,
  glowHex = "#ffda82"
): THREE.CanvasTexture {
  return makeEnvTex(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = wallHex;
    ctx.fillRect(0, 0, w, h);

    // Concrete horizontal floor bands & vertical expansion joints
    const floors = 8;
    const fh = h / floors;
    for (let fl = 0; fl < floors; fl++) {
      const fy = fl * fh;
      ctx.fillStyle = "rgba(45, 48, 62, 0.14)";
      ctx.fillRect(0, fy, w, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fillRect(0, fy + 10, w, 4);

      // 4 crisp multi-pane anime windows per floor
      const cols = 4;
      const padX = 22;
      const ww = (w - padX * (cols + 1)) / cols;
      const wh = fh * 0.56;
      const wy = fy + fh * 0.24;

      for (let col = 0; col < cols; col++) {
        const wx = padX + col * (ww + padX);
        // Dark window recess shadow + sill
        ctx.fillStyle = "#2b303e";
        ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

        const lit = night && hash01(fl * 17 + col * 11) > 0.34;
        if (lit) {
          const wg = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          wg.addColorStop(0, glowHex);
          wg.addColorStop(1, "#e89d4c");
          ctx.fillStyle = wg;
        } else {
          const wg = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          wg.addColorStop(0, night ? "#1c2438" : "#4b7cad");
          wg.addColorStop(1, night ? "#293550" : "#9bc8eb");
          ctx.fillStyle = wg;
        }
        ctx.fillRect(wx, wy, ww, wh);

        // Diagonal anime glass reflection streak
        ctx.fillStyle = lit ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.moveTo(wx + 8, wy);
        ctx.lineTo(wx + 28, wy);
        ctx.lineTo(wx, wy + 44);
        ctx.lineTo(wx, wy + 20);
        ctx.closePath();
        ctx.fill();

        // Center window mullion + sill ledge
        ctx.fillStyle = "#2b303e";
        ctx.fillRect(wx + ww * 0.5 - 2, wy, 4, wh);
        ctx.fillRect(wx - 6, wy + wh + 2, ww + 12, 6);
      }
    }
  });
}

/** Lush Makoto Shinkai / Stone-World painted meadow grass (layered tuft brushstrokes & sunlight patches)! */
export function texAnimeGrass(
  baseHex = "#63a34d",
  darkHex = "#3d7a36",
  lightHex = "#91c960",
  repeatX = 6,
  repeatY = 6
): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    // Dappled sunlight & cool shade meadow patches
    for (let i = 0; i < 36; i++) {
      const px = hash01(i * 11 + 1) * w;
      const py = hash01(i * 17 + 2) * h;
      const pr = 36 + hash01(i * 23) * 68;
      const g = ctx.createRadialGradient(px, py, 6, px, py, pr);
      g.addColorStop(0, i % 2 === 0 ? "rgba(166,222,102,0.32)" : "rgba(42,96,44,0.24)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Painterly layered grass tuft strokes
    for (let i = 0; i < 720; i++) {
      const gx = hash01(i * 13 + 7) * w;
      const gy = hash01(i * 19 + 11) * h;
      const len = 10 + hash01(i * 29) * 16;
      const lean = (hash01(i * 31) - 0.5) * 10;
      ctx.strokeStyle = i % 3 === 0 ? lightHex : i % 3 === 1 ? darkHex : "#4c8e40";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + lean * 0.5, gy - len * 0.6, gx + lean, gy - len);
      ctx.stroke();
    }

    // Occasional tiny sunlit wildflower / clover specks
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#fff6b0" : "#ffffff";
      ctx.beginPath();
      ctx.arc(hash01(i * 41 + 3) * w, hash01(i * 47 + 5) * h, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, repeatX, repeatY);
}

/** Hand-inked vertical anime tree bark ridges & moss undertones! */
export function texTreeBark(baseHex = "#6c4a32"): THREE.CanvasTexture {
  return makeEnvTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) {
      const x = (i / 42) * w;
      const shade = hash01(i * 17);
      ctx.strokeStyle = shade > 0.5 ? "rgba(42, 24, 14, 0.52)" : "rgba(154, 114, 78, 0.34)";
      ctx.lineWidth = 2.5 + shade * 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (shade - 0.5) * 18, h * 0.35, x - (shade - 0.5) * 18, h * 0.7, x, h);
      ctx.stroke();
    }
    // Subtle lower mossy tint
    const mg = ctx.createLinearGradient(0, h * 0.72, 0, h);
    mg.addColorStop(0, "rgba(68,118,52,0)");
    mg.addColorStop(1, "rgba(68,118,52,0.34)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  });
}

/** Painterly clustered anime foliage texture so canopies read as illustrated leaf clusters! */
export function texFoliage(darkHex = "#2e703b", midHex = "#48984c", hiHex = "#78c864"): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = midHex;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++) {
      const lx = hash01(i * 13 + 1) * w;
      const ly = hash01(i * 19 + 5) * h;
      const rx = 14 + hash01(i * 7) * 24;
      const ry = 10 + hash01(i * 23) * 16;
      const ang = hash01(i * 29) * Math.PI;
      ctx.fillStyle = i % 3 === 0 ? darkHex : i % 3 === 1 ? hiHex : midHex;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

/** Red terracotta Japanese school running track with granular clay grit & crisp white lane lines! */
export function texRunningTrack(repeatX = 4, repeatY = 1): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b8553d";
    ctx.fillRect(0, 0, w, h);
    // Granular clay / tartan track speckles
    for (let i = 0; i < 2200; i++) {
      const k = hash01(i * 17 + 3);
      ctx.fillStyle = k > 0.5 ? "rgba(232,146,112,0.16)" : "rgba(92,32,20,0.18)";
      ctx.fillRect(hash01(i * 7) * w, hash01(i * 11) * h, 3, 2);
    }
    // Crisp white painted 4-lane track lines
    ctx.fillStyle = "rgba(250, 248, 242, 0.90)";
    for (const ly of [24, 146, 268, 390, 492]) {
      ctx.fillRect(0, ly, w, 9);
    }
  }, repeatX, repeatY);
}

/** Fractured anime wasteland / rock canyon strata texture! */
export function texCraterRock(baseHex = "#827060", crackHex = "#3a2e28", repeatX = 3, repeatY = 3): THREE.CanvasTexture {
  return makeEnvTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    // Horizontal sedimentary canyon bands
    for (let i = 0; i < 16; i++) {
      const y = i * 32;
      ctx.fillStyle = i % 2 ? "rgba(56,42,32,0.14)" : "rgba(218,194,166,0.12)";
      ctx.fillRect(0, y, w, 18);
    }
    // Angular ink cracks
    ctx.strokeStyle = crackHex;
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 18; i++) {
      let cx = hash01(i * 13) * w;
      let cy = hash01(i * 19) * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (hash01(i * 31 + s * 7) - 0.5) * 90;
        cy += (hash01(i * 37 + s * 11) - 0.5) * 90;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }, repeatX, repeatY);
}

/** Cozy striped anime duvet fabric texture for bedrooms! */
export function texBedFabric(baseHex = "#486a9c", stripeHex = "#d6e2f2"): THREE.CanvasTexture {
  return makeEnvTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = stripeHex;
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 6, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 5);
  }, 2, 2);
}

// ---------------------------------------------------------------------------
// 9 Painted 3D Cel-Anime Environment Builders
// ---------------------------------------------------------------------------

/** 1. Detailed Modern Anime Room / Living / Study Interior (Painted Wood Planks, Wainscoting, Window Sky, Desk, Shelf!) */
export function buildModernRoom(
  originX = 0,
  opts: { wallColor?: string; floorColor?: string; accentColor?: string; windowGlow?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const mFloor = celTex(texWoodPlanks(opts.floorColor ?? "#e6ba7e", "#c28d52", "#63361a", 4, 4));
  const mWall = celTex(texPlasterWall(opts.wallColor ?? "#f4ecdf", "#c8996a", "#66452e"));
  const mTrim = cel("#62422e");
  const mCounter = cel(opts.accentColor ?? "#3c4862");
  const mDeskWood = celTex(texWoodPlanks("#ecc58d", "#ca9a62", "#6f4a28", 2, 1));

  const floor = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 10.5), mFloor);
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.8, 0.35), mWall);
  backWall.position.set(0, 2.4, -3.2);
  backWall.receiveShadow = true;
  g.add(backWall);

  const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 10.5), mWall);
  sideWallL.position.set(-4.9, 2.4, 0);
  g.add(sideWallL);

  const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 10.5), mWall);
  sideWallR.position.set(4.9, 2.4, 0);
  g.add(sideWallR);

  // Framed anime window with painted clouds/rooftops sky + curtains!
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.85, 0.14), mTrim);
  winFrame.position.set(0.35, 2.32, -3.0);
  g.add(winFrame);
  const winPane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.40, 1.62),
    new THREE.MeshBasicMaterial({ map: texWindowSky("#5aa5ee", opts.windowGlow ?? "#d8eeff", false) })
  );
  winPane.position.set(0.35, 2.32, -2.92);
  winPane.layers.set(NOINK);
  g.add(winPane);
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.66, 0.16), mTrim);
  mullionV.position.set(0.35, 2.32, -2.95);
  g.add(mullionV);
  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.06, 0.16), mTrim);
  mullionH.position.set(0.35, 2.15, -2.95);
  g.add(mullionH);

  // Drawn linen curtains framing window
  const mCurtain = cel("#e8dfd2");
  for (const cx of [-0.92, 1.62]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.15, 10), mCurtain);
    c.position.set(cx, 2.25, -2.84);
    g.add(c);
  }

  // Soft diagonal morning sunbeam light shaft (NOINK additive subtle glow!)
  const beam = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 4.2),
    new THREE.MeshBasicMaterial({
      color: "#fff4d8",
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.position.set(0.35, 1.45, -1.5);
  beam.rotation.set(-0.48, 0.08, -0.18);
  beam.layers.set(NOINK);
  g.add(beam);

  // Wood-topped counter / study credenza on back-left
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.88, 0.92), mCounter);
  counter.position.set(-1.55, 0.44, -2.42);
  counter.castShadow = true;
  counter.receiveShadow = true;
  g.add(counter);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.08, 1.02), mDeskWood);
  counterTop.position.set(-1.55, 0.90, -2.42);
  g.add(counterTop);

  // Potted anime houseplant on right corner
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.34, 12), cel("#c26444"));
  pot.position.set(2.35, 0.17, -2.35);
  g.add(pot);
  const mPlant = celTex(texFoliage("#296838", "#429648", "#74c25e"));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mPlant);
    leaf.scale.set(0.7, 1.45, 0.45);
    leaf.position.set(2.35 + Math.cos(a) * 0.14, 0.56 + (i % 2) * 0.12, -2.35 + Math.sin(a) * 0.14);
    leaf.rotation.set(0.25 * Math.sin(a), a, -0.35 * Math.cos(a));
    g.add(leaf);
  }

  // Wall shelf + colorful books
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.34), mTrim);
  shelf.position.set(-2.45, 2.38, -2.84);
  g.add(shelf);
  const bookCols = ["#d64550", "#3a78c8", "#e8b43c", "#42a872", "#6848a8", "#e27840"];
  bookCols.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28 + (i % 3) * 0.05, 0.22), cel(c));
    b.position.set(-3.0 + i * 0.14, 2.56, -2.84);
    g.add(b);
  });

  return g;
}

/** 2. Authentic Anime Bedroom (Bed w/ Striped Duvet & Pillow, Alarm Clock, Study Desk & Lamp, Window & Poster!) */
export function buildBedroom(
  originX = 0,
  opts: { wallColor?: string; beddingColor?: string; isNight?: boolean } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const mFloor = celTex(texWoodPlanks("#e4b678", "#bf8a4e", "#603418", 4, 4));
  const mWall = celTex(texPlasterWall(opts.wallColor ?? "#f4ebdc", "#c49464", "#62432e"));
  const mWood = celTex(texWoodPlanks("#d9a76e", "#b27d48", "#5b371e", 2, 1));
  const mTrim = cel("#5e402c");

  const floor = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 10.5), mFloor);
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.8, 0.35), mWall);
  backWall.position.set(0, 2.4, -3.2);
  backWall.receiveShadow = true;
  g.add(backWall);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 10.5), mWall);
  sideL.position.set(-4.8, 2.4, 0);
  g.add(sideL);

  // Cozy Bedroom Bed on back-left (leaves center/right open for hero blocking!)
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.38, 1.35), mWood);
  bedFrame.position.set(-2.35, 0.22, -2.25);
  bedFrame.castShadow = true;
  g.add(bedFrame);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.12, 1.42), mWood);
  headboard.position.set(-3.38, 0.58, -2.25);
  g.add(headboard);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.24, 1.26), cel("#f5f2eb"));
  mattress.position.set(-2.35, 0.50, -2.25);
  g.add(mattress);
  const duvet = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.28, 1.30),
    celTex(texBedFabric(opts.beddingColor ?? "#42689c", "#dce8f8"))
  );
  duvet.position.set(-2.06, 0.54, -2.25);
  duvet.castShadow = true;
  g.add(duvet);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.68), cel("#fbf9f4"));
  pillow.position.set(-3.04, 0.68, -2.25);
  pillow.rotation.z = -0.14;
  g.add(pillow);

  // Nightstand + red glowing digital alarm clock
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.54), mWood);
  stand.position.set(-0.92, 0.29, -2.62);
  g.add(stand);
  const clockBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.10), cel("#282c36"));
  clockBody.position.set(-0.92, 0.64, -2.58);
  g.add(clockBody);
  const clockFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.06),
    new THREE.MeshBasicMaterial({ color: "#ff4a4a" })
  );
  clockFace.position.set(-0.92, 0.64, -2.525);
  clockFace.layers.set(NOINK);
  g.add(clockFace);

  // Study desk + warm desk lamp on back-right
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.88), mWood);
  deskTop.position.set(1.95, 0.78, -2.48);
  deskTop.castShadow = true;
  g.add(deskTop);
  for (const [lx, lz] of [[1.15, -2.84], [2.75, -2.84], [1.15, -2.12], [2.75, -2.12]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), mTrim);
    leg.position.set(lx, 0.39, lz);
    g.add(leg);
  }
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 10), cel("#2d3340"));
  lampBase.position.set(2.52, 0.84, -2.56);
  g.add(lampBase);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 8), cel("#4a5264"));
  lampStem.position.set(2.52, 1.06, -2.56);
  lampStem.rotation.z = 0.22;
  g.add(lampStem);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 12), cel("#d64e44"));
  lampShade.position.set(2.42, 1.28, -2.56);
  lampShade.rotation.z = 0.42;
  g.add(lampShade);

  // Framed window above desk/center-right
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.65, 0.14), mTrim);
  winFrame.position.set(1.45, 2.38, -3.0);
  g.add(winFrame);
  const winSky = new THREE.Mesh(
    new THREE.PlaneGeometry(2.04, 1.44),
    new THREE.MeshBasicMaterial({
      map: texWindowSky(opts.isNight ? "#0d1630" : "#56a4ee", opts.isNight ? "#1e2e58" : "#d8f0ff", Boolean(opts.isNight)),
    })
  );
  winSky.position.set(1.45, 2.38, -2.92);
  winSky.layers.set(NOINK);
  g.add(winSky);
  const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.48, 0.16), mTrim);
  mulV.position.set(1.45, 2.38, -2.95);
  g.add(mulV);

  // Framed wall poster above bed
  const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.48, 0.06), cel("#2c3242"));
  posterFrame.position.set(-1.95, 2.25, -3.0);
  g.add(posterFrame);
  const posterArt = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 1.36),
    celTex(texBlueprintBoard())
  );
  posterArt.position.set(-1.95, 2.25, -2.96);
  g.add(posterArt);

  // Woven bedroom rug under center stage
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.025, 2.2), cel("#c9b69a"));
  rug.position.set(0.15, 0.012, -0.35);
  rug.receiveShadow = true;
  g.add(rug);

  return g;
}

/** 3. Authentic Japanese Anime High-School Classroom (Chalkboard w/ Equations, Desks, School Clock, Sunlit Windows!) */
export function buildClassroom(
  originX = 0,
  opts: { wallColor?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const mFloor = celTex(texWoodPlanks("#c99c68", "#a47646", "#583c26", 5, 5));
  const mWall = celTex(texPlasterWall(opts.wallColor ?? "#f2ece0", "#c29c70", "#684d34"));
  const mTrim = cel("#5e432c");
  const mDeskWood = celTex(texWoodPlanks("#d7aa72", "#b4844e", "#6b4b2e", 1, 1));
  const mSteel = cel("#566070");

  const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 12), mFloor);
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 4.8, 0.35), mWall);
  backWall.position.set(0, 2.4, -3.4);
  backWall.receiveShadow = true;
  g.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 12), mWall);
  leftWall.position.set(-5.2, 2.4, 0);
  g.add(leftWall);

  // Iconic wide green Japanese chalkboard with painted chalk formulas!
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.85, 0.12), mTrim);
  boardFrame.position.set(0.35, 2.02, -3.18);
  g.add(boardFrame);
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(4.86, 1.64), celTex(texChalkboard()));
  boardFace.position.set(0.35, 2.02, -3.11);
  g.add(boardFace);
  // Chalk tray + eraser + chalk sticks
  const tray = new THREE.Mesh(new THREE.BoxGeometry(4.92, 0.08, 0.18), mTrim);
  tray.position.set(0.35, 1.12, -3.06);
  g.add(tray);
  const eraser = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.10), cel("#d97e42"));
  eraser.position.set(-0.65, 1.19, -3.04);
  g.add(eraser);

  // Round white anime school clock above chalkboard
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), cel("#323846"));
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(0.35, 3.36, -3.18);
  g.add(clockRim);
  const clockDial = new THREE.Mesh(new THREE.CircleGeometry(0.20, 20), new THREE.MeshBasicMaterial({ color: "#fafaf6" }));
  clockDial.position.set(0.35, 3.36, -3.14);
  clockDial.layers.set(NOINK);
  g.add(clockDial);
  const handH = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.02), cel("#1a1c22"));
  handH.position.set(0.35, 3.40, -3.13);
  g.add(handH);
  const handM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), cel("#1a1c22"));
  handM.position.set(0.41, 3.36, -3.13);
  g.add(handM);

  // Tall sunlit classroom windows on left wall
  for (const wz of [-1.4, 1.4]) {
    const wf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.25, 2.2), mTrim);
    wf.position.set(-4.98, 2.25, wz);
    g.add(wf);
    const wp = new THREE.Mesh(
      new THREE.PlaneGeometry(2.02, 2.04),
      new THREE.MeshBasicMaterial({ map: texWindowSky("#5ea8f0", "#dcf2ff", false) })
    );
    wp.rotation.y = Math.PI / 2;
    wp.position.set(-4.89, 2.25, wz);
    wp.layers.set(NOINK);
    g.add(wp);
  }

  // Teacher podium on far-left back (keeps center & right chalkboard totally clear for character staging!)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.62), mDeskWood);
  podium.position.set(-2.35, 0.52, -2.25);
  podium.castShadow = true;
  g.add(podium);

  // Japanese student desks & steel-frame chairs flanking foreground sides (clean center lane for camera!)
  const deskCoords: [number, number][] = [[-2.15, 0.75], [2.15, 0.75], [-2.15, -0.65], [2.15, -0.65]];
  for (const [dx, dz] of deskCoords) {
    const dg = new THREE.Group();
    dg.position.set(dx, 0, dz);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.64), mDeskWood);
    top.position.y = 0.74;
    top.castShadow = true;
    dg.add(top);
    const cubby = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.52), mSteel);
    cubby.position.y = 0.64;
    dg.add(cubby);
    for (const [lx, lz] of [[-0.40, -0.26], [0.40, -0.26], [-0.40, 0.26], [0.40, 0.26]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), mSteel);
      leg.position.set(lx, 0.36, lz);
      dg.add(leg);
    }
    // Student chair tucked behind desk
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), mDeskWood);
    seat.position.set(0, 0.44, 0.46);
    dg.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.04), mDeskWood);
    back.position.set(0, 0.76, 0.66);
    dg.add(back);
    g.add(dg);
  }

  return g;
}

/** 4. Authentic Anime Science Lab / Invention Workshop (Wood Workbench, Blueprint Board, Glassware Rack, Shelves!) */
export function buildScienceLab(
  originX = 0,
  opts: { wallColor?: string; liquidA?: string; liquidB?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const mFloor = celTex(texWoodPlanks("#a87b52", "#7d5838", "#3d2818", 4, 4));
  const mWall = celTex(texPlasterWall(opts.wallColor ?? "#e8dfd0", "#8d6646", "#4c3525"));
  const mBenchWood = celTex(texWoodPlanks("#b5804c", "#8a5c32", "#472c18", 2, 1));
  const mDarkWood = cel("#4d3524");
  const mGlass = new THREE.MeshLambertMaterial({ color: "#dcf4ff", transparent: true, opacity: 0.58 });
  const mLiqA = new THREE.MeshBasicMaterial({ color: opts.liquidA ?? "#48d688" });
  const mLiqB = new THREE.MeshBasicMaterial({ color: opts.liquidB ?? "#f5b842" });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 11), mFloor);
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(11, 4.8, 0.35), mWall);
  backWall.position.set(0, 2.4, -3.2);
  backWall.receiveShadow = true;
  g.add(backWall);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 11), mWall);
  sideL.position.set(-4.9, 2.4, 0);
  g.add(sideL);

  // Large pinned blueprint & schematic board on back wall (high & wide for clear readability!)
  const bpFrame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 2.05, 0.10), mDarkWood);
  bpFrame.position.set(-0.35, 2.38, -2.98);
  g.add(bpFrame);
  const bpFace = new THREE.Mesh(new THREE.PlaneGeometry(3.26, 1.88), celTex(texBlueprintBoard()));
  bpFace.position.set(-0.35, 2.38, -2.92);
  g.add(bpFace);

  // Heavy wooden workshop lab bench along back wall
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 1.08), mBenchWood);
  benchTop.position.set(0.1, 0.94, -2.28);
  benchTop.castShadow = true;
  benchTop.receiveShadow = true;
  g.add(benchTop);
  const benchBody = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.88, 0.94), cel("#4a423c"));
  benchBody.position.set(0.1, 0.44, -2.28);
  benchBody.castShadow = true;
  g.add(benchBody);

  // Glass Erlenmeyer flasks + reagent jars + copper coil apparatus on workbench
  const flaskSpecs: [number, number, THREE.Material][] = [
    [-1.45, -2.18, mLiqA],
    [-1.08, -2.35, mLiqB],
    [1.32, -2.16, mLiqA],
    [1.68, -2.32, mLiqB],
  ];
  for (const [fx, fz, lMat] of flaskSpecs) {
    const bulb = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 14), mGlass);
    bulb.position.set(fx, 1.12, fz);
    g.add(bulb);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.14, 12), mGlass);
    neck.position.set(fx, 1.28, fz);
    g.add(neck);
    const liq = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.11, 14), lMat);
    liq.position.set(fx, 1.07, fz);
    liq.layers.set(NOINK);
    g.add(liq);
  }

  // Test-tube wooden rack on workbench right
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.14), mDarkWood);
  rack.position.set(0.85, 1.09, -2.38);
  g.add(rack);
  for (let i = 0; i < 4; i++) {
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 10), mGlass);
    tt.position.set(0.67 + i * 0.12, 1.18, -2.38);
    g.add(tt);
  }

  // Copper coil / battery experiment on left side of bench
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 16), cel("#c97342"));
  coil.position.set(-0.52, 1.13, -2.24);
  g.add(coil);

  // Reagent shelf & glass bottles on back-right wall
  for (const sy of [1.95, 2.65]) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 0.34), mDarkWood);
    sh.position.set(2.55, sy, -2.84);
    g.add(sh);
    for (let i = 0; i < 5; i++) {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.08, 0.24 + (i % 2) * 0.08, 10),
        cel(["#4886b8", "#c95848", "#d4a644", "#4ea86a", "#8668a8"][i])
      );
      jar.position.set(1.92 + i * 0.31, sy + 0.16, -2.84);
      g.add(jar);
    }
  }

  // Hanging vintage green-enamel workshop pendant lamp overhead
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), cel("#22242a"));
  cord.position.set(0.1, 4.1, -1.8);
  g.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.20, 16), cel("#2f6848"));
  shade.position.set(0.1, 3.38, -1.8);
  g.add(shade);
  const bulbGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshBasicMaterial({ color: "#fff2c6" })
  );
  bulbGlow.position.set(0.1, 3.26, -1.8);
  bulbGlow.layers.set(NOINK);
  g.add(bulbGlow);

  return g;
}

/** 5. Authentic Anime Outdoor School Athletic Running Track & PE Field (Clay Track, Grass Infield, Bleachers, School!) */
export function buildSchoolTrackGym(
  originX = 0,
  opts: { schoolWallColor?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  // Foreground red clay running track with painted white lane lines!
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.4, 7.6),
    celTex(texRunningTrack(5, 1))
  );
  track.position.set(0, -0.2, 0.2);
  track.receiveShadow = true;
  g.add(track);

  // Crisp white chalk finish / start stripe across track
  const startLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 7.4), cel("#f8f6f0"));
  startLine.position.set(0.8, 0.01, 0.2);
  g.add(startLine);

  // Lush painted athletic grass infield beyond track
  const infield = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.36, 22),
    celTex(texAnimeGrass("#5ea04a", "#3c7634", "#8ac65c", 6, 5))
  );
  infield.position.set(0, -0.21, -14.2);
  infield.receiveShadow = true;
  g.add(infield);

  // Silver aluminum 3-tier school bleachers on back-left
  const mMetal = cel("#b4bcc8");
  const mRail = cel("#5a6474");
  for (let tier = 0; tier < 3; tier++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 0.56), mMetal);
    bench.position.set(-4.2, 0.42 + tier * 0.44, -5.6 - tier * 0.62);
    bench.castShadow = true;
    g.add(bench);
    const support = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.36 + tier * 0.42, 0.12), mRail);
    support.position.set(-4.2, (0.36 + tier * 0.42) * 0.5, -5.6 - tier * 0.62);
    g.add(support);
  }

  // Chain-link fence posts & rails along back perimeter
  const mFence = cel("#5e6a74");
  for (let fx = -10; fx <= 10; fx += 2.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), mFence);
    post.position.set(fx, 1.2, -9.8);
    g.add(post);
  }
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.06, 0.06), mFence);
  topBar.position.set(0, 2.38, -9.8);
  g.add(topBar);
  const midBar = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.05, 0.05), mFence);
  midBar.position.set(0, 1.2, -9.8);
  g.add(midBar);

  // Classic Japanese high-school main building rising in background
  const school = new THREE.Mesh(
    new THREE.BoxGeometry(18.5, 8.6, 5.4),
    celTex(texBuildingFacade(opts.schoolWallColor ?? "#e6dfd4", false))
  );
  school.position.set(2.2, 4.3, -15.5);
  school.castShadow = true;
  g.add(school);
  const roofLip = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.36, 5.8), cel("#8c929e"));
  roofLip.position.set(2.2, 8.72, -15.5);
  g.add(roofLip);

  // Background painted trees flanking the school yard
  const mTrunk = celTex(texTreeBark());
  const mLeaf = celTex(texFoliage("#2f743b", "#4ca04f", "#80ca68"));
  for (const [tx, tz, sc] of [[-8.2, -11.4, 1.25], [8.8, -11.2, 1.3], [-5.2, -12.6, 1.1]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sc, 0.28 * sc, 2.8 * sc, 9), mTrunk);
    tr.position.set(tx, 1.4 * sc, tz);
    g.add(tr);
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45 * sc, 2), mLeaf);
    lf.position.set(tx, 3.4 * sc, tz);
    lf.scale.set(1.2, 0.88, 1.1);
    g.add(lf);
  }

  g.add(buildCelClouds(0, 6, "#fffcf6"));
  return g;
}

/** 6. Stylized Tokyo / Shonen City Street (Textured Asphalt + Crosswalk + Tiled Sidewalks + Detailed Window Facades + Utility Poles!) */
export function buildCityStreet(
  originX = 0,
  opts: { roadColor?: string; nightWindows?: boolean; accentGlow?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.4, 28),
    celTex(texAsphaltRoad(opts.roadColor ?? "#3a3f4e", 2, 4))
  );
  road.position.set(0, -0.2, -4);
  road.receiveShadow = true;
  g.add(road);

  // Crisp painted crosswalk stripes
  const mStripe = cel("#ece9df");
  for (let i = -3; i <= 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 2.2), mStripe);
    s.position.set(i * 0.95, 0.01, -1.6);
    g.add(s);
  }

  // Tiled concrete sidewalks + curb strips
  const mWalk = celTex(texSidewalkTiles(2, 12));
  const mCurb = cel("#767a86");
  for (const sx of [-6.2, 6.2]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 28), mWalk);
    w.position.set(sx, 0.06, -4);
    w.receiveShadow = true;
    g.add(w);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 28), mCurb);
    curb.position.set(sx + (sx < 0 ? 2.1 : -2.1), 0.07, -4);
    g.add(curb);
  }

  // Detailed multi-pane painted anime buildings lining both sides + skyline
  const bSpecs: [number, number, number, number, number, string][] = [
    [-7.2, -4.5, 4.4, 11.5, 5.2, "#c8beb4"],
    [-7.6, -11.5, 4.8, 15.0, 5.8, "#8e99ad"],
    [7.2, -4.8, 4.6, 12.8, 5.2, "#b4bcc8"],
    [7.6, -12.0, 5.0, 17.0, 5.6, "#7b8298"],
    [-2.4, -17.0, 4.6, 19.0, 4.6, "#667088"],
    [2.8, -18.5, 5.2, 22.0, 4.8, "#58627a"],
  ];

  bSpecs.forEach(([x, z, bw, bh, bd, col]) => {
    const mat = celTex(texBuildingFacade(col, Boolean(opts.nightWindows), opts.accentGlow ?? "#ffda82"));
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    m.position.set(x, bh * 0.5, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // Roof cornice ledge & rooftop unit
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.26, 0.34, bd + 0.26), cel("#4a5060"));
    cornice.position.set(x, bh + 0.14, z);
    g.add(cornice);
  });

  // Japanese streetlights + overhead power crossarms
  const mPole = cel("#2c303a");
  const mLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff0c4").multiplyScalar(2.0) });
  for (const [px, pz] of [[-4.3, -2.8], [4.3, -6.2], [-4.3, -10.0]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.9, 10), mPole);
    pole.position.set(px, 2.45, pz);
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.08), mPole);
    arm.position.set(px + (px < 0 ? 0.52 : -0.52), 4.82, pz);
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mLamp);
    lamp.position.set(px + (px < 0 ? 0.98 : -0.98), 4.72, pz);
    lamp.layers.set(NOINK);
    g.add(lamp);
  }
  return g;
}

/** 7. Shattered Anime Battlefield / Wasteland Crater (Stratified Rock Texture + Mesa Pillars + Rubble!) */
export function buildBattlefieldCrater(
  originX = 0,
  opts: { groundColor?: string; rockColor?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 17, 0.4, 32),
    celTex(texCraterRock(opts.groundColor ?? "#8a7868", "#3b2f28", 5, 5))
  );
  ground.position.set(0, -0.2, -2);
  ground.receiveShadow = true;
  g.add(ground);

  const mRock = celTex(texCraterRock(opts.rockColor ?? "#645850", "#2d2420", 2, 3));
  const pillars: [number, number, number, number, number][] = [
    [-6.2, -9.5, 1.8, 7.2, 0.14],
    [-3.6, -12.5, 1.5, 9.4, -0.10],
    [4.2, -11.5, 1.7, 8.6, 0.12],
    [6.8, -8.8, 2.0, 6.4, -0.15],
  ];
  for (const [px, pz, pr, ph, tilt] of pillars) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(pr, ph, 7), mRock);
    p.position.set(px, ph * 0.45, pz);
    p.rotation.z = tilt;
    p.castShadow = true;
    g.add(p);
  }

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rad = 4.2 + (i % 3) * 1.4;
    if (Math.sin(a) > 0.65) continue;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + (i % 4) * 0.22, 0), mRock);
    b.position.set(Math.cos(a) * rad, 0.22, Math.sin(a) * rad - 1.5);
    b.scale.set(1.3, 0.75, 1.0);
    b.rotation.set(i * 0.5, i * 1.1, i * 0.3);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

/** 8. Lush Painted Anime Forest / Stone-World Grove (Textured Meadow, Inked Bark, Painterly Canopies, Mountain Backdrop!) */
export function buildForestGrove(
  originX = 0,
  opts: { grassColor?: string; foliageA?: string; foliageB?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.4, 36),
    celTex(texAnimeGrass(opts.grassColor ?? "#63a34d", "#3d7a36", "#95cc62", 7, 7))
  );
  grass.position.set(0, -0.2, -2);
  grass.receiveShadow = true;
  g.add(grass);

  // Winding earthy footpath leading into the clearing
  const pathMat = celTex(texCraterRock("#b59670", "#7c6142", 2, 4));
  const trail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.03, 14), pathMat);
  trail.position.set(0.2, 0.015, -3.5);
  trail.rotation.y = 0.08;
  trail.receiveShadow = true;
  g.add(trail);

  const mTrunk = celTex(texTreeBark("#6c4a32"));
  const mLeafA = celTex(texFoliage("#276434", opts.foliageA ?? "#3c8e4a", "#74c25e"));
  const mLeafB = celTex(texFoliage("#357a3c", opts.foliageB ?? "#58b058", "#98d66e"));
  const mBoulder = celTex(texCraterRock("#7e8480", "#454c48", 2, 2));

  const trees: [number, number, number][] = [
    [-4.6, -4.8, 1.1], [-2.8, -8.5, 1.35], [0.4, -10.8, 1.45],
    [3.4, -8.2, 1.25], [4.9, -4.6, 1.05], [-6.8, -7.2, 1.3], [6.6, -7.5, 1.25],
  ];
  trees.forEach(([tx, tz, sc], i) => {
    const tr = new THREE.Group();
    tr.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * sc, 0.32 * sc, 3.5 * sc, 10), mTrunk);
    trunk.position.y = 1.75 * sc;
    trunk.rotation.z = (i % 2 ? 0.05 : -0.05);
    trunk.castShadow = true;
    tr.add(trunk);

    // 3 overlapping painterly foliage lobes for lush organic anime canopy silhouette!
    const lobes: [number, number, number, number, THREE.Material][] = [
      [0, 3.85 * sc, 0, 1.38 * sc, i % 2 ? mLeafA : mLeafB],
      [0.72 * sc, 3.25 * sc, 0.35 * sc, 0.98 * sc, i % 2 ? mLeafB : mLeafA],
      [-0.68 * sc, 3.35 * sc, -0.25 * sc, 0.94 * sc, i % 2 ? mLeafA : mLeafB],
    ];
    for (const [lx, ly, lz, lr, lm] of lobes) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(lr, 2), lm);
      c.position.set(lx, ly, lz);
      c.scale.set(1.18, 0.88, 1.12);
      c.castShadow = true;
      tr.add(c);
    }
    g.add(tr);
  });

  // Mossy boulders & background alpine ridge silhouettes for deep Ghibli/Dr. STONE horizon!
  for (const [bx, bz, bs] of [[-3.1, -3.2, 0.55], [3.5, -3.6, 0.68], [-1.8, -6.4, 0.72]]) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(bs, 1), mBoulder);
    r.position.set(bx, bs * 0.42, bz);
    r.scale.set(1.3, 0.72, 1.0);
    r.castShadow = true;
    g.add(r);
  }
  const mMountainFar = cel("#6288a4");
  for (const [mx, mz, mr, mh] of [[-14, -36, 14, 15], [0, -40, 18, 19], [16, -35, 15, 16]]) {
    const mt = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 6), mMountainFar);
    mt.position.set(mx, mh * 0.42, mz);
    mt.layers.set(NOINK);
    g.add(mt);
  }

  g.add(buildCelClouds(0, 6, "#fffcf5"));
  return g;
}

/** 9. Dramatic Anime Cosmic Void / Mindscape / Domain Realm (ONLY for supernatural/cosmic episodes!) */
export function buildCosmicRealm(
  originX = 0,
  opts: { floorColor?: string; gridColor?: string; accentHex?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.4, 36),
    celTex(texCraterRock(opts.floorColor ?? "#160e2e", "#080412", 4, 4))
  );
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const grid = new THREE.GridHelper(32, 32, opts.accentHex ?? "#7832e8", opts.gridColor ?? "#26144a");
  grid.position.y = 0.02;
  grid.layers.set(NOINK);
  g.add(grid);

  const mObsidian = celTex(texCraterRock("#22193c", "#0c081a", 1, 3));
  const mGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.accentHex ?? "#8c38ff").multiplyScalar(2.4) });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 1.45 - Math.PI * 1.22;
    const rr = 6.5 + (i % 3) * 2.2;
    const h = 3.2 + (i % 4) * 1.8;
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.85, h, 0.85), mObsidian);
    mon.position.set(Math.cos(a) * rr, h * 0.45 + (i % 2) * 0.9, Math.sin(a) * rr);
    mon.rotation.set(0.08 * (i % 3 - 1), a, 0.12 * (i % 2 ? 1 : -1));
    g.add(mon);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), mGlow);
    band.position.copy(mon.position);
    band.rotation.copy(mon.rotation);
    band.layers.set(NOINK);
    g.add(band);
  }
  return g;
}

/** 10. True 3-Tone Cauliflower Anime Sky Clouds (mromidev textures.md 3.13: sunlit cream crown, soft mid puffs, lavender/violet underside!) */
export function buildCelClouds(
  originX = 0,
  count = 8,
  color = "#fbf8f1",
  mood: "day" | "golden" = "day"
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);
  const topHex = mood === "golden" ? "#ffd8ae" : color;
  const midHex = mood === "golden" ? "#f2a290" : "#e0e6f6";
  const underHex = mood === "golden" ? "#9d82c2" : "#b2bfe9";
  const matTop = new THREE.MeshBasicMaterial({ color: topHex });
  const matMid = new THREE.MeshBasicMaterial({ color: midHex });
  const matUnder = new THREE.MeshBasicMaterial({ color: underHex });

  for (let i = 0; i < count; i++) {
    const cl = new THREE.Group();
    const ang = -Math.PI * 0.82 + (i / Math.max(1, count - 1)) * Math.PI * 0.64;
    const dist = 36 + (i % 3) * 14;
    cl.position.set(Math.cos(ang) * dist, 10 + (i % 4) * 3.5, Math.sin(ang) * dist);

    // Flat cool lavender/violet underside shelf (gives crisp animated sky weight!)
    const base = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), matUnder);
    base.position.set(0, -0.62, 0);
    base.scale.set(2.55, 0.42, 0.85);
    base.layers.set(NOINK);
    cl.add(base);

    // Mid-tone cauliflower transition puffs
    for (let m = 0; m < 3; m++) {
      const mp = new THREE.Mesh(new THREE.SphereGeometry(1.95 + (m === 1 ? 0.55 : 0), 12, 10), matMid);
      mp.position.set((m - 1) * 1.95, -0.14 + (m === 1 ? 0.22 : 0), 0.18);
      mp.scale.set(1.42, 0.66, 0.88);
      mp.layers.set(NOINK);
      cl.add(mp);
    }

    // Bright sunlit cream/peach upper billow crowns
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.85 + (k === 1 ? 1.05 : 0.22), 12, 10), matTop);
      puff.position.set((k - 1.5) * 1.75, 0.25 + (k % 2) * 0.65, (k % 3 - 1) * 0.42);
      puff.scale.set(1.36, 0.72, 0.86);
      puff.layers.set(NOINK);
      cl.add(puff);
    }
    g.add(cl);
  }
  return g;
}

/** 11. Crisp HDR Starfield Dome (for Space / Night / Cosmic Void realms!) */
export function buildStarfield(originX = 0, count = 320, radius = 95): THREE.Points {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = hash01(i * 3 + 1) * Math.PI * 2;
    const v = Math.acos(2 * hash01(i * 3 + 2) - 1);
    const r = radius * (0.75 + hash01(i * 3 + 3) * 0.35);
    pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
    pos[i * 3 + 1] = Math.abs(Math.cos(v) * r) + 4;
    pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: new THREE.Color(1.8, 1.9, 2.4), size: 0.65, sizeAttenuation: true })
  );
  pts.position.set(originX, 0, 0);
  pts.layers.set(NOINK);
  return pts;
}
