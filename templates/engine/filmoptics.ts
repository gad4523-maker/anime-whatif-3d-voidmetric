// Voidmetric v4.1 Clean-Room 35mm Optical Finishing & Space-Refraction Shockwave Post-Processing Effect
// Put LAST in EffectComposer (after GradeEffect, replacing standalone GrainEffect).
// Operates in display-referred sRGB space and decodes back to linear for EffectComposer output:
//   1. Ragged Space-Refraction Shockwave Ring (optional per-frame radial UV warp + crest R/B split)
//   2. Radial Corner Chromatic Aberration (zero shift at screen center so faces/eyes stay tack-sharp!)
//   3. Warm 3-Scale 35mm Film Halation (tight/medium/wide highlight scatter with amber celluloid tint)
//   4. Subtle Black-Floor Lift + C1 Tanh Highlight Shoulder Roll-Off (silky highlights, zero digital clip!)
//   5. Luminance-Enveloped Deterministic PCG Film Grain (resolution-independent across 540p/1080p/1440p)
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import { Color, Uniform, Vector2 } from "three";

export type FilmOpticsOpts = {
  halationAmount?: number;
  halationTint?: string;
  halationThreshold?: number;
  cornerCA?: number;
  blackLift?: number;
  shoulderKnee?: number;
  shoulderCeil?: number;
  grainAmount?: number;
  grainCellPx?: number;
};

export type ShockwaveState = {
  /** Normalized screen center [0..1, 0..1] (default [0.5, 0.5]) */
  center: [number, number];
  /** Current ring radius in viewport-height units (0..1.4) */
  radius: number;
  /** Ring wave thickness in viewport-height units (e.g. 0.04..0.10) */
  width: number;
  /** UV refraction amplitude (0 = inactive; typical peak 0.012..0.032) */
  amp: number;
  /** Chromatic dispersion along the shockwave ring in 1080p px (default 3.0) */
  ca?: number;
  /** Angular raggedness factor (0..0.25, default 0.10) */
  rag?: number;
  /** Deterministic noise seed */
  seed?: number;
};

const frag = /* glsl */ `
uniform float uSeed;
uniform float uHalationAmt;
uniform vec3 uHalationTint;
uniform float uHalationThresh;
uniform float uCornerCA;
uniform float uBlackLift;
uniform float uShoulderKnee;
uniform float uShoulderCeil;
uniform float uGrainAmt;
uniform float uGrainCellPx;

uniform vec2 uShockCenter;
uniform float uShockRadius;
uniform float uShockWidth;
uniform float uShockAmp;
uniform float uShockCA;
uniform float uShockRag;
uniform float uShockSeed;

vec3 foEncode(vec3 c) {
  c = clamp(c, 0.0, 1.5);
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 foDecode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 foTanh(vec3 x) {
  vec3 cx = clamp(x, vec3(-8.0), vec3(8.0));
  vec3 e2 = exp(2.0 * cx);
  return (e2 - 1.0) / (e2 + 1.0);
}
uint foPcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float foHash(ivec2 c, uint k) {
  return float(foPcg(uint(c.x) + foPcg(uint(c.y) + foPcg(k)))) * (1.0 / 4294967295.0) - 0.5;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float resScale = resolution.y / 1920.0;
  float aspect = resolution.x / max(resolution.y, 1.0);

  // 1. Optional Ragged Space-Refraction Shockwave Ring
  vec2 sampleUv = uv;
  vec2 shockCaOffset = vec2(0.0);
  if (uShockAmp > 0.0004) {
    vec2 diff = (uv - uShockCenter) * vec2(aspect, 1.0);
    float dist = length(diff) + 1e-4;
    vec2 dir = diff / dist;
    float ang = atan(diff.y, diff.x);
    float angN = sin(ang * 3.0 + uShockSeed * 1.3) * 0.55
               + cos(ang * 7.0 - uShockSeed * 2.1) * 0.30
               + sin(ang * 13.0 + uShockSeed * 0.7) * 0.15;
    float rr = uShockRadius * (1.0 + uShockRag * angN);
    float u = (dist - rr) / max(uShockWidth, 0.003);
    float env = exp(-u * u);
    float disp = env * sin(u * 2.6) * uShockAmp;
    vec2 uvDir = vec2(dir.x / max(aspect, 0.1), dir.y);
    sampleUv = clamp(uv + uvDir * disp, vec2(0.001), vec2(0.999));
    shockCaOffset = uvDir * env * uShockCA * resScale * texelSize.y;
  }

  // 2. Radial Corner Chromatic Aberration (zero shift at screen center so faces stay tack-sharp!)
  vec2 p = sampleUv - 0.5;
  float r2 = dot(p * 2.0, p * 2.0);
  vec2 caShift = p * (uCornerCA * 0.00065 * r2) + shockCaOffset;
  vec2 uvR = clamp(sampleUv + caShift, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp(sampleUv - caShift, vec2(0.001), vec2(0.999));

  vec3 linCol = vec3(
    texture2D(inputBuffer, uvR).r,
    texture2D(inputBuffer, sampleUv).g,
    texture2D(inputBuffer, uvB).b
  );
  vec3 c = foEncode(linCol);

  // 3. Warm 3-Scale 35mm Film Halation (tight / medium / wide golden-angle highlight scatter)
  if (uHalationAmt > 0.001) {
    vec3 halAcc = vec3(0.0);
    const float GOLDEN = 2.39996323;
    float radii[3];
    radii[0] = 6.5 * resScale;
    radii[1] = 21.0 * resScale;
    radii[2] = 52.0 * resScale;
    float weights[3];
    weights[0] = 0.42;
    weights[1] = 0.34;
    weights[2] = 0.24;
    for (int ring = 0; ring < 3; ring++) {
      vec3 ringSum = vec3(0.0);
      float rad = radii[ring];
      for (int i = 0; i < 8; i++) {
        float a = float(i) * (6.2831853 / 8.0) + float(ring) * GOLDEN;
        vec2 suv = clamp(sampleUv + vec2(cos(a), sin(a)) * rad * texelSize, vec2(0.001), vec2(0.999));
        vec3 sc = foEncode(texture2D(inputBuffer, suv).rgb);
        float sl = dot(sc, LUMA);
        float hiMask = clamp((sl - uHalationThresh) / max(0.08, 1.0 - uHalationThresh), 0.0, 1.5);
        ringSum += sc * hiMask;
      }
      halAcc += (ringSum / 8.0) * weights[ring];
    }
    vec3 hal = clamp(halAcc * uHalationTint * uHalationAmt, 0.0, 0.92);
    c = 1.0 - (1.0 - min(c, vec3(1.22))) * (1.0 - hal);
  }

  // 4. Subtle Black-Floor Lift + C1 Tanh Highlight Shoulder Roll-Off
  c = uBlackLift + c * (1.0 - uBlackLift);
  float span = max(0.02, uShoulderCeil - uShoulderKnee);
  vec3 over = max(c - vec3(uShoulderKnee), vec3(0.0));
  vec3 rolled = vec3(uShoulderKnee) + span * foTanh(over / span);
  c = mix(c, rolled, step(vec3(uShoulderKnee), c));

  // 5. Luminance-Enveloped Deterministic PCG Film Grain
  if (uGrainAmt > 0.0002) {
    vec2 gp = uv * resolution / max(0.5, uGrainCellPx * resScale);
    ivec2 gi = ivec2(floor(gp));
    vec2 gf = fract(gp);
    gf = gf * gf * (3.0 - 2.0 * gf);
    uint k = uint(uSeed + 0.5) * 2654435761u + 1013904223u;
    float n = mix(
      mix(foHash(gi, k), foHash(gi + ivec2(1, 0), k), gf.x),
      mix(foHash(gi + ivec2(0, 1), k), foHash(gi + ivec2(1, 1), k), gf.x),
      gf.y
    );
    float l = clamp(dot(c, LUMA), 0.0, 1.0);
    float env = clamp(1.10 - 0.92 * pow(l, 1.55), 0.14, 1.10);
    c = clamp(c + (n * (uGrainAmt / 0.2145) * env), 0.0, 1.0);
  }

  outputColor = vec4(foDecode(c), inputColor.a);
}`;

export class FilmOpticsEffect extends Effect {
  constructor(opts: FilmOpticsOpts = {}) {
    super("FilmOpticsEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["uSeed", new Uniform(0)],
        ["uHalationAmt", new Uniform(opts.halationAmount ?? 0.20)],
        ["uHalationTint", new Uniform(new Color(opts.halationTint ?? "#ffdfc2"))],
        ["uHalationThresh", new Uniform(opts.halationThreshold ?? 0.72)],
        ["uCornerCA", new Uniform(opts.cornerCA ?? 0.85)],
        ["uBlackLift", new Uniform(opts.blackLift ?? 0.012)],
        ["uShoulderKnee", new Uniform(opts.shoulderKnee ?? 0.82)],
        ["uShoulderCeil", new Uniform(opts.shoulderCeil ?? 0.975)],
        ["uGrainAmt", new Uniform(opts.grainAmount ?? 0.014)],
        ["uGrainCellPx", new Uniform(opts.grainCellPx ?? 1.5)],
        ["uShockCenter", new Uniform(new Vector2(0.5, 0.5))],
        ["uShockRadius", new Uniform(0.25)],
        ["uShockWidth", new Uniform(0.055)],
        ["uShockAmp", new Uniform(0.0)],
        ["uShockCA", new Uniform(3.2)],
        ["uShockRag", new Uniform(0.10)],
        ["uShockSeed", new Uniform(0.0)],
      ]),
    });
  }

  set seed(v: number) { this.uniforms.get("uSeed")!.value = v; }
  set halationAmount(v: number) { this.uniforms.get("uHalationAmt")!.value = v; }
  set cornerCA(v: number) { this.uniforms.get("uCornerCA")!.value = v; }
  set grainAmount(v: number) { this.uniforms.get("uGrainAmt")!.value = v; }

  /** Activate or clear the per-frame ragged space-refraction shockwave ring! */
  setShockwave(st: ShockwaveState | null) {
    if (!st || st.amp <= 0.0004) {
      this.uniforms.get("uShockAmp")!.value = 0.0;
      return;
    }
    (this.uniforms.get("uShockCenter")!.value as Vector2).set(st.center[0], st.center[1]);
    this.uniforms.get("uShockRadius")!.value = st.radius;
    this.uniforms.get("uShockWidth")!.value = st.width;
    this.uniforms.get("uShockAmp")!.value = st.amp;
    this.uniforms.get("uShockCA")!.value = st.ca ?? 3.2;
    this.uniforms.get("uShockRag")!.value = st.rag ?? 0.10;
    this.uniforms.get("uShockSeed")!.value = st.seed ?? 0.0;
  }
}
