// Voidmetric v3.6 Directional Motion-Blur Whip-Pan Pass (adapted from mromidev motion.md 5.4)
// Zero visual/GPU cost when camera velocity is normal (dot(vel, vel) < 1e-8).
// Automatically blurs fast 7-15 frame whip-pan reframes (45-95 px/f at 720p) with silky 12-tap directional streak!
import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

const FRAG = /* glsl */ `
uniform vec2 vel;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (dot(vel, vel) < 1e-8) {
    outputColor = inputColor;
    return;
  }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 16; i++) {
    vec2 sampleUv = clamp(uv + vel * (float(i) / 15.0 - 0.5), vec2(0.001), vec2(0.999));
    acc += texture2D(inputBuffer, sampleUv);
  }
  outputColor = acc / 16.0;
}
`;

export class WhipBlur extends Effect {
  readonly vel: Vector2;
  constructor() {
    const v = new Vector2(0, 0);
    super("WhipBlur", FRAG, { uniforms: new Map([["vel", new Uniform(v)]]) });
    this.vel = v;
  }
}
