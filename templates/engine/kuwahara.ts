// Voidmetric v4.2 Clean-Room Anisotropic Kuwahara Painterly Post-Processing Effect
// Inspired by Maxime Heckel & cortiz2894/stylized-components: computes local edge structure tensor
// and blends 4 oriented directional quadrants weighted by inverse variance -> crisp hand-painted Ghibli/gouache
// brushwork while keeping character/building edges sharp!
// Default strength = 0.0 (bypassed at zero visual alteration); dial to 0.35..0.85 for painterly/flashback shots!
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import { Uniform } from "three";

const frag = /* glsl */ `
uniform float uStrength;
uniform float uRadius;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uStrength <= 0.005) {
    outputColor = inputColor;
    return;
  }
  float resScale = resolution.y / 1920.0;
  vec2 stepUv = texelSize * max(0.75, uRadius * resScale * 0.45);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  // Sobel gradient structure tensor for brush-stroke orientation
  float tl = dot(texture2D(inputBuffer, uv + vec2(-stepUv.x,  stepUv.y)).rgb, LUMA);
  float t  = dot(texture2D(inputBuffer, uv + vec2(0.0,        stepUv.y)).rgb, LUMA);
  float tr = dot(texture2D(inputBuffer, uv + vec2( stepUv.x,  stepUv.y)).rgb, LUMA);
  float l  = dot(texture2D(inputBuffer, uv + vec2(-stepUv.x,  0.0)).rgb, LUMA);
  float r  = dot(texture2D(inputBuffer, uv + vec2( stepUv.x,  0.0)).rgb, LUMA);
  float bl = dot(texture2D(inputBuffer, uv + vec2(-stepUv.x, -stepUv.y)).rgb, LUMA);
  float b  = dot(texture2D(inputBuffer, uv + vec2(0.0,       -stepUv.y)).rgb, LUMA);
  float br = dot(texture2D(inputBuffer, uv + vec2( stepUv.x, -stepUv.y)).rgb, LUMA);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float ang = atan(gy, gx) + 1.5707963;
  float ca = cos(ang), sa = sin(ang);
  mat2 rot = mat2(ca, -sa, sa, ca);

  vec3 mean[4];
  vec3 sq[4];
  for (int q = 0; q < 4; q++) { mean[q] = vec3(0.0); sq[q] = vec3(0.0); }

  vec2 dirs[4];
  dirs[0] = vec2( 1.0,  1.0);
  dirs[1] = vec2(-1.0,  1.0);
  dirs[2] = vec2(-1.0, -1.0);
  dirs[3] = vec2( 1.0, -1.0);

  for (int q = 0; q < 4; q++) {
    for (int i = 0; i <= 2; i++) {
      for (int j = 0; j <= 2; j++) {
        // Anisotropic stretch along edge tangent (1.45x along brush, 0.72x across edge)
        vec2 off = rot * (vec2(float(i) * 1.45, float(j) * 0.72) * dirs[q]) * stepUv;
        vec3 s = texture2D(inputBuffer, clamp(uv + off, vec2(0.001), vec2(0.999))).rgb;
        mean[q] += s;
        sq[q] += s * s;
      }
    }
    mean[q] /= 9.0;
    sq[q] = abs(sq[q] / 9.0 - mean[q] * mean[q]);
  }

  vec3 bestCol = inputColor.rgb;
  float minVar = 1e9;
  for (int q = 0; q < 4; q++) {
    float v = sq[q].r + sq[q].g + sq[q].b;
    if (v < minVar) {
      minVar = v;
      bestCol = mean[q];
    }
  }
  outputColor = vec4(mix(inputColor.rgb, bestCol, clamp(uStrength, 0.0, 1.0)), inputColor.a);
}`;

export class KuwaharaEffect extends Effect {
  constructor({ strength = 0.0, radius = 3.0 }: { strength?: number; radius?: number } = {}) {
    super("KuwaharaEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["uStrength", new Uniform(strength)],
        ["uRadius", new Uniform(radius)],
      ]),
    });
  }
  get strength() { return this.uniforms.get("uStrength")!.value as number; }
  set strength(v: number) { this.uniforms.get("uStrength")!.value = v; }
  set radius(v: number) { this.uniforms.get("uRadius")!.value = v; }
}
